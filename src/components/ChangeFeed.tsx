import ChangeCard from './ChangeCard';
import type { ChangeCard as ChangeCardType } from '@/lib/types';

export default function ChangeFeed({ cards }: { cards: ChangeCardType[] }) {
  if (!cards.length) {
    return (
      <p className="border-b border-rule py-6 text-sm text-inksoft">
        Nothing has moved enough to matter since you last checked.
      </p>
    );
  }
  return (
    <div>
      {cards.map((c) => (
        <ChangeCard key={c.symbol} card={c} />
      ))}
    </div>
  );
}
