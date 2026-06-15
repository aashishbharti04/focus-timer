const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

let remaining = WORK_MINUTES * 60;
let isWork = true;
let timerId = null;

const timeEl = document.getElementById("time");
const modeEl = document.getElementById("mode");

function render() {
  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  timeEl.textContent = `${m}:${s}`;
  modeEl.textContent = isWork ? "Work session" : "Break time";
}

function tick() {
  if (remaining > 0) {
    remaining--;
    render();
  } else {
    // Switch between work and break automatically
    isWork = !isWork;
    remaining = (isWork ? WORK_MINUTES : BREAK_MINUTES) * 60;
    render();
  }
}

function start() {
  if (timerId) return;
  timerId = setInterval(tick, 1000);
}

function pause() {
  clearInterval(timerId);
  timerId = null;
}

function reset() {
  pause();
  isWork = true;
  remaining = WORK_MINUTES * 60;
  render();
}

document.getElementById("start").addEventListener("click", start);
document.getElementById("pause").addEventListener("click", pause);
document.getElementById("reset").addEventListener("click", reset);

render();
