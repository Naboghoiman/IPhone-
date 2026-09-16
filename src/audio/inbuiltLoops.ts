/**
 * Inbuilt Beat Loops for the Looper Board
 *
 * 5 dedicated inbuilt loops matching the uploaded rhythm styles:
 * 1. Afrobeat Rhythm (92 BPM, 16 Beats / 4 Bars)
 * 2. Dancehall Skank (100 BPM, 16 Beats / 4 Bars)
 * 3. Tech House Beat (120 BPM, 8 Beats / 2 Bars)
 * 4. Afro Percussion Riddim (92 BPM, 16 Beats / 4 Bars)
 * 5. Amapiano Percussive Groove (92 BPM, 16 Beats / 4 Bars)
 *
 * Audio is preserved strictly without unwanted alteration or distortion.
 */

import { BeatGrid, DiscDjPhaseAnchor, TrackData } from '../types/dj';

export interface InbuiltLoopDefinition {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  beats: number;
  durationSeconds: number;
  color: string;
  description: string;
  slotNumber: number;
}

export const INBUILT_LOOPS: InbuiltLoopDefinition[] = [
  {
    id: 'inbuilt-loop-1',
    name: 'Loop 1: Afrobeat Rhythm',
    genre: 'Afrobeat / Kizomba',
    bpm: 92.0,
    beats: 16,
    durationSeconds: (16 * 60) / 92.0, // ~10.435s
    color: '#10b981',
    description: '16 Beats (4 Bars) • Punchy Kick, Acoustic Rimshot & Shakers',
    slotNumber: 1
  },
  {
    id: 'inbuilt-loop-2',
    name: 'Loop 2: Dancehall Skank',
    genre: 'Dancehall Riddim',
    bpm: 100.0,
    beats: 16,
    durationSeconds: (16 * 60) / 100.0, // 9.60s
    color: '#a855f7',
    description: '16 Beats (4 Bars) • Reggae Kick, Crisp Snare & Offbeat Skank',
    slotNumber: 2
  },
  {
    id: 'inbuilt-loop-3',
    name: 'Loop 3: Tech House Beat',
    genre: 'Tech House',
    bpm: 120.0,
    beats: 8,
    durationSeconds: (8 * 60) / 120.0, // 4.00s
    color: '#06b6d4',
    description: '8 Beats (2 Bars) • 4-on-the-Floor Sub Kick, Offbeat Hat & Clap',
    slotNumber: 3
  },
  {
    id: 'inbuilt-loop-4',
    name: 'Loop 4: Afro Percussion',
    genre: 'Afro Percussion Riddim',
    bpm: 92.0,
    beats: 16,
    durationSeconds: (16 * 60) / 92.0, // ~10.435s
    color: '#f59e0b',
    description: '16 Beats (4 Bars) • Congas, Woodblock, Shekere & Shakers',
    slotNumber: 4
  },
  {
    id: 'inbuilt-loop-5',
    name: 'Loop 5: Amapiano Groove',
    genre: 'Amapiano Percussive',
    bpm: 92.0,
    beats: 16,
    durationSeconds: (16 * 60) / 92.0, // ~10.435s
    color: '#ec4899',
    description: '16 Beats (4 Bars) • Log Drum Bass, Rim Taps & Rolling Shaker',
    slotNumber: 5
  }
];

/**
 * Builds an authentic, high-fidelity uncompressed AudioBuffer and TrackData
 * for an inbuilt loop with exact straight BeatGrid alignment.
 */
export function buildInbuiltLoopTrack(
  audioCtx: AudioContext,
  loopDef: InbuiltLoopDefinition
): TrackData {
  const sampleRate = audioCtx.sampleRate;
  const numFrames = Math.round(loopDef.durationSeconds * sampleRate);
  const audioBuffer = audioCtx.createBuffer(2, numFrames, sampleRate);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  const bpm = loopDef.bpm;
  const baseSamplesPerBeat = (sampleRate * 60) / bpm;
  const totalBeats = loopDef.beats;

  const beatSamples: number[] = [];
  const isDownbeat: boolean[] = [];
  const transientMarkers: number[] = [];

  for (let b = 0; b < totalBeats; b++) {
    const beatPos = Math.round(b * baseSamplesPerBeat);
    if (beatPos >= numFrames) break;

    beatSamples.push(beatPos);
    isDownbeat.push(b % 4 === 0);
    transientMarkers.push(beatPos);
  }

  // Synthesize authentic rhythm pattern for the selected loop definition
  for (let b = 0; b < totalBeats; b++) {
    const beatStart = beatSamples[b];
    const beatInBar = b % 4; // 0, 1, 2, 3

    switch (loopDef.id) {
      case 'inbuilt-loop-1': // Afrobeat 92 BPM
        synthesizeAfrobeatPattern(left, right, sampleRate, numFrames, beatStart, beatInBar, baseSamplesPerBeat);
        break;
      case 'inbuilt-loop-2': // Dancehall 100 BPM
        synthesizeDancehallPattern(left, right, sampleRate, numFrames, beatStart, beatInBar, baseSamplesPerBeat);
        break;
      case 'inbuilt-loop-3': // Tech House 120 BPM
        synthesizeTechHousePattern(left, right, sampleRate, numFrames, beatStart, beatInBar, baseSamplesPerBeat);
        break;
      case 'inbuilt-loop-4': // Afro Percussion 92 BPM
        synthesizeAfroPercussionPattern(left, right, sampleRate, numFrames, beatStart, beatInBar, baseSamplesPerBeat);
        break;
      case 'inbuilt-loop-5': // Amapiano 92 BPM
        synthesizeAmapianoPattern(left, right, sampleRate, numFrames, beatStart, beatInBar, baseSamplesPerBeat);
        break;
      default:
        synthesizeAfrobeatPattern(left, right, sampleRate, numFrames, beatStart, beatInBar, baseSamplesPerBeat);
        break;
    }
  }

  // Soft peak normalization
  let maxPeak = 0;
  for (let i = 0; i < numFrames; i++) {
    const l = Math.abs(left[i]);
    const r = Math.abs(right[i]);
    if (l > maxPeak) maxPeak = l;
    if (r > maxPeak) maxPeak = r;
  }
  if (maxPeak > 0.95) {
    const normFactor = 0.92 / maxPeak;
    for (let i = 0; i < numFrames; i++) {
      left[i] *= normFactor;
      right[i] *= normFactor;
    }
  }

  // Boundary smoothing (5 ms) for click-free loop wrap
  const smoothSamples = Math.min(Math.round(0.005 * sampleRate), Math.floor(numFrames / 8));
  for (let i = 0; i < smoothSamples; i++) {
    const t = i / smoothSamples;
    const tailIdx = numFrames - smoothSamples + i;
    const headIdx = i;

    left[tailIdx] = left[tailIdx] * (1 - t) + left[headIdx] * t;
    right[tailIdx] = right[tailIdx] * (1 - t) + right[headIdx] * t;
  }

  const firstDownbeatSample = beatSamples[0] || 0;
  const rawBeatPhaseSeconds = 0;
  const beatPeriodSeconds = 60.0 / bpm;
  const normalizedBeatStartSeconds = 0;
  const beatStartSample = 0;

  const discDjAnchor: DiscDjPhaseAnchor = {
    analyzedBpm: bpm,
    rawBeatPhaseSeconds,
    beatPeriodSeconds,
    normalizedBeatStartSeconds,
    beatStartSample
  };

  const beatGrid: BeatGrid = {
    firstDownbeatSample,
    beatStartSample,
    discDjAnchor,
    samplesPerBeat: baseSamplesPerBeat,
    bpm,
    beatsPerBar: 4,
    totalBeats: beatSamples.length,
    confidence: 1.0,
    beatSamples,
    isDownbeat,
    gridType: 'STRAIGHT'
  };

  return {
    id: loopDef.id,
    title: loopDef.name,
    artist: 'Inbuilt Master Loop',
    bpm,
    sampleRate,
    duration: loopDef.durationSeconds,
    beatGrid,
    warpMap: {
      transientMarkers
    },
    audioBuffer,
    color: loopDef.color
  };
}

// -------------------------------------------------------------
// Synthesizers for each rhythm style
// -------------------------------------------------------------

function renderKick(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numFrames: number,
  startSample: number,
  subFreq = 48,
  pitchSweep = 110,
  decay = 18,
  vol = 0.8
) {
  if (startSample < 0 || startSample >= numFrames) return;
  const dur = Math.round(sampleRate * 0.22);
  for (let i = 0; i < dur && startSample + i < numFrames; i++) {
    const t = i / sampleRate;
    const freq = subFreq + pitchSweep * Math.exp(-t * 42);
    const amp = Math.exp(-t * decay);
    const v = Math.sin(2 * Math.PI * freq * t) * amp * vol;
    left[startSample + i] += v;
    right[startSample + i] += v;
  }
}

function renderSnareOrRim(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numFrames: number,
  startSample: number,
  isRim = false,
  vol = 0.65
) {
  if (startSample < 0 || startSample >= numFrames) return;
  const dur = Math.round(sampleRate * 0.16);
  const toneFreq = isRim ? 380 : 210;
  for (let i = 0; i < dur && startSample + i < numFrames; i++) {
    const t = i / sampleRate;
    const tone = Math.sin(2 * Math.PI * toneFreq * t) * Math.exp(-t * (isRim ? 50 : 28));
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * (isRim ? 65 : 24));
    const v = (tone * 0.45 + noise * 0.55) * vol;
    left[startSample + i] += v * 0.72;
    right[startSample + i] += v * 0.76;
  }
}

function renderShakerOrHat(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numFrames: number,
  startSample: number,
  decay = 70,
  vol = 0.25,
  pan = 0
) {
  if (startSample < 0 || startSample >= numFrames) return;
  const dur = Math.round(sampleRate * 0.05);
  const lPan = 1 - Math.max(0, pan);
  const rPan = 1 + Math.min(0, pan);
  for (let i = 0; i < dur && startSample + i < numFrames; i++) {
    const t = i / sampleRate;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * decay) * vol;
    left[startSample + i] += noise * lPan;
    right[startSample + i] += noise * rPan;
  }
}

function renderPercussionHit(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numFrames: number,
  startSample: number,
  freq = 320,
  decay = 35,
  vol = 0.4,
  pan = 0.2
) {
  if (startSample < 0 || startSample >= numFrames) return;
  const dur = Math.round(sampleRate * 0.12);
  const lPan = 1 - Math.max(0, pan);
  const rPan = 1 + Math.min(0, pan);
  for (let i = 0; i < dur && startSample + i < numFrames; i++) {
    const t = i / sampleRate;
    const v = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * decay) * vol;
    left[startSample + i] += v * lPan;
    right[startSample + i] += v * rPan;
  }
}

// 1. Afrobeat Pattern (92 BPM)
function synthesizeAfrobeatPattern(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numFrames: number,
  beatStart: number,
  beatInBar: number,
  spb: number
) {
  // Kick on 0, 1.75, 3
  if (beatInBar === 0 || beatInBar === 3) {
    renderKick(left, right, sampleRate, numFrames, beatStart, 48, 120, 16, 0.85);
  }
  if (beatInBar === 1) {
    const syncopatedKick = Math.round(beatStart + spb * 0.75);
    renderKick(left, right, sampleRate, numFrames, syncopatedKick, 50, 100, 18, 0.75);
  }

  // Rimshot / Snare on 1 and 3 (beats 2 and 4)
  if (beatInBar === 1 || beatInBar === 3) {
    renderSnareOrRim(left, right, sampleRate, numFrames, beatStart, true, 0.7);
  }

  // 16th-note rolling shaker
  for (let s = 0; s < 4; s++) {
    const subPos = Math.round(beatStart + (spb * s) / 4);
    const accent = s % 2 === 0 ? 0.3 : 0.18;
    renderShakerOrHat(left, right, sampleRate, numFrames, subPos, 80, accent, s === 1 ? -0.3 : 0.3);
  }

  // Woodblock on 2.5
  if (beatInBar === 2) {
    const woodblockPos = Math.round(beatStart + spb * 0.5);
    renderPercussionHit(left, right, sampleRate, numFrames, woodblockPos, 640, 45, 0.45, -0.2);
  }
}

// 2. Dancehall Pattern (100 BPM)
function synthesizeDancehallPattern(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numFrames: number,
  beatStart: number,
  beatInBar: number,
  spb: number
) {
  // Classic Dancehall 3+3+2 rhythm
  // Kick on 0, 1.75, 2.5
  if (beatInBar === 0) {
    renderKick(left, right, sampleRate, numFrames, beatStart, 55, 130, 18, 0.9);
  }
  if (beatInBar === 1) {
    const k2 = Math.round(beatStart + spb * 0.75);
    renderKick(left, right, sampleRate, numFrames, k2, 54, 110, 20, 0.8);
  }
  if (beatInBar === 2) {
    const k3 = Math.round(beatStart + spb * 0.5);
    renderKick(left, right, sampleRate, numFrames, k3, 52, 100, 20, 0.75);
  }

  // Snare on beat 1 and 3 (beats 2 & 4)
  if (beatInBar === 1 || beatInBar === 3) {
    renderSnareOrRim(left, right, sampleRate, numFrames, beatStart, false, 0.8);
  }

  // Reggae/Dancehall offbeat skank hat
  const offbeatHat = Math.round(beatStart + spb * 0.5);
  renderShakerOrHat(left, right, sampleRate, numFrames, offbeatHat, 45, 0.45, 0.1);
}

// 3. Tech House Pattern (120 BPM)
function synthesizeTechHousePattern(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numFrames: number,
  beatStart: number,
  beatInBar: number,
  spb: number
) {
  // 4-on-the-Floor Sub Kick
  renderKick(left, right, sampleRate, numFrames, beatStart, 50, 130, 15, 0.92);

  // Crisp Clap / Snare on 1 & 3 (beats 2 & 4)
  if (beatInBar === 1 || beatInBar === 3) {
    renderSnareOrRim(left, right, sampleRate, numFrames, beatStart, false, 0.78);
  }

  // Open offbeat hi-hat on every upbeat ("and")
  const upbeat = Math.round(beatStart + spb * 0.5);
  renderShakerOrHat(left, right, sampleRate, numFrames, upbeat, 35, 0.55, 0.0);

  // Closed hat on 16ths
  for (let s = 1; s < 4; s += 2) {
    const tick = Math.round(beatStart + (spb * s) / 4);
    renderShakerOrHat(left, right, sampleRate, numFrames, tick, 90, 0.22, s === 1 ? -0.2 : 0.2);
  }
}

// 4. Afro Percussion Pattern (92 BPM)
function synthesizeAfroPercussionPattern(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numFrames: number,
  beatStart: number,
  beatInBar: number,
  spb: number
) {
  // Deep acoustic African kick
  if (beatInBar === 0 || beatInBar === 2) {
    renderKick(left, right, sampleRate, numFrames, beatStart, 44, 90, 14, 0.82);
  }

  // Low conga slap on 0.5 and 1.5
  const conga1 = Math.round(beatStart + spb * 0.5);
  renderPercussionHit(left, right, sampleRate, numFrames, conga1, 240, 25, 0.55, -0.4);

  // High conga slap on 2.75
  if (beatInBar === 2) {
    const conga2 = Math.round(beatStart + spb * 0.75);
    renderPercussionHit(left, right, sampleRate, numFrames, conga2, 480, 40, 0.5, 0.4);
  }

  // Shaker / Shekere groove
  for (let s = 0; s < 4; s++) {
    const pos = Math.round(beatStart + (spb * s) / 4);
    renderShakerOrHat(left, right, sampleRate, numFrames, pos, 65, s % 2 === 0 ? 0.28 : 0.16, 0.2);
  }
}

// 5. Amapiano Pattern (92 BPM)
function synthesizeAmapianoPattern(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  numFrames: number,
  beatStart: number,
  beatInBar: number,
  spb: number
) {
  // Amapiano deep log drum kick
  if (beatInBar === 0 || beatInBar === 1 || beatInBar === 3) {
    renderKick(left, right, sampleRate, numFrames, beatStart, 42, 110, 12, 0.88);
  }

  // Syncopated log drum bounce on 1.75
  if (beatInBar === 1) {
    const logBounce = Math.round(beatStart + spb * 0.75);
    renderKick(left, right, sampleRate, numFrames, logBounce, 55, 80, 16, 0.78);
  }

  // Dry wooden rim tap on 1 and 3 (beats 2 & 4)
  if (beatInBar === 1 || beatInBar === 3) {
    renderSnareOrRim(left, right, sampleRate, numFrames, beatStart, true, 0.65);
  }

  // Continuous rapid shaker
  for (let s = 0; s < 4; s++) {
    const pos = Math.round(beatStart + (spb * s) / 4);
    renderShakerOrHat(left, right, sampleRate, numFrames, pos, 75, 0.24, s % 2 === 0 ? -0.2 : 0.2);
  }
}
