"use client";

import { useRef, useState } from "react";
import { Check, Rss } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyRssButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; fail silently.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied." : "Copy RSS URL"}
      title={copied ? "Copied." : "Copy RSS URL"}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:border-foreground/20 hover:text-foreground",
        copied && "border-foreground/20 text-foreground",
      )}
    >
      {copied ? <Check className="size-4" /> : <Rss className="size-4" />}
    </button>
  );
}
