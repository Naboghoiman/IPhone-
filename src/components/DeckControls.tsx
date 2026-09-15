import React, { useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Music } from 'lucide-react';
import { DeckTelemetry, TrackData } from '../types/dj';
import { WaveformDisplay } from './WaveformDisplay';
import { DEMO_PRESETS, DemoTrackPreset } from '../audio/trackGenerator';

interface DeckControlsProps {
  deckId: 'A' | 'B';
  track: TrackData | null;
  telemetry: DeckTelemetry;
  isMaster: boolean;
  onSetMaster: () => void;
  onPlayPause: () => void;
  onCue: () => void;
  onSync: () => void;
  onSeek: (sample: number) => void;
  onPitchChange: (percentage: number) => void;
  onPitchRangeChange: (range: number) => void;
  onJogNudge: (nudge: number) => void;
  onVolumeChange: (vol: number) => void;
  onEqChange: (low: number, mid: number, high: number) => void;
  onFilterChange: (val: number) => void;
  onSelectPreset: (preset: DemoTrackPreset) => void;
  onFileUpload: (file: File) => void;
  kickSnappedSample?: number | null;
  tempoFamilyLock?: number | null;
  onMatchTempo?: () => void;
  onOpenBpmCalibration?: () => void;
}

export function DeckControls({
  deckId,
  track,
  telemetry,
  isMaster,
  onSetMaster,
  onPlayPause,
  onCue,
  onSync,
  onSeek,
  onPitchChange,
  onPitchRangeChange,
  onJogNudge,
  onVolumeChange,
  onEqChange,
  onFilterChange,
  onSelectPreset,
  onFileUpload,
  kickSnappedSample,
  tempoFamilyLock,
  onMatchTempo,
  onOpenBpmCalibration
}: DeckControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const deckColor = deckId === 'A' ? '#06b6d4' : '#f59e0b';
  const deckAccentClass = deckId === 'A' ? 'text-cyan-400 border-cyan-500/40' : 'text-amber-400 border-amber-500/40';

  return (
    <div
      id={`deck-${deckId}-container`}
      className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 min-w-0"
    >
      {/* Top Bar: Deck ID, Master button, Track Select, Sync Indicator */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 text-sm font-black rounded-md tracking-wider border ${
              deckId === 'A'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            DECK {deckId}
          </span>
          <button
            id={`deck-${deckId}-master-btn`}
            onClick={onSetMaster}
            className={`px-2.5 py-1 text-xs font-bold rounded uppercase tracking-wider transition-colors ${
              isMaster
                ? 'bg-red-600 text-white shadow-md shadow-red-950/50'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isMaster ? '★ MASTER' : 'SET MASTER'}
          </button>
          {telemetry.isSync && (
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              SYNCED
            </span>
          )}
          {tempoFamilyLock != null && (
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded" title="Tempo family lock multiplier">
              {tempoFamilyLock.toFixed(2)}x LOCK
            </span>
          )}
        </div>

        {/* Preset Selector / Audio file upload */}
        <div className="flex items-center gap-1.5">
          <select
            id={`deck-${deckId}-preset-select`}
            value={track?.id ?? ''}
            onChange={(e) => {
              const preset = DEMO_PRESETS.find((p) => p.id === e.target.value);
              if (preset) onSelectPreset(preset);
            }}
            className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded px-2 py-1 max-w-[150px] truncate focus:outline-none focus:border-slate-500"
          >
            {DEMO_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.bpm} BPM)
              </option>
            ))}
          </select>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileUpload(f);
            }}
            accept="audio/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload audio file (MP3, WAV, AAC)"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs flex items-center gap-1"
          >
            <Music className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Track Info & Digital Readout */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 mb-3">
        <div className="flex items-start justify-between">
          <div className="truncate mr-2">
            <h3 className="text-sm font-bold text-slate-100 truncate">
              {track ? track.title : 'No Track Loaded'}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {track ? track.artist : 'Select a demo track or upload audio'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1.5 justify-end">
              <div className="text-xl font-mono font-black text-emerald-400 leading-none">
                {telemetry.effectiveBpm.toFixed(1)}{' '}
                <span className="text-[10px] font-sans font-normal text-slate-400">BPM</span>
              </div>
              {onOpenBpmCalibration && (
                <button
                  onClick={onOpenBpmCalibration}
                  title="Open Beatgrid & BPM Precision Calibration"
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  CALIBRATE
                </button>
              )}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Orig: {telemetry.baseBpm.toFixed(1)} | {((telemetry.effectiveBpm / telemetry.baseBpm - 1) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Beat Phase and Bar Counter */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">PHASE:</span>
            {[0, 1, 2, 3].map((b) => (
              <span
                key={b}
                className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold transition-all ${
                  telemetry.currentBeatInBar === b && telemetry.isPlaying
                    ? b === 0
                      ? 'bg-red-500 text-white shadow-sm shadow-red-500/50 scale-110'
                      : 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/50 scale-110'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {b + 1}
              </span>
            ))}
            <span className="text-slate-500 text-[10px] ml-1">
              Bar {telemetry.currentBarIndex + 1}
            </span>
          </div>

          <div className="text-slate-300 font-mono">
            {formatTime(telemetry.currentTimeSeconds)} / {formatTime(telemetry.totalDurationSeconds)}
          </div>
        </div>
      </div>

      {/* Mini Overview Waveform */}
      <div className="mb-3">
        <WaveformDisplay
          track={track}
          telemetry={telemetry}
          color={deckColor}
          onSeek={onSeek}
          kickSnappedSample={kickSnappedSample}
          height={52}
        />
      </div>

      {/* Main Deck Controls Layout: Vinyl Jog + Vertical Pitch Fader + Transport Buttons */}
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Vinyl Platter / Jog Wheel (Cols 1-5) */}
        <div className="col-span-5 flex flex-col items-center justify-center">
          <div
            id={`deck-${deckId}-jog`}
            onMouseDown={() => onJogNudge(0.04)}
            onMouseUp={() => onJogNudge(0)}
            onTouchStart={() => onJogNudge(0.04)}
            onTouchEnd={() => onJogNudge(0)}
            title="Jog wheel: click/hold to nudge pitch forward"
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-slate-700 bg-slate-950 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors"
            style={{
              backgroundImage: 'radial-gradient(circle, #1e293b 25%, #0f172a 45%, #020617 80%)'
            }}
          >
            {/* Grooves effect */}
            <div className="absolute inset-2 rounded-full border border-slate-800/80 pointer-events-none"></div>
            <div className="absolute inset-4 rounded-full border border-slate-800/50 pointer-events-none"></div>
            <div className="absolute inset-7 rounded-full border border-slate-800/40 pointer-events-none"></div>

            {/* Rotating center label */}
            <div
              className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 ${deckAccentClass} bg-slate-900 shadow-lg text-center transition-transform`}
              style={{
                transform: `rotate(${((telemetry.currentSourceSample / 44100) * 120) % 360}deg)`
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mb-0.5"></div>
              <span className="text-[9px] font-black tracking-widest leading-none">
                {deckId}
              </span>
            </div>
          </div>

          {/* Jog pitch nudge buttons */}
          <div className="flex items-center gap-1 mt-2">
            <button
              onMouseDown={() => onJogNudge(-0.06)}
              onMouseUp={() => onJogNudge(0)}
              onTouchStart={() => onJogNudge(-0.06)}
              onTouchEnd={() => onJogNudge(0)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded text-slate-300 text-xs font-mono font-bold"
            >
              NUDGE -
            </button>
            <button
              onMouseDown={() => onJogNudge(0.06)}
              onMouseUp={() => onJogNudge(0)}
              onTouchStart={() => onJogNudge(0.06)}
              onTouchEnd={() => onJogNudge(0)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded text-slate-300 text-xs font-mono font-bold"
            >
              NUDGE +
            </button>
          </div>
        </div>

        {/* Transport & Action Buttons (Cols 6-8) */}
        <div className="col-span-4 flex flex-col gap-2">
          {/* Cue Button */}
          <button
            id={`deck-${deckId}-cue-btn`}
            onClick={onCue}
            className="w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950 shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            CUE
          </button>

          {/* Play / Pause Button */}
          <button
            id={`deck-${deckId}-play-btn`}
            onClick={onPlayPause}
            className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
              telemetry.isPlaying
                ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 ring-2 ring-emerald-500/40 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {telemetry.isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                PAUSE
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                PLAY
              </>
            )}
          </button>

          {/* SYNC & BPM MATCH Buttons (VirtualDJ 8 Clean-Room trigger) */}
          <div className="flex gap-1.5 w-full">
            <button
              id={`deck-${deckId}-sync-btn`}
              onClick={onSync}
              title={isMaster ? 'Master deck clock source' : 'Trigger clean-room VDJ8 beat-perfect slave start'}
              className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                telemetry.isSync
                  ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/50 shadow-md'
                  : 'bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              SYNC {isMaster ? '(MASTER)' : '(SLAVE)'}
            </button>
            {!isMaster && onMatchTempo && (
              <button
                onClick={onMatchTempo}
                title="Lock tempo to Master deck so both songs move at exact same beat rate"
                className="px-2.5 py-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/70 font-bold text-[10px] font-mono tracking-wider transition-colors shrink-0"
              >
                MATCH BPM
              </button>
            )}
          </div>
        </div>

        {/* Pitch Slider (Cols 9-12) */}
        <div className="col-span-3 flex flex-col items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between w-full text-[10px] font-mono text-slate-400 mb-1">
            <span>PITCH</span>
            <button
              onClick={() => onPitchChange(0)}
              title="Reset pitch to 0%"
              className="hover:text-emerald-400 transition-colors"
            >
              0%
            </button>
          </div>

          <div className="relative h-28 flex items-center justify-center my-1">
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.001"
              value={telemetry.pitchPercentage}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              className="h-24 -rotate-90 appearance-none bg-slate-800 accent-cyan-400 rounded-lg cursor-pointer w-24"
            />
          </div>

          <div className="text-[10px] font-mono font-bold text-slate-300 mt-1">
            {telemetry.pitchPercentage > 0 ? '+' : ''}
            {(telemetry.pitchPercentage * telemetry.baseTempoMultiplier * 100 - 100 + (telemetry.baseTempoMultiplier - 1) * 100).toFixed(1)}%
          </div>

          {/* Range switch */}
          <div className="flex gap-1 mt-1.5">
            {[0.08, 0.16, 0.5].map((r) => (
              <button
                key={r}
                onClick={() => onPitchRangeChange(r)}
                className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                  Math.abs(telemetry.pitchPercentage) && false // keep clean
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ±{Math.round(r * 100)}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3-Band EQ Knobs, DJ Filter, & Channel Volume */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-5 gap-2 text-center">
        {/* Low EQ */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 mb-1">LOW</span>
          <input
            type="range"
            min="-24"
            max="6"
            step="0.5"
            value={telemetry.lowEq}
            onChange={(e) => onEqChange(parseFloat(e.target.value), telemetry.midEq, telemetry.highEq)}
            className="w-14 accent-cyan-500 cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-500 mt-1">{telemetry.lowEq}dB</span>
        </div>

        {/* Mid EQ */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 mb-1">MID</span>
          <input
            type="range"
            min="-24"
            max="6"
            step="0.5"
            value={telemetry.midEq}
            onChange={(e) => onEqChange(telemetry.lowEq, parseFloat(e.target.value), telemetry.highEq)}
            className="w-14 accent-cyan-500 cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-500 mt-1">{telemetry.midEq}dB</span>
        </div>

        {/* High EQ */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 mb-1">HIGH</span>
          <input
            type="range"
            min="-24"
            max="6"
            step="0.5"
            value={telemetry.highEq}
            onChange={(e) => onEqChange(telemetry.lowEq, telemetry.midEq, parseFloat(e.target.value))}
            className="w-14 accent-cyan-500 cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-500 mt-1">{telemetry.highEq}dB</span>
        </div>

        {/* DJ Filter (LPF <-> HPF) */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 mb-1">FILTER</span>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={telemetry.filter}
            onChange={(e) => onFilterChange(parseFloat(e.target.value))}
            className="w-14 accent-purple-500 cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-500 mt-1">
            {Math.abs(telemetry.filter) < 0.05
              ? 'FLAT'
              : telemetry.filter < 0
              ? 'LPF'
              : 'HPF'}
          </span>
        </div>

        {/* Channel Volume */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 mb-1">VOL</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={telemetry.volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-14 accent-emerald-500 cursor-pointer"
          />
          <span className="text-[9px] font-mono text-slate-500 mt-1">{Math.round(telemetry.volume * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
