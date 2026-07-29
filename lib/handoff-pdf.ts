import { jsPDF } from "jspdf";
import type { IntakeSummary, TriageLevel } from "@/lib/intake-schema";

/** NSOffice Glass UI tokens mirrored for PDF (cannot use CSS vars in jsPDF). */
type Rgb = readonly [number, number, number];

const THEME = {
  blue: [0, 0, 254] as const satisfies Rgb,
  blueSoft: [232, 232, 255] as const satisfies Rgb,
  bgAlt: [247, 248, 252] as const satisfies Rgb,
  ink: [46, 52, 63] as const satisfies Rgb,
  slate: [154, 167, 188] as const satisfies Rgb,
  white: [255, 255, 255] as const satisfies Rgb,
  line: [220, 226, 236] as const satisfies Rgb,
  red: [192, 57, 43] as const satisfies Rgb,
  redSoft: [255, 241, 240] as const satisfies Rgb,
  green: [31, 143, 78] as const satisfies Rgb,
  greenSoft: [243, 250, 245] as const satisfies Rgb,
  amber: [196, 122, 0] as const satisfies Rgb,
  amberSoft: [255, 248, 236] as const satisfies Rgb,
};

function fill(doc: jsPDF, color: Rgb) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function stroke(doc: jsPDF, color: Rgb) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function ink(doc: jsPDF, color: Rgb) {
  doc.setTextColor(color[0], color[1], color[2]);
}

const MARGIN = 48;
const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

export type HandoffPdfInput = {
  summary: IntakeSummary;
  note: string;
  triageReason?: string | null;
  generatedAt?: Date;
};

type FieldRow = { label: string; value: string; highlight?: boolean };

function triagePalette(level: TriageLevel): {
  fg: Rgb;
  bg: Rgb;
  label: string;
} {
  if (level === "urgent") {
    return { fg: THEME.red, bg: THEME.redSoft, label: "Urgent" };
  }
  if (level === "soon") {
    return { fg: THEME.amber, bg: THEME.amberSoft, label: "Soon" };
  }
  return { fg: THEME.green, bg: THEME.greenSoft, label: "Routine" };
}

function formatValue(value: string | number | string[] | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    return value.join(", ");
  }
  return String(value);
}

function buildFields(summary: IntakeSummary): FieldRow[] {
  const entries: Array<[string, string | number | string[] | undefined, boolean?]> = [
    ["Chief complaint", summary.chief_complaint],
    ["Onset", summary.onset],
    ["Duration", summary.duration],
    ["Severity (0–10)", summary.severity_0_10],
    ["Associated symptoms", summary.associated_symptoms],
    ["Current medications", summary.current_medications],
    ["Allergies", summary.allergies],
    ["Visual findings", summary.visual_findings],
    ["Red flags", summary.red_flags, true],
    ["Still needed", summary.missing_information],
    ["Clinician notes", summary.clinician_notes],
  ];

  const rows: FieldRow[] = [];
  for (const [label, raw, highlight] of entries) {
    const value = formatValue(raw);
    if (value) rows.push({ label, value, highlight });
  }
  return rows;
}

function wrapText(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, maxWidth) as string[];
}

async function loadLogoPngDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/brand/nsoffice-logo.svg");
    if (!res.ok) return null;
    const svg = await res.text();
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("logo load failed"));
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = 490 * scale;
      canvas.height = 84 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= PAGE_H - 56) return y;
  doc.addPage();
  drawPageChrome(doc, false);
  return 72;
}

function drawPageChrome(doc: jsPDF, isFirst: boolean) {
  fill(doc, THEME.blue);
  doc.rect(0, 0, PAGE_W, isFirst ? 92 : 8, "F");

  fill(doc, THEME.bgAlt);
  doc.rect(0, PAGE_H - 42, PAGE_W, 42, "F");
  ink(doc, THEME.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Demo only · Not a diagnosis · NSOffice.AI Live Health Intake",
    PAGE_W / 2,
    PAGE_H - 22,
    { align: "center" }
  );
}

function drawSectionLabel(doc: jsPDF, label: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  ink(doc, THEME.blue);
  doc.text(label.toUpperCase(), MARGIN, y);
  stroke(doc, THEME.line);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 6, MARGIN + CONTENT_W, y + 6);
  return y + 20;
}

/**
 * Builds a branded A4 PDF matching NSOffice Glass UI colors and handoff layout.
 */
export async function buildHandoffPdfBlob(
  input: HandoffPdfInput
): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const when = input.generatedAt ?? new Date();
  const stamp = when.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  drawPageChrome(doc, true);

  ink(doc, THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Live Health Intake", MARGIN, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("NSOffice.AI · Pre-consultation handoff", MARGIN, 58);
  doc.setFontSize(8);
  doc.text(stamp, PAGE_W - MARGIN, 48, { align: "right" });

  let y = 112;
  const logo = await loadLogoPngDataUrl();
  if (logo) {
    doc.addImage(logo, "PNG", MARGIN, y, 150, 26);
    y += 40;
  }

  ink(doc, THEME.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Intake summary", MARGIN, y);
  y += 20;

  if (input.summary.triage_level) {
    const palette = triagePalette(input.summary.triage_level);
    const reason = input.triageReason?.trim();
    const boxH = reason ? 52 : 36;
    y = ensureSpace(doc, y, boxH + 12);
    fill(doc, palette.bg);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 10, 10, "F");
    fill(doc, palette.fg);
    doc.circle(MARGIN + 16, y + 18, 5, "F");
    ink(doc, palette.fg);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Triage · ${palette.label}`, MARGIN + 28, y + 22);
    if (reason) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      ink(doc, THEME.ink);
      const lines = wrapText(doc, reason, CONTENT_W - 40, 9);
      doc.text(lines, MARGIN + 28, y + 38);
    }
    y += boxH + 18;
  }

  y = drawSectionLabel(doc, "Clinician note", y);
  const noteText =
    input.note?.trim() ||
    "No polished clinician note was available. See structured fields below.";
  const noteLines = wrapText(doc, noteText, CONTENT_W - 28, 11);
  const noteBoxH = Math.max(56, noteLines.length * 15 + 28);
  y = ensureSpace(doc, y, noteBoxH + 16);
  fill(doc, THEME.bgAlt);
  doc.roundedRect(MARGIN, y, CONTENT_W, noteBoxH, 12, 12, "F");
  stroke(doc, THEME.blueSoft);
  doc.setLineWidth(1.2);
  doc.roundedRect(MARGIN, y, CONTENT_W, noteBoxH, 12, 12, "S");
  ink(doc, THEME.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(noteLines, MARGIN + 14, y + 22);
  y += noteBoxH + 22;

  const fields = buildFields(input.summary);
  y = drawSectionLabel(doc, "Structured fields", y);

  if (!fields.length) {
    ink(doc, THEME.slate);
    doc.setFontSize(10);
    doc.text("No structured fields were captured in this session.", MARGIN, y);
    y += 16;
  } else {
    for (const field of fields) {
      const valueLines = wrapText(doc, field.value, CONTENT_W - 28, 10);
      const rowH = 18 + valueLines.length * 13 + 14;
      y = ensureSpace(doc, y, rowH + 8);

      fill(doc, field.highlight ? THEME.redSoft : THEME.white);
      doc.roundedRect(MARGIN, y, CONTENT_W, rowH, 10, 10, "F");
      stroke(doc, THEME.line);
      doc.setLineWidth(0.8);
      doc.roundedRect(MARGIN, y, CONTENT_W, rowH, 10, 10, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      ink(doc, field.highlight ? THEME.red : THEME.slate);
      doc.text(field.label.toUpperCase(), MARGIN + 14, y + 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      ink(doc, THEME.ink);
      doc.text(valueLines, MARGIN + 14, y + 32);
      y += rowH + 8;
    }
  }

  y = ensureSpace(doc, y, 48);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  ink(doc, THEME.slate);
  const disclaimer = wrapText(
    doc,
    "This report is generated from a live voice intake demo. It is not medical advice, diagnosis, or a substitute for clinical judgment. Share only through channels your care team approves.",
    CONTENT_W,
    8
  );
  doc.text(disclaimer, MARGIN, y);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    ink(doc, THEME.slate);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 22, {
      align: "right",
    });
  }

  return doc.output("blob");
}

export function handoffPdfFilename(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  return `health-intake-handoff-${iso}.pdf`;
}

export async function downloadHandoffPdf(
  input: HandoffPdfInput
): Promise<void> {
  const blob = await buildHandoffPdfBlob(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = handoffPdfFilename(input.generatedAt);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function canShareHandoffPdf(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return true;
  try {
    const probe = new File([new Blob(["x"], { type: "application/pdf" })], "x.pdf", {
      type: "application/pdf",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function shareHandoffPdf(
  input: HandoffPdfInput
): Promise<"shared" | "cancelled" | "unsupported"> {
  if (!canShareHandoffPdf()) return "unsupported";
  const blob = await buildHandoffPdfBlob(input);
  const file = new File([blob], handoffPdfFilename(input.generatedAt), {
    type: "application/pdf",
  });
  try {
    await navigator.share({
      files: [file],
      title: "Health Intake Handoff",
      text: "Pre-consultation intake report from Live Health Intake (NSOffice.AI).",
    });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    throw error;
  }
}
