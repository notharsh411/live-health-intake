import Link from "next/link";
import { LiquidGlass } from "@/components/LiquidGlass";

const DECISION_BAR_GLASS = { scale: -80, chroma: 4, blur: 4 };

/** Original simple homepage (V1). Mounted at /v1 for fallback. */
export function HomeV1() {
  return (
    <>
      <section className="hero">
        <div className="aurora" aria-hidden="true">
          <div className="blob" />
          <div className="blob" />
          <div className="blob" />
          <div className="blob" />
        </div>
        <div className="hero-inner">
          <span className="eyebrow">NSOffice.AI · V1</span>
          <h1 className="fade-up">Describe your symptoms out loud</h1>
          <p className="lede fade-up" style={{ animationDelay: "80ms" }}>
            Talk through what you are feeling. The assistant asks short
            follow-ups and fills a structured note your clinician can read
            before the visit.
          </p>

          <LiquidGlass
            className="glass-light decision-bar fade-up"
            options={DECISION_BAR_GLASS}
          >
            <span
              className="material-symbols-rounded"
              style={{ color: "var(--blue)" }}
            >
              mic
            </span>
            <span className="decision-bar-label">Start voice intake</span>
            <Link href="/intake" className="go" aria-label="Start voice intake">
              <span className="material-symbols-rounded">arrow_forward</span>
            </Link>
          </LiquidGlass>

          <div className="cta-row fade-up" style={{ animationDelay: "240ms" }}>
            <a href="#how-it-works" className="btn btn-ghost">
              How it works
            </a>
            <Link href="/" className="btn btn-ghost">
              Switch to V2
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <h2>What happens in the session</h2>
        <div className="grid-3">
          <div className="card feature-card">
            <div className="icon-chip">
              <span className="material-symbols-rounded">mic</span>
            </div>
            <h3>Voice conversation</h3>
            <p>
              Gemini Live listens and speaks back over a live connection, so
              you can interrupt mid-sentence the way you would with a person.
            </p>
          </div>
          <div className="card feature-card">
            <div className="icon-chip">
              <span className="material-symbols-rounded">chat</span>
            </div>
            <h3>Focused follow-ups</h3>
            <p>
              Duration, severity, medications, and allergies come up one at a
              time instead of as a long form.
            </p>
          </div>
          <div className="card feature-card">
            <div className="icon-chip">
              <span className="material-symbols-rounded">clinical_notes</span>
            </div>
            <h3>Live clinician note</h3>
            <p>
              Tool calls update the summary panel while you talk. When you are
              done, copy or download the handoff.
            </p>
          </div>
        </div>
      </section>

      <p className="disclaimer">
        Demo only. This tool does not provide medical advice, diagnosis, or
        treatment. For emergencies, call your local emergency number.
      </p>
    </>
  );
}
