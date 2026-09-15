import React, { useState, useEffect } from 'react';
import { SkeuomorphicKnob } from './SkeuomorphicKnob';
import { SkeuomorphicMeter } from './SkeuomorphicMeter';
import { Power, Radio } from 'lucide-react';

export const MasterEffectsRack: React.FC = () => {
  const [fxSource, setFxSource] = useState<'master' | 'deckA' | 'deckB'>('master');
  const [globalWetDry, setGlobalWetDry] = useState<number>(45);

  // Unit 1: Reverb
  const [reverbOn, setReverbOn] = useState(true);
  const [predelay, setPredelay] = useState(25);
  const [early, setEarly] = useState(40);
  const [decay, setDecay] = useState(2.8);
  const [space, setSpace] = useState(65);
  const [damping, setDamping] = useState(30);
  const [reverbMix, setReverbMix] = useState(35);

  // Unit 2: Delay
  const [delayOn, setDelayOn] = useState(true);
  const [bpmLink, setBpmLink] = useState(true);
  const [delayTime, setDelayTime] = useState(250);
  const [delayFeedback, setDelayFeedback] = useState(45);
  const [delayLowCut, setDelayLowCut] = useState(120);
  const [delayHighCut, setDelayHighCut] = useState(6000);
  const [delayWidth, setDelayWidth] = useState(100);
  const [delayMix, setDelayMix] = useState(30);

  // Unit 3: Flanger
  const [flangerOn, setFlangerOn] = useState(true);
  const [flangerRate, setFlangerRate] = useState(0.4);
  const [flangerDepth, setFlangerDepth] = useState(60);
  const [flangerFeedback, setFlangerFeedback] = useState(45);
  const [flangerPhase, setFlangerPhase] = useState(90);
  const [flangerMix, setFlangerMix] = useState(40);

  // Unit 4: Phaser + Echo
  const [phaserOn, setPhaserOn] = useState(true);
  const [phaserMode, setPhaserMode] = useState<'phaser' | 'echo'>('phaser');
  const [phaserRate, setPhaserRate] = useState(0.8);
  const [phaserDepth, setPhaserDepth] = useState(70);
  const [phaserResonance, setPhaserResonance] = useState(55);
  const [phaserEchoTime, setPhaserEchoTime] = useState(320);
  const [phaserMix, setPhaserMix] = useState(35);

  // Flanger animated sine wave
  const [sinePhase, setSinePhase] = useState(0);
  useEffect(() => {
    let anim: number;
    const loop = () => {
      setSinePhase((p) => (p + 0.05) % (Math.PI * 2));
      anim = requestAnimationFrame(loop);
    };
    anim = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(anim);
  }, []);

  return (
    <div className="flex flex-col w-full bg-[#0a0c10] rounded-xl border-2 border-neutral-800 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.95)] select-none font-sans">
      {/* Global FX Control Bar */}
      <div className="flex items-center justify-between p-3 bg-[#0d1015] rounded-lg border border-neutral-800 mb-4 shadow-inner">
        {/* Source selector: MASTER | DECK A | DECK B */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-neutral-400 uppercase">
            FX SOURCE:
          </span>
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded border border-neutral-800">
            {(['master', 'deckA', 'deckB'] as const).map((src) => (
              <button
                key={src}
                onClick={() => setFxSource(src)}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                  fxSource === src
                    ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.7)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {src === 'master' ? 'MASTER' : src === 'deckA' ? 'DECK A' : 'DECK B'}
              </button>
            ))}
          </div>
        </div>

        {/* Global Wet / Dry Knob & Meter */}
        <div className="flex items-center gap-6">
          <SkeuomorphicKnob
            label="GLOBAL WET/DRY"
            value={globalWetDry}
            min={0}
            max={100}
            unit="%"
            size="md"
            color="cyan"
            onChange={setGlobalWetDry}
          />

          <SkeuomorphicMeter levelL={0.72} levelR={0.69} label="FX OUT" />
        </div>
      </div>

      {/* 4 Rack Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* UNIT 1: SPACE REVERB */}
        <div className="p-3 bg-[#0e1117] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReverbOn(!reverbOn)}
                className={`p-1 rounded-full border transition-all cursor-pointer ${
                  reverbOn
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_8px_#00ff66]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-black text-white tracking-wider uppercase">
                UNIT 1: SPACE REVERB
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              HALL • MEDIUM WARM
            </span>
          </div>

          {/* Reverb Knobs */}
          <div className="grid grid-cols-6 gap-1 items-center">
            <SkeuomorphicKnob label="PREDELAY" value={predelay} min={0} max={100} unit="ms" size="sm" color="cyan" onChange={setPredelay} />
            <SkeuomorphicKnob label="EARLY" value={early} min={0} max={100} unit="%" size="sm" color="cyan" onChange={setEarly} />
            <SkeuomorphicKnob label="DECAY" value={decay} min={0.5} max={10} unit="s" size="sm" color="cyan" onChange={setDecay} />
            <SkeuomorphicKnob label="SPACE" value={space} min={0} max={100} unit="%" size="sm" color="cyan" onChange={setSpace} />
            <SkeuomorphicKnob label="DAMPING" value={damping} min={0} max={100} unit="%" size="sm" color="cyan" onChange={setDamping} />
            <SkeuomorphicKnob label="MIX" value={reverbMix} min={0} max={100} unit="%" size="sm" color="orange" onChange={setReverbMix} />
          </div>
        </div>

        {/* UNIT 2: DIGITAL DELAY */}
        <div className="p-3 bg-[#0e1117] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDelayOn(!delayOn)}
                className={`p-1 rounded-full border transition-all cursor-pointer ${
                  delayOn
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_8px_#00ff66]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-black text-white tracking-wider uppercase">
                UNIT 2: DIGITAL DELAY
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBpmLink(!bpmLink)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                  bpmLink
                    ? 'bg-blue-950 border-blue-500 text-blue-300 shadow-[0_0_6px_#3b82f6]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                }`}
              >
                BPM LINK
              </button>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                1/2 BEAT
              </span>
            </div>
          </div>

          {/* Delay Knobs */}
          <div className="grid grid-cols-6 gap-1 items-center">
            <SkeuomorphicKnob label="TIME" value={delayTime} min={10} max={1000} unit="ms" size="sm" color="cyan" onChange={setDelayTime} />
            <SkeuomorphicKnob label="FDBK" value={delayFeedback} min={0} max={100} unit="%" size="sm" color="cyan" onChange={setDelayFeedback} />
            <SkeuomorphicKnob label="LO CUT" value={delayLowCut} min={20} max={500} unit="Hz" size="sm" color="cyan" onChange={setDelayLowCut} />
            <SkeuomorphicKnob label="HI CUT" value={delayHighCut} min={1000} max={16000} unit="Hz" size="sm" color="cyan" onChange={setDelayHighCut} />
            <SkeuomorphicKnob label="WIDTH" value={delayWidth} min={0} max={200} unit="%" size="sm" color="cyan" onChange={setDelayWidth} />
            <SkeuomorphicKnob label="MIX" value={delayMix} min={0} max={100} unit="%" size="sm" color="orange" onChange={setDelayMix} />
          </div>
        </div>

        {/* UNIT 3: LIGHT FLANGER */}
        <div className="p-3 bg-[#0e1117] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFlangerOn(!flangerOn)}
                className={`p-1 rounded-full border transition-all cursor-pointer ${
                  flangerOn
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_8px_#00ff66]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-black text-white tracking-wider uppercase">
                UNIT 3: LIGHT FLANGER
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              LIGHT SWEEP
            </span>
          </div>

          {/* Animated Sine Wave Display */}
          <div className="w-full h-8 bg-[#090b0e] rounded border border-neutral-800 relative overflow-hidden mb-2">
            <svg className="w-full h-full">
              <path
                d={Array.from({ length: 40 }).map((_, i) => {
                  const x = (i / 39) * 280;
                  const y = 16 + Math.sin(sinePhase + (i / 39) * Math.PI * 4) * 10;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="1.5"
                filter="drop-shadow(0 0 4px #00e5ff)"
              />
            </svg>
          </div>

          {/* Flanger Knobs */}
          <div className="grid grid-cols-5 gap-1 items-center">
            <SkeuomorphicKnob label="RATE" value={flangerRate} min={0.05} max={5} unit="Hz" size="sm" color="cyan" onChange={setFlangerRate} />
            <SkeuomorphicKnob label="DEPTH" value={flangerDepth} min={0} max={100} unit="%" size="sm" color="cyan" onChange={setFlangerDepth} />
            <SkeuomorphicKnob label="FEEDBACK" value={flangerFeedback} min={0} max={100} unit="%" size="sm" color="cyan" onChange={setFlangerFeedback} />
            <SkeuomorphicKnob label="PHASE" value={flangerPhase} min={0} max={360} unit="°" size="sm" color="cyan" onChange={setFlangerPhase} />
            <SkeuomorphicKnob label="MIX" value={flangerMix} min={0} max={100} unit="%" size="sm" color="orange" onChange={setFlangerMix} />
          </div>
        </div>

        {/* UNIT 4: PHASER + ECHO */}
        <div className="p-3 bg-[#0e1117] rounded-lg border border-neutral-800 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPhaserOn(!phaserOn)}
                className={`p-1 rounded-full border transition-all cursor-pointer ${
                  phaserOn
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_8px_#00ff66]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-black text-white tracking-wider uppercase">
                UNIT 4: PHASER + ECHO
              </span>
            </div>

            {/* Mode: PHASER | ECHO */}
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
              <button
                onClick={() => setPhaserMode('phaser')}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded transition-all cursor-pointer ${
                  phaserMode === 'phaser'
                    ? 'bg-purple-950 border border-purple-500 text-purple-300 shadow-[0_0_6px_#bf5af2]'
                    : 'text-neutral-400'
                }`}
              >
                PHASER
              </button>
              <button
                onClick={() => setPhaserMode('echo')}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded transition-all cursor-pointer ${
                  phaserMode === 'echo'
                    ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow-[0_0_6px_#00e5ff]'
                    : 'text-neutral-400'
                }`}
              >
                ECHO
              </button>
            </div>
          </div>

          {/* Phaser Knobs */}
          <div className="grid grid-cols-5 gap-1 items-center">
            <SkeuomorphicKnob label="RATE" value={phaserRate} min={0.1} max={8} unit="Hz" size="sm" color="purple" onChange={setPhaserRate} />
            <SkeuomorphicKnob label="DEPTH" value={phaserDepth} min={0} max={100} unit="%" size="sm" color="purple" onChange={setPhaserDepth} />
            <SkeuomorphicKnob label="RESONANCE" value={phaserResonance} min={0} max={100} unit="%" size="sm" color="purple" onChange={setPhaserResonance} />
            <SkeuomorphicKnob label="ECHO TIME" value={phaserEchoTime} min={50} max={800} unit="ms" size="sm" color="cyan" onChange={setPhaserEchoTime} />
            <SkeuomorphicKnob label="MIX" value={phaserMix} min={0} max={100} unit="%" size="sm" color="orange" onChange={setPhaserMix} />
          </div>
        </div>
      </div>
    </div>
  );
};
