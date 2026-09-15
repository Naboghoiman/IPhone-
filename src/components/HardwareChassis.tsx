import React, { useRef } from 'react';
import { Music, Volume2, RotateCcw, Settings, Disc, Upload, FolderOpen } from 'lucide-react';

interface HardwareChassisProps {
  activeTopMode: 'music' | 'masterOut' | 'looper' | 'settings';
  onSelectTopMode: (mode: 'music' | 'masterOut' | 'looper' | 'settings') => void;
  activeConsoleTab: 'deckA' | 'mixer' | 'deckB';
  onSelectConsoleTab: (tab: 'deckA' | 'mixer' | 'deckB') => void;
  deckSubView: 'vinyl' | 'performance';
  onToggleDeckSubView: (view: 'vinyl' | 'performance') => void;
  trackTitleA?: string;
  trackArtistA?: string;
  bpmA?: number;
  keyA?: string;
  trackTitleB?: string;
  trackArtistB?: string;
  bpmB?: number;
  keyB?: string;
  elapsedA?: string;
  remainA?: string;
  totalA?: string;
  onUploadLocalFile?: (deckId: 'A' | 'B', file: File) => void;
  children: React.ReactNode;
}

export const HardwareChassis: React.FC<HardwareChassisProps> = ({
  activeTopMode,
  onSelectTopMode,
  activeConsoleTab,
  onSelectConsoleTab,
  deckSubView,
  onToggleDeckSubView,
  trackTitleA = 'Neon Horizon',
  trackArtistA = 'DJ IMAN',
  bpmA = 124.0,
  keyA = '02A',
  trackTitleB = 'Velvet Groove',
  trackArtistB = 'DJ IMAN',
  bpmB = 126.0,
  keyB = '07B',
  elapsedA = '1:24.2',
  remainA = '0:48.1',
  totalA = '2:12.3',
  onUploadLocalFile,
  children,
}) => {
  const topFileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative min-h-screen w-full bg-[#080a0c] text-neutral-200 flex flex-col items-center justify-start p-2 md:p-4 select-none font-sans overflow-x-hidden">
      {/* Outer Heavy Steel Rack Chassis Enclosure */}
      <div className="relative w-full max-w-7xl rounded-2xl bg-gradient-to-b from-[#191d24] via-[#101318] to-[#0c0e12] border-2 border-neutral-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.2)] p-3 md:p-5 flex flex-col gap-3">
        {/* Chrome Hex Screws in 4 Corners */}
        <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-neutral-500 via-neutral-200 to-neutral-700 border border-neutral-800 shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center pointer-events-none">
          <div className="w-2 h-[1px] bg-neutral-900 rotate-45" />
        </div>
        <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-neutral-500 via-neutral-200 to-neutral-700 border border-neutral-800 shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center pointer-events-none">
          <div className="w-2 h-[1px] bg-neutral-900 -rotate-12" />
        </div>
        <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-neutral-500 via-neutral-200 to-neutral-700 border border-neutral-800 shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center pointer-events-none">
          <div className="w-2 h-[1px] bg-neutral-900 rotate-90" />
        </div>
        <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-neutral-500 via-neutral-200 to-neutral-700 border border-neutral-800 shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center pointer-events-none">
          <div className="w-2 h-[1px] bg-neutral-900 rotate-30" />
        </div>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-neutral-800">
          {/* Left: DJ IMAN — MASAVU — */}
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-white uppercase drop-shadow-[0_2px_8px_rgba(0,229,255,0.4)] flex items-center gap-2">
              <span>DJ IMAN</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-4 h-[1.5px] bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
              <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
                M A S A V U
              </span>
              <div className="w-8 h-[1.5px] bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
            </div>
          </div>

          {/* Right: 4 Illuminated Rack Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Direct LOAD LOCAL Button */}
            {onUploadLocalFile && (
              <div>
                <input
                  ref={topFileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.aiff"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const targetDeck = activeConsoleTab === 'deckB' ? 'B' : 'A';
                      onUploadLocalFile(targetDeck, file);
                    }
                  }}
                />
                <button
                  onClick={() => topFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/80 bg-purple-950/80 text-purple-200 hover:text-white hover:bg-purple-900 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(191,90,242,0.5)]"
                  title="Load a local song file into the currently active deck"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-300" />
                  <span>LOAD LOCAL</span>
                </button>
              </div>
            )}

            {/* MUSIC */}
            <button
              onClick={() => onSelectTopMode('music')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-md ${
                activeTopMode === 'music'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.6)]'
                  : 'bg-[#12151b] border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>MUSIC</span>
            </button>

            {/* MASTER OUT (Golden amber when active!) */}
            <button
              onClick={() => onSelectTopMode('masterOut')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-md ${
                activeTopMode === 'masterOut'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-amber-400 text-white shadow-[0_0_16px_rgba(255,136,0,0.8)]'
                  : 'bg-[#12151b] border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>MASTER OUT</span>
            </button>

            {/* LOOPER */}
            <button
              onClick={() => onSelectTopMode('looper')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-md ${
                activeTopMode === 'looper'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(0,230,118,0.6)]'
                  : 'bg-[#12151b] border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>LOOPER</span>
            </button>

            {/* SETTINGS */}
            <button
              onClick={() => onSelectTopMode('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-md ${
                activeTopMode === 'settings'
                  ? 'bg-blue-950/80 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                  : 'bg-[#12151b] border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>SETTINGS</span>
            </button>
          </div>
        </div>

        {/* Track Info Banner (Displays current deck's track, timing & BPM) */}
        {activeTopMode !== 'masterOut' && (
          <div className="flex items-center justify-between px-3 py-2 bg-[#0c0f14] rounded-lg border border-neutral-800 shadow-inner">
            {/* Left: Vortex Album Art + Title + Artist */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-950 via-[#0b1824] to-blue-900 border border-cyan-400/80 shadow-[0_0_10px_rgba(0,229,255,0.6)] flex items-center justify-center">
                <Disc className="w-5 h-5 text-cyan-300 animate-spin" style={{ animationDuration: '6s' }} />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white tracking-wide">
                    {activeConsoleTab === 'deckB' ? trackTitleB : trackTitleA}
                  </span>
                  {onUploadLocalFile && (
                    <button
                      onClick={() => topFileInputRef.current?.click()}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-neutral-700 hover:border-cyan-500 text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Load local song file"
                    >
                      <FolderOpen className="w-2.5 h-2.5" />
                      <span>LOAD</span>
                    </button>
                  )}
                </div>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  {activeConsoleTab === 'deckB' ? trackArtistB : trackArtistA}
                </span>
              </div>
            </div>

            {/* Center: ELAPSED | REMAIN | TOTAL Counters */}
            <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-neutral-400 uppercase font-bold">ELAPSED</span>
                <span className="text-white font-bold">{elapsedA}</span>
              </div>
              <div className="w-[1px] h-6 bg-neutral-800" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-neutral-400 uppercase font-bold">REMAIN</span>
                <span className="text-neutral-300 font-bold">{remainA}</span>
              </div>
              <div className="w-[1px] h-6 bg-neutral-800" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-neutral-400 uppercase font-bold">TOTAL</span>
                <span className="text-neutral-400 font-bold">{totalA}</span>
              </div>
            </div>

            {/* Right: BPM & Key Readout */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span
                  className={`text-base font-black font-mono tracking-tight drop-shadow ${
                    activeConsoleTab === 'deckB' ? 'text-orange-400' : 'text-cyan-400'
                  }`}
                >
                  {(activeConsoleTab === 'deckB' ? bpmB : bpmA).toFixed(1)} BPM
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400">
                  KEY {activeConsoleTab === 'deckB' ? keyB : keyA}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Primary View Selector Bar: DECK A | MIXER | DECK B */}
        {activeTopMode !== 'masterOut' && (
          <div className="flex items-center justify-between px-1">
            {/* 3 Main Console Tabs */}
            <div className="flex items-center gap-2">
              {/* DECK A */}
              <button
                onClick={() => onSelectConsoleTab('deckA')}
                className={`px-4 py-1.5 text-xs font-mono font-black uppercase rounded-lg border transition-all cursor-pointer ${
                  activeConsoleTab === 'deckA'
                    ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.7)]'
                    : 'bg-[#11141a] border-neutral-700 text-neutral-400 hover:text-white'
                }`}
              >
                DECK A
              </button>

              {/* MIXER */}
              <button
                onClick={() => onSelectConsoleTab('mixer')}
                className={`px-4 py-1.5 text-xs font-mono font-black uppercase rounded-lg border transition-all cursor-pointer ${
                  activeConsoleTab === 'mixer'
                    ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(255,170,0,0.7)]'
                    : 'bg-[#11141a] border-neutral-700 text-neutral-400 hover:text-white'
                }`}
              >
                MIXER
              </button>

              {/* DECK B */}
              <button
                onClick={() => onSelectConsoleTab('deckB')}
                className={`px-4 py-1.5 text-xs font-mono font-black uppercase rounded-lg border transition-all cursor-pointer ${
                  activeConsoleTab === 'deckB'
                    ? 'bg-red-950/90 border-red-400 text-red-300 shadow-[0_0_15px_rgba(255,51,68,0.7)]'
                    : 'bg-[#11141a] border-neutral-700 text-neutral-400 hover:text-white'
                }`}
              >
                DECK B
              </button>
            </div>

            {/* Deck Sub-View Switcher: Platter vs Performance Board */}
            {activeConsoleTab !== 'mixer' && (
              <div className="flex items-center gap-1 bg-[#0b0e12] p-1 rounded-md border border-neutral-800">
                <button
                  onClick={() => onToggleDeckSubView('vinyl')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                    deckSubView === 'vinyl'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  VINYL PLATTER
                </button>
                <button
                  onClick={() => onToggleDeckSubView('performance')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                    deckSubView === 'performance'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  PERFORMANCE BOARD
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Children Slot (Waveform + Deck / Mixer / Master Out views) */}
        <div className="w-full flex flex-col gap-3">{children}</div>

        {/* Bottom Hardware Ventilation Grille & Embossed Brand */}
        <div className="flex flex-col items-center justify-center pt-2 border-t border-neutral-800/80 mt-1 select-none pointer-events-none">
          {/* Recessed ventilation slots */}
          <div className="flex items-center gap-2 mb-1 opacity-40">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-1 rounded-full bg-[#050608] border-b border-neutral-700 shadow-inner"
              />
            ))}
          </div>

          <span className="text-[10px] font-mono font-black tracking-[0.4em] text-neutral-600 uppercase">
            M A S A V U
          </span>
        </div>
      </div>
    </div>
  );
};
