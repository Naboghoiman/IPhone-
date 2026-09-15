import { Volume2, VolumeX } from 'lucide-react';

interface MixerSectionProps {
  crossfader: number; // -1 (A) to +1 (B)
  onCrossfaderChange: (val: number) => void;
  masterVolume: number;
  onMasterVolumeChange: (val: number) => void;
  masterDeckId: 'A' | 'B';
  onSetMasterDeck: (deckId: 'A' | 'B') => void;
  deckAPlaying: boolean;
  deckBPlaying: boolean;
}

export function MixerSection({
  crossfader,
  onCrossfaderChange,
  masterVolume,
  onMasterVolumeChange,
  masterDeckId,
  onSetMasterDeck,
  deckAPlaying,
  deckBPlaying
}: MixerSectionProps) {
  // Normalize crossfader from -1..1 to 0..100%
  const crossfaderPercent = ((crossfader + 1) / 2) * 100;

  return (
    <div
      id="dj-mixer-section"
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 flex flex-col justify-between"
    >
      {/* Top Header: Master Level & Master Deck select */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
            MASTER CONTROLLER
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-slate-300">Clock Master:</span>
            <div className="inline-flex rounded-md shadow-sm border border-slate-700 bg-slate-950 p-0.5">
              <button
                onClick={() => onSetMasterDeck('A')}
                className={`px-2.5 py-0.5 text-xs font-bold rounded transition-all ${
                  masterDeckId === 'A'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DECK A
              </button>
              <button
                onClick={() => onSetMasterDeck('B')}
                className={`px-2.5 py-0.5 text-xs font-bold rounded transition-all ${
                  masterDeckId === 'B'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DECK B
              </button>
            </div>
          </div>
        </div>

        {/* Master Output Level */}
        <div className="flex items-center gap-2">
          {masterVolume === 0 ? (
            <VolumeX className="w-4 h-4 text-slate-500" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          )}
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400">MASTER OUT</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              className="w-24 accent-emerald-500 cursor-pointer"
            />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 w-8">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>

      {/* Center Section: Dual Channel VU Meters */}
      <div className="py-4 flex items-center justify-center gap-6">
        {/* Deck A VU */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono font-bold text-cyan-400">CH A</span>
          <div className="w-3 h-16 bg-slate-950 rounded border border-slate-800 flex flex-col-reverse p-0.5 gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const active = deckAPlaying && Math.random() > 0.25;
              const isPeak = i >= 7;
              const isMid = i >= 5 && i < 7;
              return (
                <div
                  key={i}
                  className={`w-full flex-1 rounded-xs transition-opacity ${
                    active
                      ? isPeak
                        ? 'bg-red-500 opacity-100 shadow-sm shadow-red-500'
                        : isMid
                        ? 'bg-amber-400 opacity-100'
                        : 'bg-emerald-500 opacity-100'
                      : 'bg-slate-800 opacity-30'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Master Logo & Clock Status */}
        <div className="text-center px-4">
          <div className="text-lg font-black tracking-widest text-slate-200">
            MASAVU
          </div>
          <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
            BEATGRID PRO
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            CLOCK SYNCED
          </div>
        </div>

        {/* Deck B VU */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono font-bold text-amber-400">CH B</span>
          <div className="w-3 h-16 bg-slate-950 rounded border border-slate-800 flex flex-col-reverse p-0.5 gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const active = deckBPlaying && Math.random() > 0.25;
              const isPeak = i >= 7;
              const isMid = i >= 5 && i < 7;
              return (
                <div
                  key={i}
                  className={`w-full flex-1 rounded-xs transition-opacity ${
                    active
                      ? isPeak
                        ? 'bg-red-500 opacity-100 shadow-sm shadow-red-500'
                        : isMid
                        ? 'bg-amber-400 opacity-100'
                        : 'bg-emerald-500 opacity-100'
                      : 'bg-slate-800 opacity-30'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Crossfader */}
      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1 px-1">
          <span className={crossfader < -0.05 ? 'text-cyan-400 font-bold' : ''}>DECK A</span>
          <button
            onClick={() => onCrossfaderChange(0)}
            title="Center crossfader"
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            [CENTER]
          </button>
          <span className={crossfader > 0.05 ? 'text-amber-400 font-bold' : ''}>DECK B</span>
        </div>

        <div className="relative flex items-center">
          <input
            id="master-crossfader"
            type="range"
            min="-1.0"
            max="1.0"
            step="0.01"
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="w-full h-3 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800 accent-blue-500"
          />
        </div>

        <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
          <span>{Math.round(100 - crossfaderPercent)}%</span>
          <span>Constant-Power Curve</span>
          <span>{Math.round(crossfaderPercent)}%</span>
        </div>
      </div>
    </div>
  );
}
