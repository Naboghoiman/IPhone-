import React from 'react';
import { Play, Pause } from 'lucide-react';

interface CircularTransportButtonProps {
  type: 'cue' | 'play' | 'sync';
  isActive?: boolean;
  isPlaying?: boolean;
  size?: 'md' | 'lg' | 'xl';
  onClick: () => void;
  sublabel?: string;
}

export const CircularTransportButton: React.FC<CircularTransportButtonProps> = ({
  type,
  isActive = false,
  isPlaying = false,
  size = 'lg',
  onClick,
  sublabel,
}) => {
  const sizeClasses = {
    md: 'w-14 h-14 text-xs',
    lg: 'w-20 h-20 text-sm',
    xl: 'w-24 h-24 text-base',
  }[size];

  // Glow ring colors
  const styleConfig = {
    cue: {
      ring: 'border-[#ff6600]',
      glow: 'shadow-[0_0_18px_rgba(255,102,0,0.8),inset_0_0_12px_rgba(255,102,0,0.5)]',
      textColor: 'text-[#ff9933]',
      textGlow: 'drop-shadow-[0_0_8px_rgba(255,102,0,0.9)]',
      label: 'CUE',
    },
    play: {
      ring: 'border-[#00ff66]',
      glow: isPlaying
        ? 'shadow-[0_0_24px_rgba(0,255,102,0.9),inset_0_0_15px_rgba(0,255,102,0.6)]'
        : 'shadow-[0_0_14px_rgba(0,255,102,0.5),inset_0_0_8px_rgba(0,255,102,0.3)]',
      textColor: 'text-[#00ff88]',
      textGlow: 'drop-shadow-[0_0_8px_rgba(0,255,102,0.9)]',
      label: 'PLAY',
    },
    sync: {
      ring: 'border-[#00b0ff]',
      glow: isActive
        ? 'shadow-[0_0_22px_rgba(0,176,255,0.9),inset_0_0_14px_rgba(0,176,255,0.6)]'
        : 'shadow-[0_0_12px_rgba(0,176,255,0.5),inset_0_0_8px_rgba(0,176,255,0.3)]',
      textColor: 'text-[#38bdf8]',
      textGlow: 'drop-shadow-[0_0_8px_rgba(0,176,255,0.9)]',
      label: 'SYNC',
    },
  }[type];

  return (
    <button
      onClick={onClick}
      className={`group relative rounded-full flex flex-col items-center justify-center p-1 cursor-pointer select-none transition-all duration-100 active:scale-95 ${sizeClasses}`}
    >
      {/* Heavy Beveled Metallic Outer Bezel */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#4a5260] via-[#222730] to-[#12151a] shadow-[0_6px_16px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-neutral-700/80" />

      {/* Luminous Colored Ring */}
      <div
        className={`absolute inset-[3px] rounded-full border-2 ${styleConfig.ring} ${styleConfig.glow} transition-all duration-150`}
      />

      {/* Inner Metallic Button Face */}
      <div className="absolute inset-[6px] rounded-full bg-gradient-to-b from-[#323944] via-[#1c212a] to-[#0f1217] flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] group-active:translate-y-[1px]">
        {/* Play Icon if Play button */}
        {type === 'play' && (
          <div className="mb-0.5">
            {isPlaying ? (
              <Pause className="w-5 h-5 text-[#00ff88] fill-[#00ff88] drop-shadow-[0_0_6px_rgba(0,255,102,0.8)]" />
            ) : (
              <Play className="w-5 h-5 text-[#00ff88] fill-[#00ff88] drop-shadow-[0_0_6px_rgba(0,255,102,0.8)] ml-0.5" />
            )}
          </div>
        )}

        <span
          className={`font-mono font-black tracking-wider uppercase ${styleConfig.textColor} ${styleConfig.textGlow}`}
        >
          {type === 'play' ? (isPlaying ? 'PAUSE' : 'PLAY') : styleConfig.label}
        </span>

        {sublabel && (
          <span className="text-[8px] font-mono text-neutral-400 font-semibold tracking-tight">
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
};

interface HazardSafetySwitchProps {
  label: string;
  isOn: boolean;
  ledColor?: 'green' | 'red' | 'cyan' | 'orange';
  onToggle: () => void;
}

export const HazardSafetySwitch: React.FC<HazardSafetySwitchProps> = ({
  label,
  isOn,
  ledColor = 'green',
  onToggle,
}) => {
  const ledGlowMap = {
    green: '#00ff66',
    red: '#ff3344',
    cyan: '#00e5ff',
    orange: '#ff8800',
  };
  const glow = ledGlowMap[ledColor];

  return (
    <div className="flex flex-col items-center select-none">
      <div
        onClick={onToggle}
        className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-[#15181e] border border-neutral-700/80 shadow-[0_4px_10px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] cursor-pointer hover:brightness-110 active:scale-95 transition-all"
      >
        {/* Striped Caution / Hazard Protective Guard */}
        <div
          className="w-7 h-10 rounded-[2px] border border-neutral-900 shadow-inner flex items-center justify-center relative overflow-hidden"
          style={{
            background:
              'repeating-linear-gradient(45deg, #d99b00, #d99b00 4px, #1a1a1a 4px, #1a1a1a 8px)',
          }}
        >
          {/* Heavy Chrome Center Toggle Lever */}
          <div
            className="w-4 h-4 rounded-full bg-gradient-to-b from-neutral-200 via-neutral-400 to-neutral-700 shadow-[0_2px_5px_rgba(0,0,0,0.9)] border border-neutral-800 transition-transform duration-100"
            style={{
              transform: isOn ? 'translateY(-6px)' : 'translateY(6px)',
            }}
          />
        </div>

        {/* LED and State Text */}
        <div className="flex flex-col items-center">
          {/* LED Dot */}
          <div
            className="w-3 h-3 rounded-full border border-neutral-900 transition-all duration-150"
            style={{
              backgroundColor: isOn ? glow : '#1c222b',
              boxShadow: isOn ? `0 0 10px ${glow}, inset 0 1px 2px rgba(255,255,255,0.7)` : 'none',
            }}
          />
          <span className="text-[9px] font-mono font-bold text-neutral-300 mt-1 uppercase tracking-tight">
            {isOn ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      <span className="text-[10px] font-bold text-neutral-300 tracking-wider uppercase mt-1">
        {label}
      </span>
    </div>
  );
};

interface MpcPerformancePadProps {
  label: string;
  color: 'red' | 'cyan' | 'orange' | 'yellow' | 'purple' | 'magenta' | 'green';
  isPressed?: boolean;
  onClick: () => void;
}

export const MpcPerformancePad: React.FC<MpcPerformancePadProps> = ({
  label,
  color,
  isPressed = false,
  onClick,
}) => {
  const colorMap = {
    red: {
      border: 'border-[#ff3344]',
      glow: 'shadow-[0_0_12px_rgba(255,51,68,0.7),inset_0_0_8px_rgba(255,51,68,0.4)]',
      text: 'text-[#ff7788]',
    },
    cyan: {
      border: 'border-[#00e5ff]',
      glow: 'shadow-[0_0_12px_rgba(0,229,255,0.7),inset_0_0_8px_rgba(0,229,255,0.4)]',
      text: 'text-[#66f0ff]',
    },
    orange: {
      border: 'border-[#ff8800]',
      glow: 'shadow-[0_0_12px_rgba(255,136,0,0.7),inset_0_0_8px_rgba(255,136,0,0.4)]',
      text: 'text-[#ffaa44]',
    },
    yellow: {
      border: 'border-[#ffd000]',
      glow: 'shadow-[0_0_12px_rgba(255,208,0,0.7),inset_0_0_8px_rgba(255,208,0,0.4)]',
      text: 'text-[#ffe066]',
    },
    purple: {
      border: 'border-[#bf5af2]',
      glow: 'shadow-[0_0_12px_rgba(191,90,242,0.7),inset_0_0_8px_rgba(191,90,242,0.4)]',
      text: 'text-[#d88aff]',
    },
    magenta: {
      border: 'border-[#ff2d88]',
      glow: 'shadow-[0_0_12px_rgba(255,45,136,0.7),inset_0_0_8px_rgba(255,45,136,0.4)]',
      text: 'text-[#ff66aa]',
    },
    green: {
      border: 'border-[#00e676]',
      glow: 'shadow-[0_0_12px_rgba(0,230,118,0.7),inset_0_0_8px_rgba(0,230,118,0.4)]',
      text: 'text-[#66ffaa]',
    },
  }[color];

  return (
    <button
      onClick={onClick}
      className={`relative h-14 rounded-lg flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-75 select-none bg-gradient-to-b from-[#242a34] to-[#14181f] border-2 ${
        colorMap.border
      } ${colorMap.glow} active:scale-95 ${
        isPressed ? 'brightness-125 scale-95 ring-2 ring-white/60' : 'hover:brightness-110'
      }`}
    >
      {/* Top accent slit */}
      <div
        className="w-6 h-[2px] rounded-full mb-1.5"
        style={{ backgroundColor: colorMap.text.replace('text-', '') }}
      />
      <span className={`text-xs font-mono font-black tracking-wider uppercase ${colorMap.text}`}>
        {label}
      </span>
    </button>
  );
};
