import Link from "next/link";
import { BrandHeader } from "@/components/BrandHeader";
import { LiquidGlass } from "@/components/LiquidGlass";
import { Reveal, RevealText } from "@/components/ScrollReveal";

const DECISION_BAR_GLASS = { scale: -80, chroma: 4, blur: 4 };

export default function HomeV2() {
  return (
    <>
      <BrandHeader
        trailing={
          <nav className="site-nav-links" aria-label="Primary">
            <a href="#problem">The gap</a>
            <a href="#showcase">See it work</a>
            <Link href="/v1" className="nav-fallback">
              Classic V1
            </Link>
          </nav>
        }
      />

      <section className="hero hero-v2">
        <div className="aurora" aria-hidden="true">
          <div className="blob" />
          <div className="blob" />
          <div className="blob" />
          <div className="blob" />
        </div>
        <div className="hero-inner">
          <span className="eyebrow fade-up">NSOffice.AI · Live Health Intake</span>
          <h1 className="fade-up" style={{ animationDelay: "40ms" }}>
            Walk into the visit with the story already written
          </h1>
          <p className="lede fade-up" style={{ animationDelay: "100ms" }}>
            Speak your symptoms once. The assistant asks what a good intake
            nurse would ask, and builds a structured note your clinician can
            open before they walk in the room.
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

          <p className="hero-meta fade-up" style={{ animationDelay: "220ms" }}>
            Works in the browser on phone or desktop. No app install. Mic over
            HTTPS only.
          </p>
        </div>
      </section>

      <section className="section problem-section" id="problem">
        <RevealText className="problem-copy" delay={40}>
          <span className="eyebrow">The gap</span>
          <h2>Most intakes still start cold</h2>
          <p>
            Forms flatten the story. Waiting-room portals get abandoned. By the
            time the clinician opens the chart, onset is fuzzy, severity is a
            guess, and red flags may never have been asked.
          </p>
          <p>
            Voice fixes the friction. Structure fixes the handoff. This demo
            does both in one live session.
          </p>
        </RevealText>
        <Reveal as="div" variant="scale" delay={140} className="problem-panel card">
          <h3>What usually gets missed</h3>
          <ul className="miss-list">
            <li>
              <span className="material-symbols-rounded">schedule</span>
              Exact onset and how long it has lasted
            </li>
            <li>
              <span className="material-symbols-rounded">thermostat</span>
              Severity on a shared 0 to 10 scale
            </li>
            <li>
              <span className="material-symbols-rounded">medication</span>
              Current meds and allergies in the patient&apos;s words
            </li>
            <li>
              <span className="material-symbols-rounded">emergency_home</span>
              Chest pain, breathing trouble, and other red flags
            </li>
          </ul>
        </Reveal>
      </section>

      <section className="showcase-section" id="showcase">
        <div className="showcase-shell">
          <div className="aurora showcase-aurora" aria-hidden="true">
            <div className="blob" />
            <div className="blob" />
            <div className="blob" />
            <div className="blob" />
          </div>

          <RevealText className="showcase-intro" delay={40}>
            <span className="eyebrow">See it work</span>
            <h2>Talk on the left. Chart fills on the right.</h2>
            <p>
              Mid-conversation tool calls push facts into the clinician panel
              as soon as they are confirmed. That is the product, not a chat
              log after the fact.
            </p>
          </RevealText>

          <div className="showcase-grid">
            <Reveal
              variant="left"
              delay={80}
              className="glass-light showcase-card convo-card"
            >
              <div className="showcase-card-head">
                <div className="icon-chip">
                  <span className="material-symbols-rounded">graphic_eq</span>
                </div>
                <div>
                  <p className="eyebrow">Live session</p>
                  <h3>Patient + assistant</h3>
                </div>
              </div>
              <ol className="convo-demo sr-stagger">
                <li className="convo-line patient">
                  I&apos;ve had this tight headache behind my eyes since
                  yesterday afternoon.
                </li>
                <li className="convo-line assistant">
                  On a scale from 0 to 10, how bad is it right now?
                </li>
                <li className="convo-line patient">
                  Maybe a six. Light bothers me, and I took ibuprofen once.
                </li>
                <li className="convo-line assistant">
                  Any chest pain or trouble breathing with it?
                </li>
              </ol>
            </Reveal>

            <Reveal
              variant="right"
              delay={160}
              className="card showcase-card summary-demo"
            >
              <div className="showcase-card-head">
                <div className="icon-chip">
                  <span className="material-symbols-rounded">
                    clinical_notes
                  </span>
                </div>
                <div>
                  <p className="eyebrow">Tool call</p>
                  <h3>Intake summary</h3>
                </div>
              </div>
              <dl className="summary-grid demo-fields">
                <div className="summary-field reveal-1">
                  <dt>Chief complaint</dt>
                  <dd>Tight headache behind the eyes</dd>
                </div>
                <div className="summary-field reveal-2">
                  <dt>Onset / duration</dt>
                  <dd>Since yesterday afternoon</dd>
                </div>
                <div className="summary-field reveal-3">
                  <dt>Severity (0-10)</dt>
                  <dd>6</dd>
                </div>
                <div className="summary-field reveal-4">
                  <dt>Associated / meds</dt>
                  <dd>Photophobia · ibuprofen once</dd>
                </div>
                <div className="summary-field reveal-5">
                  <dt>Red flags</dt>
                  <dd>None reported so far</dd>
                </div>
              </dl>
              <p className="demo-caption">
                Illustrative preview. Your live session writes the real fields.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <RevealText as="h2" delay={40}>
          From first word to handoff
        </RevealText>
        <div className="grid-3 flow-steps">
          <Reveal variant="scale" delay={80} className="card feature-card">
            <div className="step-num">1</div>
            <h3>Speak</h3>
            <p>
              Open the session on any phone or laptop. Say what brought you in.
              Interrupt anytime.
            </p>
          </Reveal>
          <Reveal variant="scale" delay={160} className="card feature-card">
            <div className="step-num">2</div>
            <h3>Clarify</h3>
            <p>
              One follow-up at a time: duration, severity, meds, allergies, red
              flags. No wall of form fields.
            </p>
          </Reveal>
          <Reveal variant="scale" delay={240} className="card feature-card">
            <div className="step-num">3</div>
            <h3>Handoff</h3>
            <p>
              Copy a clinician note, download a branded PDF for WhatsApp or
              email, or export JSON. The chart starts warm.
            </p>
          </Reveal>
        </div>

        <Reveal className="cta-row final-cta" delay={120}>
          <Link href="/intake" className="btn btn-primary">
            Start voice intake
          </Link>
          <a href="#showcase" className="btn btn-ghost">
            Review the demo above
          </a>
        </Reveal>
      </section>

      <footer className="site-footer">
        <RevealText delay={40}>
          <p className="disclaimer">
            Demo only. This tool does not provide medical advice, diagnosis, or
            treatment. For emergencies, call your local emergency number.
          </p>
          <p className="footer-meta">
            Prefer the original short homepage?{" "}
            <Link href="/v1">Open classic V1</Link>
          </p>
        </RevealText>
      </footer>
    </>
  );
}
