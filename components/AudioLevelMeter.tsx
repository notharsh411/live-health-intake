type AudioLevelMeterProps = {
  level: number;
  label: string;
};

export function AudioLevelMeter({ level, label }: AudioLevelMeterProps) {
  const bars = 12;
  const activeBars = Math.round(level * bars);

  return (
    <div className="audio-meter" aria-label={label}>
      <span className="audio-meter-label">{label}</span>
      <div className="audio-meter-bars" role="img" aria-hidden="true">
        {Array.from({ length: bars }).map((_, i) => (
          <span
            key={i}
            className={`audio-meter-bar${i < activeBars ? " active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
