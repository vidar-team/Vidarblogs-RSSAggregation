"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Feed" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <>
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
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-block transition hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 lg:col-span-1">
          <a
            href="/feed.xml"
            className="group hidden items-center justify-center gap-1.5 text-base font-medium tracking-tight sm:text-lg lg:flex"
          >
            Subscribe
            <ArrowRight className="size-4 -translate-y-0.5 transition group-hover:translate-x-0.5" />
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="打开菜单"
            aria-expanded={open}
            className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition hover:bg-muted lg:hidden"
          >
            <Menu className="size-6" />
          </button>
        </div>
      </nav>

      <div
        inert={!open}
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="导航菜单"
          className={cn(
            "absolute inset-y-0 right-0 flex w-72 max-w-[80%] flex-col border-l border-border bg-background px-6 py-6 shadow-xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭菜单"
              className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition hover:bg-muted"
            >
              <X className="size-6" />
            </button>
          </div>

          <nav className="mt-6">
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block py-3 text-lg font-medium text-foreground transition hover:text-muted-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="my-6 border-t border-border" />

          <a
            href="/feed.xml"
            onClick={() => setOpen(false)}
            className="group flex items-center justify-between text-lg font-medium tracking-tight"
          >
            Subscribe
            <ArrowRight className="size-4 -translate-y-0.5 transition group-hover:translate-x-0.5" />
          </a>
        </aside>
      </div>
    </>
  );
}
