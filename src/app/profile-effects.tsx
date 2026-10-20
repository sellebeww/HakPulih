"use client";
import { useEffect } from "react";

// Scroll reveal, count-up numbers, and the solid header once the page scrolls.
export function ProfileEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cp");
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("cp-js");
    const countUp = (el: HTMLElement) => {
      const target = Number(el.dataset.count);
      const decimals = el.dataset.count?.split(".")[1]?.length ?? 0;
      const fmt = new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      const start = performance.now();
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / 1400);
        el.textContent = fmt.format(target * (1 - (1 - t) ** 3));
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          io.unobserve(el);
          if (el.dataset.count !== undefined) {
            if (!reduce) countUp(el);
          } else el.classList.add("in");
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    root.querySelectorAll<HTMLElement>("[data-reveal],[data-count]").forEach((el) => {
      if (el.dataset.count !== undefined && !reduce)
        el.textContent = el.textContent!.replace(/[\d.,]+/, "0");
      io.observe(el);
    });
    const header = root.querySelector(".cp-header");
    const onScroll = () =>
      header?.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return null;
}
