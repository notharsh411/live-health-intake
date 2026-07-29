"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AudioLevelMeter } from "@/components/AudioLevelMeter";
import { IntakeSummaryCard } from "@/components/IntakeSummaryCard";
import { LiquidGlass } from "@/components/LiquidGlass";
import { useLiveIntake, type SessionStatus } from "@/hooks/use-live-intake";
import {
  LANGUAGE_OPTIONS,
  SPECIALTY_OPTIONS,
  type IntakeLanguage,
  type IntakeSpecialty,
} from "@/lib/session-options";

function statusLabel(status: SessionStatus) {
  switch (status) {
    case "preparing":
      return "Preparing microphone";
    case "connecting":
      return "Connecting";
    case "ready":
      return "Ready when you are";
    case "live":
      return "Listening";
    case "complete":
      return "Intake complete";
    case "interrupted":
      return "Session paused";
    case "error":
      return "Error";
    default:
      return "Set up your session";
  }
}

function statusIcon(status: SessionStatus) {
  switch (status) {
    case "live":
      return "mic";
    case "ready":
      return "touch_app";
    case "connecting":
    case "preparing":
      return "sync";
    case "complete":
      return "check_circle";
    case "interrupted":
      return "phone_paused";
    case "error":
      return "error";
    default:
      return "healing";
  }
}

export function LiveSessionPanel() {
  const router = useRouter();
  const [language, setLanguage] = useState<IntakeLanguage>("en");
  const [specialty, setSpecialty] = useState<IntakeSpecialty>("general");

  const {
    status,
    summary,
    transcript,
    inputLevel,
    outputLevel,
    errorMessage,
    pulsedFields,
    triageReason,
    cameraEnabled,
    cameraPromptOpen,
    cameraFacing,
    framesStreaming,
    videoElRef,
    startSession,
    beginConversation,
    enableCamera,
    beginFrameStreaming,
    switchCamera,
    declineCamera,
    stopCamera,
  } = useLiveIntake(() => {
    router.push("/handoff");
  });

  const isLive = status === "live";
  const isReady = status === "ready";
  const isBusy = status === "preparing" || status === "connecting";
  const canConfigure =
    status === "idle" || status === "error" || status === "interrupted";
  const hasSummary = Object.keys(summary).length > 0;

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

          {status === "interrupted" && (
            <div className="interrupt-banner card compact-card">
              <h4>Screen sleep interrupted the live line</h4>
              <p>
                Whatever was captured is still saved on this phone. Open the
                handoff for the partial note, or connect again to continue.
              </p>
              <div className="session-actions">
                <Link href="/handoff" className="btn btn-primary">
                  Open saved handoff
                </Link>
              </div>
            </div>
          )}

          {canConfigure && (
            <div className="setup-grid">
              <div>
                <p className="setup-label">Language</p>
                <div className="chip-row">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`choice-chip${language === option.id ? " active" : ""}`}
                      onClick={() => setLanguage(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="setup-label">Specialty template</p>
                <div className="chip-row">
                  {SPECIALTY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`choice-chip${specialty === option.id ? " active" : ""}`}
                      onClick={() => setSpecialty(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(isLive || isReady || isBusy) && (
            <div className="meter-row">
              <AudioLevelMeter level={inputLevel} label="You" />
              <AudioLevelMeter level={outputLevel} label="Assistant" />
            </div>
          )}

          <p className="session-hint">
            {canConfigure &&
              status !== "interrupted" &&
              "Pick language and specialty, then connect. Keep the screen awake during the call when you can."}
            {status === "interrupted" &&
              "Nothing is lost from this browser session. Review the saved summary or start a fresh connection."}
            {isBusy && "Connecting securely..."}
            {isReady &&
              "Tap I'm ready to speak when you want to start. The assistant will keep asking follow-ups until the intake is complete."}
            {isLive &&
              "Keep talking through the follow-ups. Finish stays locked until the assistant marks the intake complete."}
            {status === "complete" &&
              "All set. Review the clinician handoff when you are ready."}
          </p>

          <div className="session-actions">
            {canConfigure && (
              <button
                type="button"
                className={`btn ${status === "interrupted" ? "btn-secondary" : "btn-primary"}`}
                onClick={() => void startSession({ language, specialty })}
              >
                {status === "interrupted" ? "Reconnect session" : "Connect session"}
              </button>
            )}
            {isBusy && (
              <button type="button" className="btn btn-primary" disabled>
                Connecting...
              </button>
            )}
            {isReady && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void beginConversation()}
              >
                I&apos;m ready to speak
              </button>
            )}
            {isLive && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled
                title="The assistant will unlock finish when follow-ups are done"
              >
                Follow-ups still open
              </button>
            )}
            {status === "complete" && (
              <Link href="/handoff" className="btn btn-primary">
                Review handoff
              </Link>
            )}
            {isLive && cameraEnabled && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={stopCamera}
              >
                Stop camera
              </button>
            )}
            {!isLive &&
              !isBusy &&
              !isReady &&
              hasSummary &&
              status !== "complete" && (
                <Link href="/handoff" className="btn btn-secondary">
                  Review handoff
                </Link>
              )}
            <Link href="/replay" className="btn btn-ghost">
              Reviewer replay
            </Link>
            <Link href="/" className="btn btn-ghost">
              Back
            </Link>
          </div>

          {cameraPromptOpen && isLive && !cameraEnabled && (
            <div className="camera-prompt card compact-card">
              <h4>Show something to the camera?</h4>
              <p>
                Optional. If you want, share a medication bottle, skin area, or
                document so the assistant can ground its questions.
              </p>
              <div className="session-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void enableCamera()}
                >
                  Share camera
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={declineCamera}
                >
                  Not now
                </button>
              </div>
            </div>
          )}

          <div className={`camera-stage${cameraEnabled ? " active" : ""}`}>
            <div className="camera-preview-wrap">
              <video
                ref={videoElRef}
                className={`camera-preview${cameraFacing === "user" ? " mirrored" : ""}`}
                playsInline
                muted
                autoPlay
              />
              {cameraEnabled && (
                <div className="camera-toolbar">
                  <button
                    type="button"
                    className="btn btn-ghost camera-flip-btn"
                    onClick={() => void switchCamera()}
                  >
                    Flip camera
                  </button>
                  {!framesStreaming ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={beginFrameStreaming}
                    >
                      I&apos;m showing it now
                    </button>
                  ) : (
                    <span className="camera-live-pill">Sharing with assistant</span>
                  )}
                </div>
              )}
            </div>
            {cameraEnabled && (
              <p className="camera-caption">
                {framesStreaming
                  ? "Sharing soon — fill the frame with the label, skin area, or document. The assistant should stay quiet about vision until that is clear."
                  : "Preview only — the assistant cannot see this yet. Aim first, then tap I’m showing it now."}
              </p>
            )}
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
        <IntakeSummaryCard
          summary={summary}
          pulsedFields={pulsedFields}
          triageReason={triageReason}
        />
      </aside>
    </div>
  );
}
