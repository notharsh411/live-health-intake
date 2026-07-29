import type { IntakeSummary, TriageLevel } from "@/lib/intake-schema";

type IntakeSummaryCardProps = {
  summary: IntakeSummary;
  title?: string;
  compact?: boolean;
  pulsedFields?: string[];
  triageReason?: string | null;
};

function Field({
  label,
  value,
  highlight,
  pulsed,
}: {
  label: string;
  value?: string | number | string[];
  highlight?: boolean;
  pulsed?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;

  const display = Array.isArray(value) ? value.join(", ") : String(value);

  return (
    <div
      className={`summary-field${highlight ? " red-flag" : ""}${pulsed ? " field-pulse" : ""}`}
    >
      <dt>{label}</dt>
      <dd>{display}</dd>
    </div>
  );
}

function TriageBadge({
  level,
  reason,
  pulsed,
}: {
  level: TriageLevel;
  reason?: string | null;
  pulsed?: boolean;
}) {
  const label =
    level === "urgent" ? "Urgent" : level === "soon" ? "Soon" : "Routine";

  return (
    <div className={`triage-badge triage-${level}${pulsed ? " field-pulse" : ""}`}>
      <span className="triage-dot" aria-hidden="true" />
      <div>
        <p className="triage-label">Triage · {label}</p>
        {reason ? <p className="triage-reason">{reason}</p> : null}
      </div>
    </div>
  );
}

export function IntakeSummaryCard({
  summary,
  title = "Intake summary",
  compact = false,
  pulsedFields = [],
  triageReason = null,
}: IntakeSummaryCardProps) {
  const pulsed = new Set(pulsedFields);
  const hasContent = Object.values(summary).some(
    (v) => v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0)
  );

  return (
    <div className={`card summary-card${compact ? " compact" : ""}`}>
      <h3>{title}</h3>
      {summary.triage_level ? (
        <TriageBadge
          level={summary.triage_level}
          reason={triageReason}
          pulsed={pulsed.has("triage_level")}
        />
      ) : null}
      {!hasContent ? (
        <p className="summary-empty">
          Fields will fill in as you speak. Chief complaint, duration, and
          severity usually come first.
        </p>
      ) : (
        <dl className="summary-grid">
          <Field
            label="Chief complaint"
            value={summary.chief_complaint}
            pulsed={pulsed.has("chief_complaint")}
          />
          <Field
            label="Onset"
            value={summary.onset}
            pulsed={pulsed.has("onset")}
          />
          <Field
            label="Duration"
            value={summary.duration}
            pulsed={pulsed.has("duration")}
          />
          <Field
            label="Severity (0-10)"
            value={summary.severity_0_10}
            pulsed={pulsed.has("severity_0_10")}
          />
          <Field
            label="Associated symptoms"
            value={summary.associated_symptoms}
            pulsed={pulsed.has("associated_symptoms")}
          />
          <Field
            label="Current medications"
            value={summary.current_medications}
            pulsed={pulsed.has("current_medications")}
          />
          <Field
            label="Allergies"
            value={summary.allergies}
            pulsed={pulsed.has("allergies")}
          />
          <Field
            label="Visual findings"
            value={summary.visual_findings}
            pulsed={pulsed.has("visual_findings")}
          />
          <Field
            label="Red flags"
            value={summary.red_flags}
            highlight
            pulsed={pulsed.has("red_flags")}
          />
          <Field
            label="Still needed"
            value={summary.missing_information}
            pulsed={pulsed.has("missing_information")}
          />
          <Field
            label="Clinician notes"
            value={summary.clinician_notes}
            pulsed={pulsed.has("clinician_notes")}
          />
        </dl>
      )}
    </div>
  );
}
