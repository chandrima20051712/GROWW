export default function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 60
      ? 'text-signal border-signal/40'
      : score >= 30
        ? 'text-ink border-rule'
        : 'text-inksoft border-rule';
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-xs ${tone}`}>
      {score}
    </span>
  );
}
