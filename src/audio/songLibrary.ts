/**
 * 50 Diverse DJ Test Songs Library
 *
 * Spanning 60 to 180 BPM across Afrobeat, East African Riddims, Dancehall,
 * Amapiano, House, Techno, Halftime, Drum & Bass, and Variable BPM Live Drift tracks.
 */

export interface SongLibraryItem {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  genre: string;
  category: 'afrobeat' | 'dancehall' | 'house' | 'techno' | 'hiphop' | 'dnb' | 'variable';
  color: string;
  durationSeconds: number;
  hasIntro?: boolean;
  introDurationSec?: number;
  variableBpm?: boolean;
  bpmVariance?: number;
  swingFactor?: number;
  /** Fixed rhythmic offset of kick drum from beat-grid marker in milliseconds */
  kickOffsetMs?: number;
}

export const FIFTY_TEST_SONGS: SongLibraryItem[] = [
  // --- MASAVU Groove Matcher Test Pair (Section 10 in Spec) ---
  {
    id: 'groove-test-120-master',
    title: 'Master Afrobeat Groove (+140ms Kick)',
    artist: 'MASAVU Reference (Master +140ms)',
    bpm: 120.0,
    genre: 'Afrobeat Groove',
    category: 'afrobeat',
    color: '#06b6d4',
    durationSeconds: 32,
    kickOffsetMs: 140
  },
  {
    id: 'groove-test-120-slave',
    title: 'Slave Syncopated Dub (+65ms Kick)',
    artist: 'MASAVU Reference (Slave +65ms)',
    bpm: 120.0,
    genre: 'Syncopated Dub',
    category: 'dancehall',
    color: '#a855f7',
    durationSeconds: 32,
    kickOffsetMs: 65
  },

  // --- Afrobeat & East African Riddims (95 - 116 BPM) ---
  {
    id: 'afro-98-wanjula',
    title: 'Wanjula (East African Groove)',
    artist: 'Kampala Sound System',
    bpm: 98.0,
    genre: 'Afrobeat / East African',
    category: 'afrobeat',
    color: '#10b981',
    durationSeconds: 32,
    hasIntro: true,
    introDurationSec: 2.45
  },
  {
    id: 'afro-100-tebulina',
    title: 'Tebulina (Rhythmic Pulse)',
    artist: 'Nalubaale Project',
    bpm: 100.0,
    genre: 'Afro-Gospel Riddim',
    category: 'afrobeat',
    color: '#059669',
    durationSeconds: 32
  },
  {
    id: 'afro-102-lagos',
    title: 'Lagos Nightfall',
    artist: 'AfroPulse Collective',
    bpm: 102.0,
    genre: 'Afro House',
    category: 'afrobeat',
    color: '#047857',
    durationSeconds: 32
  },
  {
    id: 'afro-104-amapiano',
    title: 'Soweto Log Drum',
    artist: 'Kaya Vibes',
    bpm: 104.0,
    genre: 'Amapiano',
    category: 'afrobeat',
    color: '#14b8a6',
    durationSeconds: 32,
    hasIntro: true,
    introDurationSec: 3.1
  },
  {
    id: 'afro-106-highlife',
    title: 'Accra Sunset',
    artist: 'Gold Coast Band',
    bpm: 106.0,
    genre: 'Highlife Modern',
    category: 'afrobeat',
    color: '#0d9488',
    durationSeconds: 32
  },
  {
    id: 'afro-108-kuduro',
    title: 'Luanda Carnival',
    artist: 'Batida Beats',
    bpm: 108.0,
    genre: 'Kuduro Fusion',
    category: 'afrobeat',
    color: '#0f766e',
    durationSeconds: 32
  },
  {
    id: 'afro-112-naija',
    title: 'Oshodi Expressway',
    artist: 'Lekki Sounds',
    bpm: 112.0,
    genre: 'Afro Fusion',
    category: 'afrobeat',
    color: '#06b6d4',
    durationSeconds: 32
  },
  {
    id: 'afro-115-gqom',
    title: 'Durban Kick Pressure',
    artist: 'Sgubhu Unit',
    bpm: 115.0,
    genre: 'Gqom',
    category: 'afrobeat',
    color: '#0891b2',
    durationSeconds: 32
  },

  // --- Dancehall, Reggae & Dub (72 - 94 BPM) ---
  {
    id: 'dh-72-roots',
    title: 'Zion Stepper',
    artist: 'Kingston Dubplate',
    bpm: 72.0,
    genre: 'Roots Reggae Dub',
    category: 'dancehall',
    color: '#eab308',
    durationSeconds: 32,
    hasIntro: true,
    introDurationSec: 4.16
  },
  {
    id: 'dh-75-slengteng',
    title: 'Digital One Drop',
    artist: 'Casio Riddim Master',
    bpm: 75.0,
    genre: 'Early Dancehall',
    category: 'dancehall',
    color: '#ca8a04',
    durationSeconds: 32
  },
  {
    id: 'dh-78-katonda',
    title: 'Katonda Wange (Gospel Reggae)',
    artist: 'Gospel Skankers',
    bpm: 78.0,
    genre: 'Gospel Reggae',
    category: 'dancehall',
    color: '#a16207',
    durationSeconds: 32
  },
  {
    id: 'dh-82-dancehall',
    title: 'Red Rum Riddim',
    artist: 'Spanish Town Crew',
    bpm: 82.0,
    genre: 'Modern Dancehall',
    category: 'dancehall',
    color: '#d97706',
    durationSeconds: 32
  },
  {
    id: 'dh-85-caribbean',
    title: 'Montego Bay Sunrise',
    artist: 'Island Riddim Lab',
    bpm: 85.0,
    genre: 'Dancehall Pop',
    category: 'dancehall',
    color: '#b45309',
    durationSeconds: 32
  },
  {
    id: 'dh-88-steppers',
    title: 'Highlands Stepper',
    artist: 'Rastafari Sound',
    bpm: 88.0,
    genre: 'Dub Steppers',
    category: 'dancehall',
    color: '#f59e0b',
    durationSeconds: 32
  },
  {
    id: 'dh-92-democrat',
    title: 'Kingston Fire',
    artist: 'Dancehall Shaker',
    bpm: 92.0,
    genre: 'Dancehall Uptempo',
    category: 'dancehall',
    color: '#ea580c',
    durationSeconds: 32
  },

  // --- Hip Hop, Trap & Boom Bap (65 - 94 BPM) ---
  {
    id: 'hip-65-chillhop',
    title: 'Midnight Lo-Fi Coffee',
    artist: 'Tape Hiss Project',
    bpm: 65.0,
    genre: 'Lo-Fi Hip Hop',
    category: 'hiphop',
    color: '#8b5cf6',
    durationSeconds: 32,
    hasIntro: true,
    introDurationSec: 3.69
  },
  {
    id: 'hip-70-boom-bap',
    title: 'Brooklyn Concrete 94',
    artist: 'SP-1200 Crates',
    bpm: 70.0,
    genre: 'East Coast Boom Bap',
    category: 'hiphop',
    color: '#7c3aed',
    durationSeconds: 32
  },
  {
    id: 'hip-74-westcoast',
    title: 'Pacific Coast Lowrider',
    artist: 'G-Funk Syndicate',
    bpm: 74.0,
    genre: 'West Coast G-Funk',
    category: 'hiphop',
    color: '#6d28d9',
    durationSeconds: 32
  },
  {
    id: 'hip-80-trap',
    title: '808 Sub Warfare',
    artist: 'Atlanta Metro Hub',
    bpm: 80.0,
    genre: 'Trap 808',
    category: 'hiphop',
    color: '#9333ea',
    durationSeconds: 32
  },
  {
    id: 'hip-84-soul',
    title: 'Dilla MPC Swing',
    artist: 'Soul Chop Quartet',
    bpm: 84.0,
    genre: 'Neo-Soul Hip Hop',
    category: 'hiphop',
    color: '#a855f7',
    durationSeconds: 32,
    swingFactor: 0.15
  },
  {
    id: 'hip-88-phonk',
    title: 'Drift Phonk Memphis',
    artist: 'Cowbell Bandit',
    bpm: 88.0,
    genre: 'Drift Phonk',
    category: 'hiphop',
    color: '#c084fc',
    durationSeconds: 32
  },
  {
    id: 'hip-94-grime',
    title: 'East London 140 Sub (Halftime)',
    artist: 'Bow E3 Unit',
    bpm: 94.0,
    genre: 'Grime Halftime',
    category: 'hiphop',
    color: '#7e22ce',
    durationSeconds: 32
  },

  // --- House & Deep House (118 - 128 BPM) ---
  {
    id: 'house-118-organic',
    title: 'Desert Mirage',
    artist: 'Bedouin Dunes',
    bpm: 118.0,
    genre: 'Organic Deep House',
    category: 'house',
    color: '#0284c7',
    durationSeconds: 32
  },
  {
    id: 'house-120-chicago',
    title: 'Warehouse 87',
    artist: 'Jack Master Frankie',
    bpm: 120.0,
    genre: 'Chicago Classic House',
    category: 'house',
    color: '#0369a1',
    durationSeconds: 32
  },
  {
    id: 'house-122-soulful',
    title: 'Sunday Service Keys',
    artist: 'Detroit Gospel Project',
    bpm: 122.0,
    genre: 'Soulful House',
    category: 'house',
    color: '#075985',
    durationSeconds: 32
  },
  {
    id: 'house-123-afrotech',
    title: 'Kilimanjaro Drums',
    artist: 'Serengeti Tech Unit',
    bpm: 123.0,
    genre: 'Afro Tech House',
    category: 'house',
    color: '#06b6d4',
    durationSeconds: 32
  },
  {
    id: 'house-124-neon',
    title: 'Neon Horizon',
    artist: 'MASAVU Studio',
    bpm: 124.0,
    genre: 'Deep Tech House',
    category: 'house',
    color: '#22d3ee',
    durationSeconds: 32
  },
  {
    id: 'house-125-ibiza',
    title: 'Cafe Del Sol Sunrise',
    artist: 'Baleares Dreamer',
    bpm: 125.0,
    genre: 'Balearic House',
    category: 'house',
    color: '#38bdf8',
    durationSeconds: 32
  },
  {
    id: 'house-126-velvet',
    title: 'Velvet Groove',
    artist: 'Club Resonance',
    bpm: 126.0,
    genre: 'Tech House',
    category: 'house',
    color: '#3b82f6',
    durationSeconds: 32
  },
  {
    id: 'house-127-disco',
    title: 'Glitterball Express',
    artist: 'Nu-Disco Allstars',
    bpm: 127.0,
    genre: 'Nu-Disco',
    category: 'house',
    color: '#60a5fa',
    durationSeconds: 32
  },
  {
    id: 'house-128-mainroom',
    title: 'Prater Electro Punch',
    artist: 'Festival Arena Crew',
    bpm: 128.0,
    genre: 'Electro House',
    category: 'house',
    color: '#2563eb',
    durationSeconds: 32
  },

  // --- Techno, Trance & Melodic (130 - 145 BPM) ---
  {
    id: 'tech-130-berlin',
    title: 'Berghain Concrete',
    artist: 'Krautronik 909',
    bpm: 130.0,
    genre: 'Berlin Peak Techno',
    category: 'techno',
    color: '#ef4444',
    durationSeconds: 32
  },
  {
    id: 'tech-132-melodic',
    title: 'Aurora Borealis',
    artist: 'Stellar Synthetics',
    bpm: 132.0,
    genre: 'Melodic Techno',
    category: 'techno',
    color: '#dc2626',
    durationSeconds: 32
  },
  {
    id: 'tech-134-acid',
    title: 'TB-303 Silver Box',
    artist: 'Acid Overlord',
    bpm: 134.0,
    genre: 'Acid Techno',
    category: 'techno',
    color: '#b91c1c',
    durationSeconds: 32
  },
  {
    id: 'tech-136-tribal',
    title: 'Amazonian Rhythmics',
    artist: 'Pachamama Beat',
    bpm: 136.0,
    genre: 'Tribal Techno',
    category: 'techno',
    color: '#991b1b',
    durationSeconds: 32
  },
  {
    id: 'tech-138-trance',
    title: 'Euphoria Odyssey',
    artist: 'Supersonic Trance',
    bpm: 138.0,
    genre: 'Uplifting Trance',
    category: 'techno',
    color: '#f43f5e',
    durationSeconds: 32
  },
  {
    id: 'tech-140-hardgroove',
    title: 'Industrial Shovel 99',
    artist: 'Hardgroove Machinist',
    bpm: 140.0,
    genre: 'Hardgroove Techno',
    category: 'techno',
    color: '#e11d48',
    durationSeconds: 32
  },
  {
    id: 'tech-142-psy',
    title: 'Goa Desert Spiral',
    artist: 'Shiva Trance Lab',
    bpm: 142.0,
    genre: 'Psytrance Rolling Bass',
    category: 'techno',
    color: '#be123c',
    durationSeconds: 32
  },
  {
    id: 'tech-145-rave',
    title: 'Rotterdam 1993 Revival',
    artist: 'Oldskool Thunder',
    bpm: 145.0,
    genre: 'Early Rave Breakbeat',
    category: 'techno',
    color: '#881337',
    durationSeconds: 32
  },

  // --- Drum & Bass, Jungle & Fast Tempos (160 - 178 BPM) ---
  {
    id: 'dnb-160-liquid',
    title: 'Serenade at Dawn',
    artist: 'Liquid Horizon',
    bpm: 160.0,
    genre: 'Liquid Drum & Bass',
    category: 'dnb',
    color: '#f59e0b',
    durationSeconds: 32
  },
  {
    id: 'dnb-165-jungle',
    title: 'Amen Chopper 95',
    artist: 'Brixton Soundboy',
    bpm: 165.0,
    genre: 'Classic Jungle',
    category: 'dnb',
    color: '#d97706',
    durationSeconds: 32
  },
  {
    id: 'dnb-170-neuro',
    title: 'Reese Bass Reactor',
    artist: 'Cybernetic Neurofunk',
    bpm: 170.0,
    genre: 'Neurofunk DnB',
    category: 'dnb',
    color: '#b45309',
    durationSeconds: 32
  },
  {
    id: 'dnb-172-roller',
    title: 'Bristol Foghorn',
    artist: 'Deep Roller Unit',
    bpm: 172.0,
    genre: 'Roller DnB',
    category: 'dnb',
    color: '#f59e0b',
    durationSeconds: 32
  },
  {
    id: 'dnb-174-solar',
    title: 'Solar Flare (2x Match Target)',
    artist: 'HyperDrive Velocity',
    bpm: 174.0,
    genre: 'Drum & Bass',
    category: 'dnb',
    color: '#f97316',
    durationSeconds: 32
  },
  {
    id: 'dnb-175-jumpup',
    title: 'Bassline Carnage',
    artist: 'Jump Up Kings',
    bpm: 175.0,
    genre: 'Jump Up DnB',
    category: 'dnb',
    color: '#ea580c',
    durationSeconds: 32
  },
  {
    id: 'dnb-178-drillnbass',
    title: 'Square Wave Glitch',
    artist: 'Aphex Experimental',
    bpm: 178.0,
    genre: 'Drill & Bass',
    category: 'dnb',
    color: '#c2410c',
    durationSeconds: 32
  },

  // --- Real-World Variable BPM & Live Drift Tracks (Simulating live studio recordings!) ---
  {
    id: 'var-96-live-band',
    title: 'Live Afro-Jazz Session (96.4 BPM Drift)',
    artist: 'Fela Legacy Orchestra',
    bpm: 96.4,
    genre: 'Live Afrobeat (Variable +/- 1.5 BPM)',
    category: 'variable',
    color: '#ec4899',
    durationSeconds: 32,
    variableBpm: true,
    bpmVariance: 1.5
  },
  {
    id: 'var-118-funk-drummer',
    title: 'Funky Drummer Human Pocket',
    artist: 'Live Studio Session A',
    bpm: 118.8,
    genre: 'Live Funk (Human Micro-Jitter)',
    category: 'variable',
    color: '#db2777',
    durationSeconds: 32,
    variableBpm: true,
    bpmVariance: 1.2
  },
  {
    id: 'var-124-vinyl-rip',
    title: 'Vintage Vinyl 124 (Wow & Flutter)',
    artist: 'Wax Pressing 1978',
    bpm: 124.3,
    genre: 'Vinyl Rip (Pitch Oscillation)',
    category: 'variable',
    color: '#be185d',
    durationSeconds: 32,
    variableBpm: true,
    bpmVariance: 0.8
  },
  {
    id: 'var-127-transition',
    title: 'Tempo Accelerando (124 -> 130 BPM)',
    artist: 'Dynamic Shift Engine',
    bpm: 127.0,
    genre: 'Tempo Ramp Transition',
    category: 'variable',
    color: '#9d174d',
    durationSeconds: 32,
    variableBpm: true,
    bpmVariance: 3.0
  },
  {
    id: 'var-101-gospel-live',
    title: 'Live Church Worship Choir (101.5 BPM)',
    artist: 'Grace Praise Fellowship',
    bpm: 101.5,
    genre: 'Live Gospel Praise (Acoustic Intro)',
    category: 'variable',
    color: '#f43f5e',
    durationSeconds: 32,
    hasIntro: true,
    introDurationSec: 4.5,
    variableBpm: true,
    bpmVariance: 1.1
  }
];
