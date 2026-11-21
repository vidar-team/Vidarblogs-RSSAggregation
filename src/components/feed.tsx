"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { Post } from "@/lib/types";
import { PAGE_SIZE } from "@/lib/constants";
import { PostRow } from "@/components/post-row";
import { cn } from "@/lib/utils";

let cachedPosts: Post[] | null = null;
let inflightRequest: Promise<Post[]> | null = null;

function fetchAllPosts(): Promise<Post[]> {
  if (cachedPosts) return Promise.resolve(cachedPosts);
  if (!inflightRequest) {
    inflightRequest = fetch("/posts.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Post[]>;
      })
      .then((data) => {
        cachedPosts = data;
        inflightRequest = null;
        return data;
      })
      .catch((error) => {
        inflightRequest = null;
        throw error;
      });
  }
  return inflightRequest;
}

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

function buildSearchString(query: string, page: number): string {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) params.set("q", trimmed);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

function SearchParamsSync({ onSync }: { onSync: (search: string) => void }) {
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    onSync(search);
  }, [search, onSync]);

  return null;
}

export function Feed({
  initialPosts,
  totalCount,
}: {
  initialPosts: Post[];
  totalCount: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[] | null>(() => cachedPosts);
  const [loadError, setLoadError] = useState(false);
  const [prefetched, setPrefetched] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const lastWrittenSearchRef = useRef<string | null>(null);

  const handleUrlSync = useCallback((search: string) => {
    if (search === lastWrittenSearchRef.current) return;
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).toString() !== search
    ) {
      return;
    }
    const params = new URLSearchParams(search);
    const nextQuery = params.get("q") ?? "";
    const rawPage = Number.parseInt(params.get("page") ?? "1", 10);
    const nextPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    lastWrittenSearchRef.current = search;
    setQuery(nextQuery);
    setPage(nextPage);
  }, []);

  const needsAllPosts = query.trim().length > 0 || page > 1;
  const shouldFetch =
    (needsAllPosts || prefetched) && allPosts === null && !loadError;
  const isLoading = needsAllPosts && allPosts === null && !loadError;

  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;
    fetchAllPosts()
      .then((data) => {
        if (!cancelled) {
          setAllPosts(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shouldFetch, retryToken]);

  const filtered = useMemo(() => {
    if (!needsAllPosts) {
      return allPosts ? allPosts.slice(0, PAGE_SIZE) : initialPosts;
    }
    if (!allPosts) return [];
    const q = query.trim().toLowerCase();
    if (!q) return allPosts;
    return allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.summary?.toLowerCase().includes(q) ||
        post.author.name.toLowerCase().includes(q),
    );
  }, [allPosts, initialPosts, needsAllPosts, query]);

  const pageCount = needsAllPosts
    ? allPosts
      ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
      : Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    : Math.max(
        1,
        Math.ceil((allPosts ? allPosts.length : totalCount) / PAGE_SIZE),
      );
  const current = Math.min(page, pageCount);
  const visible = needsAllPosts
    ? filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
    : filtered;

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), pageCount);
    setPage(clamped);
    const nextSearch = buildSearchString(query, clamped);
    lastWrittenSearchRef.current = nextSearch;
    window.history.pushState(
      null,
      "",
      nextSearch ? `?${nextSearch}` : window.location.pathname,
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  const buttonClass =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 transition-all duration-200 active:scale-95";

  const hasLoadError = needsAllPosts && allPosts === null && loadError;
  const showPagination = pageCount > 1 && !isLoading && !hasLoadError;

  return (
    <div className="flex w-full flex-col">
      <Suspense fallback={null}>
        <SearchParamsSync onSync={handleUrlSync} />
      </Suspense>

      <div className="group relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-foreground" />
        <input
          type="search"
          value={query}
          onFocus={() => setPrefetched(true)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setPage(1);
            const nextSearch = buildSearchString(nextQuery, 1);
            lastWrittenSearchRef.current = nextSearch;
            window.history.replaceState(
              null,
              "",
              nextSearch ? `?${nextSearch}` : window.location.pathname,
            );
          }}
          placeholder="搜索文章或作者…"
          className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-base outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-4 focus-visible:ring-foreground/[0.04]"
        />
      </div>

      <div className="mt-6 flex w-full flex-col">
        {isLoading ? (
          <p className="motion-fade animate-pulse py-20 text-center text-muted-foreground">
            正在加载文章索引…
          </p>
        ) : hasLoadError ? (
          <div className="motion-fade flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-muted-foreground">文章索引加载失败。</p>
            <button
              type="button"
              onClick={() => {
                setLoadError(false);
                setRetryToken((n) => n + 1);
              }}
              className="rounded-lg border border-border px-4 py-1.5 text-sm text-foreground transition-all duration-200 hover:border-foreground/20 hover:bg-muted active:scale-95"
            >
              重试
            </button>
          </div>
        ) : (
          <>
            <div key={`page-${current}`} className="flex w-full flex-col">
              {visible.map((post, index) => (
                <PostRow key={post.id} post={post} index={index} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="motion-fade py-20 text-center text-muted-foreground">
                没有匹配的文章。
              </p>
            )}
          </>
        )}
      </div>

      {showPagination && (
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
              "text-muted-foreground hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
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
                    ? "border border-border bg-muted/50 text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
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
              "text-muted-foreground hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            下一页
          </button>
        </nav>
      )}
    </div>
  );
}
