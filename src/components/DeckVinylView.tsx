import React, { useRef, useState, useEffect } from 'react';
import { Disc, Lock, Unlock, RotateCcw, Upload, FolderOpen } from 'lucide-react';
import { DeckTelemetry, TrackData } from '../types/dj';
import { SkeuomorphicKnob } from './SkeuomorphicKnob';
import { SkeuomorphicFader } from './SkeuomorphicFader';
import { CircularTransportButton } from './SkeuomorphicButton';

interface DeckVinylViewProps {
  deckId: 'A' | 'B';
  track: TrackData | null;
  telemetry: DeckTelemetry;
  isMaster: boolean;
  onPlayPause: () => void;
  onCue: () => void;
  onSync: () => void;
  onSeek: (sample: number) => void;
  onPitchChange: (pct: number) => void;
  onJogNudge: (nudge: number) => void;
  tempoFamilyLock?: number | null;
  onFileUpload?: (file: File) => void;
}

export const DeckVinylView: React.FC<DeckVinylViewProps> = ({
  deckId,
  track,
  telemetry,
  isMaster,
  onPlayPause,
  onCue,
  onSync,
  onSeek,
  onPitchChange,
  onJogNudge,
  tempoFamilyLock,
  onFileUpload,
}) => {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const [slipActive, setSlipActive] = useState(false);
  const [vinylMode, setVinylMode] = useState(true);
  const [keyLock, setKeyLock] = useState(true);
  const [revFwd, setRevFwd] = useState(50); // 50 = neutral
  const [isDragOver, setIsDragOver] = useState(false);

  const lastPointerAngleRef = useRef<number>(0);
  const vinylRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate platter while playing
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (telemetry.isPlaying && !isScratching) {
        // 33.33 RPM = ~200 deg/sec * effective tempo rate
        const speed = (telemetry.playbackRate || 1.0) * 200;
        setRotationAngle((prev) => (prev + speed * dt) % 360);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [telemetry.isPlaying, telemetry.playbackRate, isScratching]);

  // Scratch / Platter drag handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!vinylMode || !track) return;
    setIsScratching(true);
    const rect = vinylRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      lastPointerAngleRef.current = Math.atan2(e.clientY - cy, e.clientX - cx);
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isScratching || !track) return;
    const rect = vinylRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    let delta = currentAngle - lastPointerAngleRef.current;

    // Wrap around -PI to PI
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    lastPointerAngleRef.current = currentAngle;
    setRotationAngle((prev) => (prev + (delta * 180) / Math.PI) % 360);

    // Scrub audio
    const samplesPerRadian = (track.sampleRate * 60) / (33.33 * 2 * Math.PI);
    const deltaSamples = delta * samplesPerRadian;
    const newSample = Math.max(0, Math.min(track.totalSamples, telemetry.currentSourceSample + deltaSamples));
    onSeek(newSample);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isScratching) {
      setIsScratching(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Time calculations
  const elapsedSec = telemetry.currentTimeSeconds || 0;
  const totalSec = telemetry.totalDurationSeconds || (track?.durationSeconds || 132);
  const remainSec = Math.max(0, totalSec - elapsedSec);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1).padStart(4, '0');
    return `${m}:${sec}`;
  };

  const themeColor = deckId === 'A' ? '#00e5ff' : '#ff5500';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col w-full h-full select-none font-sans rounded-xl transition-all ${
        isDragOver ? 'ring-4 ring-cyan-400 bg-cyan-950/20' : ''
      }`}
    >
      {/* Drag & Drop Glowing Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 border-2 border-cyan-400 shadow-[0_0_30px_rgba(0,229,255,0.7)] pointer-events-none">
          <Upload className="w-12 h-12 text-cyan-400 animate-bounce mb-2" />
          <span className="text-base font-black font-mono text-white uppercase tracking-wider">
            DROP AUDIO FILE TO LOAD INTO DECK {deckId}
          </span>
          <span className="text-xs font-mono text-cyan-300 mt-1">
            (MP3, WAV, FLAC, M4A, AAC, OGG)
          </span>
        </div>
      )}

      {/* Top Deck Sub-Header with Load Local Song Button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#090b0e] rounded-t-lg border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-black ${deckId === 'A' ? 'text-cyan-400' : 'text-red-400'}`}>
            DECK {deckId}
          </span>
          <span className="text-[11px] font-mono text-neutral-400 truncate max-w-[200px]">
            {track?.title || 'No Track Loaded'}
          </span>
        </div>

        {/* Load Local Track button */}
        {onFileUpload && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.aiff"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-500 text-[10px] font-mono font-bold transition-all shadow cursor-pointer"
              title={`Load a local song file from your computer into Deck ${deckId}`}
            >
              <FolderOpen className="w-3 h-3 text-cyan-400" />
              <span>LOAD LOCAL SONG</span>
            </button>
          </div>
        )}
      </div>

      {/* Platter & Side Controls Section */}
      <div className="relative flex items-center justify-between gap-2 px-2 py-4">
        {/* Left Column: SLIP & VINYL mode buttons */}
        <div className="flex flex-col items-center gap-6 z-10">
          {/* SLIP Toggle */}
          <button
            onClick={() => setSlipActive(!slipActive)}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${
                slipActive
                  ? 'border-[#ff8800] bg-orange-950/80 shadow-[0_0_15px_rgba(255,136,0,0.8)]'
                  : 'border-neutral-700 bg-neutral-900 shadow-md hover:border-neutral-500'
              }`}
            >
              <RotateCcw className={`w-5 h-5 ${slipActive ? 'text-[#ffaa44]' : 'text-neutral-400'}`} />
            </div>
            <span
              className={`text-[9px] font-mono font-black mt-1 uppercase tracking-wider ${
                slipActive ? 'text-[#ffaa44]' : 'text-neutral-400'
              }`}
            >
              SLIP
            </span>
          </button>

          {/* VINYL Mode Toggle */}
          <button
            onClick={() => setVinylMode(!vinylMode)}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${
                vinylMode
                  ? 'border-[#00e5ff] bg-cyan-950/80 shadow-[0_0_15px_rgba(0,229,255,0.8)]'
                  : 'border-neutral-700 bg-neutral-900 shadow-md hover:border-neutral-500'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  vinylMode ? 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]' : 'bg-neutral-600'
                }`}
              />
            </div>
            <span
              className={`text-[9px] font-mono font-black mt-1 uppercase tracking-wider ${
                vinylMode ? 'text-[#00e5ff]' : 'text-neutral-400'
              }`}
            >
              VINYL
            </span>
          </button>
        </div>

        {/* Center: 3D Skeuomorphic Vinyl Turntable Platter */}
        <div className="flex-1 flex items-center justify-center">
          <div
            ref={vinylRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative w-64 h-64 md:w-72 md:h-72 rounded-full cursor-grab active:cursor-grabbing select-none flex items-center justify-center transition-transform"
            style={{
              boxShadow: `0 12px 36px rgba(0,0,0,0.95), 0 0 25px ${themeColor}40`,
            }}
          >
            {/* Heavy Cast Aluminum Platter Rim */}
            <div className="absolute inset-0 rounded-full border-4 border-neutral-700/80 bg-gradient-to-b from-neutral-600 via-neutral-800 to-neutral-950 shadow-inner" />

            {/* Glowing Outer Strobe LED Ring */}
            <div
              className="absolute inset-[3px] rounded-full border-2 transition-all duration-300"
              style={{
                borderColor: themeColor,
                boxShadow: `0 0 16px ${themeColor}, inset 0 0 10px ${themeColor}60`,
              }}
            />

            {/* Black Vinyl Grooves with Realistic Radial Sheen */}
            <div
              className="absolute inset-[10px] rounded-full overflow-hidden shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)]"
              style={{
                background: `
                  radial-gradient(circle, transparent 28%, #14161a 29%, #08090b 30%, #16181e 32%, #0a0c0e 34%, #181a20 37%, #0b0d10 40%, #1a1c22 45%, #0d0f12 50%, #1b1e24 55%, #0d0f12 60%, #1c1f26 65%, #0f1115 70%, #1e2128 75%, #101216 80%, #20232a 88%, #08090b 100%),
                  conic-gradient(from 0deg, #111418 0deg, #333a44 45deg, #111418 90deg, #333a44 135deg, #111418 180deg, #333a44 225deg, #111418 270deg, #333a44 315deg, #111418 360deg)
                `,
                transform: `rotate(${rotationAngle}deg)`,
              }}
            >
              {/* Concentric Grooves Overlay */}
              <div className="absolute inset-0 rounded-full opacity-30 border border-neutral-600 pointer-events-none" />
              <div className="absolute inset-4 rounded-full opacity-30 border border-neutral-600 pointer-events-none" />
              <div className="absolute inset-8 rounded-full opacity-30 border border-neutral-600 pointer-events-none" />
              <div className="absolute inset-12 rounded-full opacity-30 border border-neutral-600 pointer-events-none" />
              <div className="absolute inset-16 rounded-full opacity-30 border border-neutral-600 pointer-events-none" />

              {/* Center Artwork Label */}
              <div className="absolute inset-[28%] rounded-full bg-gradient-to-tr from-cyan-950 via-[#0a1b2a] to-blue-900 border-2 border-cyan-400/80 shadow-[0_0_12px_rgba(0,229,255,0.7)] flex flex-col items-center justify-center p-2">
                {/* Center Vortex Icon */}
                <Disc className="w-8 h-8 text-cyan-300 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-[8px] font-black tracking-widest text-cyan-200 mt-1 uppercase">
                  MASAVU
                </span>

                {/* Chrome Spindle Hole */}
                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-neutral-300 via-neutral-100 to-neutral-500 border border-neutral-700 shadow-inner mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: REV/FWD knob, Pitch readout, Vertical Pitch Slider, Pitch Bend & Key Lock */}
        <div className="flex flex-col items-center gap-2 z-10">
          {/* REV / FWD Knob */}
          <SkeuomorphicKnob
            label="REV / FWD"
            value={revFwd}
            min={0}
            max={100}
            size="sm"
            color="cyan"
            arcType="bi"
            onChange={setRevFwd}
          />

          {/* Digital Pitch Readout Box */}
          <div className="px-3 py-1 rounded bg-[#0b0e12] border border-neutral-800 shadow-inner flex flex-col items-center">
            <span className="text-[8px] font-mono text-neutral-400 uppercase font-bold">PITCH</span>
            <span className="text-xs font-mono font-black text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]">
              {telemetry.pitchPercentage >= 0 ? `+${telemetry.pitchPercentage.toFixed(1)}%` : `${telemetry.pitchPercentage.toFixed(1)}%`}
            </span>
          </div>

          {/* Long Throw Vertical Pitch Tempo Slider */}
          <div className="relative flex flex-col items-center py-1">
            <SkeuomorphicFader
              orientation="vertical"
              height={140}
              value={telemetry.pitchPercentage}
              min={-8}
              max={8}
              trackColor="silver"
              capSize="sm"
              showScale={true}
              scaleTicks={[
                { label: '+', value: 8 },
                { label: '0', value: 0 },
                { label: '-', value: -8 },
              ]}
              onChange={(val) => onPitchChange(val)}
            />
          </div>

          {/* Pitch Bend Buttons [-] and [+] */}
          <div className="flex items-center gap-1.5">
            <button
              onMouseDown={() => onJogNudge(-0.04)}
              onMouseUp={() => onJogNudge(0)}
              className="w-7 h-7 rounded-full bg-gradient-to-b from-neutral-600 to-neutral-800 border border-neutral-600 shadow text-white font-bold flex items-center justify-center text-xs active:scale-95"
            >
              -
            </button>
            <button
              onMouseDown={() => onJogNudge(0.04)}
              onMouseUp={() => onJogNudge(0)}
              className="w-7 h-7 rounded-full bg-gradient-to-b from-neutral-600 to-neutral-800 border border-neutral-600 shadow text-white font-bold flex items-center justify-center text-xs active:scale-95"
            >
              +
            </button>
          </div>

          {/* Key Lock Toggle Button */}
          <button
            onClick={() => setKeyLock(!keyLock)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[9px] font-mono font-bold tracking-tight transition-all cursor-pointer ${
              keyLock
                ? 'bg-blue-950/80 border-blue-500 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                : 'bg-neutral-900 border-neutral-700 text-neutral-400'
            }`}
          >
            {keyLock ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
            <span>KEY LOCK</span>
          </button>
        </div>
      </div>

      {/* Bottom Transport Controls: CUE, PLAY, SYNC */}
      <div className="flex items-center justify-around px-6 py-3 bg-[#0d1014] rounded-lg border border-neutral-800/90 shadow-inner mt-2">
        <CircularTransportButton
          type="cue"
          size="lg"
          onClick={onCue}
        />

        <CircularTransportButton
          type="play"
          size="xl"
          isPlaying={telemetry.isPlaying}
          onClick={onPlayPause}
        />

        <CircularTransportButton
          type="sync"
          size="lg"
          isActive={telemetry.isSync}
          onClick={onSync}
          sublabel={tempoFamilyLock ? `${tempoFamilyLock}x LOCK` : undefined}
        />
      </div>
    </div>
  );
};
