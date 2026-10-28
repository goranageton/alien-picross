/**
 * Retro Picross Archaeologist - Application Logic
 * Supports:
 * 1. Complete set of 64 levels (1-A to 8-H) + 15x15 Game Boy puzzles
 * 2. Persistent localStorage saving (FIRST, TIMES, BEST, Cleared status & stamps)
 * 3. Classic Mario's Picross Hint Roulette (Row & Column reveal)
 * 4. Multi-channel 8-Bit Chiptune Background Music & Sound Effects (Web Audio API)
 * 5. Authentic penalties (-2m, -4m, -8m, screen shake, buzzer) & Real-time clue dimming
 */

// ========================================================
// 1. 8-BIT AUDIO & CHIPTUNE MUSIC ENGINE
// ========================================================

class RetroAudioEngine {
  constructor() {
    this.ctx = null;
    this.sfxMuted = false;
    this.bgmMuted = false;
    this.currentTrack = null;
    this.stepIndex = 0;
    this.musicTimer = null;
    this.noiseBuffer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.createNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.1;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  // --- SOUND EFFECTS ---

  playBlip() {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(480, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(960, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }

  // Crisp 8-Bit Laser Pew Sound Effect (A - ZAP)
  playLaserZap() {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      // Fast snappy laser pew frequency dive 1800Hz -> 90Hz in 0.085s
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.085);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);
    } catch (e) {}
  }

  playChisel() {
    this.playLaserZap();
  }

  // Sci-fi Forcefield Pulse Sound Effect (B - SHIELD)
  playShield() {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      // Forcefield barrier chirp: 320Hz -> 680Hz
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  playMarkX() {
    this.playShield();
  }

  playSelect() {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.07);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  // Dissonant Extraterrestrial Siren & Alarm (Mis-zap Penalty)
  playAlienBuzzer() {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.linearRampToValueAtTime(70, now + 0.28);
      osc2.frequency.setValueAtTime(310, now);
      osc2.frequency.linearRampToValueAtTime(90, now + 0.28);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.32);
      osc2.stop(now + 0.32);
    } catch (e) {}
  }

  playBuzzer() {
    this.playAlienBuzzer();
  }

  playRouletteTick() {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(700, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.025);
    } catch (e) {}
  }

  playRouletteWin() {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = this.ctx.currentTime;
      notes.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.1, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.14);
      });
    } catch (e) {}
  }

  playFanfare() {
    if (this.sfxMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.22);
      });
    } catch (e) {}
  }

  // --- 8-BIT CHIPTUNE MUSIC SYNTHESIS ---

  startMusic(trackName) {
    if (this.currentTrack === trackName && this.musicTimer) return;
    this.stopMusic();
    this.currentTrack = trackName;
    if (this.bgmMuted) return;
    this.init();
    if (!this.ctx) return;

    this.stepIndex = 0;
    const stepDuration = 125; // 120 BPM 16th notes = 125ms

    this.musicTimer = setInterval(() => {
      if (this.bgmMuted || !this.ctx) return;
      if (trackName === 'game') {
        this.tickGameTheme(this.stepIndex);
      } else if (trackName === 'menu') {
        this.tickMenuTheme(this.stepIndex);
      }
      this.stepIndex = (this.stepIndex + 1) % 64;
    }, stepDuration);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTrack = null;
  }

  toggleBGM() {
    this.bgmMuted = !this.bgmMuted;
    if (this.bgmMuted) {
      this.stopMusic();
    } else {
      const track = (State.currentScreen === 'game-board' || State.currentScreen === 'gameboy-view') ? 'game' : 'menu';
      this.startMusic(track);
    }
    saveSettings();
    return !this.bgmMuted;
  }

  toggleSFX() {
    this.sfxMuted = !this.sfxMuted;
    saveSettings();
    return !this.sfxMuted;
  }

  // Extraterrestrial Theremin / Space Tone with Vibrato LFO
  playThereminTone(freq, gainVal = 0.06, dur = 0.22) {
    if (!this.ctx || freq <= 0) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // 5.5Hz pitch vibrato for eerie B-movie UFO / Area 51 atmosphere
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(5.5, now);
      lfoGain.gain.setValueAtTime(freq * 0.038, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + dur);
      osc.stop(now + dur);
    } catch (e) {}
  }

  // Catchy, Comical 8-Bit Sci-Fi Chiptune / Theremin BGM
  tickGameTheme(step) {
    // Comical extraterrestrial melody (syncopated, playful space boogie)
    const melody = [
      523.25, 0, 659.25, 523.25, 783.99, 0, 659.25, 0,
      880.00, 0, 783.99, 0, 659.25, 587.33, 523.25, 0,
      440.00, 0, 523.25, 440.00, 659.25, 0, 523.25, 0,
      587.33, 0, 659.25, 0, 783.99, 0, 880.00, 0,
      1046.50, 0, 880.00, 0, 783.99, 659.25, 587.33, 0,
      659.25, 0, 783.99, 0, 880.00, 783.99, 659.25, 0,
      587.33, 0, 523.25, 0, 440.00, 392.00, 329.63, 0,
      392.00, 0, 440.00, 0, 523.25, 0, 0, 0
    ];

    // Bouncy staccato walking bassline
    const bass = [
      130.81, 0, 196.00, 0, 164.81, 0, 196.00, 0,
      174.61, 0, 220.00, 0, 196.00, 0, 146.83, 0,
      110.00, 0, 164.81, 0, 130.81, 0, 164.81, 0,
      146.83, 0, 174.61, 0, 196.00, 0, 220.00, 0,
      130.81, 0, 196.00, 0, 164.81, 0, 196.00, 0,
      174.61, 0, 220.00, 0, 196.00, 0, 146.83, 0,
      146.83, 0, 174.61, 0, 130.81, 0, 98.00, 0,
      130.81, 0, 164.81, 0, 196.00, 0, 130.81, 0
    ];

    const note = melody[step];
    if (note > 0) {
      if (step % 4 === 0) {
        this.playThereminTone(note, 0.065, 0.22);
      } else {
        this.playTone(note, 'square', 0.045, 0.08);
      }
    }

    const bassNote = bass[step];
    if (bassNote > 0) this.playTone(bassNote, 'triangle', 0.085, 0.1);

    // Punchy 8-bit drum kit
    if (step % 8 === 4) {
      this.playNoiseSnare();
    } else if (step % 4 === 2) {
      this.playNoiseHiHat();
    }
  }

  // Sci-Fi Ambient / Mothership Area 51 Menu Pattern
  tickMenuTheme(step) {
    const melody = [
      261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 0,
      220.00, 261.63, 329.63, 440.00, 329.63, 261.63, 220.00, 0,
      174.61, 220.00, 261.63, 349.23, 261.63, 220.00, 174.61, 0,
      196.00, 246.94, 293.66, 392.00, 293.66, 246.94, 196.00, 0
    ];

    const idx = step % 32;
    const note = melody[idx];
    if (note > 0 && idx % 2 === 0) {
      if (idx % 4 === 0) {
        this.playThereminTone(note, 0.05, 0.22);
      } else {
        this.playTone(note, 'square', 0.03, 0.16);
      }
    }
    if (idx % 8 === 0) {
      this.playTone(note ? note / 2 : 130.81, 'triangle', 0.06, 0.3);
    }
  }

  playTone(freq, type, gainVal, dur) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch (e) {}
  }

  playNoiseSnare() {
    if (!this.ctx || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 800;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(now);
      source.stop(now + 0.08);
    } catch (e) {}
  }

  playNoiseHiHat() {
    if (!this.ctx || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 4000;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(now);
      source.stop(now + 0.03);
    } catch (e) {}
  }
}

const sound = new RetroAudioEngine();

// ========================================================
// 2. DATA & PERSISTENCE (LOCALSTORAGE)
// ========================================================

const STORAGE_KEY = 'retro_picross_archaeo_save_v1';

const DIFFICULTY_CONFIG = {
  easy: {
    minutes: 30,
    seconds: 1800,
    badge: '30M'
  },
  medium: {
    minutes: 20,
    seconds: 1200,
    badge: '20M'
  },
  hard: {
    minutes: 15,
    seconds: 900,
    badge: '15M'
  }
};

function getStartingSeconds(diff = State.difficulty) {
  return DIFFICULTY_CONFIG[diff]?.seconds || 1800;
}

const State = {
  lang: 'sv', // 'sv' (default) or 'en'
  difficulty: 'easy', // 'easy' (30m), 'medium' (20m), 'hard' (15m)
  statsDifficultyTab: 'easy', // 'easy', 'medium', 'hard', 'all'
  currentScreen: 'main-menu',
  selectedLevelId: '1-A',
  stats: {},
  // 10x10 board state
  board10: {
    puzzleKey: '1-A',
    userGrid: [], // 0 = empty, 1 = dug, 2 = X
    cursorIndex: 74,
    timerSeconds: 1800,
    timerInterval: null,
    isPaused: false,
    isCompleted: false,
    mistakes: 0,
    toolMode: 'chisel' // 'chisel' or 'mark-x'
  },
  // 15x15 board state
  board15: {
    puzzleKey: 'GB-1',
    cursorRow: 7,
    cursorCol: 7,
    userGrid: [],
    timerSeconds: 1782,
    timerInterval: null,
    toolMode: 'chisel'
  }
};

function getTranslations() {
  const dict = window.UI_TRANSLATIONS || {};
  return dict[State.lang] || dict['sv'] || {};
}

function loadGameData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.stats) State.stats = parsed.stats;
      if (parsed.lang === 'sv' || parsed.lang === 'en') State.lang = parsed.lang;
      if (parsed.difficulty && ['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
        State.difficulty = parsed.difficulty;
      }
      if (parsed.statsDifficultyTab && ['easy', 'medium', 'hard', 'all'].includes(parsed.statsDifficultyTab)) {
        State.statsDifficultyTab = parsed.statsDifficultyTab;
      }
      if (typeof parsed.bgmMuted === 'boolean') sound.bgmMuted = parsed.bgmMuted;
      if (typeof parsed.sfxMuted === 'boolean') sound.sfxMuted = parsed.sfxMuted;
    }
  } catch (e) {
    console.warn('Could not read save data from localStorage', e);
  }

  // Guarantee all 64 levels exist in stats with backwards-compatible difficulty categories
  const rows = ['1','2','3','4','5','6','7','8'];
  const cols = ['A','B','C','D','E','F','G','H'];
  rows.forEach(r => {
    cols.forEach(c => {
      const id = `${r}-${c}`;
      if (!State.stats[id]) {
        State.stats[id] = {
          cleared: false,
          first: '--:--',
          best: '--:--',
          times: 0,
          byDiff: {
            easy: { first: '--:--', best: '--:--', times: 0, top5: [] },
            medium: { first: '--:--', best: '--:--', times: 0, top5: [] },
            hard: { first: '--:--', best: '--:--', times: 0, top5: [] }
          }
        };
      } else if (!State.stats[id].byDiff) {
        // Migrate existing saves into easy category
        const prevBest = State.stats[id].best;
        const prevSecs = prevBest && prevBest !== '--:--' ? parseSeconds(prevBest) : null;
        State.stats[id].byDiff = {
          easy: {
            first: State.stats[id].first || '--:--',
            best: prevBest || '--:--',
            times: State.stats[id].times || 0,
            top5: prevSecs != null && prevSecs < 999999 ? [prevSecs] : []
          },
          medium: { first: '--:--', best: '--:--', times: 0, top5: [] },
          hard: { first: '--:--', best: '--:--', times: 0, top5: [] }
        };
      }
    });
  });
}

function saveGameData() {
  try {
    const payload = {
      lang: State.lang,
      difficulty: State.difficulty,
      statsDifficultyTab: State.statsDifficultyTab,
      stats: State.stats,
      bgmMuted: sound.bgmMuted,
      sfxMuted: sound.sfxMuted
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not write save data to localStorage', e);
  }
}

function setDifficulty(diff) {
  if (!DIFFICULTY_CONFIG[diff]) return;
  sound.playBlip();
  State.difficulty = diff;
  saveGameData();
  updateDifficultyUI();
  updateLanguageUI();
  if (State.currentScreen === 'level-select') {
    updateStatsDashboard(State.selectedLevelId);
  }
}

function updateDifficultyUI() {
  const diff = State.difficulty || 'easy';
  const t = getTranslations();
  const isSv = State.lang === 'sv';

  // Modal active buttons
  const diffBtns = document.querySelectorAll('.diff-select-btn');
  diffBtns.forEach(btn => {
    if (btn.dataset.diff === diff) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Main menu settings button badge
  const menuBadge = document.getElementById('menu-settings-badge');
  if (menuBadge) {
    const diffEmoji = diff === 'easy' ? '🟢 30M' : diff === 'medium' ? '🟡 20M' : '🔴 15M';
    const flag = isSv ? '🇸🇪' : '🇬🇧';
    menuBadge.innerText = `${diffEmoji} • ${flag}`;
  }

  // Settings modal header badge & description
  const modalBadge = document.getElementById('settings-diff-current-badge');
  if (modalBadge) {
    modalBadge.innerText = `${DIFFICULTY_CONFIG[diff].minutes} MIN`;
  }

  const descEl = document.getElementById('settings-diff-desc');
  if (descEl) {
    if (diff === 'easy') descEl.innerText = t.diffEasyDesc || '🟢 LÄTT: 30 MINUTER STRÅLTID (AVSLAPPNAD)';
    else if (diff === 'medium') descEl.innerText = t.diffMediumDesc || '🟡 MEDEL: 20 MINUTER STRÅLTID (STANDARD)';
    else if (diff === 'hard') descEl.innerText = t.diffHardDesc || '🔴 SVÅR: 15 MINUTER STRÅLTID (EXPERTRUSCH!)';
  }

  // Active language buttons in settings modal
  const langBtns = document.querySelectorAll('.lang-select-btn');
  langBtns.forEach(btn => {
    if (btn.dataset.lang === State.lang) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function toggleLanguage() {
  sound.playBlip();
  State.lang = State.lang === 'sv' ? 'en' : 'sv';
  saveGameData();
  updateLanguageUI();
  updateAudioButtonsUI();
  updateToolModeUI();

  if (State.currentScreen === 'level-select') {
    renderLevelMatrix();
    updateLevelStats(State.selectedLevelId);
  } else if (State.currentScreen === 'game-board') {
    const puzzle = getPuzzle10(State.board10.puzzleKey);
    const badge = document.getElementById('current-level-badge');
    const t = getTranslations();
    if (badge) {
      badge.innerText = `${t.ufoScanPrefix} [${State.board10.puzzleKey}: ${puzzle.name}]`;
    }
  }
}

function updateLanguageUI() {
  const t = getTranslations();
  const isSv = State.lang === 'sv';

  // Menu Screen
  const menuHowTo = document.getElementById('menu-btn-how-to');
  if (menuHowTo) menuHowTo.innerText = t.howToAbduct;

  const menuPicross = document.querySelector('#menu-btn-picross span.inline-block');
  if (menuPicross) menuPicross.innerText = t.galacticPicross;

  const menuGameboy = document.getElementById('menu-btn-gameboy');
  if (menuGameboy) menuGameboy.innerText = t.mothership15;

  const menuSettingsText = document.getElementById('menu-settings-text');
  if (menuSettingsText) menuSettingsText.innerText = t.menuSettingsBtn || 'INSTÄLLNINGAR';

  const menuExit = document.getElementById('menu-btn-exit');
  if (menuExit) menuExit.innerText = t.exitGame;

  // Settings Modal
  const setModalTitle = document.getElementById('settings-modal-title');
  if (setModalTitle) setModalTitle.innerText = t.settingsTitle || '★ SPELINSTÄLLNINGAR ★';

  const setDiffTitle = document.getElementById('settings-diff-title');
  if (setDiffTitle) setDiffTitle.innerText = t.settingsDiffTitle || '🎯 SVÅRIGHETSGRAD (STRÅLTID):';

  const diffBtnEasy = document.getElementById('diff-btn-easy');
  if (diffBtnEasy) diffBtnEasy.innerHTML = `🟢 ${t.diffEasy || 'LÄTT (30M)'}<br/><span class="text-[6.5px] opacity-80 font-mono">30 MIN</span>`;
  const diffBtnMed = document.getElementById('diff-btn-medium');
  if (diffBtnMed) diffBtnMed.innerHTML = `🟡 ${t.diffMedium || 'MEDEL (20M)'}<br/><span class="text-[6.5px] opacity-80 font-mono">20 MIN</span>`;
  const diffBtnHard = document.getElementById('diff-btn-hard');
  if (diffBtnHard) diffBtnHard.innerHTML = `🔴 ${t.diffHard || 'SVÅR (15M)'}<br/><span class="text-[6.5px] opacity-80 font-mono">15 MIN</span>`;

  const setLangTitle = document.getElementById('settings-lang-title');
  if (setLangTitle) setLangTitle.innerText = t.settingsLangTitle || '🌐 SPRÅK / LANGUAGE:';

  const setAudioTitle = document.getElementById('settings-audio-title');
  if (setAudioTitle) setAudioTitle.innerText = t.settingsAudioTitle || '🔊 LJUD & MUSIK:';

  const setConfirmBtn = document.getElementById('settings-confirm-btn');
  if (setConfirmBtn) setConfirmBtn.innerText = t.settingsSaveBtn || 'SPARA OCH TILLBAKA (A)';

  // Level Select Screen
  const selTargetHeader = document.querySelector('#screen-level-select h1');
  if (selTargetHeader) selTargetHeader.innerText = t.selectTarget;

  const tabEasy = document.getElementById('tab-btn-easy');
  if (tabEasy) tabEasy.innerText = t.tabEasy || '🟢 LÄTT (30M)';
  const tabMed = document.getElementById('tab-btn-medium');
  if (tabMed) tabMed.innerText = t.tabMedium || '🟡 MEDEL (20M)';
  const tabHard = document.getElementById('tab-btn-hard');
  if (tabHard) tabHard.innerText = t.tabHard || '🔴 SVÅR (15M)';
  const tabAll = document.getElementById('tab-btn-all');
  if (tabAll) tabAll.innerText = t.tabAll || 'ALLA';

  const statsFirstLabel = document.getElementById('stats-first-label');
  if (statsFirstLabel) statsFirstLabel.innerText = t.firstTime;
  const statsTimesLabel = document.getElementById('stats-times-label');
  if (statsTimesLabel) statsTimesLabel.innerText = t.timesPlayed;
  const statsBestLabel = document.getElementById('stats-best-label');
  if (statsBestLabel) statsBestLabel.innerText = t.bestTime;
  const statsTop5Btn = document.getElementById('stats-top5-action-btn');
  if (statsTop5Btn) statsTop5Btn.innerHTML = `<span>${t.top5Btn || '🏆 TOP 5 TIDER ▸'}</span>`;

  const lvlBackBtn = document.getElementById('level-select-exit-btn');
  if (lvlBackBtn) lvlBackBtn.innerText = t.levelSelectBack;
  const lvlActionBtn = document.getElementById('level-select-action-btn');
  if (lvlActionBtn) lvlActionBtn.innerText = t.levelSelectStart;

  // Top 5 Modal
  const top5Close = document.getElementById('top5-close-btn');
  if (top5Close) top5Close.innerText = t.top5CloseBtn || 'TILLBAKA (B)';
  const top5EasyH = document.getElementById('top5-easy-title');
  if (top5EasyH) top5EasyH.innerHTML = `<span>🟢</span> <span>${t.top5EasyHeader || 'LÄTT (30 MIN STRÅLTID)'}</span>`;
  const top5MedH = document.getElementById('top5-medium-title');
  if (top5MedH) top5MedH.innerHTML = `<span>🟡</span> <span>${t.top5MediumHeader || 'MEDEL (20 MIN STRÅLTID)'}</span>`;
  const top5HardH = document.getElementById('top5-hard-title');
  if (top5HardH) top5HardH.innerHTML = `<span>🔴</span> <span>${t.top5HardHeader || 'SVÅR (15 MIN STRÅLTID)'}</span>`;

  // Board Screen
  const scannerBanner = document.querySelector('#game-board-container div div.py-1\\.5 span:first-child');
  if (scannerBanner) scannerBanner.innerText = t.scannerTitle;

  const beamTimeLabel = document.querySelector('#picross-timer-10')?.parentElement?.querySelector('span');
  if (beamTimeLabel) beamTimeLabel.innerText = t.beamTime;

  const pauseBtn = document.getElementById('board-pause-btn')?.querySelector('span');
  if (pauseBtn) pauseBtn.innerText = t.pauseBtn;

  // Controller Action Button Labels
  const btnALabel = document.querySelector('#btn-action-a')?.parentElement?.querySelectorAll('span');
  if (btnALabel && btnALabel[0]) btnALabel[0].innerText = t.btnAZap;
  if (btnALabel && btnALabel[1]) btnALabel[1].innerText = t.btnAZapSub;

  const btnBLabel = document.querySelector('#btn-action-b')?.parentElement?.querySelectorAll('span');
  if (btnBLabel && btnBLabel[0]) btnBLabel[0].innerText = t.btnBShield;
  if (btnBLabel && btnBLabel[1]) btnBLabel[1].innerText = t.btnBShieldSub;

  // Pause Modal
  const pauseModalTitle = document.querySelector('#pause-modal .text-center');
  if (pauseModalTitle) pauseModalTitle.innerText = t.pauseTitle;

  const pauseResume = document.getElementById('pause-btn-resume');
  if (pauseResume) pauseResume.innerText = t.resumeBtn;

  const pauseRestart = document.getElementById('pause-btn-restart');
  if (pauseRestart) pauseRestart.innerText = t.restartTarget;

  const pauseLangIcon = document.getElementById('pause-lang-icon');
  const pauseLangLabel = document.getElementById('pause-lang-label');
  if (pauseLangIcon) pauseLangIcon.innerText = isSv ? '🇸🇪' : '🇬🇧';
  if (pauseLangLabel) pauseLangLabel.innerText = t.langButton;

  const pauseLvlSelect = document.getElementById('pause-btn-level-select');
  if (pauseLvlSelect) pauseLvlSelect.innerText = t.targetSelectModal;

  const pauseMainMenu = document.getElementById('pause-btn-main-menu');
  if (pauseMainMenu) pauseMainMenu.innerText = t.mainMenuModal;

  const pauseExit = document.getElementById('pause-btn-exit');
  if (pauseExit) pauseExit.innerText = t.pauseExit;

  // Hint Modal
  const hintTitle = document.querySelector('#hint-prompt-modal .text-\\[10px\\]');
  if (hintTitle) hintTitle.innerText = `★ ${t.hintPromptTitle} ★`;
  const hintQ = document.querySelector('#hint-prompt-modal .text-\\[9px\\]');
  if (hintQ) hintQ.innerText = t.hintPromptQuestion;
  const hintSub = document.querySelector('#hint-prompt-modal .text-\\[7\\.5px\\]');
  if (hintSub) hintSub.innerText = t.hintPromptSub;
  const hintYes = document.getElementById('hint-btn-yes');
  if (hintYes) hintYes.innerText = `► ${t.hintBtnYes}`;
  const hintNo = document.getElementById('hint-btn-no');
  if (hintNo) hintNo.innerText = t.hintBtnNo;

  // Victory Modal
  const vicTitle = document.querySelector('#victory-modal .text-\\[12px\\]');
  if (vicTitle) vicTitle.innerText = t.victoryTitle;
  const vicSub = document.querySelector('#victory-modal .text-\\[8px\\]');
  if (vicSub) vicSub.innerText = t.victorySub;
  const vicLogHeader = document.querySelector('#victory-modal #victory-research-note')?.parentElement?.querySelector('div span:last-child');
  if (vicLogHeader) vicLogHeader.innerText = t.mothershipLog;
  const vicNext = document.getElementById('victory-btn-next');
  if (vicNext) vicNext.innerText = t.nextSpecimenBtn;
  const vicLvls = document.getElementById('victory-btn-levels');
  if (vicLvls) vicLvls.innerText = t.victoryTargetsBtn;

  // Game Over Modal
  const goTitle = document.querySelector('#game-over-modal .text-\\[12px\\]');
  if (goTitle) goTitle.innerText = t.gameOverTitle;
  const goSub = document.querySelector('#game-over-modal .text-\\[8px\\]');
  if (goSub) goSub.innerText = t.gameOverSub;
  const goRetry = document.getElementById('game-over-btn-restart');
  if (goRetry) goRetry.innerText = t.retryBtn;
  const goLvls = document.getElementById('game-over-btn-levels');
  if (goLvls) goLvls.innerText = t.gameOverTargetsBtn;

  // How to Modal
  const howToTitle = document.querySelector('#how-to-modal span.text-\\[9px\\]');
  if (howToTitle) howToTitle.innerText = t.howToTitle;
  const howToBody = document.querySelector('#how-to-modal .max-h-\\[60vh\\]');
  if (howToBody) {
    howToBody.innerHTML = `
      <p><strong>${t.howToP1.split('\n')[0]}</strong><br/>${t.howToP1.split('\n')[1] || ''}</p>
      <p><strong>${t.howToP2.split('\n')[0]}</strong><br/>${t.howToP2.split('\n')[1] || ''}</p>
      <p><strong>${t.howToP3.split('\n')[0]}</strong><br/>${t.howToP3.split('\n')[1] || ''}<br/>${t.howToP3.split('\n')[2] || ''}</p>
      <p><strong>${t.howToP4.split('\n')[0]}</strong><br/>${t.howToP4.split('\n')[1] || ''}</p>
      <p><strong>${t.howToP5.split('\n')[0]}</strong><br/>${t.howToP5.split('\n')[1] || ''}</p>
    `;
  }
  const howToClose = document.querySelector('#how-to-modal button[data-close-modal="how-to-modal"]:last-child');
  if (howToClose) howToClose.innerText = t.howToCloseBtn;

  updateDifficultyUI();
}

function updateToolModeUI() {
  const isChisel = State.board10.toolMode === 'chisel';
  const isSv = State.lang === 'sv';

  const badge = document.getElementById('tool-mode-text');
  if (badge) {
    badge.innerText = isChisel ? 'LASER ⚡' : (isSv ? 'SKÖLD ✕' : 'SHIELD ✕');
  }

  const icon = document.getElementById('beam-mode-icon');
  const label = document.getElementById('beam-mode-label');
  const btn = document.getElementById('toggle-input-mode');

  if (icon) icon.innerText = isChisel ? '⚡' : '✕';
  if (label) {
    label.innerText = isChisel
      ? (isSv ? 'LÄGE: LASER' : 'MODE: LASER')
      : (isSv ? 'LÄGE: SKÖLD' : 'MODE: SHIELD');
  }

  if (btn) {
    if (isChisel) {
      btn.style.backgroundColor = 'var(--gb-bright)';
      btn.style.color = 'var(--gb-darkest)';
    } else {
      btn.style.backgroundColor = 'var(--gb-dark)';
      btn.style.color = 'var(--gb-bright)';
    }
  }
}

function saveSettings() {
  saveGameData();
  updateAudioButtonsUI();
}

function hapticPulse(type) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'zap') {
        navigator.vibrate(30);
      } else if (type === 'shield') {
        navigator.vibrate(15);
      } else if (type === 'penalty') {
        navigator.vibrate([100, 60, 140]);
      } else if (type === 'victory') {
        navigator.vibrate([60, 40, 80, 40, 160]);
      } else {
        navigator.vibrate(20);
      }
    } catch (_) {}
  }
}

function updateAudioButtonsUI() {
  const isBgmMuted = sound.bgmMuted;
  const isSfxMuted = sound.sfxMuted;
  const isSv = State.lang === 'sv';

  // Top nav bar
  const bgmBtn = document.getElementById('music-toggle-btn');
  const sfxBtn = document.getElementById('sound-toggle-btn');
  if (bgmBtn) bgmBtn.innerText = isBgmMuted ? '🔇' : '🎵';
  if (sfxBtn) sfxBtn.innerText = isSfxMuted ? '🔕' : '🔊';

  // Board in-screen controls
  const boardBgmIcon = document.getElementById('board-music-icon');
  const boardSfxIcon = document.getElementById('board-sound-icon');
  if (boardBgmIcon) boardBgmIcon.innerText = isBgmMuted ? '🔇' : '🎵';
  if (boardSfxIcon) boardSfxIcon.innerText = isSfxMuted ? '🔕' : '🔊';

  // Game Boy in-screen controls
  const gbBgmIcon = document.getElementById('gb-music-icon');
  const gbSfxIcon = document.getElementById('gb-sound-icon');
  if (gbBgmIcon) gbBgmIcon.innerText = isBgmMuted ? '🔇' : '🎵';
  if (gbSfxIcon) gbSfxIcon.innerText = isSfxMuted ? '🔕' : '🔊';

  // Pause menu modal controls
  const pauseBgmIcon = document.getElementById('pause-music-icon');
  const pauseBgmLabel = document.getElementById('pause-music-label');
  const pauseSfxIcon = document.getElementById('pause-sound-icon');
  const pauseSfxLabel = document.getElementById('pause-sound-label');
  if (pauseBgmIcon) pauseBgmIcon.innerText = isBgmMuted ? '🔇' : '🎵';
  if (pauseBgmLabel) pauseBgmLabel.innerText = isBgmMuted ? (isSv ? 'MUSIK: AV' : 'MUSIC: OFF') : (isSv ? 'MUSIK: PÅ' : 'MUSIC: ON');
  if (pauseSfxIcon) pauseSfxIcon.innerText = isSfxMuted ? '🔕' : '🔊';
  if (pauseSfxLabel) pauseSfxLabel.innerText = isSfxMuted ? (isSv ? 'LJUD: AV' : 'SOUND: OFF') : (isSv ? 'LJUD: PÅ' : 'SOUND: ON');

  // Settings modal audio buttons
  const setMusicIcon = document.getElementById('settings-music-icon');
  const setMusicText = document.getElementById('settings-music-text');
  const setSfxIcon = document.getElementById('settings-sfx-icon');
  const setSfxText = document.getElementById('settings-sfx-text');
  if (setMusicIcon) setMusicIcon.innerText = isBgmMuted ? '🔇' : '🎵';
  if (setMusicText) setMusicText.innerText = isBgmMuted ? (isSv ? 'MUSIK: AV' : 'MUSIC: OFF') : (isSv ? 'MUSIK: PÅ' : 'MUSIC: ON');
  if (setSfxIcon) setSfxIcon.innerText = isSfxMuted ? '🔕' : '🔊';
  if (setSfxText) setSfxText.innerText = isSfxMuted ? (isSv ? 'LJUD: AV' : 'SOUND: OFF') : (isSv ? 'LJUD: PÅ' : 'SOUND: ON');
}

// Calculate row & column clues from a 2D binary grid
function calculateClues(matrix) {
  const rowCount = matrix.length;
  const colCount = matrix[0].length;

  const rowClues = [];
  for (let r = 0; r < rowCount; r++) {
    const clues = [];
    let count = 0;
    for (let c = 0; c < colCount; c++) {
      if (matrix[r][c] === 1) {
        count++;
      } else if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
    if (count > 0) clues.push(count);
    rowClues.push(clues.length > 0 ? clues : [0]);
  }

  const colClues = [];
  for (let c = 0; c < colCount; c++) {
    const clues = [];
    let count = 0;
    for (let r = 0; r < rowCount; r++) {
      if (matrix[r][c] === 1) {
        count++;
      } else if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
    if (count > 0) clues.push(count);
    colClues.push(clues.length > 0 ? clues : [0]);
  }

  return { rowClues, colClues };
}

// ========================================================
// 3. NAVIGATION CONTROLLER
// ========================================================

function navigateTo(screenId) {
  sound.playSelect();

  document.querySelectorAll('.game-screen-wrapper').forEach(el => {
    el.classList.remove('active-screen');
  });

  const target = document.getElementById(`screen-${screenId}`);
  if (target) {
    target.classList.add('active-screen');
    State.currentScreen = screenId;
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    if (btn.dataset.target === screenId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Manage Background Music per screen
  if (screenId === 'game-board' || screenId === 'gameboy-view') {
    sound.startMusic('game');
  } else {
    sound.startMusic('menu');
  }

  // Screen specific setups
  if (screenId === 'level-select') {
    renderLevelMatrix();
  } else if (screenId === 'game-board') {
    startBoard10Timer();
    renderMiniRadar();
  } else if (screenId === 'gameboy-view') {
    startBoard15Timer();
  }
}

// ========================================================
// 4. MAIN MENU
// ========================================================

function initMainMenu() {
  const btnPicross = document.getElementById('menu-btn-picross');
  const btnHowTo = document.getElementById('menu-btn-how-to');
  const btnGameboy = document.getElementById('menu-btn-gameboy');
  const btnSettings = document.getElementById('menu-btn-settings');

  if (btnPicross) btnPicross.addEventListener('click', () => navigateTo('level-select'));
  if (btnGameboy) btnGameboy.addEventListener('click', () => navigateTo('gameboy-view'));
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      sound.playBlip();
      openModal('settings-modal');
    });
  }
  if (btnHowTo) {
    btnHowTo.addEventListener('click', () => {
      sound.playBlip();
      openModal('how-to-modal');
    });
  }

  const footerSelect = document.getElementById('main-menu-footer-select');
  if (footerSelect) footerSelect.addEventListener('click', () => navigateTo('level-select'));
}

function initSettingsModal() {
  // Difficulty selection buttons in modal
  const diffBtns = document.querySelectorAll('.diff-select-btn');
  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setDifficulty(btn.dataset.diff);
    });
  });

  // Language selection buttons in modal
  const langBtns = document.querySelectorAll('.lang-select-btn');
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (State.lang !== btn.dataset.lang) {
        toggleLanguage();
      }
    });
  });

  // Music toggle in modal
  const musicBtn = document.getElementById('settings-btn-music');
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      sound.toggleMusic();
      updateAudioButtonsUI();
      saveGameData();
    });
  }

  // SFX toggle in modal
  const sfxBtn = document.getElementById('settings-btn-sfx');
  if (sfxBtn) {
    sfxBtn.addEventListener('click', () => {
      sound.toggleSfx();
      updateAudioButtonsUI();
      saveGameData();
    });
  }
}

// ========================================================
// 5. LEVEL SELECT (8x8 = 64 LEVELS WITH PROGRESS STAMPS)
// ========================================================

function initLevelSelect() {
  renderLevelMatrix();

  const exitBtn = document.getElementById('level-select-exit-btn');
  if (exitBtn) exitBtn.addEventListener('click', () => navigateTo('main-menu'));

  const selectBtn = document.getElementById('level-select-action-btn');
  if (selectBtn) {
    selectBtn.addEventListener('click', () => promptHintAndStartLevel(State.selectedLevelId));
  }

  // Difficulty filter tabs on level select
  const diffTabs = document.querySelectorAll('#level-diff-tabs .diff-tab-btn');
  diffTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playBlip();
      State.statsDifficultyTab = btn.dataset.diffTab;
      saveGameData();
      updateStatsDashboard(State.selectedLevelId);
    });
  });

  // Click on stats box or top 5 button opens top 5 modal
  const statsBox = document.getElementById('stats-dashboard-box');
  if (statsBox) {
    statsBox.addEventListener('click', () => {
      sound.playBlip();
      renderTop5Modal(State.selectedLevelId);
    });
  }
}

function renderLevelMatrix() {
  const gridContainer = document.getElementById('level-matrix-grid');
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  const rows = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  rows.forEach(r => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid grid-cols-[26px_repeat(8,1fr)] items-center text-center';

    // Row Label
    const label = document.createElement('div');
    label.className = 'text-[9px] font-bold text-left pl-1';
    label.innerText = r;
    rowDiv.appendChild(label);

    // 8 columns
    cols.forEach(c => {
      const id = `${r}-${c}`;
      const puzzle = getPuzzle10(id);
      const stat = State.stats[id] || { cleared: false, first: '--:--', best: '--:--', times: 0 };

      const cellWrap = document.createElement('div');
      cellWrap.className = 'relative flex items-center justify-center';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.levelId = id;
      btn.className = 'level-slot-btn w-[26px] h-[21px] sm:w-[28px] sm:h-[23px] border-2 border-gb-darkest flex items-center justify-center text-[7.5px] cursor-pointer font-bold transition-transform active:scale-95';

      if (stat.cleared) {
        // Solved stamp appearance
        btn.classList.add('slot-cleared');
        btn.innerHTML = `<span class="text-[8px] text-[var(--gb-glow)] leading-none">■</span>`;
        btn.title = `[ABDUCTED] ${id} - ${puzzle.name}`;
      } else {
        btn.classList.add('bg-gb-lightest', 'hover:bg-gb-light/60');
        btn.innerText = c;
        btn.title = `TARGET ${id} - ${puzzle.name}`;
      }

      if (id === State.selectedLevelId) {
        btn.classList.add('outline', 'outline-1', 'outline-gb-darkest');
      }

      btn.addEventListener('mouseenter', () => updateLevelHover(btn, id));
      btn.addEventListener('click', () => {
        State.selectedLevelId = id;
        promptHintAndStartLevel(id);
      });

      cellWrap.appendChild(btn);
      rowDiv.appendChild(cellWrap);
    });

    gridContainer.appendChild(rowDiv);
  });

  // Update stats dashboard for selected level
  updateStatsDashboard(State.selectedLevelId);
}

function updateLevelHover(btnEl, levelId) {
  sound.playBlip();
  State.selectedLevelId = levelId;
  updateStatsDashboard(levelId);

  // Reposition floating cursor
  let cursor = document.getElementById('level-matrix-cursor');
  if (!cursor) {
    cursor = document.createElement('div');
    cursor.id = 'level-matrix-cursor';
    cursor.className = 'absolute -left-3.5 -top-2.5 z-30 cursor-anim pointer-events-none';
    cursor.innerHTML = `
      <svg class="pixel-sharp" fill="none" height="18" viewBox="0 0 16 16" width="18">
        <path d="M2 1H7V3H9V5H11V7H13V9H15V13H13V15H9V13H7V11H5V9H3V7H1V3H2V1Z" fill="#0f380f"></path>
        <path d="M3 3H6V5H8V7H10V9H12V11H13V12H10V10H8V8H6V6H4V4H3V3Z" fill="#9bbc0f"></path>
      </svg>`;
  }
  btnEl.parentElement.appendChild(cursor);
}

function updateStatsDashboard(levelId) {
  const stat = State.stats[levelId] || {
    cleared: false, first: '--:--', best: '--:--', times: 0,
    byDiff: {
      easy: { first: '--:--', best: '--:--', times: 0, top5: [] },
      medium: { first: '--:--', best: '--:--', times: 0, top5: [] },
      hard: { first: '--:--', best: '--:--', times: 0, top5: [] }
    }
  };

  const statsFirst = document.getElementById('stats-first');
  const statsTimes = document.getElementById('stats-times');
  const statsBest = document.getElementById('stats-best');
  const catIndicator = document.getElementById('stats-cat-indicator');
  const t = getTranslations();

  const tab = State.statsDifficultyTab || 'easy';

  // Highlight active difficulty category tab
  const tabBtns = document.querySelectorAll('#level-diff-tabs .diff-tab-btn');
  tabBtns.forEach(btn => {
    if (btn.dataset.diffTab === tab) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  if (tab === 'all') {
    if (statsFirst) statsFirst.innerText = stat.first || '--:--';
    if (statsTimes) statsTimes.innerText = stat.times || 0;
    if (statsBest) statsBest.innerText = stat.best || '--:--';
    if (catIndicator) catIndicator.innerText = `${t.categoryLabel || 'KATEGORI:'} ${t.tabAll || 'ALLA'}`;
  } else {
    const diffStat = stat.byDiff?.[tab] || { first: '--:--', best: '--:--', times: 0 };
    if (statsFirst) statsFirst.innerText = diffStat.first || '--:--';
    if (statsTimes) statsTimes.innerText = diffStat.times || 0;
    if (statsBest) statsBest.innerText = diffStat.best || '--:--';

    let label = '';
    if (tab === 'easy') label = t.top5EasyHeader || '🟢 LÄTT (30 MIN)';
    else if (tab === 'medium') label = t.top5MediumHeader || '🟡 MEDEL (20 MIN)';
    else if (tab === 'hard') label = t.top5HardHeader || '🔴 SVÅR (15 MIN)';
    if (catIndicator) catIndicator.innerText = `${t.categoryLabel || 'KATEGORI:'} ${label}`;
  }
}

function renderTop5Modal(levelId) {
  const stat = State.stats[levelId] || {
    cleared: false, first: '--:--', best: '--:--', times: 0,
    byDiff: {
      easy: { first: '--:--', best: '--:--', times: 0, top5: [] },
      medium: { first: '--:--', best: '--:--', times: 0, top5: [] },
      hard: { first: '--:--', best: '--:--', times: 0, top5: [] }
    }
  };
  const puzzle = getPuzzle10(levelId);
  const t = getTranslations();

  const titleEl = document.getElementById('top5-modal-title');
  if (titleEl) {
    titleEl.innerText = `${t.top5ModalTitle || 'TOP 5 REKORD'}: ${levelId} ${puzzle ? puzzle.name : ''}`;
  }

  const renderCategoryList = (catKey, listId, timesId) => {
    const dStat = stat.byDiff?.[catKey] || { times: 0, top5: [] };
    const timesEl = document.getElementById(timesId);
    if (timesEl) {
      timesEl.innerText = `${t.top5TimesPlayed || 'SPELAT:'} ${dStat.times} ${State.lang === 'sv' ? 'GGR' : 'TIMES'}`;
    }

    const listEl = document.getElementById(listId);
    if (!listEl) return;
    listEl.innerHTML = '';

    const top5 = Array.isArray(dStat.top5) ? dStat.top5 : [];
    for (let i = 0; i < 5; i++) {
      const li = document.createElement('div');
      const timeSec = top5[i];
      const hasTime = typeof timeSec === 'number';
      const timeStr = hasTime ? formatTime(timeSec) : '--:--';

      li.className = `p-1 rounded border ${hasTime ? 'bg-[var(--gb-lightest)] border-[var(--gb-darkest)] text-[var(--gb-darkest)] shadow-sm' : 'bg-[var(--gb-light)]/40 border-[var(--gb-dark)]/50 text-[var(--gb-dark)] opacity-70'} flex flex-col items-center justify-center`;
      li.innerHTML = `
        <span class="text-[6px] opacity-75 font-mono">#${i + 1}</span>
        <span class="text-[8px] font-bold tracking-tight font-mono">${timeStr}</span>
      `;
      listEl.appendChild(li);
    }
  };

  renderCategoryList('easy', 'top5-list-easy', 'top5-easy-times');
  renderCategoryList('medium', 'top5-list-medium', 'top5-medium-times');
  renderCategoryList('hard', 'top5-list-hard', 'top5-hard-times');

  openModal('top5-records-modal');
}

// ========================================================
// 6. CLASSIC HINT ROULETTE & GAME START
// ========================================================

function promptHintAndStartLevel(levelId) {
  State.selectedLevelId = levelId;
  loadLevelIntoBoard10(levelId);
  openModal('hint-prompt-modal');
}

function runHintRoulette() {
  closeModal('hint-prompt-modal');
  navigateTo('game-board');

  const randomCol = Math.floor(Math.random() * 10);
  const randomRow = Math.floor(Math.random() * 10);

  let stepCount = 0;
  const maxSteps = 16;
  const colContainer = document.getElementById('col-clues-container');
  const rowContainer = document.getElementById('row-clues-container');

  // Phase 1: Column Roulette Spin
  const colInterval = setInterval(() => {
    sound.playRouletteTick();
    const currCol = stepCount % 10;
    highlightColHint(currCol);
    stepCount++;

    if (stepCount > maxSteps) {
      clearInterval(colInterval);
      highlightColHint(randomCol);

      // Phase 2: Row Roulette Spin
      let rowStep = 0;
      const rowInterval = setInterval(() => {
        sound.playRouletteTick();
        const currRow = rowStep % 10;
        highlightRowHint(currRow);
        rowStep++;

        if (rowStep > maxSteps) {
          clearInterval(rowInterval);
          highlightRowHint(randomRow);

          // Reveal selected row & column
          revealHintRowAndCol(randomRow, randomCol);
        }
      }, 70);
    }
  }, 70);
}

function highlightColHint(cIndex) {
  for (let c = 0; c < 10; c++) {
    const el = document.getElementById(`col-clue-${c}`);
    if (el) {
      if (c === cIndex) el.classList.add('roulette-active-col');
      else el.classList.remove('roulette-active-col');
    }
  }
}

function highlightRowHint(rIndex) {
  for (let r = 0; r < 10; r++) {
    const el = document.getElementById(`row-clue-${r}`);
    if (el) {
      if (r === rIndex) el.classList.add('roulette-active-row');
      else el.classList.remove('roulette-active-row');
    }
  }
}

function revealHintRowAndCol(targetRow, targetCol) {
  sound.playRouletteWin();

  const puzzle = getPuzzle10(State.board10.puzzleKey);
  const gridEl = document.getElementById('picross-grid-10');
  const cells = gridEl ? gridEl.querySelectorAll('.carved-block') : [];

  // Reveal entire Column
  for (let r = 0; r < 10; r++) {
    const isCorrect = puzzle.grid[r][targetCol] === 1;
    const idx = r * 10 + targetCol;
    const cell = cells[idx];
    if (cell) {
      if (isCorrect) {
        State.board10.userGrid[r][targetCol] = 1;
        cell.classList.add('excavated-tile');
        cell.classList.remove('marked-x-tile');
        cell.innerText = '';
      } else {
        State.board10.userGrid[r][targetCol] = 2;
        cell.classList.remove('excavated-tile');
        cell.classList.add('marked-x-tile');
        cell.innerText = '✕';
      }
    }
  }

  // Reveal entire Row
  for (let c = 0; c < 10; c++) {
    const isCorrect = puzzle.grid[targetRow][c] === 1;
    const idx = targetRow * 10 + c;
    const cell = cells[idx];
    if (cell) {
      if (isCorrect) {
        State.board10.userGrid[targetRow][c] = 1;
        cell.classList.add('excavated-tile');
        cell.classList.remove('marked-x-tile');
        cell.innerText = '';
      } else {
        State.board10.userGrid[targetRow][c] = 2;
        cell.classList.remove('excavated-tile');
        cell.classList.add('marked-x-tile');
        cell.innerText = '✕';
      }
    }
  }

  // Clear roulette glow classes
  setTimeout(() => {
    document.querySelectorAll('.roulette-active-col, .roulette-active-row').forEach(el => {
      el.classList.remove('roulette-active-col', 'roulette-active-row');
    });
  }, 1000);

  updateClueCompletion();
  checkSolution10();
}

// ========================================================
// 7. 10x10 SPELPLAN (BOARD) LOGIC
// ========================================================

function getPuzzle10(key) {
  let p = null;
  if (window.ALL_PUZZLES_10x10 && window.ALL_PUZZLES_10x10[key]) {
    p = window.ALL_PUZZLES_10x10[key];
  } else {
    p = {
      name: 'FLYING SAUCER',
      difficulty: 'EASY',
      researchNote: 'STANDARD SCOUT VESSEL. CUP HOLDER RETROFITTED.',
      grid: [
        [0,0,1,1,0,0,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [1,1,0,1,1,1,1,0,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [0,1,1,0,0,0,0,1,1,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,1,1,0,1,1,0,1,1,0],
        [0,1,0,0,1,1,0,0,1,0],
        [0,0,1,1,0,0,1,1,0,0],
        [0,0,0,1,1,1,1,0,0,0]
      ]
    };
  }

  const isSv = State.lang === 'sv';
  const svName = window.SWEDISH_PUZZLE_NAMES && window.SWEDISH_PUZZLE_NAMES[key];
  const svNote = window.SWEDISH_NOTES && window.SWEDISH_NOTES[key];

  return {
    ...p,
    name: isSv && svName ? svName : p.name,
    researchNote: isSv && svNote ? svNote : p.researchNote
  };
}

// ========================================================
// REACTIVE ALIEN MASCOT (ZOG) EMOTION SYSTEM
// ========================================================

function getAlienSvg(emotion = 'normal') {
  if (emotion === 'happy') {
    return `
      <svg class="w-8 h-8" shape-rendering="crispEdges" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="1" width="3" height="2" fill="#0f380f" />
        <rect x="18" y="1" width="3" height="2" fill="#0f380f" />
        <rect x="5" y="3" width="2" height="3" fill="#306230" />
        <rect x="17" y="3" width="2" height="3" fill="#306230" />
        <rect x="7" y="5" width="10" height="2" fill="#0f380f" />
        <rect x="5" y="7" width="14" height="2" fill="#0f380f" />
        <rect x="4" y="9" width="16" height="5" fill="#306230" />
        <!-- Happy Eyes: ^ ^ sparkles -->
        <polygon points="7,9 8,11 6,11" fill="#0f380f" />
        <polygon points="17,9 18,11 16,11" fill="#0f380f" />
        <rect x="6" y="10" width="3" height="1" fill="#9bbc0f" />
        <rect x="15" y="10" width="3" height="1" fill="#9bbc0f" />
        <!-- Rosy Blush Cheeks -->
        <rect x="5" y="12" width="2" height="2" fill="#8bac0f" />
        <rect x="17" y="12" width="2" height="2" fill="#8bac0f" />
        <!-- Wide open smiling mouth -->
        <rect x="6" y="14" width="12" height="3" fill="#306230" />
        <rect x="10" y="14" width="4" height="2" fill="#0f380f" />
        <rect x="11" y="16" width="2" height="1" fill="#9bbc0f" />
        <!-- Joyful Waving Hands -->
        <rect x="8" y="17" width="8" height="2" fill="#0f380f" />
        <rect x="9" y="19" width="6" height="3" fill="#306230" />
        <rect x="3" y="16" width="3" height="2" fill="#0f380f" />
        <rect x="18" y="16" width="3" height="2" fill="#0f380f" />
      </svg>
    `;
  } else if (emotion === 'panic') {
    return `
      <svg class="w-8 h-8" shape-rendering="crispEdges" viewBox="0 0 24 24" fill="none">
        <!-- Trembling antennas with warning sparks -->
        <rect x="2" y="3" width="2" height="2" fill="#cc2222" />
        <rect x="20" y="3" width="2" height="2" fill="#cc2222" />
        <rect x="4" y="4" width="2" height="3" fill="#0f380f" />
        <rect x="18" y="4" width="2" height="3" fill="#0f380f" />
        <!-- Head Dome -->
        <rect x="7" y="5" width="10" height="2" fill="#0f380f" />
        <rect x="5" y="7" width="14" height="2" fill="#0f380f" />
        <rect x="4" y="9" width="16" height="5" fill="#306230" />
        <!-- Cross Eyes ✕ ✕ (Panic) -->
        <rect x="6" y="9" width="1" height="4" fill="#0f380f" />
        <rect x="8" y="9" width="1" height="4" fill="#0f380f" />
        <rect x="7" y="10" width="1" height="2" fill="#0f380f" />
        <rect x="15" y="9" width="1" height="4" fill="#0f380f" />
        <rect x="17" y="9" width="1" height="4" fill="#0f380f" />
        <rect x="16" y="10" width="1" height="2" fill="#0f380f" />
        <!-- Sweat Drop on forehead -->
        <rect x="19" y="7" width="2" height="3" fill="#9bbc0f" />
        <!-- Wide open screaming 'O' mouth -->
        <rect x="6" y="14" width="12" height="3" fill="#306230" />
        <rect x="10" y="14" width="4" height="3" fill="#0f380f" />
        <!-- Trembling Hands on Head -->
        <rect x="8" y="17" width="8" height="2" fill="#0f380f" />
        <rect x="9" y="19" width="6" height="3" fill="#306230" />
        <rect x="4" y="17" width="3" height="2" fill="#0f380f" />
        <rect x="17" y="17" width="3" height="2" fill="#0f380f" />
      </svg>
    `;
  }
  return `
    <svg class="w-8 h-8" shape-rendering="crispEdges" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="2" height="2" fill="#0f380f" />
      <rect x="18" y="2" width="2" height="2" fill="#0f380f" />
      <rect x="5" y="4" width="2" height="2" fill="#306230" />
      <rect x="17" y="4" width="2" height="2" fill="#306230" />
      <rect x="7" y="5" width="10" height="2" fill="#0f380f" />
      <rect x="5" y="7" width="14" height="2" fill="#0f380f" />
      <rect x="4" y="9" width="16" height="5" fill="#306230" />
      <rect x="6" y="9" width="3" height="4" fill="#0f380f" />
      <rect x="15" y="9" width="3" height="4" fill="#0f380f" />
      <rect x="7" y="10" width="1" height="1" fill="#9bbc0f" />
      <rect x="16" y="10" width="1" height="1" fill="#9bbc0f" />
      <rect x="6" y="14" width="12" height="3" fill="#306230" />
      <rect x="11" y="15" width="2" height="1" fill="#0f380f" />
      <rect x="8" y="17" width="8" height="2" fill="#0f380f" />
      <rect x="9" y="19" width="6" height="3" fill="#306230" />
      <rect x="5" y="18" width="2" height="3" fill="#0f380f" />
      <rect x="17" y="18" width="2" height="3" fill="#0f380f" />
    </svg>
  `;
}

let alienEmotionTimer = null;
function triggerAlienEmotion(emotion, duration = 850) {
  const box = document.getElementById('alien-mascot-box');
  const face = document.getElementById('alien-mascot-face');
  if (!face) return;

  if (alienEmotionTimer) clearTimeout(alienEmotionTimer);

  if (box) {
    box.classList.remove('alien-happy', 'alien-panic');
    if (emotion === 'happy') box.classList.add('alien-happy');
    if (emotion === 'panic') box.classList.add('alien-panic');
  }

  face.innerHTML = getAlienSvg(emotion);

  if (duration > 0) {
    alienEmotionTimer = setTimeout(() => {
      if (box) box.classList.remove('alien-happy', 'alien-panic');
      face.innerHTML = getAlienSvg('normal');
    }, duration);
  }
}

function initBoard10() {
  loadLevelIntoBoard10(State.selectedLevelId);

  // Controls
  const btnUp = document.getElementById('btn-up');
  const btnDown = document.getElementById('btn-down');
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');

  if (btnUp) btnUp.addEventListener('click', () => moveCursor10(-10));
  if (btnDown) btnDown.addEventListener('click', () => moveCursor10(10));
  if (btnLeft) {
    btnLeft.addEventListener('click', () => {
      if (State.board10.cursorIndex % 10 !== 0) moveCursor10(-1);
    });
  }
  if (btnRight) {
    btnRight.addEventListener('click', () => {
      if (State.board10.cursorIndex % 10 !== 9) moveCursor10(1);
    });
  }

  const btnActionA = document.getElementById('btn-action-a');
  const btnActionB = document.getElementById('btn-action-b');
  const toggleInputMode = document.getElementById('toggle-input-mode');

  if (btnActionA) btnActionA.addEventListener('click', () => applyCellAction(State.board10.cursorIndex, 'chisel'));
  if (btnActionB) btnActionB.addEventListener('click', () => applyCellAction(State.board10.cursorIndex, 'mark-x'));

  if (toggleInputMode) {
    toggleInputMode.addEventListener('click', () => {
      sound.playBlip();
      State.board10.toolMode = State.board10.toolMode === 'chisel' ? 'mark-x' : 'chisel';
      updateToolModeUI();
    });
  }

  const pauseBtn = document.getElementById('board-pause-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      sound.playBlip();
      openModal('pause-modal');
    });
  }
}

function loadLevelIntoBoard10(levelKey) {
  const puzzle = getPuzzle10(levelKey);
  State.board10.puzzleKey = levelKey;
  State.board10.isCompleted = false;
  State.board10.timerSeconds = getStartingSeconds(State.difficulty);
  State.board10.mistakes = 0;

  const timerEl = document.getElementById('picross-timer-10');
  if (timerEl) {
    timerEl.innerText = formatTime(State.board10.timerSeconds);
  }

  State.board10.userGrid = Array(10).fill(null).map(() => Array(10).fill(0));

  const titleEl = document.getElementById('current-level-badge');
  const t = getTranslations();
  const diffBadge = State.difficulty === 'easy' ? '🟢 30M' : State.difficulty === 'medium' ? '🟡 20M' : '🔴 15M';
  if (titleEl) {
    titleEl.innerText = `${t.ufoScanPrefix} [${levelKey}: ${puzzle.name} • ${diffBadge}]`;
  }

  const { rowClues, colClues } = calculateClues(puzzle.grid);
  renderClues10(rowClues, colClues);
  renderGrid10();
  updateClueCompletion();
  updateToolModeUI();
  triggerAlienEmotion('normal', 0);
}

function renderClues10(rowClues, colClues) {
  const colContainer = document.getElementById('col-clues-container');
  if (colContainer) {
    colContainer.innerHTML = '';
    colClues.forEach((clueArray, cIndex) => {
      const count = clueArray.length;
      const isMaxDense = count >= 5;
      const isDense = count >= 4;

      const colDiv = document.createElement('div');
      colDiv.id = `col-clue-${cIndex}`;
      colDiv.className = `w-[26px] sm:w-8 h-[64px] sm:h-[72px] ${cIndex % 2 === 0 ? 'stripe-odd' : 'stripe-even'} border-r border-[var(--gb-dark)] flex flex-col justify-end items-center ${isMaxDense ? 'pb-0.5 gap-[1px]' : isDense ? 'pb-1 gap-[2px]' : 'pb-1.5 gap-[2px]'} overflow-hidden transition-all select-none`;
      if (cIndex === 4) colDiv.className += ' border-r-[3px] border-[var(--gb-darkest)]';
      if (cIndex === 9) colDiv.className += ' border-r-0';

      clueArray.forEach(num => {
        const span = document.createElement('span');
        const numSize = isMaxDense 
          ? 'text-[9px] sm:text-[10px]' 
          : isDense 
            ? 'text-[10px] sm:text-[11px]' 
            : 'text-[11px] sm:text-[12px]';
        span.className = `clue-number-text ${numSize} leading-tight font-black text-center`;
        span.innerText = num;
        colDiv.appendChild(span);
      });
      colContainer.appendChild(colDiv);
    });
  }

  const rowContainer = document.getElementById('row-clues-container');
  if (rowContainer) {
    rowContainer.innerHTML = '';
    rowClues.forEach((clueArray, rIndex) => {
      const count = clueArray.length;
      const isMaxDense = count >= 5;
      const isDense = count >= 4;

      const rowDiv = document.createElement('div');
      rowDiv.id = `row-clue-${rIndex}`;
      rowDiv.className = `h-[26px] sm:h-8 ${rIndex % 2 === 0 ? 'stripe-odd' : 'stripe-even'} border-b border-[var(--gb-dark)] flex items-center justify-end ${isMaxDense ? 'pr-1.5 pl-1 gap-1' : isDense ? 'pr-2 pl-1 gap-1' : 'pr-2.5 pl-1 gap-1.5'} overflow-hidden transition-all select-none`;
      if (rIndex === 4) rowDiv.className += ' border-b-[3px] border-[var(--gb-darkest)]';
      if (rIndex === 9) rowDiv.className += ' border-b-0';

      clueArray.forEach(num => {
        const span = document.createElement('span');
        const numClass = isMaxDense 
          ? 'text-[9.5px] sm:text-[10.5px] min-w-[7px]' 
          : isDense 
            ? 'text-[10px] sm:text-[11px] min-w-[8px]' 
            : 'text-[11px] sm:text-[12px] min-w-[9px]';
        span.className = `clue-number-text ${numClass} leading-none text-center font-black`;
        span.innerText = num;
        rowDiv.appendChild(span);
      });
      rowContainer.appendChild(rowDiv);
    });
  }
}

function renderGrid10() {
  const gridEl = document.getElementById('picross-grid-10');
  if (!gridEl) return;
  gridEl.innerHTML = '';

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const idx = r * 10 + c;
      const cell = document.createElement('div');
      cell.className = 'w-[26px] sm:w-8 h-[26px] sm:h-8 carved-block flex items-center justify-center text-[10px] sm:text-[11px] font-black select-none';
      cell.dataset.index = idx;

      if (c === 4) cell.classList.add('border-r-[3px]', 'border-r-[var(--gb-darkest)]');
      if (r === 4) cell.classList.add('border-b-[3px]', 'border-b-[var(--gb-darkest)]');

      if (idx === State.board10.cursorIndex) {
        cell.classList.add('reticle-cursor');
      }

      cell.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        updateCursor10(idx);
        applyCellAction(idx, State.board10.toolMode);
      });

      gridEl.appendChild(cell);
    }
  }
}

function updateCursor10(newIdx) {
  if (newIdx < 0 || newIdx >= 100) return;
  const gridEl = document.getElementById('picross-grid-10');
  if (!gridEl) return;
  const cells = gridEl.querySelectorAll('.carved-block');
  if (cells[State.board10.cursorIndex]) {
    cells[State.board10.cursorIndex].classList.remove('reticle-cursor');
  }
  State.board10.cursorIndex = newIdx;
  if (cells[newIdx]) {
    cells[newIdx].classList.add('reticle-cursor');
  }
}

function moveCursor10(delta) {
  sound.playBlip();
  const newIdx = State.board10.cursorIndex + delta;
  if (newIdx >= 0 && newIdx < 100) {
    updateCursor10(newIdx);
  }
}

function getRuns(line) {
  const runs = [];
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === 1) {
      count++;
    } else if (count > 0) {
      runs.push(count);
      count = 0;
    }
  }
  if (count > 0) runs.push(count);
  return runs.length > 0 ? runs : [0];
}

function updateClueCompletion() {
  const puzzle = getPuzzle10(State.board10.puzzleKey);
  const { rowClues, colClues } = calculateClues(puzzle.grid);

  // Rows
  for (let r = 0; r < 10; r++) {
    const userRow = State.board10.userGrid[r];
    const rowEl = document.getElementById(`row-clue-${r}`);
    if (rowEl) {
      const runs = getRuns(userRow);
      const isComplete = JSON.stringify(runs) === JSON.stringify(rowClues[r]);
      if (isComplete) rowEl.classList.add('clue-dimmed');
      else rowEl.classList.remove('clue-dimmed');
    }
  }

  // Columns
  for (let c = 0; c < 10; c++) {
    const userCol = [];
    for (let r = 0; r < 10; r++) {
      userCol.push(State.board10.userGrid[r][c]);
    }
    const colEl = document.getElementById(`col-clue-${c}`);
    if (colEl) {
      const runs = getRuns(userCol);
      const isComplete = JSON.stringify(runs) === JSON.stringify(colClues[c]);
      if (isComplete) colEl.classList.add('clue-dimmed');
      else colEl.classList.remove('clue-dimmed');
    }
  }
}

function applyCellAction(index, actionType) {
  const r = Math.floor(index / 10);
  const c = index % 10;
  const gridEl = document.getElementById('picross-grid-10');
  if (!gridEl) return;
  const cells = gridEl.querySelectorAll('.carved-block');
  const cell = cells[index];
  if (!cell || State.board10.isCompleted) return;

  const puzzle = getPuzzle10(State.board10.puzzleKey);
  const isCorrectSolution = puzzle && puzzle.grid[r][c] === 1;
  const currentVal = State.board10.userGrid[r][c];

  if (actionType === 'chisel') {
    if (currentVal === 1) {
      State.board10.userGrid[r][c] = 0;
      cell.classList.remove('excavated-tile');
      cell.innerText = '';
      sound.playChisel();
      hapticPulse('zap');
    } else if (currentVal === 2) {
      sound.playBlip(); // marked with X protection
      hapticPulse('shield');
    } else {
      if (isCorrectSolution) {
        State.board10.userGrid[r][c] = 1;
        cell.classList.add('excavated-tile');
        cell.classList.remove('marked-x-tile');
        cell.innerText = '';
        sound.playChisel();
        hapticPulse('zap');
        triggerAlienEmotion('happy', 850);
      } else {
        // PENALTY MECHANIC
        State.board10.mistakes++;
        const penaltySecs = State.board10.mistakes === 1 ? 120 : (State.board10.mistakes === 2 ? 240 : 480);
        const penaltyLabel = State.board10.mistakes === 1 ? '-2:00' : (State.board10.mistakes === 2 ? '-4:00' : '-8:00');

        sound.playAlienBuzzer();
        hapticPulse('penalty');
        triggerAlienEmotion('panic', 1400);

        const boardEl = document.getElementById('game-board-container');
        if (boardEl) {
          boardEl.classList.remove('shake-screen');
          void boardEl.offsetWidth;
          boardEl.classList.add('shake-screen');
          setTimeout(() => boardEl.classList.remove('shake-screen'), 480);
        }

        State.board10.timerSeconds = Math.max(0, State.board10.timerSeconds - penaltySecs);
        const timerEl = document.getElementById('picross-timer-10');
        if (timerEl) {
          timerEl.innerText = formatTime(State.board10.timerSeconds);
          timerEl.classList.remove('timer-penalty-flash');
          void timerEl.offsetWidth;
          timerEl.classList.add('timer-penalty-flash');
          setTimeout(() => timerEl.classList.remove('timer-penalty-flash'), 900);
        }

        const toast = document.getElementById('penalty-toast');
        if (toast) {
          const funnyPenaltyMessages = [
            'ZAP! ANGRY FARMER DETECTED',
            'SHIELD MALFUNCTION',
            'ERROR! FOIL HAT DEFLECTED',
            'COW ESCAPED TRACTOR BEAM',
            'AREA 51 RADAR LOCK',
            'TRACTOR BEAM OVERHEATED',
            'WEATHER BALLOON HIT',
            'PROBE MALFUNCTION',
            'FBI AGENT SPOTTED'
          ];
          const randomMsg = funnyPenaltyMessages[Math.floor(Math.random() * funnyPenaltyMessages.length)];
          toast.innerText = `${randomMsg} ${penaltyLabel}!`;
          toast.classList.remove('hidden', 'penalty-notification');
          void toast.offsetWidth;
          toast.classList.add('penalty-notification');
          setTimeout(() => toast.classList.add('hidden'), 1500);
        }

        State.board10.userGrid[r][c] = 2;
        cell.classList.remove('excavated-tile');
        cell.classList.add('marked-x-tile');
        cell.innerText = '✕';

        if (State.board10.timerSeconds <= 0) {
          openModal('game-over-modal');
        }
      }
    }
  } else if (actionType === 'mark-x') {
    if (currentVal === 2) {
      State.board10.userGrid[r][c] = 0;
      cell.classList.remove('marked-x-tile');
      cell.innerText = '';
      sound.playMarkX();
      hapticPulse('shield');
    } else if (currentVal === 0) {
      State.board10.userGrid[r][c] = 2;
      cell.classList.remove('excavated-tile');
      cell.classList.add('marked-x-tile');
      cell.innerText = '✕';
      sound.playMarkX();
      hapticPulse('shield');
    }
  }

  updateClueCompletion();
  checkSolution10();
}

function checkSolution10() {
  const puzzle = getPuzzle10(State.board10.puzzleKey);
  if (!puzzle) return;

  let isWon = true;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const solution = puzzle.grid[r][c];
      const user = State.board10.userGrid[r][c];
      if (solution === 1 && user !== 1) {
        isWon = false;
        break;
      }
      if (solution === 0 && user === 1) {
        isWon = false;
        break;
      }
    }
    if (!isWon) break;
  }

  if (isWon && !State.board10.isCompleted) {
    State.board10.isCompleted = true;
    sound.playFanfare();
    hapticPulse('victory');

    const lvl = State.board10.puzzleKey;
    if (!State.stats[lvl]) {
      State.stats[lvl] = {
        cleared: true, first: '--:--', best: '--:--', times: 0,
        byDiff: {
          easy: { first: '--:--', best: '--:--', times: 0, top5: [] },
          medium: { first: '--:--', best: '--:--', times: 0, top5: [] },
          hard: { first: '--:--', best: '--:--', times: 0, top5: [] }
        }
      };
    }
    if (!State.stats[lvl].byDiff) {
      State.stats[lvl].byDiff = {
        easy: { first: State.stats[lvl].first || '--:--', best: State.stats[lvl].best || '--:--', times: State.stats[lvl].times || 0, top5: State.stats[lvl].best && State.stats[lvl].best !== '--:--' ? [parseSeconds(State.stats[lvl].best)] : [] },
        medium: { first: '--:--', best: '--:--', times: 0, top5: [] },
        hard: { first: '--:--', best: '--:--', times: 0, top5: [] }
      };
    }

    const curDiff = State.difficulty || 'easy';
    const startingSecs = getStartingSeconds(curDiff);
    const elapsedSecs = Math.max(1, startingSecs - State.board10.timerSeconds);
    const timeFormatted = formatTime(elapsedSecs);

    // Global overall stats
    State.stats[lvl].cleared = true;
    State.stats[lvl].times += 1;
    if (State.stats[lvl].first === '--:--') {
      State.stats[lvl].first = timeFormatted;
    }
    if (State.stats[lvl].best === '--:--' || elapsedSecs < parseSeconds(State.stats[lvl].best)) {
      State.stats[lvl].best = timeFormatted;
    }

    // Specific category stats (LÄTT, MEDEL, SVÅR)
    const dStat = State.stats[lvl].byDiff[curDiff] || { first: '--:--', best: '--:--', times: 0, top5: [] };
    dStat.times += 1;
    if (dStat.first === '--:--') {
      dStat.first = timeFormatted;
    }
    let isNewCatBest = false;
    if (dStat.best === '--:--' || elapsedSecs < parseSeconds(dStat.best)) {
      dStat.best = timeFormatted;
      isNewCatBest = true;
    }
    if (!Array.isArray(dStat.top5)) dStat.top5 = [];
    dStat.top5.push(elapsedSecs);
    dStat.top5.sort((a, b) => a - b);
    if (dStat.top5.length > 5) {
      dStat.top5 = dStat.top5.slice(0, 5);
    }
    State.stats[lvl].byDiff[curDiff] = dStat;

    saveGameData();

    setTimeout(() => {
      const victoryName = document.getElementById('victory-relic-name');
      const diffTag = curDiff === 'easy' ? '🟢 LÄTT (30M)' : curDiff === 'medium' ? '🟡 MEDEL (20M)' : '🔴 SVÅR (15M)';
      if (victoryName) {
        victoryName.innerHTML = `${puzzle.name}<br/><span class="text-[7px] text-[var(--gb-bright)] font-mono font-normal">TID: ${timeFormatted} • ${diffTag}${isNewCatBest ? ' ★ NYTT REKORD!' : ''}</span>`;
      }
      const victoryNote = document.getElementById('victory-research-note');
      if (victoryNote) {
        victoryNote.innerText = `"${puzzle.researchNote || 'SPECIMEN SECURED IN MOTHERSHIP ARCHIVES.'}"`;
      }
      triggerAlienEmotion('happy', 4000);
      openModal('victory-modal');
    }, 400);
  }
}

function parseSeconds(formattedTime) {
  if (!formattedTime || formattedTime === '--:--') return 999999;
  const parts = formattedTime.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function renderMiniRadar() {
  const radar = document.getElementById('mini-radar-preview');
  if (!radar) return;
  const puzzle = getPuzzle10(State.board10.puzzleKey);
  radar.innerHTML = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const dot = document.createElement('div');
      const val = puzzle.grid[r * 2][c * 2];
      dot.className = val === 1 ? 'bg-[var(--gb-darkest)]' : 'bg-transparent';
      radar.appendChild(dot);
    }
  }
}

function startBoard10Timer() {
  if (State.board10.timerInterval) clearInterval(State.board10.timerInterval);
  const timerEl = document.getElementById('picross-timer-10');
  State.board10.timerInterval = setInterval(() => {
    if (!State.board10.isPaused && !State.board10.isCompleted) {
      if (State.board10.timerSeconds > 0) {
        State.board10.timerSeconds--;
        if (timerEl) {
          timerEl.innerText = formatTime(State.board10.timerSeconds);
        }
      } else {
        openModal('game-over-modal');
      }
    }
  }, 1000);
}

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ========================================================
// 8. 15x15 GAME BOY VIEW LOGIC
// ========================================================

function initGameboyView() {
  const grid15 = document.getElementById('gameboy-grid-15');
  if (!grid15) return;
  const cells = grid15.querySelectorAll('.cell-border');

  let currentIdx = 7 * 15 + 7;

  function updateCursor15(newIdx) {
    if (newIdx >= 0 && newIdx < cells.length) {
      cells[currentIdx].classList.remove('reticle-cursor');
      currentIdx = newIdx;
      cells[currentIdx].classList.add('reticle-cursor');
    }
  }

  cells.forEach((cell, idx) => {
    cell.addEventListener('pointerdown', () => {
      updateCursor15(idx);
      if (cell.classList.contains('bg-[#0f380f]')) {
        cell.classList.remove('bg-[#0f380f]');
        cell.innerText = '✕';
        sound.playMarkX();
        hapticPulse('shield');
      } else if (cell.innerText === '✕') {
        cell.innerText = '';
        sound.playChisel();
        hapticPulse('zap');
      } else {
        cell.classList.add('bg-[#0f380f]');
        cell.innerText = '';
        sound.playChisel();
        hapticPulse('zap');
      }
    });
  });

  const gbUp = document.getElementById('gb-btn-up');
  const gbDown = document.getElementById('gb-btn-down');
  const gbLeft = document.getElementById('gb-btn-left');
  const gbRight = document.getElementById('gb-btn-right');
  const gbA = document.getElementById('gb-btn-a');
  const gbB = document.getElementById('gb-btn-b');
  const gbStart = document.getElementById('gb-btn-start');
  const gbSelect = document.getElementById('gb-btn-select');

  if (gbUp) gbUp.addEventListener('click', () => { sound.playBlip(); updateCursor15(currentIdx - 15); });
  if (gbDown) gbDown.addEventListener('click', () => { sound.playBlip(); updateCursor15(currentIdx + 15); });
  if (gbLeft) gbLeft.addEventListener('click', () => { sound.playBlip(); if (currentIdx % 15 !== 0) updateCursor15(currentIdx - 1); });
  if (gbRight) gbRight.addEventListener('click', () => { sound.playBlip(); if (currentIdx % 15 !== 14) updateCursor15(currentIdx + 1); });

  if (gbA) {
    gbA.addEventListener('click', () => {
      const cell = cells[currentIdx];
      cell.innerText = '';
      cell.classList.toggle('bg-[#0f380f]');
      sound.playChisel();
      hapticPulse('zap');
    });
  }

  if (gbB) {
    gbB.addEventListener('click', () => {
      const cell = cells[currentIdx];
      cell.classList.remove('bg-[#0f380f]');
      cell.innerText = cell.innerText === '✕' ? '' : '✕';
      sound.playMarkX();
      hapticPulse('shield');
    });
  }

  if (gbStart) {
    gbStart.addEventListener('click', () => {
      sound.playBlip();
      openModal('pause-modal');
    });
  }

  if (gbSelect) {
    gbSelect.addEventListener('click', () => navigateTo('level-select'));
  }
}

function startBoard15Timer() {
  if (State.board15.timerInterval) clearInterval(State.board15.timerInterval);
  const timerEl = document.getElementById('gb-timer-display');
  State.board15.timerInterval = setInterval(() => {
    if (State.board15.timerSeconds > 0) {
      State.board15.timerSeconds--;
      if (timerEl) {
        timerEl.innerText = formatTime(State.board15.timerSeconds);
      }
    }
  }, 1000);
}

// ========================================================
// 9. MODALS & EVENTS
// ========================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  loadGameData();

  // Unlock Web Audio on first user interaction
  const unlockAudio = () => {
    sound.init();
    if (!sound.bgmMuted) {
      sound.startMusic('menu');
    }
    document.body.removeEventListener('pointerdown', unlockAudio);
    document.body.removeEventListener('keydown', unlockAudio);
  };
  document.body.addEventListener('pointerdown', unlockAudio);
  document.body.addEventListener('keydown', unlockAudio);

  initMainMenu();
  initSettingsModal();
  initLevelSelect();
  initBoard10();
  initGameboyView();

  // Navigation tab bar
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target) navigateTo(target);
    });
  });

  // Audio toggles (Top nav, In-Screen Board, Game Boy, and Pause modal)
  const bgmToggleButtons = [
    document.getElementById('music-toggle-btn'),
    document.getElementById('board-music-btn'),
    document.getElementById('gb-music-btn'),
    document.getElementById('pause-music-btn')
  ].filter(Boolean);

  bgmToggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.toggleBGM();
    });
  });

  const sfxToggleButtons = [
    document.getElementById('sound-toggle-btn'),
    document.getElementById('board-sound-btn'),
    document.getElementById('gb-sound-btn'),
    document.getElementById('pause-sound-btn')
  ].filter(Boolean);

  sfxToggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.toggleSFX();
    });
  });

  updateAudioButtonsUI();

  // Floating Dev Navigation Pill Toggle
  const devNavPill = document.getElementById('dev-nav-toggle-pill');
  const topNavBar = document.getElementById('top-nav-bar');
  if (devNavPill && topNavBar) {
    devNavPill.addEventListener('click', () => {
      topNavBar.classList.toggle('hidden');
      topNavBar.classList.toggle('flex');
      const isHidden = topNavBar.classList.contains('hidden');
      const label = devNavPill.querySelector('span:last-child');
      if (label) label.textContent = isHidden ? 'NAV' : 'DÖLJ';
    });
  }

  // Prevent accidental double-tap zoom on mobile devices while retaining fast response
  let lastTouchEndTime = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEndTime <= 300) {
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
      }
    }
    lastTouchEndTime = now;
  }, { passive: false });

  // Hint Roulette Modal Handlers
  const hintBtnYes = document.getElementById('hint-btn-yes');
  const hintBtnNo = document.getElementById('hint-btn-no');

  if (hintBtnYes) {
    hintBtnYes.addEventListener('click', () => {
      runHintRoulette();
    });
  }
  if (hintBtnNo) {
    hintBtnNo.addEventListener('click', () => {
      closeModal('hint-prompt-modal');
      navigateTo('game-board');
    });
  }

  // Toggle nav visibility
  const toggleNavBtn = document.getElementById('toggle-nav-visibility-btn');
  const navTabsContainer = document.getElementById('nav-tabs-container');
  if (toggleNavBtn && navTabsContainer) {
    toggleNavBtn.addEventListener('click', () => {
      navTabsContainer.classList.toggle('hidden');
    });
  }

  // Generic modal close
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playBlip();
      closeModal(btn.dataset.closeModal);
    });
  });

  // Pause menu actions
  const pauseResume = document.getElementById('pause-btn-resume');
  const pauseRestart = document.getElementById('pause-btn-restart');
  const pauseLevelSelect = document.getElementById('pause-btn-level-select');
  const pauseMainMenu = document.getElementById('pause-btn-main-menu');

  if (pauseResume) pauseResume.addEventListener('click', () => closeModal('pause-modal'));
  if (pauseRestart) {
    pauseRestart.addEventListener('click', () => {
      closeModal('pause-modal');
      loadLevelIntoBoard10(State.selectedLevelId);
    });
  }
  if (pauseLevelSelect) {
    pauseLevelSelect.addEventListener('click', () => {
      closeModal('pause-modal');
      navigateTo('level-select');
    });
  }
  if (pauseMainMenu) {
    pauseMainMenu.addEventListener('click', () => {
      closeModal('pause-modal');
      navigateTo('main-menu');
    });
  }

  const pauseLangBtn = document.getElementById('pause-btn-lang');
  if (pauseLangBtn) pauseLangBtn.addEventListener('click', toggleLanguage);

  // Exit game action
  function exitGameApp() {
    sound.playBlip();
    // 1. Capacitor native App plugin
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.exitApp();
      return;
    }
    // 2. Android WebView native
    if (navigator.app && navigator.app.exitApp) {
      navigator.app.exitApp();
      return;
    }
    // 3. Web browser fallback
    if (confirm("Vill du avsluta och stänga Alien Picross?")) {
      window.close();
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0c240c;color:#9bbc0f;font-family:monospace;text-align:center;padding:24px;">
          <h1 style="font-size:16px;margin-bottom:12px;font-weight:bold;">🛸 UPPDRAG AVSLUTAT</h1>
          <p style="font-size:11px;opacity:0.85;margin-bottom:20px;">Du kan nu stänga fliken eller trycka på hemknappen.</p>
          <button onclick="location.reload()" style="padding:10px 18px;background:#306230;color:#9bbc0f;border:2px solid #8bac0f;font-size:11px;font-weight:bold;cursor:pointer;border-radius:4px;">STARTA OM SPELET</button>
        </div>
      `;
    }
  }

  const menuExitBtn = document.getElementById('menu-btn-exit');
  if (menuExitBtn) menuExitBtn.addEventListener('click', exitGameApp);

  const pauseExitBtn = document.getElementById('pause-btn-exit');
  if (pauseExitBtn) pauseExitBtn.addEventListener('click', exitGameApp);

  // Victory modal actions
  const victoryNext = document.getElementById('victory-btn-next');
  const victoryLevels = document.getElementById('victory-btn-levels');
  if (victoryNext) {
    victoryNext.addEventListener('click', () => {
      closeModal('victory-modal');
      // Advance to next level in sequence 1-A -> 1-B ... -> 8-H
      const keys = Object.keys(window.ALL_PUZZLES_10x10 || {});
      const currIdx = keys.indexOf(State.selectedLevelId);
      const nextKey = keys[(currIdx + 1) % keys.length] || '1-A';
      promptHintAndStartLevel(nextKey);
    });
  }
  if (victoryLevels) {
    victoryLevels.addEventListener('click', () => {
      closeModal('victory-modal');
      navigateTo('level-select');
    });
  }

  // Game over modal actions
  const gameOverRestart = document.getElementById('game-over-btn-restart');
  const gameOverLevels = document.getElementById('game-over-btn-levels');
  if (gameOverRestart) {
    gameOverRestart.addEventListener('click', () => {
      closeModal('game-over-modal');
      loadLevelIntoBoard10(State.selectedLevelId);
    });
  }
  if (gameOverLevels) {
    gameOverLevels.addEventListener('click', () => {
      closeModal('game-over-modal');
      navigateTo('level-select');
    });
  }

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (State.currentScreen === 'game-board') {
      if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor10(-10); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor10(10); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (State.board10.cursorIndex % 10 !== 0) moveCursor10(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); if (State.board10.cursorIndex % 10 !== 9) moveCursor10(1); }
      else if (e.key === 'z' || e.key === 'Z' || e.key === ' ') { e.preventDefault(); applyCellAction(State.board10.cursorIndex, 'chisel'); }
      else if (e.key === 'x' || e.key === 'X') { e.preventDefault(); applyCellAction(State.board10.cursorIndex, 'mark-x'); }
      else if (e.key === 'Escape') { openModal('pause-modal'); }
    }
  });

  // Update language & audio UI initial state
  updateDifficultyUI();
  updateLanguageUI();
  updateAudioButtonsUI();
  updateToolModeUI();

  // Start at main-menu
  navigateTo('main-menu');
});
