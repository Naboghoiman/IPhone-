import React, { useState, useRef } from 'react';
import { ArrowLeft, ChevronDown, Save, Sliders, RotateCcw } from 'lucide-react';
import { SkeuomorphicFader } from './SkeuomorphicFader';
import { SkeuomorphicKnob } from './SkeuomorphicKnob';
import { SkeuomorphicMeter } from './SkeuomorphicMeter';
import { HazardSafetySwitch } from './SkeuomorphicButton';

export const EQ_31_FREQS = [
  // Low (11 bands)
  { label: '20', hz: 20, band: 'low' },
  { label: '25', hz: 25, band: 'low' },
  { label: '31.5', hz: 31.5, band: 'low' },
  { label: '40', hz: 40, band: 'low' },
  { label: '50', hz: 50, band: 'low' },
  { label: '63', hz: 63, band: 'low' },
  { label: '80', hz: 80, band: 'low' },
  { label: '100', hz: 100, band: 'low' },
  { label: '125', hz: 125, band: 'low' },
  { label: '160', hz: 160, band: 'low' },
  { label: '200', hz: 200, band: 'low' },
  // Mid (10 bands)
  { label: '250', hz: 250, band: 'mid' },
  { label: '315', hz: 315, band: 'mid' },
  { label: '400', hz: 400, band: 'mid' },
  { label: '500', hz: 500, band: 'mid' },
  { label: '630', hz: 630, band: 'mid' },
  { label: '800', hz: 800, band: 'mid' },
  { label: '1k', hz: 1000, band: 'mid' },
  { label: '1.25k', hz: 1250, band: 'mid' },
  { label: '1.6k', hz: 1600, band: 'mid' },
  { label: '2k', hz: 2000, band: 'mid' },
  // High (10 bands)
  { label: '2.5k', hz: 2500, band: 'high' },
  { label: '3.15k', hz: 3150, band: 'high' },
  { label: '4k', hz: 4000, band: 'high' },
  { label: '5k', hz: 5000, band: 'high' },
  { label: '6.3k', hz: 6300, band: 'high' },
  { label: '8k', hz: 8000, band: 'high' },
  { label: '10k', hz: 10000, band: 'high' },
  { label: '12.5k', hz: 12500, band: 'high' },
  { label: '16k', hz: 16000, band: 'high' },
  { label: '20k', hz: 20000, band: 'high' },
];

export const EQ_PRESETS: { id: string; name: string; values: number[] }[] = [
  { id: '001', name: '001 LIGHT WARM', values: [2, 2.5, 3, 2, 1.5, 1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 1, 1.5, 2, 2.5, 2, 1.5, 1, 0.5, 0, -0.5, -1, -1.5, -2, -2.5] },
  { id: '002', name: '002 TUBE-REEL-FLAVOUR', values: [3, 3, 2.5, 2, 1.5, 1, 0.5, 0, -0.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 2, 1.5, 1, 0.5, 0, -0.5, -1, -1.5, -2, -2.5, -3, -3.5, -4, -4.5] },
  { id: '003', name: '003 GENTLE LIGHT', values: [1, 1, 1, 0.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 1, 1, 1.5, 1.5, 2, 2, 2.5, 2.5, 2, 1.5, 1, 0.5] },
  { id: '004', name: '004 WARM CHAIN', values: [2.5, 3, 3.5, 3, 2, 1.5, 1, 0.5, 0, -0.5, -1, -0.5, 0, 0.5, 1, 1, 1.5, 1.5, 2, 2, 1.5, 1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: '005', name: '005 MASTERING', values: [1.5, 2, 2, 1.5, 1, 0.5, 0, -0.5, -0.5, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0, 0] },
  { id: '006', name: '006 MASTER BOOSTER', values: [3, 4, 4.5, 4, 3, 2, 1, 0, -1, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1] },
  { id: '007', name: '007 LOUD & PROUD', values: [4, 4.5, 5, 4, 3, 2, 1, 0, -1, -1.5, -1, 0, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1] },
  { id: '008', name: '008 LOUD-PACKER', values: [3.5, 4, 4, 3.5, 2.5, 1.5, 0.5, 0, -0.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0] },
  { id: '009', name: '009 TUBE-DRIVER', values: [2, 2.5, 3, 2.5, 2, 1, 0, -0.5, -1, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3, 2.5, 2, 1.5, 1, 0.5, 0, -0.5, -1, -1.5, -2, -2.5, -3] },
  { id: '010', name: '010 HI-FI', values: [3, 3.5, 4, 3.5, 2.5, 1.5, 0.5, 0, -0.5, -0.5, 0, 0, 0, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5, 4.5, 4, 3.5, 3, 2.5, 2] },
  { id: '011', name: '011 CLUB PUNCH', values: [5, 6, 6, 5, 3.5, 2, 0.5, -1, -2, -1.5, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0] },
  { id: '012', name: '012 SUB BASS BOOST', values: [6, 7, 7.5, 6.5, 5, 3, 1.5, 0, -1, -1.5, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 1, 1, 1.5, 1.5, 1, 0.5, 0, 0, 0, 0] },
  { id: '013', name: '013 VOCAL PRESENCE', values: [0, 0, 0, 0, 0, 0, 0, 0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0, 0, 0, 0, 0, 0, 0] },
  { id: '014', name: '014 ACOUSTIC CLARITY', values: [0.5, 0.5, 1, 1, 0.5, 0, 0, 0, 0, 0, 0.5, 1, 1.5, 2, 2.5, 2.5, 2, 2.5, 3, 3.5, 4, 4, 4.5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1] },
  { id: '015', name: '015 BRIGHT AIR', values: [-1, -1, -0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 4.5, 5, 5.5, 6, 6.5, 6, 5.5, 5, 4.5] },
  { id: '016', name: '016 TIGHT MIDRANGE', values: [1, 1, 0.5, 0, -1, -2, -2.5, -2, -1, 0, 1, 2, 3, 3.5, 4, 3.5, 3, 2, 1, 0, -0.5, -1, -1, -0.5, 0, 0, 0, 0, 0, 0, 0] },
  { id: '017', name: '017 RADIO MIX', values: [-3, -2, -1, 0, 1, 2, 2.5, 2, 1, 0, 0, 1, 2, 2.5, 3, 3.5, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0, 0, -1, -2, -3, -4, -5, -6] },
  { id: '018', name: '018 RETRO VINYL', values: [2, 2.5, 3, 2.5, 2, 1.5, 1, 0.5, 0, 0, 0.5, 1, 1.5, 2, 2.5, 2, 1.5, 1, 0.5, 0, -0.5, -1, -1.5, -2, -2.5, -3, -3.5, -4, -4.5, -5, -6] },
  { id: '019', name: '019 COMMERCIAL CLEAN', values: [2.5, 3, 3.5, 3, 2, 1, 0, -0.5, -1, -0.5, 0, 0.5, 1, 1, 1.5, 1.5, 2, 2.5, 3, 3.5, 4, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0, 0] },
  { id: '020', name: '020 EDM FESTIVAL', values: [6, 7, 8, 7, 5, 3, 1, -1, -2, -2, -1, 0, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2] },
];

interface MasterEq31BandProps {
  onBack: () => void;
}

export const MasterEq31Band: React.FC<MasterEq31BandProps> = ({ onBack }) => {
  const [eqGains, setEqGains] = useState<number[]>(EQ_PRESETS[18].values.slice()); // Default: 019 COMMERCIAL CLEAN
  const [selectedPreset, setSelectedPreset] = useState<string>('019 COMMERCIAL CLEAN');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [zoom2x, setZoom2x] = useState<boolean>(false);
  const [eqOn, setEqOn] = useState<boolean>(true);
  const [eqPresence, setEqPresence] = useState<number>(100);
  const [mainOutVol, setMainOutVol] = useState<number>(0); // 0 dB
  const [pfl, setPfl] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef<boolean>(false);

  const handleGainChange = (index: number, val: number) => {
    setEqGains((prev) => {
      const copy = [...prev];
      copy[index] = Math.max(-12, Math.min(12, val));
      return copy;
    });
  };

  const handleSelectPreset = (preset: typeof EQ_PRESETS[0]) => {
    setSelectedPreset(preset.name);
    setEqGains([...preset.values]);
    setIsDropdownOpen(false);
  };

  const handleFlat = () => {
    setEqGains(new Array(31).fill(0));
    setSelectedPreset('CUSTOM (FLAT)');
  };

  // Draw Mode Pointer events across all sliders
  const handlePointerDownDraw = (e: React.PointerEvent) => {
    if (!drawMode) return;
    isDrawingRef.current = true;
    updateDrawAtPoint(e.clientX, e.clientY);
  };

  const handlePointerMoveDraw = (e: React.PointerEvent) => {
    if (!drawMode || !isDrawingRef.current) return;
    updateDrawAtPoint(e.clientX, e.clientY);
  };

  const handlePointerUpDraw = () => {
    isDrawingRef.current = false;
  };

  const updateDrawAtPoint = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xFraction = (clientX - rect.left) / rect.width;
    const bandIdx = Math.floor(xFraction * 31);
    if (bandIdx >= 0 && bandIdx < 31) {
      // Y: Top = +12 dB, Bottom = -12 dB
      const yFraction = 1 - (clientY - rect.top) / rect.height;
      const db = -12 + Math.max(0, Math.min(1, yFraction)) * 24;
      handleGainChange(bandIdx, db);
    }
  };

  return (
    <div className="flex flex-col w-full bg-[#0c0e12] rounded-xl border-2 border-neutral-800 p-3 shadow-[0_12px_36px_rgba(0,0,0,0.95)] select-none font-sans">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-black tracking-wider text-white uppercase drop-shadow">
              DJ IMAN 31-BAND MASTER EQ
            </h2>
            <div className="w-16 h-[2px] bg-gradient-to-r from-cyan-400 to-transparent mt-0.5" />
          </div>
        </div>

        {/* Toolbar: PRESET dropdown, SAVE, DRAW, 2x ZOOM, FLAT, EQ ON */}
        <div className="flex items-center gap-2">
          {/* Preset Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded bg-[#13171e] border border-neutral-700 text-xs font-mono font-bold text-neutral-200 shadow hover:border-neutral-500 cursor-pointer min-w-[200px]"
            >
              <span>{selectedPreset}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {/* Dropdown Menu (20 Presets from screenshot) */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-[#101318] border border-neutral-700 rounded shadow-2xl z-50 py-1">
                {EQ_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className="w-full text-left px-3 py-1.5 text-xs font-mono text-neutral-300 hover:bg-cyan-950/70 hover:text-cyan-400 flex items-center justify-between border-b border-neutral-800/50"
                  >
                    <span>{p.name}</span>
                    {selectedPreset === p.name && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SAVE */}
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-mono font-bold hover:bg-neutral-700 active:scale-95 cursor-pointer">
            <Save className="w-3 h-3" />
            <span>SAVE</span>
          </button>

          {/* DRAW [ON / OFF] */}
          <button
            onClick={() => setDrawMode(!drawMode)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs font-mono font-bold transition-all cursor-pointer ${
              drawMode
                ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(191,90,242,0.6)]'
                : 'bg-neutral-900 border-neutral-700 text-neutral-400'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>DRAW {drawMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* 2x ZOOM */}
          <button
            onClick={() => setZoom2x(!zoom2x)}
            className={`px-2.5 py-1.5 rounded border text-xs font-mono font-bold transition-all cursor-pointer ${
              zoom2x
                ? 'bg-blue-950/80 border-blue-500 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                : 'bg-neutral-900 border-neutral-700 text-neutral-400'
            }`}
          >
            2x ZOOM
          </button>

          {/* FLAT */}
          <button
            onClick={handleFlat}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-mono font-bold hover:bg-neutral-700 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>FLAT</span>
          </button>

          {/* EQ ON Industrial Hazard Safety Switch */}
          <HazardSafetySwitch
            label="EQ ON"
            isOn={eqOn}
            ledColor="green"
            onToggle={() => setEqOn(!eqOn)}
          />
        </div>
      </div>

      {/* Main Body: 31 Faders Grid + Right Master Presence / VU / Main Out */}
      <div className="flex items-stretch gap-4">
        {/* Left Side: 31 Equalizer Faders with Low, Mid, High Range Headings */}
        <div className="flex-1 flex flex-col bg-[#080a0d] p-3 rounded-lg border border-neutral-800 shadow-inner overflow-hidden">
          {/* Frequency Range Headers: LOW | MID | HIGH */}
          <div className="grid grid-cols-3 gap-2 mb-2 pb-1 border-b border-neutral-800/80">
            {/* Low Frequencies (Orange) */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-orange-400 tracking-wider uppercase">
                LOW FREQUENCIES
              </span>
              <div className="w-full h-[2px] bg-orange-500/80 shadow-[0_0_6px_rgba(255,136,0,0.6)] rounded mt-0.5" />
            </div>

            {/* Mid Frequencies (Cyan) */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase">
                MID FREQUENCIES
              </span>
              <div className="w-full h-[2px] bg-cyan-400/80 shadow-[0_0_6px_rgba(0,229,255,0.6)] rounded mt-0.5" />
            </div>

            {/* High Frequencies (Purple) */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-purple-400 tracking-wider uppercase">
                HIGH FREQUENCIES
              </span>
              <div className="w-full h-[2px] bg-purple-400/80 shadow-[0_0_6px_rgba(191,90,242,0.6)] rounded mt-0.5" />
            </div>
          </div>

          {/* 31 Sliders Row with Draw interaction */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDownDraw}
            onPointerMove={handlePointerMoveDraw}
            onPointerUp={handlePointerUpDraw}
            className={`flex items-end justify-between gap-1 overflow-x-auto py-2 ${
              drawMode ? 'cursor-crosshair' : ''
            }`}
          >
            {EQ_31_FREQS.map((f, i) => {
              const ledColor =
                f.band === 'low'
                  ? '#ff8800'
                  : f.band === 'mid'
                  ? '#00e5ff'
                  : '#bf5af2';

              return (
                <div key={f.label} className="flex flex-col items-center min-w-[24px]">
                  <SkeuomorphicFader
                    orientation="vertical"
                    height={160}
                    value={eqGains[i]}
                    min={-12}
                    max={12}
                    trackColor={f.band === 'low' ? 'orange' : f.band === 'mid' ? 'cyan' : 'purple'}
                    showScale={i === 0}
                    scaleTicks={
                      i === 0
                        ? [
                            { label: '+12', value: 12 },
                            { label: '0', value: 0 },
                            { label: '-12', value: -12 },
                          ]
                        : undefined
                    }
                    capSize="sm"
                    ledIndicatorColor={ledColor}
                    onChange={(val) => handleGainChange(i, val)}
                  />

                  {/* Frequency Label underneath */}
                  <span className="text-[8px] font-mono text-neutral-400 font-bold mt-1 tracking-tighter text-center">
                    {f.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 2x Zoom Scrollbar at bottom */}
          <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between text-[9px] font-mono text-neutral-400">
            <span>20 Hz</span>
            <div className="flex-1 mx-4 h-2 rounded bg-neutral-900 border border-neutral-800 relative flex items-center justify-center">
              <div className="w-1/3 h-1.5 rounded bg-neutral-600 border border-neutral-500 shadow cursor-pointer" />
            </div>
            <span>20 kHz</span>
          </div>
        </div>

        {/* Right Section: EQ PRESENCE Knob + MAIN OUT VU Meter + Vertical Volume Fader */}
        <div className="w-48 flex flex-col items-center justify-between bg-[#080a0d] p-3 rounded-lg border border-neutral-800 shadow-inner">
          {/* EQ PRESENCE Knob */}
          <div className="flex flex-col items-center">
            <SkeuomorphicKnob
              label="EQ PRESENCE"
              sublabel="OUTPUT EFFECT AMOUNT"
              value={eqPresence}
              min={0}
              max={100}
              unit="%"
              size="md"
              color="cyan"
              onChange={setEqPresence}
            />
          </div>

          {/* MAIN OUT Stereo LED VU Meter */}
          <div className="my-2">
            <SkeuomorphicMeter
              levelL={eqOn ? 0.76 : 0.05}
              levelR={eqOn ? 0.73 : 0.05}
              label="MAIN OUT"
            />
          </div>

          {/* MAIN OUT Vertical Fader */}
          <div className="flex flex-col items-center">
            <SkeuomorphicFader
              orientation="vertical"
              height={120}
              value={mainOutVol}
              min={-60}
              max={6}
              trackColor="silver"
              capSize="sm"
              showScale={true}
              scaleTicks={[
                { label: '+6', value: 6 },
                { label: '0', value: 0 },
                { label: '-inf', value: -60 },
              ]}
              label="MAIN OUT"
              onChange={setMainOutVol}
            />

            {/* PFL Button & CLIP LED */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setPfl(!pfl)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                  pfl
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                }`}
              >
                PFL
              </button>

              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-950 border border-red-800" />
                <span className="text-[8px] font-mono text-neutral-500 font-bold">CLIP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
