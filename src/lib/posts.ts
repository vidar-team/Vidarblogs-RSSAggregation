import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Author, MemberFeed, Post } from "./types";

const POSTS_DIR = join(process.cwd(), "src", "data", "posts");
const FEEDS_FILE = join(process.cwd(), "script", "feeds.json");

type FeedSource = {
  id: string;
  url: string;
};

function loadFeedUrls(): Map<string, string> {
  const raw = readFileSync(FEEDS_FILE, "utf8");
  return new Map(
    (JSON.parse(raw) as FeedSource[]).map((feed) => [feed.id, feed.url]),
  );
}

function loadFeeds(): MemberFeed[] {
  return readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const raw = readFileSync(join(POSTS_DIR, file), "utf8");
      return JSON.parse(raw) as MemberFeed;
    });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const posts: Post[] = loadFeeds()
  .flatMap((feed) =>
    feed.posts.map((post, index) => ({
      ...post,
      id: `${slugify(feed.author.id)}-${index}`,
      author: feed.author,
    })),
  )
  .sort((a, b) => b.date.localeCompare(a.date));

export type Member = Author & {
  postCount: number;
  feedUrl?: string;
};

const feedUrls = loadFeedUrls();

export const members: Member[] = loadFeeds()
  .map((feed) => ({
    ...feed.author,
    postCount: feed.posts.length,
    feedUrl: feedUrls.get(feed.author.id),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
