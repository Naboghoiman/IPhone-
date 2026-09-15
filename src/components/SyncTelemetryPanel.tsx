import { useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, ArrowRight, Clock, Sliders, ShieldCheck, Gauge, RefreshCw } from 'lucide-react';
import { Vdj8StyleLaunchPlan } from '../audio/vdj8StyleSyncEngine';
import { MasavuPhaseTelemetry } from '../audio/masavuPhaseController';
import { DeckTelemetry } from '../types/dj';

interface SyncTelemetryPanelProps {
  lastPlan: Vdj8StyleLaunchPlan | null;
  masterTelemetry: DeckTelemetry;
  slaveTelemetry: DeckTelemetry;
  phaseErrorMs: number;
  phaseTelemetry?: MasavuPhaseTelemetry | null;
  quantizeMode: 'beat' | 'bar';
  onQuantizeModeChange: (mode: 'beat' | 'bar') => void;
  onTriggerVdj8Sync: () => void;
  onTriggerLegacySync: () => void;
}

export function SyncTelemetryPanel({
  lastPlan,
  masterTelemetry,
  slaveTelemetry,
  phaseErrorMs,
  phaseTelemetry,
  quantizeMode,
  onQuantizeModeChange,
  onTriggerVdj8Sync,
  onTriggerLegacySync
}: SyncTelemetryPanelProps) {
  const [showArchitectureGuide, setShowArchitectureGuide] = useState(false);

  const displayErrorMs = phaseTelemetry ? phaseTelemetry.phaseErrorMs : phaseErrorMs;
  const absErrorMs = Math.abs(displayErrorMs);
  const syncState = phaseTelemetry?.syncState ?? (absErrorMs <= 10 ? 'LOCKED' : 'ACQUIRING');

  const stateColors: Record<string, { bg: string; text: string; border: string }> = {
    LOCKED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    CORRECTING: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    REANCHOR_PENDING: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
    REANCHORING: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    ACQUIRING: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' }
  };

  const currentTheme = stateColors[syncState] || stateColors.LOCKED;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 mb-4">
      {/* Header with status badges and test buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wide text-slate-100 flex items-center gap-2">
              MASAVU VDJ-8 CLEAN-ROOM SYNC ENGINE
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              0.5x/1x/2x Tempo Family Matching • Transient Kick Snapping • Stable Multiplier Lock
            </p>
          </div>
        </div>

        {/* Action buttons: Fixed VDJ-8 vs Defective Legacy comparison */}
        <div className="flex items-center gap-2">
          <button
            id="trigger-vdj8-sync-btn"
            onClick={onTriggerVdj8Sync}
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-cyan-950/50 flex items-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
            Launch VDJ-8 Sync (Fixed)
          </button>

          <button
            id="trigger-legacy-sync-btn"
            onClick={onTriggerLegacySync}
            title="Demonstrate the old MASAVU defect where slave started from arbitrary read-head"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-800/40 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Test Legacy Defect (Old)
          </button>

          <button
            onClick={() => setShowArchitectureGuide(!showArchitectureGuide)}
            className="px-2.5 py-1.5 bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs"
          >
            {showArchitectureGuide ? 'Hide Specs' : 'View Specs'}
          </button>
        </div>
      </div>

      {/* 4-Metric Highlight Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3">
        {/* Metric 1: Tempo Family Match */}
        <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Tempo Family Match
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-mono font-black text-cyan-400">
              {lastPlan ? `${lastPlan.familyFactor}x` : '1.0x'}
            </span>
            <span className="text-xs font-mono text-slate-300">
              {lastPlan ? `${lastPlan.equivalentSlaveBpm.toFixed(1)} Eq. BPM` : 'Ready'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
            {lastPlan
              ? `Multiplier: ${lastPlan.baseTempoMultiplier.toFixed(4)}x`
              : 'Evaluates 0.5x / 1x / 2x'}
          </div>
        </div>

        {/* Metric 2: Kick & Groove Rhythmic Alignment */}
        <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Rhythmic Groove</span>
            {lastPlan?.grooveMatch && (
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  lastPlan.grooveMatch.appliedMode === 'groove'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : lastPlan.grooveMatch.appliedMode === 'kick-snap'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {lastPlan.grooveMatch.appliedMode === 'groove'
                  ? 'GROOVE MATCH'
                  : lastPlan.grooveMatch.appliedMode === 'kick-snap'
                  ? 'KICK-SNAP'
                  : 'GRID'}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl font-mono font-black ${
                lastPlan?.grooveMatch?.appliedMode === 'groove'
                  ? 'text-purple-400'
                  : lastPlan?.kickSnapped
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {lastPlan?.grooveMatch?.appliedMode === 'groove'
                ? `${lastPlan.desiredGrooveOffsetMs && lastPlan.desiredGrooveOffsetMs > 0 ? '+' : ''}${(lastPlan.desiredGrooveOffsetMs ?? 0).toFixed(1)}ms`
                : lastPlan?.kickSnapped
                ? 'SNAPPED'
                : 'GRID ONLY'}
            </span>
            {lastPlan?.grooveMatch && lastPlan.grooveMatch.appliedMode === 'groove' && (
              <span className="text-xs font-mono text-purple-300">
                {(lastPlan.grooveMatch.confidence * 100).toFixed(0)}% Conf
              </span>
            )}
            {lastPlan?.kickSnapped && lastPlan.grooveMatch?.appliedMode !== 'groove' && (
              <span className="text-xs font-mono text-emerald-300">
                {lastPlan.kickOffsetMs > 0 ? `+` : ''}
                {lastPlan.kickOffsetMs.toFixed(1)}ms
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
            {lastPlan?.grooveMatch?.appliedMode === 'groove'
              ? `${lastPlan.grooveMatch.matchedKickCount} kicks matched over 1-2 bars`
              : lastPlan?.kickSnapped
              ? 'Audible kick hits master beat'
              : 'Searches 18% beat window'}
          </div>
        </div>

        {/* Metric 3: Beat/Bar Alignment */}
        <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Phase Target</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onQuantizeModeChange('beat')}
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  quantizeMode === 'beat' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                }`}
              >
                BEAT
              </button>
              <button
                onClick={() => onQuantizeModeChange('bar')}
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  quantizeMode === 'bar' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                }`}
              >
                BAR
              </button>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-mono font-black text-slate-100">
              M:{lastPlan ? `B${lastPlan.masterBeatNumber}` : '—'} → S:{lastPlan ? `B${lastPlan.slaveBeatNumber}` : '—'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
            {lastPlan?.slaveIsDownbeat ? 'Downbeat 1.1 locked' : 'Bar position matched'}
          </div>
        </div>

        {/* Metric 4: MASAVU Phase Controller Supervisor */}
        <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Phase Controller</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border}`}
            >
              {syncState}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl font-mono font-black ${
                absErrorMs <= 10.0
                  ? 'text-emerald-400'
                  : absErrorMs <= 35.0
                  ? 'text-cyan-400'
                  : absErrorMs <= 80.0
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {Number.isFinite(displayErrorMs) ? `${displayErrorMs > 0 ? '+' : ''}${displayErrorMs.toFixed(1)} ms` : '0.0 ms'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {phaseTelemetry ? `${phaseTelemetry.phaseErrorDegrees > 0 ? '+' : ''}${phaseTelemetry.phaseErrorDegrees.toFixed(1)}°` : '0.0°'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
            {absErrorMs <= 10.0
              ? 'PLL 1.000000 • In Deadband'
              : phaseTelemetry && phaseTelemetry.numberOfPersistentBadBeats >= 2
              ? `Correction: ${phaseTelemetry.temporaryCorrectionPercent > 0 ? '+' : ''}${phaseTelemetry.temporaryCorrectionPercent.toFixed(2)}%`
              : `Waiting (Beat ${phaseTelemetry?.numberOfPersistentBadBeats ?? 0}/2)`}
          </div>
        </div>
      </div>

      {/* MASAVU Synchronization Phase Controller Telemetry Dashboard */}
      {phaseTelemetry && (
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-2.5 mb-3 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-400 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Master BPM: <strong className="text-cyan-300 ml-1">{phaseTelemetry.masterBpm.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                Slave Eff. BPM: <strong className="text-amber-300 ml-1">{phaseTelemetry.slaveEffectiveBpm.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                Base Multiplier: <strong className="text-slate-200 ml-1">{phaseTelemetry.baseTempoMultiplier.toFixed(4)}x</strong>
              </span>
              {phaseTelemetry.desiredGrooveOffsetMs !== undefined && Math.abs(phaseTelemetry.desiredGrooveOffsetMs) > 0.1 && (
                <span className="text-purple-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                  Groove Offset Target: <strong className="text-purple-200 ml-0.5">{phaseTelemetry.desiredGrooveOffsetMs > 0 ? '+' : ''}{phaseTelemetry.desiredGrooveOffsetMs.toFixed(1)}ms</strong>
                  {phaseTelemetry.gridPhaseErrorMs !== undefined && (
                    <span className="text-slate-500 text-[10px] ml-1">
                      (Grid: {phaseTelemetry.gridPhaseErrorMs > 0 ? '+' : ''}{phaseTelemetry.gridPhaseErrorMs.toFixed(1)}ms)
                    </span>
                  )}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-400">
                Temp. Rate Correction:{' '}
                <strong
                  className={
                    phaseTelemetry.temporaryCorrectionPercent !== 0
                      ? 'text-amber-400 ml-1 font-bold'
                      : 'text-emerald-400 ml-1 font-bold'
                  }
                >
                  {phaseTelemetry.temporaryCorrectionPercent > 0 ? '+' : ''}
                  {phaseTelemetry.temporaryCorrectionPercent.toFixed(2)}%
                </strong>
              </span>
              <span className="text-slate-400">
                Bad Beats: <strong className="text-slate-200 ml-1">{phaseTelemetry.numberOfPersistentBadBeats}</strong>
              </span>
              <span className="text-slate-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-purple-400" />
                Re-Anchors: <strong className="text-purple-300 ml-1">{phaseTelemetry.reanchorCount}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Plan Details Strip */}
      {lastPlan && (
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                AudioContext Clock Target:
                <strong className="text-slate-200 ml-1">{lastPlan.targetOutputTime.toFixed(3)}s</strong>
              </span>
              <span className="text-slate-400">
                Source Sample: <strong className="text-slate-200">{lastPlan.slaveSourceSample.toLocaleString()}</strong>
              </span>
              {lastPlan.grooveMatch && (
                <span className="text-purple-300">
                  Mode: <strong className="text-purple-200 uppercase">{lastPlan.grooveMatch.appliedMode}</strong> ({lastPlan.grooveMatch.matchedKickCount} kicks, avg err {lastPlan.grooveMatch.averageKickErrorMs.toFixed(1)}ms)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                Master Beat Idx: <strong className="text-cyan-400">{lastPlan.targetMasterBeatIndex}</strong>
              </span>
              <span className="text-slate-400">
                Slave Beat Idx: <strong className="text-amber-400">{lastPlan.targetSlaveBeatIndex}</strong>
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Tempo Lock Engaged
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Specifications & Technical Guide (Collapsible) */}
      {showArchitectureGuide && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-2 bg-slate-950/60 p-3 rounded-lg">
          <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            MASAVU Rhythmic Groove Matcher & Clean-Room Synchronization Principles
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 font-mono text-[11px]">
            <li><strong className="text-slate-200">Beat Grid as Structural Clock:</strong> BPM, bars, downbeats, and tempo family reference remain completely unchanged. The beat grid is never warped to individual kicks.</li>
            <li><strong className="text-slate-200">Groove Map Extraction:</strong> For every beat, detects significant transients/kicks, computing precise timing offsets (offsetFromBeatMs, strength, confidence).</li>
            <li><strong className="text-slate-200">Musical Window Analysis:</strong> Evaluates 1-2 musical bars (up to 8 beats). Never relies on only one transient.</li>
            <li><strong className="text-slate-200">Gaussian Similarity Scoring:</strong> Evaluates candidate slave alignments against master kicks using timingError and similarity = exp(-(timingError^2) / sigma^2).</li>
            <li><strong className="text-slate-200">Source Positioning Layer:</strong> Supplies slaveSourceSample directly into the existing MASAVU scheduled-start engine without starting audio itself.</li>
            <li><strong className="text-slate-200">Zero Micro-Warping:</strong> Preserves natural swing, syncopation, and human timing. No individual kicks are time-bent.</li>
            <li><strong className="text-slate-200">Confidence-Based Fallback:</strong> High (&ge;0.65) &rarr; Groove Match; Medium (0.35–0.65) &rarr; Kick Snapping; Low (&lt;0.35) &rarr; Structural Beat Grid.</li>
            <li><strong className="text-slate-200">Phase Controller Groove Lock:</strong> Phase controller maintains actualRhythmicOffset &asymp; desiredGrooveOffsetMs inside the 10ms deadband (PLL 1.000000).</li>
          </ol>
        </div>
      )}
    </div>
  );
}
