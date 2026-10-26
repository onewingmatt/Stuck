# Stuck — RULES-AUDIT

Status: **AUDITED — engine rules are faithful to real Sticheln/Stick 'Em. The last open rule divergence (7p/8p
deck tables, D1) is now FIXED; what remains are 1 house-rule setting (D2 rounds) and 4 done-gate gaps.**
Run: `npm run typecheck` (client build `tsc -b`) green · `npx tsc -p tsconfig.server.json --noEmit` green ·
`npm run audit` → **0 FAIL, 1 documented divergence (D2, a house setting)** ·
`npm run lint` RED (22 pre-existing problems, unchanged by this audit) ·
`npm test` — **no test script exists** (no test suite at all).
Source of truth: `references/rulebook-extract.md` (Capstone Stick 'Em rulebook transcription + 5 independent
sources). Audited game: `/home/onewing/Stuck` (git branch `stick-em-game`, 69 commits). `/home/onewing/stuck` is
an older snapshot of the same codebase (no git; files differ only cosmetically + lacks `soundManager.ts`) — not a
separate game.

**Real game identity:** the game is **Sticheln (1993, Klaus Palesch, Amigo)** — English edition **Stick 'Em
(2020, Capstone Games)**. The repo/UI title "Stuck" is a working name, not a real game; "Heinz Meister / Abacus"
is a wrong attribution (see §1). Rules implemented = Sticheln/Stick 'Em classic.

---

## 1. GAME IDENTITY (documented, NOT fixed — naming is presentation, rules are right)

| Claim (repo) | Reality |
|---|---|
| "Stuck — a Stick 'Em variant" (README, UI title, `<title>Stuck</title>`) | There is no game "Stuck". The rules are **Sticheln** (Klaus Palesch, Amigo 1993) = English **Stick 'Em** (Capstone 2020) |
| Task brief: "Heinz Meister / Abacus" | Wrong. Klaus Palesch / Amigo (1993). Heinz Meister & Abacus are unrelated names in the hobby |
| README "3–6 player support" | Engine + lobby support 3–8 (7–8 are a local extension, §2) |
| localStorage key `stickem_player_id` | Internally the code already uses "stickem" — consistent with Stick 'Em |

## 2. RULES DIVERGENCES vs rulebook

| # | Rulebook (Stick 'Em / Sticheln) | Port behavior | Severity |
|---|---|---|---|
| D1 | **Deck by player count:** 3p 0–8/5 colors, 4p 0–11/5, 5p 0–14/5, 6p 0–14/6, 7p 0–17/6, 8p 0–18/6 (real decks 45/60/75/90/108/**114** cards) | **FIXED** — `createDeck` now reads one table (`DECK_BY_PLAYERS`) and 7p/8p deal 6 colors to 0–17 and 0–18: 108 and 114 cards. Was 7p 0–14/7 colors (105) and 8p 0–14/8 colors (120) | ✔ FIXED |
| D2 | **Rounds:** five rounds (rulebook); editions vary (Boards and Bees: "as many rounds as players") | Default = playerCount rounds ("auto"), options 3/5/8. House rule — documented, not broken | LOW (house setting) |
| D3 | **"Open Pain Cards" option** — NOT a rulebook variant | Disables pain-color penalty on won cards (only declared card penalizes). Local house option | LOW (extra option) |
| D4 | **Trick-winner leads next trick**; round = 14 tricks (13 at 8p) | Engine resolves the trick, then **auto-clears** (client sends `clear_trick` 3 s after resolution); same player leads — equivalent in effect | OK (UI pacing) |
| D5 | Rulebook tie-break: **first-played wins** on equal highest trump | Engine `resolveTrick` picks the **first max-value trump in play order** ✔ (verified in audit §4) | ✔ |
| D6 | Zero rules: 0 never trump, never wins; all-zero trick → leader wins | ✔ (leadColor only set by non-zero; all-zero → first player) | ✔ |

Trivially-safe fixes applied: **none were needed for 3–6p core** (deck table + tie-break + zeros + scoring all
faithful). **D1 is now fixed** (2026-10-25): `createDeck` reads a single `DECK_BY_PLAYERS` table and 7p/8p deal
the rulebook deck — 108 cards at 0–17/6 colours and 114 at 0–18/6 — with the leftover matching the rulebook's own
note (3 cards at 7p, 2 at 8p). The old tables (105/7 colours and 120/8 colours) also gave every player the right
hand SIZE, which is why nothing caught it; the audit's own 8p expectation was wrong too (it asked for 120 cards in
6 colours, but 6 × 0–18 is 114) and was corrected alongside. D2/D3 are intended house options.

## 3. ENGINE/CONTRACT BUGS (pre-existing; documented, NOT fixed)

| # | Bug | Where | Note |
|---|---|---|---|
| E1 | **Turn timer is cosmetic**: `turnTimerSeconds` is stored in settings and selectable in lobby, but **no server or client code ever enforces it** (no timer, no auto-play) | server.ts start_game, Lobby.tsx, engine | Feature is inert — mislabeled UI |
| E2 | **Round-end check is wrong (off-by-one)**: `endRound` → `round_over`, then `nextRound` increments. Final round N → after round N the status becomes `round_over` and host clicks Next Round → `nextRound` → `startRound` → a **phantom round N+1 with no scores recorded** is never detected as game_over (`roundNumber >= totalRounds` only checked in `endRound`) | engine.ts:295-298, 303-311 | Game can run an extra un-scored round; game_over only reached if `endRound` runs at/after totalRounds. With roundCount=0 (auto=players) the last scored round IS round players.length, but endRound sets round_over, so the NEXT round is phantom |
| E3 | **Disconnect timeout aborts the match**: on 120 s disconnect the server deletes the player AND resets `status='waiting'`, wiping hands/scores/tricks — reconnect mid-game is only honored if under 120 s; longer drop = whole match reset for everyone | server.ts ws close handler | Reconnect exists but is fragile |
| E4 | **New players joining a started game can't be added; a returning player rejoins fine** (existingPlayer path) — but a player who left and re-joins under a new browser (new uuid) is treated as a new player and rejected (status != waiting) | server.ts join_room | Minor |

## 4. AUDIT — rulebook worked examples replayed (PASS/FAIL table)

Independent check script: `scripts/independent-rules-check.ts` (run with `npm run audit`, exit 0 = all pass).
It replays rulebook facts + examples **directly against the engine functions** (createDeck, startRound,
selectPainCard, playCard, resolveTrick, endRound) with hand-built states — no bots, no server, no network.

| # | Rulebook fact | Engine result | Status |
|---|---|---|---|
| A1 | 3p deck: 0–8, 5 colors, 45 cards, 15 each | 45 cards, 5 colors, min 0 max 8, 15 each | ✅ PASS |
| A2 | 4p deck: 0–11, 5 colors, 60 cards, 15 each | 60 cards, 5 colors, min 0 max 11, 15 each | ✅ PASS |
| A3 | 5p deck: 0–14, 5 colors, 75 cards, 15 each | 75 cards, 5 colors, min 0 max 14, 15 each | ✅ PASS |
| A4 | 6p deck: 0–14, 6 colors, 90 cards, 15 each | 90 cards, 6 colors, min 0 max 14, 15 each | ✅ PASS |
| A5 | 7p deck: 0–17, 6 colors, 108 cards, 15 each (+3 aside) | 108 cards, 6 colors, min 0 max 17, 15 each (+3 aside) | ✅ PASS (D1 fixed) |
| A6 | 8p deck: 0–18, 6 colors, **114** cards, 14 each (+2 aside) | 114 cards, 6 colors, min 0 max 18, 14 each (+2 aside) | ✅ PASS (D1 fixed) |
| A7 | Worked example 1: lead 6, 5, 2, 11 → 11 wins | resolveTrick: highest lead-color 11 wins | ✅ PASS |
| A8 | Worked example 2: 3, 2, 0, 4 → 4 wins (0 not trump) | 0 filtered from trumps; highest lead 4 wins | ✅ PASS |
| A9 | Worked example 3: 10, 0, 7(trump), 11 → 7 wins | trump 7 beats lead 11 | ✅ PASS |
| A10 | Worked example 4: 11, 6(trump), 6(trump), 4 → **first** 6 wins | engine picks first 6 in play order | ✅ PASS |
| A11 | Worked example 5: 0,0,0,0 → leader wins | allZeros → trick[0] wins | ✅ PASS |
| A12 | Worked example 6 (scoring): red 4 declared; won red 2, red 5, 14 others → 14−11 = **+3** | endRound breakdown: +1×14, −4, −2, −5 → +3 | ✅ PASS |
| A13 | Pain card is removed from hand and counts −face value; won pain cards −value; others +1 | ✔ endRound per-card details | ✅ PASS |
| A14 | Everyone reveals simultaneously; multiple players may share a pain color | ✔ (no uniqueness constraint) | ✅ PASS |
| A15 | Classic length = five rounds | default auto = playerCount rounds (house rule D2, documented) | ⚠️ DOC |
| A16 | Trick winner leads next trick | currentPlayerIndex = winner; auto-clear only clears the table | ✅ PASS |

**Audit counts:** 16 checks → **13 PASS · 3 DOC (A5, A6, A15)** · 0 FAIL. Exit code 0. (The three ⚠️ are
documented divergences/house rules, not engine bugs; the audit script exits 0 because it asserts the *engine's
documented behavior* and prints explicit divergence warnings for A5/A6/A15.)

## 5. DONE-GATE FEATURES (monorepo bar)

| Feature | Status | Evidence |
|---|---|---|
| Server-authoritative rules | ✅ YES | All state transitions in engine.ts, applied only on server (server.ts); client only sends intents (`play_card` etc.) |
| Leave in lobby AND in-game | ✅ YES | Lobby Leave button (Lobby.tsx:231); in-game `← Leave` (GameBoard.tsx:599) + game-over Leave |
| Reconnect | ✅ YES (partial) | `useGameClient` auto-reconnects w/ exponential backoff; server keeps player 120 s (server.ts:243-268). E3 caveat |
| Pan/zoom | ❌ NO | No pan/zoom anywhere (static layout, no zoom controls) |
| CVD-safe palette with symbols | ⚠️ PARTIAL | Colors + suit symbols on cards (CardView suitSymbol) — symbols present; but pain-color indicators are **color dots only** (GameBoard PAIN_DOT_COLOR), and Red/Pink/Yellow/Orange/Green are similar-hue pairs; no CVD-safe check or pattern differentiation on pain dots |
| Legal-move highlight | ⚠️ PARTIAL | Lead-suit white dots on matching cards (visual hint); all plays are legal in this game so no "illegal" blocking — but no highlight of *winning* potential either. Acceptable for the genre; note: **no move validation on client**, server rejects bad plays silently |
| Scoreboard + named log | ✅ YES | Round/game-over standings + per-card breakdown; trick-history panel with names (GameBoard) |
| How-to-play with REAL rules | ❌ NO | No rules modal/help screen at all; README rules summary exists but is not in-app |
| Working bots | ✅ YES | 8 archetypes, server-driven via doBotAction (ai.ts, 718 lines) |
| `client.js?v=N` cache-bust | ❌ NO | Vite hashed assets (`index-*.js`) but `index.html` served via express.static without version query; no explicit cache-bust config |

**Done-gate score: 5.5/10** (server-authoritative ✔, leave ✔, reconnect ✔-partial, scoreboard+log ✔, bots ✔;
missing pan/zoom ✗, how-to-play ✗, cache-bust ✗; partial CVD-safe, partial legal-move highlight).

## 6. What was changed in this audit (fix only trivially-safe things)

- **Added** `SCOPE.md`, `references/rulebook-extract.md`, `RULES-AUDIT.md`, `scripts/independent-rules-check.ts`.
- **Added** `npm run audit` (runs the independent rules check; exit 0 = green).
- **One engine behavior changed**: `createDeck`'s 7p/8p tables (D1). The 3–6p core rules were already faithful;
  E1–E4 remain documented for a follow-up (E2's phantom round and E1's inert timer are the two that matter most).
- **Nothing outside `/home/onewing/Stuck` was modified.**

## 6b. D1 fix, 2026-10-25

`createDeck` was a chain of `if/else if` branches where 7p and 8p added a 7th/8th COLOUR at max 14 instead of
extending the value range of the six colours the rulebook names. Replaced with one `DECK_BY_PLAYERS` table —
`{ 3: 5/8, 4: 5/11, 5: 5/14, 6: 6/14, 7: 6/17, 8: 6/18 }` (colors/max) — so the deck is a full colours × values
rectangle for every count.

Why it survived the first audit: both wrong tables still dealt the correct 15 (and 14) cards per player, so every
downstream invariant held and only the composition was wrong. Two independent statements in the rulebook pin the
sizes — the setup table (6 colours, 0–17 and 0–18) and the deal note (3 cards left over at 7p, 2 at 8p) — and they
agree: 6 × 18 = 108 = 15×7 + 3, and 6 × 19 = 114 = 14×8 + 2.

Verified: `npm run audit` turns 4 FAIL → 0 FAIL, exit 1 → exit 0, RED-proved by running the corrected audit against
the pre-fix engine in a `git worktree` (4 failures, exit 1). `npm run gate` passes. The corrected audit now asserts
the deck composition AND the deal/leftover counts for all six player counts, in both cases from the rulebook's own
numbers rather than from the engine.

## 7. Verification results

| Check | Result |
|---|---|
| `npm run build:ui` (tsc -b + vite build) | ✅ PASS (376 ms) |
| `npx tsc -p tsconfig.server.json --noEmit` | ✅ PASS |
| `npm run audit` (new) | ✅ PASS (13 PASS / 3 DOC / 0 FAIL, exit 0) |
| `npm run lint` | ❌ 22 problems (20 errors, 2 warnings) — **pre-existing**, incl. react-hooks rules-of-hooks violations in GameBoard (hooks after early return), no-explicit-any, no-unused-vars; unchanged by this audit |
| `npm test` | ❌ **no test script** in package.json (no unit tests exist for engine/ai) |
