import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { GameState, BotArchetype } from '../src/game/models.js';
import { createInitialState, startGame, selectPainCard, playCard, clearTrick, nextRound, restartGame } from '../src/game/engine.js';
import { doBotAction, BOT_ARCHETYPES } from '../src/game/ai.js';

const DISCONNECT_TIMEOUT_MS = 120_000;

const __filename = fileURLToPath(import.meta.url);
const __dirnamePath = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirnamePath, '../../dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirnamePath, '../../dist/index.html'));
});

const rooms: Record<string, GameState> = {};
const clients = new Map<WebSocket, { roomId: string; playerId: string | null }>();
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getHostId(state: GameState) {
  return state.hostId ?? state.players[0]?.id ?? null;
}

function setHostId(state: GameState, hostId: string | null) {
  state.hostId = hostId;
}

function migrateHost(state: GameState) {
  const currentHostId = getHostId(state);
  const currentHost = currentHostId ? state.players.find(p => p.id === currentHostId) : null;

  if (currentHost?.connected) return false;

  const nextHost = state.players.find(p => p.connected && !p.isBot) ?? state.players[0] ?? null;
  const nextHostId = nextHost?.id ?? null;

  if (state.hostId !== nextHostId) {
    setHostId(state, nextHostId);
    return true;
  }

  return false;
}

function removePlayer(state: GameState, playerId: string) {
  state.players = state.players.filter(p => p.id !== playerId);
  delete state.scores[playerId];
  disconnectTimers.delete(playerId);
  migrateHost(state);
}

function broadcast(roomId: string) {
  const state = rooms[roomId];
  if (!state) return;
  const data = JSON.stringify({ type: 'state_update', state });
  for (const [client, info] of clients.entries()) {
    if (info.roomId === roomId && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function processBotActions(roomId: string) {
  const state = rooms[roomId];
  if (!state) return;
  const action = doBotAction(state);
  if (action) {
    setTimeout(() => {
        const currentState = rooms[roomId];
        if (!currentState) return;
        let newState = currentState;
        if (action.action === 'select_pain' && action.playerId && action.cardId) {
            newState = selectPainCard(currentState, action.playerId, action.cardId);
        } else if (action.action === 'play_card' && action.playerId && action.cardId) {
            newState = playCard(currentState, action.playerId, action.cardId);
        } else if (action.action === 'clear_trick') {
            newState = clearTrick(currentState);
        }
        rooms[roomId] = newState;
        broadcast(roomId);
        processBotActions(roomId);
    }, 1000);
  }
}

wss.on('connection', (ws) => {
  clients.set(ws, { roomId: '', playerId: null });
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { type, roomId, playerId, playerName, payload } = data;
      const clientInfo = clients.get(ws)!;

      if (type === 'join_room') {
        let state = rooms[roomId];
        if (!state) {
          state = createInitialState(roomId);
          rooms[roomId] = state;
        }
        clientInfo.roomId = roomId;
        clientInfo.playerId = playerId;

        const existingTimer = disconnectTimers.get(playerId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          disconnectTimers.delete(playerId);
        }

        const joinedName = payload?.playerName || playerName;
        const existingPlayer = state.players.find(p => p.id === playerId);
        if (existingPlayer) {
          existingPlayer.connected = true;
          existingPlayer.name = joinedName || existingPlayer.name;
        } else if (state.status === 'waiting' && state.players.length < 8) {
            state.players.push({
              id: playerId,
              name: joinedName || `Player ${state.players.length + 1}`,
              hand: [], wonCards: [], chosenPainCard: null, score: 0, isBot: false, connected: true
            });
        }
        if (!state.hostId) {
          const hostCandidate = state.players.find(p => p.connected && !p.isBot) ?? state.players[0] ?? null;
          if (hostCandidate) setHostId(state, hostCandidate.id);
        } else {
          migrateHost(state);
        }
        rooms[roomId] = state;
        ws.send(JSON.stringify({ type: 'state_update', state }));
        broadcast(roomId);
        processBotActions(roomId);

      } else if (type === 'add_bot') {
        const state = rooms[roomId];
        if (state && state.status === 'waiting' && state.players.length < 8) {
            const archetype = (payload?.archetype || 'Average') as BotArchetype;
            const botConfig = BOT_ARCHETYPES[archetype];
            state.players.push({
                id: `bot-${uuidv4()}`,
                name: `${archetype} Bot`,
                hand: [], wonCards: [], chosenPainCard: null, score: 0, isBot: true, botConfig: { archetype, ...botConfig }, connected: true
            });
            broadcast(roomId);
        }
      } else if (type === 'remove_bot') {
        const state = rooms[roomId];
        const hostId = state?.hostId ?? state?.players[0]?.id;
        if (state && state.status === 'waiting' && hostId === playerId && payload?.playerId) {
          const target = state.players.find(p => p.id === payload.playerId && p.isBot);
          if (target) {
            removePlayer(state, target.id);
            rooms[roomId] = state;
            broadcast(roomId);
          }
        }
      } else if (type === 'start_game') {
        const state = rooms[roomId];
        if (state && state.status === 'waiting' && state.players.length >= 3) {
            const settings = {
              roundCount: payload?.roundCount ?? 0,
              openPainCards: payload?.openPainCards ?? false,
              turnTimerSeconds: payload?.turnTimerSeconds ?? 0
            };
            rooms[roomId] = startGame(state, settings);
            broadcast(roomId);
            processBotActions(roomId);
        }
      } else if (type === 'select_pain' && rooms[roomId]) {
        rooms[roomId] = selectPainCard(rooms[roomId], playerId, payload.cardId);
        broadcast(roomId);
        processBotActions(roomId);
      } else if (type === 'play_card' && rooms[roomId]) {
        rooms[roomId] = playCard(rooms[roomId], playerId, payload.cardId);
        broadcast(roomId);
        processBotActions(roomId);
      } else if (type === 'clear_trick' && rooms[roomId]) {
        rooms[roomId] = clearTrick(rooms[roomId]);
        broadcast(roomId);
        processBotActions(roomId);
      } else if (type === 'next_round' && rooms[roomId]) {
        rooms[roomId] = nextRound(rooms[roomId]);
        broadcast(roomId);
        processBotActions(roomId);
      } else if (type === 'play_again' && rooms[roomId]) {
        const state = rooms[roomId];
        const hostId = state.hostId ?? state.players[0]?.id;
        if (state.status === 'game_over' && hostId === playerId) {
          rooms[roomId] = restartGame(state);
          broadcast(roomId);
          processBotActions(roomId);
        }
      } else if (type === 'chat_message' && rooms[roomId]) {
        const state = rooms[roomId];
        const player = state.players.find(p => p.id === playerId);
        if (player && payload?.text && typeof payload.text === 'string') {
          const text = payload.text.trim().substring(0, 200);
          if (text) {
            state.chatMessages.push({
              id: uuidv4(),
              playerId,
              playerName: player.name,
              text,
              timestamp: Date.now()
            });
            // Keep last 50 messages
            if (state.chatMessages.length > 50) {
              state.chatMessages = state.chatMessages.slice(-50);
            }
            broadcast(roomId);
          }
        }
      }
    } catch (e) {
      console.error("Error processing message", e);
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info && info.roomId && info.playerId) {
      const roomId = info.roomId;
      const state = rooms[roomId];
      if (state) {
        const player = state.players.find(p => p.id === info.playerId);
        if (player) {
          player.connected = false;
          migrateHost(state);
          broadcast(roomId);

          if (!player.isBot && state.status !== 'waiting') {
            const timer = setTimeout(() => {
              disconnectTimers.delete(info.playerId!);
              const current = rooms[roomId];
              if (!current) return;
              const still = current.players.find(p => p.id === info.playerId);
              if (still && !still.connected) {
                removePlayer(current, still.id);
                current.status = 'waiting';
                current.currentTrick = [];
                current.leadColor = null;
                current.trickWinnerIndex = null;
                current.roundBreakdown = {};
                current.trickHistory = [];
                current.roundNumber = 0;
                current.players.forEach(p => {
                  p.hand = [];
                  p.wonCards = [];
                  p.chosenPainCard = null;
                  p.score = 0;
                });
                rooms[roomId] = current;
                broadcast(roomId);
              }
            }, DISCONNECT_TIMEOUT_MS);
            disconnectTimers.set(info.playerId, timer);
          }
        }
      }
    }
    clients.delete(ws);
  });
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
