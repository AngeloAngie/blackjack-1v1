import { useEffect } from "react";
import { useGameStore } from "./store/gameStore";
import { Lobby } from "./components/Lobby";
import { WaitingRoom } from "./components/WaitingRoom";
import { Table } from "./components/Table";
import { SettlementView } from "./components/SettlementView";

export default function App() {
  const init = useGameStore((s) => s.init);
  const roomState = useGameStore((s) => s.roomState);
  const settlement = useGameStore((s) => s.settlement);
  const rejoining = useGameStore((s) => s.rejoining);

  useEffect(() => {
    init();
  }, [init]);

  if (settlement) {
    return <SettlementView settlement={settlement} myId={roomState?.yourPlayerId} />;
  }

  if (rejoining && !roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center felt-texture">
        <span className="text-[var(--gold-300)]/80 text-sm">Opnieuw verbinden met je kamer...</span>
      </div>
    );
  }

  if (!roomState) {
    return <Lobby />;
  }

  if (roomState.phase === "waiting") {
    return <WaitingRoom roomState={roomState} />;
  }

  return <Table roomState={roomState} />;
}
