import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Rss } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CopyRssButton } from "@/components/copy-rss-button";
import { members } from "@/lib/posts";

export const metadata: Metadata = {
  title: "关于 | Vidarblogs",
  description: "关于 Vidarblogs —— Vidar-Team 成员博客 RSS 聚合",
};

export default function About() {
  return (
    <div className="flex h-full min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-start justify-start overflow-x-hidden px-6 pb-10">
        <article className="w-full">
          <header
            style={{ "--stagger-index": 0 } as CSSProperties}
            className="motion-enter motion-stagger border-b border-border pb-10"
          >
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              关于
            </h2>
            <p className="mt-6 text-base font-normal leading-[1.6] text-muted-foreground sm:text-lg">
              Vidarblogs 是一个 Vidar-Team 成员博客的 RSS 聚合站点，方便一起浏览、搜索与订阅。
            </p>
          </header>

          <section
            style={{ "--stagger-index": 1 } as CSSProperties}
            className="motion-enter motion-stagger border-b border-border py-10"
          >
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              收录成员
            </h2>
            <p className="mt-4 text-base font-normal leading-normal text-muted-foreground">
              目前共收录 {members.length} 位成员的博客。若您的博客未被收录，十分抱歉。您可以编辑
              <a href="https://github.com/vidar-team/Vidarblogs-RSSAggregation/blob/main/script/feeds.json" target="_blank" rel="noopener noreferrer" className="mx-1 hover:underline">
                该文件
              </a>
              并提交 PR 以添加自己的博客。
            </p>
            <ul className="mt-6 grid gap-x-10 gap-y-1 px-2 sm:grid-cols-2 lg:grid-cols-2">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="-mx-2 flex items-center justify-between gap-4 rounded-md border-b border-border px-2 py-3 transition-colors duration-200 hover:bg-muted/50"
                >
                  <a
                    href={member.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-base font-normal text-foreground transition-colors duration-200 hover:text-muted-foreground"
                  >
                    {member.name}
                  </a>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {member.postCount} 篇
                    </span>
                    {member.feedUrl && <CopyRssButton url={member.feedUrl} />}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            style={{ "--stagger-index": 2 } as CSSProperties}
            className="motion-enter motion-stagger border-b border-border py-10"
          >
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              订阅
            </h2>
            <p className="mt-4 text-base font-normal leading-[1.5] text-muted-foreground">
              你可以通过 RSS 阅读器订阅本站，第一时间获取所有成员的最新文章。该 RSS 源同步最新 100 篇文章。
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="/feed.xml"
                className="group flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-all duration-200 ease-editorial hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-muted/60 hover:text-foreground active:translate-y-0 active:scale-[0.98]"
              >
                <Rss className="size-4 transition-transform duration-300 ease-editorial group-hover:scale-110" />
                Subscribe via RSS
              </a>
              <Link
                href="/"
                className="group flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                浏览全部文章
                <ArrowRight className="size-4 -translate-y-0.5 transition-transform duration-300 ease-editorial group-hover:translate-x-1" />
              </Link>
            </div>
          </section>

          <section
            style={{ "--stagger-index": 3 } as CSSProperties}
            className="motion-enter motion-stagger py-10"
          >
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              加入
            </h2>
            <p className="mt-4 text-base font-normal leading-[1.5] text-muted-foreground">
              若您有意加入 Vidar-Team ，欢迎访问我们的官网了解：<a href="https://vidar.club" target="_blank" rel="noopener noreferrer" className="hover:underline">https://vidar.club</a>
            </p>
            <p className="mt-4 text-base font-normal leading-[1.5] text-muted-foreground">
              所有文章的内容与版权均归原作者所有，本站仅作聚合与索引。
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
