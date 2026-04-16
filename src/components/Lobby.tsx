import { useState } from 'react';
import { GameState } from '../game/models.js';
import { BOT_ARCHETYPES } from '../game/ai.js';

interface LobbyProps {
  state: GameState;
  playerId: string;
  roomId: string;
  playerName: string;
  changeName: (name: string) => void;
  sendAction: (type: string, payload?: any) => void;
  createRoom: () => void;
  joinRoom: (id: string) => void;
}

export function Lobby({ state, playerId, roomId, playerName, changeName, sendAction, createRoom, joinRoom }: LobbyProps) {
  const [joinId, setJoinId] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);

  if (!roomId || !state) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-4xl font-bold mb-8">Stick 'Em</h1>
        <div className="bg-white p-6 rounded-lg shadow-md w-80 mb-4">
            <h2 className="text-xl font-semibold mb-4">Profile</h2>
            {editingName ? (
                <div className="flex space-x-2">
                    <input className="border p-2 rounded w-full" value={tempName} onChange={e => setTempName(e.target.value)} />
                    <button className="bg-blue-500 text-white px-3 rounded" onClick={() => { changeName(tempName); setEditingName(false); }}>Save</button>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <span>{playerName}</span>
                    <button className="text-blue-500 text-sm" onClick={() => setEditingName(true)}>Edit</button>
                </div>
            )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md w-80 space-y-4">
          <button onClick={createRoom} className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">Create New Game</button>
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink-0 mx-4 text-gray-400">or</span><div className="flex-grow border-t border-gray-300"></div>
          </div>
          <div className="flex space-x-2">
            <input type="text" placeholder="Room Code" className="border p-2 rounded flex-grow" value={joinId} onChange={(e) => setJoinId(e.target.value.toUpperCase())} />
            <button onClick={() => joinRoom(joinId)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 font-semibold">Join</button>
          </div>
        </div>
      </div>
    );
  }

  const isHost = state.players.length > 0 && state.players[0].id === playerId;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-2">Room: {roomId}</h2>
        <p className="text-sm text-gray-500 mb-6">Share this code or URL with friends to join.</p>
        <h3 className="text-lg font-semibold mb-2">Players ({state.players.length}/6)</h3>
        <ul className="space-y-2 mb-6">
          {state.players.map(p => (
            <li key={p.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
              <span>{p.name} {p.id === playerId ? '(You)' : ''}</span>
              <span className="text-xs text-gray-500">{p.isBot ? p.botConfig?.archetype : (p.connected ? 'Online' : 'Offline')}</span>
            </li>
          ))}
        </ul>
        {isHost && state.players.length < 6 && (
          <div className="mb-6 flex space-x-2">
            <select id="bot-type" className="border p-2 rounded flex-grow">
              {Object.keys(BOT_ARCHETYPES).map(arch => <option key={arch} value={arch}>{arch} Bot</option>)}
            </select>
            <button 
              onClick={() => { const select = document.getElementById('bot-type') as HTMLSelectElement; sendAction('add_bot', { archetype: select.value }); }}
              className="bg-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-300"
            >Add Bot</button>
          </div>
        )}
        {isHost ? (
          <button onClick={() => sendAction('start_game')} disabled={state.players.length < 3} className={`w-full py-3 rounded font-bold text-white ${state.players.length >= 3 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}>
            Start Game
          </button>
        ) : (
          <div className="text-center p-4 bg-gray-50 rounded text-gray-600">Waiting for host to start...</div>
        )}
      </div>
    </div>
  );
}
