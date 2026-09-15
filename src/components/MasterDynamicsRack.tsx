import React, { useState } from 'react';
import { SkeuomorphicKnob } from './SkeuomorphicKnob';
import { SkeuomorphicMeter } from './SkeuomorphicMeter';
import { HazardSafetySwitch } from './SkeuomorphicButton';
import { Power, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const MasterDynamicsRack: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<'clean' | 'glue' | 'slam'>('clean');

  // Bus Compressor
  const [busCompOn, setBusCompOn] = useState(true);
  const [softKnee, setSoftKnee] = useState(true);
  const [threshold, setThreshold] = useState(-16);
  const [ratio, setRatio] = useState(3.2);
  const [attack, setAttack] = useState(10);
  const [release, setRelease] = useState(0.3);
  const [makeup, setMakeup] = useState(2.5);
  const [scHpf, setScHpf] = useState(80);
  const [compMix, setCompMix] = useState(100);

  // 3-Band Dynamics
  const [multiBandOn, setMultiBandOn] = useState(true);
  const [autoMakeup, setAutoMakeup] = useState(true);
  const [lowThresh, setLowThresh] = useState(-12);
  const [lowRatio, setLowRatio] = useState(2.8);
  const [midThresh, setMidThresh] = useState(-14);
  const [midRatio, setMidRatio] = useState(2.4);
  const [highThresh, setHighThresh] = useState(-18);
  const [highRatio, setHighRatio] = useState(2.2);

  // True-Peak Limiter
  const [limiterCeiling, setLimiterCeiling] = useState(-0.3);
  const [limiterRelease, setLimiterRelease] = useState(45);
  const [limiterDrive, setLimiterDrive] = useState(2.0);
  const [oversample, setOversample] = useState<'1x' | '2x' | '4x' | '8x'>('4x');

  // Safety bypass
  const [globalBypass, setGlobalBypass] = useState(false);

  return (
    <div className="flex flex-col w-full bg-[#0a0c10] rounded-xl border-2 border-neutral-800 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.95)] select-none font-sans">
      {/* Top Preset Bar & Gain Reduction Overview */}
      <div className="flex items-center justify-between p-3 bg-[#0d1015] rounded-lg border border-neutral-800 mb-4 shadow-inner">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-neutral-400 uppercase">
            DYNAMICS PRESET:
          </span>
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded border border-neutral-800">
            {(['clean', 'glue', 'slam'] as const).map((pst) => (
              <button
                key={pst}
                onClick={() => setSelectedPreset(pst)}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                  selectedPreset === pst
                    ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.7)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {pst === 'clean' ? 'COMMERCIAL CLEAN' : pst === 'glue' ? 'PUNCHY GLUE' : 'HEAVY SLAM'}
              </button>
            ))}
          </div>
        </div>

        {/* Global GR Meter & Safety LEDs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-[#090b0e] px-2 py-1 rounded border border-neutral-800">
            <span className="text-[9px] font-mono text-neutral-400 font-bold">TOTAL GR:</span>
            <span className="text-xs font-mono font-black text-orange-400 drop-shadow">
              -3.2 dB
            </span>
          </div>

          <HazardSafetySwitch
            label="BYPASS"
            isOn={!globalBypass}
            ledColor="green"
            onToggle={() => setGlobalBypass(!globalBypass)}
          />
        </div>
      </div>

      {/* Grid: Bus Compressor & 3-Band Dynamics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* BUS COMPRESSOR */}
        <div className="p-3 bg-[#0e1117] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBusCompOn(!busCompOn)}
                className={`p-1 rounded-full border transition-all cursor-pointer ${
                  busCompOn
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_8px_#00ff66]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-black text-white tracking-wider uppercase">
                BUS COMPRESSOR
              </span>
            </div>
            <button
              onClick={() => setSoftKnee(!softKnee)}
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                softKnee
                  ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-[0_0_6px_#ff8800]'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400'
              }`}
            >
              SOFT KNEE
            </button>
          </div>

          {/* Knobs */}
          <div className="grid grid-cols-7 gap-1 items-center">
            <SkeuomorphicKnob label="THRESH" value={threshold} min={-40} max={0} unit="dB" size="sm" color="cyan" arcType="bi" onChange={setThreshold} />
            <SkeuomorphicKnob label="RATIO" value={ratio} min={1.5} max={10} unit=":1" size="sm" color="cyan" onChange={setRatio} />
            <SkeuomorphicKnob label="ATTACK" value={attack} min={0.1} max={30} unit="ms" size="sm" color="cyan" onChange={setAttack} />
            <SkeuomorphicKnob label="RELEASE" value={release} min={0.1} max={1.2} unit="s" size="sm" color="cyan" onChange={setRelease} />
            <SkeuomorphicKnob label="MAKEUP" value={makeup} min={0} max={12} unit="dB" size="sm" color="cyan" onChange={setMakeup} />
            <SkeuomorphicKnob label="SC HPF" value={scHpf} min={20} max={300} unit="Hz" size="sm" color="cyan" onChange={setScHpf} />
            <SkeuomorphicKnob label="MIX" value={compMix} min={0} max={100} unit="%" size="sm" color="orange" onChange={setCompMix} />
          </div>
        </div>

        {/* 3-BAND DYNAMICS */}
        <div className="p-3 bg-[#0e1117] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMultiBandOn(!multiBandOn)}
                className={`p-1 rounded-full border transition-all cursor-pointer ${
                  multiBandOn
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_8px_#00ff66]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-black text-white tracking-wider uppercase">
                3-BAND DYNAMICS
              </span>
            </div>
            <button
              onClick={() => setAutoMakeup(!autoMakeup)}
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                autoMakeup
                  ? 'bg-blue-950 border-blue-500 text-blue-300 shadow-[0_0_6px_#3b82f6]'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400'
              }`}
            >
              AUTO MAKEUP
            </button>
          </div>

          {/* 3 Bands: LOW (orange) | MID (cyan) | HIGH (purple) */}
          <div className="grid grid-cols-3 gap-2">
            {/* Low Band */}
            <div className="flex flex-col items-center p-2 rounded bg-[#090c10] border border-orange-950/70">
              <span className="text-[10px] font-mono font-bold text-orange-400 mb-1">LOW (120 Hz)</span>
              <div className="flex items-center gap-1">
                <SkeuomorphicKnob label="THRESH" value={lowThresh} min={-40} max={0} unit="dB" size="sm" color="orange" arcType="bi" onChange={setLowThresh} />
                <SkeuomorphicKnob label="RATIO" value={lowRatio} min={1.5} max={8} unit=":1" size="sm" color="orange" onChange={setLowRatio} />
              </div>
            </div>

            {/* Mid Band */}
            <div className="flex flex-col items-center p-2 rounded bg-[#090c10] border border-cyan-950/70">
              <span className="text-[10px] font-mono font-bold text-cyan-400 mb-1">MID (4.0 kHz)</span>
              <div className="flex items-center gap-1">
                <SkeuomorphicKnob label="THRESH" value={midThresh} min={-40} max={0} unit="dB" size="sm" color="cyan" arcType="bi" onChange={setMidThresh} />
                <SkeuomorphicKnob label="RATIO" value={midRatio} min={1.5} max={8} unit=":1" size="sm" color="cyan" onChange={setMidRatio} />
              </div>
            </div>

            {/* High Band */}
            <div className="flex flex-col items-center p-2 rounded bg-[#090c10] border border-purple-950/70">
              <span className="text-[10px] font-mono font-bold text-purple-400 mb-1">HIGH (AIR)</span>
              <div className="flex items-center gap-1">
                <SkeuomorphicKnob label="THRESH" value={highThresh} min={-40} max={0} unit="dB" size="sm" color="purple" arcType="bi" onChange={setHighThresh} />
                <SkeuomorphicKnob label="RATIO" value={highRatio} min={1.5} max={8} unit=":1" size="sm" color="purple" onChange={setHighRatio} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRUE-PEAK SAFETY LIMITER & MASTERING SAFETY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TRUE-PEAK SAFETY LIMITER */}
        <div className="p-3 bg-[#0e1117] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <span className="text-xs font-mono font-black text-white tracking-wider uppercase">
              TRUE-PEAK SAFETY LIMITER
            </span>
            {/* Oversample selector */}
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
              {(['1x', '2x', '4x', '8x'] as const).map((os) => (
                <button
                  key={os}
                  onClick={() => setOversample(os)}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer ${
                    oversample === os
                      ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
                      : 'text-neutral-400'
                  }`}
                >
                  {os}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 items-center">
            <SkeuomorphicKnob label="CEILING" value={limiterCeiling} min={-3} max={0} unit="dB" size="sm" color="red" onChange={setLimiterCeiling} />
            <SkeuomorphicKnob label="RELEASE" value={limiterRelease} min={10} max={200} unit="ms" size="sm" color="cyan" onChange={setLimiterRelease} />
            <SkeuomorphicKnob label="DRIVE" value={limiterDrive} min={0} max={8} unit="dB" size="sm" color="orange" onChange={setLimiterDrive} />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold mb-1">LIMITING</span>
              <span className="text-xs font-mono font-black text-red-400 drop-shadow">-1.8 dB</span>
            </div>
          </div>
        </div>

        {/* MASTERING SAFETY STATUS */}
        <div className="p-3 bg-[#0e1117] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
          <span className="text-xs font-mono font-black text-white tracking-wider uppercase border-b border-neutral-800 pb-2 mb-3">
            MASTERING SAFETY STATUS
          </span>

          <div className="flex items-center justify-around py-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_#00ff66]" />
              <span>TRANSIENT SAFE</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_#00ff66]" />
              <span>NO CLIPPING</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_#00ff66]" />
              <span>KEY LOCK SAFE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
