const COLORS = ['Red', 'Yellow', 'Green', 'Blue', 'Purple', 'Gray'];
export function createDeck(playerCount) {
    const deck = [];
    let colorsToUse = COLORS.slice(0, 5);
    let maxValue = 8;
    if (playerCount === 4)
        maxValue = 11;
    else if (playerCount === 5)
        maxValue = 14;
    else if (playerCount === 6) {
        colorsToUse = COLORS.slice(0, 6);
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
export function createInitialState(roomId) {
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
        deckSizes: 0
    };
}
export function startGame(state) {
    if (state.players.length < 3 || state.players.length > 6)
        return state;
    const newState = { ...state, roundNumber: 1 };
    newState.players.forEach((p) => { newState.scores[p.id] = 0; });
    newState.dealerIndex = Math.floor(Math.random() * newState.players.length);
    return startRound(newState);
}
export function startRound(state) {
    const newState = { ...state };
    const deck = createDeck(newState.players.length);
    newState.deckSizes = deck.length;
    newState.players = newState.players.map((p) => ({
        ...p, hand: [], wonCards: [], chosenPainCard: null, score: 0
    }));
    let cardIndex = 0;
    for (let i = 0; i < 15; i++) {
        for (let pIndex = 0; pIndex < newState.players.length; pIndex++) {
            newState.players[pIndex].hand.push(deck[cardIndex++]);
        }
    }
    newState.players.forEach((p) => {
        p.hand.sort((a, b) => {
            if (a.color !== b.color)
                return a.color.localeCompare(b.color);
            return a.value - b.value;
        });
    });
    newState.status = 'selecting_pain';
    newState.currentTrick = [];
    newState.leadColor = null;
    newState.trickWinnerIndex = null;
    return newState;
}
export function selectPainCard(state, playerId, cardId) {
    if (state.status !== 'selecting_pain')
        return state;
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1)
        return state;
    const player = state.players[playerIndex];
    if (player.chosenPainCard)
        return state;
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1)
        return state;
    const newState = { ...state };
    const newPlayers = [...newState.players];
    const newPlayer = { ...player, hand: [...player.hand] };
    const [chosenCard] = newPlayer.hand.splice(cardIndex, 1);
    newPlayer.chosenPainCard = chosenCard;
    newPlayers[playerIndex] = newPlayer;
    newState.players = newPlayers;
    if (newPlayers.every((p) => p.chosenPainCard !== null)) {
        newState.status = 'playing_trick';
        newState.currentPlayerIndex = (newState.dealerIndex + 1) % newState.players.length;
    }
    return newState;
}
export function playCard(state, playerId, cardId) {
    if (state.status !== 'playing_trick')
        return state;
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex)
        return state;
    const player = state.players[playerIndex];
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1)
        return state;
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
    }
    else {
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    }
    return newState;
}
export function resolveTrick(state) {
    const newState = { ...state };
    const trick = newState.currentTrick;
    const allZeros = trick.every((tc) => tc.card.value === 0);
    let winnerId = trick[0].playerId;
    if (allZeros) {
        winnerId = trick[0].playerId;
    }
    else {
        const leadColor = newState.leadColor;
        let winningPlay = trick[0];
        const trumps = trick.filter((tc) => tc.card.color !== leadColor && tc.card.value !== 0);
        if (trumps.length > 0) {
            let maxTrumpValue = -1;
            for (const t of trumps) {
                if (t.card.value > maxTrumpValue) {
                    maxTrumpValue = t.card.value;
                    winningPlay = t;
                }
            }
        }
        else {
            let maxLeadValue = -1;
            for (const tc of trick) {
                if (tc.card.color === leadColor && tc.card.value > maxLeadValue) {
                    maxLeadValue = tc.card.value;
                    winningPlay = tc;
                }
            }
        }
        winnerId = winningPlay.playerId;
        const winnerIndex = newState.players.findIndex((p) => p.id === winnerId);
        newState.players[winnerIndex].wonCards.push(...trick.map((tc) => tc.card));
        newState.trickWinnerIndex = winnerIndex;
    }
    const winnerIndexFinal = newState.players.findIndex((p) => p.id === winnerId);
    newState.currentPlayerIndex = winnerIndexFinal;
    if (newState.players[0].hand.length === 0) {
        return endRound(newState);
    }
    return newState;
}
export function clearTrick(state) {
    if (state.currentTrick.length !== state.players.length)
        return state;
    return { ...state, currentTrick: [], leadColor: null, trickWinnerIndex: null };
}
export function endRound(state) {
    const newState = { ...state };
    newState.status = 'round_over';
    newState.players.forEach((player) => {
        let roundScore = 0;
        const painColor = player.chosenPainCard.color;
        roundScore -= player.chosenPainCard.value;
        for (const card of player.wonCards) {
            if (card.color === painColor)
                roundScore -= card.value;
            else
                roundScore += 1;
        }
        player.score = roundScore;
        newState.scores[player.id] += roundScore;
    });
    if (newState.roundNumber >= newState.players.length) {
        newState.status = 'game_over';
    }
    return newState;
}
export function nextRound(state) {
    if (state.status !== 'round_over')
        return state;
    const newState = { ...state };
    newState.roundNumber++;
    newState.dealerIndex = (newState.dealerIndex + 1) % newState.players.length;
    return startRound(newState);
}
