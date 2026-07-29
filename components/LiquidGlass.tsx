"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    liquidGlass?: (
      el: Element,
      opts?: Record<string, number>
    ) => { destroy: () => void; refresh: () => void; supported: boolean };
  }
}

type LiquidGlassProps = {
  children: React.ReactNode;
  className?: string;
  options?: Record<string, number>;
};

export function LiquidGlass({
  children,
  className = "",
  options = { scale: -80, chroma: 4, blur: 4 },
}: LiquidGlassProps) {
  const ref = useRef<HTMLDivElement>(null);

  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.liquidGlass !== "function") return;

    const glass = window.liquidGlass(el, JSON.parse(optionsKey) as Record<string, number>);
    return () => glass.destroy();
  }, [optionsKey]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
