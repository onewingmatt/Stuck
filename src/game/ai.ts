import { type GameState, type Player, type Card, type BotConfig, type BotArchetype, type CardColor } from './models.js';

export const BOT_ARCHETYPES: Record<BotArchetype, Omit<BotConfig, 'archetype'>> = {
  Novice:     { skill: 0.1, awareness: 0.1, riskyness: 0.9 },
  Average:    { skill: 0.4, awareness: 0.4, riskyness: 0.5 },
  Gambler:    { skill: 0.5, awareness: 0.3, riskyness: 0.95 },
  Calculator: { skill: 0.8, awareness: 0.9, riskyness: 0.1 },
  Empath:     { skill: 0.6, awareness: 1.0, riskyness: 0.2 },
  Bully:      { skill: 0.7, awareness: 0.8, riskyness: 0.95 },
  Grandmaster:{ skill: 1.0, awareness: 1.0, riskyness: 0.5 },
  Shark:      { skill: 0.9, awareness: 0.9, riskyness: 0.7 },
};

// ─── Entry Point ────────────────────────────────────────────────────────────

export function doBotAction(state: GameState): { action: 'select_pain' | 'play_card' | 'clear_trick', playerId?: string, cardId?: string } | null {
  if (state.status === 'playing_trick' && state.currentTrick.length === state.players.length) {
    return { action: 'clear_trick' };
  }

  if (state.status === 'selecting_pain') {
    const bot = state.players.find((p: Player) => p.isBot && p.chosenPainCard === null);
    if (bot) {
      return { action: 'select_pain', playerId: bot.id, cardId: choosePainCard(bot, state.openPainCards).id };
    }
  }

  if (state.status === 'playing_trick') {
    const bot = state.players[state.currentPlayerIndex];
    if (bot.isBot) {
      return { action: 'play_card', playerId: bot.id, cardId: chooseTrickCard(bot, state).id };
    }
  }

  return null;
}

// ─── Pain Card Selection ────────────────────────────────────────────────────

function choosePainCard(bot: Player, openPain: boolean): Card {
  const cfg = bot.botConfig!;
  return openPain ? choosePainOpen(bot, cfg) : choosePainNormal(bot, cfg);
}

function choosePainNormal(bot: Player, cfg: BotConfig): Card {
  const arch = cfg.archetype!;
  const hand = bot.hand;
  const colorCounts: Record<string, number> = {};
  hand.forEach(c => { colorCounts[c.color] = (colorCounts[c.color] || 0) + 1; });

  const scored = hand.map(c => ({
    card: c,
    score: c.value + (colorCounts[c.color] * 10),
    isZero: c.value === 0,
  }));
  scored.sort((a, b) => a.score - b.score);

  if (arch === 'Novice') return randomScoredFrom(scored, 0.4, 1.0);
  if (arch === 'Gambler') return randomScoredFrom(scored, 0.3, 0.7);
  if (arch === 'Bully') return randomScoredFrom(scored, 0.3, 0.8);
  if (arch === 'Calculator' || arch === 'Grandmaster' || arch === 'Shark') {
    const z = scored.find(s => s.isZero);
    return z ? z.card : scored[0].card;
  }
  if (arch === 'Empath') {
    // Empath picks pain in a color others are likely to have (awareness-based)
    const nonZeros = scored.filter(s => !s.isZero);
    if (nonZeros.length > 0) return nonZeros[Math.floor(nonZeros.length / 3)].card;
  }

  // Average fallback
  const z = scored.find(s => s.isZero);
  if (z && Math.random() < cfg.skill + 0.1) return z.card;
  return Math.random() < cfg.skill ? scored[0].card : randomScoredFrom(scored, 0.4, 0.8);
}

function choosePainOpen(bot: Player, cfg: BotConfig): Card {
  const arch = cfg.archetype!;
  const nonZero = bot.hand.filter(c => c.value > 0);
  if (nonZero.length === 0) return bot.hand[0];
  const desc = [...nonZero].sort((a, b) => b.value - a.value);

  if (arch === 'Calculator' || arch === 'Grandmaster' || arch === 'Shark') return desc[0];
  if (arch === 'Gambler') return desc[Math.floor(Math.random() * Math.min(4, desc.length))];
  if (arch === 'Bully') return desc[Math.floor(Math.random() * Math.min(3, desc.length))];
  if (arch === 'Novice') {
    const asc = [...bot.hand].sort((a, b) => a.value - b.value);
    return asc[Math.floor(Math.random() * Math.min(4, asc.length))];
  }
  if (arch === 'Empath') {
    // Pick a color no one else chose as pain (deduction)
    return desc[Math.floor(Math.random() * Math.min(2, desc.length))];
  }
  return desc[0];
}

function randomScoredFrom(arr: { card: Card }[], from: number, to: number): Card {
  const pool = arr.length;
  const start = Math.floor(from * pool);
  const end = Math.min(Math.floor(to * pool), pool - 1);
  const idx = start + Math.floor(Math.random() * (end - start + 1));
  return arr[Math.min(idx, pool - 1)].card;
}

// ─── Trick Card Selection ───────────────────────────────────────────────────

function chooseTrickCard(bot: Player, state: GameState): Card {
  const hand = bot.hand;
  if (hand.length === 1) return hand[0];

  // Build known pain colors map in open pain mode
  let knownPainColors: Record<string, CardColor> | undefined;
  if (state.openPainCards) {
    knownPainColors = {};
    for (const p of state.players) {
      if (p.id !== bot.id && p.chosenPainCard) {
        knownPainColors[p.id] = p.chosenPainCard.color;
      }
    }
  }

  if (state.currentTrick.length === 0) return leadCard(bot, state, knownPainColors);
  return followCard(bot, state, knownPainColors);
}

// ─── Leading: archetype-specific strategies ─────────────────────────────────

function leadCard(bot: Player, _state: GameState, knownPainColors?: Record<string, CardColor>): Card {
  const arch = bot.botConfig!.archetype!;
  const hand = [...bot.hand];
  const painColor = bot.chosenPainCard?.color;
  const lateGame = hand.length <= 5;

  const zeros = hand.filter(c => c.value === 0);
  const lowPain = hand.filter(c => c.color === painColor && c.value <= 4).sort((a, b) => a.value - b.value);
  const midPain = hand.filter(c => c.color === painColor && c.value > 4 && c.value <= 8).sort((a, b) => a.value - b.value);
  const safeLow = hand.filter(c => c.color !== painColor && c.value <= 3).sort((a, b) => a.value - b.value);
  const highOff = hand.filter(c => c.color !== painColor && c.value > 8).sort((a, b) => b.value - a.value);
  const highestOff = hand.filter(c => c.color !== painColor && c.value >= 10).sort((a, b) => b.value - a.value);

  // Open pain: cards that target opponent pain colors
  let oppPainCards: Card[] = [];
  let strongestOppPain: Card | null = null;
  if (knownPainColors && Object.keys(knownPainColors).length > 0) {
    const oppColors = new Set(Object.values(knownPainColors));
    oppPainCards = hand.filter(c => oppColors.has(c.color)).sort((a, b) => b.value - a.value);
    strongestOppPain = oppPainCards.length > 0 ? oppPainCards[0] : null;
  }

  switch (arch) {
    case 'Novice':
      // Random card, occasionally smart — small boost for open pain
      if (knownPainColors && Math.random() < 0.15 && oppPainCards.length > 0) {
        return oppPainCards[Math.floor(Math.random() * oppPainCards.length)];
      }
      if (lateGame && Math.random() < 0.3 && zeros.length > 0) return zeros[0];
      if (Math.random() < 0.2 && zeros.length > 0) return zeros[0];
      return hand[Math.floor(Math.random() * hand.length)];

    case 'Gambler':
      // Leads high to chase tricks, occasionally bleeds pain
      if (lateGame) {
        // More conservative late game: prefer zeros, then mid-range
        if (Math.random() < 0.4 && zeros.length > 0) return zeros[0];
        if (Math.random() < 0.3 && safeLow.length > 0) return safeLow[0];
      }
      if (knownPainColors && Math.random() < 0.25 && oppPainCards.length > 0) {
        return oppPainCards[0];
      }
      if (Math.random() < 0.6 && highOff.length > 0) return highOff[0];
      if (zeros.length > 0) return zeros[Math.floor(Math.random() * zeros.length)];
      return hand[Math.floor(Math.random() * hand.length)];

    case 'Calculator':
      // Defensive: always lead zeros or lowest safe card
      // Open pain: prefer targeting opponent pain colors
      if (lateGame) {
        // Very defensive: lead zeros or lowest possible
        if (zeros.length > 0) return zeros[zeros.length - 1];
        if (safeLow.length > 0) return safeLow[0];
        return hand.reduce((a, b) => a.value < b.value ? a : b);
      }
      if (knownPainColors && strongestOppPain && Math.random() < 0.6) {
        // Lead opponent pain color to force penalties
        const lowOppPain = oppPainCards.filter(c => c.value <= 6);
        if (lowOppPain.length > 0) return lowOppPain[0];
      }
      if (zeros.length > 0) return zeros[zeros.length - 1]; // highest zero
      if (lowPain.length > 0) return lowPain[0]; // lowest pain to bleed
      return safeLow.length > 0 ? safeLow[0] : hand.reduce((a, b) => a.value < b.value ? a : b);

    case 'Empath':
      // Leads mid-pain to test the waters, reads table
      // Open pain: target the player who's ahead in score
      if (knownPainColors && Object.keys(knownPainColors).length > 0) {
        // Find the opponent with the highest score
        const opponents = _state.players.filter(p => p.id !== bot.id && knownPainColors[p.id]);
        if (opponents.length > 0) {
          const ahead = opponents.reduce((a, b) => a.score > b.score ? a : b);
          const targetColor = knownPainColors[ahead.id];
          const targetCards = hand.filter(c => c.color === targetColor).sort((a, b) => a.value - b.value);
          if (targetCards.length > 0 && Math.random() < 0.5) return targetCards[0];
        }
      }
      if (lateGame && zeros.length > 0) return zeros[0];
      if (midPain.length > 0) return midPain[0];
      if (lowPain.length > 0) return lowPain[Math.floor(Math.random() * lowPain.length)];
      if (zeros.length > 0) return zeros[0];
      return safeLow.length > 0 ? safeLow[0] : hand[0];

    case 'Bully':
      // Always leads their strongest card to dominate
      // Open pain: always lead strongest opponent pain color
      if (knownPainColors && strongestOppPain) {
        return strongestOppPain;
      }
      if (lateGame) {
        // Slightly less aggressive: prefer high off-suit over absolute highest
        if (highOff.length > 0) return highOff[0];
      }
      if (highestOff.length > 0) return highestOff[0];
      if (highOff.length > 0) return highOff[0];
      return hand.reduce((a, b) => a.value > b.value ? a : b);

    case 'Grandmaster':
      // Full strategy: bleed pain if available, otherwise zero
      // Open pain: strong preference for opponent pain colors
      if (knownPainColors && strongestOppPain && Math.random() < 0.75) {
        const lowOppPain = oppPainCards.filter(c => c.value <= 6);
        if (lowOppPain.length > 0) return lowOppPain[0];
      }
      if (lateGame) {
        // Conservative: zeros first, then safe low
        if (zeros.length > 0) return zeros[Math.floor(Math.random() * zeros.length)];
        if (safeLow.length > 0) return safeLow[0];
      }
      if (lowPain.length > 0 && Math.random() < 0.7) return lowPain[0];
      if (zeros.length > 0) return zeros[Math.floor(Math.random() * zeros.length)];
      if (safeLow.length > 0) return safeLow[Math.floor(Math.random() * safeLow.length)];
      // Last resort: lead lowest pain
      if (midPain.length > 0) return midPain[0];
      return hand.reduce((a, b) => a.value < b.value ? a : b);

    case 'Shark':
      // Opportunistic: reads hand and picks most exploitable lead
      if (lateGame) {
        // Defensive mode in late game: lead zeros or safe low
        if (zeros.length > 0) return zeros[Math.floor(Math.random() * zeros.length)];
        if (safeLow.length > 0) return safeLow[0];
        if (lowPain.length > 0) return lowPain[0];
        return hand[0];
      }
      if (knownPainColors && strongestOppPain && Math.random() < 0.5) {
        const lowOppPain = oppPainCards.filter(c => c.value <= 5);
        if (lowOppPain.length > 0) return lowOppPain[0];
      }
      if (highOff.length > 0 && bot.hand.length < 8) return highOff[0]; // late game: go high
      if (zeros.length > 0) return zeros[Math.floor(Math.random() * zeros.length)];
      if (lowPain.length > 0) return lowPain[0];
      return safeLow.length > 0 ? safeLow[0] : hand[0];

    default: // Average
      // Small probability boost for opponent pain colors
      if (knownPainColors && Math.random() < 0.2 && oppPainCards.length > 0) {
        return oppPainCards[Math.floor(Math.random() * oppPainCards.length)];
      }
      if (lateGame && zeros.length > 0 && Math.random() > 0.2) return zeros[0];
      if (zeros.length > 0 && Math.random() > 0.3) return zeros[Math.floor(Math.random() * zeros.length)];
      if (safeLow.length > 0) return safeLow[0];
      return hand[Math.floor(Math.random() * hand.length)];
  }
}

// ─── Following: archetype-specific strategies ───────────────────────────────

function followCard(bot: Player, state: GameState, knownPainColors?: Record<string, CardColor>): Card {
  const cfg = bot.botConfig!;
  const arch = cfg.archetype!;
  const trick = state.currentTrick;
  const hand = [...bot.hand];
  if (hand.length === 0) return bot.hand[0];
  const lateGame = hand.length <= 5;

  const trickWorth = evaluateTrickWorth(bot, trick, knownPainColors);
  const canWin = findWinningCards(bot, trick, state);
  const canDuck = hand.filter(c => !canWin.includes(c));

  switch (arch) {
    case 'Novice':
      // Plays randomly 70% of the time, sometimes tries to save pain
      if (lateGame) {
        // More careful late game: duck negative tricks more often
        if (trickWorth < 0 && canDuck.length > 0 && Math.random() < 0.4) {
          return canDuck.sort((a, b) => a.value - b.value)[0];
        }
      }
      if (Math.random() < 0.7) return hand[Math.floor(Math.random() * hand.length)];
      // Novice ducking: try to play lowest
      return canDuck.length > 0
        ? canDuck.sort((a, b) => a.value - b.value)[0]
        : hand.sort((a, b) => a.value - b.value)[0];

    case 'Gambler':
      // ALWAYS tries to win if possible, even bad tricks
      // Late game: ~30% more cautious
      if (lateGame && trickWorth < 0 && canDuck.length > 0 && Math.random() < 0.3) {
        return canDuck.sort((a, b) => a.value - b.value)[0];
      }
      if (canWin.length > 0) {
        // Pick highest winning card — goes all in
        // Late game: use minimum winning card
        if (lateGame) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        canWin.sort((a, b) => b.value - a.value);
        return canWin[0];
      }
      // Can't win: throw highest card anyway (spite play)
      hand.sort((a, b) => b.value - a.value);
      return hand[0];

    case 'Calculator':
      // Never wins a trick with negative value. Ducks with highest pain if forced.
      // Late game: even more defensive
      {
        const duckThreshold = lateGame ? 1 : 0;
        if (trickWorth < duckThreshold || canDuck.length > 0) {
          const duckCards = canDuck.length > 0 ? canDuck : hand;
          // Calculator: dump highest pain cards to get rid of them
          const painColor = bot.chosenPainCard?.color;
          const highPain = duckCards.filter(c => c.color === painColor && c.value > 3).sort((a, b) => b.value - a.value);
          if (highPain.length > 0) return highPain[0];
          duckCards.sort((a, b) => a.value - b.value);
          return duckCards[0];
        }
        // Win with absolute minimum
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }

    case 'Empath':
      // Reads the full trick — considers what EVERY card means
      if (willOthersTrump(state, bot) && canDuck.length > 0) {
        canDuck.sort((a, b) => a.value - b.value);
        return canDuck[0];
      }
      // Empath wants positive tricks with minimal waste
      if (trickWorth > 0 && canWin.length > 0) {
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      // Neutral or negative: duck carefully
      {
        const duckCards2 = canDuck.length > 0 ? canDuck : hand;
        // Dump high-value pain cards when ducking
        const pain2 = bot.chosenPainCard?.color;
        const dump = duckCards2.filter(c => c.color === pain2 && c.value > 3).sort((a, b) => b.value - a.value);
        if (dump.length > 0) return dump[0];
        if (lateGame) {
          duckCards2.sort((a, b) => a.value - b.value);
          return duckCards2[0];
        }
        duckCards2.sort((a, b) => b.value - a.value);
        return duckCards2[0];
      }

    case 'Bully':
      // Wins EVERY trick they can. If they can't win, they throw trash.
      // Late game: ~30% more cautious
      if (lateGame && trickWorth < 0 && canDuck.length > 0 && Math.random() < 0.3) {
        return canDuck.sort((a, b) => a.value - b.value)[0];
      }
      if (canWin.length > 0) {
        // Bully plays HIGHEST winning card to show dominance
        if (lateGame) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        canWin.sort((a, b) => b.value - a.value);
        return canWin[0];
      }
      // Can't win: waste lowest card
      hand.sort((a, b) => a.value - b.value);
      return hand[0];

    case 'Grandmaster':
      // Full evaluation: win if positive+can, duck if negative
      // Late game: even more defensive
      {
        const negThreshold = lateGame ? 0 : -1;
        if (trickWorth < negThreshold) {
          if (canDuck.length > 0) {
            canDuck.sort((a, b) => a.value - b.value);
            const zeros = canDuck.filter(c => c.value === 0);
            if (zeros.length > 0) return zeros[0];
            // Dump highest pain while ducking
            const painColor2 = bot.chosenPainCard?.color;
            const painDump = canDuck.filter(c => c.color === painColor2).sort((a, b) => b.value - a.value);
            if (painDump.length > 0) return painDump[0];
            return canDuck[0];
          }
          hand.sort((a, b) => a.value - b.value);
          return hand[0];
        }

        if (trickWorth > 0) {
          if (canWin.length === 0) return hand.reduce((a, b) => a.value < b.value ? a : b);
          if (willOthersTrump(state, bot) && canDuck.length > 0) {
            canDuck.sort((a, b) => a.value - b.value);
            return canDuck[0];
          }
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }

        // Neutral: depends on game state
        if (canWin.length > 0) {
          if (lateGame) {
            // In late game, duck neutral tricks more often
            if (canDuck.length > 0) {
              canDuck.sort((a, b) => a.value - b.value);
              return canDuck[0];
            }
          }
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        const defDuck = canDuck.length > 0 ? canDuck : hand;
        defDuck.sort((a, b) => a.value - b.value);
        return defDuck[0];
      }

    case 'Shark':
      // Opportunistic: wins positive tricks, ducks negative, goes big when it counts
      // Late game: switch to defensive mode
      if (lateGame) {
        if (trickWorth < 0 && canDuck.length > 0) {
          canDuck.sort((a, b) => a.value - b.value);
          return canDuck[0];
        }
        if (trickWorth > 0 && canWin.length > 0) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        // Neutral: duck
        const lateDuck = canDuck.length > 0 ? canDuck : hand;
        lateDuck.sort((a, b) => a.value - b.value);
        return lateDuck[0];
      }
      if (trickWorth > 3 && canWin.length > 0) {
        // High-value trick: go for it with minimum card
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      if (trickWorth < -2 && canDuck.length > 0) {
        canDuck.sort((a, b) => a.value - b.value);
        return canDuck[0];
      }
      if (trickWorth >= -2 && trickWorth <= 3 && canWin.length > 0) {
        // Marginal: go for it if we're behind in hand count
        if (bot.hand.length > 6) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        return canDuck.length > 0 ? canDuck.sort((a, b) => a.value - b.value)[0] : hand.sort((a, b) => a.value - b.value)[0];
      }
      // Default duck
      const sharkDuck = canDuck.length > 0 ? canDuck : hand;
      sharkDuck.sort((a, b) => a.value - b.value);
      return sharkDuck[0];

    default: // Average
      // Late game: duck negative more aggressively
      if (lateGame && trickWorth < 1 && canDuck.length > 0) {
        canDuck.sort((a, b) => a.value - b.value);
        return canDuck[0];
      }
      if (trickWorth < 0 && canDuck.length > 0) {
        canDuck.sort((a, b) => a.value - b.value);
        return canDuck[0];
      }
      if (trickWorth > 0 && canWin.length > 0) {
        if (lateGame) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      if (cfg.riskyness > 0.6 && canWin.length > 0) {
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      const def = canDuck.length > 0 ? canDuck : hand;
      def.sort((a, b) => a.value - b.value);
      return def[0];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function evaluateTrickWorth(bot: Player, trick: { playerId: string; card: Card }[], knownPainColors?: Record<string, CardColor>): number {
  const painColor = bot.chosenPainCard?.color;
  if (!painColor) return 0;
  let cost = 0;
  for (const tc of trick) {
    if (tc.card.color === painColor) cost -= tc.card.value;
    else cost += 1;
  }

  // Open pain: factor in whether winning would force opponents to take their pain cards
  if (knownPainColors && Object.keys(knownPainColors).length > 0) {
    for (const tc of trick) {
      const oppPainColor = knownPainColors[tc.playerId];
      if (oppPainColor && tc.card.color === oppPainColor) {
        // Opponent played their own pain color — that's a win for us
        cost += Math.ceil(tc.card.value / 2);
      }
    }
  }

  return cost;
}

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

function willOthersTrump(state: GameState, bot: Player): boolean {
  const cfg = bot.botConfig!;
  if (cfg.awareness < 0.3) return false;

  const leadColor = state.leadColor;
  if (!leadColor) return false;

  const totalOther = state.players.filter(p => p.id !== bot.id).reduce((s, p) => s + p.hand.length, 0);
  const avg = totalOther / (state.players.length - 1);

  if (avg > 8) return true;
  if (avg > 6 && cfg.awareness > 0.7) return true;
  if (cfg.awareness > 0.9) {
    const trumps = state.currentTrick.filter(tc => tc.card.color !== leadColor && tc.card.value !== 0);
    if (trumps.length > 0) {
      const max = Math.max(...trumps.map(tc => tc.card.value));
      return max > 6;
    }
  }
  return false;
}
