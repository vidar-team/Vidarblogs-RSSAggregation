"use client";

import { useEffect, useRef } from "react";

export function ImmersiveScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const root = document.documentElement;
    let hideTimer: number | undefined;
    let dragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;

    const scrollTop = () => root.scrollTop || document.body.scrollTop;

    const update = () => {
      const scrollHeight = root.scrollHeight;
      const clientHeight = root.clientHeight;
      const canScroll = scrollHeight - clientHeight > 1;

      track.style.opacity = canScroll ? "" : "0";
      if (!canScroll) return;

      const trackHeight = track.clientHeight;
      const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 28);
      const maxThumbTop = trackHeight - thumbHeight;
      const progress = scrollTop() / (scrollHeight - clientHeight);

      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${progress * maxThumbTop}px)`;
    };

    const show = () => {
      track.classList.add("is-active");
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!dragging) track.classList.remove("is-active");
      }, 900);
    };

    const onScroll = () => {
      update();
      show();
    };

    const onThumbPointerDown = (event: PointerEvent) => {
      dragging = true;
      dragStartY = event.clientY;
      dragStartScroll = scrollTop();
      thumb.setPointerCapture(event.pointerId);
      event.preventDefault();
      show();
    };

    const onThumbPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const maxThumbTop = track.clientHeight - thumb.offsetHeight;
      const maxScroll = root.scrollHeight - root.clientHeight;
      if (maxThumbTop <= 0) return;
      const delta = event.clientY - dragStartY;
      root.scrollTop = dragStartScroll + (delta / maxThumbTop) * maxScroll;
    };

    const onThumbPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (thumb.hasPointerCapture(event.pointerId)) {
        thumb.releasePointerCapture(event.pointerId);
      }
      show();
    };

    const onTrackPointerDown = (event: PointerEvent) => {
      if (event.target !== track) return;
      const trackHeight = track.clientHeight;
      const maxScroll = root.scrollHeight - root.clientHeight;
      const thumbHeight = thumb.offsetHeight;
      const ratio =
        (event.clientY - track.getBoundingClientRect().top - thumbHeight / 2) /
        (trackHeight - thumbHeight);
      root.scrollTop = Math.min(Math.max(ratio, 0), 1) * maxScroll;
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    thumb.addEventListener("pointerdown", onThumbPointerDown);
    thumb.addEventListener("pointermove", onThumbPointerMove);
    thumb.addEventListener("pointerup", onThumbPointerUp);
    thumb.addEventListener("pointercancel", onThumbPointerUp);
    track.addEventListener("pointerdown", onTrackPointerDown);

    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    observer.observe(root);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      thumb.removeEventListener("pointerdown", onThumbPointerDown);
      thumb.removeEventListener("pointermove", onThumbPointerMove);
      thumb.removeEventListener("pointerup", onThumbPointerUp);
      thumb.removeEventListener("pointercancel", onThumbPointerUp);
      track.removeEventListener("pointerdown", onTrackPointerDown);
      observer.disconnect();
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div ref={trackRef} className="immersive-scrollbar" aria-hidden="true">
      <div ref={thumbRef} className="immersive-scrollbar__thumb" />
    </div>
  );
}
