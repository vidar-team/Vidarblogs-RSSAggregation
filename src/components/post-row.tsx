import type { Post } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function PostRow({ post }: { post: Post }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full flex-col-reverse items-center justify-start border-b border-border transition hover:bg-muted sm:grid sm:gap-2"
    >
      <div className="flex w-full flex-col gap-2 pb-8 pt-4 transition-[padding] sm:px-12 sm:py-8">
        <h2 className="shrink-0 text-xl font-normal text-foreground sm:text-2xl">
          {post.title}
        </h2>
        {post.summary && (
          <p className="line-clamp-3 text-base font-normal leading-[1.35] text-muted-foreground sm:text-lg">
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
