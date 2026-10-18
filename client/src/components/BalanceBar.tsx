import type { PublicRoomState } from "@blackjack/shared";

function formatEuro(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}€${(Math.abs(cents) / 100).toFixed(2)}`;
}

interface BalanceBarProps {
  roomState: PublicRoomState;
}

export function BalanceBar({ roomState }: BalanceBarProps) {
  const [a, b] = roomState.players;
  if (!a || !b) return null;

  let debtLine: string;
  if (a.balance === 0) {
    debtLine = "Jullie staan quitte";
  } else {
    const owed = a.balance > 0 ? a : b;
    const owing = a.balance > 0 ? b : a;
    debtLine = `${owing.name} is ${formatEuro(Math.abs(a.balance))} schuldig aan ${owed.name}`;
  }

  return (
    <div className="flex flex-col items-center gap-1 mb-2">
      <div className="flex gap-6 text-sm">
        {roomState.players.map((p) => (
          <div key={p.id} className="flex flex-col items-center">
            <span className="text-[var(--gold-300)]/70 text-xs uppercase tracking-wide">{p.name}</span>
            <span className={`font-bold ${p.balance < 0 ? "text-[var(--danger-400)]" : "text-[var(--success-400)]"}`}>
              {formatEuro(p.balance)}
            </span>
          </div>
        ))}
      </div>
      <span className="text-xs text-[var(--cream-100)]/60">{debtLine}</span>
    </div>
  );
}
