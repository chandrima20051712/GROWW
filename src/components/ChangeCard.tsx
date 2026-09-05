import ScoreBadge from './ScoreBadge';
import type { ChangeCard as ChangeCardType } from '@/lib/types';

export default function ChangeCard({ card }: { card: ChangeCardType }) {
  const positive = card.dayChangePct >= 0;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-rule py-4 last:border-0">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-medium text-ink">{card.symbol}</span>
          <span className={`font-mono text-sm ${positive ? 'text-up' : 'text-down'}`}>
            {positive ? '+' : ''}
            {card.dayChangePct}%
          </span>
        </div>
        <p className="mt-1 text-sm text-inksoft">{card.detail}</p>
      </div>
      <ScoreBadge score={card.attentionScore} />
    </div>
  );
}
