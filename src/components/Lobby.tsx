import { useState } from 'react';
import { type GameState } from '../game/models.js';
import { BOT_ARCHETYPES } from '../game/ai.js';
import { soundManager } from '../game/soundManager';

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

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

export function Lobby({ state, playerId, roomId, playerName, changeName, sendAction, createRoom, joinRoom }: LobbyProps) {
  const [joinId, setJoinId] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);
  const [openPainCards, setOpenPainCards] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [volume, setVolume] = useState(soundManager.getVolume());

  if (!roomId || !state) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.20),_transparent_40%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#020617_100%)] text-white px-4 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
          <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/8 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Classic card chaos, cleaned up
              </div>
              <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-6xl">Stick 'Em</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Create a room, share the code, and play a fast trick-taking game with a polished, low-friction lobby.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Players</div>
                  <div className="mt-2 text-2xl font-bold text-white">3–8</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Mode</div>
                  <div className="mt-2 text-2xl font-bold text-white">Pain cards</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Flow</div>
                  <div className="mt-2 text-2xl font-bold text-white">Quick rounds</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <SectionTitle title="Profile" subtitle="Set your display name and sound preferences." />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                {editingName ? (
                  <div className="flex gap-2">
                    <input
                      className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3 py-2 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-400/50"
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                    />
                    <button
                      className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
                      onClick={() => { soundManager.play('click'); changeName(tempName); setEditingName(false); }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-400">Current name</div>
                      <div className="mt-1 text-lg font-semibold text-white">{playerName}</div>
                    </div>
                    <button
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                      onClick={() => { soundManager.play('click'); setEditingName(true); }}
                    >
                      Edit
                    </button>
                  </div>
                )}

                <div className="mt-4 border-t border-white/10 pt-4 space-y-4">
                  <label className="flex items-center justify-between gap-4 text-sm text-slate-300">
                    <span>Sound effects</span>
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setSoundEnabled(val);
                        soundManager.setEnabled(val);
                        soundManager.play('click');
                      }}
                      className="h-4 w-4 accent-cyan-500"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-wider text-slate-400">Vol</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        soundManager.setVolume(val);
                      }}
                      className="h-1 flex-grow cursor-pointer appearance-none rounded-lg bg-white/15 accent-cyan-500"
                    />
                    <span className="w-10 text-right font-mono text-xs text-slate-400">{Math.round(volume * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <SectionTitle title="Start a room" subtitle="Create a new match or join an existing one." />
                <button
                  onClick={() => { soundManager.play('click'); createRoom(); }}
                  className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-400"
                >
                  Create New Game
                </button>
                <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-slate-500">
                  <div className="h-px flex-1 bg-white/10" />
                  <span>or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Room Code"
                    className="flex-grow rounded-xl border border-white/10 bg-slate-900/80 px-3 py-3 uppercase text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-400/50"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                  />
                  <button
                    onClick={() => { soundManager.play('click'); joinRoom(joinId); }}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isHost = state.players.length > 0 && state.players[0].id === playerId;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_35%),linear-gradient(180deg,#0f172a_0%,#1e293b_45%,#022c22_100%)] px-4 py-4 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-xl">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-emerald-300/80">Room</div>
            <div className="mt-1 flex items-center gap-3">
              <h2 className="text-xl font-bold sm:text-2xl">{roomId}</h2>
              {isHost && <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300">Host</span>}
            </div>
          </div>
          <button
            onClick={() => { soundManager.play('click'); navigator.clipboard?.writeText(roomId); }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            title="Copy room code"
          >
            Copy code
          </button>
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Lobby status</div>
                <p className="mt-1 text-sm text-slate-300">Share the code, wait for players, then launch when ready.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-white">
                {state.players.length}/8
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <SectionTitle title="Players" subtitle="Online status, bots, and who is hosting." />
              <ul className="space-y-2">
                {state.players.map(p => {
                  const isMe = p.id === playerId;
                  return (
                    <li key={p.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition-colors ${isMe ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/10 bg-slate-900/50 hover:bg-white/5'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${isMe ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-white'}`}>
                          {p.name.trim().slice(0, 1).toUpperCase() || 'P'}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-white">
                            {p.name} {isMe ? <span className="text-cyan-300">(You)</span> : ''}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{p.isBot ? 'Bot player' : 'Human player'}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.connected ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
                          {p.isBot ? `Bot — ${p.botConfig?.archetype}` : (p.connected ? 'Online' : 'Offline')}
                        </span>
                        {state.players[0]?.id === p.id && <span className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80">Host</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
            {isHost && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <SectionTitle title="Match options" subtitle="Tweak the game before you start." />
                <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-3">
                  <div>
                    <div className="font-medium text-white">Open Pain Cards</div>
                    <div className="text-xs text-slate-400">Only your chosen pain card scores against you.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={openPainCards}
                    onChange={() => { soundManager.play('click'); setOpenPainCards(!openPainCards); }}
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>

                {state.players.length < 8 && (
                  <div className="mt-3 flex gap-2">
                    <select id="bot-type" className="flex-grow rounded-xl border border-white/10 bg-slate-900/80 px-3 py-3 text-white outline-none transition-colors focus:border-cyan-400/50">
                      {Object.keys(BOT_ARCHETYPES).map(arch => (
                        <option key={arch} value={arch} className="bg-slate-900">{arch} Bot</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        soundManager.play('click');
                        const select = document.getElementById('bot-type') as HTMLSelectElement;
                        sendAction('add_bot', { archetype: select.value });
                      }}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Add Bot
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <SectionTitle title="Actions" subtitle="Start once at least three players are in." />
              {isHost ? (
                <button
                  onClick={() => { soundManager.play('click'); sendAction('start_game', { openPainCards }); }}
                  disabled={state.players.length < 3}
                  className={`w-full rounded-2xl px-4 py-4 text-base font-bold text-white transition-all ${state.players.length >= 3 ? 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-950/30' : 'cursor-not-allowed bg-slate-700 text-slate-300'}`}
                >
                  Start Game
                </button>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-center text-slate-400">
                  Waiting for host to start...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
