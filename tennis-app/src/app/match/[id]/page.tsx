'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Activity, TrendingUp, Users, BarChart2 } from 'lucide-react';

interface MatchData {
  id: string;
  tournament: string;
  is_live: boolean;
  score_str: string;
  playerA: { name: string; rank: number; prob: number };
  playerB: { name: string; rank: number; prob: number };
  edge: number;
  targetPlayer: string;
  live_stats?: {
    serving_player?: string;
    stats?: Record<string, { home: string; away: string }> | null;
  } | null;
}

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
  surface: string;
  eloA?: { name: string; general: number; hard: number; clay: number; grass: number };
  eloB?: { name: string; general: number; hard: number; clay: number; grass: number };
}

function FormBadge({ won }: { won: boolean }) {
  return (
    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${won ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
      {won ? 'V' : 'D'}
    </span>
  );
}

// Dynamically detect surface from tournament name
function detectSurface(tournament: string): string {
  const t = tournament.toLowerCase();
  if (t.includes('french open') || t.includes('roland garros') || t.includes('clay') || t.includes('terre') || t.includes('perugia') || t.includes('foggia') || t.includes('rome') || t.includes('madrid') || t.includes('valencia')) {
    return 'Clay';
  }
  if (t.includes('wimbledon') || t.includes('grass') || t.includes('gazon') || t.includes('halle') || t.includes('queen') || t.includes('stuttgart') || t.includes('eastbourne')) {
    return 'Grass';
  }
  return 'Hard';
}

// Compute real statistical win probability
function computeStatsProbability(stats: StatsData, defaultA: number) {
  let weightH2H = 0;
  let valH2H = 0.5;
  const totalH2H = stats.h2h.winsA + stats.h2h.winsB;
  if (totalH2H > 0) {
    weightH2H = 0.15; // 15% weight
    valH2H = stats.h2h.winsA / totalH2H;
  }

  let weightForm = 0;
  let valForm = 0.5;
  const winsFormA = stats.formA.filter(m => m.won).length;
  const winsFormB = stats.formB.filter(m => m.won).length;
  if (stats.formA.length > 0 || stats.formB.length > 0) {
    weightForm = 0.25; // 25% weight
    const pctA = stats.formA.length > 0 ? winsFormA / stats.formA.length : 0.5;
    const pctB = stats.formB.length > 0 ? winsFormB / stats.formB.length : 0.5;
    const sum = pctA + pctB;
    valForm = sum > 0 ? pctA / sum : 0.5;
  }

  let weightSurface = 0;
  let valSurface = 0.5;
  if (stats.surfaceA && stats.surfaceB) {
    weightSurface = 0.30; // 30% weight
    const pctA = stats.surfaceA.pct / 100;
    const pctB = stats.surfaceB.pct / 100;
    const sum = pctA + pctB;
    valSurface = sum > 0 ? pctA / sum : 0.5;
  } else if (stats.surfaceA) {
    weightSurface = 0.15;
    valSurface = stats.surfaceA.pct / 100;
  } else if (stats.surfaceB) {
    weightSurface = 0.15;
    valSurface = 1 - (stats.surfaceB.pct / 100);
  }

  // 4. ELO Ratings Factor (General + Surface specific)
  let weightElo = 0;
  let valElo = 0.5;
  if (stats.eloA && stats.eloB) {
    weightElo = 0.30; // 30% weight
    
    // Compute general Elo probability
    const probGeneralA = 1.0 / (1.0 + Math.pow(10, (stats.eloB.general - stats.eloA.general) / 400.0));
    
    // Compute surface Elo probability
    const getSurfElo = (eloObj: any) => {
      const s = stats.surface.toLowerCase();
      if (s.includes('clay')) return eloObj.clay;
      if (s.includes('grass')) return eloObj.grass;
      return eloObj.hard;
    };
    const eloSurfA = getSurfElo(stats.eloA);
    const eloSurfB = getSurfElo(stats.eloB);
    const probSurfaceA = 1.0 / (1.0 + Math.pow(10, (eloSurfB - eloSurfA) / 400.0));
    
    // Combined Elo expected win rate (70% Surface ELO, 30% General ELO)
    valElo = 0.7 * probSurfaceA + 0.3 * probGeneralA;
  }

  const totalWeight = weightH2H + weightForm + weightSurface + weightElo;
  if (totalWeight === 0) {
    return { probA: defaultA, probB: 100 - defaultA, isFallback: true };
  }

  const rawProbA = (weightH2H * valH2H + weightForm * valForm + weightSurface * valSurface + weightElo * valElo) / totalWeight;
  const scale = 0.6; // pull slightly towards 50% for realistic sports predictions
  const balancedProbA = rawProbA * scale + 0.5 * (1.0 - scale);
  const finalProbA = Math.round(balancedProbA * 100);
  return { probA: finalProbA, probB: 100 - finalProbA, isFallback: false };
}

export default function MatchDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;
  const [match, setMatch] = useState<MatchData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [polymarketMarket, setPolymarketMarket] = useState<any | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tennis_favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Erreur chargement favoris:", e);
    }
  }, []);

  const onToggleFavorite = () => {
    if (!id) return;
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

  const isFavorited = favorites.includes(id);

  // Algorithme d'Aide à la Décision pour les Paris Sportifs
  const getDecisionSupport = () => {
    if (!match) {
      return {
        reliability: 'Modérée',
        reliabilityColor: 'text-slate-400 border-[#2A3245] bg-slate-900/40',
        safetyGlow: 'rgba(255,255,255,0.02)',
        explanation: 'En attente des données du match...',
        adviceList: ['💡 Conseil : Chargement des statistiques de jeu...']
      };
    }

    const edgeVal = Math.round(match.edge);
    let reliability = 'Modérée';
    let reliabilityColor = 'text-sky-400 border-sky-400/20 bg-sky-500/5';
    let safetyGlow = 'rgba(14,165,233,0.15)';
    let explanation = 'Match équilibré sur le papier. Les statistiques historiques ne révèlent pas d\'écart majeur.';

    if (edgeVal > 20) {
      reliability = 'Excellente (Value Forte)';
      reliabilityColor = 'text-rose-500 border-rose-500/20 bg-rose-500/5';
      safetyGlow = 'rgba(244,63,94,0.2)';
      explanation = `Indice de confiance maximal. Le modèle statistique indique un écart de +${edgeVal}% sur la probabilité de victoire réelle par rapport au marché.`;
    } else if (edgeVal > 12) {
      reliability = 'Élevée';
      reliabilityColor = 'text-amber-400 border-amber-400/20 bg-amber-400/5';
      safetyGlow = 'rgba(245,158,11,0.2)';
      explanation = `Bonne opportunité. La valeur estimée à +${edgeVal}% représente un rapport gain/risque statistiquement très favorable sur le long terme.`;
    } else {
      reliability = 'Modérée';
      reliabilityColor = 'text-slate-400 border-[#2A3245] bg-slate-900/40';
      safetyGlow = 'rgba(255,255,255,0.02)';
      explanation = 'Écart statistique faible. Match propice à une observation en direct (Live Betting) plutôt qu\'un pari pré-match.';
    }

    // Conseils dynamiques basés sur les statistiques réelles
    const adviceList: string[] = [];

    // 1. Analyse basée sur la surface
    if (stats) {
      if (stats.surfaceA && stats.surfaceB) {
        const diffSurface = Math.abs(stats.surfaceA.pct - stats.surfaceB.pct);
        if (diffSurface > 15) {
          const specialist = stats.surfaceA.pct > stats.surfaceB.pct ? match.playerA.name : match.playerB.name;
          adviceList.push(`🌾 Spécialiste surface : ${specialist} affiche une nette supériorité historique sur ${surface} (+${Math.round(diffSurface)}% de victoires).`);
        }
      }

      // 2. Analyse H2H
      if (stats.h2h && stats.h2h.winsA + stats.h2h.winsB >= 3) {
        const total = stats.h2h.winsA + stats.h2h.winsB;
        const diffH2H = Math.abs(stats.h2h.winsA - stats.h2h.winsB);
        if (diffH2H / total > 0.5) {
          const leader = stats.h2h.winsA > stats.h2h.winsB ? match.playerA.name : match.playerB.name;
          adviceList.push(`⚔️ Ascendant H2H : ${leader} domine largement les confrontations directes (H2H: ${stats.h2h.winsA}-${stats.h2h.winsB}).`);
        }
      }

      // 3. Analyse Forme
      if (stats.formA && stats.formB) {
        const formWinsA = stats.formA.filter(m => m.won).length;
        const formWinsB = stats.formB.filter(m => m.won).length;
        if (formWinsA >= 4 && formWinsB <= 2) {
          adviceList.push(`📈 Dynamique opposée : ${match.playerA.name} est sur une excellente série de victoires, tandis que ${match.playerB.name} montre des signes de fébrilité.`);
        } else if (formWinsB >= 4 && formWinsA <= 2) {
          adviceList.push(`📈 Dynamique opposée : ${match.playerB.name} est sur une excellente série de victoires, tandis que ${match.playerA.name} montre des signes de fébrilité.`);
        }
      }

      // 4. Analyse Serveur
      if (stats.averagesA && stats.averagesB) {
        if (stats.averagesA.avgAces >= 8 && stats.averagesB.avgAces >= 8) {
          adviceList.push(`🎯 Duel de Serveurs : Grand nombre d'aces prévu. Privilégier les paris sur un nombre élevé de jeux (Over Jeux).`);
        } else if (stats.averagesA.avgAces >= 10) {
          adviceList.push(`🎯 Canonnier : ${match.playerA.name} sert en moyenne ${stats.averagesA.avgAces} aces/match. Très solide sur ses engagements.`);
        } else if (stats.averagesB.avgAces >= 10) {
          adviceList.push(`🎯 Canonnier : ${match.playerB.name} sert en moyenne ${stats.averagesB.avgAces} aces/match. Très solide sur ses engagements.`);
        }
      }

      // 5. Analyse ELO (Force Réelle)
      if (stats.eloA && stats.eloB) {
        const getSurfElo = (eloObj: any) => {
          const s = surface.toLowerCase();
          if (s.includes('clay')) return eloObj.clay;
          if (s.includes('grass')) return eloObj.grass;
          return eloObj.hard;
        };
        const eloSurfA = getSurfElo(stats.eloA);
        const eloSurfB = getSurfElo(stats.eloB);
        const diffElo = Math.abs(eloSurfA - eloSurfB);
        
        if (diffElo > 80) {
          const superior = eloSurfA > eloSurfB ? match.playerA.name : match.playerB.name;
          adviceList.push(`📈 Force ELO Réelle : ${superior} a une supériorité ELO massive de +${Math.round(diffElo)} points sur ${surface}, indiquant un niveau de tennis bien supérieur sur cette surface.`);
        } else if (diffElo < 30) {
          adviceList.push(`⚖️ Niveau ELO Proche : Les deux joueurs ont un classement ELO extrêmement serré sur cette surface (écart de ${Math.round(diffElo)} pts). Duel très disputé à prévoir.`);
        }
      }
    }

    // 5. Conseils Live Betting en direct
    if (match.is_live && match.live_stats?.stats) {
      const getStatValue = (name: string, side: 'home' | 'away') => {
        const item = match.live_stats?.stats?.[name];
        if (!item) return 0;
        const valStr = side === 'home' ? item.home : item.away;
        return parseInt(valStr) || 0;
      };

      const acesA = getStatValue('Aces', 'home') || getStatValue('Aces/Service', 'home');
      const acesB = getStatValue('Aces', 'away') || getStatValue('Aces/Service', 'away');
      const dfA = getStatValue('Double faults', 'home') || getStatValue('Double-fautes', 'home');
      const dfB = getStatValue('Double faults', 'away') || getStatValue('Double-fautes', 'away');

      if (dfA >= 4 && match.live_stats.serving_player === 'A') {
        adviceList.push(`⚠️ Alerte Service : ${match.playerA.name} commet trop de double-fautes (${dfA}). Danger sur son service en cours.`);
      }
      if (dfB >= 4 && match.live_stats.serving_player === 'B') {
        adviceList.push(`⚠️ Alerte Service : ${match.playerB.name} commet trop de double-fautes (${dfB}). Danger sur son service en cours.`);
      }

      if (acesA >= 5 && acesB >= 5) {
        adviceList.push(`⚡ Live Aces : Déjà un duel de serveurs en direct (Aces: ${acesA} vs ${acesB}). Scénario idéal pour des tie-breaks.`);
      }
    }

    // Par défaut si la liste est vide
    if (adviceList.length === 0) {
      adviceList.push("💡 Conseil : Suivre le 1er set en direct pour évaluer la vitesse de la surface et la qualité du retour de service avant de vous engager.");
    }

    return { reliability, reliabilityColor, safetyGlow, explanation, adviceList };
  };

  useEffect(() => {
    const fetchAll = async () => {
      if (!id) return;
      // Fetch match data
      try {
        const res = await fetch('/api/matches');
        if (res.ok) {
          const data = await res.json();
          const found = data.matches?.find((m: MatchData) => m.id === id);
          if (found) {
            setMatch(found);
            setLoading(false);

            // Dynamically detect the surface
            const detectedSurf = detectSurface(found.tournament);

            // Fetch historical stats once we have player names and surface
            const statsRes = await fetch(
              `/api/player-stats?playerA=${encodeURIComponent(found.playerA.name)}&playerB=${encodeURIComponent(found.playerB.name)}&surface=${detectedSurf}`
            );
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              setStats(statsData);
            }

            // Fetch Polymarket data and find a matching market
            try {
              const polyRes = await fetch('/api/polymarket');
              if (polyRes.ok) {
                const polyData = await polyRes.json();
                const matchedPoly = polyData.markets?.find((m: any) => m.matchedMatchId === found.id);
                if (matchedPoly) {
                  setPolymarketMarket(matchedPoly);
                }
              }
            } catch (e) {
              console.error("Error fetching Polymarket for match:", e);
            }
          } else {
            setNotFound(true);
            setLoading(false);
          }
        }
      } catch (err) {
        setLoading(false);
        setNotFound(true);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B101A] text-slate-100 flex flex-col items-center justify-center pb-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#00E676] border-t-transparent animate-spin mb-4"></div>
        <p className="text-gray-400">Chargement des données statistiques...</p>
      </div>
    );
  }

  if (notFound || !match) {
    return (
      <div className="min-h-screen bg-[#0B101A] text-slate-100 flex flex-col items-center justify-center pb-20 gap-4">
        <p className="text-gray-400">Match introuvable.</p>
        <Link href="/" className="text-[#00E676] text-sm underline">Retour au tableau de bord</Link>
      </div>
    );
  }

  const surface = detectSurface(match.tournament);
  const probData = stats ? computeStatsProbability(stats, match.playerA.prob) : { probA: match.playerA.prob, probB: match.playerB.prob, isFallback: true };
  const isTargetA = match.targetPlayer === 'A';

  return (
    <div className="min-h-screen bg-[#0B101A] text-slate-100 pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-[#111723] border-b border-[#2A3245]">
        <Link href="/" className="p-1 -ml-1 text-white hover:text-gray-300">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-base font-bold text-white truncate max-w-[60%] text-center">
          {match.playerA.name} <span className="text-gray-500">vs</span> {match.playerB.name}
        </h1>
        <button 
          onClick={onToggleFavorite}
          className="p-1 -mr-1 text-slate-400 hover:text-amber-400 active:scale-90 transition-all cursor-pointer"
          title={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Star 
            size={22} 
            className={`transition-all duration-200 ${isFavorited ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] scale-110' : 'text-slate-400 hover:text-amber-300 hover:scale-105'}`}
          />
        </button>
      </header>

      <main className="p-4 space-y-4">

        {/* Score Card */}
        <div className={`bg-gradient-to-br from-[#151A26] via-[#151A26] to-[#1E2536] border ${match.edge > 20 ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : match.edge > 12 ? 'border-[#00E676]/40 shadow-[0_0_20px_rgba(0,230,118,0.05)]' : 'border-[#2A3245]'} rounded-2xl p-5 relative overflow-hidden`}>
          
          {/* Radial glow subtle effect */}
          {match.edge > 12 && (
            <div className={`absolute -right-20 -top-20 w-44 h-44 rounded-full ${match.edge > 20 ? 'bg-amber-500/5' : 'bg-[#00E676]/5'} blur-3xl pointer-events-none`}></div>
          )}

          {/* Value Badges */}
          {match.edge > 20 ? (
            <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-slate-950 text-[9px] font-extrabold px-3 py-1 rounded-bl-xl shadow-[0_4px_12px_rgba(245,158,11,0.3)] tracking-wider uppercase z-10 flex items-center gap-1">
              🔥 VALUE SUPRÊME (+{Math.round(match.edge)}%)
            </div>
          ) : match.edge > 12 ? (
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#00E676] to-sky-500 text-slate-950 text-[9px] font-extrabold px-3 py-1 rounded-bl-xl shadow-[0_4px_12px_rgba(0,230,118,0.2)] tracking-wider uppercase z-10">
              ⭐ EXCELLENTE VALUE (+{Math.round(match.edge)}%)
            </div>
          ) : null}

          <div className="flex justify-between items-center mb-5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate max-w-[65%]">
              {match.tournament} • Surface : <span className="text-sky-400 font-extrabold">{surface}</span>
            </span>
            {match.is_live ? (
              <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#00E676]/10 border border-[#00E676]/30">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00E676]"></span>
                </span>
                <span className="text-[9px] font-extrabold text-[#00E676] uppercase tracking-wider animate-pulse">LIVE</span>
              </div>
            ) : (
              <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">UPCOMING</span>
            )}
          </div>

          <div className="flex justify-between items-center mb-2">
            {/* Player A */}
            <div className="flex flex-col items-center gap-2.5 w-[38%]">
              <div className={`w-16 h-16 rounded-full bg-slate-800/80 border-2 ${isTargetA ? 'border-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.15)]' : 'border-[#2A3245]'} flex items-center justify-center text-2xl transition-all`}>🎾</div>
              <div className="flex flex-col items-center gap-1.5">
                <p className={`font-extrabold text-sm text-center leading-tight transition-colors ${isTargetA ? 'text-[#00E676]' : 'text-white'}`}>{match.playerA.name}</p>
                {match.playerA.rank > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-mono tracking-wider shrink-0">
                    Rang #{match.playerA.rank}
                  </span>
                )}
              </div>
              {match.is_live && match.live_stats?.serving_player === 'A' && (
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 shadow-[0_0_12px_rgba(250,204,21,0.5)] uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0">
                  🎾 SERVICE
                </span>
              )}
            </div>

            {/* Score */}
            <div className="flex flex-col items-center w-[24%] justify-center">
              {match.is_live ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="text-sm font-mono font-extrabold bg-slate-950/80 px-3 py-1.5 rounded-xl text-white border border-[#00E676]/40 shadow-[0_0_15px_rgba(0,230,118,0.1)] text-center tracking-wide min-w-[70px]">
                    {match.score_str.replace(/,/g, ' |')}
                  </div>
                  <span className="text-[8px] font-extrabold text-[#00E676] uppercase tracking-widest animate-pulse">Temps réel</span>
                </div>
              ) : (
                <div className="text-xs font-mono font-bold bg-[#1A2233] px-3 py-1.5 rounded-xl text-slate-400 border border-[#2A3245] text-center tracking-wider">
                  {match.score_str}
                </div>
              )}
            </div>

            {/* Player B */}
            <div className="flex flex-col items-center gap-2.5 w-[38%]">
              <div className={`w-16 h-16 rounded-full bg-slate-800/80 border-2 ${!isTargetA ? 'border-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.15)]' : 'border-[#2A3245]'} flex items-center justify-center text-2xl transition-all`}>🎾</div>
              <div className="flex flex-col items-center gap-1.5">
                <p className={`font-extrabold text-sm text-center leading-tight transition-colors ${!isTargetA ? 'text-[#00E676]' : 'text-white'}`}>{match.playerB.name}</p>
                {match.playerB.rank > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-mono tracking-wider shrink-0">
                    Rang #{match.playerB.rank}
                  </span>
                )}
              </div>
              {match.is_live && match.live_stats?.serving_player === 'B' && (
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 shadow-[0_0_12px_rgba(250,204,21,0.5)] uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0">
                  🎾 SERVICE
                </span>
              )}
            </div>
          </div>

          {/* Win % Bars */}
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs font-bold tracking-wide">
              <span className={isTargetA ? "text-[#00E676]" : "text-slate-400"}>
                {probData.probA}% {probData.isFallback ? '(estimation)' : '(statistique)'}
              </span>
              <span className={!isTargetA ? "text-[#00E676]" : "text-slate-400"}>
                {probData.probB}% {probData.isFallback ? '(estimation)' : '(statistique)'}
              </span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-950 p-[1px]">
              <div 
                className={`rounded-l-full transition-all duration-700 ${isTargetA ? 'bg-gradient-to-r from-[#00E676] to-[#00B0FF] shadow-[0_0_10px_#00E676]' : 'bg-slate-600'}`} 
                style={{ width: `${probData.probA}%` }}
              ></div>
              <div 
                className={`rounded-r-full transition-all duration-700 ${!isTargetA ? 'bg-gradient-to-l from-[#00E676] to-[#00B0FF] shadow-[0_0_10px_#00E676]' : 'bg-slate-600'}`} 
                style={{ width: `${probData.probB}%` }}
              ></div>
            </div>

            {!probData.isFallback && (
              <div className="mt-3.5 text-center text-[9px] text-[#00E676] bg-[#00E676]/10 py-2 rounded-xl border border-[#00E676]/20 font-extrabold uppercase tracking-widest shadow-[inset_0_1px_5px_rgba(0,230,118,0.05)]">
                📊 Indice réel basé sur le H2H, la forme récente et les stats de surface
              </div>
            )}
          </div>
        </div>

        {/* Section Paris Sportifs & Aide à la Décision */}
        {(() => {
          const decision = getDecisionSupport();
          return (
            <div className="bg-[#151A26] border border-[#2A3245] rounded-2xl p-5 space-y-4 relative overflow-hidden transition-all duration-300">
              <div 
                className="absolute -right-24 -bottom-24 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                style={{ backgroundColor: decision.safetyGlow }}
              ></div>

              <div className="flex items-center justify-between border-b border-[#2A3245] pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-amber-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-200">Indicateurs de Value & Décision</h3>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded border uppercase tracking-wider ${decision.reliabilityColor}`}>
                  Fiabilité : {decision.reliability}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">Rapport de Fiabilité</p>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">{decision.explanation}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Conseils & Signaux Clés (Aide au Pari)</p>
                  <ul className="space-y-2">
                    {decision.adviceList.map((advice, index) => (
                      <li key={index} className="text-xs text-slate-200 font-medium bg-[#1A2233]/60 border border-[#2A3245]/40 rounded-xl p-2.5 flex items-start gap-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                        <span className="text-amber-400 shrink-0">✦</span>
                        <span>{advice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Section Web3 Polymarket en temps réel */}
        <div className="bg-[#151A26] border border-[#2D354B] rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between border-b border-[#2A3245] pb-3">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-[#00E676] animate-pulse fill-[#00E676]/20" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#00E676] drop-shadow-[0_0_6px_rgba(0,230,118,0.15)]">Indicateurs de Marché Web3 (Polymarket)</h3>
            </div>
            {polymarketMarket && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20 uppercase tracking-wider shadow-[0_0_8px_rgba(0,230,118,0.08)]">
                Volume : {polymarketMarket.volume.toLocaleString('fr-FR')} $
              </span>
            )}
          </div>

          {polymarketMarket ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">Marché en cours sur Polymarket</p>
                <p className="text-xs text-white font-black leading-normal">{polymarketMarket.question}</p>
              </div>

              {/* Progress and probabilities */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-slate-300 font-bold tracking-wide">
                  <span className={polymarketMarket.probabilities[0] > polymarketMarket.probabilities[1] ? 'text-[#00E676] font-black' : 'text-slate-400'}>
                    {polymarketMarket.outcomes[0]} : {polymarketMarket.probabilities[0]}%
                  </span>
                  <span className={polymarketMarket.probabilities[1] > polymarketMarket.probabilities[0] ? 'text-[#00E676] font-black' : 'text-slate-400'}>
                    {polymarketMarket.outcomes[1]} : {polymarketMarket.probabilities[1]}%
                  </span>
                </div>
                <div className="h-2 bg-slate-950 p-[1px] rounded-full overflow-hidden flex gap-0.5 border border-[#2A3245]/20">
                  <div className="bg-[#00E676] rounded-l-full shadow-[0_0_8px_rgba(0,230,118,0.6)]" style={{ width: `${polymarketMarket.probabilities[0]}%` }}></div>
                  <div className="bg-slate-700 rounded-r-full" style={{ width: `${polymarketMarket.probabilities[1]}%` }}></div>
                </div>
              </div>

              {/* Consensus de la foule description */}
              <div className="bg-gradient-to-br from-[#121E19]/90 to-[#0A261D]/90 border border-[#00E676]/20 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Analyse du Marché Web3</span>
                  <span className="text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded font-mono font-extrabold text-[10px] tracking-wider border border-[#00E676]/30 shadow-[0_0_8px_rgba(0,230,118,0.1)]">
                    🏆 CROWD FAVORITE
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Le consensus actuel du marché de prédiction décentralisé Polymarket désigne <strong className="text-[#00E676] font-black">{polymarketMarket.probabilities[0] > polymarketMarket.probabilities[1] ? polymarketMarket.outcomes[0] : polymarketMarket.outcomes[1]}</strong> comme le gagnant prévu de cette rencontre avec une probabilité implicite de <strong className="text-[#00E676] font-black">{polymarketMarket.probabilities[0] > polymarketMarket.probabilities[1] ? polymarketMarket.probabilities[0] : polymarketMarket.probabilities[1]}%</strong> (jeton de favori négocié à 0.{polymarketMarket.probabilities[0] > polymarketMarket.probabilities[1] ? polymarketMarket.probabilities[0] : polymarketMarket.probabilities[1]} $).
                </p>
              </div>

              {/* Direct Polymarket Betting Button */}
              <a 
                href={`https://polymarket.com/event/${polymarketMarket.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 bg-[#00E676] hover:bg-[#00FF87] text-[#0B101A] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(0,230,118,0.35)] hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                <span>Parier sur le favori sur Polymarket ↗</span>
              </a>
            </div>
          ) : (
            <div className="bg-[#1C202F]/40 border border-[#2A3245]/50 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
              <span className="text-slate-400 font-semibold text-xs leading-normal">
                Aucun marché de prédiction actif pour ce match
              </span>
              <p className="text-[10px] text-slate-500 max-w-xs font-semibold leading-relaxed">
                Ce match n'a pas encore de marché de prédiction actif sur Polymarket (fréquent pour les tournois mineurs / ITF). Nos cotes ELO ci-dessus restent 100% actives.
              </p>
            </div>
          )}
        </div>

        {/* Live Match Statistics */}
        {match.is_live && match.live_stats?.stats && (
          <div className="bg-[#151A26] border border-[#00E676]/30 shadow-[0_0_15px_rgba(0,230,118,0.03)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#00E676] animate-pulse" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-200">Statistiques en Direct</h3>
            </div>
            
            <div className="space-y-4 pt-1">
              {Object.entries(match.live_stats.stats).map(([statName, values]) => {
                const getNumber = (valStr: string) => {
                  if (valStr.includes('%')) {
                    const matchPct = valStr.match(/\((\d+)%\)/);
                    return matchPct ? parseInt(matchPct[1]) : parseInt(valStr);
                  }
                  if (valStr.includes('/')) {
                    return parseInt(valStr.split('/')[0]);
                  }
                  return parseFloat(valStr) || 0;
                };

                const valA = values.home || '0';
                const valB = values.away || '0';
                const numA = getNumber(valA);
                const numB = getNumber(valB);
                const total = numA + numB || 1;
                
                const isLessBetter = statName.toLowerCase().includes('error') || statName.toLowerCase().includes('fault');
                const isWinnerA = isLessBetter ? numA <= numB : numA >= numB;

                return (
                  <div key={statName}>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-400 font-medium">{statName}</span>
                      <div className="flex gap-4 font-mono">
                        <span className={isWinnerA ? "text-[#00E676] font-extrabold" : "text-slate-300"}>{valA}</span>
                        <span className="text-slate-500">vs</span>
                        <span className={!isWinnerA ? "text-[#00E676] font-extrabold" : "text-slate-300"}>{valB}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#1A2233] rounded-full overflow-hidden flex gap-0.5 border border-[#2A3245]/20">
                      <div 
                        className={`h-full rounded-l-full transition-all duration-500 ${isWinnerA ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-slate-600'}`} 
                        style={{ width: `${(numA / total) * 100}%` }}
                      ></div>
                      <div 
                        className={`h-full rounded-r-full transition-all duration-500 ${!isWinnerA ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-slate-600'}`} 
                        style={{ width: `${(numB / total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* H2H */}
        <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#00E676]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Confrontations Directes (H2H)</h3>
          </div>
          {stats ? (
            <>
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#00E676]">{stats.h2h.winsA}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[80px]">{match.playerA.name}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-bold">{stats.h2h.winsA + stats.h2h.winsB} matchs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-300">{stats.h2h.winsB}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[80px]">{match.playerB.name}</p>
                </div>
              </div>
              {stats.h2h.matches.slice(0, 3).map((m, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-t border-[#2A3245] text-xs">
                  <span className="text-gray-300 truncate max-w-[55%]">{m.tournament} ({m.surface})</span>
                  <span className={`font-bold ${m.winner.toLowerCase().includes(match.playerA.name.split(' ').pop()?.toLowerCase() || '') ? 'text-[#00E676]' : 'text-gray-400'}`}>
                    {m.winner.split(' ').pop()} {m.score}
                  </span>
                </div>
              ))}
              {stats.h2h.matches.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-2">Pas de confrontation directe récente dans la base de données</p>
              )}
            </>
          ) : (
            <div className="text-center py-4"><div className="w-5 h-5 rounded-full border-2 border-[#00E676] border-t-transparent animate-spin mx-auto"></div></div>
          )}
        </div>

        {/* Comparatif des Classements ELO (Force Réelle) */}
        {stats && (stats.eloA && stats.eloB) && (
          <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-amber-400 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Classements ELO (Force Réelle)</h3>
            </div>
            
            <div className="space-y-4 pt-1">
              {/* ELO Général */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-400 font-medium">ELO Général (Toutes Surfaces)</span>
                  <div className="flex gap-4 font-mono">
                    <span className={stats.eloA.general >= stats.eloB.general ? "text-amber-400 font-extrabold" : "text-slate-300"}>{Math.round(stats.eloA.general)}</span>
                    <span className="text-slate-500">vs</span>
                    <span className={stats.eloB.general >= stats.eloA.general ? "text-amber-400 font-extrabold" : "text-slate-300"}>{Math.round(stats.eloB.general)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#1A2233] rounded-full overflow-hidden flex gap-0.5 border border-[#2A3245]/20">
                  <div className="bg-amber-400 rounded-l-full" style={{ width: `${(stats.eloA.general / (stats.eloA.general + stats.eloB.general || 1)) * 100}%` }}></div>
                  <div className="bg-slate-600 rounded-r-full" style={{ width: `${(stats.eloB.general / (stats.eloA.general + stats.eloB.general || 1)) * 100}%` }}></div>
                </div>
              </div>

              {/* ELO sur la Surface */}
              {(() => {
                const getSurfaceEloVal = (eloObj: any) => {
                  const s = surface.toLowerCase();
                  if (s.includes('clay')) return eloObj.clay;
                  if (s.includes('grass')) return eloObj.grass;
                  return eloObj.hard;
                };
                const eloValA = getSurfaceEloVal(stats.eloA);
                const eloValB = getSurfaceEloVal(stats.eloB);
                
                return (
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-400 font-medium">ELO Spécifique (Sur {surface})</span>
                      <div className="flex gap-4 font-mono">
                        <span className={eloValA >= eloValB ? "text-[#00E676] font-extrabold" : "text-slate-300"}>{Math.round(eloValA)}</span>
                        <span className="text-slate-500">vs</span>
                        <span className={eloValB >= eloValA ? "text-[#00E676] font-extrabold" : "text-slate-300"}>{Math.round(eloValB)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#1A2233] rounded-full overflow-hidden flex gap-0.5 border border-[#2A3245]/20">
                      <div className="bg-[#00E676] rounded-l-full shadow-[0_0_8px_#00E676]" style={{ width: `${(eloValA / (eloValA + eloValB || 1)) * 100}%` }}></div>
                      <div className="bg-slate-600 rounded-r-full" style={{ width: `${(eloValB / (eloValA + eloValB || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="text-[9px] text-slate-500 font-bold bg-[#1A2233] px-2.5 py-2 rounded-xl text-center border border-[#2A3245]/50 leading-relaxed font-mono">
              💡 Le classement ELO calcule la force d'un joueur en fonction du niveau de ses adversaires battus. Contrairement à l'ATP, il reflète le niveau de jeu réel.
            </div>
          </div>
        )}

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
                  {/* Note: for double faults, LESS is better, so A getting green if avgDfA <= avgDfB */}
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

        {/* Forme Récente */}
        <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#00E676]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Forme Récente (5 derniers matchs)</h3>
          </div>
          {stats ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-2">{match.playerA.name}</p>
                <div className="flex gap-1.5">
                  {stats.formA.length > 0
                    ? stats.formA.map((m, i) => <FormBadge key={i} won={m.won} />)
                    : <span className="text-xs text-gray-500">Données insuffisantes</span>
                  }
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">{match.playerB.name}</p>
                <div className="flex gap-1.5">
                  {stats.formB.length > 0
                    ? stats.formB.map((m, i) => <FormBadge key={i} won={m.won} />)
                    : <span className="text-xs text-gray-500">Données insuffisantes</span>
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4"><div className="w-5 h-5 rounded-full border-2 border-[#00E676] border-t-transparent animate-spin mx-auto"></div></div>
          )}
        </div>

        {/* Stats Surface */}
        {stats && (stats.surfaceA || stats.surfaceB) && (
          <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#00E676]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Statistiques sur {surface}</h3>
            </div>
            <div className="space-y-3">
              {stats.surfaceA && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{match.playerA.name}</span>
                    <span className="text-[#00E676] font-bold">{stats.surfaceA.pct}% ({stats.surfaceA.wins}V/{stats.surfaceA.losses}D)</span>
                  </div>
                  <div className="h-1.5 bg-[#2A3245] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00E676] rounded-full" style={{ width: `${stats.surfaceA.pct}%` }}></div>
                  </div>
                </div>
              )}
              {stats.surfaceB && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{match.playerB.name}</span>
                    <span className="text-slate-400 font-bold">{stats.surfaceB.pct}% ({stats.surfaceB.wins}V/{stats.surfaceB.losses}D)</span>
                  </div>
                  <div className="h-1.5 bg-[#2A3245] rounded-full overflow-hidden">
                    <div className="h-full bg-slate-500 rounded-full" style={{ width: `${stats.surfaceB.pct}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
