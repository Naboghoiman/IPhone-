import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DeckTelemetry, TrackData } from '../types/dj';
import { ZoomIn, ZoomOut, Maximize2, ShieldCheck, AlertCircle, Zap } from 'lucide-react';

interface StackedWaveformsProps {
  trackA: TrackData | null;
  trackB: TrackData | null;
  telemetryA: DeckTelemetry;
  telemetryB: DeckTelemetry;
  masterDeckId: 'A' | 'B';
  phaseErrorMs: number;
  kickSnappedSampleA?: number | null;
  kickSnappedSampleB?: number | null;
  onSeekA: (sample: number) => void;
  onSeekB: (sample: number) => void;
  onMatchTempo?: () => void;
}

export function StackedWaveforms({
  trackA,
  trackB,
  telemetryA,
  telemetryB,
  masterDeckId,
  phaseErrorMs,
  kickSnappedSampleA,
  kickSnappedSampleB,
  onSeekA,
  onSeekB,
  onMatchTempo
}: StackedWaveformsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Zoom level: number of visible beats across the screen (e.g. 4, 8, 16, 32)
  const [visibleBeats, setVisibleBeats] = useState<number>(8);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [canvasWidth, setCanvasWidth] = useState<number>(1000);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth - 28;
        if (w > 250) {
          setCanvasWidth(Math.floor(w));
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const absPhaseError = Math.abs(phaseErrorMs);
  const isLocked = absPhaseError < 5;
  const isFlamming = absPhaseError >= 25;

  // Handle canvas click / drag scrub
  const handleCanvasInteraction = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const isDeckA = clientY < (rect.height / 2);
    const track = isDeckA ? trackA : trackB;
    const telemetry = isDeckA ? telemetryA : telemetryB;
    const onSeek = isDeckA ? onSeekA : onSeekB;

    if (!track || !track.audioBuffer) return;

    const currentSample = telemetry.currentSourceSample;
    const samplesPerBeat = track.beatGrid.samplesPerBeat || 22050;
    const visibleSamples = samplesPerBeat * visibleBeats;
    const startSample = currentSample - visibleSamples * 0.5;

    // Clicked sample using normalized CSS rect width
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const targetSample = Math.round(startSample + ratio * visibleSamples);
    const clampedSample = Math.max(0, Math.min(track.audioBuffer.length - 1, targetSample));
    onSeek(clampedSample);
  }, [trackA, trackB, telemetryA, telemetryB, visibleBeats, onSeekA, onSeekB]);

  // Main Render Loop for Stacked Dual Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const width = canvas.width;
    const height = canvas.height;
    const laneHeight = height / 2;
    const playheadX = width * 0.5; // EXACT CENTER PLAYHEAD FOR BOTH WAVES

    ctx.clearRect(0, 0, width, height);

    // Dark high-tech background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Render single deck lane helper
    const renderDeckLane = (
      deckId: 'A' | 'B',
      track: TrackData | null,
      telemetry: DeckTelemetry,
      laneY: number,
      waveColor: string,
      waveSecondaryColor: string,
      kickSnappedSample?: number | null
    ) => {
      const centerY = laneY + laneHeight / 2;

      // Lane background subtle tint
      ctx.fillStyle = deckId === 'A' ? 'rgba(6, 182, 212, 0.03)' : 'rgba(245, 158, 11, 0.03)';
      ctx.fillRect(0, laneY, width, laneHeight);

      // Lane separator lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, laneY);
      ctx.lineTo(width, laneY);
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      if (!track || !track.audioBuffer) {
        ctx.fillStyle = '#475569';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`DECK ${deckId}: No audio track loaded`, width / 2, centerY + 4);
        return;
      }

      const buffer = track.audioBuffer;
      const channelData = buffer.getChannelData(0);
      const totalSamples = channelData.length;
      const currentSample = telemetry.currentSourceSample;

      const samplesPerBeat = track.beatGrid.samplesPerBeat || 22050;
      const visibleSamples = samplesPerBeat * visibleBeats;
      const startSample = currentSample - visibleSamples * 0.5;
      const endSample = currentSample + visibleSamples * 0.5;

      // 1. Draw Beatgrid Lines
      if (track.beatGrid && track.beatGrid.beatSamples) {
        const beatsPerBar = track.beatGrid.beatsPerBar || 4;

        for (let i = 0; i < track.beatGrid.beatSamples.length; i++) {
          const beatSample = track.beatGrid.beatSamples[i];
          if (beatSample >= startSample && beatSample <= endSample) {
            const x = ((beatSample - startSample) / visibleSamples) * width;
            const isDownbeat = (i % beatsPerBar) === 0;

            ctx.strokeStyle = isDownbeat ? 'rgba(239, 68, 68, 0.85)' : 'rgba(148, 163, 184, 0.3)';
            ctx.lineWidth = isDownbeat ? 2 : 1;
            if (!isDownbeat) ctx.setLineDash([2, 3]);

            ctx.beginPath();
            ctx.moveTo(x, laneY + 2);
            ctx.lineTo(x, laneY + laneHeight - 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Beat label (e.g. 1.1, 1.2, 1.3, 1.4)
            ctx.font = isDownbeat ? 'bold 9px monospace' : '8px monospace';
            ctx.fillStyle = isDownbeat ? '#ef4444' : '#64748b';
            ctx.textAlign = 'left';
            const barIndex = Math.floor(i / beatsPerBar) + 1;
            const beatInBar = (i % beatsPerBar) + 1;
            ctx.fillText(`${barIndex}.${beatInBar}`, x + 3, laneY + 11);
          }
        }
      }

      // 2. Draw Transient Kick Attack Markers
      if (track.warpMap?.transientMarkers) {
        ctx.fillStyle = '#fbbf24';
        for (const markerSample of track.warpMap.transientMarkers) {
          if (markerSample >= startSample && markerSample <= endSample) {
            const x = ((markerSample - startSample) / visibleSamples) * width;
            ctx.beginPath();
            // Diamond kick marker
            ctx.moveTo(x, laneY + laneHeight - 6);
            ctx.lineTo(x + 3, laneY + laneHeight - 3);
            ctx.lineTo(x, laneY + laneHeight);
            ctx.lineTo(x - 3, laneY + laneHeight - 3);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // 3. Draw Kick Snapped indicator if present
      if (kickSnappedSample != null && kickSnappedSample >= startSample && kickSnappedSample <= endSample) {
        const x = ((kickSnappedSample - startSample) / visibleSamples) * width;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, laneY);
        ctx.lineTo(x, laneY + laneHeight);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('SNAP KICK', x + 3, laneY + 22);
      }

      // 4. Draw Audio Waveform Peaks
      const step = Math.max(1, Math.floor(visibleSamples / width));
      const maxWaveHeight = (laneHeight / 2) - 4;

      ctx.lineWidth = 1.5;
      for (let x = 0; x < width; x++) {
        const sampleIndex = Math.floor(startSample + (x / width) * visibleSamples);
        if (sampleIndex >= 0 && sampleIndex < totalSamples) {
          let maxVal = 0;
          for (let s = 0; s < step && sampleIndex + s < totalSamples; s++) {
            const val = Math.abs(channelData[sampleIndex + s]);
            if (val > maxVal) maxVal = val;
          }

          const barHeight = Math.min(maxWaveHeight, maxVal * maxWaveHeight * 1.05);

          // Color gradient from center to peaks
          ctx.strokeStyle = maxVal > 0.65 ? waveSecondaryColor : waveColor;
          ctx.beginPath();
          ctx.moveTo(x, centerY - barHeight);
          ctx.lineTo(x, centerY + barHeight);
          ctx.stroke();
        }
      }

      // 5. Cue Marker Indicator
      if (telemetry.cueSample >= startSample && telemetry.cueSample <= endSample) {
        const cueX = ((telemetry.cueSample - startSample) / visibleSamples) * width;
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(cueX, laneY + laneHeight - 12);
        ctx.lineTo(cueX + 5, laneY + laneHeight);
        ctx.lineTo(cueX - 5, laneY + laneHeight);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('C', cueX, laneY + laneHeight - 2);
      }

      // 6. Deck Lane Info Badge (Floating in top-left)
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(8, laneY + 6, 175, 22);
      ctx.strokeStyle = deckId === 'A' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(245, 158, 11, 0.4)';
      ctx.strokeRect(8, laneY + 6, 175, 22);

      ctx.fillStyle = deckId === 'A' ? '#38bdf8' : '#fbbf24';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`DECK ${deckId}`, 14, laneY + 21);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${telemetry.effectiveBpm.toFixed(1)} BPM`, 65, laneY + 21);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`BAR ${telemetry.currentBarIndex + 1}.${telemetry.currentBeatInBar + 1}`, 125, laneY + 21);
    };

    // Render TOP LANE: Deck A (Cyan)
    renderDeckLane(
      'A',
      trackA,
      telemetryA,
      0,
      '#06b6d4',
      '#38bdf8',
      kickSnappedSampleA
    );

    // Render BOTTOM LANE: Deck B (Amber)
    renderDeckLane(
      'B',
      trackB,
      telemetryB,
      laneHeight,
      '#f59e0b',
      '#fbbf24',
      kickSnappedSampleB
    );

    // 7. DRAW CONTINUOUS SHARED CENTER PLAYHEAD (Extends through Deck A and Deck B)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Top Playhead Arrow for Deck A
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 9);
    ctx.closePath();
    ctx.fill();

    // Bottom Playhead Arrow for Deck B
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, height);
    ctx.lineTo(playheadX + 6, height);
    ctx.lineTo(playheadX, height - 9);
    ctx.closePath();
    ctx.fill();

    // Center Junction Alignment Badge (Exact middle between Deck A and Deck B)
    const junctionY = laneHeight;
    const junctionWidth = 100;
    const junctionHeight = 18;

    ctx.fillStyle = isLocked
      ? 'rgba(16, 185, 129, 0.95)'
      : isFlamming
      ? 'rgba(239, 68, 68, 0.95)'
      : 'rgba(245, 158, 11, 0.95)';
    ctx.fillRect(playheadX - junctionWidth / 2, junctionY - junctionHeight / 2, junctionWidth, junctionHeight);

    ctx.fillStyle = '#020617';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isLocked
        ? '★ PHASE LOCK'
        : `DRIFT ${phaseErrorMs > 0 ? '+' : ''}${phaseErrorMs.toFixed(1)}ms`,
      playheadX,
      junctionY + 3.5
    );
  }, [trackA, trackB, telemetryA, telemetryB, visibleBeats, masterDeckId, phaseErrorMs, kickSnappedSampleA, kickSnappedSampleB, canvasWidth]);

  return (
    <div
      ref={containerRef}
      id="stacked-horizontal-waveforms-panel"
      className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl text-slate-100 mb-4"
    >
      {/* Waveform Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span className="text-xs font-mono font-bold text-cyan-300">DECK A (TOP)</span>
          </div>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-xs font-mono font-bold text-amber-300">DECK B (BOTTOM)</span>
          </div>

          {/* Deck BPM Readouts */}
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono ml-3 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
            <span className="text-cyan-400 font-bold">{telemetryA.effectiveBpm.toFixed(1)} BPM</span>
            <span className="text-slate-600">vs</span>
            <span className="text-amber-400 font-bold">{telemetryB.effectiveBpm.toFixed(1)} BPM</span>
          </div>

          {/* Match Tempo Button if different speeds */}
          {Math.abs(telemetryA.effectiveBpm - telemetryB.effectiveBpm) > 0.09 && onMatchTempo && (
            <button
              onClick={onMatchTempo}
              title="Instantly lock Deck B tempo family to Deck A so both songs move at the exact same beat speed"
              className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-1 shadow-sm"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              LOCK SAME SPEED
            </button>
          )}
        </div>

        {/* Status Badge and Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Phase Lock status badge */}
          <div className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            {isLocked ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className={isLocked ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
              {isLocked ? 'TRANSIENTS ALIGNED' : `${phaseErrorMs > 0 ? '+' : ''}${phaseErrorMs.toFixed(1)}ms OFFSET`}
            </span>
          </div>

          {/* Zoom Level buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setVisibleBeats((b) => Math.min(32, b * 2))}
              title="Zoom Out (Show More Beats)"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-slate-300">
              {visibleBeats} BEATS
            </span>
            <button
              onClick={() => setVisibleBeats((b) => Math.max(4, b / 2))}
              title="Zoom In (High Precision Transient Inspection)"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Stacked Dual-Lane Canvas Container */}
      <div
        className="relative w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950 cursor-crosshair shadow-inner"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={200}
          onClick={handleCanvasInteraction}
          className="w-full h-48 block"
        />

        {/* Hover Cue / Instruction Overlay */}
        {isHovered && (
          <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-slate-900/90 text-slate-400 px-2 py-1 rounded border border-slate-800 pointer-events-none">
            Click top half to scrub Deck A • Click bottom half to scrub Deck B
          </div>
        )}
      </div>

      {/* Visual Alignment Legend */}
      <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 mt-2 px-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Downbeat (1.1, 2.1)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Kick Transient Attack
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Snapped Kick Target
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Maximize2 className="w-3 h-3" />
          Both tracks align on the center vertical playhead line
        </div>
      </div>
    </div>
  );
}
