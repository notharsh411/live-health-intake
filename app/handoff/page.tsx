"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IntakeSummaryCard } from "@/components/IntakeSummaryCard";
import {
  emptyIntakeSummary,
  INTAKE_STORAGE_KEY,
  TRANSCRIPT_STORAGE_KEY,
  type IntakeSummary,
} from "@/lib/intake-schema";

export default function HandoffPage() {
  const [summary, setSummary] = useState<IntakeSummary>(emptyIntakeSummary());
  const [transcript, setTranscript] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(INTAKE_STORAGE_KEY);
    const storedTranscript = sessionStorage.getItem(TRANSCRIPT_STORAGE_KEY) ?? "";
    const parsed = stored ? (JSON.parse(stored) as IntakeSummary) : emptyIntakeSummary();
    setSummary(parsed);
    setTranscript(storedTranscript);

    void fetch("/api/summary/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: parsed, transcript: storedTranscript }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setNote(data.note);
        else setNote("Could not generate clinician note. Structured fields are below.");
      })
      .catch(() => {
        setNote("Could not generate clinician note. Structured fields are below.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function copyNote() {
    const text = [
      "PRE-CONSULTATION INTAKE NOTE",
      "",
      note,
      "",
      "STRUCTURED FIELDS",
      JSON.stringify(summary, null, 2),
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopyMessage("Copied to clipboard.");
    setTimeout(() => setCopyMessage(""), 2500);
  }

  function downloadJson() {
    const blob = new Blob(
      [JSON.stringify({ summary, transcript, note }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intake-handoff.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="handoff-page hive">
      <div className="handoff-inner">
        <header className="page-header">
          <span className="eyebrow">Clinician handoff</span>
          <h1>Intake summary</h1>
          <p>
            Review what the voice session captured. Copy the note or download
            the JSON before the visit.
          </p>
        </header>

        <div className="card">
          <h3>Clinician note</h3>
          {loading ? (
            <p className="summary-empty">Writing the note...</p>
          ) : (
            <p className="handoff-note">{note}</p>
          )}
        </div>

        <IntakeSummaryCard summary={summary} title="Structured fields" />

        <div className="handoff-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void copyNote()}
            disabled={loading}
          >
            Copy for doctor
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={downloadJson}
          >
            Download JSON
          </button>
          <Link href="/intake" className="btn btn-ghost">
            Start over
          </Link>
        </div>

        {copyMessage && <p className="copy-toast">{copyMessage}</p>}
      </div>
    </main>
  );
}
