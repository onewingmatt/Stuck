import { type GameState, type Player, type Card, type BotConfig, type BotArchetype } from './models.js';

export const BOT_ARCHETYPES: Record<BotArchetype, Omit<BotConfig, 'archetype'>> = {
  Novice: { skill: 0.1, awareness: 0.1, riskyness: 0.8 },
  Average: { skill: 0.4, awareness: 0.4, riskyness: 0.5 },
  Gambler: { skill: 0.5, awareness: 0.3, riskyness: 0.9 },
  Calculator: { skill: 0.8, awareness: 0.9, riskyness: 0.2 },
  Empath: { skill: 0.6, awareness: 1.0, riskyness: 0.3 },
  Bully: { skill: 0.7, awareness: 0.8, riskyness: 0.9 },
  Grandmaster: { skill: 1.0, awareness: 1.0, riskyness: 0.6 },
  Shark: { skill: 0.9, awareness: 0.9, riskyness: 0.8 },
};

export function doBotAction(state: GameState): { action: 'select_pain' | 'play_card' | 'clear_trick', playerId?: string, cardId?: string } | null {
  if (state.status === 'playing_trick' && state.currentTrick.length === state.players.length) {
    return { action: 'clear_trick' };
  }

  if (state.status === 'selecting_pain') {
    const botToSelect = state.players.find((p: Player) => p.isBot && p.chosenPainCard === null);
    if (botToSelect) {
      const card = choosePainCardForBot(botToSelect);
      return { action: 'select_pain', playerId: botToSelect.id, cardId: card.id };
    }
  }

  if (state.status === 'playing_trick') {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.isBot) {
      const card = playTrickCardForBot(currentPlayer, state);
      return { action: 'play_card', playerId: currentPlayer.id, cardId: card.id };
    }
  }

  return null;
}

function choosePainCardForBot(bot: Player): Card {
  const config = bot.botConfig || BOT_ARCHETYPES.Average;
  
  const zeros = bot.hand.filter((c: Card) => c.value === 0);
  if (zeros.length > 0) {
      if (Math.random() < config.skill + 0.2) return zeros[0];
  }
  
  const colorCounts: Record<string, number> = {};
  bot.hand.forEach((c: Card) => {
      colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
  });
  
  const sortedHand = [...bot.hand].sort((a: Card, b: Card) => {
      const scoreA = evaluatePainCard(a, colorCounts[a.color]);
      const scoreB = evaluatePainCard(b, colorCounts[b.color]);
      return scoreA - scoreB; 
  });
  
  if (Math.random() < config.skill) {
      return sortedHand[0];
  } else {
      const index = Math.floor(Math.random() * (sortedHand.length / 2));
      return sortedHand[index];
  }
}

function evaluatePainCard(card: Card, countInHand: number): number {
    if (card.value === 0) return -100;
    return card.value + (countInHand * 10);
}

function playTrickCardForBot(bot: Player, state: GameState): Card {
    const config = bot.botConfig || BOT_ARCHETYPES.Average;
    const hand = [...bot.hand];
    
    hand.sort((a, b) => a.value - b.value);
    const painColor = bot.chosenPainCard?.color;
    
    if (state.currentTrick.length === 0) {
        const safeCards = hand.filter(c => c.color !== painColor && c.value < 5);
        if (safeCards.length > 0) return safeCards[0];
        return hand[0];
    }
    
    const trickContainsOurPain = state.currentTrick.some(tc => tc.card.color === painColor);
    const leadColor = state.leadColor;
    const isOpenPain = state.openPainCards;
    
    if (trickContainsOurPain && !isOpenPain) {
        // In normal mode, avoid winning our pain cards
        const zeros = hand.filter(c => c.value === 0);
        if (zeros.length > 0) return zeros[0];
        return hand[0];
    }
    
    if (trickContainsOurPain && isOpenPain) {
        // In open pain mode, our pain suit is safe — treat like normal suit
        const leadSuitCards = hand.filter(c => c.color === leadColor);
        if (leadSuitCards.length > 0) return leadSuitCards[0];
        return hand.filter(c => c.value === 0)[0] || hand[0];
    }
    
    if (config.riskyness > 0.5) {
        const trumps = hand.filter(c => c.color !== leadColor && c.color !== painColor && c.value > 8);
        if (trumps.length > 0) return trumps[trumps.length - 1];
    }
    
    return hand[Math.floor(Math.random() * hand.length)];
}
