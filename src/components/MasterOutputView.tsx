import React, { useState } from 'react';
import { SkeuomorphicKnob } from './SkeuomorphicKnob';
import { SkeuomorphicFader } from './SkeuomorphicFader';
import { SkeuomorphicMeter } from './SkeuomorphicMeter';
import { HazardSafetySwitch } from './SkeuomorphicButton';
import { MasterEffectsRack } from './MasterEffectsRack';
import { MasterDynamicsRack } from './MasterDynamicsRack';
import { MasterEq31Band, EQ_PRESETS } from './MasterEq31Band';
import { ChevronDown, Volume2, Sparkles, Activity, Sliders } from 'lucide-react';

interface MasterOutputViewProps {
  onClose: () => void;
}

export const MasterOutputView: React.FC<MasterOutputViewProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'output' | 'effects' | 'dynamics' | 'eq'>('output');

  // Master Bus knobs
  const [inputTrim, setInputTrim] = useState(0);
  const [masterFilter, setMasterFilter] = useState(0);
  const [masterLevel, setMasterLevel] = useState(0);
  const [balance, setBalance] = useState(0);

  // Program Safe knobs
  const [denoise, setDenoise] = useState(15);
  const [noiseGate, setNoiseGate] = useState(10);
  const [stereoWidth, setStereoWidth] = useState(100);
  const [monoBass, setMonoBass] = useState(true);

  // Mastering Chain knobs
  const [compressor, setCompressor] = useState(45);
  const [maximizer, setMaximizer] = useState(50);
  const [limiterCeiling, setLimiterCeiling] = useState(-0.2);
  const [limiterOn, setLimiterOn] = useState(true);
  const [mainOutVol, setMainOutVol] = useState(0);

  // Preset Selector
  const [selectedPreset, setSelectedPreset] = useState('019 COMMERCIAL CLEAN');
  const [isPresetOpen, setIsPresetOpen] = useState(false);

  return (
    <div className="flex flex-col w-full bg-[#0a0c10] rounded-xl border-2 border-neutral-800 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.95)] select-none font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
        <div>
          <h2 className="text-base font-black tracking-wider text-white uppercase drop-shadow flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-orange-400" />
            <span>DJ IMAN MASTER OUTPUT</span>
          </h2>
          <div className="w-24 h-[2px] bg-gradient-to-r from-orange-400 to-transparent mt-0.5" />
        </div>

        {/* OUTPUT STATUS LED Meter */}
        <SkeuomorphicMeter levelL={0.75} orientation="horizontal" label="OUTPUT STATUS" />

        {/* 4 Tabs: OUTPUT | EFFECTS | DYNAMICS | 31-BAND EQ */}
        <div className="flex items-center gap-1 bg-[#101318] p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded transition-all cursor-pointer ${
              activeTab === 'output'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_12px_rgba(255,136,0,0.7)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>OUTPUT</span>
          </button>

          <button
            onClick={() => setActiveTab('effects')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded transition-all cursor-pointer ${
              activeTab === 'effects'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(0,229,255,0.7)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>EFFECTS</span>
          </button>

          <button
            onClick={() => setActiveTab('dynamics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded transition-all cursor-pointer ${
              activeTab === 'dynamics'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(191,90,242,0.7)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>DYNAMICS</span>
          </button>

          <button
            onClick={() => setActiveTab('eq')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded transition-all cursor-pointer ${
              activeTab === 'eq'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_12px_rgba(0,255,102,0.7)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>31-BAND EQ</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'eq' && <MasterEq31Band onBack={() => setActiveTab('output')} />}
      {activeTab === 'effects' && <MasterEffectsRack />}
      {activeTab === 'dynamics' && <MasterDynamicsRack />}

      {activeTab === 'output' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SECTION 1: MASTER BUS */}
          <div className="p-4 bg-[#0d1015] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
            <span className="text-xs font-mono font-black text-white tracking-wider uppercase border-b border-neutral-800 pb-2 mb-3">
              MASTER BUS
            </span>

            {/* Knobs */}
            <div className="grid grid-cols-2 gap-4 items-center justify-items-center mb-4">
              <SkeuomorphicKnob
                label="INPUT TRIM"
                value={inputTrim}
                min={-24}
                max={24}
                unit="dB"
                size="md"
                color="cyan"
                arcType="bi"
                onChange={setInputTrim}
              />
              <SkeuomorphicKnob
                label="MASTER FILTER"
                value={masterFilter}
                min={-100}
                max={100}
                size="md"
                color="cyan"
                arcType="bi"
                displayValue={masterFilter === 0 ? 'FLAT' : `${Math.round(masterFilter)}%`}
                onChange={setMasterFilter}
              />
              <SkeuomorphicKnob
                label="MASTER LEVEL"
                value={masterLevel}
                min={-60}
                max={6}
                unit="dB"
                size="md"
                color="orange"
                arcType="bi"
                onChange={setMasterLevel}
              />
              <SkeuomorphicKnob
                label="BALANCE"
                value={balance}
                min={-100}
                max={100}
                size="md"
                color="white"
                arcType="bi"
                displayValue={balance === 0 ? 'CENTER' : balance < 0 ? `L${Math.abs(Math.round(balance))}` : `R${Math.round(balance)}`}
                onChange={setBalance}
              />
            </div>

            {/* Stereo VU Meter */}
            <div className="flex justify-center mt-2">
              <SkeuomorphicMeter levelL={0.74} levelR={0.71} label="BUS VU" />
            </div>
          </div>

          {/* SECTION 2: PROGRAM SAFE */}
          <div className="p-4 bg-[#0d1015] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
            <span className="text-xs font-mono font-black text-white tracking-wider uppercase border-b border-neutral-800 pb-2 mb-3">
              PROGRAM SAFE
            </span>

            {/* Knobs */}
            <div className="grid grid-cols-3 gap-2 items-center justify-items-center mb-4">
              <SkeuomorphicKnob
                label="DENOISE"
                value={denoise}
                min={0}
                max={100}
                unit="%"
                size="sm"
                color="cyan"
                onChange={setDenoise}
              />
              <SkeuomorphicKnob
                label="NOISE GATE"
                value={noiseGate}
                min={0}
                max={100}
                unit="%"
                size="sm"
                color="cyan"
                onChange={setNoiseGate}
              />
              <SkeuomorphicKnob
                label="STEREO WIDTH"
                value={stereoWidth}
                min={0}
                max={200}
                unit="%"
                size="sm"
                color="cyan"
                onChange={setStereoWidth}
              />
            </div>

            {/* MONO BASS Switch & Safety Status Indicators */}
            <div className="flex flex-col gap-3 p-3 bg-[#090b0e] rounded border border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-neutral-300">
                  MONO BASS (120 Hz)
                </span>
                <button
                  onClick={() => setMonoBass(!monoBass)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    monoBass
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_8px_#00e5ff]'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {monoBass ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#ffaa00]" />
                  <span>TRANSPARENT</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#00ff66]" />
                  <span>CLEAN SIGNAL</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: MASTERING CHAIN */}
          <div className="p-4 bg-[#0d1015] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
              <span className="text-xs font-mono font-black text-white tracking-wider uppercase">
                MASTERING CHAIN
              </span>

              {/* Preset Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsPresetOpen(!isPresetOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#151921] border border-neutral-700 text-[10px] font-mono font-bold text-neutral-200 shadow hover:border-neutral-500 cursor-pointer"
                >
                  <span>{selectedPreset.slice(4)}</span>
                  <ChevronDown className="w-3 h-3 text-neutral-400" />
                </button>

                {isPresetOpen && (
                  <div className="absolute top-full right-0 mt-1 w-52 max-h-56 overflow-y-auto bg-[#101318] border border-neutral-700 rounded shadow-2xl z-50 py-1">
                    {EQ_PRESETS.slice(0, 10).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPreset(p.name);
                          setIsPresetOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[10px] font-mono text-neutral-300 hover:bg-orange-950/70 hover:text-orange-400 border-b border-neutral-800/40"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Knobs: COMPRESSOR | MAXIMIZER | LIMITER CEILING */}
            <div className="grid grid-cols-3 gap-2 items-center justify-items-center mb-4">
              <SkeuomorphicKnob
                label="COMPRESSOR"
                value={compressor}
                min={0}
                max={100}
                unit="%"
                size="sm"
                color="orange"
                onChange={setCompressor}
              />
              <SkeuomorphicKnob
                label="MAXIMIZER"
                value={maximizer}
                min={0}
                max={100}
                unit="%"
                size="sm"
                color="orange"
                onChange={setMaximizer}
              />
              <SkeuomorphicKnob
                label="CEILING"
                value={limiterCeiling}
                min={-6}
                max={0}
                unit="dB"
                size="sm"
                color="red"
                onChange={setLimiterCeiling}
              />
            </div>

            {/* LIMITER ON Safety Switch & MAIN OUT Fader */}
            <div className="flex items-center justify-around pt-2 border-t border-neutral-800">
              <HazardSafetySwitch
                label="LIMITER ON"
                isOn={limiterOn}
                ledColor="green"
                onToggle={() => setLimiterOn(!limiterOn)}
              />

              <div className="flex flex-col items-center">
                <SkeuomorphicFader
                  orientation="vertical"
                  height={120}
                  value={mainOutVol}
                  min={-60}
                  max={6}
                  trackColor="silver"
                  capSize="sm"
                  label="MAIN OUT"
                  onChange={setMainOutVol}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
