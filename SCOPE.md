# Stick 'Em / Sticheln — SCOPE

**Game:** Sticheln (1993, Klaus Palesch — Amigo). English 2020 edition: **Stick 'Em** (Capstone Games). The local
build also calls itself "Stuck", but the rules implemented are Sticheln/Stick 'Em — see RULES-AUDIT.md §1.
**Genre:** trick-taking with no follow-suit and *every off-suit as trump* ("pain suit" scoring).
**Target:** 3–8 players (engine supports 3–8; the classic rules are 3–6, the 7–8 counts are a local extension).
**Port:** 3000 default (HTTP + WebSocket on same port). TypeScript, React 19 + Vite client, Express 5 + `ws` server.
**Deployment:** Dockerfile; production build serves `dist/` from `dist-server/server/server.js`.

> Rules below transcribed from the Capstone **Stick 'Em rulebook** (via RulesPal full transcription), cross-checked
> against Opinionated Gamers (Chris Wray), Boards and Bees, Pagat, BGG Board Gems, and the Amigo lineage. See
> `references/rulebook-extract.md` — the same extract grounds RULES-AUDIT.md.

---

## The theme (flavor)

Players are handed a hand full of colorful point cards. You *want* to win tricks and collect +1-point cards — but
before play you must secretly choose a "pain color" (misery colour), and every card you collect **in that color**
is **negative** (face value). Everyone reveals their pain color simultaneously, then tries to win everything
except the cards that would burn them — and to "stick" the other players with *their* pain cards.

## Components & deck (classic Capstone 90-card deck; 0–14 in six suits)

The physical game has **90 cards: 0–14 in six suits**. You never use all of them — the cards in play depend on
player count (Rulebook "Game Setup"):

| Players | Cards used | Colors | Each player gets |
|---|---|---|---|
| 3 | 0–8 | five suits | 15 |
| 4 | 0–11 | five suits | 15 |
| 5 | 0–14 | five suits | 15 |
| 6 | 0–14 | six suits | 15 |
| 7 | 0–17 | six suits | 15 (3 left over, shown & set aside) |
| 8 | 0–18 | six suits | 14 (2 left over, shown & set aside) |

- The 0 in any color is **never a trump** and can **never win a trick** (unless the whole trick is zeros).
- Every card's number is its face value; the number on a pain-color card is the penalty it scores.
- 3–6 players is the classic game. 7–8 player counts exist in later editions (Amigo 0–18 "extended" deck) but
  the Capstone edition is 3–6 — the local port's 7–8 support is an extension (see RULES-AUDIT §2).

## Setup per round

1. Shuffle the in-play cards and **deal all of them out evenly** (15 each at 3–6 players).
2. **Choose your misery/pain color:** each player secretly picks **one card from their hand** and places it face
   down. All reveal **simultaneously**. Multiple players may share a pain color.
   - The declared card **stays face-up in front of you** and counts **negative at face value** at round end —
     "the misery begins with the selection".
3. The player to the **left of the dealer** leads the first trick.

## Trick play

- **Any card can be played at any time — no follow-suit.**
- The color of the **first card played** is the **lead color**.
- **Every other color is a trump color** — every non-zero card of a non-led color is a **trump**.
- The **0 card is never a trump** (and never wins).

## Who wins a trick

1. If only lead-color cards (plus possibly zeros) were played → **highest number in the lead color** wins.
2. If at least one trump was played → the trump with the **highest number** wins (a 0 can never win).
3. Ties (same highest number in different trump suits) → **the first player to have played that value wins**.
4. Trick of **all zeros** → the **first player** (leader) wins.

The winner takes the trick cards (face-down pile in front of them) and **leads the next trick**.

## End of round & scoring

- The round ends after **14 tricks** (13 at 8 players) — i.e. when all cards are played out.
- Each player's score for the round:
  - **every card in their pain color (including the declared card): −face value**
  - **every other card: +1** (regardless of value)
- Example from the rulebook (replayed in RULES-AUDIT §5): Axel declares **red 4**; he wins a red 2 and a red 5
  plus 14 other cards → 14 − (4+2+5) = **+3**.

## End of game

- Play **five rounds** (classic). Highest total wins; if everyone is negative, fewest negative wins.
- The local port defaults to **one round per player** ("auto"), with 3/5/8-round options — a house setting, not
  the rulebook's five-round game (documented divergence, RULES-AUDIT §2).

## Variants in the rulebook (not implemented here)

Reverse / Mild / Aggravated / Hazy / Delayed Sticheln, and the "Hat Trick" double-trick game (0–20, three colors).
The port implements none of these — out of scope; only **Classic** plus the local "Open Pain Cards" option
(which is *not* a rulebook variant: it disables pain-color penalties on won cards, keeping only the declared card
penalty — documented in RULES-AUDIT §2).

## What this build adds (digital conveniences, NOT rule changes)

- Bot opponents (8 archetypes) to fill seats (3+ humans or bots can start).
- Lobby chat, persistent local stats, sound, turn timer setting (implemented as UI-only — see RULES-AUDIT §3),
  "Play Again".
- Reconnect with player-ID in localStorage (120 s server grace), Leave from lobby and in-game, host migration.

## Non-goals / out of scope

- The 7–8 player extra cards (0–17/0–18 ranges) are locally synthesized, NOT the real extended deck's exact
  suit layout — documented approximation.
- Rulebook variants (Reverse/Mild/Aggravated/Hazy/Delayed/Hat Trick), 2-player mode, mobile app (Capacitor
  config exists but is unused).
- The port's identity claim: the repo/UI title says "Stuck"; README says "Stuck (Stick 'Em variant)". The real
  game is **Sticheln / Stick 'Em** by Klaus Palesch. Naming is a presentation bug, not a rules bug.
