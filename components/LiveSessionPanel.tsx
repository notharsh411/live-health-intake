"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AudioLevelMeter } from "@/components/AudioLevelMeter";
import { IntakeSummaryCard } from "@/components/IntakeSummaryCard";
import { LiquidGlass } from "@/components/LiquidGlass";
import { useLiveIntake, type SessionStatus } from "@/hooks/use-live-intake";

function statusLabel(status: SessionStatus) {
  switch (status) {
    case "preparing":
      return "Preparing microphone";
    case "connecting":
      return "Connecting";
    case "live":
      return "Listening";
    case "complete":
      return "Intake complete";
    case "error":
      return "Error";
    default:
      return "Ready";
  }
}

function statusIcon(status: SessionStatus) {
  switch (status) {
    case "live":
      return "mic";
    case "connecting":
    case "preparing":
      return "sync";
    case "complete":
      return "check_circle";
    case "error":
      return "error";
    default:
      return "healing";
  }
}

export function LiveSessionPanel() {
  const router = useRouter();
  const {
    status,
    summary,
    transcript,
    inputLevel,
    outputLevel,
    errorMessage,
    startSession,
    stopSession,
  } = useLiveIntake(() => {
    router.push("/handoff");
  });

  const isLive = status === "live";
  const isBusy = status === "preparing" || status === "connecting";
  const canStart = status === "idle" || status === "error";
  const hasSummary = Object.keys(summary).length > 0;

  async function endAndHandoff() {
    await stopSession();
    router.push("/handoff");
  }

  return (
    <div className="intake-layout">
      <section className="intake-session">
        <div className="aurora" aria-hidden="true">
          <div className="blob" />
          <div className="blob" />
          <div className="blob" />
          <div className="blob" />
        </div>

        <LiquidGlass className="glass-light session-panel fade-up">
          <div className="session-header">
            <div className="icon-chip">
              <span className="material-symbols-rounded">
                {statusIcon(status)}
              </span>
            </div>
            <div>
              <p className="eyebrow">Live intake</p>
              <h2>{statusLabel(status)}</h2>
            </div>
          </div>

          {errorMessage && <p className="session-error">{errorMessage}</p>}

          <div className="meter-row">
            <AudioLevelMeter level={inputLevel} label="You" />
            <AudioLevelMeter level={outputLevel} label="Assistant" />
          </div>

          <p className="session-hint">
            {isLive
              ? "Speak at a normal pace. Follow-up questions will come one at a time, and the summary on the right updates as facts land."
              : "Allow microphone access, then say what brought you in today."}
          </p>

          <div className="session-actions">
            {canStart && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void startSession()}
              >
                Start voice intake
              </button>
            )}
            {isBusy && (
              <button type="button" className="btn btn-primary" disabled>
                Connecting...
              </button>
            )}
            {status === "complete" && (
              <Link href="/handoff" className="btn btn-primary">
                Review handoff
              </Link>
            )}
            {isLive && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void endAndHandoff()}
              >
                End intake
              </button>
            )}
            {!isLive && !isBusy && hasSummary && status !== "complete" && (
              <Link href="/handoff" className="btn btn-secondary">
                Review handoff
              </Link>
            )}
            <Link href="/" className="btn btn-ghost">
              Back
            </Link>
          </div>

          {transcript.length > 0 && (
            <div className="transcript-snippet card compact-card">
              <h4>Recent turns</h4>
              <ul>
                {transcript.slice(-4).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </LiquidGlass>
      </section>

      <aside className="intake-summary-aside">
        <IntakeSummaryCard summary={summary} />
      </aside>
    </div>
  );
}
