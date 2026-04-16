import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { createInitialState, startGame, selectPainCard, playCard, clearTrick, nextRound } from '../src/game/engine.js';
import { doBotAction, BOT_ARCHETYPES } from '../src/game/ai.js';
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
const rooms = {};
const clients = new Map();
function broadcast(roomId) {
    const state = rooms[roomId];
    if (!state)
        return;
    const data = JSON.stringify({ type: 'state_update', state });
    for (const [client, info] of clients.entries()) {
        if (info.roomId === roomId && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    }
}
function processBotActions(roomId) {
    const state = rooms[roomId];
    if (!state)
        return;
    const action = doBotAction(state);
    if (action) {
        setTimeout(() => {
            const currentState = rooms[roomId];
            if (!currentState)
                return;
            let newState = currentState;
            if (action.action === 'select_pain' && action.playerId && action.cardId) {
                newState = selectPainCard(currentState, action.playerId, action.cardId);
            }
            else if (action.action === 'play_card' && action.playerId && action.cardId) {
                newState = playCard(currentState, action.playerId, action.cardId);
            }
            else if (action.action === 'clear_trick') {
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
            const clientInfo = clients.get(ws);
            if (type === 'join_room') {
                let state = rooms[roomId];
                if (!state) {
                    state = createInitialState(roomId);
                    rooms[roomId] = state;
                }
                clientInfo.roomId = roomId;
                clientInfo.playerId = playerId;
                const existingPlayer = state.players.find(p => p.id === playerId);
                if (existingPlayer) {
                    existingPlayer.connected = true;
                    existingPlayer.name = playerName || existingPlayer.name;
                }
                else if (state.status === 'waiting' && state.players.length < 6) {
                    state.players.push({
                        id: playerId,
                        name: playerName || `Player ${state.players.length + 1}`,
                        hand: [], wonCards: [], chosenPainCard: null, score: 0, isBot: false, connected: true
                    });
                }
                rooms[roomId] = state;
                ws.send(JSON.stringify({ type: 'state_update', state }));
                broadcast(roomId);
                processBotActions(roomId);
            }
            else if (type === 'add_bot') {
                const state = rooms[roomId];
                if (state && state.status === 'waiting' && state.players.length < 6) {
                    const archetype = (payload?.archetype || 'Average');
                    const botConfig = BOT_ARCHETYPES[archetype];
                    state.players.push({
                        id: `bot-${uuidv4()}`,
                        name: `${archetype} Bot`,
                        hand: [], wonCards: [], chosenPainCard: null, score: 0, isBot: true, botConfig: { archetype, ...botConfig }, connected: true
                    });
                    broadcast(roomId);
                }
            }
            else if (type === 'start_game') {
                const state = rooms[roomId];
                if (state && state.status === 'waiting' && state.players.length >= 3) {
                    rooms[roomId] = startGame(state);
                    broadcast(roomId);
                    processBotActions(roomId);
                }
            }
            else if (type === 'select_pain' && rooms[roomId]) {
                rooms[roomId] = selectPainCard(rooms[roomId], playerId, payload.cardId);
                broadcast(roomId);
                processBotActions(roomId);
            }
            else if (type === 'play_card' && rooms[roomId]) {
                rooms[roomId] = playCard(rooms[roomId], playerId, payload.cardId);
                broadcast(roomId);
                processBotActions(roomId);
            }
            else if (type === 'clear_trick' && rooms[roomId]) {
                rooms[roomId] = clearTrick(rooms[roomId]);
                broadcast(roomId);
                processBotActions(roomId);
            }
            else if (type === 'next_round' && rooms[roomId]) {
                rooms[roomId] = nextRound(rooms[roomId]);
                broadcast(roomId);
                processBotActions(roomId);
            }
        }
        catch (e) {
            console.error("Error processing message", e);
        }
    });
    ws.on('close', () => {
        const info = clients.get(ws);
        if (info && info.roomId && info.playerId) {
            const state = rooms[info.roomId];
            if (state) {
                const player = state.players.find(p => p.id === info.playerId);
                if (player) {
                    player.connected = false;
                    broadcast(info.roomId);
                }
            }
        }
        clients.delete(ws);
    });
});
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
