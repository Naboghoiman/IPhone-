import { useState, useRef, useCallback } from 'react';
import { TrackData } from '../types/dj';
import { analyzeAudioBufferBpm, recalibrateTrackBeatGrid, refineTrackBeatGrid } from '../audio/bpmAnalyzer';
import { Activity, CheckCircle, RefreshCw, Sliders, X, Zap, Sparkles, Anchor, ShieldCheck } from 'lucide-react';

interface BpmAnalyzerModalProps {
  isOpen: boolean;
  deckId: 'A' | 'B';
  track: TrackData | null;
  currentPlaybackSample?: number;
  onClose: () => void;
  onUpdateTrack: (deckId: 'A' | 'B', updatedTrack: TrackData) => void;
}

export function BpmAnalyzerModal({
  isOpen,
  deckId,
  track,
  currentPlaybackSample = 0,
  onClose,
  onUpdateTrack
}: BpmAnalyzerModalProps) {
  const [bpmInput, setBpmInput] = useState<number>(track?.bpm ?? 124);
  const [downbeatOffset, setDownbeatOffset] = useState<number>(track?.beatGrid.firstDownbeatSample ?? 0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapBpm, setTapBpm] = useState<number | null>(null);

  // Sync state with track when opened
  if (track && Math.abs(bpmInput - track.bpm) > 0.001 && !analysisStatus) {
    setBpmInput(track.bpm);
    setDownbeatOffset(track.beatGrid.firstDownbeatSample);
  }

  // Handle Tap Tempo
  const handleTap = useCallback(() => {
    const now = performance.now();
    const times = tapTimesRef.current;

    if (times.length > 0 && now - times[times.length - 1] > 2000) {
      tapTimesRef.current = [now];
      return;
    }

    times.push(now);
    if (times.length > 8) times.shift();

    if (times.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round((60000 / avgInterval) * 10) / 10;
      setTapBpm(calculatedBpm);
      setBpmInput(calculatedBpm);
    }
  }, []);

  // Run deep FFT & Autocorrelation analysis
  const handleRunDeepAnalysis = useCallback(() => {
    if (!track || !track.audioBuffer) return;
    setIsAnalyzing(true);
    setAnalysisStatus('Scanning audio buffer energy flux & autocorrelation lags...');

    setTimeout(() => {
      try {
        const result = analyzeAudioBufferBpm(track.audioBuffer);
        setBpmInput(result.bpm);
        setDownbeatOffset(result.firstDownbeatSample);
        setAnalysisStatus(
          `Initial Analysis: ${result.bpm.toFixed(2)} BPM (${(result.confidence * 100).toFixed(1)}% confidence, ${result.beatSamples.length} beats detected)`
        );

        const updated = recalibrateTrackBeatGrid(track, result.bpm, result.firstDownbeatSample);
        onUpdateTrack(deckId, updated);
      } catch (err) {
        setAnalysisStatus(`Analysis error: ${String(err)}`);
      } finally {
        setIsAnalyzing(false);
      }
    }, 50);
  }, [track, deckId, onUpdateTrack]);

  // Run MASAVU BeatGrid Refinement
  const handleRunBeatGridRefinement = useCallback(() => {
    if (!track || !track.audioBuffer) return;
    setIsRefining(true);
    setAnalysisStatus('Running multi-band spectral flux, kick onset search & error classification...');

    setTimeout(() => {
      try {
        const { track: refinedTrack, result } = refineTrackBeatGrid(track);
        setBpmInput(result.refinedGrid.bpm);
        setDownbeatOffset(result.refinedGrid.firstDownbeatSample);
        setAnalysisStatus(
          `Refinement [${result.refinementInfo.classification}]: ${result.refinementInfo.statusMessage}`
        );
        onUpdateTrack(deckId, refinedTrack);
      } catch (err) {
        setAnalysisStatus(`Refinement error: ${String(err)}`);
      } finally {
        setIsRefining(false);
      }
    }, 50);
  }, [track, deckId, onUpdateTrack]);

  // Apply manual BPM adjustment
  const handleAdjustBpm = (delta: number) => {
    if (!track) return;
    const newBpm = Math.round((bpmInput + delta) * 100) / 100;
    setBpmInput(newBpm);
    const updated = recalibrateTrackBeatGrid(track, newBpm, downbeatOffset);
    onUpdateTrack(deckId, updated);
  };

  // Multiply or divide octave (Section 11: BPM /2, BPM x2)
  const handleOctave = (multiplier: number) => {
    if (!track) return;
    const newBpm = Math.round((bpmInput * multiplier) * 100) / 100;
    setBpmInput(newBpm);
    const updated = recalibrateTrackBeatGrid(track, newBpm, downbeatOffset);
    onUpdateTrack(deckId, updated);
  };

  // Nudge downbeat grid phase (Section 11: GRID -5 ms, GRID +5 ms)
  const handleNudgeGrid = (offsetMs: number) => {
    if (!track) return;
    const sampleDelta = Math.round((offsetMs / 1000) * track.sampleRate);
    const newDownbeat = Math.max(0, downbeatOffset + sampleDelta);
    setDownbeatOffset(newDownbeat);
    const updated = recalibrateTrackBeatGrid(track, bpmInput, newDownbeat);
    onUpdateTrack(deckId, updated);
  };

  // Set Beat 1 at current playback position (Section 11: SET BEAT 1)
  const handleSetBeat1 = () => {
    if (!track) return;
    const samplesPerBeat = (track.sampleRate * 60) / bpmInput;
    const targetSample = Math.max(0, Math.round(currentPlaybackSample));
    const newDownbeat = targetSample % Math.round(samplesPerBeat);
    setDownbeatOffset(targetSample);
    const updated = recalibrateTrackBeatGrid(track, bpmInput, targetSample);
    onUpdateTrack(deckId, updated);
    setAnalysisStatus(`Beat 1 (Downbeat) locked to sample #${targetSample} (${(targetSample / track.sampleRate).toFixed(3)}s).`);
  };

  // Add Dynamic Anchor (Section 11 Optional: ADD DYNAMIC ANCHOR)
  const handleAddDynamicAnchor = () => {
    if (!track) return;
    const samplesPerBeat = (track.sampleRate * 60) / bpmInput;
    const beatIndex = Math.max(0, Math.round((currentPlaybackSample - downbeatOffset) / samplesPerBeat));
    const existingAnchors = track.beatGrid.dynamicAnchors ? [...track.beatGrid.dynamicAnchors] : [];
    existingAnchors.push({
      beatIndex,
      sourceSample: Math.round(currentPlaybackSample),
      localBpm: bpmInput,
      confidence: 1.0
    });
    existingAnchors.sort((a, b) => a.beatIndex - b.beatIndex);

    const updatedGrid = {
      ...track.beatGrid,
      gridType: 'DYNAMIC' as const,
      dynamicAnchors: existingAnchors
    };
    onUpdateTrack(deckId, { ...track, beatGrid: updatedGrid });
    setAnalysisStatus(`Dynamic anchor pinned at beat #${beatIndex} (sample #${Math.round(currentPlaybackSample)}).`);
  };

  if (!isOpen) return null;

  const refinement = track?.beatGrid.refinementInfo;
  const gridType = track?.beatGrid.gridType || (refinement?.classification ?? 'STRAIGHT');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Precision BeatGrid Refinement & Calibration
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  gridType === 'DYNAMIC'
                    ? 'bg-purple-950 border-purple-500 text-purple-300'
                    : 'bg-emerald-950 border-emerald-500 text-emerald-300'
                }`}>
                  {gridType} GRID
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Deck {deckId} • {track?.title ?? 'No Track'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Current BPM Readout Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Current Analyzed Tempo
              </div>
              <div className="text-3xl font-mono font-black text-emerald-400 tracking-tight mt-0.5">
                {bpmInput.toFixed(2)}{' '}
                <span className="text-sm font-sans font-normal text-slate-400">BPM</span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                Confidence: {((track?.beatGrid.confidence ?? 0.95) * 100).toFixed(1)}% • Downbeat: #
                {downbeatOffset} ({(downbeatOffset / (track?.sampleRate || 44100)).toFixed(3)}s)
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleRunBeatGridRefinement}
                disabled={isRefining || isAnalyzing || !track}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-slate-800 text-white text-xs font-bold font-mono rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
                title="Search ±80ms around predicted beats for kick transient energy, classify error, and refine beatgrid markers"
              >
                <Sparkles className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`} />
                {isRefining ? 'Refining...' : 'Auto-Refine BeatGrid'}
              </button>
              <button
                onClick={handleRunDeepAnalysis}
                disabled={isAnalyzing || isRefining || !track}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 text-[11px] font-bold font-mono rounded flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Scanning...' : 'Re-Run Autocorrelation'}
              </button>
            </div>
          </div>

          {/* Refinement Info Banner if available */}
          {refinement && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Grid Refinement Diagnostics
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  refinement.applied ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {refinement.applied ? 'AUTO-APPLIED' : 'RECOMMENDED'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="bg-slate-900 p-2 rounded">
                  <div className="text-slate-500 text-[10px]">CLASSIFICATION</div>
                  <div className="font-bold text-slate-200">{refinement.classification}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  <div className="text-slate-500 text-[10px]">GLOBAL OFFSET</div>
                  <div className="font-bold text-cyan-400">
                    {refinement.globalOffsetMs > 0 ? '+' : ''}{refinement.globalOffsetMs.toFixed(1)} ms
                  </div>
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  <div className="text-slate-500 text-[10px]">SPACING DRIFT</div>
                  <div className="font-bold text-amber-400">
                    {refinement.bpmDriftSlope > 0 ? '+' : ''}{refinement.bpmDriftSlope.toFixed(2)} ms/b
                  </div>
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  <div className="text-slate-500 text-[10px]">CONFIDENCE</div>
                  <div className="font-bold text-emerald-400">
                    {(refinement.confidence * 100).toFixed(0)}% ({refinement.reliableCandidateCount} kicks)
                  </div>
                </div>
              </div>
            </div>
          )}

          {analysisStatus && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{analysisStatus}</span>
            </div>
          )}

          {/* Section 11: Manual Safety Controls (GRID -5ms, GRID +5ms, SET BEAT 1, BPM /2, BPM x2) */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Manual BeatGrid Safety Controls</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <button
                onClick={() => handleNudgeGrid(-5)}
                className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold rounded border border-slate-700 text-cyan-300"
                title="Shift BeatGrid earlier by 5ms"
              >
                GRID -5 ms
              </button>
              <button
                onClick={() => handleNudgeGrid(5)}
                className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold rounded border border-slate-700 text-cyan-300"
                title="Shift BeatGrid later by 5ms"
              >
                GRID +5 ms
              </button>
              <button
                onClick={handleSetBeat1}
                className="py-2 px-2 bg-rose-950/70 hover:bg-rose-900/70 text-rose-300 text-xs font-mono font-bold rounded border border-rose-800/60"
                title="Lock Beat 1 (downbeat) to current playhead/cue position"
              >
                SET BEAT 1
              </button>
              <button
                onClick={() => handleOctave(0.5)}
                className="py-2 px-2 bg-purple-950/70 hover:bg-purple-900/70 text-purple-300 text-xs font-mono font-bold rounded border border-purple-800/60"
                title="Half-Time Octave Fix (e.g. 174 -> 87)"
              >
                BPM /2
              </button>
              <button
                onClick={() => handleOctave(2.0)}
                className="py-2 px-2 bg-purple-950/70 hover:bg-purple-900/70 text-purple-300 text-xs font-mono font-bold rounded border border-purple-800/60"
                title="Double-Time Octave Fix (e.g. 62 -> 124)"
              >
                BPM x2
              </button>
              <button
                onClick={handleAddDynamicAnchor}
                className="py-2 px-2 bg-indigo-950/70 hover:bg-indigo-900/70 text-indigo-300 text-xs font-mono font-bold rounded border border-indigo-800/60 flex items-center justify-center gap-1"
                title="Add local BeatGrid anchor at current playhead"
              >
                <Anchor className="w-3 h-3" />
                ANCHOR
              </button>
            </div>
          </div>

          {/* Quick Fine-Tuning Grid */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>BPM Incremental Fine Nudge</span>
              <span className="text-[11px] font-mono text-slate-500">±0.01 / ±0.1 / ±1.0</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              <button
                onClick={() => handleAdjustBpm(-1.0)}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold rounded border border-slate-700"
              >
                -1.0
              </button>
              <button
                onClick={() => handleAdjustBpm(-0.1)}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold rounded border border-slate-700"
              >
                -0.10
              </button>
              <button
                onClick={() => handleAdjustBpm(-0.01)}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold rounded border border-slate-700 text-slate-400"
              >
                -0.01
              </button>
              <button
                onClick={() => handleAdjustBpm(0.01)}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold rounded border border-slate-700 text-slate-400"
              >
                +0.01
              </button>
              <button
                onClick={() => handleAdjustBpm(0.1)}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold rounded border border-slate-700"
              >
                +0.10
              </button>
              <button
                onClick={() => handleAdjustBpm(1.0)}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold rounded border border-slate-700"
              >
                +1.0
              </button>
            </div>
          </div>

          {/* Tap Tempo & Phase Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Tap Tempo Calculator */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-300">Tap Tempo Calculator</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tap rhythmically with song kick
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={handleTap}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-emerald-950/50"
                >
                  TAP BEAT
                </button>
                {tapBpm && (
                  <span className="font-mono text-xs font-bold text-emerald-400 px-2 py-1 bg-emerald-950/80 border border-emerald-800/50 rounded">
                    {tapBpm.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Additional Phase Increments */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-300">Phase Increments</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Precision offset nudging
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  onClick={() => handleNudgeGrid(-10)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded border border-slate-700"
                >
                  -10ms
                </button>
                <button
                  onClick={() => handleNudgeGrid(-1)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded border border-slate-700 text-slate-400"
                >
                  -1ms
                </button>
                <button
                  onClick={() => handleNudgeGrid(1)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded border border-slate-700 text-slate-400"
                >
                  +1ms
                </button>
                <button
                  onClick={() => handleNudgeGrid(10)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded border border-slate-700"
                >
                  +10ms
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/90">
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Precise musical beatGrid ensures 100% kick transient alignment
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
