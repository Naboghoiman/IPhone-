import React, { useRef, useState } from 'react';

interface SkeuomorphicFaderProps {
  orientation?: 'vertical' | 'horizontal';
  value: number; // typically 0 to 1, or -1 to 1 for crossfader, or dB (-12 to +12)
  min?: number;
  max?: number;
  step?: number;
  height?: number; // for vertical
  width?: number; // for horizontal
  trackColor?: 'cyan' | 'red' | 'orange' | 'silver' | 'purple' | 'neutral';
  showScale?: boolean;
  scaleTicks?: { label: string; value: number }[];
  label?: string;
  capSize?: 'sm' | 'md' | 'lg';
  ledIndicatorColor?: string;
  onChange: (val: number) => void;
}

export const SkeuomorphicFader: React.FC<SkeuomorphicFaderProps> = ({
  orientation = 'vertical',
  value,
  min = 0,
  max = 1,
  height = 160,
  width = 240,
  trackColor = 'neutral',
  showScale = true,
  scaleTicks,
  label,
  capSize = 'md',
  ledIndicatorColor,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isVert = orientation === 'vertical';
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateFromPointer(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const updateFromPointer = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let fraction = 0;
    if (isVert) {
      // Top = 1 (max), Bottom = 0 (min)
      fraction = (rect.bottom - e.clientY) / rect.height;
    } else {
      // Left = 0 (min), Right = 1 (max)
      fraction = (e.clientX - rect.left) / rect.width;
    }
    fraction = Math.max(0, Math.min(1, fraction));
    const newVal = min + fraction * (max - min);
    onChange(newVal);
  };

  // Glow color for track slot
  const trackGlowMap = {
    cyan: '#00e5ff',
    red: '#ff3344',
    orange: '#ff8800',
    purple: '#bf5af2',
    silver: '#a1aab5',
    neutral: '#2c333e',
  };
  const activeGlow = trackGlowMap[trackColor] || '#2c333e';

  // Slider Cap Sizes
  const capDim = {
    sm: { w: isVert ? 22 : 16, h: isVert ? 14 : 26 },
    md: { w: isVert ? 36 : 24, h: isVert ? 20 : 34 },
    lg: { w: isVert ? 44 : 28, h: isVert ? 24 : 40 },
  }[capSize];

  return (
    <div className={`flex ${isVert ? 'flex-row' : 'flex-col'} items-center select-none font-sans`}>
      {/* Scale markings on left for vertical */}
      {isVert && showScale && scaleTicks && (
        <div
          className="flex flex-col justify-between pr-2 text-[9px] font-mono text-neutral-400 text-right select-none"
          style={{ height: `${height}px` }}
        >
          {scaleTicks.map((t, i) => (
            <div key={i} className="flex items-center justify-end gap-1">
              <span>{t.label}</span>
              <span className="w-1.5 h-[1px] bg-neutral-600 inline-block" />
            </div>
          ))}
        </div>
      )}

      {/* Main Fader Slot Track */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          height: isVert ? `${height}px` : '36px',
          width: isVert ? '38px' : `${width}px`,
        }}
        className="relative flex items-center justify-center cursor-pointer p-2"
      >
        {/* Recessed Fader Slot Groove */}
        <div
          style={{
            height: isVert ? '100%' : '6px',
            width: isVert ? '6px' : '100%',
            boxShadow: `inset 0 2px 4px rgba(0,0,0,0.9), 0 0 8px ${trackColor !== 'neutral' ? activeGlow + '50' : 'transparent'}`,
          }}
          className="relative rounded-full bg-[#0a0c0f] border border-neutral-800"
        >
          {/* Internal illuminated fill bar */}
          {trackColor !== 'neutral' && isVert && (
            <div
              className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-75"
              style={{
                height: `${norm * 100}%`,
                backgroundColor: activeGlow,
                boxShadow: `0 0 10px ${activeGlow}`,
                opacity: 0.85,
              }}
            />
          )}

          {trackColor !== 'neutral' && !isVert && (
            <div
              className="absolute top-0 bottom-0 left-0 rounded-l-full transition-all duration-75"
              style={{
                width: `${norm * 100}%`,
                backgroundColor: activeGlow,
                boxShadow: `0 0 10px ${activeGlow}`,
                opacity: 0.85,
              }}
            />
          )}
        </div>

        {/* Photorealistic Brushed Aluminum Fader Handle Cap */}
        <div
          className={`absolute rounded-sm pointer-events-none transition-transform duration-75 shadow-[0_6px_14px_rgba(0,0,0,0.9),0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-neutral-600/90 ${
            isDragging ? 'scale-105 brightness-110' : ''
          }`}
          style={{
            width: `${capDim.w}px`,
            height: `${capDim.h}px`,
            background: 'linear-gradient(180deg, #6c7582 0%, #3e4450 35%, #252932 70%, #444b58 100%)',
            ...(isVert
              ? {
                  bottom: `calc(${norm * 100}% - ${capDim.h / 2}px)`,
                  left: `calc(50% - ${capDim.w / 2}px)`,
                }
              : {
                  left: `calc(${norm * 100}% - ${capDim.w / 2}px)`,
                  top: `calc(50% - ${capDim.h / 2}px)`,
                }),
          }}
        >
          {/* Top Metallic Bevel */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-white/40 rounded-t-sm" />

          {/* Center Finger Grips / Ridges */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isVert ? (
              <div className="w-[85%] h-[2px] bg-white/90 shadow-[0_0_4px_rgba(255,255,255,0.8)] rounded-full" />
            ) : (
              <div className="h-[85%] w-[2px] bg-white/90 shadow-[0_0_4px_rgba(255,255,255,0.8)] rounded-full" />
            )}
          </div>

          {/* Lateral Texture Lines */}
          <div
            className={`absolute inset-1 opacity-20 pointer-events-none ${
              isVert ? 'flex flex-col justify-between' : 'flex justify-between'
            }`}
          >
            <div className={isVert ? 'w-full h-[1px] bg-black' : 'h-full w-[1px] bg-black'} />
            <div className={isVert ? 'w-full h-[1px] bg-black' : 'h-full w-[1px] bg-black'} />
          </div>
        </div>
      </div>

      {/* LED indicator dot at bottom for 31-band EQ */}
      {ledIndicatorColor && (
        <div
          className="w-1.5 h-1.5 rounded-full mt-1"
          style={{
            backgroundColor: ledIndicatorColor,
            boxShadow: `0 0 6px ${ledIndicatorColor}`,
          }}
        />
      )}

      {/* Label under fader */}
      {label && (
        <span className="text-[10px] font-mono text-neutral-300 font-semibold tracking-wider mt-1 text-center">
          {label}
        </span>
      )}
    </div>
  );
};
