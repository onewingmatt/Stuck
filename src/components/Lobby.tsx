import { useState } from 'react';
import { type GameState } from '../game/models.js';
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
  const [openPainCards, setOpenPainCards] = useState(false);

  if (!roomId || !state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <h1 className="text-5xl font-bold mb-8 tracking-tight">Stick 'Em</h1>
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10 w-80 mb-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">Profile</h2>
            {editingName ? (
                <div className="flex space-x-2">
                    <input className="bg-white/10 border border-white/20 p-2 rounded-lg w-full text-white placeholder-gray-500 outline-none focus:border-white/40" value={tempName} onChange={e => setTempName(e.target.value)} />
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg transition-colors" onClick={() => { changeName(tempName); setEditingName(false); }}>Save</button>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <span className="font-medium">{playerName}</span>
                    <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors" onClick={() => setEditingName(true)}>Edit</button>
                </div>
            )}
        </div>
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10 w-80 space-y-4">
          <button onClick={createRoom} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-semibold transition-colors">Create New Game</button>
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/10"></div><span className="flex-shrink-0 mx-4 text-gray-500">or</span><div className="flex-grow border-t border-white/10"></div>
          </div>
          <div className="flex space-x-2">
            <input type="text" placeholder="Room Code" className="bg-white/10 border border-white/20 p-2 rounded-lg flex-grow text-white placeholder-gray-500 outline-none focus:border-white/40 uppercase" value={joinId} onChange={(e) => setJoinId(e.target.value.toUpperCase())} />
            <button onClick={() => joinRoom(joinId)} className="bg-white/15 hover:bg-white/25 border border-white/20 px-4 py-2 rounded-lg font-semibold transition-colors">Join</button>
          </div>
        </div>
      </div>
    );
  }

  const isHost = state.players.length > 0 && state.players[0].id === playerId;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4">
      <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-8 rounded-xl max-w-md w-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Room: {roomId}</h2>
          <button onClick={() => navigator.clipboard?.writeText(roomId)} className="text-xs text-gray-400 hover:text-white transition-colors" title="Copy room code">Copy</button>
        </div>
        <p className="text-sm text-gray-400 mb-6">Share this code or URL with friends to join.</p>
        <h3 className="text-lg font-semibold mb-2 text-gray-300">Players ({state.players.length}/6)</h3>
        <ul className="space-y-2 mb-6">
          {state.players.map(p => (
            <li key={p.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
              <span className="font-medium">{p.name} {p.id === playerId ? <span className="text-green-400">(You)</span> : ''}</span>
              <span className={`text-xs ${p.connected ? 'text-green-400' : 'text-red-400'}`}>
                {p.isBot ? `Bot — ${p.botConfig?.archetype}` : (p.connected ? 'Online' : 'Offline')}
              </span>
            </li>
          ))}
        </ul>
        {isHost && (
          <div className="mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={openPainCards}
                onChange={() => setOpenPainCards(!openPainCards)}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm text-gray-300">Open Pain Cards</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">Only your chosen pain card scores against you, not other cards you win in that suit.</p>
          </div>
        )}
        {isHost && state.players.length < 6 && (
          <div className="mb-6 flex space-x-2">
            <select id="bot-type" className="bg-white/10 border border-white/20 p-2 rounded-lg flex-grow text-white outline-none">
              {Object.keys(BOT_ARCHETYPES).map(arch => <option key={arch} value={arch} className="bg-slate-800">{arch} Bot</option>)}
            </select>
            <button 
              onClick={() => { const select = document.getElementById('bot-type') as HTMLSelectElement; sendAction('add_bot', { archetype: select.value }); }}
              className="bg-white/15 hover:bg-white/25 border border-white/20 px-4 py-2 rounded-lg text-sm transition-colors"
            >Add Bot</button>
          </div>
        )}
        {isHost ? (
          <button onClick={() => sendAction('start_game', { openPainCards })} disabled={state.players.length < 3} className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${state.players.length >= 3 ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 cursor-not-allowed'}`}>
            Start Game
          </button>
        ) : (
          <div className="text-center p-4 bg-white/5 rounded-lg text-gray-400">Waiting for host to start...</div>
        )}
      </div>
    </div>
  );
}
