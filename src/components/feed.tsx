"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Post } from "@/lib/types";
import { PostRow } from "@/components/post-row";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("gap");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push("gap");
  pages.push(total);
  return pages;
}

export function Feed({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.summary?.toLowerCase().includes(q) ||
        post.author.name.toLowerCase().includes(q),
    );
  }, [posts, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(next, 1), pageCount));
    window.scrollTo({ top: 0 });
  };

  const buttonClass =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 transition";

  return (
    <div className="flex w-full flex-col">
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="搜索文章或作者…"
          className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-base outline-none transition placeholder:text-muted-foreground focus-visible:border-foreground/30"
        />
      </div>

      <div className="mt-6 flex w-full flex-col">
        {visible.map((post) => (
          <PostRow key={post.id} post={post} />
        ))}
        {filtered.length === 0 && (
          <p className="py-20 text-center text-muted-foreground">没有匹配的文章。</p>
        )}
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="分页"
          className="mt-10 flex flex-wrap items-center justify-center gap-1 text-sm font-normal"
        >
          <button
            type="button"
            onClick={() => goToPage(current - 1)}
            disabled={current <= 1}
            className={cn(
              buttonClass,
              "text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            上一页
          </button>

          {pageWindow(current, pageCount).map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => goToPage(item)}
                aria-current={item === current ? "page" : undefined}
                className={cn(
                  buttonClass,
                  item === current
                    ? "border border-border text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => goToPage(current + 1)}
            disabled={current >= pageCount}
            className={cn(
              buttonClass,
              "text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            下一页
          </button>
        </nav>
      )}
    </div>
  );
}
