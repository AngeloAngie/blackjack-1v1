import PDFDocument from "pdfkit";
import type { Card, HandValue, SettlementData } from "@blackjack/shared";

function formatEuro(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}€${(abs / 100).toFixed(2)}`;
}

const SUIT_SYMBOL: Record<Card["suit"], string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

function formatHand(hand: Card[]): string {
  return hand.map((card) => `${card.rank}${SUIT_SYMBOL[card.suit]}`).join(" ");
}

function formatValue(value: HandValue): string {
  if (value.isBlackjack) return "Blackjack";
  if (value.isBust) return `Bust (${value.total})`;
  return value.soft ? `${value.total} (soft)` : `${value.total}`;
}

export function generateSettlementPdf(settlement: SettlementData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const [p1, p2] = settlement.players;
    const date = new Date(settlement.endedAt).toLocaleString("nl-NL");

    doc.fontSize(20).text("Blackjack - Eindafrekening", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).fillColor("#555").text(`Kamer: ${settlement.roomCode}`, { align: "center" });
    doc.text(`Datum: ${date}`, { align: "center" });
    doc.text(`Aantal gespeelde rondes: ${settlement.roundsPlayed}`, { align: "center" });
    doc.moveDown(1.5);

    doc.fillColor("#000").fontSize(13).text("Eindstand");
    doc.moveDown(0.3);
    doc.fontSize(11);
    for (const p of settlement.players) {
      doc.text(`${p.name}: ${formatEuro(p.balance)}`);
    }
    doc.moveDown(1);

    if (p1 && p2 && p1.balance !== 0) {
      const winner = p1.balance > 0 ? p1 : p2;
      const loser = p1.balance > 0 ? p2 : p1;
      doc.text(`${winner.name} heeft ${formatEuro(Math.abs(winner.balance))} gewonnen van ${loser.name}.`);
    } else {
      doc.text("Jullie staan quitte.");
    }
    doc.moveDown(1.5);

    doc.fontSize(13).text("Rondeoverzicht");
    doc.moveDown(0.5);

    settlement.history.forEach((round, index) => {
      const winnerName =
        round.winnerId === null
          ? "Push (gelijkspel)"
          : round.winnerId === p1?.id
            ? p1.name
            : p2?.name ?? "Onbekend";

      if (index > 0) doc.moveDown(0.6);

      doc
        .fontSize(10)
        .fillColor("#000")
        .text(
          `Ronde ${round.roundNumber} — inzet ${formatEuro(round.bet)}${round.multiplier === 2 ? " ×2 (double down)" : ""} — winnaar: ${winnerName}`,
          { continued: false },
        );

      doc.fontSize(9).fillColor("#333");
      if (p1) {
        doc.text(
          `  ${p1.name}: ${formatHand(round.playerAHand)} = ${formatValue(round.playerAValue)}${round.playerADoubled ? " (double)" : ""}`,
        );
      }
      if (p2) {
        doc.text(
          `  ${p2.name}: ${formatHand(round.playerBHand)} = ${formatValue(round.playerBValue)}${round.playerBDoubled ? " (double)" : ""}`,
        );
      }
    });

    doc.end();
  });
}
