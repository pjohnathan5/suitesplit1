import { useState, useEffect, useRef } from "react";
import { Users, Check, Plus, X, RotateCw, Copy, LogOut, ArrowRight } from "lucide-react";

/*
  SuiteSplit — token system (re-themed to match the uploaded house mark)
  Color:  bg #000000, surface #0D0D0D, surfaceRaised #161616, border #2A2A2A,
          text #FFFFFF, textMuted #8F8F8F. Monochrome throughout — no accent color.
  Type:   display = 'Space Grotesk' (bold, geometric — pairs with the flat icon mark),
          body = 'Inter', mono = 'JetBrains Mono' for codes/data.
  Signature: the house mark reconstructed as a live logo, and the Chore Roulette wheel
             rendered in grayscale with initials (not color) marking each roommate —
             keeping the whole product strictly black & white like the source mark.
*/

const uid = () => Math.random().toString(36).slice(2, 9);

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 confusion
const genCode = () =>
  Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

// Grayscale steps used to tell roommates apart on the wheel without any color
const SHADES = ["#FFFFFF", "#B8B8B8", "#7A7A7A", "#4A4A4A", "#DCDCDC", "#969696"];
const initials = (name) =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const seedRoommates = () => [
  { id: uid(), name: "You", shade: SHADES[0], home: true },
  { id: uid(), name: "Roommate 2", shade: SHADES[1], home: true },
  { id: uid(), name: "Roommate 3", shade: SHADES[2], home: false },
];

const seedChores = (roommates) => [
  { id: uid(), name: "Dishes", assigneeId: roommates[0].id, done: false },
  { id: uid(), name: "Take out trash", assigneeId: null, done: false },
  { id: uid(), name: "Vacuum common room", assigneeId: null, done: false },
  { id: uid(), name: "Clean bathroom", assigneeId: roommates[1].id, done: true },
];

const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
    .ss-root { font-family: 'Inter', sans-serif; background:#000000; color:#FFFFFF; }
    .ss-display { font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em; }
    .ss-mono { font-family: 'JetBrains Mono', monospace; }
    .ss-card { background:#0D0D0D; border:1px solid #262626; border-radius:16px; }
    .ss-btn { transition: transform .12s ease, background .15s ease, opacity .15s ease; }
    .ss-btn:active { transform: scale(0.96); }
    .ss-avatar-ring { transition: box-shadow .2s ease, opacity .2s ease; }
    .ss-wheel-wrap { transition: transform 3.2s cubic-bezier(0.12, 0.84, 0.24, 1); }
    .ss-fade-in { animation: ssFade .4s ease; }
    @keyframes ssFade { from { opacity:0; transform: translateY(4px);} to {opacity:1; transform:none;} }
    input:focus, select:focus, button:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 2px; }
    .ss-input { background:#141414; border:1px solid #2A2A2A; color:#FFFFFF; }
    .ss-input::placeholder { color:#6B6B6B; }
  `}</style>
);

// Logo mark — a stylized reconstruction of the uploaded house glyph:
// crossed double roofline, chimney block, punched-out door. Pure white on black.
function HouseMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="27" y="16" width="10" height="20" fill="#FFFFFF" />
      <path d="M6 46 L50 10 L94 46" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="square" />
      <path d="M22 58 L58 26 L90 52" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="square" />
      <rect x="24" y="44" width="52" height="42" rx="4" fill="#FFFFFF" />
      <rect x="42" y="64" width="16" height="22" fill="#000000" />
    </svg>
  );
}

export default function SuiteSplit() {
  const [suiteCode, setSuiteCode] = useState(null);
  const [checkingDevice, setCheckingDevice] = useState(true);
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [copied, setCopied] = useState(false);

  const [roommates, setRoommates] = useState(seedRoommates);
  const [chores, setChores] = useState(() => seedChores(roommates));
  const [loaded, setLoaded] = useState(false);
  const [newChore, setNewChore] = useState("");
  const [newRoommate, setNewRoommate] = useState("");
  const [selectedChoreId, setSelectedChoreId] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null); // { choreId, roommateId }
  const saveTimeout = useRef(null);

  // On first load, see if this device already remembers a suite code
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("suitesplit-my-code", false);
        if (res && res.value) setSuiteCode(res.value);
      } catch (e) {
        // no remembered code — show the join/create screen
      } finally {
        setCheckingDevice(false);
      }
    })();
  }, []);

  // Load this suite's shared data whenever the code changes
  useEffect(() => {
    if (!suiteCode) return;
    setLoaded(false);
    (async () => {
      try {
        const res = await window.storage.get(`suite:${suiteCode}`, true);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setRoommates(parsed.roommates?.length ? parsed.roommates : seedRoommates());
          setChores(parsed.chores || []);
        } else {
          const seededRoommates = seedRoommates();
          setRoommates(seededRoommates);
          setChores(seedChores(seededRoommates));
        }
      } catch (e) {
        const seededRoommates = seedRoommates();
        setRoommates(seededRoommates);
        setChores(seedChores(seededRoommates));
      } finally {
        setLoaded(true);
      }
    })();
  }, [suiteCode]);

  // Persist on change (debounced), scoped to this suite's code
  useEffect(() => {
    if (!loaded || !suiteCode) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await window.storage.set(
          `suite:${suiteCode}`,
          JSON.stringify({ roommates, chores }),
          true
        );
      } catch (e) {
        console.error("SuiteSplit: failed to save", e);
      }
    }, 400);
    return () => clearTimeout(saveTimeout.current);
  }, [roommates, chores, loaded, suiteCode]);

  async function rememberCode(code) {
    try {
      await window.storage.set("suitesplit-my-code", code, false);
    } catch (e) {
      console.error("SuiteSplit: failed to remember code", e);
    }
    setSuiteCode(code);
  }

  function createSuite() {
    rememberCode(genCode());
  }

  function joinSuite() {
    const code = joinInput.trim().toUpperCase();
    if (code.length < 4) {
      setJoinError("Codes are 5 characters — check and try again.");
      return;
    }
    setJoinError("");
    rememberCode(code);
  }

  async function leaveSuite() {
    try {
      await window.storage.delete("suitesplit-my-code", false);
    } catch (e) {
      // ignore
    }
    setSuiteCode(null);
    setJoinInput("");
    setResult(null);
  }

  function copyCode() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(suiteCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const unassigned = chores.filter((c) => !c.assigneeId && !c.done);
  const homeRoommates = roommates.filter((r) => r.home);

  function togglePresence(id) {
    setRoommates((rs) => rs.map((r) => (r.id === id ? { ...r, home: !r.home } : r)));
  }

  function addRoommate() {
    const name = newRoommate.trim();
    if (!name) return;
    setRoommates((rs) => [
      ...rs,
      { id: uid(), name, shade: SHADES[rs.length % SHADES.length], home: true },
    ]);
    setNewRoommate("");
  }

  function removeRoommate(id) {
    setRoommates((rs) => rs.filter((r) => r.id !== id));
    setChores((cs) => cs.map((c) => (c.assigneeId === id ? { ...c, assigneeId: null } : c)));
  }

  function addChore() {
    const name = newChore.trim();
    if (!name) return;
    setChores((cs) => [...cs, { id: uid(), name, assigneeId: null, done: false }]);
    setNewChore("");
  }

  function toggleDone(id) {
    setChores((cs) => cs.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  }

  function removeChore(id) {
    setChores((cs) => cs.filter((c) => c.id !== id));
  }

  function spin() {
    if (spinning || !selectedChoreId || homeRoommates.length === 0) return;
    setResult(null);
    setSpinning(true);

    const n = homeRoommates.length;
    const winnerIndex = Math.floor(Math.random() * n);
    const seg = 360 / n;
    const winnerCenter = winnerIndex * seg + seg / 2;
    const extraSpins = 5;
    const targetWithinTurn = (360 - winnerCenter) % 360;

    setRotation((prev) => {
      const prevMod = prev % 360;
      const delta = (targetWithinTurn - prevMod + 360) % 360;
      return prev + extraSpins * 360 + delta;
    });

    setTimeout(() => {
      const winner = homeRoommates[winnerIndex];
      setChores((cs) =>
        cs.map((c) => (c.id === selectedChoreId ? { ...c, assigneeId: winner.id } : c))
      );
      setResult({ choreId: selectedChoreId, roommateId: winner.id });
      setSpinning(false);
    }, 3200);
  }

  const wheelGradient =
    homeRoommates.length > 0
      ? `conic-gradient(${homeRoommates
          .map((r, i) => {
            const seg = 360 / homeRoommates.length;
            return `${r.shade} ${i * seg}deg ${(i + 1) * seg}deg`;
          })
          .join(", ")})`
      : "#2A2A2A";

  // --- Loading state ---
  if (checkingDevice) {
    return (
      <div className="ss-root" style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        {FONTS}
        <p className="ss-mono" style={{ fontSize: 12, color: "#6B6B6B" }}>Loading…</p>
      </div>
    );
  }

  // --- Join / create gate ---
  if (!suiteCode) {
    return (
      <div className="ss-root" style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        {FONTS}
        <div className="ss-card ss-fade-in" style={{ padding: 28, maxWidth: 380, width: "100%" }}>
          <div className="flex items-center gap-2 mb-1">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#000000", border: "1px solid #2A2A2A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HouseMark size={18} />
            </div>
            <h1 className="ss-display" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              SuiteSplit
            </h1>
          </div>
          <p style={{ fontSize: 13.5, color: "#9A9A9A", margin: "6px 0 20px" }}>
            Create a suite to get a join code, or enter one you already have to sync with your roommates' devices.
          </p>

          <button
            onClick={createSuite}
            className="ss-btn flex items-center justify-center gap-2"
            style={{ width: "100%", padding: "11px 0", borderRadius: 8, background: "#FFFFFF", color: "#000000", fontSize: 14, fontWeight: 700, marginBottom: 14 }}
          >
            Create a new suite <ArrowRight size={15} />
          </button>

          <div className="flex items-center gap-2" style={{ margin: "4px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: "#262626" }} />
            <span style={{ fontSize: 11.5, color: "#6B6B6B" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#262626" }} />
          </div>

          <label style={{ fontSize: 12.5, color: "#9A9A9A", display: "block", marginBottom: 6 }}>Join with a code</label>
          <div className="flex gap-2">
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinSuite()}
              placeholder="e.g. 7K2QP"
              maxLength={5}
              className="ss-mono ss-input"
              style={{ flex: 1, borderRadius: 8, padding: "9px 10px", fontSize: 15, letterSpacing: 2, textTransform: "uppercase" }}
            />
            <button
              onClick={joinSuite}
              className="ss-btn"
              style={{ padding: "0 16px", borderRadius: 8, background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#fff", fontSize: 14, fontWeight: 600 }}
            >
              Join
            </button>
          </div>
          {joinError && <p style={{ fontSize: 12.5, color: "#D9D9D9", marginTop: 8 }}>{joinError}</p>}
        </div>
      </div>
    );
  }

  // --- Main app ---
  return (
    <div className="ss-root" style={{ minHeight: "100%", padding: "24px 16px" }}>
      {FONTS}
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Header */}
        <header className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "#000000",
                border: "1px solid #2A2A2A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HouseMark size={20} />
            </div>
            <h1 className="ss-display" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              SuiteSplit
            </h1>
            <button
              onClick={copyCode}
              title="Copy join code"
              className="ss-btn ss-mono flex items-center gap-1.5"
              style={{
                marginLeft: 6,
                fontSize: 12.5,
                letterSpacing: 1.5,
                padding: "4px 9px",
                borderRadius: 999,
                background: "#141414",
                border: "1px solid #2A2A2A",
                color: "#FFFFFF",
              }}
            >
              {copied ? "Copied!" : suiteCode}
              <Copy size={11} />
            </button>
            <button
              onClick={leaveSuite}
              title="Leave this suite"
              className="ss-btn flex items-center"
              style={{ color: "#6B6B6B", padding: 4 }}
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Presence bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <Users size={16} style={{ color: "#8F8F8F" }} />
            {roommates.map((r) => (
              <button
                key={r.id}
                onClick={() => togglePresence(r.id)}
                className="ss-btn ss-avatar-ring flex items-center gap-2 px-3 py-1.5"
                title={r.home ? `${r.name} is home — tap to mark away` : `${r.name} is away — tap to mark home`}
                style={{
                  borderRadius: 999,
                  border: `1.5px solid ${r.home ? "#FFFFFF" : "#2A2A2A"}`,
                  background: r.home ? "#161616" : "#0A0A0A",
                  opacity: r.home ? 1 : 0.5,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: r.home ? "#FFFFFF" : "transparent",
                    border: r.home ? "none" : "1.5px solid #6B6B6B",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr" }}>
          <div className="grid gap-5" style={{ display: "grid", gridTemplateColumns: "1fr" }}>
            <div className="ss-card" style={{ padding: 20 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="ss-display" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Roommates</h2>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {roommates.map((r) => (
                  <span
                    key={r.id}
                    className="flex items-center gap-2 px-2.5 py-1"
                    style={{ borderRadius: 999, background: "#141414", border: "1px solid #2A2A2A", fontSize: 13 }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: r.shade }} />
                    {r.name}
                    <button onClick={() => removeRoommate(r.id)} aria-label={`Remove ${r.name}`} style={{ color: "#6B6B6B", display: "flex" }}>
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newRoommate}
                  onChange={(e) => setNewRoommate(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRoommate()}
                  placeholder="Add a roommate"
                  className="ss-input"
                  style={{ flex: 1, borderRadius: 8, padding: "8px 10px", fontSize: 14 }}
                />
                <button
                  onClick={addRoommate}
                  className="ss-btn flex items-center gap-1 px-3"
                  style={{ background: "#FFFFFF", color: "#000000", borderRadius: 8, fontSize: 14, fontWeight: 600 }}
                >
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-5" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(260px,1fr)" }}>
            {/* Chores */}
            <div className="ss-card" style={{ padding: 20 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="ss-display" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>This week's chores</h2>
                <span className="ss-mono" style={{ fontSize: 12, color: "#8F8F8F" }}>
                  {chores.filter((c) => c.done).length}/{chores.length} done
                </span>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  value={newChore}
                  onChange={(e) => setNewChore(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addChore()}
                  placeholder="Add a chore (e.g. Water plants)"
                  className="ss-input"
                  style={{ flex: 1, borderRadius: 8, padding: "8px 10px", fontSize: 14 }}
                />
                <button
                  onClick={addChore}
                  className="ss-btn flex items-center gap-1 px-3"
                  style={{ background: "#FFFFFF", color: "#000000", borderRadius: 8, fontSize: 14, fontWeight: 600 }}
                >
                  <Plus size={15} /> Add
                </button>
              </div>

              <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
                {chores.length === 0 && (
                  <li style={{ fontSize: 14, color: "#6B6B6B", padding: "12px 0" }}>
                    No chores yet — add the first one above.
                  </li>
                )}
                {chores.map((c) => {
                  const assignee = roommates.find((r) => r.id === c.assigneeId);
                  return (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3"
                      style={{
                        border: "1px solid #262626",
                        borderRadius: 10,
                        padding: "10px 12px",
                        background: c.done ? "#141414" : "#0D0D0D",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleDone(c.id)}
                          aria-label={c.done ? `Mark ${c.name} not done` : `Mark ${c.name} done`}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            border: `1.5px solid ${c.done ? "#FFFFFF" : "#3A3A3A"}`,
                            background: c.done ? "#FFFFFF" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {c.done && <Check size={13} color="#000000" />}
                        </button>
                        <span style={{ fontSize: 14, textDecoration: c.done ? "line-through" : "none", color: c.done ? "#6B6B6B" : "#FFFFFF" }}>
                          {c.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {assignee ? (
                          <span
                            className="flex items-center gap-1.5 px-2 py-0.5"
                            style={{ borderRadius: 999, background: "#1A1A1A", border: "1px solid #2A2A2A", fontSize: 12 }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: 999, background: assignee.shade }} />
                            {assignee.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#5A5A5A" }}>Unassigned</span>
                        )}
                        <button onClick={() => removeChore(c.id)} aria-label={`Delete ${c.name}`} style={{ color: "#5A5A5A", display: "flex" }}>
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Chore Roulette */}
            <div className="ss-card" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <RotateCw size={15} color="#FFFFFF" />
                <h2 className="ss-display" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Chore Roulette</h2>
              </div>
              <p style={{ fontSize: 12.5, color: "#8F8F8F", textAlign: "center", margin: "2px 0 14px" }}>
                Spins fairly among roommates who are <strong style={{ color: "#FFFFFF" }}>home</strong> right now.
              </p>

              <select
                value={selectedChoreId}
                onChange={(e) => setSelectedChoreId(e.target.value)}
                className="ss-input"
                style={{ width: "100%", borderRadius: 8, padding: "8px 10px", fontSize: 13.5, marginBottom: 16 }}
              >
                <option value="">Pick an unassigned chore…</option>
                {unassigned.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div style={{ position: "relative", width: 168, height: 168, marginBottom: 16 }}>
                <div
                  style={{
                    position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
                    width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent",
                    borderTop: "12px solid #FFFFFF", zIndex: 2,
                  }}
                />
                <div
                  className="ss-wheel-wrap"
                  style={{
                    width: "100%", height: "100%", borderRadius: "50%",
                    background: wheelGradient, border: "4px solid #FFFFFF",
                    transform: `rotate(${rotation}deg)`,
                    boxShadow: "inset 0 0 0 3px #000000",
                    position: "relative",
                  }}
                >
                  {homeRoommates.map((r, i) => {
                    const seg = 360 / homeRoommates.length;
                    const angle = i * seg + seg / 2;
                    // luminance check to keep initials legible against each shade
                    const hex = r.shade.replace("#", "");
                    const lum = parseInt(hex.slice(0, 2), 16) * 0.299 + parseInt(hex.slice(2, 4), 16) * 0.587 + parseInt(hex.slice(4, 6), 16) * 0.114;
                    const labelColor = lum > 150 ? "#000000" : "#FFFFFF";
                    return (
                      <span
                        key={r.id}
                        className="ss-mono"
                        style={{
                          position: "absolute", top: "50%", left: "50%",
                          transform: `rotate(${angle}deg) translate(0, -58px) rotate(${-angle}deg)`,
                          transformOrigin: "0 0",
                          fontSize: 12, fontWeight: 700, color: labelColor,
                        }}
                      >
                        {initials(r.name)}
                      </span>
                    );
                  })}
                </div>
                <div
                  style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                    width: 34, height: 34, borderRadius: "50%", background: "#000000", border: "2px solid #FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <RotateCw size={15} color="#FFFFFF" />
                </div>
              </div>

              <button
                onClick={spin}
                disabled={spinning || !selectedChoreId || homeRoommates.length === 0}
                className="ss-btn"
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 700,
                  background: spinning || !selectedChoreId || homeRoommates.length === 0 ? "#1A1A1A" : "#FFFFFF",
                  color: spinning || !selectedChoreId || homeRoommates.length === 0 ? "#5A5A5A" : "#000000",
                  cursor: spinning || !selectedChoreId || homeRoommates.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                {spinning ? "Spinning…" : "Spin"}
              </button>

              {homeRoommates.length === 0 && (
                <p style={{ fontSize: 12, color: "#9A9A9A", marginTop: 10, textAlign: "center" }}>
                  No one's marked home — toggle presence above first.
                </p>
              )}

              {result && !spinning && (
                <div className="ss-fade-in" style={{ marginTop: 12, textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#8F8F8F", margin: 0 }}>Assigned to</p>
                  <p className="ss-display" style={{ fontSize: 17, fontWeight: 700, margin: "2px 0 0" }}>
                    {roommates.find((r) => r.id === result.roommateId)?.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer style={{ textAlign: "center", marginTop: 28 }}>
          <p className="ss-mono" style={{ fontSize: 11, color: "#5A5A5A", letterSpacing: 0.4 }}>
            SUITESPLIT · fair chores, tracked presence
          </p>
        </footer>
      </div>
    </div>
  );
}
