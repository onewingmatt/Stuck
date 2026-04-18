import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type GameState } from '../game/models.js';

export function useGameClient() {
  const [state, setState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const manualCloseRef = useRef(false);

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

  const connect = useCallback(() => {
    if (!roomId || !playerId) return;

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'development' ? 'localhost:3000' : window.location.host;
    const wsUrl = `${protocol}//${host}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setConnected(true);
      setReconnecting(false);
      ws.send(JSON.stringify({ type: 'join_room', roomId, playerId, playerName }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'state_update') setState(data.state);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      if (manualCloseRef.current || !roomId || !playerId) {
        setReconnecting(false);
        return;
      }
      setReconnecting(true);
      const attempt = reconnectAttemptsRef.current++;
      const delay = Math.min(8000, 400 * (2 ** attempt));
      reconnectTimerRef.current = window.setTimeout(() => {
        if (!manualCloseRef.current && roomId && playerId) {
          connect();
        }
      }, delay);
    };

    return ws;
  }, [playerId, playerName, roomId]);

  useEffect(() => {
    manualCloseRef.current = false;
    const ws = connect();
    return () => {
      manualCloseRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      ws?.close();
    };
  }, [connect]);

  const sendAction = useCallback((type: string, payload?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, roomId, playerId, payload }));
    }
  }, [roomId, playerId]);

  const changeName = (newName: string) => {
    const cleaned = newName.trim().replace(/\s+/g, ' ').substring(0, 20);
    if (!cleaned) return;
    setPlayerName(cleaned);
    localStorage.setItem('stickem_player_name', cleaned);
    sendAction('join_room', { playerName: cleaned });
  };

  const leaveRoom = useCallback(() => {
    manualCloseRef.current = true;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) wsRef.current.close();
    setState(null);
    setRoomId('');
    setConnected(false);
    setReconnecting(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
  }, []);

  return { state, playerId, playerName, roomId, setRoomId, connected, reconnecting, sendAction, changeName, leaveRoom };
}
