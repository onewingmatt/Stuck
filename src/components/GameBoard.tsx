import { useState, useEffect, useRef, useCallback } from 'react';
import { type GameState, type CardColor } from '../game/models.js';
import { CardView } from './CardView';

interface GameBoardProps {
  state: GameState;
  playerId: string;
  sendAction: (type: string, payload?: any) => void;
}

const PAIN_DOT_COLOR: Record<CardColor, string> = {
  Red: 'bg-red-500 shadow-red-500/50',
  Yellow: 'bg-yellow-400 shadow-yellow-400/50',
  Green: 'bg-emerald-500 shadow-emerald-500/50',
  Blue: 'bg-blue-500 shadow-blue-500/50',
  Purple: 'bg-purple-500 shadow-purple-500/50',
  Gray: 'bg-slate-400 shadow-slate-400/50',
};

const CARD_DIM_CLASS: Record<CardColor, string> = {
  Red: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
  Yellow: 'shadow-[0_0_8px_rgba(250,204,21,0.6)]',
  Green: 'shadow-[0_0_8px_rgba(16,185,129,0.6)]',
  Blue: 'shadow-[0_0_8px_rgba(59,130,246,0.6)]',
  Purple: 'shadow-[0_0_8px_rgba(168,85,247,0.6)]',
  Gray: 'shadow-[0_0_8px_rgba(148,163,184,0.6)]',
};

export function GameBoard({ state, playerId, sendAction }: GameBoardProps) {
  const me = state.players.find(p => p.id === playerId);
  const myIndex = state.players.findIndex(p => p.id === playerId);
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);
  const [animCards, setAnimCards] = useState<Record<string, { anim: string }>>({});
  const [prevTrickLen, setPrevTrickLen] = useState(0);
  const [justResolved, setJustResolved] = useState(false);
  const [selectedForPain, setSelectedForPain] = useState<string | null>(null);
  const [showWonPiles, setShowWonPiles] = useState<string | null>(null);
  const [scoreFlashKeys, setScoreFlashKeys] = useState<Record<string, string>>({});
  const scorePrevRef = useRef<Record<string, number>>({});
  const autoAdvanceRef = useRef<number | null>(null);

  if (!me) return <div className="flex items-center justify-center h-screen text-gray-400">Spectating...</div>;

  const isMyTurn = state.currentPlayerIndex === myIndex && state.status === 'playing_trick';
  const myPainColor = me!.chosenPainCard?.color ?? null;

  // Which cards match lead suit (visual hint only, never a restriction)
  const getLeadHintCards = useCallback(() => {
    if (state.status !== 'playing_trick' || !me || state.leadColor === null) return new Set<string>();
    return new Set(me.hand.filter(c => c.color === state.leadColor).map(c => c.id));
  }, [state.status, state.leadColor, me]);

  const leadHintCards = getLeadHintCards();

  // Animate newly played cards
  useEffect(() => {
    const trick = state.currentTrick;
    if (trick.length !== prevTrickLen) {
      if (trick.length > prevTrickLen) {
        const newCard = trick[trick.length - 1];
        setAnimCards(prev => ({ ...prev, [newCard.playerId]: { anim: 'deal-in' } }));
        setTimeout(() => {
          setAnimCards(prev => { const next = {...prev}; delete next[newCard.playerId]; return next; });
        }, 400);
      }
      setPrevTrickLen(trick.length);

      if (trick.length === state.players.length) {
        setJustResolved(true);
        trick.forEach(tc => {
          setAnimCards(prev => ({ ...prev, [tc.playerId]: { anim: 'collect' } }));
        });
        setAutoAdvanceTimer(Date.now());
        autoAdvanceRef.current = window.setTimeout(() => {
          sendAction('clear_trick');
        }, 3000);
      }
    }
  }, [state.currentTrick.length, state.players.length]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Clear auto-advance timer when trick changes
  useEffect(() => {
    if (state.currentTrick.length === 0 && autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      setAutoAdvanceTimer(null);
    }
  }, [state.currentTrick.length]);

  const handleClearTrick = () => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setAutoAdvanceTimer(null);
    sendAction('clear_trick');
  };

  const handleCardClick = (cardId: string) => {
    if (state.status === 'selecting_pain') {
      setSelectedForPain(cardId);
      sendAction('select_pain', { cardId });
      setTimeout(() => setSelectedForPain(null), 400);
    }
    else if (state.status === 'playing_trick' && isMyTurn) sendAction('play_card', { cardId });
  };

  const getPainDot = (painColor: CardColor | undefined | null, size = 'w-3 h-3') => {
    if (!painColor) return null;
    return (
      <span
        className={`inline-block ${size} rounded-full ${PAIN_DOT_COLOR[painColor]} shadow-sm`}
        title={`Pain: ${painColor}`}
      />
    );
  };

  const renderOtherPlayers = () => {
    const others = [];
    for (let i = 1; i < state.players.length; i++) others.push(state.players[(myIndex + i) % state.players.length]);

    return (
      <div className="flex justify-center space-x-3 mb-6 flex-wrap">
        {others.map((p) => {
            const isThinking = state.currentPlayerIndex === state.players.findIndex(x => x.id === p.id) && state.status === 'playing_trick';
            return (
                <div key={p.id} className={`flex flex-col items-center px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                    isThinking
                        ? 'bg-yellow-500/20 ring-2 ring-yellow-400/50 scale-105'
                        : 'bg-white/5'
                }`}>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.name}</span>
                        {getPainDot(p.chosenPainCard?.color, 'w-2.5 h-2.5')}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>Score: <span className="text-white font-mono">{state.scores[p.id]}</span></span>
                        <span>Cards: <span className="text-white font-mono">{p.hand.length}</span></span>
                        {p.wonCards.length > 0 && (
                            <button
                              className="relative w-5 h-3 bg-white/10 rounded border border-white/20 hover:bg-white/20 transition-colors"
                              onClick={() => setShowWonPiles(showWonPiles === p.id ? null : p.id)}
                              title={`${p.wonCards.length} won cards`}
                            >
                              <span className="absolute -top-1 -right-1 text-[8px] bg-white/20 rounded-full w-3 h-3 flex items-center justify-center">{p.wonCards.length}</span>
                            </button>
                        )}
                    </div>
                </div>
            );
        })}
      </div>
    );
  };

  const renderWonPilePopup = () => {
    if (!showWonPiles) return null;
    const player = state.players.find(p => p.id === showWonPiles);
    if (!player || player.wonCards.length === 0) return null;
    const painColor = player.chosenPainCard?.color;
    return (
      <div className="fixed inset-x-0 bottom-24 z-40 mx-auto w-max max-w-2xl px-4">
        <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl p-4 shadow-2xl anim-fade-in-up">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-sm">{player.name}'s won cards ({player.wonCards.length})</span>
            <button onClick={() => setShowWonPiles(null)} className="text-gray-400 hover:text-white text-sm">&times;</button>
          </div>
          <div className="flex overflow-x-auto gap-1 custom-scrollbar">
            {player.wonCards.map((card) => {
              const isPain = card.color === painColor;
              return (
                <div key={card.id} className={`relative flex-shrink-0 ${isPain ? 'ring-2 ring-red-500/60 rounded-lg' : ''}`}>
                  <CardView card={card} small disabled />
                  {isPain && <div className="absolute -top-1 -right-1 text-[8px] bg-red-500 rounded-full w-3 h-3 flex items-center justify-center">!</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTrick = () => {
    if (state.status !== 'playing_trick') return null;
    // Countdown for auto-advance
    const timeLeft = autoAdvanceTimer ? Math.max(0, 3 - Math.floor((Date.now() - autoAdvanceTimer) / 1000)) : null;

    return (
      <div className="flex flex-col items-center justify-center my-4 min-h-[180px]">
        {state.leadColor && (
            <div className="mb-3 px-3 py-1 rounded-full bg-white/10 text-sm font-medium backdrop-blur-sm">
              Lead: {state.leadColor}
            </div>
        )}
        <div className="flex space-x-3">
            {state.currentTrick.map(tc => {
                const pName = state.players.find(p => p.id === tc.playerId)?.name;
                const pIdx = state.players.findIndex(p => p.id === tc.playerId);
                const isWinner = state.trickWinnerIndex === pIdx;
                const animState = animCards[tc.playerId];

                return (
                    <div key={tc.playerId} className={`flex flex-col items-center ${
                      isWinner && justResolved ? 'anim-winner-glow' : ''
                    }`}>
                        <span className="text-xs mb-2 truncate w-20 text-center text-gray-300">{pName}</span>
                        <div className={animState?.anim === 'deal-in' ? 'anim-deal-in' : animState?.anim === 'collect' ? 'anim-collect' : ''}
                             style={animState?.anim === 'collect' ? { transitionDelay: `${pIdx * 0.08}s` } : undefined}>
                          <CardView card={tc.card} disabled />
                        </div>
                        {isWinner && !justResolved && <div className="mt-2 text-xs text-green-400 font-bold anim-fade-in-up">Winner</div>}
                    </div>
                )
            })}
        </div>
        {state.currentTrick.length === state.players.length && (
          <div className="mt-6 flex flex-col items-center gap-1 anim-fade-in-up">
            {timeLeft !== null && timeLeft > 0 && !justResolved && (
              <span className="text-xs text-gray-500">Auto-advancing in {timeLeft}s...</span>
            )}
            <button onClick={handleClearTrick} className={`${
              justResolved ? 'hidden' : ''
            } bg-white/15 hover:bg-white/25 text-white px-6 py-2 rounded-lg font-medium transition-all backdrop-blur-sm border border-white/20`}>
              Next Trick →
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderEndRound = () => {
      if (state.status !== 'round_over' && state.status !== 'game_over') return null;
      const sorted = [...state.players].sort((a,b) => state.scores[b.id] - state.scores[a.id]);

      return (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-slate-900 border border-white/10 p-6 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                  <h2 className="text-2xl font-bold mb-4 text-center">
                      {state.status === 'game_over' ? '🏆 Game Over' : 'Round Complete'}
                  </h2>

      <div className="space-y-3 mb-6">
          {sorted.map((p, idx) => {
              const bd = state.roundBreakdown?.[p.id];
              const expanded = expandedBreakdown === p.id;

              return (
                  <div key={`${p.id}-round-${state.roundNumber}`} className={`rounded-lg overflow-hidden transition-all anim-fade-in-up ${
                      idx === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5'
                  }`} style={{ animationDelay: `${idx * 0.08}s` }}>
                      <div
                          className="flex justify-between items-center px-4 py-3 cursor-pointer select-none hover:bg-white/5"
                          onClick={() => setExpandedBreakdown(bd ? (expanded ? null : p.id) : null)}
                      >
                          <div className="flex items-center gap-2">
                              <span className="text-lg">{idx === 0 ? '👑' : `#${idx + 1}`}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{p.name}</span>
                                {getPainDot(p.chosenPainCard?.color, 'w-2 h-2')}
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              {bd && (
                                  <div className="text-right flex flex-col items-end gap-0.5">
                                      <div className={`text-xs font-mono ${bd.roundScore > 0 ? 'text-green-400' : bd.roundScore < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                          {bd.roundScore > 0 ? '+' : ''}{bd.roundScore}
                                      </div>
                                      <div className="text-[10px] text-gray-500 flex gap-2">
                                        <span className="text-red-400">{bd.painCardPenalty > 0 ? '+' : ''}{bd.painCardPenalty}</span>
                                        <span className="text-green-400">+{bd.wonGoodCards}</span>
                                        {bd.wonPainPenalty !== 0 && <span className="text-red-400">{bd.wonPainPenalty}</span>}
                                      </div>
                                  </div>
                              )}
                              <div className={`text-xl font-mono font-bold min-w-[3rem] text-right ${
                                  bd
                                    ? (bd.roundScore > 0 ? 'anim-score-up' : bd.roundScore < 0 ? 'anim-score-down' : '')
                                    : ''
                              }`}>
                                  {state.scores[p.id]}
                              </div>
                              {bd && (
                                  <span className="text-xs text-gray-500">{expanded ? '▾' : '▸'}</span>
                              )}
                          </div>
                      </div>

                          {expanded && bd && (
                                      <div className="px-4 pb-3 border-t border-white/5">
                                          <table className="w-full text-xs mt-2">
                                              <thead>
                                                  <tr className="text-gray-500">
                                                      <th className="text-left font-normal py-1">Card</th>
                                                      <th className="text-right font-normal py-1">Pts</th>
                                                  </tr>
                                              </thead>
                                              <tbody>
                                                  {bd.details.map((d, i) => {
                                                      const isBad = d.value < 0;
                                                      return (
                                                          <tr key={i} className={`anim-fade-in-up ${isBad ? 'text-red-400' : d.value > 0 ? 'text-green-400' : 'text-gray-400'}`} style={{ animationDelay: `${i * 0.04}s` }}>
                                                              <td className="py-1 font-mono">{d.label}</td>
                                                              <td className="text-right py-1 font-mono font-bold">{d.value > 0 ? '+' : ''}{d.value}</td>
                                                          </tr>
                                                      );
                                                  })}
                                              </tbody>
                                          </table>
                                          <div className="border-t border-white/10 mt-2 pt-2 flex justify-between text-sm font-bold">
                                              <span>Round total</span>
                                              <span className={bd.roundScore > 0 ? 'text-green-400' : bd.roundScore < 0 ? 'text-red-400' : 'text-gray-400'}>
                                                  {bd.roundScore > 0 ? '+' : ''}{bd.roundScore}
                                              </span>
                                          </div>
                                      </div>
                          )}
                      </div>
                  );
              })}
          </div>
          {state.status === 'round_over' && state.players[0].id === playerId && (
                      <button onClick={() => sendAction('next_round')} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold transition-colors">
                          Next Round →
                      </button>
                  )}
              </div>
          </div>
      )
  };

  // Card rendering helpers for hand
  const isPainCard = (color: CardColor | undefined) => {
    return color === myPainColor;
  };

  const renderHand = () => {
    if (!me) return null;

    return (
      <div className="flex overflow-x-auto space-x-[-1.5rem] sm:space-x-[-1rem] py-4 px-4 custom-scrollbar">
        {me.hand.map((card) => {
          const isPainSuit = isPainCard(card.color);
          const matchesLead = leadHintCards.has(card.id);

          return (
            <div key={card.id}
              className={`relative transition-all duration-200 ${
                selectedForPain === card.id ? 'opacity-50 scale-90' :
                'hover:z-10 hover:-translate-y-4'
              }`}
            >
              <CardView
                card={card}
                onClick={() => handleCardClick(card.id)}
                selected={selectedForPain === card.id}
                disabled={
                  (state.status === 'selecting_pain' && me.chosenPainCard !== null) ||
                  (state.status === 'playing_trick' && (!isMyTurn || state.currentTrick.length === state.players.length))
                }
                glow={isPainSuit ? CARD_DIM_CLASS[card.color] : undefined}
              />
              {matchesLead && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/60" />}
              {isPainSuit && state.status === 'playing_trick' && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500/80 shadow" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-green-900 text-white p-4 overflow-hidden relative">
      <div className="text-center mb-4 font-mono text-sm tracking-wider text-green-300/70">
        Round {state.roundNumber} of {state.players.length}
      </div>

      {/* Center area */}
      <div className="flex-grow flex items-center justify-center">
        {state.status === 'selecting_pain' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-xl font-bold text-center bg-black/50 p-6 rounded-lg border border-white/10 backdrop-blur-sm anim-fade-in-up">
              {me.chosenPainCard ? "Waiting for others..." : "Select your Pain Color!"}
            </div>
            {myPainColor && (
              <div className="flex items-center gap-2 text-sm text-gray-400 anim-fade-in-up">
                <span>Your pain:</span>
                {getPainDot(myPainColor, 'w-4 h-4')}
                <span className="font-medium text-white">{myPainColor}</span>
              </div>
            )}
          </div>
        ) : state.status === 'playing_trick' ? renderTrick() : null}
      </div>

      {/* Bottom hand area */}
      <div className="mt-auto pt-4 border-t border-white/10 bg-black/20 backdrop-blur-sm -mx-4 px-4 pb-4">
        <div className="flex justify-between items-end mb-4">
            <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{me.name} (You)</span>
                  {myPainColor && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      {getPainDot(myPainColor, 'w-2.5 h-2.5')}
                      <span>Pain: {myPainColor}</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-400">Score: {state.scores[me.id]}</div>
            </div>
        </div>
        {renderHand()}
      </div>

      {/* Other players on the right side */}
      {renderOtherPlayers()}
      {renderWonPilePopup()}
      {renderEndRound()}
    </div>
  );
}
