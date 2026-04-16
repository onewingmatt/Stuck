# Stuck

A multiplayer trick-taking card game — **Stuck** (Stick 'Em variant) — built with React, TypeScript, Express, and WebSockets. Play online with friends or AI bots.

## Rules

Each player is dealt a full hand of colored cards. At the start of every round:

1. **Pain selection** — Each player secretly chooses one card from their hand to declare as their *Pain Card*. The color and value of this card determines how painful tricks will be for them throughout the round.
2. **Trick play** — Players take turns playing one card from their hand into the center trick. Any card can be played at any time (no follow-suit requirement).
3. **Trick resolution** — The trick is won by the highest-value card that either matches the lead color, or *trumps* it (a card of a different color played later in the trick). All zeros — the winner is the first player.
4. **Scoring** — At round end, each player loses points equal to their chosen pain card's value plus any cards of that color they won. Cards of other colors they win score +1 point each.

### Game Options

- **Open Pain Cards** — Only your chosen pain card scores against you. Cards of that color won in tricks are worth +1 like any other card, making the game less punishing.

### Key Mechanics

- **Zeros** — Cards with value 0 always lose but never win tricks (unless all played cards are zeros). Useful for shedding bad cards safely.
- **Trumping** — Playing a card of a different color than the lead will trump it and likely win the trick (but at the cost of potentially collecting your opponents' pain cards).
- **Round rotation** — The number of rounds equals the number of players, with the dealer rotating each round.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Vite |
| UI | Glass-morphism dark theme, CSS animations |
| Game Engine | Pure TypeScript (deterministic state transitions) |
| Server | Express 5, WebSocket (`ws`) |
| AI | Rule-based bot system with 8 archetypes |

## Quick Start

```bash
npm install

# Start dev server (WebSocket backend + Vite frontend)
npm run dev

# Production build
npm run build

# Start production server
npm run start
```

## Play Online

1. Open `http://localhost:5173` (or your deployed URL)
2. Click **Create New Game** or **Join** with a room code
3. Add bots or wait for friends, then hit **Start Game**

## Bot Archetypes

| Archetype | Style | Skill | Awareness | Risk |
|-----------|-------|-------|-----------|------|
| Novice | Random-ish | 0.1 | 0.1 | 0.8 |
| Average | Balanced | 0.4 | 0.4 | 0.5 |
| Gambler | Aggressive | 0.5 | 0.3 | 0.9 |
| Calculator | Defensive | 0.8 | 0.9 | 0.2 |
| Empath | Observant | 0.6 | 1.0 | 0.3 |
| Bully | Pushy | 0.7 | 0.8 | 0.9 |
| Grandmaster | Optimal | 1.0 | 1.0 | 0.6 |
| Shark | Calculated risk | 0.9 | 0.9 | 0.8 |

## Features

- **3–6 player support** — Bots fill empty slots
- **Dark glass-morphism UI** — Gradient backgrounds, translucent panels, backdrop blur
- **Card animations** — Lift-on-hover, deal-in swipe, trick collect sweep, winner glow
- **Score breakdown** — Expandable per-card scoring table at round end
- **Pain suit indicators** — Colored dots show each player's pain color at a glance
- **Lead suit hints** — White dots on cards matching the lead color
- **Won cards tracker** — Click a player's deck pill to see their collected cards
- **Auto-advance** — 3-second auto-sweep to next trick with countdown
- **Open Pain Cards** — Optional less-punitive scoring mode

## Project Structure

```
├── server/
│   └── server.ts          # Express + WebSocket game server
├── src/
│   ├── components/
│   │   ├── App.tsx        # Root component, title management
│   │   ├── GameBoard.tsx  # Main game UI with hand/trick/score
│   │   ├── Lobby.tsx      # Room creation, joining, bot setup
│   │   └── CardView.tsx   # Individual card component
│   ├── game/
│   │   ├── models.ts      # TypeScript interfaces/types
│   │   ├── engine.ts      # Game state machine (start, play, score)
│   │   └── ai.ts          # Bot archetypes and decision logic
│   └── hooks/
│       └── useGameClient.ts # WebSocket client hook
├── public/                 # Static assets
├── index.html
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```
