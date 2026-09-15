import React from 'react';

interface SkeuomorphicMeterProps {
  levelL?: number; // 0 to 1
  levelR?: number; // 0 to 1
  clipL?: boolean;
  clipR?: boolean;
  orientation?: 'vertical' | 'horizontal';
  segments?: number;
  showLabels?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const DEFAULT_SEGMENTS = [
  { db: '+12', color: '#ff2233' },
  { db: '+6', color: '#ff3344' },
  { db: '+3', color: '#ff6622' },
  { db: '0', color: '#ff9900' },
  { db: '-3', color: '#ffcc00' },
  { db: '-6', color: '#e5de00' },
  { db: '-10', color: '#88dd22' },
  { db: '-12', color: '#33cc33' },
  { db: '-20', color: '#00cc44' },
  { db: '-30', color: '#00bb44' },
  { db: '-40', color: '#00aa33' },
  { db: '-60', color: '#008822' },
];

export const SkeuomorphicMeter: React.FC<SkeuomorphicMeterProps> = ({
  levelL = 0.65,
  levelR = 0.62,
  clipL = false,
  clipR = false,
  orientation = 'vertical',
  showLabels = true,
  label,
  size = 'md',
}) => {
  const isVert = orientation === 'vertical';

  if (!isVert) {
    // Horizontal single meter bar (like OUTPUT STATUS in header)
    const activeIndex = Math.floor(levelL * DEFAULT_SEGMENTS.length);
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0b0d10] rounded border border-neutral-800 shadow-inner">
        {label && (
          <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider mr-1">
            {label}
          </span>
        )}
        <div className="flex items-center gap-[2px]">
          {DEFAULT_SEGMENTS.slice().reverse().map((seg, i) => {
            const isActive = i <= activeIndex;
            return (
              <div
                key={i}
                className="w-1.5 h-3 rounded-[1px] transition-opacity duration-75"
                style={{
                  backgroundColor: isActive ? seg.color : '#161a20',
                  boxShadow: isActive ? `0 0 6px ${seg.color}` : 'none',
                  opacity: isActive ? 1 : 0.4,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical Stereo Dual Ladder
  const total = DEFAULT_SEGMENTS.length;
  const activeL = Math.floor(levelL * total);
  const activeR = Math.floor(levelR * total);

  return (
    <div className="flex flex-col items-center bg-[#090b0e] p-2 rounded-md border border-neutral-800/80 shadow-inner select-none">
      {label && (
        <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5 text-center">
          {label}
        </span>
      )}

      {/* Header with L and R labels & Clip indicators */}
      <div className="flex items-center justify-between w-full px-1 mb-1 text-[9px] font-mono text-neutral-400 font-bold">
        <span className="text-cyan-400">L</span>
        <span className="text-red-400">R</span>
      </div>

      {/* Main Dual LED Columns with Center dB Scale */}
      <div className="flex items-center gap-1.5">
        {/* Left Channel LEDs */}
        <div className="flex flex-col gap-[3px]">
          {DEFAULT_SEGMENTS.map((seg, i) => {
            const invIndex = total - 1 - i;
            const isOn = invIndex <= activeL;
            return (
              <div
                key={`l-${i}`}
                className="w-2.5 h-[6px] rounded-[1px] transition-all duration-75"
                style={{
                  backgroundColor: isOn ? seg.color : '#181d24',
                  boxShadow: isOn ? `0 0 5px ${seg.color}` : 'none',
                  opacity: isOn ? 1 : 0.35,
                }}
              />
            );
          })}
        </div>

        {/* Center dB Labels */}
        {showLabels && (
          <div className="flex flex-col justify-between h-full text-[8px] font-mono text-neutral-400 text-center select-none py-[1px]">
            {DEFAULT_SEGMENTS.map((seg, i) => (
              <span key={`lbl-${i}`} className="leading-[9px] h-[9px]">
                {seg.db}
              </span>
            ))}
          </div>
        )}

        {/* Right Channel LEDs */}
        <div className="flex flex-col gap-[3px]">
          {DEFAULT_SEGMENTS.map((seg, i) => {
            const invIndex = total - 1 - i;
            const isOn = invIndex <= activeR;
            return (
              <div
                key={`r-${i}`}
                className="w-2.5 h-[6px] rounded-[1px] transition-all duration-75"
                style={{
                  backgroundColor: isOn ? seg.color : '#181d24',
                  boxShadow: isOn ? `0 0 5px ${seg.color}` : 'none',
                  opacity: isOn ? 1 : 0.35,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
