#!/usr/bin/env node
// Generates public/posts.json from src/data/posts/*.json so the client can
// fetch the full post index on demand (search / pagination beyond page 1).

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = join(ROOT, "src", "data", "posts");
const OUT_FILE = join(ROOT, "public", "posts.json");

function authorSlug(id) {
  const ascii = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return ascii || `m-${createHash("sha1").update(id).digest("hex").slice(0, 8)}`;
}

const feeds = readdirSync(POSTS_DIR)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => JSON.parse(readFileSync(join(POSTS_DIR, file), "utf8")));

const posts = feeds
  .flatMap((feed) => {
    const slug = authorSlug(feed.author.id);
    return feed.posts.map((post, index) => ({
      ...post,
      id: `${slug}-${index}`,
      author: feed.author,
    }));
  })
  .sort((a, b) => b.date.localeCompare(a.date));

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(posts), "utf8");
console.log(`  ~ public/posts.json  ${posts.length} item(s)`);
