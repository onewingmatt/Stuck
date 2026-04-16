import { type GameState, type Player, type Card, type BotConfig, type BotArchetype } from './models.js';

export const BOT_ARCHETYPES: Record<BotArchetype, Omit<BotConfig, 'archetype'>> = {
  Novice:     { skill: 0.1, awareness: 0.1, riskyness: 0.8 },
  Average:    { skill: 0.4, awareness: 0.4, riskyness: 0.5 },
  Gambler:    { skill: 0.5, awareness: 0.3, riskyness: 0.9 },
  Calculator: { skill: 0.8, awareness: 0.9, riskyness: 0.2 },
  Empath:     { skill: 0.6, awareness: 1.0, riskyness: 0.3 },
  Bully:      { skill: 0.7, awareness: 0.8, riskyness: 0.9 },
  Grandmaster:{ skill: 1.0, awareness: 1.0, riskyness: 0.6 },
  Shark:      { skill: 0.9, awareness: 0.9, riskyness: 0.8 },
};

export function doBotAction(state: GameState): { action: 'select_pain' | 'play_card' | 'clear_trick', playerId?: string, cardId?: string } | null {
  if (state.status === 'playing_trick' && state.currentTrick.length === state.players.length) {
    return { action: 'clear_trick' };
  }

  if (state.status === 'selecting_pain') {
    const botToSelect = state.players.find((p: Player) => p.isBot && p.chosenPainCard === null);
    if (botToSelect) {
      const card = choosePainCard(botToSelect, state.openPainCards);
      return { action: 'select_pain', playerId: botToSelect.id, cardId: card.id };
    }
  }

  if (state.status === 'playing_trick') {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.isBot) {
      const card = chooseTrickCard(currentPlayer, state);
      return { action: 'play_card', playerId: currentPlayer.id, cardId: card.id };
    }
  }

  return null;
}

// ─── Pain Card Selection ────────────────────────────────────────────────────

function choosePainCard(bot: Player, openPain: boolean): Card {
  const cfg = bot.botConfig!;

  if (openPain) {
    return choosePainCardOpen(bot, cfg);
  }
  return choosePainCardNormal(bot, cfg);
}

/**
 * Normal mode: avoid colors you hold many of. Prefer low-value cards.
 * Zeros make excellent pain cards (0 penalty).
 */
function choosePainCardNormal(bot: Player, cfg: BotConfig): Card {
  const hand = bot.hand;
  const colorCounts: Record<string, number> = {};
  hand.forEach(c => { colorCounts[c.color] = (colorCounts[c.color] || 0) + 1; });

  const scored = hand.map(c => {
    const colorCount = colorCounts[c.color];
    const riskScore = c.value + (colorCount * 10);
    return { card: c, score: riskScore, isZero: c.value === 0 };
  });

  scored.sort((a, b) => a.score - b.score);

  const zeros = scored.filter(s => s.isZero);
  if (zeros.length > 0 && Math.random() < cfg.skill + 0.2) return zeros[0].card;

  if (Math.random() < cfg.skill) {
    return scored[0].card;
  } else {
    const idx = Math.floor(scored.length * 0.4 + Math.random() * scored.length * 0.6);
    return scored[Math.min(idx, scored.length - 1)].card;
  }
}

/**
 * Open pain mode: pain color doesn't matter.
 * Choose highest value card to remove it from hand entirely.
 */
function choosePainCardOpen(bot: Player, cfg: BotConfig): Card {
  const nonZero = bot.hand.filter(c => c.value > 0);
  if (nonZero.length === 0) return bot.hand[0];

  const scored = [...nonZero].sort((a, b) => b.value - a.value);

  if (Math.random() < cfg.skill) {
    return scored[0];
  } else {
    const revScored = [...bot.hand].sort((a, b) => a.value - b.value);
    const idx = Math.floor(Math.random() * (revScored.length / 2));
    return revScored[idx];
  }
}

// ─── Trick Card Selection ───────────────────────────────────────────────────

function chooseTrickCard(bot: Player, state: GameState): Card {
  const hand = bot.hand;
  if (hand.length === 1) return hand[0];
  if (state.currentTrick.length === 0) return leadCard(bot, state);
  return followCard(bot, state);
}

// ─── Leading ────────────────────────────────────────────────────────────────

function leadCard(bot: Player, _state: GameState): Card {
  const cfg = bot.botConfig!;
  const painColor = bot.chosenPainCard?.color;
  const hand = [...bot.hand];
  if (hand.length === 0) return bot.hand[0];

  const zeros = hand.filter(c => c.value === 0);
  const lowPain = hand.filter(c => c.color === painColor && c.value <= 4).sort((a, b) => a.value - b.value);
  const safeNonPain = hand.filter(c => c.color !== painColor && c.value <= 3).sort((a, b) => a.value - b.value);
  const highNonPain = hand.filter(c => c.color !== painColor && c.value > 8).sort((a, b) => b.value - a.value);

  if (cfg.skill > 0.7 && lowPain.length > 0) return lowPain[0];
  if (cfg.awareness > 0.3 && zeros.length > 0 && Math.random() > cfg.riskyness * 0.5) return zeros[Math.floor(Math.random() * zeros.length)];
  if (safeNonPain.length > 0 && Math.random() > cfg.riskyness * 0.3) return safeNonPain[0];
  if (cfg.riskyness > 0.7 && highNonPain.length > 0 && Math.random() < 0.6) return highNonPain[0];

  hand.sort((a, b) => a.value - b.value);
  return hand[0];
}

// ─── Following ──────────────────────────────────────────────────────────────

function followCard(bot: Player, state: GameState): Card {
  const cfg = bot.botConfig!;
  const trick = state.currentTrick;
  const hand = [...bot.hand];
  if (hand.length === 0) return bot.hand[0];

  const trickWorth = evaluateTrickWorth(bot, trick);
  const canWin = findWinningCards(bot, trick, state);
  const canDuck = hand.filter(c => !canWin.includes(c));

  // Duck strategy — don't want to win
  if (trickWorth < 0) {
    const duckCards = canDuck.length > 0 ? canDuck : [];
    if (duckCards.length > 0) {
      const zeros = duckCards.filter(c => c.value === 0);
      if (zeros.length > 0) return zeros[0];

      if (cfg.skill > 0.5) {
        const painColor = bot.chosenPainCard?.color;
        const painCards = duckCards.filter(c => c.color === painColor && c.value > 3);
        if (painCards.length > 0) {
          painCards.sort((a, b) => b.value - a.value);
          return painCards[0];
        }
      }

      duckCards.sort((a, b) => a.value - b.value);
      return duckCards[0];
    }

    hand.sort((a, b) => a.value - b.value);
    return hand[0];
  }

  // Win strategy — this trick is worth taking
  if (trickWorth > 0 && canWin.length > 0) {
    if (cfg.awareness > 0.6 && willOthersTrump(state, bot)) {
      const duckCards = canDuck.length > 0 ? canDuck : [hand.reduce((a, b) => a.value < b.value ? a : b)];
      duckCards.sort((a, b) => a.value - b.value);
      return duckCards[0];
    }

    canWin.sort((a, b) => a.value - b.value);
    return canWin[0];
  }

  // Neutral trick
  if (cfg.riskyness > 0.6 && canWin.length > 0) {
    canWin.sort((a, b) => a.value - b.value);
    return canWin[0];
  }

  const duckCards = canDuck.length > 0 ? canDuck : hand;
  duckCards.sort((a, b) => a.value - b.value);
  return duckCards[0];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Evaluate a trick's worth.
 * Returns positive = want to win (collect positive points),
 * negative = avoid winning (negative points from pain cards).
 */
function evaluateTrickWorth(bot: Player, trick: { playerId: string; card: Card }[]): number {
  const painColor = bot.chosenPainCard?.color;
  if (!painColor) return 0;

  let cost = 0;
  for (const tc of trick) {
    if (tc.card.color === painColor) cost -= tc.card.value;
    else cost += 1;
  }

  return cost;
}

/**
 * Find all cards in hand that would win the current trick.
 */
function findWinningCards(bot: Player, trick: { playerId: string; card: Card }[], state: GameState): Card[] {
  const hand = bot.hand;
  const leadColor = state.leadColor;
  if (!leadColor) return hand.filter(c => c.value > 0);

  const allZeros = trick.every(tc => tc.card.value === 0);
  if (allZeros) return hand.filter(c => c.value > 0);

  const trumps = trick.filter(tc => tc.card.color !== leadColor && tc.card.value !== 0);
  const leadCards = trick.filter(tc => tc.card.color === leadColor);

  let currentMax = 0;
  let currentIsTrump = false;

  if (trumps.length > 0) {
    currentMax = Math.max(...trumps.map(tc => tc.card.value));
    currentIsTrump = true;
  } else if (leadCards.length > 0) {
    currentMax = Math.max(...leadCards.map(tc => tc.card.value));
    currentIsTrump = false;
  }

  return hand.filter(c => {
    if (c.value === 0) return false;
    if (currentIsTrump) return c.color !== leadColor && c.value > currentMax;
    if (c.color === leadColor) return c.value > currentMax;
    return true;
  });
}

/**
 * Estimate whether other players likely have cards that trump/bot
 */
function willOthersTrump(state: GameState, bot: Player): boolean {
  const cfg = bot.botConfig!;
  if (cfg.awareness < 0.3) return false;

  const leadColor = state.leadColor;
  if (!leadColor) return false;

  const totalOtherCards = state.players
    .filter(p => p.id !== bot.id)
    .reduce((sum, p) => sum + p.hand.length, 0);

  const avgOtherCards = totalOtherCards / (state.players.length - 1);

  if (avgOtherCards > 8) return true;
  if (avgOtherCards > 5 && cfg.awareness > 0.7) return true;

  if (cfg.awareness > 0.9) {
    const trick = state.currentTrick;
    const trumps = trick.filter(tc => tc.card.color !== leadColor && tc.card.value !== 0);
    if (trumps.length > 0) {
      const maxTrump = Math.max(...trumps.map(tc => tc.card.value));
      return maxTrump > 6;
    }
  }

  return false;
}
