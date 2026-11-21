import { Rss } from "lucide-react";

export function RssSubscribe() {
  return (
    <div className="mt-16 flex w-full items-center justify-center">
      <a
        href="/feed.xml"
        className="group flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-all duration-200 ease-editorial hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-muted/60 hover:text-foreground active:translate-y-0 active:scale-[0.98]"
      >
        <Rss className="size-4 transition-transform duration-300 ease-editorial group-hover:scale-110" />
        Subscribe via RSS
      </a>
    </div>
  );
}
