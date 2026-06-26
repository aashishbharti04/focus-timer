// Focus Timer — dependency-free Pomodoro timer
const DEFAULTS = { work: 25, brk: 5, long: 15 };
const RING_CIRC = 2 * Math.PI * 110; // circumference of the progress ring

const store = {
  get(k, d) { const v = localStorage.getItem("ft_" + k); return v === null ? d : v; },
  set(k, v) { try { localStorage.setItem("ft_" + k, v); } catch (_) {} }
};

function clampInt(v, min, max) {
  v = parseInt(v, 10);
  if (isNaN(v)) v = min;
  return Math.max(min, Math.min(max, v));
}

let settings = {
  work: clampInt(store.get("work", DEFAULTS.work), 1, 120),
  brk: clampInt(store.get("brk", DEFAULTS.brk), 1, 60),
  long: clampInt(store.get("long", DEFAULTS.long), 1, 60)
};

let phase = "work";            // "work" | "break" | "long"
let total = settings.work * 60;
let remaining = total;
let timerId = null;
let completed = clampInt(store.get("completed", 0), 0, 1e6);

const timeEl = document.getElementById("time");
const modeEl = document.getElementById("mode");
const ringEl = document.getElementById("ring");
const sessionsEl = document.getElementById("sessions");
const taskEl = document.getElementById("task");

function phaseMinutes() {
  return phase === "work" ? settings.work : phase === "long" ? settings.long : settings.brk;
}
function phaseLabel() {
  return phase === "work" ? "Work session" : phase === "long" ? "Long break" : "Break time";
}

function render() {
  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  timeEl.textContent = `${m}:${s}`;
  modeEl.textContent = phaseLabel();
  // Show the countdown in the browser tab so it's visible while you work elsewhere
  document.title = `${m}:${s} — Focus Timer`;
  ringEl.style.strokeDasharray = RING_CIRC;
  ringEl.style.strokeDashoffset = RING_CIRC * (1 - remaining / total);
  sessionsEl.textContent = `Pomodoros completed: ${completed}`;
}

// A short chime so you notice a session ended without watching the screen
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = phase === "work" ? 880 : 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch (_) {}
}

function notify(msg) {
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification("Focus Timer", { body: msg }); } catch (_) {}
  }
}

function nextPhase() {
  if (phase === "work") {
    completed++;
    store.set("completed", completed);
    // A longer break after every 4 completed work sessions
    phase = completed % 4 === 0 ? "long" : "break";
  } else {
    phase = "work";
  }
  total = phaseMinutes() * 60;
  remaining = total;
  chime();
  notify(phase === "work" ? "Break over — back to work!" : "Session complete — take a break.");
}

function tick() {
  if (remaining > 0) {
    remaining--;
    render();
  } else {
    nextPhase();
    render();
  }
}

function start() {
  if (timerId) return;
  // Ask once for permission so end-of-session notifications can show
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
  timerId = setInterval(tick, 1000);
}

function pause() {
  clearInterval(timerId);
  timerId = null;
}

function reset() {
  pause();
  phase = "work";
  total = settings.work * 60;
  remaining = total;
  render();
}

document.getElementById("start").addEventListener("click", start);
document.getElementById("pause").addEventListener("click", pause);
document.getElementById("reset").addEventListener("click", reset);

// Settings — customizable, remembered between visits
const setWork = document.getElementById("set-work");
const setBreak = document.getElementById("set-break");
const setLong = document.getElementById("set-long");
setWork.value = settings.work;
setBreak.value = settings.brk;
setLong.value = settings.long;

function onSetting() {
  settings.work = clampInt(setWork.value, 1, 120);
  settings.brk = clampInt(setBreak.value, 1, 60);
  settings.long = clampInt(setLong.value, 1, 60);
  setWork.value = settings.work;
  setBreak.value = settings.brk;
  setLong.value = settings.long;
  store.set("work", settings.work);
  store.set("brk", settings.brk);
  store.set("long", settings.long);
  if (!timerId) reset(); // apply new lengths immediately while idle
}
[setWork, setBreak, setLong].forEach((el) => el.addEventListener("change", onSetting));

// Remember the current focus task across reloads
taskEl.value = store.get("task", "");
taskEl.addEventListener("input", () => store.set("task", taskEl.value));

// Press Space to toggle start/pause without reaching for the mouse
document.addEventListener("keydown", (e) => {
  if (e.target === taskEl) return; // don't hijack space while typing the task
  if (e.code === "Space") {
    e.preventDefault();
    timerId ? pause() : start();
  }
});

render();
