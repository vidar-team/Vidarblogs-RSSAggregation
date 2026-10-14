import { Feed } from "@/components/feed";
import { RssSubscribe } from "@/components/rss-subscribe";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { posts } from "@/lib/posts";

export default function Home() {
  return (
    <div className="flex h-full min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-start justify-start overflow-x-hidden px-6 pb-10">
        <Feed posts={posts} />
        <RssSubscribe />
      </main>
      <SiteFooter />
    </div>
  );
}
