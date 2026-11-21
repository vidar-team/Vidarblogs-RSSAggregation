import type { CSSProperties } from "react";
import type { Post } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PostRow({ post, index }: { post: Post; index?: number }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      style={
        index !== undefined
          ? ({ "--stagger-index": Math.min(index, 9) } as CSSProperties)
          : undefined
      }
      className={cn(
        "group flex w-full flex-col-reverse items-center justify-start border-b border-border transition-colors duration-200 hover:bg-muted sm:grid sm:grid-cols-[minmax(0,1fr)] sm:gap-2",
        index !== undefined && "motion-enter motion-stagger",
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-2 pb-8 pt-4 transition-[padding] sm:px-12 sm:py-8">
        <h2 className="wrap-break-word shrink-0 text-xl font-normal text-foreground sm:text-2xl">
          {post.title}
        </h2>
        {post.summary && (
          <p className="wrap-break-word line-clamp-3 text-base font-normal leading-[1.35] text-muted-foreground sm:text-lg">
            {post.summary}
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDate(post.date)} by {post.author.name}
        </p>
      </div>
    </a>
  );
}
