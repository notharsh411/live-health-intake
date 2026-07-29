"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

type SmoothHashLinkProps = {
  href: `#${string}`;
  children: ReactNode;
  className?: string;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function smoothScrollTo(el: Element | null) {
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

/** In-page hash link with smooth scroll and sticky-header-aware targets. */
export function SmoothHashLink({
  href,
  children,
  className,
}: SmoothHashLinkProps) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    smoothScrollTo(target);
    window.history.pushState(null, "", href);
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

type BrandHeaderProps = {
  href?: string;
  compact?: boolean;
  trailing?: ReactNode;
};

export function BrandHeader({
  href = "/",
  compact = false,
  trailing,
}: BrandHeaderProps) {
  const pathname = usePathname();

  function onLogoClick(event: MouseEvent<HTMLAnchorElement>) {
    const onHome = pathname === "/" && (href === "/" || href === "");
    if (!onHome) return;

    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    if (window.location.hash) {
      window.history.pushState(null, "", "/");
    }
  }

  return (
    <header className={`brand-header${compact ? " compact" : ""}`}>
      <Link
        href={href}
        className="brand-lockup"
        aria-label="NSOffice.AI home"
        onClick={onLogoClick}
      >
        <img
          src="/brand/nsoffice-logo.svg"
          alt="NSOffice.AI"
          className="brand-logo"
          width={245}
          height={42}
        />
        <span className="brand-product">Live Health Intake</span>
      </Link>
      {trailing ? <div className="brand-trailing">{trailing}</div> : null}
    </header>
  );
}
