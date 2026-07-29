"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

export type RevealVariant = "up" | "left" | "right" | "scale" | "fade";

type RevealProps = {
  as?: ElementType;
  variant?: RevealVariant;
  /** Stagger delay in milliseconds */
  delay?: number;
  className?: string;
  children: ReactNode;
  /** Unobserve after first reveal (default true) */
  once?: boolean;
  /** Fraction of element that must be visible (0–1) */
  threshold?: number;
  style?: CSSProperties;
};

/**
 * Scroll-triggered entrance matching NSOffice.AI / Apple HIG motion:
 * opacity + transform only, staggered delays, reduced-motion safe.
 */
export function Reveal({
  as: Tag = "div",
  variant = "up",
  delay = 0,
  className = "",
  children,
  once = true,
  threshold = 0.14,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const show = () => {
      node.classList.add("sr-visible");
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      show();
      return;
    }

    const rect = node.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < vh * 0.9 && rect.bottom > 0) {
      // Defer one frame so the initial hidden paint can apply first.
      const frame = window.requestAnimationFrame(show);
      if (once) {
        return () => window.cancelAnimationFrame(frame);
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show();
          if (once) observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, threshold]);

  return (
    <Tag
      ref={ref}
      className={`sr sr-${variant}${className ? ` ${className}` : ""}`}
      style={{
        ...style,
        ["--sr-delay" as string]: `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

type RevealTextProps = Omit<RevealProps, "variant"> & {
  variant?: RevealVariant;
};

/** Convenience alias for copy blocks. */
export function RevealText(props: RevealTextProps) {
  return <Reveal variant={props.variant ?? "up"} {...props} />;
}
