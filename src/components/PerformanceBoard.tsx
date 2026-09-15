import React, { useState } from 'react';
import { Upload, Mic, Square, Lock, FolderOpen } from 'lucide-react';
import { DeckTelemetry, TrackData } from '../types/dj';
import { MpcPerformancePad, CircularTransportButton } from './SkeuomorphicButton';
import { SkeuomorphicKnob } from './SkeuomorphicKnob';
import { samplerEngine } from '../audio/samplerSounds';

interface PerformanceBoardProps {
  deckId: 'A' | 'B';
  track: TrackData | null;
  telemetry: DeckTelemetry;
  onPlayPause: () => void;
  onCue: () => void;
  onSync: () => void;
  onSeek: (sample: number) => void;
  tempoFamilyLock?: number | null;
  onFileUpload?: (file: File) => void;
}

export const PerformanceBoard: React.FC<PerformanceBoardProps> = ({
  deckId,
  track,
  telemetry,
  onPlayPause,
  onCue,
  onSync,
  onSeek,
  tempoFamilyLock,
  onFileUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'sampler' | 'looper' | 'hotcues'>('sampler');
  const [bank, setBank] = useState<'A' | 'B' | 'C'>('A');
  const [activePad, setActivePad] = useState<string | null>(null);
  const [loopLength, setLoopLength] = useState<string>('4');
  const [syncLock, setSyncLock] = useState<boolean>(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Looper knobs state
  const [loopVol, setLoopVol] = useState(80);
  const [loopKey, setLoopKey] = useState(0);
  const [loopBass, setLoopBass] = useState(50);
  const [loopDistortion, setLoopDistortion] = useState(15);
  const [quantize, setQuantize] = useState('1/8');

  // Trigger Sound for MPC Pad
  const handleTriggerPad = (name: string) => {
    setActivePad(name);
    setTimeout(() => setActivePad(null), 150);

    switch (name) {
      case 'KICK':
        samplerEngine.playKick();
        break;
      case 'SNARE':
        samplerEngine.playSnare();
        break;
      case 'CLAP':
        samplerEngine.playClap();
        break;
      case 'HI-HAT':
        samplerEngine.playHiHat();
        break;
      case 'VOCAL':
        samplerEngine.playVocal();
        break;
      case 'AIRHORN':
        samplerEngine.playAirhorn();
        break;
      case 'RISER':
        samplerEngine.playRiser();
        break;
      case 'DROP':
        samplerEngine.playDrop();
        break;
      default:
        samplerEngine.playKick();
    }
  };

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
      className={`relative flex flex-col w-full select-none font-sans rounded-xl transition-all ${
        isDragOver ? 'ring-4 ring-purple-400 bg-purple-950/20' : ''
      }`}
    >
      {/* Drag & Drop Glowing Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 border-2 border-purple-400 shadow-[0_0_30px_rgba(191,90,242,0.7)] pointer-events-none">
          <Upload className="w-12 h-12 text-purple-400 animate-bounce mb-2" />
          <span className="text-base font-black font-mono text-white uppercase tracking-wider">
            DROP AUDIO FILE TO LOAD INTO DECK {deckId}
          </span>
          <span className="text-xs font-mono text-purple-300 mt-1">
            (MP3, WAV, FLAC, M4A, AAC, OGG)
          </span>
        </div>
      )}

      {/* PERFORMANCE BOARD Header & Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-widest text-neutral-400 uppercase">
            DECK {deckId} PERFORMANCE
          </span>

          {/* Load local song button */}
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
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-500 text-[10px] font-mono font-bold transition-all shadow cursor-pointer"
                title={`Load a local song file from your computer into Deck ${deckId}`}
              >
                <FolderOpen className="w-3 h-3 text-purple-400" />
                <span>LOAD SONG</span>
              </button>
            </div>
          )}
        </div>

        {/* 3 Main Tabs: HOT CUES | SAMPLER | LOOPER */}
        <div className="flex items-center gap-1 bg-[#0b0e12] p-1 rounded-md border border-neutral-800">
          <button
            onClick={() => setActiveTab('hotcues')}
            className={`px-3 py-1 text-xs font-mono font-bold tracking-wider rounded transition-all cursor-pointer ${
              activeTab === 'hotcues'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_10px_rgba(255,136,0,0.6)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            HOT CUES
          </button>

          <button
            onClick={() => setActiveTab('sampler')}
            className={`px-3 py-1 text-xs font-mono font-bold tracking-wider rounded transition-all cursor-pointer ${
              activeTab === 'sampler'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_10px_rgba(191,90,242,0.7)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            SAMPLER
          </button>

          <button
            onClick={() => setActiveTab('looper')}
            className={`px-3 py-1 text-xs font-mono font-bold tracking-wider rounded transition-all cursor-pointer ${
              activeTab === 'looper'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_10px_rgba(0,230,118,0.6)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            LOOPER
          </button>
        </div>
      </div>

      {/* 8 MPC Pads Section */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {/* Row 1 */}
        <MpcPerformancePad
          label="KICK"
          color="red"
          isPressed={activePad === 'KICK'}
          onClick={() => handleTriggerPad('KICK')}
        />
        <MpcPerformancePad
          label="SNARE"
          color="cyan"
          isPressed={activePad === 'SNARE'}
          onClick={() => handleTriggerPad('SNARE')}
        />
        <MpcPerformancePad
          label="CLAP"
          color="orange"
          isPressed={activePad === 'CLAP'}
          onClick={() => handleTriggerPad('CLAP')}
        />
        <MpcPerformancePad
          label="HI-HAT"
          color="yellow"
          isPressed={activePad === 'HI-HAT'}
          onClick={() => handleTriggerPad('HI-HAT')}
        />

        {/* Row 2 */}
        <MpcPerformancePad
          label="VOCAL"
          color="purple"
          isPressed={activePad === 'VOCAL'}
          onClick={() => handleTriggerPad('VOCAL')}
        />
        <MpcPerformancePad
          label="AIRHORN"
          color="cyan"
          isPressed={activePad === 'AIRHORN'}
          onClick={() => handleTriggerPad('AIRHORN')}
        />
        <MpcPerformancePad
          label="RISER"
          color="magenta"
          isPressed={activePad === 'RISER'}
          onClick={() => handleTriggerPad('RISER')}
        />
        <MpcPerformancePad
          label="DROP"
          color="green"
          isPressed={activePad === 'DROP'}
          onClick={() => handleTriggerPad('DROP')}
        />
      </div>

      {/* Bank & Utility Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-[#0b0e12] rounded-md border border-neutral-800 mb-4">
        {/* Bank navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBank(bank === 'A' ? 'C' : bank === 'B' ? 'A' : 'B')}
            className="w-6 h-6 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold hover:bg-neutral-700 cursor-pointer"
          >
            &lt;
          </button>
          <span className="text-xs font-mono font-bold text-neutral-300 px-2">
            BANK {bank}
          </span>
          <button
            onClick={() => setBank(bank === 'A' ? 'B' : bank === 'B' ? 'C' : 'A')}
            className="w-6 h-6 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold hover:bg-neutral-700 cursor-pointer"
          >
            &gt;
          </button>
        </div>

        {/* Load Sample / Record / Stop All Buttons */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-950/80 border border-blue-600/70 text-blue-300 text-[10px] font-mono font-bold shadow hover:brightness-110 cursor-pointer">
            <FolderOpen className="w-3 h-3" />
            <span>LOAD SAMPLE</span>
          </button>

          <button className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/80 border border-red-600/70 text-red-300 text-[10px] font-mono font-bold shadow hover:brightness-110 cursor-pointer">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ff3344]" />
            <span>RECORD</span>
          </button>

          <button className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-mono font-bold shadow hover:bg-neutral-700 cursor-pointer">
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>STOP ALL</span>
          </button>
        </div>
      </div>

      {/* LOOPER CONTROL Section */}
      <div className="p-3 bg-[#0d1015] rounded-lg border border-neutral-800/90 shadow-inner mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            LOOPER CONTROL
          </span>

          <div className="flex items-center gap-2">
            {/* SYNC LOCK ON */}
            <button
              onClick={() => setSyncLock(!syncLock)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                syncLock
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400'
              }`}
            >
              <Lock className="w-2.5 h-2.5" />
              <span>SYNC LOCK ON</span>
            </button>

            <button className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-mono font-bold hover:bg-neutral-700 cursor-pointer">
              <Upload className="w-2.5 h-2.5" />
              <span>UPLOAD LOOP</span>
            </button>

            <button className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-600/70 text-red-300 text-[10px] font-mono font-bold hover:brightness-110 cursor-pointer">
              <Mic className="w-2.5 h-2.5" />
              <span>RECORD LOOP</span>
            </button>
          </div>
        </div>

        {/* Loop Size Selector: [1/8, 1/4, 1/2, 1, 2, 4, 8, 16] */}
        <div className="flex items-center gap-1 mb-3">
          {['1/8', '1/4', '1/2', '1', '2', '4', '8', '16'].map((sz) => (
            <button
              key={sz}
              onClick={() => setLoopLength(sz)}
              className={`flex-1 py-1 text-xs font-mono font-black rounded border transition-all cursor-pointer ${
                loopLength === sz
                  ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.8)]'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>

        {/* Looper Parameter Knobs */}
        <div className="flex items-center justify-between px-2 pt-1 border-t border-neutral-800/80">
          {/* Quantize Badge */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-neutral-400 uppercase mb-1">QUANTIZE</span>
            <div className="px-2.5 py-1 rounded bg-[#0a0d11] border border-cyan-500/50 text-cyan-400 font-mono font-bold text-xs shadow">
              {quantize}
            </div>
          </div>

          <SkeuomorphicKnob
            label="LOOP VOL"
            value={loopVol}
            min={0}
            max={100}
            size="sm"
            color="cyan"
            unit="%"
            onChange={setLoopVol}
          />

          <SkeuomorphicKnob
            label="KEY"
            value={loopKey}
            min={-12}
            max={12}
            size="sm"
            color="cyan"
            arcType="bi"
            onChange={setLoopKey}
          />

          <SkeuomorphicKnob
            label="BASS"
            value={loopBass}
            min={0}
            max={100}
            size="sm"
            color="cyan"
            unit="%"
            onChange={setLoopBass}
          />

          <SkeuomorphicKnob
            label="DISTORTION"
            value={loopDistortion}
            min={0}
            max={100}
            size="sm"
            color="cyan"
            unit="%"
            onChange={setLoopDistortion}
          />

          {/* Loop 4 Beats Badge */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-neutral-400 uppercase mb-1">LOOP</span>
            <div className="px-2.5 py-1 rounded bg-blue-950/80 border border-blue-500/60 text-blue-300 font-mono font-black text-xs shadow-[0_0_8px_rgba(59,130,246,0.5)]">
              {loopLength} BEATS
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Transport: CUE, PLAY, SYNC */}
      <div className="flex items-center justify-around px-6 py-3 bg-[#0d1014] rounded-lg border border-neutral-800/90 shadow-inner">
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
