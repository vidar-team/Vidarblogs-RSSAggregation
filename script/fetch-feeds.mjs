#!/usr/bin/env node
// Incremental RSS/Atom fetcher.
//
// Reads script/feeds.json ([{ id, url, name?, site? }]) and writes one file per
// member to src/data/posts/<slug>.json.
//
// Incremental behaviour:
//   - Conditional GET (If-None-Match / If-Modified-Since) via script/feeds.cache.json,
//     so unchanged feeds answer 304 and are skipped entirely.
//   - New items are merged into the existing member file and de-duplicated by url,
//     so we never lose posts: anything already archived is kept even if it later
//     disappears from the feed. No per-member cap.
//   - Misconfigured feeds (baseURL left as example.com) are rewritten to the
//     member's real domain, derived from feeds.json (site || url).
//
// Usage:
//   node script/fetch-feeds.mjs            # incremental
//   node script/fetch-feeds.mjs --full     # ignore cache, refetch everything
//   node script/fetch-feeds.mjs --only c0d4,DODOR
//   node script/fetch-feeds.mjs --limit 5
//   node script/fetch-feeds.mjs --dry      # parse + report, write nothing

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FEEDS_FILE = join(ROOT, "script", "feeds.json");
const CACHE_FILE = join(ROOT, "script", "feeds.cache.json");
const OUT_DIR = join(ROOT, "src", "data", "posts");
const SUMMARY_FEED_FILE = join(ROOT, "public", "feed.xml");

// Aggregated feed metadata. SITE_URL can be overridden per environment.
const SITE_URL = (process.env.SITE_URL || "https://feed.vidar.team").replace(
  /\/+$/,
  "",
);
const SITE_TITLE = "Vidarblogs | 博客聚合";
const SITE_DESCRIPTION = "Vidar-Team 成员博客 RSS 聚合";
const SUMMARY_FEED_MAX = 100;

const SUMMARY_MAX = 800;
const CONCURRENCY = 6;
const TIMEOUT_MS = 20000;
const UA =
  "Mozilla/5.0 (compatible; VidarRssBot/1.0; +https://github.com/Vidar-RSS)";

const args = process.argv.slice(2);
const full = args.includes("--full");
const dryRun = args.includes("--dry");
const onlyArg = args.indexOf("--only");
const only =
  onlyArg >= 0 && args[onlyArg + 1]
    ? args[onlyArg + 1].split(",").map((s) => s.trim()).filter(Boolean)
    : null;
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : null;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name) => name === "item" || name === "entry",
});

const asText = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return asText(value["#text"]);
  return "";
};

const arr = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

function decodeEntities(input) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code) => {
    if (code[0] === "#") {
      const hex = code[1] === "x" || code[1] === "X";
      const value = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }
    return named[code.toLowerCase()] ?? match;
  });
}

function htmlToText(input) {
  if (!input) return "";
  let text = String(input);
  text = text.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = text.replace(/<\/(p|div|li|h[1-6])>/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  return text.replace(/\s+/g, " ").trim();
}

function decodeBody(buffer, contentType) {
  let charset = "";
  const headerMatch = /charset=([^;]+)/i.exec(contentType || "");
  if (headerMatch) charset = headerMatch[1].trim().replace(/^["']|["']$/g, "");
  if (!charset) {
    const head = buffer.subarray(0, 200).toString("latin1");
    const declMatch = /encoding=["']([^"']+)["']/i.exec(head);
    if (declMatch) charset = declMatch[1];
  }
  const encoding = (charset || "utf-8").toLowerCase();
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function extractLink(link) {
  const pick = (value) => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      return String(value["@_href"] || value["#text"] || "");
    }
    return "";
  };
  if (Array.isArray(link)) {
    const alternate = link.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (!item["@_rel"] || item["@_rel"] === "alternate"),
    );
    return pick(alternate || link[0]);
  }
  return pick(link);
}

function toDate(value) {
  const raw = decodeEntities(asText(value));
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

// Rewrite placeholder domains (Hugo/most generators default to example.com)
// to the member's real origin/host.
const PLACEHOLDER_ORIGIN = /https?:\/\/(?:www\.)?example\.(?:com|org|net)/gi;
const PLACEHOLDER_BARE = /(?<![A-Za-z0-9._-])(?:www\.)?example\.(?:com|org|net)/gi;

function replacePlaceholderDomain(text, origin, host) {
  if (!text || (!origin && !host)) return text;
  let out = String(text);
  if (origin) out = out.replace(PLACEHOLDER_ORIGIN, origin);
  if (host) out = out.replace(PLACEHOLDER_BARE, host);
  return out;
}

function stripLoneSurrogates(input) {
  return input
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1");
}

function escapeXml(input) {
  return stripLoneSurrogates(String(input ?? ""))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(input, max) {
  const chars = Array.from(input);
  return chars.length > max ? chars.slice(0, max).join("") : input;
}

function pickSummary(item) {
  for (const candidate of [item.encoded, item.content, item.description, item.summary]) {
    const text = stripLoneSurrogates(htmlToText(asText(candidate)));
    if (text) return truncate(text, SUMMARY_MAX);
  }
  return "";
}

function normalizeItem(item) {
  const url = decodeEntities(
    extractLink(item.link) || asText(item.id) || asText(item.guid),
  );
  const date = toDate(item.pubDate ?? item.published ?? item.updated ?? item.date);
  const title = stripLoneSurrogates(decodeEntities(asText(item.title)))
    .replace(/\s+/g, " ")
    .trim();
  if (!url || !date || !title) return null;
  return { title, url, date, summary: pickSummary(item) };
}

function parseFeed(xml) {
  const doc = parser.parse(xml);
  const channel = doc.rss?.channel ?? doc.RDF?.channel;
  if (channel) {
    return {
      site: extractLink(channel.link),
      items: arr(channel.item).map(normalizeItem).filter(Boolean),
    };
  }
  if (doc.feed) {
    return {
      site: extractLink(doc.feed.link),
      items: arr(doc.feed.entry).map(normalizeItem).filter(Boolean),
    };
  }
  return { site: "", items: [] };
}

function fileSlug(id) {
  const ascii = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return ascii || `m-${createHash("sha1").update(id).digest("hex").slice(0, 8)}`;
}

function memberPath(slug) {
  return join(OUT_DIR, `${slug}.json`);
}

function loadExisting(slug) {
  const path = memberPath(slug);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function mergePosts(existing, incoming) {
  const byUrl = new Map();
  for (const post of existing) {
    if (post?.url) byUrl.set(post.url, post);
  }
  for (const post of incoming) {
    if (post?.url) byUrl.set(post.url, post);
  }
  return [...byUrl.values()].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );
}

// Aggregate every member file into a single feed.xml, newest first, capped at
// SUMMARY_FEED_MAX items. Reads from disk so it also reflects members that were
// left untouched by an incremental/--only run.
function generateSummaryFeed() {
  const byUrl = new Map();
  for (const file of readdirSync(OUT_DIR)) {
    if (!file.endsWith(".json")) continue;
    let data;
    try {
      data = JSON.parse(readFileSync(join(OUT_DIR, file), "utf8"));
    } catch {
      continue;
    }
    if (!data || !Array.isArray(data.posts)) continue;
    for (const post of data.posts) {
      if (!post?.url || !post?.title || byUrl.has(post.url)) continue;
      byUrl.set(post.url, { ...post, author: data.author });
    }
  }

  const items = [...byUrl.values()]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, SUMMARY_FEED_MAX);

  // Anchor the build date to the newest post instead of "now" so an unchanged
  // dataset reproduces a byte-identical feed.xml (no spurious commits).
  const newest = items.length ? new Date(items[0].date) : null;
  const buildDate =
    newest && !Number.isNaN(newest.getTime())
      ? newest.toUTCString()
      : "Thu, 01 Jan 1970 00:00:00 GMT";
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(SITE_TITLE)}</title>`,
    `    <link>${escapeXml(`${SITE_URL}/`)}</link>`,
    `    <description>${escapeXml(SITE_DESCRIPTION)}</description>`,
    "    <language>zh-CN</language>",
    `    <lastBuildDate>${buildDate}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml"/>`,
  ];

  for (const post of items) {
    const date = new Date(post.date);
    const pubDate = Number.isNaN(date.getTime()) ? buildDate : date.toUTCString();
    const sourceUrl = post.author?.url
      ? ` url="${escapeXml(post.author.url)}"`
      : "";
    lines.push("    <item>");
    lines.push(`      <title>${escapeXml(post.title)}</title>`);
    lines.push(`      <link>${escapeXml(post.url)}</link>`);
    lines.push(`      <guid isPermaLink="true">${escapeXml(post.url)}</guid>`);
    lines.push(`      <pubDate>${pubDate}</pubDate>`);
    if (post.summary) {
      lines.push(`      <description>${escapeXml(post.summary)}</description>`);
    }
    if (post.author?.name) {
      lines.push(
        `      <source${sourceUrl}>${escapeXml(post.author.name)}</source>`,
      );
    }
    lines.push("    </item>");
  }

  lines.push("  </channel>", "</rss>", "");

  mkdirSync(dirname(SUMMARY_FEED_FILE), { recursive: true });
  writeFileSync(SUMMARY_FEED_FILE, lines.join("\n"), "utf8");
  return items.length;
}

async function fetchFeed(feed, cacheEntry, hasLocalFile) {
  const headers = {
    "User-Agent": UA,
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  };
  if (!full && hasLocalFile && cacheEntry) {
    if (cacheEntry.etag) headers["If-None-Match"] = cacheEntry.etag;
    if (cacheEntry.lastModified) headers["If-Modified-Since"] = cacheEntry.lastModified;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    if (res.status === 304) return { status: "unchanged" };
    if (!res.ok) return { status: "error", message: `HTTP ${res.status}` };
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      status: "ok",
      xml: decodeBody(buffer, res.headers.get("content-type")),
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
      finalUrl: res.url,
    };
  } catch (error) {
    const message =
      error?.name === "AbortError" ? "timeout" : error?.message || String(error);
    return { status: "error", message };
  } finally {
    clearTimeout(timer);
  }
}

let cache = { feeds: {} };
if (existsSync(CACHE_FILE)) {
  try {
    const parsed = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (parsed && typeof parsed === "object" && parsed.feeds) cache = parsed;
  } catch {
    // ignore corrupt cache
  }
}

const feeds = JSON.parse(readFileSync(FEEDS_FILE, "utf8"));
const selected = feeds
  .filter((feed) => !only || only.includes(feed.id))
  .slice(0, limit ?? feeds.length);

// Stable, collision-free filenames.
const slugById = new Map();
const usedSlugs = new Set();
for (const feed of feeds) {
  let slug = fileSlug(feed.id);
  while (usedSlugs.has(slug)) slug = `${slug}-2`;
  usedSlugs.add(slug);
  slugById.set(feed.id, slug);
}

mkdirSync(OUT_DIR, { recursive: true });

async function processFeed(feed) {
  const slug = slugById.get(feed.id);
  const existing = loadExisting(slug);
  const cacheEntry = cache.feeds[feed.id];
  const result = await fetchFeed(feed, cacheEntry, Boolean(existing));

  if (result.status === "unchanged") {
    // Keep only the validators so an all-304 run leaves the cache byte-identical.
    cache.feeds[feed.id] = {
      etag: cacheEntry?.etag ?? null,
      lastModified: cacheEntry?.lastModified ?? null,
    };
    return { id: feed.id, status: "unchanged", count: existing?.posts?.length ?? 0 };
  }

  if (result.status === "error") {
    return { id: feed.id, status: "error", message: result.message };
  }

  const parsed = parseFeed(result.xml);

  let origin = "";
  let host = "";
  try {
    const url = new URL(feed.site || feed.url);
    origin = url.origin;
    host = url.host;
  } catch {
    // ignore malformed feed url
  }

  const site = replacePlaceholderDomain(parsed.site, origin, host);
  const author = {
    id: feed.id,
    name: feed.name || feed.id,
    url: replacePlaceholderDomain(feed.site || site || origin, origin, host),
  };
  const items = parsed.items.map((post) => ({
    ...post,
    url: replacePlaceholderDomain(post.url, origin, host),
    title: replacePlaceholderDomain(post.title, origin, host),
    summary: replacePlaceholderDomain(post.summary, origin, host),
  }));
  const merged = mergePosts(existing?.posts ?? [], items);
  const added = merged.length - (existing?.posts?.length ?? 0);

  if (!dryRun) {
    writeFileSync(
      memberPath(slug),
      `${JSON.stringify({ author, posts: merged }, null, 2)}\n`,
      "utf8",
    );
    cache.feeds[feed.id] = {
      etag: result.etag || cacheEntry?.etag || null,
      lastModified: result.lastModified || cacheEntry?.lastModified || null,
    };
  }

  return { id: feed.id, status: "ok", count: merged.length, added };
}

async function runPool(items, worker, size) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

console.log(
  `Fetching ${selected.length} feed(s)${full ? " [full]" : ""}${dryRun ? " [dry]" : ""}…`,
);

const results = await runPool(selected, processFeed, CONCURRENCY);

if (!dryRun) {
  writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  const summaryCount = generateSummaryFeed();
  console.log(`  ~ public/feed.xml  ${summaryCount} item(s)`);
}

const ok = results.filter((r) => r.status === "ok");
const unchanged = results.filter((r) => r.status === "unchanged");
const failed = results.filter((r) => r.status === "error");

for (const r of ok) {
  console.log(`  ✓ ${r.id}  ${r.count} post(s)${r.added > 0 ? ` (+${r.added})` : ""}`);
}
for (const r of unchanged) {
  console.log(`  = ${r.id}  unchanged (${r.count})`);
}
for (const r of failed) {
  console.warn(`  ✗ ${r.id}  ${r.message}`);
}

console.log(
  `\nDone: ${ok.length} updated, ${unchanged.length} unchanged, ${failed.length} failed.`,
);
