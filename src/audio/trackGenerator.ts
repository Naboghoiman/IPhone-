/**
 * Synthetic Audio Track Generator for Clean-Room Testing
 *
 * Synthesizes multi-instrument audio buffers for 50 diverse test songs and presets,
 * including authentic Afrobeat, Dancehall, Amapiano, House, Techno, DnB, and Variable BPM tracks.
 */

import { BeatGrid, DiscDjPhaseAnchor, TrackData } from '../types/dj';
import { analyzeAudioBufferBpm, refineTrackBeatGrid } from './bpmAnalyzer';
import { FIFTY_TEST_SONGS, SongLibraryItem } from './songLibrary';

export interface DemoTrackPreset {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  genre: string;
  color: string;
  durationSeconds: number;
  type: 'house' | 'tech' | 'halftime' | 'dnb' | 'afro' | 'dancehall' | 'techno' | 'hiphop' | 'variable';
  hasIntro?: boolean;
  introDurationSec?: number;
  variableBpm?: boolean;
  bpmVariance?: number;
}

export const DEMO_PRESETS: DemoTrackPreset[] = [
  {
    id: 'track-house-124',
    title: 'Neon Horizon',
    artist: 'DJ IMAN',
    bpm: 124,
    genre: 'Deep Tech House',
    color: '#06b6d4',
    durationSeconds: 32,
    type: 'house'
  },
  {
    id: 'track-tech-126',
    title: 'Velvet Groove',
    artist: 'DJ IMAN',
    bpm: 126,
    genre: 'Tech House',
    color: '#3b82f6',
    durationSeconds: 32,
    type: 'tech'
  },
  {
    id: 'afro-98-wanjula',
    title: 'Wanjula (East African Groove)',
    artist: 'Kampala Sound System',
    bpm: 98.0,
    genre: 'Afrobeat / East African',
    color: '#10b981',
    durationSeconds: 32,
    type: 'afro',
    hasIntro: true,
    introDurationSec: 2.45
  },
  {
    id: 'dh-78-katonda',
    title: 'Katonda Wange (Gospel Reggae)',
    artist: 'Gospel Skankers',
    bpm: 78.0,
    genre: 'Gospel Reggae',
    color: '#a16207',
    durationSeconds: 32,
    type: 'dancehall'
  },
  {
    id: 'track-half-62',
    title: 'Midnight Stride',
    artist: 'Sub Zero (0.5x Match)',
    bpm: 62,
    genre: 'Halftime Dub',
    color: '#8b5cf6',
    durationSeconds: 32,
    type: 'halftime'
  },
  {
    id: 'track-dnb-174',
    title: 'Solar Flare',
    artist: 'HyperDrive (2x Match)',
    bpm: 174,
    genre: 'Drum & Bass',
    color: '#f59e0b',
    durationSeconds: 32,
    type: 'dnb'
  },
  {
    id: 'var-96-live-band',
    title: 'Live Afro-Jazz Session',
    artist: 'Fela Legacy (Variable BPM)',
    bpm: 96.4,
    genre: 'Live Afrobeat (Variable)',
    color: '#ec4899',
    durationSeconds: 32,
    type: 'variable',
    variableBpm: true,
    bpmVariance: 1.5
  }
];

export { FIFTY_TEST_SONGS };

export function buildSyntheticTrack(
  audioCtx: AudioContext,
  preset: DemoTrackPreset | SongLibraryItem
): TrackData {
  const sampleRate = audioCtx.sampleRate;
  const duration = preset.durationSeconds || 32;
  const numFrames = Math.round(duration * sampleRate);
  const audioBuffer = audioCtx.createBuffer(2, numFrames, sampleRate);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  const bpm = preset.bpm;
  const baseSamplesPerBeat = (sampleRate * 60) / bpm;

  // Handle intro delay if present (e.g. quiet vocal or synth intro before drum drop)
  const introFrames = preset.hasIntro && preset.introDurationSec
    ? Math.round(preset.introDurationSec * sampleRate)
    : 0;

  const totalBeats = Math.floor((numFrames - introFrames) / baseSamplesPerBeat);

  const beatSamples: number[] = [];
  const isDownbeat: boolean[] = [];
  const transientMarkers: number[] = [];

  // Categorize track style
  const category = 'category' in preset ? preset.category : ('type' in preset ? preset.type : 'house');

  // Pre-generate beat positions with optional variable micro-drift (human feel)
  let currentSamplePos = introFrames;
  for (let b = 0; b < totalBeats; b++) {
    // Variable drift factor for live/variable tracks (+/- 1.5 BPM drift)
    let beatStep = baseSamplesPerBeat;
    if (preset.variableBpm && preset.bpmVariance) {
      const drift = Math.sin(b * 0.7) * (preset.bpmVariance / bpm) * baseSamplesPerBeat;
      beatStep += drift;
    }

    const beatPos = Math.round(currentSamplePos);
    if (beatPos >= numFrames) break;

    beatSamples.push(beatPos);
    isDownbeat.push(b % 4 === 0);

    // Micro-transient offset or fixed rhythmic kick offset from preset
    const presetKickOffset = 'kickOffsetMs' in preset && preset.kickOffsetMs ? preset.kickOffsetMs : 0;
    const offsetMs = presetKickOffset !== 0 ? presetKickOffset : (Math.sin(b * 17.13) * 3);
    const transientOffset = Math.round((offsetMs / 1000) * sampleRate);
    transientMarkers.push(Math.max(0, beatPos + transientOffset));

    currentSamplePos += beatStep;
  }

  // If there is an intro, synthesize gentle ambient pad or melodic chime before the beat
  if (introFrames > 0) {
    for (let i = 0; i < introFrames; i++) {
      const t = i / sampleRate;
      const pad = Math.sin(2 * Math.PI * 220 * t) * 0.15 * Math.sin(2 * Math.PI * 0.5 * t);
      left[i] += pad;
      right[i] += pad;
    }
  }

  // Synthesize rhythmic instruments into the audio buffer
  const presetKickOffsetMs = 'kickOffsetMs' in preset && preset.kickOffsetMs ? preset.kickOffsetMs : 0;
  const kickOffsetFrames = Math.round((presetKickOffsetMs / 1000) * sampleRate);

  for (let b = 0; b < beatSamples.length; b++) {
    const beatStart = beatSamples[b];
    const kickStart = beatStart + kickOffsetFrames;
    const beatInBar = b % 4;

    // 1. Kick Drum
    let hasKick = false;
    let kickSubFreq = 50;

    if (category === 'house' || category === 'techno' || category === 'tech') {
      hasKick = true; // 4-on-the-floor
      kickSubFreq = category === 'techno' ? 42 : 50;
    } else if (category === 'afrobeat' || category === 'afro') {
      hasKick = beatInBar === 0 || beatInBar === 1 || beatInBar === 3;
      kickSubFreq = 48;
    } else if (category === 'dancehall') {
      hasKick = beatInBar === 0 || beatInBar === 2; // punchy reggae/dancehall kick
      kickSubFreq = 55;
    } else if (category === 'hiphop' || category === 'halftime') {
      hasKick = beatInBar === 0 || beatInBar === 2;
      kickSubFreq = 40;
    } else if (category === 'dnb') {
      hasKick = beatInBar === 0 || beatInBar === 2;
      kickSubFreq = 45;
    } else {
      hasKick = beatInBar === 0 || beatInBar === 2;
    }

    if (hasKick && kickStart < numFrames && kickStart >= 0) {
      const kickDuration = Math.round(sampleRate * 0.18);
      for (let i = 0; i < kickDuration && kickStart + i < numFrames; i++) {
        const t = i / sampleRate;
        const freq = kickSubFreq + 110 * Math.exp(-t * 38);
        const amp = Math.exp(-t * 16);
        const val = Math.sin(2 * Math.PI * freq * t) * amp * 0.78;

        left[kickStart + i] += val;
        right[kickStart + i] += val;
      }
    }

    // 2. Snare / Clap / Rimshot
    let hasSnare = false;
    if (category === 'house' || category === 'techno' || category === 'tech') {
      hasSnare = beatInBar === 1 || beatInBar === 3;
    } else if (category === 'dancehall') {
      hasSnare = beatInBar === 1 || beatInBar === 3;
    } else if (category === 'afrobeat') {
      hasSnare = beatInBar === 1 || beatInBar === 3;
    } else if (category === 'dnb') {
      hasSnare = beatInBar === 1 || beatInBar === 3;
    } else if (category === 'hiphop') {
      hasSnare = beatInBar === 1 || beatInBar === 3;
    }

    if (hasSnare && beatStart < numFrames) {
      const snareDuration = Math.round(sampleRate * 0.14);
      for (let i = 0; i < snareDuration && beatStart + i < numFrames; i++) {
        const t = i / sampleRate;
        const tone = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 26) * 0.28;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22) * 0.38;
        const val = tone + noise;

        left[beatStart + i] += val * 0.72;
        right[beatStart + i] += val * 0.75;
      }
    }

    // 3. Hi-Hats / Shakers
    const halfBeat = Math.round(beatStart + baseSamplesPerBeat * 0.5);
    if (halfBeat < numFrames) {
      const hatDuration = Math.round(sampleRate * 0.05);
      for (let i = 0; i < hatDuration && halfBeat + i < numFrames; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.24;
        left[halfBeat + i] += noise * 0.8;
        right[halfBeat + i] += noise * 0.85;
      }
    }

    // 4. Bassline / Harmonic Roots
    const bassDuration = Math.round(baseSamplesPerBeat * 0.85);
    const rootFreq = category === 'dnb' ? 65.41 : 55.0;
    const chordProgressions = [1, 1.25, 1.333, 1.5];
    const barIdx = Math.floor(b / 4);
    const currentNoteFreq = rootFreq * chordProgressions[barIdx % chordProgressions.length];

    for (let i = 0; i < bassDuration && beatStart + i < numFrames; i++) {
      const t = i / sampleRate;
      const bassEnv = Math.exp(-t * 5.5);
      const sub = Math.sin(2 * Math.PI * currentNoteFreq * t);
      const harmonic = 0.25 * Math.sin(4 * Math.PI * currentNoteFreq * t);
      const bassVal = (sub + harmonic) * bassEnv * 0.28;

      left[beatStart + i] += bassVal;
      right[beatStart + i] += bassVal;
    }
  }

  // Soft peak normalization to prevent digital distortion
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

  const firstDownbeatSample = beatSamples[0] || 0;
  const rawBeatPhaseSeconds = firstDownbeatSample / sampleRate;
  const beatPeriodSeconds = 60.0 / bpm;
  const normalizedBeatStartSeconds =
    ((rawBeatPhaseSeconds % beatPeriodSeconds) + beatPeriodSeconds) % beatPeriodSeconds;
  const beatStartSample = Math.round(normalizedBeatStartSeconds * sampleRate);

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
    confidence: preset.variableBpm ? 0.92 : 0.99,
    beatSamples,
    isDownbeat,
    gridType: 'STRAIGHT'
  };

  const rawTrack: TrackData = {
    id: preset.id,
    title: preset.title,
    artist: preset.artist,
    bpm,
    sampleRate,
    duration,
    beatGrid,
    warpMap: {
      transientMarkers
    },
    audioBuffer,
    color: preset.color
  };

  // For DiscDJ Beat Phase Parity: return rawTrack with canonical straight grid
  // (BeatGridRefiner is preserved for future multi-track dynamic tests)
  return rawTrack;
}

/**
 * Parses user-uploaded audio file into TrackData with automatic 100% precision peak & downbeat analysis
 */
export async function decodeUploadedAudioFile(
  audioCtx: AudioContext,
  file: File
): Promise<TrackData> {
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  // Run full precision multi-band onset and autocorrelation BPM analysis
  const analysis = analyzeAudioBufferBpm(audioBuffer);

  const title = file.name.replace(/\.[^/.]+$/, '');

  const rawTrack: TrackData = {
    id: `upload-${Date.now()}`,
    title: title || 'User Track',
    artist: 'Imported Audio',
    bpm: analysis.bpm,
    sampleRate,
    duration,
    beatGrid: {
      firstDownbeatSample: analysis.firstDownbeatSample,
      beatStartSample: analysis.beatStartSample,
      discDjAnchor: analysis.discDjAnchor,
      samplesPerBeat: analysis.samplesPerBeat,
      bpm: analysis.bpm,
      beatsPerBar: 4,
      totalBeats: analysis.beatSamples.length,
      confidence: analysis.confidence,
      beatSamples: analysis.beatSamples,
      isDownbeat: analysis.isDownbeat,
      gridType: 'STRAIGHT'
    },
    warpMap: {
      transientMarkers: analysis.transientMarkers
    },
    audioBuffer,
    color: '#06b6d4'
  };

  // For DiscDJ Beat Phase Parity: return rawTrack with canonical straight grid
  return rawTrack;
}
