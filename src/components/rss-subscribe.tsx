import { Rss } from "lucide-react";

export function RssSubscribe() {
  return (
    <div className="mt-16 flex w-full items-center justify-center">
      <a
        href="/feed.xml"
        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
      >
        <Rss className="size-4" />
        Subscribe via RSS
      </a>
    </div>
  );
}
