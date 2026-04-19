import { useEffect, useState, useRef } from 'react';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { useGameClient } from './hooks/useGameClient';

function App() {
  const { state, playerId, roomId, playerName, setRoomId, sendAction, changeName, leaveRoom, reconnecting, connectionNotice } = useGameClient();
  const [hostNotice, setHostNotice] = useState<string | null>(null);
  const prevHostRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = roomId ? `Stuck - ${roomId}` : 'Stuck';
  }, [roomId]);

  useEffect(() => {
    if (!state?.hostId) {
      prevHostRef.current = null;
      return;
    }
    if (prevHostRef.current && prevHostRef.current !== state.hostId) {
      const newHostName = state.players.find(p => p.id === state.hostId)?.name ?? 'another player';
      setHostNotice(`Host moved to ${newHostName}`);
      const timer = window.setTimeout(() => setHostNotice(null), 3000);
      prevHostRef.current = state.hostId;
      return () => window.clearTimeout(timer);
    }
    prevHostRef.current = state.hostId;
  }, [state?.hostId, state?.players]);

  const handleCreateRoom = () => {
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'online');
    url.searchParams.set('room', newRoom);
    window.history.pushState({}, '', url);
    setRoomId(newRoom);
  };

  const handleJoinRoom = (id: string) => {
    if (!id) return;
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'online');
    url.searchParams.set('room', id);
    window.history.pushState({}, '', url);
    setRoomId(id);
  };

  if (!state || state.status === 'waiting') {
    return (
      <>
        {(hostNotice || connectionNotice) && (
          <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col gap-2 px-4 pointer-events-none">
            {hostNotice && (
              <div className="pointer-events-auto rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 shadow-lg shadow-black/20 backdrop-blur-xl">
                {hostNotice}
              </div>
            )}
            {connectionNotice && (
              <div className="pointer-events-auto rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 shadow-lg shadow-black/20 backdrop-blur-xl">
                {connectionNotice}
              </div>
            )}
          </div>
        )}
        <Lobby 
          state={state!} playerId={playerId} roomId={roomId} playerName={playerName} reconnecting={reconnecting}
          changeName={changeName} sendAction={sendAction} createRoom={handleCreateRoom} joinRoom={handleJoinRoom}
          leaveRoom={leaveRoom}
        />
      </>
    );
  }

  return (
    <>
      {(hostNotice || connectionNotice) && (
        <div className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col gap-2 px-4 pointer-events-none">
          {hostNotice && (
            <div className="pointer-events-auto rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 shadow-lg shadow-black/20 backdrop-blur-xl">
              {hostNotice}
            </div>
          )}
          {connectionNotice && (
            <div className="pointer-events-auto rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 shadow-lg shadow-black/20 backdrop-blur-xl">
              {connectionNotice}
            </div>
          )}
        </div>
      )}
      <GameBoard state={state} playerId={playerId} sendAction={sendAction} leaveRoom={leaveRoom} reconnecting={reconnecting} />
    </>
  );
}

export default App;
