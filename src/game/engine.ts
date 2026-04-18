import { type Card, type CardColor, type GameState, type Player, type PlayedCard, type PlayerRoundBreakdown, type ScoreContribution, type TrickLog } from './models.js';

const COLORS: CardColor[] = ['Red', 'Yellow', 'Green', 'Blue', 'Purple', 'Gray', 'Pink', 'Orange'];

export function createDeck(playerCount: number): Card[] {
  const deck: Card[] = [];
  let colorsToUse = COLORS.slice(0, 5);
  let maxValue = 8;

  if (playerCount === 4) maxValue = 11;
  else if (playerCount >= 5 && playerCount <= 6) {
    maxValue = 14;
    if (playerCount === 6) colorsToUse = COLORS.slice(0, 6);
  }
  else if (playerCount === 7) {
    colorsToUse = COLORS.slice(0, 7);
    maxValue = 14;
  }
  else if (playerCount === 8) {
    colorsToUse = COLORS.slice(0, 8);
    maxValue = 14;
  }

  for (const color of colorsToUse) {
    for (let value = 0; value <= maxValue; value++) {
      deck.push({ id: `${color}-${value}`, color, value });
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function createInitialState(roomId: string): GameState {
  return {
    roomId,
    status: 'waiting',
    players: [],
    currentTrick: [],
    leadColor: null,
    roundNumber: 0,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    trickWinnerIndex: null,
    scores: {},
    deckSizes: 0,
    openPainCards: false,
    roundBreakdown: {},
    trickHistory: []
  };
}

export function startGame(state: GameState, options?: { openPainCards?: boolean }): GameState {
  if (state.players.length < 3 || state.players.length > 8) return state;

  const newState = { ...state, roundNumber: 1 };
  if (options?.openPainCards) {
    newState.openPainCards = true;
  }
  newState.players.forEach((p: Player) => { newState.scores[p.id] = 0; });
  newState.dealerIndex = Math.floor(Math.random() * newState.players.length);

  return startRound(newState);
}

export function startRound(state: GameState): GameState {
  const newState = { ...state };
  const deck = createDeck(newState.players.length);
  newState.deckSizes = deck.length;

  newState.players = newState.players.map((p: Player) => ({
    ...p, hand: [], wonCards: [], chosenPainCard: null, score: 0
  }));

  let cardIndex = 0;
  for (let i = 0; i < 15; i++) {
    for (let pIndex = 0; pIndex < newState.players.length; pIndex++) {
       newState.players[pIndex].hand.push(deck[cardIndex++]);
    }
  }

  newState.players.forEach((p: Player) => {
    p.hand.sort((a: Card, b: Card) => {
        if (a.color !== b.color) return a.color.localeCompare(b.color);
        return a.value - b.value;
    });
  });

  newState.status = 'selecting_pain';
  newState.currentTrick = [];
  newState.leadColor = null;
  newState.trickWinnerIndex = null;
  newState.trickHistory = [];

  return newState;
}

export function selectPainCard(state: GameState, playerId: string, cardId: string): GameState {
  if (state.status !== 'selecting_pain') return state;

  const playerIndex = state.players.findIndex((p: Player) => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  if (player.chosenPainCard) return state;

  const cardIndex = player.hand.findIndex((c: Card) => c.id === cardId);
  if (cardIndex === -1) return state;

  const newState = { ...state };
  const newPlayers = [...newState.players];
  const newPlayer = { ...player, hand: [...player.hand] };

  const [chosenCard] = newPlayer.hand.splice(cardIndex, 1);
  newPlayer.chosenPainCard = chosenCard;
  
  newPlayers[playerIndex] = newPlayer;
  newState.players = newPlayers;

  if (newPlayers.every((p: Player) => p.chosenPainCard !== null)) {
    newState.status = 'playing_trick';
    newState.currentPlayerIndex = (newState.dealerIndex + 1) % newState.players.length;
  }

  return newState;
}

export function playCard(state: GameState, playerId: string, cardId: string): GameState {
  if (state.status !== 'playing_trick') return state;
  
  const playerIndex = state.players.findIndex((p: Player) => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex) return state;

  const player = state.players[playerIndex];
  const cardIndex = player.hand.findIndex((c: Card) => c.id === cardId);
  if (cardIndex === -1) return state;

  const newState = { ...state };
  const newPlayers = [...newState.players];
  const newPlayer = { ...player, hand: [...player.hand] };

  const [playedCard] = newPlayer.hand.splice(cardIndex, 1);
  newPlayers[playerIndex] = newPlayer;
  newState.players = newPlayers;
  
  const newTrick = [...newState.currentTrick, { playerId, card: playedCard }];
  newState.currentTrick = newTrick;

  if (newState.leadColor === null && playedCard.value !== 0) {
      newState.leadColor = playedCard.color;
  }

  if (newTrick.length === newState.players.length) {
      return resolveTrick(newState);
  } else {
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
  }

  return newState;
}

export function resolveTrick(state: GameState): GameState {
    const newState = { ...state };
    const trick = newState.currentTrick;
    const allZeros = trick.every((tc: PlayedCard) => tc.card.value === 0);
    
    let winnerId = trick[0].playerId;
    
    if (allZeros) {
        winnerId = trick[0].playerId;
    } else {
        const leadColor = newState.leadColor;
        let winningPlay = trick[0];
        
        const trumps = trick.filter((tc: PlayedCard) => tc.card.color !== leadColor && tc.card.value !== 0);
        
        if (trumps.length > 0) {
            let maxTrumpValue = -1;
            for (const t of trumps) {
                if (t.card.value > maxTrumpValue) {
                    maxTrumpValue = t.card.value;
                    winningPlay = t;
                }
            }
        } else {
            let maxLeadValue = -1;
            for (const tc of trick) {
                if (tc.card.color === leadColor && tc.card.value > maxLeadValue) {
                    maxLeadValue = tc.card.value;
                    winningPlay = tc;
                }
            }
        }
        
        winnerId = winningPlay.playerId;
        const winnerIndex = newState.players.findIndex((p: Player) => p.id === winnerId);
        
        newState.players[winnerIndex].wonCards.push(...trick.map((tc: PlayedCard) => tc.card));
        newState.trickWinnerIndex = winnerIndex;
    }

    const winnerIndexFinal = newState.players.findIndex((p: Player) => p.id === winnerId);
    newState.currentPlayerIndex = winnerIndexFinal;

    const trickNum = newState.trickHistory.length + 1;
    newState.trickHistory = [...newState.trickHistory, { played: [...trick], winnerId, trickNumber: trickNum }];

    if (newState.players[0].hand.length === 0) {
        return endRound(newState);
    }
    
    return newState;
}

export function clearTrick(state: GameState): GameState {
    if (state.currentTrick.length !== state.players.length) return state;
    return { ...state, currentTrick: [], leadColor: null, trickWinnerIndex: null };
}

export function endRound(state: GameState): GameState {
    const newState = { ...state };
    newState.status = 'round_over';
    const breakdown: Record<string, PlayerRoundBreakdown> = {};
    
    newState.players.forEach((player: Player) => {
        const details: ScoreContribution[] = [];
        let painPenalty = 0, wonPainPenalty = 0, wonGoodCards = 0;
        const painColor = player.chosenPainCard!.color;
        
        // Pain card penalty
        painPenalty = -player.chosenPainCard!.value;
        details.push({
            label: `Pain card (${painColor} ${player.chosenPainCard!.value})`,
            value: painPenalty
        });
        
        // Score won cards
        for (const card of player.wonCards) {
            if (newState.openPainCards) {
                wonGoodCards += 1;
                details.push({
                    label: `${card.color} ${card.value}`,
                    value: 1,
                    cardId: card.id
                });
            } else {
                if (card.color === painColor) {
                    wonPainPenalty -= card.value;
                    details.push({
                        label: `PAIN suit ${card.color} ${card.value}`,
                        value: -card.value,
                        cardId: card.id
                    });
                } else {
                    wonGoodCards += 1;
                    details.push({
                        label: `${card.color} ${card.value}`,
                        value: 1,
                        cardId: card.id
                    });
                }
            }
        }
        
        // Summary line for won cards
        if (wonGoodCards > 0) {
            details.push({ label: `Won cards (${wonGoodCards} total)`, value: wonGoodCards });
        }
        if (wonPainPenalty < 0) {
            details.push({ label: `Pain suit penalty`, value: wonPainPenalty });
        }
        
        const roundScore = painPenalty + wonPainPenalty + wonGoodCards;
        player.score = roundScore;
        newState.scores[player.id] += roundScore;
        
        breakdown[player.id] = {
            playerId: player.id,
            painCardPenalty: painPenalty,
            wonCardsTotal: wonGoodCards + wonPainPenalty,
            wonPainPenalty,
            wonGoodCards,
            roundScore,
            details
        };
    });
    
    newState.roundBreakdown = breakdown;
    
    if (newState.roundNumber >= newState.players.length) {
        newState.status = 'game_over';
    }
    
    return newState;
}

export function nextRound(state: GameState): GameState {
    if (state.status !== 'round_over') return state;
    
    const newState = { ...state };
    newState.roundNumber++;
    newState.dealerIndex = (newState.dealerIndex + 1) % newState.players.length;
    
    return startRound(newState);
}
