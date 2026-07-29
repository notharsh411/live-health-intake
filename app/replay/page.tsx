"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { IntakeSummaryCard } from "@/components/IntakeSummaryCard";
import {
  emptyIntakeSummary,
  RECORDING_STORAGE_KEY,
  type IntakeSummary,
} from "@/lib/intake-schema";
import type { SessionRecording } from "@/lib/session-recording";

export default function ReplayPage() {
  const [recording, setRecording] = useState<SessionRecording | null>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [summary, setSummary] = useState<IntakeSummary>(emptyIntakeSummary());
  const [lines, setLines] = useState<string[]>([]);
  const [pulsedFields, setPulsedFields] = useState<string[]>([]);
  const [triageReason, setTriageReason] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(RECORDING_STORAGE_KEY);
    if (!raw) return;
    try {
      setRecording(JSON.parse(raw) as SessionRecording);
    } catch {
      setRecording(null);
    }
  }, []);

  const events = recording?.events ?? [];

  useEffect(() => {
    if (!playing || !recording) return;
    if (cursor >= events.length) {
      setPlaying(false);
      return;
    }

    const event = events[cursor];
    const next = events[cursor + 1];
    const delay = next ? Math.max(400, Math.min(2200, next.t - event.t)) : 800;

    const timer = window.setTimeout(() => {
      if (event.type === "transcript" || event.type === "system") {
        const text =
          event.type === "system"
            ? `[system] ${event.text}`
            : `[${event.role}] ${event.text}`;
        setLines((prev) => [...prev, text]);
      }
      if (event.type === "fields") {
        setSummary(event.summary);
        setPulsedFields(event.keys);
        window.setTimeout(() => setPulsedFields([]), 1400);
      }
      if (event.type === "triage") {
        setSummary((prev) => ({ ...prev, triage_level: event.level }));
        setTriageReason(event.reason ?? null);
        setPulsedFields(["triage_level"]);
        window.setTimeout(() => setPulsedFields([]), 1400);
      }
      setCursor((value) => value + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [cursor, events, playing, recording]);

  const meta = useMemo(() => {
    if (!recording) return "No recording in this browser session yet.";
    return `${recording.options.language.toUpperCase()} · ${recording.options.specialty} · ${events.length} events`;
  }, [events.length, recording]);

  function resetReplay() {
    setCursor(0);
    setPlaying(false);
    setSummary(emptyIntakeSummary());
    setLines([]);
    setPulsedFields([]);
    setTriageReason(null);
  }

  return (
    <main className="handoff-page hive">
      <BrandHeader
        compact
        trailing={
          <Link href="/intake" className="btn btn-ghost">
            Intake
          </Link>
        }
      />
      <div className="handoff-inner replay-inner">
        <header className="page-header">
          <span className="eyebrow">Reviewer replay</span>
          <h1>Session recording</h1>
          <p>
            Replay the last intake in this browser without a microphone. Useful
            when someone needs to see the flow after the fact.
          </p>
          <p className="replay-meta">{meta}</p>
        </header>

        <div className="handoff-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!recording || events.length === 0}
            onClick={() => {
              if (cursor >= events.length) resetReplay();
              setPlaying(true);
            }}
          >
            {playing ? "Playing..." : "Play replay"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetReplay}>
            Reset
          </button>
          <Link href="/intake" className="btn btn-ghost">
            Back to intake
          </Link>
        </div>

        <div className="replay-grid">
          <div className="card">
            <h3>Timeline</h3>
            {lines.length === 0 ? (
              <p className="summary-empty">Press play to step through the session.</p>
            ) : (
              <ul className="replay-lines">
                {lines.map((line, index) => (
                  <li key={`${index}-${line.slice(0, 24)}`}>{line}</li>
                ))}
              </ul>
            )}
          </div>
          <IntakeSummaryCard
            summary={summary}
            pulsedFields={pulsedFields}
            triageReason={triageReason}
            title="Summary as it filled"
          />
        </div>
      </div>
    </main>
  );
}
