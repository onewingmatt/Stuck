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

// ─── Game Context ──────────────────────────────────────────────────────────

type ScorePosition = 'ahead' | 'middle' | 'behind';

interface GameContext {
  scorePosition: ScorePosition;
  scoreGap: number;          // positive = ahead, negative = behind
  roundsLeft: number;
  isFinalRound: boolean;
  cardsPlayed: number;       // total tricks completed this round
  highCardsRemaining: number; // estimated cards > 10 still in play
  myHandSize: number;
  avgOppHandSize: number;
}

function getGameContext(bot: Player, state: GameState): GameContext {
  const totalRounds = state.settings.roundCount || state.players.length;
  const roundsLeft = totalRounds - state.roundNumber;
  const isFinalRound = roundsLeft <= 0;

  // Score position
  const myScore = state.scores[bot.id] ?? 0;
  const otherScores = state.players
    .filter(p => p.id !== bot.id)
    .map(p => state.scores[p.id] ?? 0);
  const avgScore = otherScores.reduce((a, b) => a + b, 0) / otherScores.length;
  const maxScore = Math.max(...otherScores);
  const scoreGap = myScore - maxScore;

  let scorePosition: ScorePosition = 'middle';
  if (myScore > avgScore + 10) scorePosition = 'ahead';
  else if (myScore < avgScore - 10) scorePosition = 'behind';

  // Card memory: estimate high cards remaining
  const totalTricks = state.trickHistory.length;
  const playedValues = state.trickHistory.flatMap(t => t.played.map(p => p.card.value));
  const highCardsPlayed = playedValues.filter(v => v >= 10).length;
  // Rough estimate: ~30% of deck values are 10+, minus what's been played and what's in our hand
  const myHighCards = bot.hand.filter(c => c.value >= 10).length;
  const estimatedTotalHigh = Math.ceil(state.deckSizes * 0.3);
  const highCardsRemaining = Math.max(0, estimatedTotalHigh - highCardsPlayed - myHighCards);

  const oppHandSizes = state.players.filter(p => p.id !== bot.id).map(p => p.hand.length);
  const avgOppHandSize = oppHandSizes.reduce((a, b) => a + b, 0) / oppHandSizes.length;

  return {
    scorePosition,
    scoreGap,
    roundsLeft,
    isFinalRound,
    cardsPlayed: totalTricks,
    highCardsRemaining,
    myHandSize: bot.hand.length,
    avgOppHandSize,
  };
}

// Modifies effective riskyness based on score position and urgency
function adjustedRiskyness(baseRisk: number, ctx: GameContext): number {
  let risk = baseRisk;

  // Behind in score + late game = take more risks
  if (ctx.scorePosition === 'behind') {
    risk += ctx.isFinalRound ? 0.3 : 0.15;
    if (ctx.scoreGap < -20) risk += 0.1; // way behind
  }
  // Ahead in score = play safer
  else if (ctx.scorePosition === 'ahead') {
    risk -= ctx.isFinalRound ? 0.25 : 0.1;
    if (ctx.scoreGap > 20) risk -= 0.1; // way ahead
  }

  return Math.max(0.05, Math.min(0.98, risk));
}

// ─── Entry Point ────────────────────────────────────────────────────────────

export function doBotAction(state: GameState): { action: 'select_pain' | 'play_card' | 'clear_trick', playerId?: string, cardId?: string } | null {
  if (state.status === 'playing_trick' && state.currentTrick.length === state.players.length) {
    return { action: 'clear_trick' };
  }

  if (state.status === 'selecting_pain') {
    const bot = state.players.find((p: Player) => p.isBot && p.chosenPainCard === null);
    if (bot) {
      return { action: 'select_pain', playerId: bot.id, cardId: choosePainCard(bot, state).id };
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

function choosePainCard(bot: Player, state: GameState): Card {
  const cfg = bot.botConfig!;
  const ctx = getGameContext(bot, state);

  // Behind in score: sometimes pick a lower pain card to minimize damage
  const preferLowPain = ctx.scorePosition === 'behind' && ctx.isFinalRound;

  return state.openPainCards
    ? choosePainOpen(bot, cfg, preferLowPain)
    : choosePainNormal(bot, cfg, preferLowPain);
}

function choosePainNormal(bot: Player, cfg: BotConfig, preferLow: boolean): Card {
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
    const nonZeros = scored.filter(s => !s.isZero);
    if (nonZeros.length > 0) return nonZeros[Math.floor(nonZeros.length / 3)].card;
  }

  // Average fallback
  const z = scored.find(s => s.isZero);
  if (z && Math.random() < cfg.skill + 0.1) return z.card;
  return Math.random() < cfg.skill ? scored[0].card : randomScoredFrom(scored, 0.4, 0.8);
}

function choosePainOpen(bot: Player, cfg: BotConfig, preferLow: boolean): Card {
  const arch = cfg.archetype!;
  const nonZero = bot.hand.filter(c => c.value > 0);
  if (nonZero.length === 0) return bot.hand[0];
  const desc = [...nonZero].sort((a, b) => b.value - a.value);

  // When behind and desperate, pick lower pain to minimize penalty exposure
  if (preferLow && arch !== 'Novice') {
    const mid = Math.floor(desc.length / 2);
    return desc[Math.min(mid + Math.floor(Math.random() * 2), desc.length - 1)];
  }

  if (arch === 'Calculator' || arch === 'Grandmaster' || arch === 'Shark') return desc[0];
  if (arch === 'Gambler') return desc[Math.floor(Math.random() * Math.min(4, desc.length))];
  if (arch === 'Bully') return desc[Math.floor(Math.random() * Math.min(3, desc.length))];
  if (arch === 'Novice') {
    const asc = [...bot.hand].sort((a, b) => a.value - b.value);
    return asc[Math.floor(Math.random() * Math.min(4, asc.length))];
  }
  if (arch === 'Empath') {
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

  const ctx = getGameContext(bot, state);

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

  if (state.currentTrick.length === 0) return leadCard(bot, state, ctx, knownPainColors);
  return followCard(bot, state, ctx, knownPainColors);
}

// ─── Leading: archetype-specific strategies ─────────────────────────────────

function leadCard(bot: Player, _state: GameState, ctx: GameContext, knownPainColors?: Record<string, CardColor>): Card {
  const arch = bot.botConfig!.archetype!;
  const hand = [...bot.hand];
  const painColor = bot.chosenPainCard?.color;
  const lateGame = hand.length <= 5;

  // Score-aware aggression override
  const risk = adjustedRiskyness(bot.botConfig!.riskyness, ctx);
  const desperateBehind = ctx.scorePosition === 'behind' && ctx.isFinalRound;
  const safeAhead = ctx.scorePosition === 'ahead' && ctx.isFinalRound;

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

  // Behind + late game: aggressive leads even for normally defensive archetypes
  if (desperateBehind && highOff.length > 0 && arch !== 'Novice') {
    return highOff[0];
  }
  // Ahead + late game: extra safe leads
  if (safeAhead && zeros.length > 0) {
    return zeros[Math.floor(Math.random() * zeros.length)];
  }

  switch (arch) {
    case 'Novice':
      if (knownPainColors && Math.random() < 0.15 && oppPainCards.length > 0) {
        return oppPainCards[Math.floor(Math.random() * oppPainCards.length)];
      }
      if (lateGame && Math.random() < 0.3 && zeros.length > 0) return zeros[0];
      if (Math.random() < 0.2 && zeros.length > 0) return zeros[0];
      return hand[Math.floor(Math.random() * hand.length)];

    case 'Gambler':
      // Behind: even more aggressive, skip the conservative checks
      if (!desperateBehind && lateGame) {
        if (Math.random() < 0.4 && zeros.length > 0) return zeros[0];
        if (Math.random() < 0.3 && safeLow.length > 0) return safeLow[0];
      }
      if (knownPainColors && Math.random() < 0.25 && oppPainCards.length > 0) {
        return oppPainCards[0];
      }
      if (Math.random() < (desperateBehind ? 0.8 : 0.6) && highOff.length > 0) return highOff[0];
      if (zeros.length > 0 && !desperateBehind) return zeros[Math.floor(Math.random() * zeros.length)];
      return hand[Math.floor(Math.random() * hand.length)];

    case 'Calculator':
      if (lateGame && !desperateBehind) {
        if (zeros.length > 0) return zeros[zeros.length - 1];
        if (safeLow.length > 0) return safeLow[0];
        return hand.reduce((a, b) => a.value < b.value ? a : b);
      }
      // Behind: Calculator reluctantly leads pain to force action
      if (desperateBehind && midPain.length > 0) return midPain[0];
      if (knownPainColors && strongestOppPain && Math.random() < 0.6) {
        const lowOppPain = oppPainCards.filter(c => c.value <= 6);
        if (lowOppPain.length > 0) return lowOppPain[0];
      }
      if (zeros.length > 0) return zeros[zeros.length - 1];
      if (lowPain.length > 0) return lowPain[0];
      return safeLow.length > 0 ? safeLow[0] : hand.reduce((a, b) => a.value < b.value ? a : b);

    case 'Empath':
      if (knownPainColors && Object.keys(knownPainColors).length > 0) {
        const opponents = _state.players.filter(p => p.id !== bot.id && knownPainColors[p.id]);
        if (opponents.length > 0) {
          // Target the leader more aggressively when behind
          const target = ctx.scorePosition === 'behind'
            ? opponents.reduce((a, b) => _state.scores[a.id] > _state.scores[b.id] ? a : b)
            : opponents.reduce((a, b) => a.score > b.score ? a : b);
          const targetColor = knownPainColors[target.id];
          const targetCards = hand.filter(c => c.color === targetColor).sort((a, b) => a.value - b.value);
          const chance = ctx.scorePosition === 'behind' ? 0.7 : 0.5;
          if (targetCards.length > 0 && Math.random() < chance) return targetCards[0];
        }
      }
      if (lateGame && zeros.length > 0 && !desperateBehind) return zeros[0];
      if (midPain.length > 0) return midPain[0];
      if (lowPain.length > 0) return lowPain[Math.floor(Math.random() * lowPain.length)];
      if (zeros.length > 0) return zeros[0];
      return safeLow.length > 0 ? safeLow[0] : hand[0];

    case 'Bully':
      if (knownPainColors && strongestOppPain) {
        return strongestOppPain;
      }
      if (lateGame && !desperateBehind) {
        if (highOff.length > 0) return highOff[0];
      }
      if (highestOff.length > 0) return highestOff[0];
      if (highOff.length > 0) return highOff[0];
      return hand.reduce((a, b) => a.value > b.value ? a : b);

    case 'Grandmaster':
      if (knownPainColors && strongestOppPain && Math.random() < 0.75) {
        const lowOppPain = oppPainCards.filter(c => c.value <= 6);
        if (lowOppPain.length > 0) return lowOppPain[0];
      }
      if (lateGame && !desperateBehind) {
        if (zeros.length > 0) return zeros[Math.floor(Math.random() * zeros.length)];
        if (safeLow.length > 0) return safeLow[0];
      }
      // Behind: Grandmaster leads mid-pain to force action
      if (desperateBehind && midPain.length > 0) return midPain[0];
      if (lowPain.length > 0 && Math.random() < 0.7) return lowPain[0];
      if (zeros.length > 0) return zeros[Math.floor(Math.random() * zeros.length)];
      if (safeLow.length > 0) return safeLow[Math.floor(Math.random() * safeLow.length)];
      if (midPain.length > 0) return midPain[0];
      return hand.reduce((a, b) => a.value < b.value ? a : b);

    case 'Shark':
      // Shark is the most score-aware archetype
      if (desperateBehind) {
        // Go aggressive: lead highest off-suit to try winning tricks
        if (highOff.length > 0) return highOff[0];
        if (highestOff.length > 0) return highestOff[0];
      }
      if (safeAhead) {
        // Play ultra-safe when protecting a lead
        if (zeros.length > 0) return zeros[0];
        if (safeLow.length > 0) return safeLow[0];
      }
      if (lateGame && !desperateBehind) {
        if (zeros.length > 0) return zeros[Math.floor(Math.random() * zeros.length)];
        if (safeLow.length > 0) return safeLow[0];
        if (lowPain.length > 0) return lowPain[0];
        return hand[0];
      }
      if (knownPainColors && strongestOppPain && Math.random() < 0.5) {
        const lowOppPain = oppPainCards.filter(c => c.value <= 5);
        if (lowOppPain.length > 0) return lowOppPain[0];
      }
      if (highOff.length > 0 && bot.hand.length < 8) return highOff[0];
      if (zeros.length > 0) return zeros[Math.floor(Math.random() * zeros.length)];
      if (lowPain.length > 0) return lowPain[0];
      return safeLow.length > 0 ? safeLow[0] : hand[0];

    default: // Average
      if (knownPainColors && Math.random() < 0.2 && oppPainCards.length > 0) {
        return oppPainCards[Math.floor(Math.random() * oppPainCards.length)];
      }
      if (lateGame && zeros.length > 0 && Math.random() > 0.2 && !desperateBehind) return zeros[0];
      if (zeros.length > 0 && Math.random() > 0.3 && !desperateBehind) return zeros[Math.floor(Math.random() * zeros.length)];
      if (desperateBehind && highOff.length > 0) return highOff[0];
      if (safeLow.length > 0) return safeLow[0];
      return hand[Math.floor(Math.random() * hand.length)];
  }
}

// ─── Following: archetype-specific strategies ───────────────────────────────

function followCard(bot: Player, state: GameState, ctx: GameContext, knownPainColors?: Record<string, CardColor>): Card {
  const cfg = bot.botConfig!;
  const arch = cfg.archetype!;
  const trick = state.currentTrick;
  const hand = [...bot.hand];
  if (hand.length === 0) return bot.hand[0];
  const lateGame = hand.length <= 5;

  const desperateBehind = ctx.scorePosition === 'behind' && ctx.isFinalRound;
  const safeAhead = ctx.scorePosition === 'ahead' && ctx.isFinalRound;

  const trickWorth = evaluateTrickWorth(bot, trick, knownPainColors, ctx);
  const canWin = findWinningCards(bot, trick, state);
  const canDuck = hand.filter(c => !canWin.includes(c));

  // Score-aware adjustments applied across all archetypes
  const winChanceBoost = desperateBehind ? 0.25 : 0;
  const duckChanceBoost = safeAhead ? 0.25 : 0;

  switch (arch) {
    case 'Novice':
      if (lateGame) {
        if (trickWorth < 0 && canDuck.length > 0 && Math.random() < 0.4 + duckChanceBoost) {
          return canDuck.sort((a, b) => a.value - b.value)[0];
        }
      }
      // Behind: slightly less random, tries to win more
      if (desperateBehind && canWin.length > 0 && Math.random() < 0.4) {
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      if (Math.random() < 0.7) return hand[Math.floor(Math.random() * hand.length)];
      return canDuck.length > 0
        ? canDuck.sort((a, b) => a.value - b.value)[0]
        : hand.sort((a, b) => a.value - b.value)[0];

    case 'Gambler':
      // Behind: skip the cautious check entirely
      if (!desperateBehind && lateGame && trickWorth < 0 && canDuck.length > 0 && Math.random() < 0.3 + duckChanceBoost) {
        return canDuck.sort((a, b) => a.value - b.value)[0];
      }
      if (canWin.length > 0) {
        // Behind: always play highest winning card for maximum damage
        if (desperateBehind) {
          canWin.sort((a, b) => b.value - a.value);
          return canWin[0];
        }
        if (lateGame) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        canWin.sort((a, b) => b.value - a.value);
        return canWin[0];
      }
      hand.sort((a, b) => b.value - a.value);
      return hand[0];

    case 'Calculator':
      {
        const duckThreshold = lateGame ? 1 : 0;
        // Ahead: duck even more aggressively
        const effectiveThreshold = safeAhead ? duckThreshold + 1 : duckThreshold;
        if (trickWorth < effectiveThreshold || canDuck.length > 0) {
          const duckCards = canDuck.length > 0 ? canDuck : hand;
          const painColor = bot.chosenPainCard?.color;
          const highPain = duckCards.filter(c => c.color === painColor && c.value > 3).sort((a, b) => b.value - a.value);
          if (highPain.length > 0) return highPain[0];
          duckCards.sort((a, b) => a.value - b.value);
          return duckCards[0];
        }
        // Behind: Calculator wins with minimum card but actually wins
        if (desperateBehind && canWin.length > 0) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }

    case 'Empath':
      if (willOthersTrump(state, bot) && canDuck.length > 0 && !desperateBehind) {
        canDuck.sort((a, b) => a.value - b.value);
        return canDuck[0];
      }
      if (trickWorth > 0 && canWin.length > 0) {
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      // Behind: Empath takes neutral tricks too
      if (desperateBehind && trickWorth >= 0 && canWin.length > 0) {
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      {
        const duckCards2 = canDuck.length > 0 ? canDuck : hand;
        const pain2 = bot.chosenPainCard?.color;
        const dump = duckCards2.filter(c => c.color === pain2 && c.value > 3).sort((a, b) => b.value - a.value);
        if (dump.length > 0) return dump[0];
        if (lateGame && !desperateBehind) {
          duckCards2.sort((a, b) => a.value - b.value);
          return duckCards2[0];
        }
        duckCards2.sort((a, b) => b.value - a.value);
        return duckCards2[0];
      }

    case 'Bully':
      if (!desperateBehind && lateGame && trickWorth < 0 && canDuck.length > 0 && Math.random() < 0.3 + duckChanceBoost) {
        return canDuck.sort((a, b) => a.value - b.value)[0];
      }
      if (canWin.length > 0) {
        if (lateGame && !desperateBehind) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        canWin.sort((a, b) => b.value - a.value);
        return canWin[0];
      }
      hand.sort((a, b) => a.value - b.value);
      return hand[0];

    case 'Grandmaster':
      {
        const negThreshold = lateGame && !desperateBehind ? 0 : -1;
        // Ahead: duck everything that isn't strongly positive
        const effectiveNeg = safeAhead ? negThreshold + 1 : negThreshold;
        if (trickWorth < effectiveNeg) {
          if (canDuck.length > 0) {
            canDuck.sort((a, b) => a.value - b.value);
            const zeros = canDuck.filter(c => c.value === 0);
            if (zeros.length > 0) return zeros[0];
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
          if (willOthersTrump(state, bot) && canDuck.length > 0 && !desperateBehind) {
            canDuck.sort((a, b) => a.value - b.value);
            return canDuck[0];
          }
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }

        // Neutral: depends on position
        if (canWin.length > 0) {
          if (desperateBehind) {
            // Take it when desperate
            canWin.sort((a, b) => a.value - b.value);
            return canWin[0];
          }
          if (lateGame && !desperateBehind) {
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
      // Shark is the most adaptive to score position
      if (desperateBehind) {
        // Win everything possible when behind in final round
        if (canWin.length > 0) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        // Can't win: dump highest pain
        const painDump = hand.filter(c => c.color === bot.chosenPainCard?.color).sort((a, b) => b.value - a.value);
        if (painDump.length > 0) return painDump[0];
        hand.sort((a, b) => b.value - a.value);
        return hand[0];
      }
      if (safeAhead) {
        // Duck everything when protecting lead
        if (canDuck.length > 0) {
          canDuck.sort((a, b) => a.value - b.value);
          return canDuck[0];
        }
        hand.sort((a, b) => a.value - b.value);
        return hand[0];
      }
      // Normal Shark logic
      if (lateGame) {
        if (trickWorth < 0 && canDuck.length > 0) {
          canDuck.sort((a, b) => a.value - b.value);
          return canDuck[0];
        }
        if (trickWorth > 0 && canWin.length > 0) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        const lateDuck = canDuck.length > 0 ? canDuck : hand;
        lateDuck.sort((a, b) => a.value - b.value);
        return lateDuck[0];
      }
      if (trickWorth > 3 && canWin.length > 0) {
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      if (trickWorth < -2 && canDuck.length > 0) {
        canDuck.sort((a, b) => a.value - b.value);
        return canDuck[0];
      }
      if (trickWorth >= -2 && trickWorth <= 3 && canWin.length > 0) {
        if (bot.hand.length > 6) {
          canWin.sort((a, b) => a.value - b.value);
          return canWin[0];
        }
        return canDuck.length > 0 ? canDuck.sort((a, b) => a.value - b.value)[0] : hand.sort((a, b) => a.value - b.value)[0];
      }
      const sharkDuck = canDuck.length > 0 ? canDuck : hand;
      sharkDuck.sort((a, b) => a.value - b.value);
      return sharkDuck[0];

    default: // Average
      if (lateGame && !desperateBehind && trickWorth < 1 + duckChanceBoost && canDuck.length > 0) {
        canDuck.sort((a, b) => a.value - b.value);
        return canDuck[0];
      }
      if (trickWorth < 0 && canDuck.length > 0 && !desperateBehind) {
        canDuck.sort((a, b) => a.value - b.value);
        return canDuck[0];
      }
      if (trickWorth > 0 && canWin.length > 0) {
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      if (desperateBehind && canWin.length > 0) {
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      if ((cfg.riskyness + winChanceBoost) > 0.6 && canWin.length > 0) {
        canWin.sort((a, b) => a.value - b.value);
        return canWin[0];
      }
      const def = canDuck.length > 0 ? canDuck : hand;
      def.sort((a, b) => a.value - b.value);
      return def[0];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function evaluateTrickWorth(
  bot: Player,
  trick: { playerId: string; card: Card }[],
  knownPainColors?: Record<string, CardColor>,
  ctx?: GameContext,
): number {
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
        cost += Math.ceil(tc.card.value / 2);
      }
    }
  }

  // Card memory: if few high cards remain, winning is less likely to be trumped
  // so tricks are worth slightly more
  if (ctx && ctx.highCardsRemaining <= 3) {
    cost += 0.5;
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
