import Link from "next/link";

type BrandHeaderProps = {
  href?: string;
  compact?: boolean;
  trailing?: React.ReactNode;
};

export function BrandHeader({
  href = "/",
  compact = false,
  trailing,
}: BrandHeaderProps) {
  return (
    <header className={`brand-header${compact ? " compact" : ""}`}>
      <Link href={href} className="brand-lockup" aria-label="NSOffice.AI home">
        {/* Official wordmark from nsoffice.ai; colors remain Electric Blue via CSS filter-safe fill in SVG */}
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
