import { BrandHeader } from "@/components/BrandHeader";
import { LiveSessionPanel } from "@/components/LiveSessionPanel";
import Link from "next/link";

export default function IntakePage() {
  return (
    <main className="intake-page">
      <BrandHeader
        compact
        trailing={
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        }
      />
      <LiveSessionPanel />
    </main>
  );
}
