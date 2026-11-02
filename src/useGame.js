import { useRef, useState, useCallback } from "react";
import { wsUrl } from "./api";

const init = { phase: "home", me: null, role: null, room: null, players: [], game: null, reveal: null, log: [], error: null };

const addPlayer = (list, p) => (list.some((x) => x.id === p.id) ? list : [...list, p]);
const say = (p, m) => ({ ...p, log: [m, ...p.log].slice(0, 5) });

function reduce(p, e) {
  switch (e.type) {
    case "WELCOME":
      return { ...p, me: { id: e.player_id, name: e.player_name }, role: e.role, room: e.room_id,
        phase: e.status === "playing" ? "table" : "lobby",
        players: addPlayer(p.players, { id: e.player_id, name: e.player_name, role: e.role }) };
    case "PLAYER_JOINED":
      return { ...p, players: addPlayer(p.players, { id: e.player_id, name: e.player_name, role: e.role }) };
    case "PLAYER_LEFT":
      return p.phase === "lobby" ? { ...p, players: p.players.filter((x) => x.id !== e.player_id) } : say(p, `${e.player_name} disconnected`);
    case "GAME_STARTED":
      return { ...p, phase: "table", game: e.state };
    case "GAME_STATE":
      return { ...p, game: e.state };
    case "CARD_DRAWN":
      return { ...p, reveal: { player: e.player, card: e.drawn_card, result: null } };
    case "PLAYER_WON":
    case "PLAYER_LOST": {
      const won = e.type === "PLAYER_WON";
      return say({ ...p, reveal: p.reveal && { ...p.reveal, result: won ? "win" : "lose", amount: e.amount } },
        `${e.player} ${won ? "won" : "lost"} $${e.amount}`);
    }
    case "PLAYER_PASSED":
      return say(p, `${e.previous_player} passed`);
    case "ROUND_STARTED":
      return say({ ...p, reveal: null }, "New round: fresh cards, +$20 in the pot");
    case "GAME_OVER":
      return say(p, e.message);
    case "ERROR":
      return { ...p, error: e.message };
    default:
      return p;
  }
}

export function useGame() {
  const [s, setS] = useState(init);
  const ws = useRef(null);

  const connect = useCallback((room, name) => {
    setS((p) => ({ ...init, error: null }));
    const sock = new WebSocket(wsUrl(room.toLowerCase(), name));
    ws.current = sock;
    sock.onmessage = (m) => setS((p) => reduce(p, JSON.parse(m.data)));
    sock.onclose = (ev) => {
      if (ws.current !== sock) return;
      setS((p) => ({ ...p, phase: "home", error: ev.reason || "Connection closed." }));
    };
  }, []);

  const send = useCallback((action, data) => {
    setS((p) => ({ ...p, error: null }));
    ws.current?.send(JSON.stringify({ action, data }));
  }, []);

  const leave = useCallback(() => { const w = ws.current; ws.current = null; w?.close(); setS(init); }, []);
  const setError = useCallback((error) => setS((p) => ({ ...p, error })), []);

  return { s, connect, send, leave, setError };
}
