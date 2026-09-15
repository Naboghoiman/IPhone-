import React, { useState, useMemo } from 'react';
import { FIFTY_TEST_SONGS, SongLibraryItem } from '../audio/songLibrary';
import { TrackData } from '../types/dj';
import { Music, Search, SlidersHorizontal, Upload, X, Zap, FolderOpen, Disc, CheckCircle2 } from 'lucide-react';

interface TrackLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSong: (deckId: 'A' | 'B', song: SongLibraryItem) => void;
  onFileUpload: (deckId: 'A' | 'B', file: File) => void;
  localTracks?: TrackData[];
  onLoadLocalTrack?: (deckId: 'A' | 'B', track: TrackData) => void;
}

export function TrackLibraryModal({
  isOpen,
  onClose,
  onLoadSong,
  onFileUpload,
  localTracks = [],
  onLoadLocalTrack,
}: TrackLibraryModalProps) {
  const [activeView, setActiveView] = useState<'local' | 'benchmarks'>(localTracks.length > 0 ? 'local' : 'benchmarks');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bpmFilter, setBpmFilter] = useState<'all' | 'slow' | 'mid' | 'house' | 'fast'>('all');
  const [isDragOver, setIsDragOver] = useState(false);
  const [targetDeckForUpload, setTargetDeckForUpload] = useState<'A' | 'B'>('A');

  const categories = [
    { id: 'all', label: 'All 50 Songs' },
    { id: 'afrobeat', label: 'Afrobeat & Riddims' },
    { id: 'dancehall', label: 'Dancehall & Reggae' },
    { id: 'house', label: 'House & Tech' },
    { id: 'techno', label: 'Techno & Trance' },
    { id: 'hiphop', label: 'Hip Hop & Trap' },
    { id: 'dnb', label: 'Drum & Bass' },
    { id: 'variable', label: 'Variable BPM & Drift' },
  ];

  const filteredSongs = useMemo(() => {
    return FIFTY_TEST_SONGS.filter((song) => {
      if (selectedCategory !== 'all' && song.category !== selectedCategory) {
        return false;
      }
      if (bpmFilter === 'slow' && song.bpm >= 90) return false;
      if (bpmFilter === 'mid' && (song.bpm < 90 || song.bpm >= 118)) return false;
      if (bpmFilter === 'house' && (song.bpm < 118 || song.bpm >= 130)) return false;
      if (bpmFilter === 'fast' && song.bpm < 130) return false;

      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchTitle = song.title.toLowerCase().includes(query);
        const matchArtist = song.artist.toLowerCase().includes(query);
        const matchGenre = song.genre.toLowerCase().includes(query);
        const matchBpm = song.bpm.toString().includes(query);
        return matchTitle || matchArtist || matchGenre || matchBpm;
      }

      return true;
    });
  }, [selectedCategory, bpmFilter, searchTerm]);

  // Handle Drag & Drop Files
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      onFileUpload(targetDeckForUpload, file);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-[#0e1117] border-2 border-neutral-700 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden text-neutral-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#090b0e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.4)]">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                <span>DJ MUSIC & AUDIO LIBRARY</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Load your own local songs (MP3, WAV, FLAC, M4A) or test with the 50-song benchmark suite
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher: MY LOCAL SONGS vs 50 BENCHMARK SONGS */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#12161f] border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('local')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                activeView === 'local'
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.5)]'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>LOAD LOCAL SONGS ({localTracks.length})</span>
            </button>

            <button
              onClick={() => setActiveView('benchmarks')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                activeView === 'benchmarks'
                  ? 'bg-emerald-950 border border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(0,255,102,0.5)]'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>50 TEST SONGS BENCHMARK</span>
            </button>
          </div>

          {/* Quick Target Deck selector for Upload */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-neutral-400">TARGET DECK:</span>
            <div className="flex items-center bg-neutral-900 rounded border border-neutral-800 p-0.5">
              <button
                onClick={() => setTargetDeckForUpload('A')}
                className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer ${
                  targetDeckForUpload === 'A' ? 'bg-cyan-600 text-white' : 'text-neutral-400'
                }`}
              >
                DECK A
              </button>
              <button
                onClick={() => setTargetDeckForUpload('B')}
                className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer ${
                  targetDeckForUpload === 'B' ? 'bg-red-600 text-white' : 'text-neutral-400'
                }`}
              >
                DECK B
              </button>
            </div>
          </div>
        </div>

        {/* VIEW 1: MY LOCAL SONGS */}
        {activeView === 'local' ? (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5">
            {/* Big Drag & Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`relative rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all ${
                isDragOver
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_30px_rgba(0,229,255,0.4)]'
                  : 'border-neutral-700 hover:border-neutral-500 bg-[#090b0e]'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-950 to-blue-900 border border-cyan-500/50 flex items-center justify-center mb-4 shadow-[0_0_16px_rgba(0,229,255,0.4)]">
                <Upload className="w-8 h-8 text-cyan-300" />
              </div>

              <h3 className="text-base font-bold text-white mb-1">
                Drag and drop your audio song files here
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mb-4 font-mono">
                Supports MP3, WAV, FLAC, M4A, AAC, OGG, AIFF. The MASAVU engine will automatically analyze the BPM, kick transients, and beatgrid.
              </p>

              {/* Click to browse button */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="cursor-pointer px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-[0_0_12px_rgba(0,229,255,0.5)] transition-all">
                  <FolderOpen className="w-4 h-4" />
                  <span>BROWSE FOR LOCAL AUDIO FILE</span>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.aiff"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onFileUpload(targetDeckForUpload, file);
                        onClose();
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Previously Loaded Local Songs in this session */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
                SESSION LOADED TRACKS ({localTracks.length})
              </span>

              {localTracks.length === 0 ? (
                <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 text-center text-xs font-mono text-neutral-500">
                  No local files uploaded yet in this session. Click "Browse for Local Audio File" above to pick your music!
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {localTracks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-[#090c10] border border-neutral-800 flex items-center justify-between hover:border-neutral-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                          <Music className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{t.title}</span>
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">
                            {t.bpm.toFixed(1)} BPM • {(t.duration).toFixed(1)}s
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (onLoadLocalTrack) onLoadLocalTrack('A', t);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-800 text-cyan-300 border border-cyan-700 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer"
                        >
                          LOAD TO DECK A
                        </button>
                        <button
                          onClick={() => {
                            if (onLoadLocalTrack) onLoadLocalTrack('B', t);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-red-950 hover:bg-red-800 text-red-300 border border-red-700 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer"
                        >
                          LOAD TO DECK B
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VIEW 2: 50 TEST BENCHMARK SONGS */
          <>
            {/* Search & Filters */}
            <div className="p-4 border-b border-neutral-800 bg-[#0c0f14] space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title, artist, genre, or BPM (e.g. 124, Wanjula, Dancehall)..."
                    className="w-full pl-9 pr-4 py-2 bg-[#090b0e] border border-neutral-700 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                {/* BPM Range Quick Filter */}
                <div className="flex items-center gap-1 bg-[#090b0e] p-1 rounded-lg border border-neutral-800 text-xs font-mono">
                  <span className="text-[10px] text-neutral-500 px-2 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" /> BPM:
                  </span>
                  {(['all', 'slow', 'mid', 'house', 'fast'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setBpmFilter(b)}
                      className={`px-2 py-1 rounded text-[11px] uppercase transition-colors cursor-pointer ${
                        bpmFilter === b
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {b === 'slow' ? '<90' : b === 'mid' ? '90-117' : b === 'house' ? '118-129' : b === 'fast' ? '130+' : 'All'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                        : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Songs List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-800/60 space-y-1">
              {filteredSongs.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-xs font-mono">
                  No test songs matched your search criteria.
                </div>
              ) : (
                filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    className="py-2.5 px-3 rounded-xl hover:bg-neutral-800/50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2.5 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: song.color }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-neutral-200 truncate">{song.title}</h4>
                          {song.variableBpm && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-pink-950 text-pink-300 border border-pink-800/50">
                              LIVE DRIFT
                            </span>
                          )}
                          {song.hasIntro && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/50">
                              INTRO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {song.artist} • <span className="text-neutral-500">{song.genre}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right font-mono">
                        <div className="text-sm font-black text-emerald-400">{song.bpm.toFixed(1)}</div>
                        <div className="text-[10px] text-neutral-500 uppercase">BPM</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            onLoadSong('A', song);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 bg-cyan-950 hover:bg-cyan-800 text-cyan-300 border border-cyan-800 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer"
                        >
                          DECK A
                        </button>
                        <button
                          onClick={() => {
                            onLoadSong('B', song);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 bg-amber-950 hover:bg-amber-800 text-amber-300 border border-amber-800 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer"
                        >
                          DECK B
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Footer with local upload hint */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-t border-neutral-800 bg-[#090b0e] text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Multi-Band Autocorrelation extracts exact BPM & first drop downbeat automatically</span>
          </div>

          <label className="cursor-pointer px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg flex items-center gap-1.5 transition-colors font-sans font-semibold">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Local Audio to Deck {targetDeckForUpload}</span>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.aiff"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onFileUpload(targetDeckForUpload, file);
                  onClose();
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
