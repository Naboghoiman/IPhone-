import React, { useRef, useState, useEffect, useCallback } from 'react';

interface SkeuomorphicKnobProps {
  label: string;
  value: number; // normalized or actual
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'cyan' | 'orange' | 'red' | 'green' | 'purple' | 'yellow' | 'blue' | 'white';
  arcType?: 'uni' | 'bi' | 'none'; // uni = 0 to 1, bi = centered at 0
  displayValue?: string;
  sublabel?: string;
  onChange: (val: number) => void;
  ticks?: number;
}

export const SkeuomorphicKnob: React.FC<SkeuomorphicKnobProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  unit = '',
  size = 'md',
  color = 'cyan',
  arcType = 'uni',
  displayValue,
  sublabel,
  onChange,
  ticks = 11,
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(value);

  // Map value to angle (-135 deg to +135 deg => 270 deg range)
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const angle = -135 + norm * 270;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = startYRef.current - e.clientY;
    const range = max - min;
    const sensitivity = range / 200; // 200px drag = full range
    const newVal = Math.max(min, Math.min(max, startValRef.current + dy * sensitivity));
    onChange(newVal);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Dimensions
  const sizeMap = {
    sm: { w: 42, h: 42, dotSize: 3, lineH: 10 },
    md: { w: 54, h: 54, dotSize: 4, lineH: 14 },
    lg: { w: 72, h: 72, dotSize: 5, lineH: 18 },
    xl: { w: 96, h: 96, dotSize: 6, lineH: 26 },
  };
  const dim = sizeMap[size];

  // Colors
  const colorHex: Record<string, string> = {
    cyan: '#00e5ff',
    orange: '#ff8800',
    red: '#ff3344',
    green: '#00ff66',
    purple: '#bf5af2',
    yellow: '#ffcc00',
    blue: '#3b82f6',
    white: '#e5e7eb',
  };
  const activeColor = colorHex[color] || '#00e5ff';

  // Format text display
  const valString = displayValue !== undefined ? displayValue : `${Math.round(value)}${unit}`;

  return (
    <div className="flex flex-col items-center select-none font-sans">
      {/* Top Label */}
      {label && (
        <span className="text-[10px] font-bold tracking-wider text-neutral-300 uppercase mb-1 drop-shadow-sm text-center">
          {label}
        </span>
      )}

      {/* Knob Body with Radial Ticks */}
      <div className="relative flex items-center justify-center p-1">
        {/* Surrounding Ticks Ring */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${dim.w + 20} ${dim.h + 20}`}
        >
          {Array.from({ length: ticks }).map((_, i) => {
            const tAngle = -135 + (i / (ticks - 1)) * 270;
            const rad = (tAngle - 90) * (Math.PI / 180);
            const cx = (dim.w + 20) / 2;
            const cy = (dim.h + 20) / 2;
            const r1 = (dim.w / 2) + 3;
            const r2 = (dim.w / 2) + (i === 0 || i === ticks - 1 || i === Math.floor(ticks / 2) ? 7 : 5);
            const x1 = cx + r1 * Math.cos(rad);
            const y1 = cy + r1 * Math.sin(rad);
            const x2 = cx + r2 * Math.cos(rad);
            const y2 = cy + r2 * Math.sin(rad);

            const isPast = arcType === 'bi'
              ? (tAngle < 0 && angle <= tAngle) || (tAngle > 0 && angle >= tAngle)
              : tAngle <= angle;

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isPast ? activeColor : '#333b45'}
                strokeWidth={i === 0 || i === ticks - 1 || i === Math.floor(ticks / 2) ? 1.5 : 1}
                strokeLinecap="round"
                opacity={isPast ? 0.9 : 0.6}
              />
            );
          })}
        </svg>

        {/* 3D Skeuomorphic Rotary Dial */}
        <div
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: `${dim.w}px`, height: `${dim.h}px` }}
          className={`relative rounded-full cursor-ns-resize shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-neutral-700/80 bg-gradient-to-b from-neutral-600 via-neutral-800 to-neutral-900 transition-transform ${
            isDragging ? 'scale-105' : 'hover:brightness-110'
          }`}
        >
          {/* Knurled Metal Outer Ring Texture */}
          <div className="absolute inset-[2px] rounded-full border border-neutral-900/90 bg-gradient-to-tr from-neutral-900 via-neutral-700 to-neutral-900 shadow-inner" />

          {/* Radial Brushed Face */}
          <div
            className="absolute inset-[5px] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] overflow-hidden"
            style={{
              background: `radial-gradient(circle at 40% 40%, #555d69 0%, #2b3038 55%, #15181d 100%)`,
            }}
          >
            {/* Center Pointer Line or Dot that Rotates */}
            <div
              className="absolute inset-0 flex items-start justify-center"
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'center center',
              }}
            >
              {/* Crisp illuminated pointer line */}
              <div
                className="rounded-full shadow-sm"
                style={{
                  width: `${dim.dotSize}px`,
                  height: `${dim.lineH}px`,
                  marginTop: '4px',
                  backgroundColor: activeColor,
                  boxShadow: `0 0 6px ${activeColor}, 0 0 10px ${activeColor}80`,
                }}
              />
            </div>

            {/* Subtle Metallic Specular Highlight */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded-full" />
          </div>
        </div>
      </div>

      {/* Numerical Value Readout */}
      <div className="mt-1 flex flex-col items-center">
        <span
          className="text-[11px] font-mono font-bold tracking-tight drop-shadow"
          style={{ color: activeColor }}
        >
          {valString}
        </span>
        {sublabel && (
          <span className="text-[9px] text-neutral-400 font-medium tracking-tight">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};
