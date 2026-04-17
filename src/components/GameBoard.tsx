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

                // Determine pain level for the winner if this card is their pain color
                let painAnim = '';
                if (isWinner && justResolved) {
                    const winner = state.players[state.trickWinnerIndex!];
                    if (tc.card.color === winner.chosenPainCard?.color) {
                        if (tc.card.value >= 10) painAnim = ' anim-pain-severe';
                        else if (tc.card.value >= 5) painAnim = ' anim-pain-moderate';
                    }
                }

                return (
                    <div key={tc.playerId} className={`flex flex-col items-center ${isWinner && justResolved ? 'anim-winner-glow' : ''} ${painAnim}`}>
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