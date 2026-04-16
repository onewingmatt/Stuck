import { GameState } from '../game/models.js';
import { CardView } from './CardView';

interface GameBoardProps {
  state: GameState;
  playerId: string;
  sendAction: (type: string, payload?: any) => void;
}

export function GameBoard({ state, playerId, sendAction }: GameBoardProps) {
  const me = state.players.find(p => p.id === playerId);
  if (!me) return <div>Spectating...</div>;

  const isMyTurn = state.currentPlayerIndex === state.players.findIndex(p => p.id === playerId) && state.status === 'playing_trick';

  const handleCardClick = (cardId: string) => {
    if (state.status === 'selecting_pain') sendAction('select_pain', { cardId });
    else if (state.status === 'playing_trick' && isMyTurn) sendAction('play_card', { cardId });
  };

  const renderOtherPlayers = () => {
    const myIndex = state.players.findIndex(p => p.id === playerId);
    const others = [];
    for (let i = 1; i < state.players.length; i++) others.push(state.players[(myIndex + i) % state.players.length]);

    return (
      <div className="flex justify-center space-x-4 mb-8 flex-wrap">
        {others.map((p) => (
          <div key={p.id} className={`flex flex-col items-center p-2 rounded ${state.currentPlayerIndex === state.players.findIndex(x => x.id === p.id) && state.status === 'playing_trick' ? 'bg-yellow-100 border-2 border-yellow-400' : ''}`}>
            <span className="font-semibold text-sm">{p.name}</span>
            <span className="text-xs text-gray-500">Score: {state.scores[p.id]}</span>
            <span className="text-xs text-gray-500">Cards: {p.hand.length}</span>
            {p.chosenPainCard && (
                <div className="mt-2 text-center">
                    <span className="text-xs font-bold text-red-500">Pain</span>
                    <CardView card={p.chosenPainCard} small disabled />
                </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTrick = () => {
    if (state.status !== 'playing_trick') return null;
    return (
      <div className="flex flex-col items-center justify-center my-8 min-h-[160px]">
        {state.leadColor && <div className="text-sm font-bold text-gray-500 mb-2">Lead: {state.leadColor}</div>}
        <div className="flex space-x-2">
            {state.currentTrick.map(tc => {
                const pName = state.players.find(p => p.id === tc.playerId)?.name;
                return (
                    <div key={tc.playerId} className="flex flex-col items-center">
                        <span className="text-xs mb-1 truncate w-16 text-center">{pName}</span>
                        <CardView card={tc.card} disabled />
                    </div>
                )
            })}
        </div>
        {state.currentTrick.length === state.players.length && (
            <button onClick={() => sendAction('clear_trick')} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Next Trick</button>
        )}
      </div>
    );
  };

  const renderEndRound = () => {
      if (state.status !== 'round_over' && state.status !== 'game_over') return null;
      return (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
                  <h2 className="text-2xl font-bold mb-4">{state.status === 'game_over' ? 'Game Over' : 'Round Over'}</h2>
                  <div className="space-y-4 mb-6">
                      {state.players.slice().sort((a,b) => state.scores[b.id] - state.scores[a.id]).map(p => (
                          <div key={p.id} className="flex justify-between items-center border-b pb-2">
                              <div>
                                  <div className="font-bold">{p.name}</div>
                                  <div className="text-sm text-gray-600">Round Score: {p.score}</div>
                              </div>
                              <div className="text-xl font-bold">Total: {state.scores[p.id]}</div>
                          </div>
                      ))}
                  </div>
                  {state.status === 'round_over' && state.players[0].id === playerId && (
                      <button onClick={() => sendAction('next_round')} className="w-full bg-green-500 text-white py-3 rounded font-bold">Start Next Round</button>
                  )}
              </div>
          </div>
      )
  };

  return (
    <div className="flex flex-col h-screen bg-green-800 text-white p-4 overflow-hidden relative">
      <div className="text-center mb-2">Round {state.roundNumber} / {state.players.length}</div>
      {renderOtherPlayers()}
      <div className="flex-grow flex items-center justify-center">
        {state.status === 'selecting_pain' ? (
          <div className="text-xl font-bold animate-pulse text-center bg-black/50 p-4 rounded">
            {me.chosenPainCard ? "Waiting for others..." : "Select your Pain Color!"}
          </div>
        ) : renderTrick()}
      </div>
      <div className="mt-auto pt-4 border-t border-green-700 bg-green-900/50 -mx-4 px-4 pb-4">
        <div className="flex justify-between items-end mb-4">
            <div>
                <div className="font-bold">{me.name} (You)</div>
                <div className="text-sm">Score: {state.scores[me.id]}</div>
            </div>
            {me.chosenPainCard && (
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-red-300">Pain Card</span>
                    <CardView card={me.chosenPainCard} small disabled />
                </div>
            )}
        </div>
        <div className="flex overflow-x-auto space-x-[-1.5rem] sm:space-x-[-1rem] py-4 px-4 custom-scrollbar">
          {me.hand.map((card) => (
            <div key={card.id} className="relative transition-transform hover:z-10 hover:-translate-y-4">
                <CardView 
                    card={card} onClick={() => handleCardClick(card.id)}
                    disabled={(state.status === 'selecting_pain' && me.chosenPainCard !== null) || (state.status === 'playing_trick' && !isMyTurn) || (state.status === 'playing_trick' && state.currentTrick.length === state.players.length)}
                />
            </div>
          ))}
        </div>
      </div>
      {renderEndRound()}
    </div>
  );
}
