import nodemailer from "nodemailer";
import type { FinalSettlement } from "@blackjack/shared";
import { generateSettlementPdf } from "./pdf.js";

function formatEuro(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}€${(abs / 100).toFixed(2)}`;
}

function buildHtml(settlement: FinalSettlement, forPlayerId: string): string {
  const me = settlement.players.find((p) => p.id === forPlayerId)!;
  const opponent = settlement.players.find((p) => p.id !== forPlayerId)!;
  const date = new Date(settlement.endedAt).toLocaleString("nl-NL");

  let headline: string;
  if (me.balance > 0) {
    headline = `Je hebt ${formatEuro(me.balance)} gewonnen van ${opponent.name}!`;
  } else if (me.balance < 0) {
    headline = `Je bent ${formatEuro(Math.abs(me.balance))} verschuldigd aan ${opponent.name}.`;
  } else {
    headline = `Jullie staan quitte.`;
  }

  const rows = settlement.history
    .map((round) => {
      const winnerName =
        round.winnerId === null ? "Push" : round.winnerId === me.id ? me.name : opponent.name;
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${round.roundNumber}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${formatEuro(round.bet)}${round.multiplier === 2 ? " ×2" : ""}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${winnerName}</td>
      </tr>`;
    })
    .join("");

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width:560px; margin:0 auto; color:#1a1a1a;">
    <div style="background:#0b3d2e; color:#f5e9c8; padding:28px 24px; border-radius:12px 12px 0 0;">
      <h1 style="margin:0; font-size:22px;">Blackjack - Eindafrekening</h1>
      <p style="margin:6px 0 0; font-size:14px; opacity:0.85;">Kamer ${settlement.roomCode} · ${date}</p>
    </div>
    <div style="border:1px solid #e5e5e5; border-top:none; border-radius:0 0 12px 12px; padding:24px;">
      <p style="font-size:18px; font-weight:600;">${headline}</p>
      <p style="color:#555;">Jullie hebben samen ${settlement.roundsPlayed} ronde(s) gespeeld.</p>
      <table style="width:100%; border-collapse:collapse; margin-top:16px; font-size:14px;">
        <thead>
          <tr style="text-align:left; color:#777;">
            <th style="padding:6px 10px;">Ronde</th>
            <th style="padding:6px 10px;">Inzet</th>
            <th style="padding:6px 10px;">Winnaar</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px; font-size:12px; color:#999;">Een volledige afrekening vind je in de bijgevoegde PDF.</p>
    </div>
  </div>`;
}

export async function sendSettlementEmails(settlement: FinalSettlement): Promise<void> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    console.warn("GMAIL_USER/GMAIL_APP_PASSWORD ontbreekt - afrekeningsmail wordt niet verstuurd.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  const pdfBuffer = await generateSettlementPdf(settlement);

  await Promise.all(
    settlement.players.map((player) =>
      transporter.sendMail({
        from: `Blackjack <${gmailUser}>`,
        to: player.email,
        subject: `Blackjack afrekening - kamer ${settlement.roomCode}`,
        html: buildHtml(settlement, player.id),
        attachments: [
          {
            filename: `afrekening-${settlement.roomCode}.pdf`,
            content: pdfBuffer,
          },
        ],
      }),
    ),
  );
}
