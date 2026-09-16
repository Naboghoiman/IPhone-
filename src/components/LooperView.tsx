import React, { useRef, useState } from 'react';
import { TrackData } from '../types/dj';
import { LooperSyncState, BeatLoopLength } from '../audio/audioLooperEngine';
import { INBUILT_LOOPS, InbuiltLoopDefinition } from '../audio/inbuiltLoops';
import { RotateCcw, Upload, Play, Square, Volume2, X, Music, CheckCircle2, ShieldCheck, Zap, Disc3, Layers } from 'lucide-react';
import { SkeuomorphicFader } from './SkeuomorphicFader';

interface LooperViewProps {
  looperState: LooperSyncState;
  loopTrack: TrackData | null;
  activeMasterDeckId: 'A' | 'B' | null;
  masterBpm: number;
  selectedInbuiltLoopId: string | null;
  onSelectInbuiltLoop: (loopId: string) => void;
  onUploadFile: (file: File) => void;
  onPlaySync: () => void;
  onStop: () => void;
  onSetLoopBeatCount: (count: BeatLoopLength) => void;
  onSetLoopStartSample: (sample: number) => void;
  onVolumeChange: (vol: number) => void;
  onClose: () => void;
}

const LOOP_OPTIONS: (BeatLoopLength | 'AUTO')[] = ['AUTO', 1, 2, 4, 8, 16, 32];

export const LooperView: React.FC<LooperViewProps> = ({
  looperState,
  loopTrack,
  activeMasterDeckId,
  masterBpm,
  selectedInbuiltLoopId,
  onSelectInbuiltLoop,
  onUploadFile,
  onPlaySync,
  onStop,
  onSetLoopBeatCount,
  onSetLoopStartSample,
  onVolumeChange,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [volume, setVolume] = useState(0.85);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedOption, setSelectedOption] = useState<BeatLoopLength | 'AUTO'>('AUTO');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleVolume = (val: number) => {
    setVolume(val);
    onVolumeChange(val);
  };

  const handleLengthSelect = (opt: BeatLoopLength | 'AUTO') => {
    setSelectedOption(opt);
    if (opt !== 'AUTO') {
      onSetLoopBeatCount(opt);
    }
  };

  // Compute loop progress inside [loopStartSample, loopEndSample]
  const loopLength = Math.max(1, looperState.loopEndSample - looperState.loopStartSample);
  const currentRelative = Math.max(0, looperState.currentSourceSample - looperState.loopStartSample);
  const progressRatio = Math.min(1, Math.max(0, (currentRelative % loopLength) / loopLength));

  // Current beat within loop
  const samplesPerBeat = loopTrack?.beatGrid.samplesPerBeat || 1;
  const currentBeatInLoop = Math.floor((currentRelative % loopLength) / samplesPerBeat) + 1;

  // Duration in seconds of musical loop
  const loopDurationSeconds = loopTrack ? (looperState.loopBeatCount * 60) / loopTrack.bpm : 0;

  return (
    <div className="flex flex-col w-full bg-[#0a0c10] rounded-xl border-2 border-neutral-800 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.95)] select-none font-sans">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.aiff"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center shadow-[0_0_12px_rgba(0,230,118,0.5)]">
            <RotateCcw className={`w-5 h-5 text-emerald-400 ${looperState.playing ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider text-white uppercase drop-shadow flex items-center gap-2">
              <span>DJ IMAN SYNCHRONIZED BEAT LOOPER</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono">
                RHYTHM LAYER
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-16 h-[2px] bg-gradient-to-r from-emerald-400 to-transparent" />
              <span className="text-[10px] font-mono text-neutral-400">
                Straight BeatGrid • Quantized Loop Boundaries • Dynamic Master Handoff
              </span>
            </div>
          </div>
        </div>

        {/* Master Sync Status Tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono">
            <span className="text-neutral-400">STATUS:</span>
            {looperState.playing ? (
              looperState.syncedTo ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(0,230,118,0.8)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  SYNCED TO DECK {looperState.syncedTo}
                </span>
              ) : (
                <span className="text-cyan-400 font-bold">PLAYING (STANDALONE)</span>
              )
            ) : (
              <span className="text-neutral-500">STOPPED / READY</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer"
            title="Return to Main Music Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* INBUILT LOOPS BOARD (5 PRESETS) */}
      <div className="mb-4 bg-[#0c0e12] border border-neutral-800 rounded-xl p-3 shadow-inner">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black text-white uppercase font-mono tracking-wider">
              INBUILT BEAT LOOPS (5 MASTER PRESETS)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-400 font-mono">
              UNALTERED AUDIO • 100% ORIGINAL TIMBRE
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500">
            Click any loop to load directly onto looper deck
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {INBUILT_LOOPS.map((loop) => {
            const isSelected = selectedInbuiltLoopId === loop.id;
            return (
              <button
                key={loop.id}
                onClick={() => onSelectInbuiltLoop(loop.id)}
                style={{
                  borderColor: isSelected ? loop.color : undefined,
                  boxShadow: isSelected ? `0 0 16px ${loop.color}33` : undefined,
                }}
                className={`relative flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-neutral-900/95 text-white'
                    : 'bg-[#101318] hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                }`}
              >
                {/* Top Badge Row */}
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span
                    style={{ backgroundColor: `${loop.color}22`, color: loop.color, borderColor: `${loop.color}55` }}
                    className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded border uppercase"
                  >
                    SLOT 0{loop.slotNumber}
                  </span>
                  {isSelected ? (
                    <span
                      style={{ backgroundColor: loop.color }}
                      className="flex items-center gap-1 text-[9px] font-mono font-black text-black px-1.5 py-0.5 rounded shadow-sm"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-neutral-500 group-hover:text-neutral-300">
                      CLICK TO LOAD
                    </span>
                  )}
                </div>

                {/* Loop Title */}
                <div className="font-bold text-xs text-white truncate w-full group-hover:text-cyan-300 transition-colors">
                  {loop.name.replace(/^Loop \d+:\s*/, '')}
                </div>

                {/* Genre & Specs */}
                <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                  <span style={{ color: loop.color }} className="font-bold">{loop.bpm.toFixed(0)} BPM</span>
                  <span className="text-neutral-500 mx-1">•</span>
                  <span>{loop.beats} Beats</span>
                </div>

                {/* Mini Rhythm Waveform Bars */}
                <div className="flex items-center gap-0.5 mt-2 h-3.5 w-full bg-black/40 rounded px-1.5 py-0.5 border border-neutral-900">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const isQuarter = i % 4 === 0;
                    const isPlayingBeat = isSelected && looperState.playing && Math.floor(progressRatio * 16) === i;
                    return (
                      <div
                        key={i}
                        style={{
                          height: isQuarter ? '100%' : '50%',
                          backgroundColor: isPlayingBeat
                            ? '#ffffff'
                            : isSelected
                            ? loop.color
                            : isQuarter
                            ? '#52525b'
                            : '#27272a',
                        }}
                        className={`flex-1 rounded-sm transition-all ${isPlayingBeat ? 'scale-y-125' : ''}`}
                      />
                    );
                  })}
                </div>

                {/* Description snippet */}
                <div className="text-[9px] text-neutral-500 truncate mt-1.5 font-sans">
                  {loop.description.split('•')[1]?.trim() || loop.genre}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Upload & File Status Strip */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`p-4 rounded-xl border-2 transition-all flex flex-col md:flex-row items-center justify-between gap-4 mb-4 ${
          isDragging
            ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_20px_rgba(0,230,118,0.4)]'
            : loopTrack
            ? 'bg-[#0f1217] border-neutral-800'
            : 'bg-[#0e1115] border-dashed border-neutral-700 hover:border-emerald-500/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-mono font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>UPLOAD BEAT AUDIO</span>
          </button>
          <div className="text-xs font-mono text-neutral-400">
            {loopTrack ? (
              <div>
                <span className="text-white font-bold">{loopTrack.title}</span>
                <span className="text-neutral-500 ml-2">({loopTrack.duration.toFixed(1)}s • {loopTrack.sampleRate} Hz)</span>
              </div>
            ) : (
              <span>Drag & drop drum/percussion loop file (.wav, .mp3, .flac) or click upload</span>
            )}
          </div>
        </div>

        {/* Analyzed Track Metrics */}
        {loopTrack ? (
          <div className="flex items-center gap-4 text-xs font-mono bg-neutral-950/80 px-3 py-2 rounded-lg border border-neutral-800">
            <div>
              <span className="text-neutral-500 block text-[10px]">ANALYZED BPM</span>
              <span className="text-cyan-300 font-bold text-sm">{loopTrack.bpm.toFixed(2)}</span>
            </div>
            <div className="w-[1px] h-6 bg-neutral-800" />
            <div>
              <span className="text-neutral-500 block text-[10px]">BEAT START</span>
              <span className="text-amber-300 font-bold">
                {loopTrack.beatGrid.beatStartSample?.toLocaleString() ?? 0} smp
              </span>
            </div>
            <div className="w-[1px] h-6 bg-neutral-800" />
            <div>
              <span className="text-neutral-500 block text-[10px]">ACTIVE MASTER</span>
              <span className="text-emerald-400 font-bold">
                {activeMasterDeckId ? `DECK ${activeMasterDeckId} (${masterBpm.toFixed(1)} BPM)` : 'NONE'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs font-mono text-neutral-500 italic">No beat audio loaded</div>
        )}
      </div>

      {/* Main Console: Controls & Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Transport, Loop Length, Manual Start (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4 bg-[#0d1014] p-4 rounded-xl border border-neutral-800">
          {/* Transport Row */}
          <div className="flex items-center gap-3">
            {/* Big PLAY / SYNC Button */}
            <button
              onClick={onPlaySync}
              disabled={!loopTrack}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-mono font-black text-sm tracking-wider uppercase transition-all cursor-pointer border ${
                looperState.playing
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(0,230,118,0.7)]'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-600/80 text-emerald-300 shadow-[0_0_10px_rgba(0,230,118,0.3)] disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <Play className={`w-4 h-4 ${looperState.playing ? 'fill-current' : ''}`} />
              <span>{looperState.playing ? 'RE-SYNC TO MASTER' : 'PLAY / SYNC'}</span>
            </button>

            {/* STOP Button */}
            <button
              onClick={onStop}
              disabled={!looperState.playing}
              className="px-6 py-3 rounded-xl font-mono font-black text-sm tracking-wider uppercase bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/80 text-rose-300 transition-all cursor-pointer shadow-[0_0_10px_rgba(255,51,68,0.3)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>STOP</span>
            </button>
          </div>

          {/* Loop Length Selector (AUTO / 1 / 2 / 4 / 8 / 16 / 32) */}
          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span className="font-bold text-white uppercase tracking-wider">LOOP LENGTH (BEATS)</span>
              <span className="text-emerald-400 font-bold">
                {looperState.loopBeatCount} BEAT{looperState.loopBeatCount > 1 ? 'S' : ''} ({loopDurationSeconds.toFixed(2)}s)
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {LOOP_OPTIONS.map((opt) => {
                const isActive =
                  selectedOption === opt ||
                  (selectedOption === 'AUTO' && opt === 'AUTO') ||
                  (selectedOption !== 'AUTO' && opt === looperState.loopBeatCount);
                return (
                  <button
                    key={opt}
                    onClick={() => handleLengthSelect(opt)}
                    className={`py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-emerald-900/80 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(0,230,118,0.5)]'
                        : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Loop Start Section */}
          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span className="font-bold text-white uppercase tracking-wider">LOOP START ANCHOR</span>
              <span className="text-neutral-500 text-[10px]">Snaps to nearest BeatGrid line</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSetLoopStartSample(looperState.currentSourceSample)}
                disabled={!loopTrack}
                className="flex-1 py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>SET LOOP START AT CURRENT HEAD</span>
              </button>

              <button
                onClick={() => {
                  if (loopTrack) {
                    const anchor = loopTrack.beatGrid.beatStartSample ?? 0;
                    onSetLoopStartSample(anchor);
                  }
                }}
                disabled={!loopTrack}
                className="py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                RESET TO BEAT 1
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Volume, Beat Progress, Telemetry (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 bg-[#0d1014] p-4 rounded-xl border border-neutral-800">
          {/* Looper Output Volume Fader */}
          <div className="flex items-center justify-between bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>LOOPER VOLUME</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500">Direct Master Out routing</span>
            </div>

            <div className="flex items-center gap-3">
              <SkeuomorphicFader
                orientation="horizontal"
                width={140}
                value={volume}
                min={0}
                max={1}
                trackColor="silver"
                capSize="sm"
                onChange={handleVolume}
              />
              <span className="text-xs font-mono font-bold text-emerald-400 w-10 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Real-time Beat Indicator Strip */}
          <div className="flex flex-col gap-1.5 bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 font-bold">BEAT STEP IN LOOP</span>
              <span className="text-emerald-400 font-bold font-mono">
                BEAT {looperState.playing ? currentBeatInLoop : 1} / {looperState.loopBeatCount}
              </span>
            </div>

            {/* Step visualization dots */}
            <div className="grid grid-flow-col auto-cols-fr gap-1 py-1">
              {Array.from({ length: Math.min(16, looperState.loopBeatCount) }).map((_, idx) => {
                const stepNum = idx + 1;
                const isCurrent = looperState.playing && currentBeatInLoop === stepNum;
                const isDownbeat = stepNum === 1 || (stepNum - 1) % 4 === 0;
                return (
                  <div
                    key={idx}
                    className={`h-4 rounded flex items-center justify-center text-[9px] font-mono font-bold transition-all ${
                      isCurrent
                        ? 'bg-emerald-400 text-black shadow-[0_0_8px_rgba(0,230,118,1)]'
                        : isDownbeat
                        ? 'bg-emerald-950/80 border border-emerald-600/50 text-emerald-300'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {stepNum}
                  </div>
                );
              })}
            </div>

            {/* Continuous Progress bar */}
            <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-75"
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>
          </div>

          {/* Detailed Engine Telemetry */}
          <div className="space-y-1 text-[11px] font-mono bg-neutral-950/80 p-3 rounded-lg border border-neutral-800 text-neutral-400">
            <div className="flex justify-between">
              <span>Loop Start Sample:</span>
              <span className="text-cyan-300 font-bold">{looperState.loopStartSample.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Loop End Sample:</span>
              <span className="text-cyan-300 font-bold">{looperState.loopEndSample.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Read Sample:</span>
              <span className="text-amber-300 font-bold">{looperState.currentSourceSample.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Base Tempo Multiplier:</span>
              <span className="text-emerald-400 font-bold">{looperState.baseTempoMultiplier.toFixed(4)}x</span>
            </div>
            <div className="flex justify-between">
              <span>Dynamic Master Target:</span>
              <span className="text-white font-bold">{activeMasterDeckId ? `DECK ${activeMasterDeckId}` : 'NONE'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
