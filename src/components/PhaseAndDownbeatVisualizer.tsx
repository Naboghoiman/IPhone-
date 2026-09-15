import { useState } from 'react';
import { Target, Compass, Sparkles, AlertCircle, CheckCircle, RefreshCw, Zap, ArrowLeftRight, HelpCircle } from 'lucide-react';
import { DeckTelemetry } from '../types/dj';
import { DownbeatPhaseTelemetry } from '../audio/vdj8StyleSyncEngine';

interface PhaseAndDownbeatVisualizerProps {
  masterDeckId: 'A' | 'B';
  telemetryA: DeckTelemetry;
  telemetryB: DeckTelemetry;
  phaseErrorMs: number;
  downbeatPhase: DownbeatPhaseTelemetry;
  onApplySoftPhaseCorrection: () => void;
  onForceDownbeatAlignment: () => void;
  onInjectDrift: (offsetMs: number) => void;
  onHardReanchor: () => void;
  quantizeMode: 'beat' | 'bar';
  onSetQuantizeMode: (mode: 'beat' | 'bar') => void;
}

export function PhaseAndDownbeatVisualizer({
  masterDeckId,
  telemetryA,
  telemetryB,
  phaseErrorMs,
  downbeatPhase,
  onApplySoftPhaseCorrection,
  onForceDownbeatAlignment,
  onInjectDrift,
  onHardReanchor,
  quantizeMode,
  onSetQuantizeMode
}: PhaseAndDownbeatVisualizerProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  const masterTel = masterDeckId === 'A' ? telemetryA : telemetryB;
  const slaveTel = masterDeckId === 'A' ? telemetryB : telemetryA;
  const slaveId = masterDeckId === 'A' ? 'B' : 'A';

  const absPhaseError = Math.abs(phaseErrorMs);
  const isLocked = absPhaseError < 5;
  const isSlightDrift = absPhaseError >= 5 && absPhaseError < 25;
  const isFlamming = absPhaseError >= 25 && absPhaseError < 45;
  const isGrossError = absPhaseError >= 45;

  // Scale phase error to percentage for the visual meter: range -80ms to +80ms mapped to 0% to 100%
  const meterCenterPercent = 50;
  const maxMeterMs = 80;
  const clampedError = Math.max(-maxMeterMs, Math.min(maxMeterMs, phaseErrorMs));
  const slaveIndicatorPercent = meterCenterPercent + (clampedError / maxMeterMs) * 45;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 my-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-wide text-slate-100 flex items-center gap-2">
              PRECISION PHASE CORRECTION & DOWNBEAT ALIGNMENT
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isLocked && downbeatPhase.isDownbeatMatched
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {isLocked && downbeatPhase.isDownbeatMatched ? 'PERFECT LOCK' : 'DRIFT / OFFSET'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Two distinct layers: Sub-beat Micro-Phase (<span className="text-cyan-400 font-mono">ms</span>) vs. Musical Bar Downbeat (<span className="text-amber-400 font-mono">Beat 1.1</span>)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showExplanation ? 'Hide Concept' : 'Why These Differ'}
          </button>
        </div>
      </div>

      {/* Concept Explainer Accordion */}
      {showExplanation && (
        <div className="my-3 p-3 bg-slate-950/80 border border-blue-900/50 rounded-lg text-xs space-y-2 text-slate-300 font-mono">
          <div className="font-bold text-blue-300 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-cyan-400" />
            CRITICAL DISTINCTION: Micro-Phase vs. Downbeat Alignment
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-cyan-300 font-bold block mb-1">1. Micro-Phase Correction (Sub-Beat, ms):</span>
              <p className="text-slate-400 font-sans">
                Controls the precise millisecond timing within an individual beat. If slave kick peaks 15ms after master kick, listeners hear a sloppy &quot;double kick&quot; (flamming). Phase correction uses smooth pitch nudges to steer this error to <strong>0.0 ms</strong>.
              </p>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-amber-300 font-bold block mb-1">2. Downbeat Alignment (Bar Phase, 1.1):</span>
              <p className="text-slate-400 font-sans">
                Controls which beat of the 4-beat bar (1, 2, 3, or 4) matches. Even if micro-phase is 0ms, if Deck A plays <strong>Beat 1 (Kick)</strong> while Deck B plays <strong>Beat 2 (Snare)</strong>, the tracks clash rhythmically. Downbeat alignment locks Beat 1.1 directly to Beat 1.1.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dual Section: Top = Micro-Phase Scope, Bottom = Downbeat Musical Bar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-3">
        {/* LEFT COLUMN: Micro-Phase Alignment Scope */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">1. Micro-Phase Scope (Sub-Beat)</span>
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              isLocked
                ? 'text-emerald-400 bg-emerald-500/10'
                : isGrossError
                ? 'text-rose-400 bg-rose-500/10 animate-pulse'
                : 'text-amber-400 bg-amber-500/10'
            }`}>
              {isLocked ? 'ZERO PHASE (LOCKED)' : isGrossError ? 'GROSS ERROR (>45ms)' : phaseErrorMs > 0 ? 'SLAVE LAGGING (BEHIND)' : 'SLAVE LEADING (AHEAD)'}
            </span>
          </div>

          {/* Phase Meter Hardware Trace */}
          <div className="my-2">
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1 px-1">
              <span>-80ms (Fast)</span>
              <span className="text-cyan-400 font-bold">0.0ms (IN PHASE)</span>
              <span>+80ms (Slow)</span>
            </div>

            {/* Visual Track */}
            <div className="relative w-full h-8 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-inner flex items-center">
              {/* Tolerance Zones */}
              <div className="absolute left-[45%] right-[45%] top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40 pointer-events-none"></div>
              <div className="absolute left-[35%] right-[35%] top-0 bottom-0 bg-cyan-500/10 pointer-events-none"></div>

              {/* Center Reference Mark (Master Beat) */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-cyan-400 shadow-sm shadow-cyan-400 z-10"></div>
              <div className="absolute left-1/2 -top-1 transform -translate-x-1/2 text-[8px] font-mono text-cyan-300 font-bold">
                M
              </div>

              {/* Moving Slave Beat Indicator */}
              <div
                className={`absolute top-1 bottom-1 w-2 rounded-full transform -translate-x-1/2 transition-all duration-75 shadow-md z-20 ${
                  isLocked
                    ? 'bg-emerald-400 shadow-emerald-400 ring-2 ring-emerald-300'
                    : isGrossError
                    ? 'bg-rose-500 shadow-rose-500 ring-2 ring-rose-400'
                    : 'bg-amber-400 shadow-amber-400'
                }`}
                style={{ left: `${slaveIndicatorPercent}%` }}
              >
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 text-[8px] font-mono font-bold text-amber-300">
                  {slaveId}
                </div>
              </div>
            </div>
          </div>

          {/* Micro-Phase Numerical Readouts */}
          <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80 text-center my-2">
            <div>
              <div className="text-[9px] font-mono text-slate-400">OFFSET TIME</div>
              <div className={`text-sm font-mono font-bold ${isLocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                {phaseErrorMs > 0 ? '+' : ''}{phaseErrorMs.toFixed(1)} ms
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-slate-400">TOLERANCE</div>
              <div className="text-sm font-mono font-bold text-slate-300">
                &plusmn;5.0 ms
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-slate-400">SUPERVISOR GATE</div>
              <div className={`text-sm font-mono font-bold ${isGrossError ? 'text-rose-400' : 'text-slate-400'}`}>
                {isGrossError ? 'TRIGGERED' : '< 45 ms'}
              </div>
            </div>
          </div>

          {/* Micro-Phase Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={onApplySoftPhaseCorrection}
              className="flex-1 py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-slate-950 font-bold text-xs rounded shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto Soft Nudge (0ms)
            </button>

            <button
              onClick={onHardReanchor}
              title="Performs clean-room VDJ8 transient re-anchor"
              className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded border border-slate-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Hard Re-Anchor
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onInjectDrift(-25)}
                title="Simulate slave lagging by 25ms"
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] font-mono border border-slate-700"
              >
                -25ms
              </button>
              <button
                onClick={() => onInjectDrift(25)}
                title="Simulate slave leading by 25ms"
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[10px] font-mono border border-slate-700"
              >
                +25ms
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Musical Bar Downbeat Alignment (1.1, 1.2, 1.3, 1.4) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ArrowLeftRight className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">2. Downbeat Alignment (Bar Phase)</span>
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              downbeatPhase.isDownbeatMatched
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                : 'text-amber-400 bg-amber-500/10 border border-amber-500/30 animate-pulse'
            }`}>
              {downbeatPhase.isDownbeatMatched ? 'DOWNBEATS MATCHED' : `OFF-BAR (Offset: ${downbeatPhase.downbeatOffsetBeats} Beats)`}
            </span>
          </div>

          {/* Side-by-Side 4-Beat Bar Grid Sequencer Visualizer */}
          <div className="my-1.5 space-y-2">
            {/* Master Deck Bar */}
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span className="font-bold text-cyan-300">MASTER DECK {masterDeckId} (Bar {masterTel.currentBarIndex + 1})</span>
                <span className="text-[10px]">Beat in Bar: {masterTel.currentBeatInBar + 1}/4</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((b) => {
                  const isActive = masterTel.currentBeatInBar === b && masterTel.isPlaying;
                  const isDownbeat = b === 0;
                  return (
                    <div
                      key={b}
                      className={`py-1.5 px-2 rounded text-center transition-all ${
                        isActive
                          ? isDownbeat
                            ? 'bg-red-500 text-white font-black shadow-md shadow-red-500/50 scale-105'
                            : 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/50 scale-105'
                          : isDownbeat
                          ? 'bg-red-950/40 text-red-300 border border-red-900/60 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] font-mono leading-none">
                        {isDownbeat ? 'DOWNBEAT' : `BEAT ${b + 1}`}
                      </div>
                      <div className="text-[11px] font-black">{masterTel.currentBarIndex + 1}.{b + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slave Deck Bar */}
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span className="font-bold text-amber-300">SLAVE DECK {slaveId} (Bar {slaveTel.currentBarIndex + 1})</span>
                <span className="text-[10px]">Beat in Bar: {slaveTel.currentBeatInBar + 1}/4</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((b) => {
                  const isActive = slaveTel.currentBeatInBar === b && slaveTel.isPlaying;
                  const isDownbeat = b === 0;
                  const matchesMasterDownbeat = isDownbeat && downbeatPhase.isDownbeatMatched;

                  return (
                    <div
                      key={b}
                      className={`py-1.5 px-2 rounded text-center transition-all ${
                        isActive
                          ? isDownbeat
                            ? matchesMasterDownbeat
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/50 scale-105'
                              : 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/50 scale-105'
                            : 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/50 scale-105'
                          : isDownbeat
                          ? matchesMasterDownbeat
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/60 font-bold'
                            : 'bg-amber-950/40 text-amber-300 border border-amber-900/60 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] font-mono leading-none">
                        {isDownbeat ? 'DOWNBEAT' : `BEAT ${b + 1}`}
                      </div>
                      <div className="text-[11px] font-black">{slaveTel.currentBarIndex + 1}.{b + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Downbeat Quantize Mode Selector & Force Downbeat Action */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => onSetQuantizeMode('bar')}
                className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${
                  quantizeMode === 'bar'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Forces Beat 1 to Beat 1 (eliminates 0.5x/2x ambiguity)"
              >
                BAR (DOWNBEAT)
              </button>
              <button
                onClick={() => onSetQuantizeMode('beat')}
                className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${
                  quantizeMode === 'beat'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Aligns to nearest beat (1, 2, 3, or 4)"
              >
                BEAT
              </button>
            </div>

            <button
              onClick={onForceDownbeatAlignment}
              className="flex-1 py-1.5 px-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              Force Downbeat 1.1 Match
            </button>
          </div>
        </div>
      </div>

      {/* Downbeat Summary Alert Box */}
      <div className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
        downbeatPhase.isDownbeatMatched && isLocked
          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
      }`}>
        <div className="flex items-center gap-2">
          {downbeatPhase.isDownbeatMatched && isLocked ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>
            {downbeatPhase.isDownbeatMatched
              ? 'Downbeat 1.1 Synchronized: Kick attack on Master lands simultaneously with Kick attack on Slave.'
              : `Downbeat Misaligned by ${downbeatPhase.downbeatOffsetBeats} beat(s): Master is playing Beat ${masterTel.currentBeatInBar + 1} while Slave is playing Beat ${slaveTel.currentBeatInBar + 1}. Press "Force Downbeat 1.1 Match" to align.`}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">
          Mode: {quantizeMode.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
