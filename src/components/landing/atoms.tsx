import { useEffect, useRef, useState, type ReactNode } from "react";

import wordmarkAsset from "@/assets/ciatta-wordmark.png.asset.json";

/** True when the visitor asked the system for less motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** The wordmark, always lowercase serif, always quiet. */
export function Wordmark({ className = "h-6" }: { className?: string }) {
  return (
    <img
      src={wordmarkAsset.url}
      alt="Ciatta"
      className={`w-auto object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}

/** A very subtle fade-in, once, when the block first enters the page. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "figure";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translate3d(0, 14px, 0)",
        transition: `opacity 1100ms cubic-bezier(0.22,0.61,0.36,1) ${delay}ms, transform 1100ms cubic-bezier(0.22,0.61,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
