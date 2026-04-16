import { useGameClient } from './hooks/useGameClient';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { useEffect } from 'react';

function App() {
  const { state, playerId, roomId, playerName, setRoomId, sendAction, changeName } = useGameClient();

  useEffect(() => {
    document.title = roomId ? `Stuck - ${roomId}` : 'Stuck';
  }, [roomId]);

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
      <Lobby 
        state={state!} playerId={playerId} roomId={roomId} playerName={playerName}
        changeName={changeName} sendAction={sendAction} createRoom={handleCreateRoom} joinRoom={handleJoinRoom}
      />
    );
  }

  return <GameBoard state={state} playerId={playerId} sendAction={sendAction} />;
}

export default App;
