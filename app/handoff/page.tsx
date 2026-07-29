"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { IntakeSummaryCard } from "@/components/IntakeSummaryCard";
import {
  downloadHandoffPdf,
  shareHandoffPdf,
} from "@/lib/handoff-pdf";
import {
  emptyIntakeSummary,
  INTAKE_STORAGE_KEY,
  TRANSCRIPT_STORAGE_KEY,
  TRIAGE_REASON_KEY,
  type IntakeSummary,
} from "@/lib/intake-schema";

export default function HandoffPage() {
  const [summary, setSummary] = useState<IntakeSummary>(emptyIntakeSummary());
  const [transcript, setTranscript] = useState("");
  const [triageReason, setTriageReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(INTAKE_STORAGE_KEY);
    const storedTranscript = sessionStorage.getItem(TRANSCRIPT_STORAGE_KEY) ?? "";
    const storedReason = sessionStorage.getItem(TRIAGE_REASON_KEY);
    const parsed = stored
      ? (JSON.parse(stored) as IntakeSummary)
      : emptyIntakeSummary();

    startTransition(() => {
      setSummary(parsed);
      setTranscript(storedTranscript);
      setTriageReason(storedReason);
    });

    void fetch("/api/summary/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: parsed, transcript: storedTranscript }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setNote(data.note);
        else
          setNote(
            "Could not generate clinician note. Structured fields are below."
          );
      })
      .catch(() => {
        setNote(
          "Could not generate clinician note. Structured fields are below."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const pdfInput = useMemo(
    () => ({ summary, note, triageReason }),
    [summary, note, triageReason]
  );

  const hasContent =
    Object.values(summary).some(
      (v) =>
        v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0)
    ) || Boolean(note);

  async function copyNote() {
    const text = [
      "PRE-CONSULTATION INTAKE NOTE",
      summary.triage_level
        ? `TRIAGE: ${summary.triage_level.toUpperCase()}`
        : "",
      triageReason ? `REASON: ${triageReason}` : "",
      "",
      note,
      "",
      "STRUCTURED FIELDS",
      JSON.stringify(summary, null, 2),
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(text);
    setCopyMessage("Copied to clipboard.");
    setTimeout(() => setCopyMessage(""), 2500);
  }

  function downloadJson() {
    const blob = new Blob(
      [JSON.stringify({ summary, transcript, note, triageReason }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intake-handoff.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf() {
    if (pdfBusy || loading || !hasContent) return;
    setPdfBusy(true);
    try {
      await downloadHandoffPdf(pdfInput);
      setCopyMessage("PDF downloaded. Attach it in email, WhatsApp, or Files.");
      setTimeout(() => setCopyMessage(""), 3500);
    } catch {
      setCopyMessage("Could not create the PDF. Try again.");
      setTimeout(() => setCopyMessage(""), 3500);
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleSharePdf() {
    if (pdfBusy || loading || !hasContent) return;
    setPdfBusy(true);
    try {
      const result = await shareHandoffPdf(pdfInput);
      if (result === "shared") {
        setCopyMessage("Share sheet opened.");
        setTimeout(() => setCopyMessage(""), 2500);
      } else if (result === "unsupported") {
        await downloadHandoffPdf(pdfInput);
        setCopyMessage("Sharing unavailable here — PDF downloaded instead.");
        setTimeout(() => setCopyMessage(""), 3500);
      }
    } catch {
      setCopyMessage("Could not share the PDF. Try Download PDF instead.");
      setTimeout(() => setCopyMessage(""), 3500);
    } finally {
      setPdfBusy(false);
    }
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
      <div className="handoff-inner">
        <header className="page-header">
          <span className="eyebrow">Clinician handoff</span>
          <h1>Intake summary</h1>
          <p>
            Review what the voice session captured. Download a branded PDF to
            carry or send by email, WhatsApp, or other apps — or copy the note /
            JSON. Partial sessions from screen sleep are still available here.
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

        <IntakeSummaryCard
          summary={summary}
          title="Structured fields"
          triageReason={triageReason}
        />

        <div className="handoff-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleDownloadPdf()}
            disabled={loading || pdfBusy || !hasContent}
          >
            {pdfBusy ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleSharePdf()}
            disabled={loading || pdfBusy || !hasContent}
          >
            Share PDF
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void copyNote()}
            disabled={loading}
          >
            Copy for doctor
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={downloadJson}
          >
            Download JSON
          </button>
          <Link href="/replay" className="btn btn-ghost">
            Reviewer replay
          </Link>
          <Link href="/intake" className="btn btn-ghost">
            Start over
          </Link>
        </div>

        {copyMessage && <p className="copy-toast">{copyMessage}</p>}
      </div>
    </main>
  );
}
