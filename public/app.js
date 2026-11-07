const scenes = [...document.querySelectorAll(".scene")];
const progressFill = document.getElementById("progressFill");
const tableGlow = document.getElementById("tableGlow");
let currentScene = 1;
let litCount = 0;
let answersSaved = false;
let audioContext = null;
let musicStarted = false;

const LOCAL_STORAGE_KEY = "diwali_saved_responses_v1";

/* ==========================================================================
   CLOUD DATABASE CONFIGURATION (ALREADY CONNECTED & READY FOR GITHUB PAGES!)
   --------------------------------------------------------------------------
   1. A dedicated live cloud store (CLOUD_STORE_URL) is ALREADY pre-connected
      below so answers from ANY mobile phone automatically sync to your
      laptop's Admin Dashboard with zero setup!
   2. Optional: You can also paste your own Firebase Realtime Database URL
      or Supabase URL + Anon Key below if you prefer using your own account.
   ========================================================================== */
const CLOUD_STORE_URL = "https://api.restful-api.dev/objects/ff808181a09d98f701a1b60cf1a45c2e";
const FIREBASE_DB_URL = "";     // Optional: e.g. "https://your-project-default-rtdb.firebaseio.com"
const SUPABASE_URL = "";        // Optional: e.g. "https://xyzcompany.supabase.co"
const SUPABASE_ANON_KEY = "";   // Optional: your Supabase public anon key

/* ==========================================================================
   ADMIN LOGIN CREDENTIALS (CHANGE ADMIN USERNAME & PASSWORD HERE)
   ========================================================================== */
const ADMIN_CONFIG = {
  acceptedUsernames: ["admin", "diwaliadmin"],
  acceptedPasswords: [
    "admin",
    "admin123",
    "diwali123",
    "diwaliadmin",
    "1234",
    "ChangeThisAdminPassword123!"
  ]
};

function getLocalResponses() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalResponse(entry) {
  try {
    const list = getLocalResponses();
    const record = {
      id: Date.now(),
      friend_name: String(entry.name || "").trim(),
      answer_one: String(entry.answer1 || "").trim(),
      answer_two: String(entry.answer2 || "").trim(),
      answer_three: String(entry.answer3 || "").trim(),
      answer_four: String(entry.answer4 || "").trim(),
      answer_five: String(entry.answer5 || "").trim(),
      answer_six: String(entry.answer6 || "").trim(),
      answer_seven: String(entry.answer7 || "").trim(),
      created_at: new Date().toISOString()
    };
    list.unshift(record);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    return record;
  } catch {
    return null;
  }
}

async function saveCloudResponse(record) {
  if (!record) return;

  // 1. Pre-connected Cloud Store (works out of the box on GitHub Pages & Mobile)
  if (CLOUD_STORE_URL) {
    try {
      const { ok, data } = await safeFetchJson(CLOUD_STORE_URL);
      const existing = (ok && data && data.data && Array.isArray(data.data.responses))
        ? data.data.responses
        : [];
      const updated = [record, ...existing].slice(0, 200);
      await fetch(CLOUD_STORE_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "diwali_responses_store",
          data: { responses: updated }
        })
      });
    } catch (err) {
      console.warn("Cloud store sync warning:", err);
    }
  }

  // 2. Optional Firebase Realtime Database sync
  if (FIREBASE_DB_URL) {
    try {
      const base = FIREBASE_DB_URL.replace(/\/+$/, "");
      await fetch(`${base}/responses.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });
    } catch (err) {
      console.warn("Firebase save warning:", err);
    }
  }

  // 3. Optional Supabase REST API sync
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const base = SUPABASE_URL.replace(/\/+$/, "");
      await fetch(`${base}/rest/v1/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(record)
      });
    } catch (err) {
      console.warn("Supabase save warning:", err);
    }
  }
}

async function fetchCloudResponses() {
  const results = [];

  // 1. Fetch from Pre-connected Cloud Store
  if (CLOUD_STORE_URL) {
    try {
      const { ok, data } = await safeFetchJson(CLOUD_STORE_URL, { cache: "no-store" });
      if (ok && data && data.data && Array.isArray(data.data.responses)) {
        results.push(...data.data.responses);
      }
    } catch (_) {}
  }

  // 2. Fetch from Optional Firebase Realtime Database
  if (FIREBASE_DB_URL) {
    try {
      const base = FIREBASE_DB_URL.replace(/\/+$/, "");
      const { ok, data } = await safeFetchJson(`${base}/responses.json`, { cache: "no-store" });
      if (ok && data && typeof data === "object") {
        results.push(...Object.values(data).filter(item => item && item.friend_name));
      }
    } catch (_) {}
  }

  // 3. Fetch from Optional Supabase REST API
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const base = SUPABASE_URL.replace(/\/+$/, "");
      const { ok, data } = await safeFetchJson(`${base}/rest/v1/responses?select=*&order=created_at.desc`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (ok && Array.isArray(data)) {
        results.push(...data);
      }
    } catch (_) {}
  }

  return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// Safe fetch wrapper that never throws "Unexpected end of JSON input"
async function safeFetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  return { ok: response.ok, status: response.status, data };
}

function showScene(number) {
  currentScene = number;
  scenes.forEach((scene, index) => scene.classList.toggle("active", index === number - 1));
  progressFill.style.width = `${(number / 6) * 100}%`;
  if (number === 5) {
    stopFireworkShow();
    activeFireworkMode = "sky";
    modeTick = 0;
    launchSkyRocket(false);
    window.setTimeout(() => {
      if (currentScene === 5) launchSkyRocket(true, cw * 0.5, ch * 0.32);
    }, 650);
    animFrameId = requestAnimationFrame(renderPyrotechnicsLoop);
  } else if (number !== 2) {
    stopFireworkShow();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==========================================================================
   WEB AUDIO SYNTHESIS: PIANO + DISTINCT REALISTIC AUDIO FOR EACH CRACKER
   ========================================================================== */
function ensureAudio() {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(frequency, duration = 0.9, volume = 0.045) {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  } catch (_) { }
}

function createNoiseBuffer(ctx, seconds, decayRate = 0.15) {
  const bufferSize = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decayRate));
  }
  return buffer;
}

/* ==========================================================================
   CRACKER SOUND CONFIGURATION (CHANGE LAUNCH & CRACKING SOUNDS HERE)
   --------------------------------------------------------------------------
   Put your own .mp3 / .wav file paths inside public/ (for example:
   "./sounds/launch.mp3" and "./sounds/crack.mp3"), or leave "" to use the
   built-in synthesized cracker audio in playFireworkSound() below.
   ========================================================================== */
const CRACKER_AUDIO_CONFIG = {
  sky_launch: "./launch.mp3",       // Sound played WHILE LAUNCHING Sky Shots & Heart Sky Shot upward
  sky_boom: "./blast.mp3",          // Sound played WHILE CRACKING / BURSTING Colourful Sky Shots in the sky
  heart_boom: "./blast.mp3",        // Sound played WHILE CRACKING / BURSTING Grand Heart Sky Shot
  anar_roar: "./sparkling.mp3",     // Sound played while Flower Pot (Anar) is roaring & crackling
  chakra_whirr: "./sparkling.mp3",  // Sound played while Ground Chakra is spinning
  sparkler_sizzle: "./sparkling.mp3"// Sound played while Sparklers are sizzling
};

let activeLoopAudio = null;
let activeLoopType = null;
const activeOneShotAudios = new Set();

function stopCustomAudio() {
  if (activeLoopAudio) {
    try {
      activeLoopAudio.pause();
      activeLoopAudio.currentTime = 0;
    } catch (_) {}
    activeLoopAudio = null;
  }
  activeLoopType = null;
  activeOneShotAudios.forEach(a => {
    try {
      a.pause();
      a.currentTime = 0;
    } catch (_) {}
  });
  activeOneShotAudios.clear();
}

function resolveFallbackSrc(src) {
  const clean = src.replace(/^\.\//, "");
  return `../${clean}`;
}

function playCustomAudioFile(type, src, volume = 0.8) {
  if (!src) return false;
  const isContinuous = type === "anar_roar" || type === "chakra_whirr" || type === "sparkler_sizzle";

  // For continuous crackers (Flower Pot, Chakra, Sparkler), keep a single looping audio playing smoothly
  if (isContinuous) {
    if (activeLoopAudio && activeLoopType === type) {
      if (activeLoopAudio.paused) {
        activeLoopAudio.play().catch(() => {});
      }
      return true;
    }
    if (activeLoopAudio) {
      try {
        activeLoopAudio.pause();
        activeLoopAudio.currentTime = 0;
      } catch (_) {}
    }
    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = volume;
      let triedFallback = false;
      audio.addEventListener("error", () => {
        if (!triedFallback) {
          triedFallback = true;
          audio.src = resolveFallbackSrc(src);
          audio.play().catch(() => {});
        }
      });
      activeLoopAudio = audio;
      activeLoopType = type;
      audio.play().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  // For one-shot crackers (Sky Shot launch & Sky/Heart burst), play a fresh sound on every launch/burst
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    activeOneShotAudios.add(audio);
    let triedFallback = false;
    audio.addEventListener("error", () => {
      if (!triedFallback) {
        triedFallback = true;
        audio.src = resolveFallbackSrc(src);
        audio.play().catch(() => {});
      }
    });
    audio.addEventListener("ended", () => activeOneShotAudios.delete(audio));
    audio.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

function playFireworkSound(type) {
  // If you configured a custom audio file in CRACKER_AUDIO_CONFIG above, play it:
  if (CRACKER_AUDIO_CONFIG[type] && playCustomAudioFile(type, CRACKER_AUDIO_CONFIG[type])) {
    return;
  }

  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    if (type === "anar_roar") {
      // 1. FLOWER POT (ANAR): Warm roaring fountain whoosh + aluminum flitter crackle pops
      const buffer = createNoiseBuffer(ctx, 0.26, 0.14);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(750 + Math.random() * 350, now);
      filter.Q.value = 1.4;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.25);
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start(now);

      // Sharp crackling aluminum pop
      if (Math.random() < 0.7) {
        const popBuf = createNoiseBuffer(ctx, 0.04, 0.012);
        const pop = ctx.createBufferSource();
        pop.buffer = popBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.setValueAtTime(3200, now + 0.05);
        const popGain = ctx.createGain();
        popGain.gain.setValueAtTime(0.07, now + 0.05);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
        pop.connect(hp).connect(popGain).connect(ctx.destination);
        pop.start(now + 0.05);
      }
    } else if (type === "chakra_whirr") {
      // 2. CHAKRA: Fast rotational Doppler whirr + swishing spark stream
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(430, now + 0.11);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
      oscGain.gain.setValueAtTime(0.028, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(oscGain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);

      const swishBuf = createNoiseBuffer(ctx, 0.2, 0.09);
      const swish = ctx.createBufferSource();
      swish.buffer = swishBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(1600, now);
      bp.frequency.linearRampToValueAtTime(2600, now + 0.18);
      bp.Q.value = 2.2;
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.045, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      swish.connect(bp).connect(sGain).connect(ctx.destination);
      swish.start(now);
    } else if (type === "sparkler_sizzle") {
      // 3. SPARKLER: Crisp high-frequency metallic sizzle + tiny sharp magnesium ticks
      const sizzleBuf = createNoiseBuffer(ctx, 0.14, 0.05);
      const sizzle = ctx.createBufferSource();
      sizzle.buffer = sizzleBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(5200 + Math.random() * 1800, now);
      bp.Q.value = 3.0;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      sizzle.connect(bp).connect(gain).connect(ctx.destination);
      sizzle.start(now);

      // Tiny metallic sparkler tick
      const tickOsc = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tickOsc.type = "sine";
      tickOsc.frequency.setValueAtTime(6500 + Math.random() * 2500, now);
      tickGain.gain.setValueAtTime(0.02, now);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
      tickOsc.connect(tickGain).connect(ctx.destination);
      tickOsc.start(now);
      tickOsc.stop(now + 0.02);
    } else if (type === "sky_launch") {
      // 4. SKY SHOT LAUNCH: Mortar tube thump + aerodynamic rising whistle/whoosh
      const thump = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thump.type = "sine";
      thump.frequency.setValueAtTime(115, now);
      thump.frequency.exponentialRampToValueAtTime(36, now + 0.14);
      thumpGain.gain.setValueAtTime(0.11, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      thump.connect(thumpGain).connect(ctx.destination);
      thump.start(now);
      thump.stop(now + 0.16);

      // Rising shell whistle + whoosh
      const whistle = ctx.createOscillator();
      const wGain = ctx.createGain();
      whistle.type = "sine";
      whistle.frequency.setValueAtTime(340, now + 0.04);
      whistle.frequency.exponentialRampToValueAtTime(1380, now + 0.46);
      wGain.gain.setValueAtTime(0.001, now);
      wGain.gain.linearRampToValueAtTime(0.026, now + 0.08);
      wGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      whistle.connect(wGain).connect(ctx.destination);
      whistle.start(now + 0.04);
      whistle.stop(now + 0.5);
    } else if (type === "sky_boom" || type === "heart_boom") {
      // 5. AERIAL SHELL DETONATION: Sub-bass chest thump + wide explosion roar + delayed popcorn crackle
      const isHeart = type === "heart_boom";
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(isHeart ? 95 : 110, now);
      sub.frequency.exponentialRampToValueAtTime(24, now + (isHeart ? 0.55 : 0.4));
      subGain.gain.setValueAtTime(isHeart ? 0.24 : 0.18, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeart ? 0.58 : 0.42));
      sub.connect(subGain).connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 0.6);

      // Explosion noise roar
      const boomBuf = createNoiseBuffer(ctx, isHeart ? 0.85 : 0.62, isHeart ? 0.22 : 0.16);
      const noise = ctx.createBufferSource();
      noise.buffer = boomBuf;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(isHeart ? 420 : 520, now);
      lp.frequency.exponentialRampToValueAtTime(90, now + 0.6);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(isHeart ? 0.22 : 0.16, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeart ? 0.82 : 0.6));
      noise.connect(lp).connect(nGain).connect(ctx.destination);
      noise.start(now);

      // Delayed high-altitude crackling star pops
      for (let c = 0; c < (isHeart ? 7 : 4); c++) {
        const delay = 0.18 + Math.random() * 0.38;
        const cBuf = createNoiseBuffer(ctx, 0.045, 0.015);
        const cSrc = ctx.createBufferSource();
        cSrc.buffer = cBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = "bandpass";
        hp.frequency.setValueAtTime(2800 + Math.random() * 1800, now + delay);
        const cGain = ctx.createGain();
        cGain.gain.setValueAtTime(0.05, now + delay);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
        cSrc.connect(hp).connect(cGain).connect(ctx.destination);
        cSrc.start(now + delay);
      }
    }
  } catch (_) { }
}

function startPiano() {
  if (musicStarted) return;
  musicStarted = true;
  const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23];
  let index = 0;
  const playNext = () => {
    if (!musicStarted) return;
    playTone(notes[index % notes.length], 1.6, 0.018);
    index++;
    window.setTimeout(playNext, 620);
  };
  playNext();
}
document.addEventListener("pointerdown", startPiano, { once: true });

/* ==========================================================================
   SCENE 1: REALISTIC ORNATE CLAY DIYAS
   ========================================================================== */
document.querySelectorAll("#scene1 .diya").forEach(diya => {
  diya.addEventListener("click", () => lightDiya(diya));
  diya.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      lightDiya(diya);
    }
  });
});

function updateTableGlow() {
  if (!tableGlow) return;
  const ratio = litCount / 6;
  tableGlow.style.opacity = (0.15 + ratio * 0.85).toFixed(2);
  tableGlow.style.transform = `scale(${1 + ratio * 0.18})`;
}

function lightDiya(diya) {
  if (diya.classList.contains("lit")) return;
  diya.classList.add("lit");
  litCount++;
  updateTableGlow();
  playTone(580 + litCount * 45, 0.45, 0.038);
  document.getElementById("lampHint").textContent = litCount === 6
    ? "Beautiful. Every ornate diya is glowing with warm golden light. ✨"
    : `${6 - litCount} more ${6 - litCount === 1 ? "lamp" : "lamps"} to light…`;
  if (litCount === 6) {
    document.getElementById("lightAllBtn").classList.add("hidden");
    document.getElementById("toScene2").classList.remove("hidden");
  }
}

document.getElementById("lightAllBtn").addEventListener("click", () => {
  const order = [
    document.querySelector('#scene1 .diya[data-diya="0"]'),
    document.querySelector('#scene1 .diya[data-diya="3"]'),
    document.querySelector('#scene1 .diya[data-diya="4"]'),
    document.querySelector('#scene1 .diya[data-diya="1"]'),
    document.querySelector('#scene1 .diya[data-diya="2"]'),
    document.querySelector('#scene1 .diya[data-diya="5"]')
  ].filter(Boolean);
  order.forEach((diya, index) => {
    window.setTimeout(() => lightDiya(diya), index * 220);
  });
});

document.getElementById("toScene2").addEventListener("click", () => showScene(2));

/* ==========================================================================
   SCENE 2: REALISTIC PYROTECHNICS ENGINE
   ========================================================================== */
const canvas = document.getElementById("fireworksCanvas");
const ctx = canvas.getContext("2d");
const screenFlowerpots = document.getElementById("screenFlowerpots");
const leftAnarNozzle = document.getElementById("leftAnarNozzle");
const rightAnarNozzle = document.getElementById("rightAnarNozzle");
const propChakra = document.getElementById("propChakra");
const screenSparklers = document.getElementById("screenSparklers");
const leftSparklerTip = document.getElementById("leftSparklerTip");
const rightSparklerTip = document.getElementById("rightSparklerTip");

let cw = window.innerWidth;
let ch = window.innerHeight;
function resizeCanvas() {
  cw = window.innerWidth;
  ch = window.innerHeight;
  canvas.width = cw * window.devicePixelRatio;
  canvas.height = ch * window.devicePixelRatio;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let activeFireworkMode = null;
let animFrameId = null;
let particles = [];
let rockets = [];
let smokePuffs = [];
let shockwaves = [];
let skyFlashAlpha = 0;
let skyFlashColor = "255, 220, 160";
let chakraAngle = 0;
let modeTick = 0;
let skyShellTypeCounter = 0;

const fireworkMessages = {
  flowerpot: "Twin '27' Anar flower pots roaring from the left and right corners! ✨",
  chakra: "Spinning Zameen Chakri throwing a 360° vortex of golden sparks!",
  sparkler: "Corner Phuljhari sparklers sizzling brightly at the left and right edges!",
  sky: "Realistic multi-break aerial Sky Shots thundering across the night sky!",
  heart: "A single giant, radiant Heart Sky Shot lighting up the heavens for you! ♥"
};

function stopFireworkShow() {
  activeFireworkMode = null;
  stopCustomAudio();
  particles = [];
  rockets = [];
  smokePuffs = [];
  shockwaves = [];
  skyFlashAlpha = 0;
  screenFlowerpots.classList.add("hidden");
  propChakra.classList.add("hidden");
  screenSparklers.classList.add("hidden");
  ctx.clearRect(0, 0, cw, ch);
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function getElementCenter(el) {
  if (!el) return { x: cw / 2, y: ch * 0.85 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// 1. Emit twin Flower Pot (Anar) fountains from BOTH Bottom-Left and Bottom-Right Corners
function emitDualFlowerPotSparks() {
  const nozzles = [
    { el: leftAnarNozzle, tilt: 0.08 },
    { el: rightAnarNozzle, tilt: -0.08 }
  ];

  nozzles.forEach(({ el, tilt }) => {
    const origin = getElementCenter(el);
    const floorY = ch - 12;

    if (modeTick % 4 === 0) {
      smokePuffs.push({
        x: origin.x + (Math.random() - 0.5) * 16,
        y: origin.y - 12,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -1.4 - Math.random() * 1.2,
        radius: 14 + Math.random() * 16,
        alpha: 0.11,
        decay: 0.0025
      });
    }

    for (let i = 0; i < 9; i++) {
      const spreadAngle = -Math.PI / 2 + tilt + (Math.random() - 0.5) * 0.42;
      const speed = 8.5 + Math.random() * 11.5;
      const isFlitter = Math.random() < 0.3;
      const hue = isFlitter ? 52 : 30 + Math.random() * 22;
      const sat = "100%";
      const light = isFlitter ? "93%" : "66%";

      particles.push({
        x: origin.x + (Math.random() - 0.5) * 7,
        y: origin.y,
        px: origin.x,
        py: origin.y,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed,
        gravity: 0.25,
        drag: 0.992,
        size: isFlitter ? 2.8 + Math.random() * 1.6 : 1.9 + Math.random() * 2.1,
        color: `hsl(${hue}, ${sat}, ${light})`,
        coreColor: "#ffffff",
        alpha: 1,
        decay: 0.0075 + Math.random() * 0.008,
        floorY,
        canBounce: true,
        crackle: isFlitter && Math.random() < 0.35,
        kind: "fountain"
      });
    }
  });

  if (modeTick % 7 === 0) playFireworkSound("anar_roar");
}

// 2. Spawn Chakra (Ground Spinner) 360-degree spiral vortex sparks
function emitChakraSparks() {
  const wheelEl = propChakra.querySelector(".chakra-wheel-3d");
  const origin = getElementCenter(wheelEl || propChakra);
  chakraAngle += 0.46;
  const arms = 4;
  const radius = 26;

  for (let arm = 0; arm < arms; arm++) {
    const baseAngle = chakraAngle + (arm * Math.PI * 2) / arms;
    for (let j = 0; j < 3; j++) {
      const a = baseAngle + (Math.random() - 0.5) * 0.18;
      const sx = origin.x + Math.cos(a) * radius;
      const sy = origin.y + Math.sin(a) * radius * 0.55;
      const tangentAngle = a + Math.PI * 0.38;
      const speed = 5.5 + Math.random() * 6.5;
      const palette = ["#ffe066", "#ff922b", "#fff9db", "#ff6b6b", "#69db7c"];
      const color = palette[(arm + j) % palette.length];

      particles.push({
        x: sx,
        y: sy,
        px: sx,
        py: sy,
        vx: Math.cos(tangentAngle) * speed,
        vy: Math.sin(tangentAngle) * speed * 0.65 - 0.6,
        gravity: 0.08,
        drag: 0.965,
        size: 2.0 + Math.random() * 2.0,
        color,
        coreColor: "#ffffff",
        alpha: 1,
        decay: 0.022 + Math.random() * 0.015,
        kind: "chakra"
      });
    }
  }
  if (modeTick % 8 === 0) playFireworkSound("chakra_whirr");
}

// 3. Spawn realistic branching needle sparks from BOTH Far-Left and Far-Right Corner Sparklers
function emitDualSparklerSparks() {
  const tips = [leftSparklerTip, rightSparklerTip];
  tips.forEach(tipEl => {
    const pos = getElementCenter(tipEl);
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.2 + Math.random() * 6.8;
      const isGold = Math.random() < 0.78;
      particles.push({
        x: pos.x,
        y: pos.y,
        px: pos.x,
        py: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.09,
        drag: 0.945,
        size: 1.5 + Math.random() * 1.4,
        color: isGold ? "#ffd86b" : "#ffffff",
        coreColor: "#ffffff",
        alpha: 1,
        decay: 0.034 + Math.random() * 0.02,
        forkOnEnd: Math.random() < 0.44,
        kind: "sparkler"
      });
    }
  });
  if (modeTick % 6 === 0) playFireworkSound("sparkler_sizzle");
}

// 4. Launch a realistic aerial Sky Shot mortar shell
function launchSkyRocket(isHeart = false, targetXOverride = null, targetYOverride = null) {
  const startX = isHeart
    ? cw * 0.5
    : cw * (0.16 + Math.random() * 0.68);
  const startY = ch - 12;
  const targetX = targetXOverride ?? (isHeart ? cw * 0.5 : startX + (Math.random() - 0.5) * 150);
  const targetY = targetYOverride ?? (isHeart ? ch * 0.34 : ch * (0.14 + Math.random() * 0.25));

  const flightFrames = isHeart ? 46 : 40 + Math.random() * 14;
  const gravity = 0.12;
  const vx = (targetX - startX) / flightFrames;
  const vy = (targetY - startY - 0.5 * gravity * flightFrames * flightFrames) / flightFrames;

  // Muzzle flash smoke puff at mortar base
  smokePuffs.push({
    x: startX,
    y: startY - 8,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -1.8,
    radius: 18,
    alpha: 0.22,
    decay: 0.006
  });

  playFireworkSound("sky_launch");
  rockets.push({
    x: startX,
    y: startY,
    px: startX,
    py: startY,
    vx,
    vy,
    gravity,
    framesLeft: flightFrames,
    isHeart
  });
}

// Explode a realistic multi-layered Colourful Sky Shot burst with persistent comet trails & shockwave
function explodeColourfulSkyShot(x, y) {
  playFireworkSound("sky_boom");
  skyFlashColor = "255, 220, 165";
  skyFlashAlpha = 0.26;

  const shellType = skyShellTypeCounter++ % 3;
  const palettes = [
    { outer: ["#ffd43b", "#ff922b", "#fff3bf"], inner: ["#00f5d4", "#4cc9f0"] }, // Golden Brocade Willow + Cyan Pistil
    { outer: ["#ff2a6d", "#ff7597", "#ffd166"], inner: ["#69db7c", "#ffffff"] }, // Ruby Chrysanthemum + Emerald Core
    { outer: ["#b5179e", "#7209b7", "#4cc9f0"], inner: ["#fee440", "#ff9e00"] }  // Royal Amethyst Peony + Gold Crossette
  ];
  const pal = palettes[shellType];

  // Expanding luminous acoustic shockwave ring
  shockwaves.push({
    x,
    y,
    radius: 4,
    maxRadius: 155,
    alpha: 0.55,
    color: pal.outer[0]
  });

  // Illuminated aerial smoke cloud at burst center
  for (let s = 0; s < 4; s++) {
    smokePuffs.push({
      x: x + (Math.random() - 0.5) * 28,
      y: y + (Math.random() - 0.5) * 28,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.3 + (Math.random() - 0.5) * 0.4,
      radius: 26 + Math.random() * 24,
      alpha: 0.14,
      decay: 0.0022
    });
  }

  // Outer primary spherical shell (135 stars with multi-segment comet trails)
  const outerCount = 135;
  for (let i = 0; i < outerCount; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const baseSpeed = shellType === 0 ? 6.2 + Math.random() * 3.8 : 5.8 + Math.random() * 4.6;
    const speed = baseSpeed * Math.sin(phi);
    const color = pal.outer[i % pal.outer.length];

    particles.push({
      x,
      y,
      px: x,
      py: y,
      trail: [{ x, y }],
      maxTrail: shellType === 0 ? 11 : 7,
      vx: Math.cos(theta) * speed,
      vy: Math.sin(theta) * speed,
      gravity: shellType === 0 ? 0.105 : 0.082,
      drag: shellType === 0 ? 0.968 : 0.972,
      size: 2.3 + Math.random() * 1.6,
      color,
      coreColor: "#ffffff",
      alpha: 1,
      decay: shellType === 0 ? 0.0075 + Math.random() * 0.005 : 0.01 + Math.random() * 0.007,
      twinkle: true,
      crackle: i % 5 === 0,
      kind: "sky"
    });
  }

  // Inner contrasting pistil ring (55 stars)
  for (let i = 0; i < 55; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const speed = (2.8 + Math.random() * 2.2) * Math.sin(phi);
    const color = pal.inner[i % pal.inner.length];

    particles.push({
      x,
      y,
      px: x,
      py: y,
      trail: [{ x, y }],
      maxTrail: 5,
      vx: Math.cos(theta) * speed,
      vy: Math.sin(theta) * speed,
      gravity: 0.06,
      drag: 0.965,
      size: 2.0,
      color,
      coreColor: "#ffffff",
      alpha: 1,
      decay: 0.015 + Math.random() * 0.008,
      twinkle: true,
      kind: "sky"
    });
  }
}

// 5. Explode a SINGLE HUGE Realistic Heart Sky Shot in the sky
function explodeHugeHeartSkyShot(x, y) {
  playFireworkSound("heart_boom");
  skyFlashColor = "255, 105, 155";
  skyFlashAlpha = 0.34;

  shockwaves.push({
    x,
    y,
    radius: 6,
    maxRadius: 210,
    alpha: 0.6,
    color: "#ff4d8d"
  });

  const scale = Math.min(cw, ch) * 0.0148;

  // 1. Primary outer brilliant crimson/rose-pink heart silhouette (190 stars with glowing trails)
  const steps = 190;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

    const vx = hx * scale * (0.97 + Math.random() * 0.06);
    const vy = hy * scale * (0.97 + Math.random() * 0.06);

    particles.push({
      x,
      y,
      px: x,
      py: y,
      trail: [{ x, y }],
      maxTrail: 8,
      vx,
      vy,
      gravity: 0.03,
      drag: 0.945,
      size: 3.1 + Math.random() * 1.4,
      color: i % 3 === 0 ? "#ff2a6d" : i % 3 === 1 ? "#ff7597" : "#ffd166",
      coreColor: "#ffffff",
      alpha: 1,
      decay: 0.0062 + Math.random() * 0.0038,
      twinkle: true,
      crackle: i % 10 === 0,
      kind: "heart"
    });
  }

  // 2. Inner golden-rose heart contour (95 stars)
  for (let i = 0; i < 95; i++) {
    const t = (i / 95) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const vx = hx * scale * 0.62;
    const vy = hy * scale * 0.62;

    particles.push({
      x,
      y,
      px: x,
      py: y,
      trail: [{ x, y }],
      maxTrail: 6,
      vx,
      vy,
      gravity: 0.028,
      drag: 0.945,
      size: 2.3,
      color: "#ffe066",
      coreColor: "#ffffff",
      alpha: 1,
      decay: 0.0078 + Math.random() * 0.0045,
      twinkle: true,
      kind: "heart"
    });
  }

  // 3. Shimmering rose-gold core dust filling the heart
  for (let i = 0; i < 90; i++) {
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.85;
    const hx = 16 * Math.pow(Math.sin(t), 3) * r;
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * r;

    particles.push({
      x,
      y,
      px: x,
      py: y,
      vx: hx * scale,
      vy: hy * scale,
      gravity: 0.032,
      drag: 0.94,
      size: 1.8 + Math.random() * 1.4,
      color: Math.random() < 0.5 ? "#ff9ebb" : "#ffe8a3",
      coreColor: "#ffffff",
      alpha: 0.95,
      decay: 0.0085 + Math.random() * 0.005,
      twinkle: true,
      kind: "heart"
    });
  }
}

function renderPyrotechnicsLoop() {
  if (!activeFireworkMode) return;
  modeTick++;

  ctx.clearRect(0, 0, cw, ch);

  // Ambient sky flash on shell burst
  if (skyFlashAlpha > 0.005) {
    ctx.fillStyle = `rgba(${skyFlashColor}, ${skyFlashAlpha})`;
    ctx.fillRect(0, 0, cw, ch);
    skyFlashAlpha *= 0.86;
  }

  // Emit continuous particles based on selected cracker
  if (activeFireworkMode === "flowerpot") {
    emitDualFlowerPotSparks();
  } else if (activeFireworkMode === "chakra") {
    emitChakraSparks();
  } else if (activeFireworkMode === "sparkler") {
    emitDualSparklerSparks();
  } else if (activeFireworkMode === "sky") {
    if (modeTick % 36 === 2) {
      launchSkyRocket(false);
    }
  } else if (activeFireworkMode === "heart") {
    if (modeTick % 130 === 2) {
      launchSkyRocket(true, cw * 0.5, ch * 0.34);
    }
  }

  // Render soft smoke puffs
  ctx.globalCompositeOperation = "source-over";
  for (let i = smokePuffs.length - 1; i >= 0; i--) {
    const s = smokePuffs[i];
    s.x += s.vx;
    s.y += s.vy;
    s.radius += 0.35;
    s.alpha -= s.decay;
    if (s.alpha <= 0.004) {
      smokePuffs.splice(i, 1);
      continue;
    }
    const grad = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.radius);
    grad.addColorStop(0, `rgba(215, 190, 180, ${s.alpha})`);
    grad.addColorStop(1, "rgba(215, 190, 180, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "lighter";

  // Render expanding shockwave rings
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.radius += (sw.maxRadius - sw.radius) * 0.14;
    sw.alpha *= 0.88;
    if (sw.alpha <= 0.01) {
      shockwaves.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = sw.alpha;
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Update & draw rising mortar shells (rockets)
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.px = r.x;
    r.py = r.y;
    r.x += r.vx;
    r.y += r.vy;
    r.vy += r.gravity;
    r.framesLeft--;

    // Dense golden comet tail sparks
    for (let k = 0; k < 4; k++) {
      particles.push({
        x: r.x + (Math.random() - 0.5) * 3,
        y: r.y + (Math.random() - 0.5) * 3,
        px: r.x,
        py: r.y,
        vx: -r.vx * 0.22 + (Math.random() - 0.5) * 1.1,
        vy: -r.vy * 0.22 + (Math.random() - 0.5) * 1.1,
        gravity: 0.05,
        drag: 0.93,
        size: r.isHeart ? 2.7 : 2.1,
        color: r.isHeart ? "#ff8fa3" : "#ffd43b",
        coreColor: "#ffffff",
        alpha: 0.92,
        decay: 0.042,
        kind: "trail"
      });
    }

    // Bright shell head
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = r.isHeart ? 3.6 : 2.8;
    ctx.beginPath();
    ctx.moveTo(r.px, r.py);
    ctx.lineTo(r.x, r.y);
    ctx.stroke();

    if (r.framesLeft <= 0) {
      rockets.splice(i, 1);
      if (r.isHeart) {
        explodeHugeHeartSkyShot(r.x, r.y);
      } else {
        explodeColourfulSkyShot(r.x, r.y);
      }
    }
  }

  // Update & draw all pyrotechnic sparks
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.px = p.x;
    p.py = p.y;
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    if (p.trail) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > (p.maxTrail || 7)) {
        p.trail.shift();
      }
    }

    // Bounce Flower Pot sparks on the floor around the corners
    if (p.canBounce && p.floorY && p.y >= p.floorY && p.vy > 0) {
      p.y = p.floorY;
      p.vy = -p.vy * (0.34 + Math.random() * 0.22);
      p.vx *= 0.8;
    }

    // Sparkler characteristic branching micro-forks at end of needle
    if (p.forkOnEnd && p.alpha < 0.36) {
      p.forkOnEnd = false;
      for (let f = 0; f < 4; f++) {
        const fa = Math.random() * Math.PI * 2;
        const fs = 1.6 + Math.random() * 2.4;
        particles.push({
          x: p.x,
          y: p.y,
          px: p.x,
          py: p.y,
          vx: Math.cos(fa) * fs,
          vy: Math.sin(fa) * fs,
          gravity: 0.04,
          drag: 0.92,
          size: 1.2,
          color: "#fff3b0",
          coreColor: "#ffffff",
          alpha: 0.85,
          decay: 0.07,
          kind: "fork"
        });
      }
    }

    // Crackle starburst pop at tail end of sky/fountain stars
    if (p.crackle && p.alpha < 0.38) {
      p.crackle = false;
      for (let c = 0; c < 4; c++) {
        const ca = Math.random() * Math.PI * 2;
        const cs = 1.8 + Math.random() * 2.2;
        particles.push({
          x: p.x,
          y: p.y,
          px: p.x,
          py: p.y,
          vx: Math.cos(ca) * cs,
          vy: Math.sin(ca) * cs,
          gravity: 0.06,
          drag: 0.9,
          size: 1.4,
          color: "#ffffff",
          coreColor: "#ffffff",
          alpha: 0.95,
          decay: 0.075,
          kind: "fork"
        });
      }
    }

    if (p.alpha <= 0.01) {
      particles.splice(i, 1);
      continue;
    }

    const flickerAlpha = p.twinkle
      ? p.alpha * (0.64 + 0.36 * Math.sin(modeTick * 0.48 + i))
      : p.alpha;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, flickerAlpha));

    // Draw multi-segment tapering comet tail for Sky Shots & Heart Sky Shot
    if (p.trail && p.trail.length > 1) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let tIdx = 1; tIdx < p.trail.length; tIdx++) {
        ctx.lineTo(p.trail[tIdx].x, p.trail[tIdx].y);
      }
      ctx.stroke();
    } else {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // Hot white-gold tip core
    ctx.fillStyle = p.coreColor || "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  animFrameId = requestAnimationFrame(renderPyrotechnicsLoop);
}

document.querySelectorAll(".firework-card").forEach(card => {
  card.addEventListener("click", () => {
    const mode = card.dataset.firework;
    document.querySelectorAll(".firework-card").forEach(item => item.classList.remove("selected"));
    card.classList.add("selected");

    // If user clicks Sky Shots or Heart Sky Shot again while already in that mode, launch another shell without wiping the sky
    if (activeFireworkMode === mode && (mode === "sky" || mode === "heart")) {
      if (mode === "sky") {
        launchSkyRocket(false);
        window.setTimeout(() => {
          if (activeFireworkMode === "sky") launchSkyRocket(false);
        }, 220);
      } else {
        launchSkyRocket(true, cw * 0.5, ch * 0.34);
      }
      return;
    }

    stopFireworkShow();
    activeFireworkMode = mode;
    modeTick = 0;

    if (mode === "flowerpot") {
      screenFlowerpots.classList.remove("hidden");
      playFireworkSound("anar_roar");
    } else if (mode === "chakra") {
      propChakra.classList.remove("hidden");
      playFireworkSound("chakra_whirr");
    } else if (mode === "sparkler") {
      screenSparklers.classList.remove("hidden");
      playFireworkSound("sparkler_sizzle");
    } else if (mode === "sky") {
      launchSkyRocket(false);
      window.setTimeout(() => {
        if (activeFireworkMode === "sky") launchSkyRocket(false);
      }, 260);
    } else if (mode === "heart") {
      launchSkyRocket(true, cw * 0.5, ch * 0.34);
    }

    document.getElementById("fireworkHint").textContent = fireworkMessages[mode] || "";
    animFrameId = requestAnimationFrame(renderPyrotechnicsLoop);
  });
});

document.getElementById("toScene3").addEventListener("click", () => showScene(3));

/* ==========================================================================
   SCENE 3: FRIENDSHIP QUESTIONS (WITH AUTOMATIC FALLBACK STORAGE)
   ========================================================================== */
document.getElementById("friendForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById("formStatus");
  const submit = form.querySelector("button[type=submit]");
  const data = Object.fromEntries(new FormData(form).entries());

  status.textContent = "Saving your answers…";
  submit.disabled = true;

  const record = saveLocalResponse(data);
  await saveCloudResponse(record);

  try {
    const { ok, data: result } = await safeFetchJson("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!ok && result && result.error) {
      console.warn("Server save warning (saved locally):", result.error);
    }
  } catch (err) {
    console.warn("Backend offline or static server in use; saved response locally:", err);
  }

  answersSaved = true;
  status.textContent = "Your answers are saved. Thank you for sharing! ✨";
  playTone(660, 0.5, 0.035);
  window.setTimeout(() => showScene(4), 850);
});

/* ==========================================================================
   SCENE 4, 5, 6 & REPLAY
   ========================================================================== */
const giftButton = document.getElementById("giftButton");
giftButton.addEventListener("click", () => {
  if (giftButton.classList.contains("open")) return;
  giftButton.classList.add("open");
  playTone(784, 0.8, 0.04);
  document.getElementById("giftHint").classList.add("hidden");
  window.setTimeout(() => document.getElementById("giftMessage").classList.remove("hidden"), 650);
});

document.getElementById("toScene5").addEventListener("click", () => showScene(5));
document.getElementById("toScene6").addEventListener("click", () => showScene(6));

document.getElementById("replayBtn").addEventListener("click", () => {
  litCount = 0;
  answersSaved = false;
  updateTableGlow();
  document.querySelectorAll("#scene1 .diya").forEach(d => d.classList.remove("lit"));
  document.getElementById("lampHint").textContent = "Tap each ornate clay diya to light its cotton wick";
  document.getElementById("lightAllBtn").classList.remove("hidden");
  document.getElementById("toScene2").classList.add("hidden");
  document.querySelectorAll(".firework-card").forEach(c => c.classList.remove("selected"));
  stopFireworkShow();
  document.getElementById("fireworkHint").textContent = "Choose a firework to ignite the night ✨";
  document.getElementById("friendForm").reset();
  document.getElementById("friendForm").querySelector("button[type=submit]").disabled = false;
  document.getElementById("formStatus").textContent = "";
  giftButton.classList.remove("open");
  document.getElementById("giftHint").classList.remove("hidden");
  document.getElementById("giftMessage").classList.add("hidden");
  showScene(1);
});

document.querySelectorAll("[data-back]").forEach(button => {
  button.addEventListener("click", () => showScene(Number(button.dataset.back)));
});

/* ==========================================================================
   HIDDEN ADMIN ACCESS AT VERY RIGHT CORNER OF SCENE 1
   ========================================================================== */
const adminOverlay = document.getElementById("adminOverlay");
function openAdminModal() {
  if (currentScene !== 1) return;
  adminOverlay.classList.remove("hidden");
}
document.getElementById("adminSecret")?.addEventListener("click", openAdminModal);
document.getElementById("adminSecretTop")?.addEventListener("click", openAdminModal);
document.getElementById("closeAdmin").addEventListener("click", () => adminOverlay.classList.add("hidden"));

document.getElementById("adminLoginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const status = document.getElementById("adminStatus");
  status.textContent = "Checking…";
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  const userLower = username.toLowerCase();
  const isLocalValid =
    ADMIN_CONFIG.acceptedUsernames.some(u => u.toLowerCase() === userLower) &&
    ADMIN_CONFIG.acceptedPasswords.some(p => p === password || p.toLowerCase() === password.toLowerCase());

  let authenticated = isLocalValid;

  try {
    const { ok } = await safeFetchJson("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (ok) {
      authenticated = true;
    }
  } catch (_) { }

  if (!authenticated) {
    status.textContent = "Invalid username or password. Try: admin / admin123";
    return;
  }

  status.textContent = "";
  adminOverlay.classList.add("hidden");
  document.getElementById("experience").classList.add("hidden");
  document.getElementById("adminDashboard").classList.remove("hidden");
  await loadResponses();
});

async function loadResponses() {
  const list = document.getElementById("responsesList");
  list.innerHTML = '<p class="empty-state">Loading responses…</p>';

  let serverRows = [];
  try {
    const { ok, data } = await safeFetchJson("/api/admin/responses");
    if (ok && Array.isArray(data)) {
      serverRows = data;
    }
  } catch (_) { }

  const cloudRows = await fetchCloudResponses();
  const localRows = getLocalResponses();
  const seen = new Set();
  const rows = [];
  [...cloudRows, ...serverRows, ...localRows].forEach(row => {
    if (!row || !row.friend_name) return;
    const key = `${row.friend_name}|${row.answer_one}|${row.answer_two}|${row.answer_three}`;
    if (!seen.has(key)) {
      seen.add(key);
      rows.push(row);
    }
  });

  document.getElementById("responseCount").textContent = rows.length;
  if (!rows.length) {
    list.innerHTML = '<p class="empty-state">No friends have submitted answers yet. Their replies will appear here.</p>';
    return;
  }

  list.replaceChildren();
  rows.forEach(row => {
    const article = document.createElement("article");
    article.className = "response-card";
    const heading = document.createElement("h3");
    heading.textContent = row.friend_name;
    const time = document.createElement("time");
    time.textContent = new Date(row.created_at).toLocaleString();
    article.append(heading, time);
    const prompts = [
      ["02 · Three words to describe you", row.answer_two],
      ["03 · Memory that makes them smile", row.answer_one],
      ["04 · Something to do together", row.answer_three],
      ["05 · First impression of you", row.answer_four],
      ["06 · Funny habit that makes them laugh", row.answer_five],
      ["07 · What they love most about your friendship", row.answer_six],
      ["08 · Secret Diwali wish for you", row.answer_seven]
    ];
    prompts.forEach(([label, answer]) => {
      if (!answer) return;
      const p = document.createElement("p");
      const b = document.createElement("b");
      b.textContent = `${label}: `;
      p.append(b, document.createTextNode(answer));
      article.append(p);
    });
    list.append(article);
  });
}

async function logoutAdmin() {
  try {
    await safeFetchJson("/api/admin/logout", { method: "POST" });
  } catch (_) { }
  document.getElementById("adminDashboard").classList.add("hidden");
  document.getElementById("experience").classList.remove("hidden");
  showScene(1);
}

document.getElementById("refreshResponsesBtn")?.addEventListener("click", loadResponses);
document.getElementById("adminLogout").addEventListener("click", logoutAdmin);
document.getElementById("closeDashboard").addEventListener("click", logoutAdmin);
