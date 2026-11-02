import { useState } from "react";
import { createRoom, joinRoom } from "./api";
import { useGame } from "./useGame";

const SHORT = { Ace: "A", Jack: "J", Queen: "Q", King: "K" };
const SUIT = { Hearts: "♥", Diamonds: "♦", Clubs: "♣", Spades: "♠" };
function Card({ c, hidden, state }) {
  if (!c || hidden) return <div className="card back">?</div>;
  const [rank, suit] = c;
  const tone = suit === "Hearts" || suit === "Diamonds" ? "red" : "black";
  return <div className={`card ${tone} ${state || ""}`}><div>{SHORT[rank] || rank}<small>{SUIT[suit]}</small></div></div>;
}

function Home({ g }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    if (!name.trim()) return g.setError("Enter a username first.");
    setBusy(true);
    try { await fn(); } catch (e) { g.setError(e.message); } finally { setBusy(false); }
  };
  const create = () => run(async () => g.connect((await createRoom()).room_id, name.trim()));
  const join = () => run(async () => {
    if (!code.trim()) throw new Error("Enter a room code.");
    try { await joinRoom(code); } catch (e) { if (e.status !== 409) throw e; } 
    g.connect(code.trim(), name.trim());
  });
  return (
    <div className="screen">
      <h1>IN-BETWEEN</h1>
      <p className="muted center">Bet where the next card lands.</p>
      <input className="input" placeholder="Username" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      <button className="btn" disabled={busy} onClick={create}>Create room</button>
      <input className="input" placeholder="Room code" value={code} onChange={(e) => setCode(e.target.value)} />
      <button className="btn ghost" disabled={busy} onClick={join}>Join room</button>
      {g.s.error && <div className="error">{g.s.error}</div>}
    </div>
  );
}

function Lobby({ g }) {
  const { s, send, leave } = g;
  const host = s.role === "host";
  return (
    <div className="screen">
      <h2 className="center">Share this code</h2>
      <div className="code">{s.room}</div>
      <ul className="list">
        {s.players.map((p) => <li key={p.id}><span>{p.name}</span>{p.role === "host" && <span className="tag">host</span>}</li>)}
      </ul>
      {host
        ? <button className="btn" disabled={s.players.length < 2} onClick={() => send("START_GAME")}>
            {s.players.length < 2 ? "Waiting for players" : "Start game"}</button>
        : <p className="muted center">Waiting for the host to start…</p>}
      <button className="btn ghost" onClick={leave}>Leave</button>
      {s.error && <div className="error">{s.error}</div>}
    </div>
  );
}

function Controls({ me, game, send }) {
  const max = Math.min(me.money, game.pot);
  const [choice, setChoice] = useState("higher");
  const [amount, setAmount] = useState(Math.min(20, max));
  const same = me.hand[0][2] === me.hand[1][2];
  const options = !same ? ["between"] : ["lower", "between", "higher"];
  const pick = options.includes(choice) ? choice : options[0];
  const amt = Math.min(Number(amount) || 0, max);
  return (
    <div className="controls">
      <div className="row choices">
        {options.map((o) => <button key={o} className={`btn ${pick === o ? "on" : ""}`} onClick={() => setChoice(o)}>{o}</button>)}
      </div>
      <input type="range" min={1} max={max} value={amt} onChange={(e) => setAmount(e.target.value)} />
      <div className="row">
        <button className="btn accent" onClick={() => setAmount(max)}>All in (${max})</button>
        <button className="btn" disabled={amt < 1} onClick={() => send("BET", { choice: pick, amount: amt === max ? "all_in" : amt })}>Bet ${amt}</button>
        <button className="btn ghost" onClick={() => send("PASS")}>Pass</button>
      </div>
    </div>
  );
}

function Table({ g }) {
  const { s, send, leave } = g;
  const game = s.game;
  if (!game) return <div className="screen"><p className="center muted">Waiting for the next move…</p></div>;
  const me = game.players.find((p) => p.name === s.me.name);
  const myTurn = game.current_player === s.me.name && !game.winner;
  const r = s.reveal;
  return (
    <div className="screen">
      <div className="pot">Pot ${game.pot}</div>
      <div className="players">
        {game.players.map((p) => (
          <div key={p.name} className={`player ${p.name === game.current_player ? "turn" : ""} ${p.name === s.me.name ? "me" : ""}`}>
            <span className="name">{p.name}</span>
            <span className="money">${p.money}</span>
            <div className="hand">{p.hand.map((c, i) => <Card key={i} c={c} />)}</div>
          </div>
        ))}
      </div>
      <div className="stage">
        {r ? <><Card c={r.card} state={r.result} /><span className={`result ${r.result}`}>{r.player} {r.result === "win" ? "won" : r.result === "lose" ? "lost" : "is betting"}{r.amount ? ` $${r.amount}` : ""}</span></>
           : <span className="muted">{game.current_player}'s turn</span>}
      </div>
      {game.winner && <div className="pot center">🏆 {game.winner} wins!</div>}
      {myTurn && me && me.money > 0 && <Controls key={game.current_player + game.pot} me={me} game={game} send={send} />}
      {s.error && <div className="error">{s.error}</div>}
      <div className="log">{s.log.map((l, i) => <div key={i}>{l}</div>)}</div>
      <button className="btn ghost" onClick={leave}>Leave</button>
    </div>
  );
}

export default function App() {
  const g = useGame();
  return (
    <div className="app">
      {g.s.phase === "home" && <Home g={g} />}
      {g.s.phase === "lobby" && <Lobby g={g} />}
      {g.s.phase === "table" && <Table g={g} />}
    </div>
  );
}
