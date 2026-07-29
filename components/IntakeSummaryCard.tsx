import type { IntakeSummary } from "@/lib/intake-schema";

type IntakeSummaryCardProps = {
  summary: IntakeSummary;
  title?: string;
  compact?: boolean;
};

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string | number | string[];
  highlight?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;

  const display = Array.isArray(value) ? value.join(", ") : String(value);

  return (
    <div className={`summary-field${highlight ? " red-flag" : ""}`}>
      <dt>{label}</dt>
      <dd>{display}</dd>
    </div>
  );
}

export function IntakeSummaryCard({
  summary,
  title = "Intake summary",
  compact = false,
}: IntakeSummaryCardProps) {
  const hasContent = Object.values(summary).some(
    (v) => v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0)
  );

  return (
    <div className={`card summary-card${compact ? " compact" : ""}`}>
      <h3>{title}</h3>
      {!hasContent ? (
        <p className="summary-empty">
          Fields will fill in as you speak. Chief complaint, duration, and
          severity usually come first.
        </p>
      ) : (
        <dl className="summary-grid">
          <Field label="Chief complaint" value={summary.chief_complaint} />
          <Field label="Onset" value={summary.onset} />
          <Field label="Duration" value={summary.duration} />
          <Field label="Severity (0-10)" value={summary.severity_0_10} />
          <Field
            label="Associated symptoms"
            value={summary.associated_symptoms}
          />
          <Field
            label="Current medications"
            value={summary.current_medications}
          />
          <Field label="Allergies" value={summary.allergies} />
          <Field label="Red flags" value={summary.red_flags} highlight />
          <Field
            label="Still needed"
            value={summary.missing_information}
          />
          <Field label="Clinician notes" value={summary.clinician_notes} />
        </dl>
      )}
    </div>
  );
}
