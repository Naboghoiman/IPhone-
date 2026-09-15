import React, { useState } from 'react';
import { DeckTelemetry, TrackData } from '../types/dj';
import { SkeuomorphicKnob } from './SkeuomorphicKnob';
import { SkeuomorphicFader } from './SkeuomorphicFader';
import { SkeuomorphicMeter } from './SkeuomorphicMeter';
import { Play, Pause } from 'lucide-react';

interface MixerViewProps {
  telemetryA: DeckTelemetry;
  telemetryB: DeckTelemetry;
  crossfader: number;
  onCrossfaderChange: (val: number) => void;
  onPlayPauseA: () => void;
  onPlayPauseB: () => void;
  onCueA: () => void;
  onCueB: () => void;
  onEqChangeA: (low: number, mid: number, high: number) => void;
  onEqChangeB: (low: number, mid: number, high: number) => void;
  onFilterChangeA: (val: number) => void;
  onFilterChangeB: (val: number) => void;
  onVolumeChangeA: (vol: number) => void;
  onVolumeChangeB: (vol: number) => void;
}

export const MixerView: React.FC<MixerViewProps> = ({
  telemetryA,
  telemetryB,
  crossfader,
  onCrossfaderChange,
  onPlayPauseA,
  onPlayPauseB,
  onCueA,
  onCueB,
  onEqChangeA,
  onEqChangeB,
  onFilterChangeA,
  onFilterChangeB,
  onVolumeChangeA,
  onVolumeChangeB,
}) => {
  // Deck A knobs
  const [gainA, setGainA] = useState(0);
  const [highA, setHighA] = useState(0);
  const [midA, setMidA] = useState(0);
  const [lowA, setLowA] = useState(0);
  const [filterA, setFilterA] = useState(0);
  const [faderVolA, setFaderVolA] = useState(1.0);

  // Deck B knobs
  const [gainB, setGainB] = useState(0);
  const [highB, setHighB] = useState(0);
  const [midB, setMidB] = useState(0);
  const [lowB, setLowB] = useState(0);
  const [filterB, setFilterB] = useState(0);
  const [faderVolB, setFaderVolB] = useState(1.0);

  // Center Master Section
  const [masterFilter, setMasterFilter] = useState(0); // -100 (LPF) to +100 (HPF)
  const [masterFxType, setMasterFxType] = useState<'flanger' | 'phaser' | 'cut'>('flanger');
  const [masterFxAmount, setMasterFxAmount] = useState(30);

  return (
    <div className="flex flex-col w-full bg-[#0d1015] rounded-xl border-2 border-neutral-800 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.95)] select-none font-sans">
      {/* 3-Column Strip: Channel A | Center Master | Channel B */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* CHANNEL A (Left) */}
        <div className="flex flex-col items-center p-3 rounded-lg bg-[#0a0c10] border border-cyan-950/60 shadow-inner">
          <span className="text-xs font-mono font-black text-cyan-400 tracking-widest uppercase mb-3 drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]">
            CHANNEL A
          </span>

          {/* EQ Knobs */}
          <div className="flex flex-col items-center gap-2 mb-4">
            <SkeuomorphicKnob
              label="GAIN"
              value={gainA}
              min={-12}
              max={12}
              size="sm"
              color="white"
              arcType="bi"
              unit="dB"
              onChange={setGainA}
            />
            <SkeuomorphicKnob
              label="HIGH"
              value={highA}
              min={-24}
              max={12}
              size="sm"
              color="white"
              arcType="bi"
              unit="dB"
              onChange={(v) => {
                setHighA(v);
                onEqChangeA(lowA, midA, v);
              }}
            />
            <SkeuomorphicKnob
              label="MID"
              value={midA}
              min={-24}
              max={12}
              size="sm"
              color="white"
              arcType="bi"
              unit="dB"
              onChange={(v) => {
                setMidA(v);
                onEqChangeA(lowA, v, highA);
              }}
            />
            <SkeuomorphicKnob
              label="LOW"
              value={lowA}
              min={-24}
              max={12}
              size="sm"
              color="white"
              arcType="bi"
              unit="dB"
              onChange={(v) => {
                setLowA(v);
                onEqChangeA(v, midA, highA);
              }}
            />
            <SkeuomorphicKnob
              label="FILTER"
              sublabel="LPF / HPF"
              value={filterA}
              min={-100}
              max={100}
              size="md"
              color="cyan"
              arcType="bi"
              onChange={(v) => {
                setFilterA(v);
                onFilterChangeA(v);
              }}
            />
          </div>

          {/* Channel A Vertical Fader */}
          <div className="mb-4">
            <SkeuomorphicFader
              orientation="vertical"
              height={180}
              value={faderVolA}
              min={0}
              max={1.2}
              trackColor="cyan"
              showScale={true}
              scaleTicks={[
                { label: '+6', value: 1.2 },
                { label: '+3', value: 1.0 },
                { label: '0', value: 0.8 },
                { label: '-3', value: 0.6 },
                { label: '-6', value: 0.4 },
                { label: '-10', value: 0.2 },
                { label: '-20', value: 0.1 },
                { label: '-∞', value: 0.0 },
              ]}
              onChange={(val) => {
                setFaderVolA(val);
                onVolumeChangeA(val);
              }}
            />
          </div>

          {/* Channel A Transport Buttons: CUE A, FX A, PLAY A */}
          <div className="flex items-center gap-3 mt-1">
            {/* CUE A */}
            <button
              onClick={onCueA}
              className="w-12 h-12 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900 border-2 border-orange-500 shadow-[0_0_12px_rgba(255,136,0,0.7)] flex items-center justify-center font-mono font-black text-[10px] text-orange-400 active:scale-95 cursor-pointer"
            >
              CUE A
            </button>

            {/* FX A */}
            <button className="w-12 h-12 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900 border-2 border-purple-500 shadow-[0_0_12px_rgba(191,90,242,0.7)] flex items-center justify-center font-mono font-black text-[10px] text-purple-400 active:scale-95 cursor-pointer">
              FX A
            </button>

            {/* PLAY A */}
            <button
              onClick={onPlayPauseA}
              className="w-12 h-12 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900 border-2 border-emerald-500 shadow-[0_0_15px_rgba(0,255,102,0.8)] flex flex-col items-center justify-center font-mono font-black text-[9px] text-emerald-400 active:scale-95 cursor-pointer"
            >
              {telemetryA.isPlaying ? (
                <Pause className="w-4 h-4 fill-current mb-0.5" />
              ) : (
                <Play className="w-4 h-4 fill-current mb-0.5 ml-0.5" />
              )}
              <span>PLAY A</span>
            </button>
          </div>
        </div>

        {/* MASTER SECTION (Center Column) */}
        <div className="flex flex-col items-center justify-between h-full p-3 rounded-lg bg-[#0a0c10] border border-neutral-800 shadow-inner">
          <span className="text-xs font-mono font-black text-neutral-300 tracking-widest uppercase mb-1">
            MASTER FILTER
          </span>

          {/* Giant MASTER FILTER Knob */}
          <div className="my-2 flex flex-col items-center">
            <SkeuomorphicKnob
              label=""
              value={masterFilter}
              min={-100}
              max={100}
              size="xl"
              color={masterFilter < 0 ? 'cyan' : masterFilter > 0 ? 'red' : 'white'}
              arcType="bi"
              displayValue={masterFilter === 0 ? 'OPEN' : masterFilter < 0 ? `LPF ${Math.abs(Math.round(masterFilter))}%` : `HPF ${Math.round(masterFilter)}%`}
              onChange={setMasterFilter}
            />
            <div className="flex items-center justify-between w-36 px-1 text-[9px] font-mono font-bold mt-1">
              <span className="text-cyan-400">LPF</span>
              <span className="text-neutral-400">OPEN</span>
              <span className="text-red-400">HPF</span>
            </div>
          </div>

          {/* Dual Stereo LED VU Meters */}
          <div className="my-2">
            <SkeuomorphicMeter
              levelL={telemetryA.isPlaying ? 0.72 : 0.05}
              levelR={telemetryB.isPlaying ? 0.68 : 0.05}
              label="MASTER"
            />
          </div>

          {/* MASTER FX Section */}
          <div className="w-full flex flex-col items-center p-2 rounded bg-[#07090c] border border-neutral-800 mt-2">
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-2">
              MASTER FX
            </span>

            {/* 3 FX buttons: FLANGER, PHASER, CUT */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setMasterFxType('flanger')}
                className={`px-2.5 py-1 text-[9px] font-mono font-black rounded border transition-all cursor-pointer ${
                  masterFxType === 'flanger'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.7)]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                }`}
              >
                FLANGER
              </button>

              <button
                onClick={() => setMasterFxType('phaser')}
                className={`px-2.5 py-1 text-[9px] font-mono font-black rounded border transition-all cursor-pointer ${
                  masterFxType === 'phaser'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(191,90,242,0.7)]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                }`}
              >
                PHASER
              </button>

              <button
                onClick={() => setMasterFxType('cut')}
                className={`px-2.5 py-1 text-[9px] font-mono font-black rounded border transition-all cursor-pointer ${
                  masterFxType === 'cut'
                    ? 'bg-orange-950/80 border-orange-500 text-orange-300 shadow-[0_0_8px_rgba(255,136,0,0.7)]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                }`}
              >
                CUT
              </button>
            </div>

            {/* AMOUNT Knob */}
            <SkeuomorphicKnob
              label="AMOUNT"
              value={masterFxAmount}
              min={0}
              max={100}
              size="sm"
              color="orange"
              unit="%"
              onChange={setMasterFxAmount}
            />
          </div>
        </div>

        {/* CHANNEL B (Right) */}
        <div className="flex flex-col items-center p-3 rounded-lg bg-[#0a0c10] border border-red-950/60 shadow-inner">
          <span className="text-xs font-mono font-black text-red-400 tracking-widest uppercase mb-3 drop-shadow-[0_0_8px_rgba(255,51,68,0.7)]">
            CHANNEL B
          </span>

          {/* EQ Knobs */}
          <div className="flex flex-col items-center gap-2 mb-4">
            <SkeuomorphicKnob
              label="GAIN"
              value={gainB}
              min={-12}
              max={12}
              size="sm"
              color="white"
              arcType="bi"
              unit="dB"
              onChange={setGainB}
            />
            <SkeuomorphicKnob
              label="HIGH"
              value={highB}
              min={-24}
              max={12}
              size="sm"
              color="white"
              arcType="bi"
              unit="dB"
              onChange={(v) => {
                setHighB(v);
                onEqChangeB(lowB, midB, v);
              }}
            />
            <SkeuomorphicKnob
              label="MID"
              value={midB}
              min={-24}
              max={12}
              size="sm"
              color="white"
              arcType="bi"
              unit="dB"
              onChange={(v) => {
                setMidB(v);
                onEqChangeB(lowB, v, highB);
              }}
            />
            <SkeuomorphicKnob
              label="LOW"
              value={lowB}
              min={-24}
              max={12}
              size="sm"
              color="white"
              arcType="bi"
              unit="dB"
              onChange={(v) => {
                setLowB(v);
                onEqChangeB(v, midB, highB);
              }}
            />
            <SkeuomorphicKnob
              label="FILTER"
              sublabel="LPF / HPF"
              value={filterB}
              min={-100}
              max={100}
              size="md"
              color="red"
              arcType="bi"
              onChange={(v) => {
                setFilterB(v);
                onFilterChangeB(v);
              }}
            />
          </div>

          {/* Channel B Vertical Fader */}
          <div className="mb-4">
            <SkeuomorphicFader
              orientation="vertical"
              height={180}
              value={faderVolB}
              min={0}
              max={1.2}
              trackColor="red"
              showScale={true}
              scaleTicks={[
                { label: '+6', value: 1.2 },
                { label: '+3', value: 1.0 },
                { label: '0', value: 0.8 },
                { label: '-3', value: 0.6 },
                { label: '-6', value: 0.4 },
                { label: '-10', value: 0.2 },
                { label: '-20', value: 0.1 },
                { label: '-∞', value: 0.0 },
              ]}
              onChange={(val) => {
                setFaderVolB(val);
                onVolumeChangeB(val);
              }}
            />
          </div>

          {/* Channel B Transport Buttons: CUE B, FX B, PLAY B */}
          <div className="flex items-center gap-3 mt-1">
            {/* CUE B */}
            <button
              onClick={onCueB}
              className="w-12 h-12 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900 border-2 border-orange-500 shadow-[0_0_12px_rgba(255,136,0,0.7)] flex items-center justify-center font-mono font-black text-[10px] text-orange-400 active:scale-95 cursor-pointer"
            >
              CUE B
            </button>

            {/* FX B */}
            <button className="w-12 h-12 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900 border-2 border-purple-500 shadow-[0_0_12px_rgba(191,90,242,0.7)] flex items-center justify-center font-mono font-black text-[10px] text-purple-400 active:scale-95 cursor-pointer">
              FX B
            </button>

            {/* PLAY B */}
            <button
              onClick={onPlayPauseB}
              className="w-12 h-12 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900 border-2 border-emerald-500 shadow-[0_0_15px_rgba(0,255,102,0.8)] flex flex-col items-center justify-center font-mono font-black text-[9px] text-emerald-400 active:scale-95 cursor-pointer"
            >
              {telemetryB.isPlaying ? (
                <Pause className="w-4 h-4 fill-current mb-0.5" />
              ) : (
                <Play className="w-4 h-4 fill-current mb-0.5 ml-0.5" />
              )}
              <span>PLAY B</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Crossfader with A & B markers */}
      <div className="flex items-center justify-center gap-4 mt-6 px-4 py-2 bg-[#090b0e] rounded-lg border border-neutral-800 shadow-inner">
        <span className="text-sm font-black font-mono text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]">
          A
        </span>

        <SkeuomorphicFader
          orientation="horizontal"
          width={320}
          value={crossfader}
          min={-1}
          max={1}
          trackColor="silver"
          capSize="md"
          onChange={onCrossfaderChange}
        />

        <span className="text-sm font-black font-mono text-red-500 drop-shadow-[0_0_6px_rgba(255,51,68,0.8)]">
          B
        </span>
      </div>
    </div>
  );
};
