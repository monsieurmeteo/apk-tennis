'use client';

import React, { useEffect, useState } from 'react';
import { Target, Activity, Zap, Play, Search, Filter, Star, Trophy } from 'lucide-react';
import { MatchCard } from '../components/dashboard/MatchCard';

interface MatchData {
  id: string;
  tournament: string;
  is_live: boolean;
  score_str: string;
  playerA: { name: string; rank: number; prob: number };
  playerB: { name: string; rank: number; prob: number };
  edge: number;
  targetPlayer: string;
}

export default function Dashboard() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'completed'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
        setIsConnected(true);
        setLastUpdate(new Date());
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error("Erreur Fetch:", err);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    // Premier fetch immédiat
    fetchMatches();
    
    // Charger les favoris depuis le localStorage
    try {
      const saved = localStorage.getItem('tennis_favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Erreur chargement favoris:", e);
    }
    
    // Polling toutes les 10 secondes pour les scores en direct
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, []);

  const onToggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id];
      try {
        localStorage.setItem('tennis_favorites', JSON.stringify(next));
      } catch (e) {
        console.error("Erreur sauvegarde favoris:", e);
      }
      return next;
    });
  };

  // Filter tournaments list from current active matches
  const uniqueTournaments = Array.from(
    new Set(matches.map(m => m.tournament))
  ).sort();

  // Détection si un match est terminé
  const isMatchCompleted = (m: MatchData) => {
    return !m.is_live && (
      m.score_str === 'Terminé' ||
      (m.score_str.includes('-') && !m.score_str.includes(':'))
    );
  };

  // Filter live, upcoming, and completed matches
  const liveMatches = matches.filter(m => m.is_live);
  const upcomingMatches = matches.filter(m => !m.is_live && !isMatchCompleted(m));
  const completedMatches = matches.filter(m => !m.is_live && isMatchCompleted(m));

  const liveCount = liveMatches.length;
  const upcomingCount = upcomingMatches.length;
  const completedCount = completedMatches.length;

  const filteredMatches = matches.filter(m => {
    // 1. Filter by active tab (live vs upcoming vs completed)
    const tabMatch = activeTab === 'live' 
      ? m.is_live 
      : activeTab === 'upcoming'
        ? (!m.is_live && !isMatchCompleted(m))
        : (!m.is_live && isMatchCompleted(m));
    if (!tabMatch) return false;

    // 2. Filter by Show only favorites toggle
    if (showOnlyFavorites && !favorites.includes(m.id)) return false;

    // 3. Filter by search query (player names or tournament)
    const q = searchQuery.toLowerCase().trim();
    const queryMatch = q === '' || 
      m.playerA.name.toLowerCase().includes(q) || 
      m.playerB.name.toLowerCase().includes(q) || 
      m.tournament.toLowerCase().includes(q);
    if (!queryMatch) return false;

    // 4. Filter by selected tournament dropdown
    const tournamentMatch = selectedTournament === '' || m.tournament === selectedTournament;
    if (!tournamentMatch) return false;

    return true;
  });

  // Helper to parse "HH:MM" into minutes from midnight for sorting upcoming matches
  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr || timeStr === 'À venir') return 9999;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        return hours * 60 + minutes;
      }
    }
    return 9999;
  };

  // Sort pinned favorites to the absolute top of the dashboard list
  // For upcoming matches, sort chronologically by scheduled time
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    // If both are favorites or both are not, sort by time if in upcoming tab
    if (activeTab === 'upcoming') {
      const timeA = parseTimeToMinutes(a.score_str);
      const timeB = parseTimeToMinutes(b.score_str);
      return timeA - timeB;
    }

    return 0;
  });

  return (
    <div className="p-4 space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-white">Modèles Statistiques Live</h2>
          <p className="text-slate-400 text-sm">Analyse de performance basée sur 28 000+ matchs.</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#00E676]/10 border border-[#00E676]/20 rounded-full">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00E676] animate-pulse' : 'bg-red-500'}`}></span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'text-[#00E676]' : 'text-red-500'}`}>
              {isConnected ? 'ACTIVE' : 'OFFLINE'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            {matches.length} Matchs en base
          </span>
        </div>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div 
          onClick={() => {
            setActiveTab('live');
            setSearchQuery('');
            setSelectedTournament('');
          }} 
          className={`bg-[#151A26] border p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${activeTab === 'live' ? 'border-[#00E676] bg-[#00E676]/5' : 'border-[#2A3245]'}`}
        >
          <div className="p-3 bg-[#00E676]/10 rounded-xl">
            <Activity className="text-[#00E676]" size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">En Direct</p>
            <p className="text-xl font-bold text-white">{liveCount}</p>
          </div>
        </div>
        <div 
          onClick={() => {
            setActiveTab('upcoming');
            setSearchQuery('');
            setSelectedTournament('');
          }} 
          className={`bg-[#151A26] border p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${activeTab === 'upcoming' ? 'border-sky-500 bg-sky-500/5' : 'border-[#2A3245]'}`}
        >
          <div className="p-3 bg-sky-500/10 rounded-xl">
            <Zap className="text-sky-400" size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">À Venir</p>
            <p className="text-xl font-bold text-white">{upcomingCount}</p>
          </div>
        </div>
        <div 
          onClick={() => {
            setActiveTab('completed');
            setSearchQuery('');
            setSelectedTournament('');
          }} 
          className={`bg-[#151A26] border p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all ${activeTab === 'completed' ? 'border-rose-500 bg-rose-500/5' : 'border-[#2A3245]'}`}
        >
          <div className="p-3 bg-rose-500/10 rounded-xl">
            <Trophy className="text-rose-400" size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Terminés</p>
            <p className="text-xl font-bold text-white">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Segmented Tab Control */}
      <div className="flex bg-[#151A26] border border-[#2A3245] p-1 rounded-xl gap-1">
        <button
          onClick={() => {
            setActiveTab('live');
            setSearchQuery('');
            setSelectedTournament('');
          }}
          className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'live' 
              ? 'bg-[#00E676] text-[#0B101A] shadow-[0_0_10px_rgba(0,230,118,0.3)]' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'live' ? 'bg-[#0B101A]' : 'bg-[#00E676] animate-pulse'}`}></span>
          <span>Direct ({liveCount})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('upcoming');
            setSearchQuery('');
            setSelectedTournament('');
          }}
          className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'upcoming' 
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_10px_rgba(14,165,233,0.3)]' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'upcoming' ? 'bg-slate-950' : 'bg-sky-400'}`}></span>
          <span>À Venir ({upcomingCount})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('completed');
            setSearchQuery('');
            setSelectedTournament('');
          }}
          className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'completed' 
              ? 'bg-rose-500 text-[#0B101A] shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'completed' ? 'bg-[#0B101A]' : 'bg-rose-500'}`}></span>
          <span>Terminés ({completedCount})</span>
        </button>
      </div>

      {/* Search and Tournament Filters */}
      <div className="flex flex-col md:flex-row gap-3 bg-[#151A26] border border-[#2A3245] p-3 rounded-xl">
        {/* Search by Player or Tournament */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A2233] text-white border border-[#2A3245] rounded-xl py-2 pl-9 pr-4 outline-none focus:border-[#00E676] transition-all text-xs font-semibold"
            placeholder="Rechercher un joueur ou tournoi..."
          />
        </div>

        {/* Filter by Tournament */}
        <div className="relative min-w-[180px]">
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="w-full bg-[#1A2233] text-white border border-[#2A3245] rounded-xl py-2 pl-3 pr-8 outline-none focus:border-[#00E676] transition-all text-xs font-semibold appearance-none cursor-pointer"
          >
            <option value="">Tous les tournois ({uniqueTournaments.length})</option>
            {uniqueTournaments.map((t, idx) => (
              <option key={idx} value={t}>{t}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <Filter size={14} />
          </div>
        </div>

        {/* Favoris Uniquement Button */}
        <button
          onClick={() => setShowOnlyFavorites(prev => !prev)}
          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
            showOnlyFavorites 
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
              : 'bg-[#1A2233] text-slate-400 border-[#2A3245] hover:text-amber-400 hover:border-amber-400/50'
          }`}
        >
          <Star size={14} className={showOnlyFavorites ? 'fill-slate-950 text-slate-950 animate-pulse' : 'text-amber-400'} />
          <span>Favoris {favorites.length > 0 ? `(${favorites.length})` : ''}</span>
        </button>
      </div>

      {/* Dynamic Match List */}
      <div className="space-y-4 pb-10">
        {!isConnected && matches.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            Connexion au serveur de statistiques...
          </div>
        ) : sortedMatches.length > 0 ? (
          sortedMatches.map((match) => (
            <MatchCard 
              key={match.id} 
              match={match} 
              isFavorited={favorites.includes(match.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))
        ) : (
          <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
            {showOnlyFavorites ? (
              <>
                <Star className="text-amber-400 animate-pulse fill-amber-400/20" size={24} />
                <p className="text-sm font-semibold text-white">Aucun favori pour le moment</p>
                <p className="text-xs text-slate-400 max-w-xs">Cliquez sur l'étoile dorée d'un match pour l'ajouter à vos favoris et le suivre en temps réel.</p>
              </>
            ) : activeTab === 'live' ? (
              <>
                <Play className="text-[#00E676] animate-pulse" size={24} />
                <p className="text-sm font-semibold text-white">Aucun match en direct correspondant</p>
                <p className="text-xs text-slate-400 max-w-xs">Modifiez votre recherche ou sélectionnez "Tous les tournois" pour voir s'il y a d'autres matchs en cours.</p>
              </>
            ) : activeTab === 'upcoming' ? (
              <>
                <Zap className="text-sky-400" size={24} />
                <p className="text-sm font-semibold text-white">Aucun match prévu correspondant</p>
                <p className="text-xs text-slate-400 max-w-xs">Aucun match ne correspond aux filtres appliqués dans l'onglet "À Venir".</p>
              </>
            ) : (
              <>
                <Trophy className="text-rose-400" size={24} />
                <p className="text-sm font-semibold text-white">Aucun match terminé correspondant</p>
                <p className="text-xs text-slate-400 max-w-xs">Aucun match ne correspond aux filtres appliqués dans l'onglet "Terminés".</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
