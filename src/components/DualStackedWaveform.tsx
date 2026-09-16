import React, { useRef, useEffect, useCallback } from 'react';
import { TrackData } from '../types/dj';
import { ZoomIn, ZoomOut, Zap } from 'lucide-react';

interface DualStackedWaveformProps {
  trackA: TrackData | null;
  trackB: TrackData | null;
  currentSampleA: number;
  currentSampleB: number;
  isPlayingA: boolean;
  isPlayingB: boolean;
  onSeekA: (sample: number) => void;
  onSeekB: (sample: number) => void;
}

export const DualStackedWaveform: React.FC<DualStackedWaveformProps> = ({
  trackA,
  trackB,
  currentSampleA,
  currentSampleB,
  isPlayingA,
  isPlayingB,
  onSeekA,
  onSeekB,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visibleBeats, setVisibleBeats] = React.useState<number>(8);

  // Resize canvas according to container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width * window.devicePixelRatio;
        canvasRef.current.height = 140 * window.devicePixelRatio;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle click to seek
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const isDeckA = clickY < rect.height / 2;
      const track = isDeckA ? trackA : trackB;
      const currentSample = isDeckA ? currentSampleA : currentSampleB;
      const onSeek = isDeckA ? onSeekA : onSeekB;

      if (!track || !track.audioBuffer) return;

      const samplesPerBeat = track.beatGrid.samplesPerBeat || 22050;
      const visibleSamples = samplesPerBeat * visibleBeats;
      const startSample = currentSample - visibleSamples * 0.5;

      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetSample = Math.round(startSample + ratio * visibleSamples);
      const clampedSample = Math.max(0, Math.min(track.audioBuffer.length - 1, targetSample));
      onSeek(clampedSample);
    },
    [trackA, trackB, currentSampleA, currentSampleB, visibleBeats, onSeekA, onSeekB]
  );

  // Draw Waveform Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const deckH = h / 2;
    const centerPixel = w / 2;

    ctx.clearRect(0, 0, w, h);

    // Deep high-tech metallic backplate
    ctx.fillStyle = '#06080a';
    ctx.fillRect(0, 0, w, h);

    // Render single waveform lane
    const renderLane = (
      deckId: 'A' | 'B',
      track: TrackData | null,
      currentSample: number,
      deckStartY: number,
      primaryColor: string,
      secondaryColor: string,
      beatColor: string
    ) => {
      const centerY = deckStartY + deckH / 2;

      // Lane subtle background gradient
      const bgGrad = ctx.createLinearGradient(0, deckStartY, 0, deckStartY + deckH);
      bgGrad.addColorStop(0, deckId === 'A' ? 'rgba(0, 229, 255, 0.04)' : 'rgba(255, 85, 0, 0.04)');
      bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, deckStartY, w, deckH);

      // Separator Line
      ctx.strokeStyle = '#1a222e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, deckStartY);
      ctx.lineTo(w, deckStartY);
      ctx.stroke();

      if (!track || !track.audioBuffer) {
        ctx.fillStyle = '#475569';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`DECK ${deckId}: NO AUDIO LOADED`, w / 2, centerY + 4);
        return;
      }

      const channelData = track.audioBuffer.getChannelData(0);
      const totalSamples = channelData.length;
      const samplesPerBeat = track.beatGrid.samplesPerBeat || 22050;
      const visibleSamples = samplesPerBeat * visibleBeats;
      const startSample = currentSample - visibleSamples * 0.5;
      const endSample = currentSample + visibleSamples * 0.5;
      const samplesPerPixel = visibleSamples / w;

      // Draw Beatgrid lines & downbeats
      if (track.beatGrid) {
        if (track.beatGrid.beatSamples && track.beatGrid.beatSamples.length > 0) {
          const beatSamples = track.beatGrid.beatSamples;
          const isDownbeatArr = track.beatGrid.isDownbeat;

          for (let b = 0; b < beatSamples.length; b++) {
            const beatSample = beatSamples[b];
            if (beatSample < startSample) continue;
            if (beatSample > endSample) break;

            const px = centerPixel + (beatSample - currentSample) / samplesPerPixel;
            if (px < 0 || px > w) continue;

            const isDownbeat = isDownbeatArr ? isDownbeatArr[b] : (b % 4 === 0);

            ctx.strokeStyle = isDownbeat ? '#ffffff' : beatColor;
            ctx.lineWidth = isDownbeat ? 1.5 : 1;
            ctx.beginPath();
            ctx.moveTo(px, deckStartY + 2);
            ctx.lineTo(px, deckStartY + deckH - 2);
            ctx.stroke();

            // Small block marker
            ctx.fillStyle = isDownbeat ? '#ff2244' : (b % 2 === 0 ? primaryColor : '#ffffff');
            const boxSize = isDownbeat ? 4 : 3;
            ctx.fillRect(px - boxSize / 2, deckStartY + deckH - 6, boxSize, boxSize);
          }
        } else if (samplesPerBeat > 0) {
          const firstBeat = track.beatGrid.beatStartSample ?? track.beatGrid.firstDownbeatSample ?? 0;
          const firstVisibleBeat = Math.floor((startSample - firstBeat) / samplesPerBeat);
          const lastVisibleBeat = Math.ceil((endSample - firstBeat) / samplesPerBeat);

          for (let b = firstVisibleBeat; b <= lastVisibleBeat; b++) {
            const beatSample = firstBeat + b * samplesPerBeat;
            const px = centerPixel + (beatSample - currentSample) / samplesPerPixel;
            if (px < 0 || px > w) continue;

            const isDownbeat = (b % 4 + 4) % 4 === 0;

            ctx.strokeStyle = isDownbeat ? '#ffffff' : beatColor;
            ctx.lineWidth = isDownbeat ? 1.5 : 1;
            ctx.beginPath();
            ctx.moveTo(px, deckStartY + 2);
            ctx.lineTo(px, deckStartY + deckH - 2);
            ctx.stroke();

            // Small block marker
            ctx.fillStyle = isDownbeat ? '#ff2244' : (b % 2 === 0 ? primaryColor : '#ffffff');
            const boxSize = isDownbeat ? 4 : 3;
            ctx.fillRect(px - boxSize / 2, deckStartY + deckH - 6, boxSize, boxSize);
          }
        }
      }

      // Draw Waveform peaks
      const grad = ctx.createLinearGradient(0, centerY - deckH / 2 + 4, 0, centerY + deckH / 2 - 4);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(0.48, secondaryColor);
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(0.52, secondaryColor);
      grad.addColorStop(1, primaryColor);

      ctx.fillStyle = grad;
      ctx.beginPath();

      const step = Math.max(1, Math.floor(w / 400));
      for (let x = 0; x < w; x += step) {
        const sampleIdx = Math.floor(startSample + x * samplesPerPixel);
        let peak = 0;
        if (sampleIdx >= 0 && sampleIdx < totalSamples) {
          const windowSize = Math.max(1, Math.floor(samplesPerPixel));
          for (let s = 0; s < windowSize; s += Math.max(1, Math.floor(windowSize / 4))) {
            const val = Math.abs(channelData[Math.min(totalSamples - 1, sampleIdx + s)] || 0);
            if (val > peak) peak = val;
          }
        }

        const barHeight = Math.max(2, peak * (deckH * 0.44));
        ctx.rect(x, centerY - barHeight, step, barHeight * 2);
      }
      ctx.fill();

      // Transients from warpMap if present
      if (track.warpMap?.transientMarkers) {
        for (const tSample of track.warpMap.transientMarkers) {
          const px = centerPixel + (tSample - currentSample) / samplesPerPixel;
          if (px >= 0 && px <= w) {
            ctx.fillStyle = '#00ff66';
            ctx.beginPath();
            ctx.arc(px, deckStartY + 6, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    };

    // Render Deck A (Top - Cyan)
    renderLane('A', trackA, currentSampleA, 0, '#00e5ff', '#0077aa', '#38bdf8');

    // Render Deck B (Bottom - Orange)
    renderLane('B', trackB, currentSampleB, deckH, '#ff5500', '#aa2200', '#fb923c');

    // CENTER COMMON PLAYHEAD NEEDLE
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerPixel, 0);
    ctx.lineTo(centerPixel, h);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Center Cue Needles / Triangles
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(centerPixel - 5, 0);
    ctx.lineTo(centerPixel + 5, 0);
    ctx.lineTo(centerPixel, 7);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerPixel - 5, h);
    ctx.lineTo(centerPixel + 5, h);
    ctx.lineTo(centerPixel, h - 7);
    ctx.closePath();
    ctx.fill();
  }, [trackA, trackB, currentSampleA, currentSampleB, visibleBeats]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl bg-[#090b0e] border-2 border-neutral-800 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.85)] flex flex-col gap-1 select-none font-sans"
    >
      {/* Top Waveform Header with Zoom & Status */}
      <div className="flex items-center justify-between px-2 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-cyan-400">DECK A (CYAN)</span>
          <span className="text-neutral-500">|</span>
          <span className="font-bold text-orange-400">DECK B (ORANGE)</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-neutral-400">ZOOM:</span>
            <button
              onClick={() => setVisibleBeats((b) => Math.max(4, b / 2))}
              className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <span className="text-white font-bold">{visibleBeats} BEATS</span>
            <button
              onClick={() => setVisibleBeats((b) => Math.min(32, b * 2))}
              className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1 text-emerald-400">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span className="font-bold">KICK-LOCKED</span>
          </div>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="relative w-full h-[140px] rounded-lg overflow-hidden cursor-crosshair border border-neutral-800/80">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};
