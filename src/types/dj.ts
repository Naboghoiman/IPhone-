/**
 * MASAVU DJ Engine & VDJ8-Style Sync Types
 */

export interface DynamicBeatAnchor {
  beatIndex: number;
  sourceSample: number;
  localBpm: number;
  confidence: number;
}

export interface BeatCandidate {
  beatIndex: number;
  predictedSample: number;
  detectedOnsetSample: number;
  offsetMs: number;
  onsetStrength: number;
  lowFrequencyStrength: number;
  confidence: number;
  isReliable: boolean;
}

export interface BeatGridRefinementInfo {
  classification: 'STRAIGHT' | 'DYNAMIC';
  confidence: number;
  applied: boolean;
  globalOffsetMs: number;
  bpmDriftSlope: number; // ms error per beat
  originalBpm: number;
  refinedBpm: number;
  detectedCandidateCount: number;
  reliableCandidateCount: number;
  statusMessage: string;
  dynamicAnchors?: DynamicBeatAnchor[];
}

export interface BeatGrid {
  firstDownbeatSample: number;
  samplesPerBeat: number;
  bpm: number;
  beatsPerBar: number;
  totalBeats: number;
  confidence: number;
  beatSamples?: number[];
  isDownbeat?: boolean[];
  gridType?: 'STRAIGHT' | 'DYNAMIC';
  dynamicAnchors?: DynamicBeatAnchor[];
  refinementInfo?: BeatGridRefinementInfo;
  localBpm?: number;
}

export interface WarpMap {
  transientMarkers?: number[];
  cuePoints?: Array<{
    id: string;
    name: string;
    sample: number;
    color?: string;
  }>;
}

export interface GrooveEvent {
  beatIndex: number;
  samplePosition: number;
  offsetFromBeatMs: number;
  type: 'kick' | 'transient';
  strength: number;   // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
}

export interface GroovePattern {
  events: GrooveEvent[];
  startBeatIndex: number;
  endBeatIndex: number;
  barsCount: number;
}

export interface GrooveMatch {
  slaveBeatIndex: number;
  slaveSourceSample: number;
  grooveOffsetMs: number;
  matchedKickCount: number;
  averageKickErrorMs: number;
  confidence: number;
  score: number;
  appliedMode: 'groove' | 'kick-snap' | 'grid';
}

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  sampleRate: number;
  duration: number;
  beatGrid: BeatGrid;
  warpMap?: WarpMap;
  grooveMap?: GrooveEvent[];
  audioBuffer?: AudioBuffer;
  color?: string;
}

export interface PreparedTrack {
  track: TrackData;
  sampleRate: number;
  totalSamples: number;
  targetBpm: number;
}

export interface SlaveStartPlan {
  targetOutputFrame: number;
  targetOutputTime: number;
  masterBeatNumber: number;
  masterIsDownbeat: boolean;
  masterBarIndex: number;
  slaveSourceSample: number;
  slaveBeatNumber: number;
  slaveIsDownbeat: boolean;
  baseTempoMultiplier: number;
  decoderLatencyFrames: number;
  timeStretcherLatencyFrames: number;
  audioBufferLatencyFrames: number;
  totalLatencySeconds: number;
  prerollOutputTime: number;
}

export interface DeckTelemetry {
  deckId: 'A' | 'B';
  isPlaying: boolean;
  isPaused: boolean;
  currentSourceSample: number;
  currentTimeSeconds: number;
  totalDurationSeconds: number;
  currentBeatFloat: number;
  currentBeatInBar: number;
  currentBarIndex: number;
  isDownbeat: boolean;
  baseBpm: number;
  effectiveBpm: number;
  baseTempoMultiplier: number;
  jogPitchNudge: number;
  pllMultiplier: number;
  pitchPercentage: number;
  isSync: boolean;
  isMaster: boolean;
  volume: number;
  cueSample: number;
  lowEq: number;
  midEq: number;
  highEq: number;
  filter: number;
}
