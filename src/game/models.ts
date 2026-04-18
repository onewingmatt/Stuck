export type CardColor = 'Red' | 'Yellow' | 'Green' | 'Blue' | 'Purple' | 'Gray' | 'Pink' | 'Orange';

export interface Card {
  id: string;
  color: CardColor;
  value: number;
}

export type BotArchetype = 'Novice' | 'Average' | 'Gambler' | 'Calculator' | 'Empath' | 'Bully' | 'Grandmaster' | 'Shark';

export interface BotConfig {
  archetype: BotArchetype;
  skill: number;
  awareness: number;
  riskyness: number;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  wonCards: Card[];
  chosenPainCard: Card | null;
  score: number;
  isBot: boolean;
  botConfig?: BotConfig;
  connected: boolean;
}

export type GamePhase = 'waiting' | 'selecting_pain' | 'playing_trick' | 'round_over' | 'game_over';

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface TrickLog {
  played: PlayedCard[];
  winnerId: string;
  trickNumber: number;
}

export interface ScoreContribution {
  label: string;
  value: number;
  cardId?: string;
}

export interface PlayerRoundBreakdown {
  playerId: string;
  painCardPenalty: number;
  wonCardsTotal: number;
  wonPainPenalty: number;
  wonGoodCards: number;
  roundScore: number;
  details: ScoreContribution[];
}

export interface GameState {
  roomId: string;
  status: GamePhase;
  players: Player[];
  currentTrick: PlayedCard[];
  leadColor: CardColor | null;
  roundNumber: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  trickWinnerIndex: number | null;
  scores: Record<string, number>;
  deckSizes: number;
  openPainCards: boolean;
  roundBreakdown: Record<string, PlayerRoundBreakdown>;
  trickHistory: TrickLog[];
}
