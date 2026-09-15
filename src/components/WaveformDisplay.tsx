import React, { useEffect, useRef } from 'react';
import { DeckTelemetry, TrackData } from '../types/dj';

interface WaveformDisplayProps {
  track: TrackData | null;
  telemetry: DeckTelemetry;
  color: string;
  onSeek: (sample: number) => void;
  kickSnappedSample?: number | null;
  height?: number;
}

export function WaveformDisplay({
  track,
  telemetry,
  color,
  onSeek,
  kickSnappedSample,
  height = 70
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !track || !track.audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Center subtle zero-line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    const buffer = track.audioBuffer;
    const channelData = buffer.getChannelData(0);
    const totalSamples = channelData.length;
    const currentSample = telemetry.currentSourceSample;

    // Window around current playhead: show ~6 beats ahead and behind
    const samplesPerBeat = track.beatGrid.samplesPerBeat || 22050;
    const visibleSamples = samplesPerBeat * 14;
    const startSample = currentSample - visibleSamples * 0.45;
    const endSample = currentSample + visibleSamples * 0.55;

    // Draw beatgrid lines
    if (track.beatGrid && track.beatGrid.beatSamples) {
      const beatsPerBar = track.beatGrid.beatsPerBar || 4;

      for (let i = 0; i < track.beatGrid.beatSamples.length; i++) {
        const beatSample = track.beatGrid.beatSamples[i];
        if (beatSample >= startSample && beatSample <= endSample) {
          const x = ((beatSample - startSample) / visibleSamples) * width;
          const isDownbeat = (i % beatsPerBar) === 0;

          ctx.strokeStyle = isDownbeat ? 'rgba(239, 68, 68, 0.85)' : 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = isDownbeat ? 2 : 1;
          ctx.setLineDash(isDownbeat ? [] : [2, 3]);

          ctx.beginPath();
          ctx.moveTo(x, 4);
          ctx.lineTo(x, height - 4);
          ctx.stroke();
          ctx.setLineDash([]);

          if (isDownbeat) {
            ctx.fillStyle = '#ef4444';
            ctx.font = '10px monospace';
            ctx.fillText(`${Math.floor(i / beatsPerBar) + 1}.1`, x + 3, 13);
          }
        }
      }
    }

    // Draw transient markers (kicks / attacks)
    if (track.warpMap?.transientMarkers) {
      ctx.fillStyle = '#f59e0b';
      for (const markerSample of track.warpMap.transientMarkers) {
        if (markerSample >= startSample && markerSample <= endSample) {
          const x = ((markerSample - startSample) / visibleSamples) * width;
          ctx.beginPath();
          ctx.arc(x, height - 8, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Highlight kickSnapped target if present
    if (kickSnappedSample != null && kickSnappedSample >= startSample && kickSnappedSample <= endSample) {
      const x = ((kickSnappedSample - startSample) / visibleSamples) * width;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('SNAP KICK', x + 4, 25);
    }

    // Draw audio waveform peaks
    const step = Math.max(1, Math.floor(visibleSamples / width));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const sampleIndex = Math.floor(startSample + (x / width) * visibleSamples);
      if (sampleIndex >= 0 && sampleIndex < totalSamples) {
        let maxVal = 0;
        for (let s = 0; s < step && sampleIndex + s < totalSamples; s++) {
          const val = Math.abs(channelData[sampleIndex + s]);
          if (val > maxVal) maxVal = val;
        }

        const barHeight = Math.min(centerY - 2, maxVal * centerY * 0.95);
        ctx.moveTo(x, centerY - barHeight);
        ctx.lineTo(x, centerY + barHeight);
      }
    }
    ctx.stroke();

    // Draw Playhead line (always fixed at 45% width for scrolling waveform)
    const playheadX = width * 0.45;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead arrow indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 8);
    ctx.closePath();
    ctx.fill();

    // Cue marker indicator
    if (telemetry.cueSample >= startSample && telemetry.cueSample <= endSample) {
      const cueX = ((telemetry.cueSample - startSample) / visibleSamples) * width;
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(cueX, height);
      ctx.lineTo(cueX - 6, height - 12);
      ctx.lineTo(cueX + 6, height - 12);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('CUE', cueX - 8, height - 14);
    }
  }, [track, telemetry, color, kickSnappedSample]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!track || !track.audioBuffer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    const samplesPerBeat = track.beatGrid.samplesPerBeat || 22050;
    const visibleSamples = samplesPerBeat * 14;
    const currentSample = telemetry.currentSourceSample;
    const startSample = currentSample - visibleSamples * 0.45;

    const targetSample = Math.round(startSample + (clickX / width) * visibleSamples);
    onSeek(Math.max(0, Math.min(targetSample, track.audioBuffer.length - 1)));
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
      <canvas
        ref={canvasRef}
        width={720}
        height={height}
        onClick={handleCanvasClick}
        style={{ height: `${height}px` }}
        className="w-full block cursor-crosshair select-none"
      />
      <div className="absolute top-1 right-2 flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded pointer-events-none">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span> Downbeat
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span> Transient Kick
        </span>
      </div>
    </div>
  );
}
