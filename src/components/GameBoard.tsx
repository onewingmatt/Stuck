import { useState, useEffect, useRef, useCallback } from 'react';
import { type GameState, type CardColor } from '../game/models.js';
import { CardView } from './CardView';
import { soundManager } from '../game/soundManager';

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
  Orange: 'bg-orange-500 shadow-orange-500/50',
  Pink: 'bg-pink-500 shadow-pink-500/50',
};

const CARD_DIM_CLASS: Record<CardColor, string> = {
  Red: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
  Yellow: 'shadow-[0_0_8px_rgba(250,204,21,0.6)]',
  Green: 'shadow-[0_0_8px_rgba(16,185,129,0.6)]',
  Blue: 'shadow-[0_0_8px_rgba(59,130,246,0.6)]',
  Purple: 'shadow-[0_0_8px_rgba(168,85,247,0.6)]',
  Gray: 'shadow-[0_0_8px_rgba(148,163,184,0.6)]',
  Orange: 'shadow-[0_0_8px_rgba(249,115,22,0.6)]',
  Pink: 'shadow-[0_0_8px_rgba(236,72,153,0.6)]',
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
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);

  if (!me) return <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400">Spectating...</div>;

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
        soundManager.play('trick_resolve');
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

  useEffect(() => {
    if (state.status === 'round_over' || state.status === 'game_over') {
      soundManager.play('round_over');
    }
  }, [state.status]);

  // Clear auto-advance timer when trick changes
  useEffect(() => {
    if (state.currentTrick.length === 0 && autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      setAutoAdvanceTimer(null);
    }
  }, [state.currentTrick.length]);

  const handleClearTrick = () => {
    soundManager.play('click');
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setAutoAdvanceTimer(null);
    sendAction('clear_trick');
  };

  const handleCardClick = (cardId: string) => {
    if (state.status === 'selecting_pain') {
      soundManager.play('card_play');
      setSelectedForPain(cardId);
      sendAction('select_pain', { cardId });
      setTimeout(() => setSelectedForPain(null), 400);
    }
    else if (state.status === 'playing_trick' && isMyTurn) {
      soundManager.play('card_play');
      sendAction('play_card', { cardId });
    }
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
      <div className="flex justify-center flex-wrap gap-4 mb-8 px-3">
        {others.map((p) => {
            const isThinking = state.currentPlayerIndex === state.players.findIndex(x => x.id === p.id) && state.status === 'playing_trick';
            return (
                <div key={p.id} className={`flex flex-col items-center rounded-2xl border px-4 py-3 text-sm shadow-lg transition-all duration-300 ${
                    isThinking
                        ? 'border-yellow-300/40 bg-yellow-500/20 ring-2 ring-yellow-400/40 scale-105'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.name}</span>
                        {state.status !== 'selecting_pain' && getPainDot(p.chosenPainCard?.color, 'w-2.5 h-2.5')}
                    </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400/90">
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
      <div className="fixed inset-x-0 bottom-24 z-40 mx-auto w-max max-w-2xl px-4 animate-[fadeInUp_0.25s_ease-out]">
        
        <div className="rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl anim-fade-in-up">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-sm">{player.name}'s won cards ({player.wonCards.length})</span>
              <button onClick={() => setShowWonPiles(null)} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-white/10 hover:text-white">&times;</button>
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
      <div className="flex min-h-[200px] flex-col items-center justify-center my-4">
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
            } rounded-xl border border-white/15 bg-white/10 px-6 py-2 font-medium text-white shadow-lg shadow-black/20 backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-black/30 active:scale-[0.98]`}>
              Next Trick →
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderEndRound = () => {
    if (state.status !== 'round_over' && state.status !== 'game_over') return null;
    const sorted = [...state.players].sort((a, b) => state.scores[b.id] - state.scores[a.id]);

    return (
      <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm px-3 py-3 sm:p-4">
        <div className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
          <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5 bg-slate-900/80">
            <h2 className="text-center text-xl sm:text-2xl font-bold text-white">
              {state.status === 'game_over' ? '🏆 Game Over' : 'Round Complete'}
            </h2>
            <p className="mt-1 text-center text-xs sm:text-sm text-slate-400">
              Tap a player to expand their round breakdown.
            </p>
          </div>

          <div className="max-h-[calc(92vh-140px)] overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
              {sorted.map((p, idx) => {
                const bd = state.roundBreakdown?.[p.id];
                const expanded = expandedBreakdown === p.id;
                const roundClass = bd
                  ? bd.roundScore > 0
                    ? 'text-emerald-300'
                    : bd.roundScore < 0
                      ? 'text-rose-300'
                      : 'text-slate-300'
                  : 'text-slate-300';

                return (
                  <div
                    key={`${p.id}-round-${state.roundNumber}`}
                    className={`overflow-hidden rounded-xl border transition-all duration-200 ${
                      idx === 0
                        ? 'border-amber-400/30 bg-amber-400/10'
                        : 'border-white/10 bg-white/5'
                    } ${expanded ? 'ring-1 ring-white/20' : ''}`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left active:bg-white/5 sm:px-5"
                      onClick={() => setExpandedBreakdown(bd ? (expanded ? null : p.id) : null)}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/20 text-sm font-semibold text-white">
                          {idx === 0 ? '👑' : idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate font-semibold text-sm sm:text-base text-white">{p.name}</span>
                            {state.status !== 'selecting_pain' && getPainDot(p.chosenPainCard?.color, 'w-2 h-2')}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-400">
                            <span>Round</span>
                            <span className={`font-mono font-semibold ${roundClass}`}>
                              {bd?.roundScore != null && bd.roundScore > 0 ? '+' : ''}{bd?.roundScore ?? 0}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">Total</span>
                            <span className="font-mono font-semibold text-white">{state.scores[p.id]}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        {bd && (
                          <div className="hidden text-right sm:block">
                            <div className={`text-sm font-mono font-semibold ${roundClass}`}>
                              {bd.roundScore > 0 ? '+' : ''}{bd.roundScore}
                            </div>
                            <div className="mt-0.5 flex gap-2 text-[11px] text-slate-400">
                              <span className="text-rose-300">{bd.painCardPenalty > 0 ? '+' : ''}{bd.painCardPenalty}</span>
                              <span className="text-emerald-300">+{bd.wonGoodCards}</span>
                              {bd.wonPainPenalty !== 0 && <span className="text-rose-300">{bd.wonPainPenalty}</span>}
                            </div>
                          </div>
                        )}
                        {bd && <span className="text-sm text-slate-400">{expanded ? '▾' : '▸'}</span>}
                      </div>
                    </button>

                    {expanded && bd && (
                      <div className="border-t border-white/10 px-4 pb-4 pt-3 sm:px-5">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {bd.details.map((d, i) => {
                            const isBad = d.value < 0;
                            const isZero = d.value === 0;
                            return (
                              <div
                                key={`${p.id}-${i}`}
                                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs sm:text-sm ${
                                  isBad
                                    ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                                    : isZero
                                      ? 'border-slate-600/40 bg-slate-800/70 text-slate-300'
                                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                                }`}
                              >
                                <span className="min-w-0 pr-3 font-mono leading-snug">{d.label}</span>
                                <span className="shrink-0 font-mono font-semibold">
                                  {d.value > 0 ? '+' : ''}{d.value}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm font-semibold text-white sm:px-4">
                          <span>Round total</span>
                          <span className={roundClass}>
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
              <div className="px-0 pb-1 sm:pb-0">
                <button
                  onClick={() => sendAction('next_round')}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-base font-bold text-white shadow-lg shadow-emerald-950/30 transition-colors hover:bg-emerald-500 active:bg-emerald-700"
                >
                  Next Round →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Card rendering helpers for hand
  const isPainCard = (color: CardColor | undefined) => {
    return color === myPainColor;
  };

  const renderHand = () => {
    if (!me) return null;

    return (
      <div className="flex overflow-x-auto space-x-[-1.5rem] sm:space-x-[-1rem] px-4 py-8 pb-4 custom-scrollbar" >
        {me.hand.map((card) => {
          const isPainSuit = isPainCard(card.color);
          const matchesLead = leadHintCards.has(card.id);

          return (
            <div key={card.id}
              className={`relative transition-all duration-200 ${
                selectedForPain === card.id ? 'opacity-50 scale-90' :
                'hover:z-10 hover:-translate-y-2'
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
              {matchesLead && <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/60" />}
              {isPainSuit && state.status === 'playing_trick' && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500/80 shadow" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
      <div className="flex flex-col h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.16),_transparent_30%),linear-gradient(180deg,#0f172a_0%,#1e293b_45%,#022c22_100%)] text-white p-4 overflow-hidden relative">
      <div className="text-center mb-4 font-mono text-sm tracking-wider text-green-300/70">
        Round {state.roundNumber} of {state.players.length}
      </div>

      {/* Center area */}
      <div className="flex-grow flex items-center justify-center">
        {state.status === 'selecting_pain' ? (
          <div className="flex flex-col items-center gap-4 animate-[fadeInUp_0.28s_ease-out]">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-xl font-bold backdrop-blur-xl shadow-2xl shadow-black/25 anim-fade-in-up">
              {me.chosenPainCard ? "Waiting for others..." : "Select your Pain Color!"}
            </div>
            {myPainColor && (
            <div className="flex items-center gap-2 text-sm text-slate-400 animate-[fadeInUp_0.28s_ease-out]">
                <span>Your pain:</span>
                {getPainDot(myPainColor, 'w-4 h-4')}
                <span className="font-medium text-white">{myPainColor}</span>
              </div>
            )}
          </div>
        ) : state.status === 'playing_trick' ? renderTrick() : null}
      </div>

      {/* Bottom hand area */}
      <div className="mt-auto -mx-4 border-t border-white/10 bg-black/20 px-4 pb-4 pt-4 backdrop-blur-sm">
        <div className="mb-4 flex items-end justify-between gap-4">
            <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-wide">{me.name} (You)</span>
                  {myPainColor && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      {getPainDot(myPainColor, 'w-2.5 h-2.5')}
                      <span>Pain: {myPainColor}</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-slate-400">Score: {state.scores[me.id]}</div>
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
