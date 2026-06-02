'use client';

import React, { useState, useEffect } from 'react';
import { Search, Trophy, TrendingUp, Percent, Info, Activity, Users, BarChart2 } from 'lucide-react';

interface StatsData {
  h2h: {
    winsA: number;
    winsB: number;
    matches: { winner: string; loser: string; tournament: string; surface: string; date: string; score: string; round: string }[];
  };
  formA: { winner_name: string; loser_name: string; tourney_name: string; tourney_date: string; surface: string; won: boolean }[];
  formB: { winner_name: string; loser_name: string; tourney_name: string; tourney_date: string; surface: string; won: boolean }[];
  surfaceA: { wins: number; losses: number; total: number; pct: number } | null;
  surfaceB: { wins: number; losses: number; total: number; pct: number } | null;
  averagesA: { avgAces: number; avgDf: number; avg1stServ: number; totalMatches: number };
  averagesB: { avgAces: number; avgDf: number; avg1stServ: number; totalMatches: number };
  eloA?: { general: number; clay: number; grass: number; hard: number };
  eloB?: { general: number; clay: number; grass: number; hard: number };
  surface: string;
}

function FormBadge({ won }: { won: boolean }) {
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${won ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
      {won ? 'V' : 'D'}
    </span>
  );
}

// Reusable Autocomplete Input
interface PlayerSearchInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

function PlayerSearchInput({ label, value, onChange, placeholder }: PlayerSearchInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.players || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [value]);

  return (
    <div className="relative">
      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-3.5 text-slate-500" size={16} />
        <input 
          type="text" 
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          className="w-full bg-[#1A2233] text-white border border-[#2A3245] rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-[#00E676] transition-all text-sm font-semibold"
          placeholder={placeholder}
        />
      </div>

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-[#151A26] border border-[#2A3245] rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-[#2A3245]/40">
          {suggestions.map((name, idx) => (
            <li 
              key={idx}
              onMouseDown={() => {
                onChange(name);
                setShowDropdown(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#00E676]/10 hover:text-[#00E676] cursor-pointer transition-colors"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Compute real statistical win probability
function computeStatsProbability(stats: StatsData) {
  // Use exact Elo formula to match the dashboard and backend
  if (stats.eloA && stats.eloB && stats.eloA.general && stats.eloB.general) {
    const probA = 1.0 / (1.0 + Math.pow(10, (stats.eloB.general - stats.eloA.general) / 400.0));
    const finalProbA = Math.round(probA * 100);
    return { probA: finalProbA, probB: 100 - finalProbA, isFallback: false };
  }
  
  return { probA: 50, probB: 50, isFallback: true };
}

export default function ComparePage() {
  const [playerA, setPlayerA] = useState('Carlos Alcaraz');
  const [playerB, setPlayerB] = useState('Jannik Sinner');
  const [surface, setSurface] = useState('Clay');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    if (!playerA.trim() || !playerB.trim()) {
      setError('Veuillez entrer le nom des deux joueurs.');
      return;
    }
    setLoading(true);
    setError('');
    setStats(null);

    try {
      const res = await fetch(`/api/player-stats?playerA=${encodeURIComponent(playerA.trim())}&playerB=${encodeURIComponent(playerB.trim())}&surface=${surface}`);
      if (res.ok) {
        const data = await res.json();
        // Check if we actually found any records (H2H, form or surface stats should exist)
        const hasData = data.h2h.winsA > 0 || data.h2h.winsB > 0 || data.formA.length > 0 || data.formB.length > 0 || data.surfaceA || data.surfaceB;
        if (hasData) {
          setStats(data);
        } else {
          setError('Aucune donnée trouvée pour ces joueurs dans la base de 28 000+ matchs.');
        }
      } else {
        setError('Erreur lors du calcul des statistiques.');
      }
    } catch (err) {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const probData = stats ? computeStatsProbability(stats) : null;

  return (
    <div className="p-4 space-y-6 min-h-screen bg-[#0B101A] text-slate-100 pb-24">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-white">Comparateur Head-to-Head (H2H)</h2>
        <p className="text-slate-400 text-sm">Comparez deux joueurs sur la base de 28 000+ matchs réels.</p>
      </div>

      {/* Selector Form */}
      <div className="bg-[#151A26] border border-[#2A3245] rounded-2xl p-4 space-y-4">
        
        {/* Player A Search */}
        <PlayerSearchInput 
          label="Joueur A"
          value={playerA}
          onChange={setPlayerA}
          placeholder="Entrez un nom (ex: Alcaraz...)"
        />
        
        <div className="flex justify-center">
          <div className="bg-[#2A3245] px-4 py-1 rounded-full text-slate-300 text-[10px] font-bold uppercase tracking-widest">
            VS
          </div>
        </div>

        {/* Player B Search */}
        <PlayerSearchInput 
          label="Joueur B"
          value={playerB}
          onChange={setPlayerB}
          placeholder="Entrez un nom (ex: Sinner...)"
        />

        {/* Surface Selection */}
        <div>
          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Surface du Match</label>
          <div className="grid grid-cols-3 gap-2">
            {['Hard', 'Clay', 'Grass'].map((s) => (
              <button
                key={s}
                onClick={() => setSurface(s)}
                type="button"
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${surface === s ? 'bg-[#00E676]/10 border-[#00E676] text-[#00E676]' : 'bg-[#1A2233] border-[#2A3245] text-slate-400 hover:border-slate-500'}`}
              >
                {s === 'Hard' ? 'Dur' : s === 'Clay' ? 'Terre Battue' : 'Gazon'}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleCompare}
          disabled={loading}
          className="w-full py-3 bg-[#00E676] hover:bg-[#00c867] text-[#0B101A] rounded-xl font-bold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,230,118,0.3)] mt-2"
        >
          {loading ? 'Analyse des statistiques...' : 'Comparer les Statistiques Réelles'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-xs font-semibold text-center">
          ⚠️ {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00E676] border-t-transparent animate-spin"></div>
          <span className="text-xs text-slate-400">Scan de la base de données tennis en cours...</span>
        </div>
      )}

      {/* Results View */}
      {stats && probData && (
        <div className="space-y-6 animate-fadeIn">

          {/* Statistical Win Probability Card */}
          <div className="bg-gradient-to-br from-[#00E676]/5 to-[#00E676]/10 border border-[#00E676]/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-[#00E676]" size={20} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Indice de Probabilité Réelle</h3>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="text-center w-[45%]">
                <span className="block text-3xl font-extrabold text-[#00E676]">{probData.probA}%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate block mt-1">{playerA}</span>
              </div>
              <div className="h-10 w-px bg-[#2A3245]"></div>
              <div className="text-center w-[45%]">
                <span className="block text-3xl font-extrabold text-slate-300">{probData.probB}%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate block mt-1">{playerB}</span>
              </div>
            </div>

            <div className="h-1.5 bg-[#2A3245] rounded-full overflow-hidden flex gap-0.5">
              <div className="bg-[#00E676] rounded-l-full" style={{ width: `${probData.probA}%` }}></div>
              <div className="bg-slate-500 rounded-r-full" style={{ width: `${probData.probB}%` }}></div>
            </div>

            <p className="text-[10px] text-slate-400 text-center font-mono uppercase tracking-wider">
              📊 Calculé à partir des performances réelles des 5 dernières années
            </p>
          </div>

          {/* H2H Results */}
          <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#00E676]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Confrontations Directes</h3>
            </div>
            
            <div className="flex justify-between items-center text-center">
              <div className="w-[35%]">
                <p className="text-3xl font-extrabold text-[#00E676]">{stats.h2h.winsA}</p>
                <p className="text-[10px] text-slate-400 font-bold truncate mt-1">{playerA}</p>
              </div>
              <div className="w-[30%]">
                <span className="text-[11px] font-bold text-slate-500">{stats.h2h.winsA + stats.h2h.winsB} Matches</span>
              </div>
              <div className="w-[35%]">
                <p className="text-3xl font-extrabold text-slate-300">{stats.h2h.winsB}</p>
                <p className="text-[10px] text-slate-400 font-bold truncate mt-1">{playerB}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-[#2A3245] pt-3">
              {stats.h2h.matches.length > 0 ? (
                stats.h2h.matches.map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 text-xs">
                    <span className="text-slate-400 truncate max-w-[60%]">{m.tournament} ({m.surface})</span>
                    <span className={`font-semibold ${m.winner.toLowerCase().includes(playerA.split(' ').pop()?.toLowerCase() || '') ? 'text-[#00E676]' : 'text-slate-300'}`}>
                      {m.winner.split(' ').pop()} • {m.score}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">Aucun historique de match direct récent.</p>
              )}
            </div>
          </div>

          {/* Form comparison */}
          <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#00E676]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Forme Récente</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-bold mb-2 truncate">{playerA}</p>
                <div className="flex gap-1.5">
                  {stats.formA.length > 0 ? (
                    stats.formA.map((m, i) => <FormBadge key={i} won={m.won} />)
                  ) : (
                    <span className="text-xs text-slate-500">Aucune donnée récente</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold mb-2 truncate">{playerB}</p>
                <div className="flex gap-1.5">
                  {stats.formB.length > 0 ? (
                    stats.formB.map((m, i) => <FormBadge key={i} won={m.won} />)
                  ) : (
                    <span className="text-xs text-slate-500">Aucune donnée récente</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Moyennes de jeu détaillées */}
          {stats && (stats.averagesA && stats.averagesB) && (
            <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-[#00E676]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Statistiques Moyennes du Serveur</h3>
              </div>
              
              <div className="space-y-4 pt-1">
                {/* Aces */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">Aces moyens / match</span>
                    <div className="flex gap-4 font-mono font-bold">
                      <span className={stats.averagesA.avgAces >= stats.averagesB.avgAces ? "text-[#00E676]" : "text-slate-300"}>{stats.averagesA.avgAces}</span>
                      <span className="text-slate-500">vs</span>
                      <span className={stats.averagesB.avgAces >= stats.averagesA.avgAces ? "text-[#00E676]" : "text-slate-300"}>{stats.averagesB.avgAces}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#2A3245] rounded-full overflow-hidden flex gap-0.5">
                    <div className="bg-[#00E676] rounded-l-full" style={{ width: `${(stats.averagesA.avgAces / (stats.averagesA.avgAces + stats.averagesB.avgAces || 1)) * 100}%` }}></div>
                    <div className="bg-slate-500 rounded-r-full" style={{ width: `${(stats.averagesB.avgAces / (stats.averagesA.avgAces + stats.averagesB.avgAces || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* Double Faults */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">Double-fautes / match</span>
                    <div className="flex gap-4 font-mono font-bold">
                      <span className={stats.averagesA.avgDf <= stats.averagesB.avgDf ? "text-[#00E676]" : "text-slate-300"}>{stats.averagesA.avgDf}</span>
                      <span className="text-slate-500">vs</span>
                      <span className={stats.averagesB.avgDf <= stats.averagesA.avgDf ? "text-[#00E676]" : "text-slate-300"}>{stats.averagesB.avgDf}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#2A3245] rounded-full overflow-hidden flex gap-0.5">
                    <div className={stats.averagesA.avgDf <= stats.averagesB.avgDf ? "bg-[#00E676] rounded-l-full" : "bg-slate-500 rounded-l-full"} style={{ width: `${(stats.averagesA.avgDf / (stats.averagesA.avgDf + stats.averagesB.avgDf || 1)) * 100}%` }}></div>
                    <div className={stats.averagesB.avgDf < stats.averagesA.avgDf ? "bg-[#00E676] rounded-r-full" : "bg-slate-500 rounded-r-full"} style={{ width: `${(stats.averagesB.avgDf / (stats.averagesA.avgDf + stats.averagesB.avgDf || 1)) * 100}%` }}></div>
                  </div>
                </div>

                {/* First Serve In */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">% 1er service réussi</span>
                    <div className="flex gap-4 font-mono font-bold">
                      <span className={stats.averagesA.avg1stServ >= stats.averagesB.avg1stServ ? "text-[#00E676]" : "text-slate-300"}>{stats.averagesA.avg1stServ}%</span>
                      <span className="text-slate-500">vs</span>
                      <span className={stats.averagesB.avg1stServ >= stats.averagesA.avg1stServ ? "text-[#00E676]" : "text-slate-300"}>{stats.averagesB.avg1stServ}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#2A3245] rounded-full overflow-hidden flex gap-0.5">
                    <div className="bg-[#00E676] rounded-l-full" style={{ width: `${(stats.averagesA.avg1stServ / (stats.averagesA.avg1stServ + stats.averagesB.avg1stServ || 1)) * 100}%` }}></div>
                    <div className="bg-slate-500 rounded-r-full" style={{ width: `${(stats.averagesB.avg1stServ / (stats.averagesA.avg1stServ + stats.averagesB.avg1stServ || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Surface Winrates */}
          <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#00E676]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Performance sur {surface === 'Clay' ? 'Terre Battue' : surface === 'Grass' ? 'Gazon' : 'Dur'}</h3>
            </div>

            <div className="space-y-4">
              {stats.surfaceA ? (
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-300 truncate max-w-[65%]">{playerA}</span>
                    <span className="text-[#00E676]">{stats.surfaceA.pct}% ({stats.surfaceA.wins}V/{stats.surfaceA.losses}D)</span>
                  </div>
                  <div className="h-1.5 bg-[#2A3245] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00E676]" style={{ width: `${stats.surfaceA.pct}%` }}></div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">{playerA} : Pas de statistiques sur cette surface.</p>
              )}

              {stats.surfaceB ? (
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-300 truncate max-w-[65%]">{playerB}</span>
                    <span className="text-slate-400">{stats.surfaceB.pct}% ({stats.surfaceB.wins}V/{stats.surfaceB.losses}D)</span>
                  </div>
                  <div className="h-1.5 bg-[#2A3245] rounded-full overflow-hidden">
                    <div className="h-full bg-slate-500" style={{ width: `${stats.surfaceB.pct}%` }}></div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">{playerB} : Pas de statistiques sur cette surface.</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
