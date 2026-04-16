import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type GameState } from '../game/models.js';

export function useGameClient() {
  const [state, setState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let pid = localStorage.getItem('stickem_player_id');
    if (!pid) {
      pid = uuidv4();
      localStorage.setItem('stickem_player_id', pid);
    }
    setPlayerId(pid);

    let pName = localStorage.getItem('stickem_player_name');
    if (!pName) {
      pName = `Player ${pid.substring(0, 4)}`;
      localStorage.setItem('stickem_player_name', pName);
    }
    setPlayerName(pName);

    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('room');
    const mode = urlParams.get('mode');

    if (mode === 'online' && urlRoom) {
      setRoomId(urlRoom);
    }
  }, []);

  useEffect(() => {
    if (!roomId || !playerId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'development' ? 'localhost:3000' : window.location.host;
    const wsUrl = `${protocol}//${host}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join_room', roomId, playerId, playerName }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'state_update') setState(data.state);
    };

    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, [roomId, playerId, playerName]);

  const sendAction = useCallback((type: string, payload?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, roomId, playerId, payload }));
    }
  }, [roomId, playerId]);

  const changeName = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem('stickem_player_name', newName);
    sendAction('join_room');
  };

  return { state, playerId, playerName, roomId, setRoomId, connected, sendAction, changeName };
}
