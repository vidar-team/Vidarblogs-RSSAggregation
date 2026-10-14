import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SiteHeader() {
  return (
    <nav className="mx-auto grid w-full max-w-7xl grid-cols-2 items-center justify-between gap-4 px-6 py-6 text-xl font-bold sm:py-10 sm:text-2xl lg:grid-cols-4">
      <div className="lg:col-span-1">
        <Link href="/" className="inline-block">
          <h1 className="font-medium sm:font-bold">
            <span>Vidar</span>
            <span className="text-muted-foreground">blogs</span>
          </h1>
        </Link>
      </div>

      <div className="hidden lg:col-span-2 lg:block">
        <ul className="flex flex-row justify-center space-x-6 text-base font-medium tracking-tight text-muted-foreground">
          <li>
            <Link href="/" className="inline-block transition hover:text-foreground">
              Feed
            </Link>
          </li>
          <li>
            <Link href="/about" className="inline-block transition hover:text-foreground">
              About
            </Link>
          </li>
        </ul>
      </div>

      <div className="flex justify-end lg:col-span-1">
        <a
          href="/feed.xml"
          className="group flex flex-row items-center justify-center gap-1.5 text-base font-medium tracking-tight sm:text-lg"
        >
          Subscribe
          <ArrowRight className="size-4 -translate-y-0.5 transition group-hover:translate-x-0.5" />
        </a>
      </div>
    </nav>
  );
}
