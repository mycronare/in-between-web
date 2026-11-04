import { useEffect, useState } from "react";
import { createRoom, joinRoom } from "./api";
import { useGame } from "./useGame";

const SHORT = { Ace: "A", Jack: "J", Queen: "Q", King: "K" };
const SUIT = { Hearts: "♥", Diamonds: "♦", Clubs: "♣", Spades: "♠" };

function Card({ c, size, tilt, state, hidden, className = "" }) {
  const style = { "--cw": size && `${size}px`, "--tilt": tilt && `${tilt}deg` };
  if (!c || hidden) return <div className={`card hidden ${className}`} style={style} />;
  const red = c[1] === "Hearts" || c[1] === "Diamonds";
  return (
    <div className={`card ${red ? "red" : ""} ${state || ""} ${className}`} style={style}>
      <span>{SHORT[c[0]] || c[0]}</span><i>{SUIT[c[1]]}</i>
    </div>
  );
}

// [color, left %, top %, rotation, width vw, height vw]
const DECO = [
  ["navy", -4, 22, -35, 22, 34], ["red", 8, 18, 8, 24, 22], ["navy", 36, 8, -20, 26, 22],
  ["pink", 60, 2, -6, 24, 22], ["turq", 66, -6, 30, 22, 14], ["red", 6, 84, 8, 26, 22],
  ["navy", 24, 86, -30, 18, 18], ["pink", 32, 90, 6, 10, 12],
];
function Backdrop({ children }) {
  return (
    <div className="backdrop">
      {DECO.map(([c, x, y, r, w, h], i) => (
        <div key={i} className={`deco ${c}`} style={{ "--x": x, "--y": y, "--r": `${r}deg`, "--w": w, "--h": h }} />
      ))}
      {children}
    </div>
  );
}

function Home({ g }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [view, setView] = useState(null); // null | "join" | "howto"
  const [busy, setBusy] = useState(false);

  const guard = async (fn) => {
    if (!name.trim()) { setView(null); return g.setError("Enter a username first."); }
    setBusy(true);
    try { await fn(); } catch (e) { g.setError(e.message); } finally { setBusy(false); }
  };
  const create = () => guard(async () => g.connect((await createRoom()).room_id, name.trim()));
  const join = () => guard(async () => {
    if (!code.trim()) throw new Error("Enter a room code.");
    try { await joinRoom(code); } catch (e) { if (e.status !== 409) throw e; } // 409 = already started; still try to reconnect by name
    g.connect(code.trim(), name.trim());
  });

  return (
    <Backdrop>
      <div className="home-grid">
        <div className="title-card"><h1 className="serif">In<br />Between</h1></div>
        <label className="who">
          <span>Who are you?</span>
          <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} aria-label="Username" />
        </label>
        <div className="stack">
          <button className="pick pick-howto" onClick={() => setView("howto")}>How to play</button>
          <button className="pick pick-create" disabled={busy} onClick={create}>Create Room</button>
          <button className="pick pick-join" onClick={() => setView("join")}>Join Room</button>
        </div>
      </div>

      {view === "join" && (
        <div className="overlay" onClick={() => setView(null)}>
          <div className="glass" onClick={(e) => e.stopPropagation()}>
            <h2>Enter room code</h2>
            <input className="code-input" autoFocus value={code} placeholder="a3f9c2d1" onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()} aria-label="Room code" />
            <button className="btn" disabled={busy} onClick={join}>Join Game</button>
            <button className="btn outline" onClick={() => setView(null)}>Back</button>
          </div>
        </div>
      )}
      {view === "howto" && (
        <div className="overlay" onClick={() => setView(null)}>
          <div className="glass" onClick={(e) => e.stopPropagation()}>
            <h2>How to play</h2>
            <ul>
              <li>Everyone starts with $1,000 and antes $20 each round.</li>
              <li>You get two cards. On your turn, bet that the next card lands lower, between, or higher, or pass.</li>
              <li>Win and the bet comes out of the pot. Lose and it goes in.</li>
              <li>Last player with money wins.</li>
            </ul>
            <button className="btn outline" onClick={() => setView(null)}>Got it</button>
          </div>
        </div>
      )}
      {g.s.error && <div className="err-card">{g.s.error}</div>}
    </Backdrop>
  );
}

function Lobby({ g }) {
  const { s, send, leave } = g;
  return (
    <Backdrop>
      <div className="center">
        <div className="glass">
          <h2>Share this code</h2>
          <div className="code">{s.room}</div>
          <div>
            {s.players.map((p) => (
              <div className="pill" key={p.id}><span>{p.name}</span>{p.role === "host" && <span className="host">HOST</span>}</div>
            ))}
          </div>
          {s.role === "host"
            ? <button className="btn" disabled={s.players.length < 2} onClick={() => send("START_GAME")}>Start Game</button>
            : <p className="serif center-text">Waiting for the host to start…</p>}
          <button className="btn outline" onClick={leave}>Leave</button>
        </div>
      </div>
      {s.error && <div className="err-card">{s.error}</div>}
    </Backdrop>
  );
}

function Controls({ me, game, send }) {
  const max = Math.min(me.money, game.pot);
  const same = me.hand[0][2] === me.hand[1][2];
  const options = same ? ["between"] : ["lower", "between", "higher"];
  const [choice, setChoice] = useState("between");
  const [amount, setAmount] = useState(Math.min(50, max));
  const pick = options.includes(choice) ? choice : options[0];
  const amt = Math.min(Number(amount) || 0, max);
  return (
    <div className="ctrl">
      <div className="row">
        {options.map((o) => <button key={o} className={`choice ${pick === o ? "on" : ""}`} onClick={() => setChoice(o)}>{o[0].toUpperCase() + o.slice(1)}</button>)}
      </div>
      <input type="range" min={1} max={max} value={amt} onChange={(e) => setAmount(e.target.value)} aria-label="Bet amount" />
      <div className="row">
        <button className="btn pink" onClick={() => setAmount(max)}>All In</button>
        <button className="btn turq" disabled={amt < 1} onClick={() => send("BET", { choice: pick, amount: amt === max ? "all_in" : amt })}>Bet ${amt}</button>
        <button className="btn outline" onClick={() => send("PASS")}>Pass</button>
      </div>
    </div>
  );
}

function Table({ g }) {
  const { s, send, leave } = g;
  const game = s.game;
  // Keep the revealed card on screen for a few seconds after a bet resolves.
  const [hold, setHold] = useState(null);
  useEffect(() => {
    if (!s.reveal?.result) return;
    setHold(s.reveal);
    const t = setTimeout(() => setHold(null), 3000);
    return () => clearTimeout(t);
  }, [s.reveal]);
  if (!game) return <div className="table"><p className="serif">Waiting for the next move…</p><button className="btn outline" onClick={leave}>Leave</button></div>;
  const me = game.players.find((p) => p.name === s.me.name);
  const cur = game.players.find((p) => p.name === game.current_player);
  const myTurn = game.current_player === s.me.name && !game.winner;
  const heading = hold
    ? `${hold.player} ${hold.result === "win" ? "won" : "lost"} $${hold.amount}.`
    : game.winner ? `${game.winner} wins.` : myTurn ? "Your turn." : `${game.current_player}’s turn.`;
  const hand = [...(hold?.hand || cur.hand)].sort((a, b) => a[2] - b[2]); // lower card on the left
  const showMid = hold || !game.winner;
  return (
    <div className="table">
      <header className="t-head">
        <h2 className="serif turn">{heading}</h2>
        <div className="pot-label"><span>Pot</span><b>${game.pot}</b></div>
        <button className="btn outline" onClick={leave}>Leave</button>
      </header>

      <aside className="log-card serif" tabIndex={0}>
        <h3>Round history</h3>
        {s.log.length ? s.log.map((l, i) => <p key={i}>{l}</p>) : <p>Nothing yet.</p>}
      </aside>

      <section className="seats">
        {game.players.map((p) => (
          <div key={p.name} className={`seat ${p.name === game.current_player ? "turn" : ""} ${p.money <= 0 ? "out" : ""}`}>
            <div className="seat-label"><b>{p.name}{p.name === s.me.name ? " (you)" : ""}</b><span>${p.money}</span></div>
            <div className="hand">{p.hand.map((c, i) => <Card key={i} c={c} size={50} />)}</div>
          </div>
        ))}
      </section>

      <section className="stage">
        <div className="big-hand">
          <Card c={hand[0]} tilt={-8} />
          {showMid && <Card className="mid" c={hold?.card} hidden={!hold} state={hold?.result} />}
          <Card c={hand[1]} tilt={8} />
        </div>
      </section>

      {myTurn && !hold && me && me.money > 0 && <Controls key={game.current_player + game.pot} me={me} game={game} send={send} />}
      {s.error && <div className="err-card">{s.error}</div>}
    </div>
  );
}

export default function App() {
  const g = useGame();
  return g.s.phase === "home" ? <Home g={g} /> : g.s.phase === "lobby" ? <Lobby g={g} /> : <Table g={g} />;
}