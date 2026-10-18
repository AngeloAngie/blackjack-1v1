# Blackjack 1v1

Online multiplayer blackjack voor twee spelers (geen dealer) — speel tegen een vriend, met een
simpel bijhoudsysteem voor wie wie hoeveel schuldig is. Geen echt geld, geen accounts, gewoon een
kamer aanmaken, de link delen, en spelen.

## Spelregels (kort)

- Elke speler krijgt 2 kaarten en kiest onafhankelijk van de ander Hit / Stand / (optioneel)
  Double Down. Je ziet je eigen kaarten altijd; de kaarten van je tegenstander blijven verborgen
  (kaartruggen) totdat jullie allebei klaar zijn met de ronde — dan worden beide handen
  tegelijk onthuld. Dit is bewust **niet** beurt-gebaseerd (speler A dan B): zo kan niemand ooit
  zijn beslissing baseren op info over de hand van de ander, en is het zo eerlijk mogelijk.
- Bust (>21) verliest direct. Anders wint de hoogste waarde ≤ 21. Een natural blackjack (A + 10-kaart
  met je eerste 2 kaarten) verslaat een gewone 21. Gelijkspel = push, inzet gaat terug.
- Double Down: verdubbelt de inzet voor de hele ronde (je trekt dan nog precies 1 kaart). Als een
  van beide spelers double down speelt, wordt de hele ronde op het dubbele bedrag verrekend.
- Saldo's zijn een lopende, onderlinge rekening in centen (geen echt geld) en mogen negatief worden.

## Tech stack

- **Server**: Node.js + TypeScript, Express + Socket.io. Het kaartendeck en alle spellogica leven
  uitsluitend op de server (crypto-secure Fisher-Yates shuffle); de client krijgt nooit meer dan
  zijn eigen kaarten en de publieke spelstatus.
- **Client**: React + TypeScript + Vite, Tailwind CSS, Framer Motion voor animaties, Zustand voor
  state.
- **Tests**: Vitest (deck/shuffle/duplicaten, hand-waardeberekening, winnaarslogica, inzet- en
  stop-onderhandeling).
- **E-mail**: Resend (HTML-mail + PDF-bijlage via pdfkit) voor de eindafrekening na het stoppen.
- **Opslag**: alles in-memory per kamer — geen database. Een sessie is per definitie tijdelijk: bij
  het stoppen wordt een eindafrekening gemaakt en gemaild, en is de kamer klaar.

## Project­structuur

```
shared/   Gedeelde TypeScript-types en pure hand-waardeberekening (geen dealer- of deckdata)
server/   Express + Socket.io server, deck/room/game-logica, e-mail + PDF
client/   React/Vite front-end
```

## Lokaal starten

Vereisten: Node.js 20+.

```bash
npm install
```

Maak `server/.env` aan op basis van `server/.env.example` (werkt out-of-the-box voor lokaal
spelen; e-mail wordt alleen verstuurd als je een `RESEND_API_KEY` invult — zonder key wordt de
afrekening overgeslagen met een duidelijke waarschuwing in de server-log, de rest van de app werkt
gewoon door).

```bash
npm run dev
```

Dit bouwt eerst `shared` (types + hand-waardeberekening) en start daarna de server (poort 3001) en
de client (poort 5173, met hot reload) tegelijk. Open
`http://localhost:5173`, maak een kamer aan, en deel de code/link met je vriend (die kan lokaal een
tweede browservenster gebruiken, of jullie spelen allebei op jullie eigen laptop zodra de app
gedeployed is).

### Tests draaien

```bash
npm run test
```

Draait alle unit tests in `shared` en `server`: geen duplicaten in het deck, uitgedeeld + resterend
= altijd 52 (× aantal decks), correcte hand-waardeberekening (inclusief azen en bust), en de
volledige winnaars-/inzet-/stoplogica.

## Omgevingsvariabelen

### `server/.env` (zie `server/.env.example`)

| Variabele | Verplicht | Omschrijving |
|---|---|---|
| `PORT` | nee (default 3001) | Poort waarop de server luistert |
| `NODE_ENV` | nee | Zet op `production` bij deployen (serveert dan ook de gebouwde client) |
| `CLIENT_ORIGIN` | nee | Alleen nodig in productie als je de client op een ander domein host dan de server |
| `RESEND_API_KEY` | nee* | API-key van [resend.com](https://resend.com) voor de eindafrekeningsmail |
| `EMAIL_FROM` | nee | Afzender-adres voor de mail (default: `onboarding@resend.dev`, prima voor testen) |

\* Zonder `RESEND_API_KEY` werkt de hele app gewoon, alleen de afrekeningsmail wordt niet
verstuurd.

### `client/.env` (zie `client/.env.example`, alleen nodig als je front- en backend apart host)

| Variabele | Verplicht | Omschrijving |
|---|---|---|
| `VITE_SERVER_URL` | nee | URL van de server. Leeg laten als client en server op hetzelfde domein draaien (zie deploy hieronder) — dan verbindt de client automatisch met de huidige origin. |

## Deployen (zodat je vrienden mee kunnen spelen)

De eenvoudigste manier is **één service** die zowel de Socket.io-server als de gebouwde client
serveert (de server serveert `client/dist` als statische bestanden zodra `NODE_ENV=production`
staat — zie `server/src/index.ts`). Dat voorkomt CORS-gedoe en een los `VITE_SERVER_URL`.

Voorbeeld voor **Render** (werkt vergelijkbaar op Railway of Fly.io):

1. Maak een nieuwe "Web Service" aan, gekoppeld aan deze repository.
2. Build command: `npm install --include=dev; npm run build`
   (het `--include=dev` is nodig omdat Render devDependencies - typescript, vite, @types/\* -
   overslaat zodra `NODE_ENV=production` staat, terwijl de build die juist nodig heeft)
3. Start command: `npm run start`
4. Environment variables: `NODE_ENV=production`, en optioneel `RESEND_API_KEY` + `EMAIL_FROM` als
   je de afrekeningsmail wilt. `PORT` wordt door Render automatisch gezet.
5. Deploy. Zodra hij live is, deel je gewoon de URL van je service met je vriend(en) — zij hoeven
   niks te installeren, alleen de link te openen.

Werkt dit niet lokaal getest? Je kunt de productie-build ook lokaal uitproberen:

```bash
npm run build
NODE_ENV=production npm run start
```

en dan naar `http://localhost:3001` gaan (de server serveert daar nu ook de client).

> Let op: `npm run dev` bouwt `shared` één keer bij het starten. Als je tijdens het ontwikkelen iets
> wijzigt in `shared/src` (bv. de hand-waardeberekening), herstart dan `npm run dev` (of draai
> `npm run build -w shared`) zodat server én client de wijziging oppikken — alleen `server/src` en
> `client/src` hebben live hot reload.

### Front- en backend los hosten (optioneel)

Wil je de client apart hosten (bv. op Vercel/Netlify) en de server los (Render/Railway/Fly.io)?
Zet dan:

- Server: `CLIENT_ORIGIN=https://jouw-client-domein.example`
- Client (build time): `VITE_SERVER_URL=https://jouw-server-domein.example`

## Hoe het werkt (kort, voor wie wil leren)

- **Deck & fairness**: `server/src/deck.ts` bevat een cryptografisch veilige Fisher-Yates shuffle
  (`node:crypto` i.p.v. `Math.random`). Het deck leeft als server-side object; clients krijgen
  nooit de volgorde van resterende kaarten, alleen een teller.
- **Spellogica**: `server/src/game.ts` is een pure state machine (`GameRoom`) zonder afhankelijkheid
  van Socket.io — daardoor is hij volledig unit-testbaar met een nep-deck (zie `game.test.ts`).
- **Realtime**: `server/src/socket.ts` vertaalt Socket.io-events naar aanroepen op `GameRoom`, en
  stuurt na elke wijziging een *per-speler* view van de staat terug (`toPublicState`), zodat ieders
  verborgen kaarten verborgen blijven.
- **Reconnect**: client en server onthouden een `rejoinToken` (client in `localStorage`, server in
  het room-object). Bij een refresh/netwerkwissel probeert de client automatisch opnieuw te joinen
  met dat token; de server geeft je dezelfde speler-slot, saldo en hand terug. Een oudere,
  "vergeten" verbinding wordt daarbij automatisch gekickt zodat er nooit twee tabbladen tegelijk
  dezelfde speler kunnen besturen.
- **Afrekening**: bij het stoppen bouwt de server een `FinalSettlement` op uit de rondegeschiedenis,
  rendert daar een PDF van (`pdf.ts`) en verstuurt die als bijlage via Resend (`email.ts`), naast
  een live afrekeningsscherm in de app zelf.
