import { useEffect, useState } from "react";
import { createRoom, joinRoom } from "./api";
import { useGame } from "./useGame";

const SHORT = { Ace: "A", Jack: "J", Queen: "Q", King: "K" };
const HOLD_MS = 3000; // how long the revealed card stays up before the next turn
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
  const [which, setWhich] = useState(null); // "create" | "join": which action is in flight
  const [slow, setSlow] = useState(false);
  const loading = busy || g.s.connecting; // REST call + websocket handshake
  useEffect(() => {
    if (!loading) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 4000); // Render's free tier can take a while to wake up
    return () => clearTimeout(t);
  }, [loading]);

  const guard = async (kind, fn) => {
    setWhich(kind);
    if (!name.trim()) { setView(null); return g.setError("Enter a username first."); }
    setBusy(true);
    try { await fn(); } catch (e) { g.setError(e.message); } finally { setBusy(false); }
  };
  const create = () => guard("create", async () => g.connect((await createRoom()).room_id, name.trim()));
  const join = () => guard("join", async () => {
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
          <button className="pick pick-howto" disabled={loading} onClick={() => setView("howto")}>How to play</button>
          <button className={`pick pick-create ${loading && which === "create" ? "active" : ""}`} disabled={loading} onClick={create}>
            <span className="pick-label">{loading && which === "create" ? <><span className="spinner" />Creating room…</> : "Create Room"}</span>
          </button>
          <button className="pick pick-join" disabled={loading && which === "create"} onClick={() => setView("join")}>Join Room</button>
        </div>
      </div>

      {view === "join" && (
        <div className="overlay" onClick={() => !loading && setView(null)}>
          <div className="glass" onClick={(e) => e.stopPropagation()}>
            <h2>Enter room code</h2>
            <input className="code-input" autoFocus disabled={loading} value={code} placeholder="a3f9c2d1" onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && join()} aria-label="Room code" />
            <button className={`btn ${loading ? "loading" : ""}`} disabled={loading} onClick={join}>
              {loading ? <span className="pick-label"><span className="spinner" />Joining…</span> : "Join Game"}
            </button>
            <button className="btn outline" disabled={loading} onClick={() => setView(null)}>Back</button>
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
      {g.s.error && <div className="err-card top">{g.s.error}</div>}
      {slow && !g.s.error && <div className="toast"><span className="spinner" />Waking up the server… the first request can take up to a minute.</div>}
    </Backdrop>
  );
}

function CopyCode({ code }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); }
    catch { // clipboard API needs https or localhost; fall back for anything else
      const t = document.createElement("textarea");
      t.value = code; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1500);
  };
  return (
    <button className="icon-btn" onClick={copy} aria-label="Copy room code" title={done ? "Copied!" : "Copy code"}>
      {done
        ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>}
    </button>
  );
}

function Lobby({ g }) {
  const { s, send, leave } = g;
  return (
    <Backdrop>
      <div className="center">
        <div className="glass">
          <h2>Share this code</h2>
          <div className="code-row"><div className="code">{s.room}</div><CopyCode code={s.room} /></div>
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
  // Classic rule: equal cards -> bet higher/lower; otherwise -> between only.
  const options = same ? ["lower", "higher"] : ["between"];
  const [choice, setChoice] = useState("between");
  const [amount, setAmount] = useState(Math.min(50, max));
  const pick = options.includes(choice) ? choice : options[0];
  const amt = Math.min(Number(amount) || 0, max);
  return (
    <div className="ctrl">
      <div className="row" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
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

function Countdown({ ms }) {
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    const end = Date.now() + ms;
    const id = setInterval(() => setLeft(Math.max(0, end - Date.now())), 100);
    return () => clearInterval(id);
  }, [ms]);
  return (
    <div className="countdown" role="timer">
      <div className="clock">
        <svg viewBox="0 0 44 44" aria-hidden><circle className="track" cx="22" cy="22" r="19" /><circle className="ring" cx="22" cy="22" r="19" style={{ animationDuration: `${ms}ms` }} /></svg>
        <b>{Math.ceil(left / 1000)}</b>
      </div>
      <span>Next turn</span>
    </div>
  );
}

function Table({ g }) {
  const { s, send, leave } = g;
  const game = s.game;
  // Keep the revealed card on screen for a few seconds after a bet resolves.
  const [hold, setHold] = useState(null);
  const [confirm, setConfirm] = useState(false); // give-up confirmation
  useEffect(() => {
    if (!s.reveal?.result) return;
    setHold(s.reveal);
    const t = setTimeout(() => setHold(null), HOLD_MS);
    return () => clearTimeout(t);
  }, [s.reveal]);
  if (!game) return <div className="table"><p className="serif">Waiting for the next move…</p><button className="btn outline" onClick={leave}>Leave</button></div>;
  const me = game.players.find((p) => p.name === s.me.name);
  const cur = game.players.find((p) => p.name === game.current_player);
  const myTurn = game.current_player === s.me.name && !game.winner && !me?.out;
  const canGiveUp = !game.winner && me && !me.out;
  const rivals = game.players.filter((p) => p.name !== s.me.name && !p.out);
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
        {canGiveUp && <button className="btn quit" onClick={() => setConfirm(true)}>Give up</button>}
        <button className="btn outline" onClick={leave}>Leave</button>
      </header>

      <aside className="log-card serif" tabIndex={0}>
        <h3>Round history</h3>
        {s.log.length ? s.log.map((l, i) => <p key={i}>{l}</p>) : <p>Nothing yet.</p>}
      </aside>

      <section className="seats">
        {game.players.map((p) => (
          <div key={p.name} className={`seat ${p.name === game.current_player ? "turn" : ""} ${p.out || p.money <= 0 ? "out" : ""}`}>
            <div className="seat-label"><b>{p.name}{p.name === s.me.name ? " (you)" : ""}{p.out ? " · out" : ""}</b><span>${p.money}</span></div>
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
        {hold && <Countdown ms={HOLD_MS} />}
      </section>

      {myTurn && !hold && me && me.money > 0 && <Controls key={game.current_player + game.pot} me={me} game={game} send={send} />}
      {confirm && (
        <div className="overlay" onClick={() => setConfirm(false)}>
          <div className="glass" onClick={(e) => e.stopPropagation()}>
            <h2>Give up?</h2>
            <p className="serif">{rivals.length === 1 ? `${rivals[0].name} wins by default.` : "You’ll be out for the rest of the game."}</p>
            <button className="btn danger" onClick={() => { send("GIVE_UP"); setConfirm(false); }}>Give up</button>
            <button className="btn outline" onClick={() => setConfirm(false)}>Keep playing</button>
          </div>
        </div>
      )}
      {s.error && <div className="err-card">{s.error}</div>}
    </div>
  );
}

export default function App() {
  const g = useGame();
  return g.s.phase === "home" ? <Home g={g} /> : g.s.phase === "lobby" ? <Lobby g={g} /> : <Table g={g} />;
}