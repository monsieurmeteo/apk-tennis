import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Flame, Trophy, Activity, Target, Star } from 'lucide-react';

interface MatchProps {
  match: {
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
  };
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function MatchCard({ match, isFavorited = false, onToggleFavorite }: MatchProps) {
  const isTargetA = match.targetPlayer === 'A';
  const hasHighEdge = match.edge > 20;
  const hasMediumEdge = match.edge > 12 && match.edge <= 20;

  // Formattage du score en direct
  const isLive = match.is_live;
  const rawScore = match.score_str;
  const formattedScore = rawScore.replace(/,/g, '  | ');

  return (
    <Link href={`/match/${match.id}`} className="block group">
      <div className={`bg-gradient-to-br from-[#151A26] via-[#151A26] to-[#1D2436] border ${isFavorited ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : hasHighEdge ? 'border-amber-500/40 hover:border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : hasMediumEdge ? 'border-[#00E676]/40 hover:border-[#00E676]' : 'border-[#2A3245] hover:border-slate-500'} rounded-2xl p-5 relative overflow-hidden transition-all duration-300 transform group-hover:scale-[1.015] group-hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]`}>
        
        {/* Glow de fond subtil pour attirer l'œil */}
        {isFavorited ? (
          <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-amber-400/10 blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-amber-400/15"></div>
        ) : hasHighEdge ? (
          <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-amber-500/10 blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-amber-500/15"></div>
        ) : hasMediumEdge ? (
          <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-[#00E676]/10 blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-[#00E676]/15"></div>
        ) : null}

        {/* Badges de Confiance / Dopamine Triggers */}
        {isFavorited ? (
          <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] font-extrabold px-3.5 py-1 rounded-bl-xl shadow-[0_4px_12px_rgba(245,158,11,0.4)] flex items-center gap-1 uppercase tracking-wider z-10">
            <Star size={11} className="fill-slate-950 animate-pulse" />
            MATCH SUIVI (ÉPINGLÉ)
          </div>
        ) : hasHighEdge ? (
          <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-slate-950 text-[10px] font-extrabold px-3.5 py-1 rounded-bl-xl shadow-[0_4px_12px_rgba(245,158,11,0.4)] flex items-center gap-1 uppercase tracking-wider z-10">
            <Flame size={12} className="animate-bounce" />
            CONFIANCE SUPRÊME (+{Math.round(match.edge)}%)
          </div>
        ) : hasMediumEdge ? (
          <div className="absolute top-0 right-0 bg-gradient-to-r from-[#00E676] to-sky-500 text-slate-950 text-[10px] font-extrabold px-3.5 py-1 rounded-bl-xl shadow-[0_4px_12px_rgba(0,230,118,0.3)] flex items-center gap-1 uppercase tracking-wider z-10">
            <ShieldCheck size={12} />
            EXCELLENTE VALUE (+{Math.round(match.edge)}%)
          </div>
        ) : null}

        {/* Header - Tournoi et Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 max-w-[70%] z-20">
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(match.id);
                }}
                className="p-1 -ml-1 text-slate-400 hover:text-amber-400 active:scale-95 transition-all shrink-0 cursor-pointer"
                title={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Star
                  size={15}
                  className={`transition-transform hover:scale-110 ${isFavorited ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'text-slate-400 hover:text-amber-300'}`}
                />
              </button>
            )}
            {isLive ? (
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E676]"></span>
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0"></span>
            )}
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate group-hover:text-slate-200 transition-colors">
              {match.tournament}
            </span>
          </div>
          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${isLive ? 'bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'}`}>
            {isLive ? 'LIVE' : 'UPCOMING'}
          </span>
        </div>

        {/* Joueurs & Score en Direct */}
        <div className="flex justify-between items-center mb-5">
          {/* Joueurs */}
          <div className="flex flex-col gap-3 w-[55%]">
             <div className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isTargetA ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-slate-600'}`}></div>
                <span className={`text-sm truncate transition-colors duration-200 ${isTargetA ? 'font-extrabold text-white group-hover:text-[#00E676]' : 'font-semibold text-slate-300'}`}>
                  {match.playerA.name}
                </span>
                {match.playerA.rank > 0 && (
                  <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 font-mono font-bold tracking-wide shrink-0">
                    #{match.playerA.rank}
                  </span>
                )}
                {isLive && match.live_stats?.serving_player === 'A' && (
                  <span className="text-xs animate-bounce shrink-0 filter drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]" title="Au service">🎾</span>
                )}
             </div>
             <div className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${!isTargetA ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-slate-600'}`}></div>
                <span className={`text-sm truncate transition-colors duration-200 ${!isTargetA ? 'font-extrabold text-white group-hover:text-[#00E676]' : 'font-semibold text-slate-300'}`}>
                  {match.playerB.name}
                </span>
                {match.playerB.rank > 0 && (
                  <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 font-mono font-bold tracking-wide shrink-0">
                    #{match.playerB.rank}
                  </span>
                )}
                {isLive && match.live_stats?.serving_player === 'B' && (
                  <span className="text-xs animate-bounce shrink-0 filter drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]" title="Au service">🎾</span>
                )}
             </div>
          </div>

          {/* Affichage du Score Premium */}
          <div className="text-right w-[40%] flex flex-col items-end justify-center">
            {isLive ? (
              <div className="flex flex-col items-end gap-1">
                <div className="text-[11px] font-mono font-bold bg-slate-950/60 px-2.5 py-1 rounded-xl text-white border border-[#00E676]/30 shadow-[0_0_10px_rgba(0,230,118,0.05)] text-center tracking-wide group-hover:border-[#00E676] transition-all">
                  {formattedScore}
                </div>
                <div className="flex items-center gap-1 text-[8px] font-extrabold text-[#00E676] uppercase tracking-wider animate-pulse">
                  <Activity size={8} /> Score en direct
                </div>
              </div>
            ) : (
              <div className="text-[10px] font-mono font-bold bg-[#1A2233] px-2.5 py-1 rounded-xl text-slate-400 border border-[#2A3245] text-center tracking-wider">
                {rawScore}
              </div>
            )}
          </div>
        </div>

        {/* Barre de Comparaison Visuelle (Glow Probabilités) */}
        <div className="mb-5 space-y-1">
          <div className="flex justify-between text-[9px] text-slate-400 font-bold tracking-wide">
            <span className={isTargetA ? "text-[#00E676]" : ""}>{match.playerA.prob}% Chance</span>
            <span className={!isTargetA ? "text-[#00E676]" : ""}>{match.playerB.prob}% Chance</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-950/80 p-[1px]">
            <div 
              className={`h-full rounded-l-full transition-all duration-500 ${isTargetA ? 'bg-gradient-to-r from-[#00E676] to-[#00B0FF] shadow-[0_0_10px_#00E676]' : 'bg-slate-700'}`} 
              style={{ width: `${match.playerA.prob}%` }}
            ></div>
            <div 
              className={`h-full rounded-r-full transition-all duration-500 ${!isTargetA ? 'bg-gradient-to-l from-[#00E676] to-[#00B0FF] shadow-[0_0_10px_#00E676]' : 'bg-slate-700'}`} 
              style={{ width: `${match.playerB.prob}%` }}
            ></div>
          </div>
        </div>

        {/* Boutons de Probabilité Interactifs */}
        <div className="flex gap-2.5">
          <button className={`flex-1 h-12 bg-[#1A2233]/40 border ${isTargetA ? isFavorited ? 'border-amber-400 bg-amber-400/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : hasHighEdge ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-[#00E676] bg-[#00E676]/5 shadow-[0_0_15px_rgba(0,230,118,0.1)]' : 'border-[#2A3245] hover:border-slate-500'} rounded-xl flex items-center justify-between px-3.5 transition-all duration-300 relative group/btn`}>
            <span className="text-[10px] font-extrabold text-slate-400 group-hover/btn:text-slate-200 transition-colors uppercase tracking-wider flex items-center gap-1">
              <Target size={12} className={isTargetA ? 'text-[#00E676]' : 'text-slate-400'} />
              STAT WIN %
            </span>
            <span className={`text-base font-extrabold font-mono transition-transform duration-300 group-hover/btn:scale-105 ${isTargetA ? isFavorited ? 'text-amber-400 font-black' : hasHighEdge ? 'text-amber-400' : 'text-[#00E676]' : 'text-white'}`}>
              {match.playerA.prob}%
            </span>
            {isTargetA && (
              <span className={`absolute top-0 right-0 w-2 h-2 rounded-full -mr-0.5 -mt-0.5 animate-pulse ${isFavorited ? 'bg-amber-400' : hasHighEdge ? 'bg-amber-400' : 'bg-[#00E676]'}`}></span>
            )}
          </button>

          <button className={`flex-1 h-12 bg-[#1A2233]/40 border ${!isTargetA ? isFavorited ? 'border-amber-400 bg-amber-400/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : hasHighEdge ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-[#00E676] bg-[#00E676]/5 shadow-[0_0_15px_rgba(0,230,118,0.1)]' : 'border-[#2A3245] hover:border-slate-500'} rounded-xl flex items-center justify-between px-3.5 transition-all duration-300 relative group/btn`}>
            <span className="text-[10px] font-extrabold text-slate-400 group-hover/btn:text-slate-200 transition-colors uppercase tracking-wider flex items-center gap-1">
              <Target size={12} className={!isTargetA ? 'text-[#00E676]' : 'text-slate-400'} />
              STAT WIN %
            </span>
            <span className={`text-base font-extrabold font-mono transition-transform duration-300 group-hover/btn:scale-105 ${!isTargetA ? isFavorited ? 'text-amber-400 font-black' : hasHighEdge ? 'text-amber-400' : 'text-[#00E676]' : 'text-white'}`}>
              {match.playerB.prob}%
            </span>
            {!isTargetA && (
              <span className={`absolute top-0 right-0 w-2 h-2 rounded-full -mr-0.5 -mt-0.5 animate-pulse ${isFavorited ? 'bg-amber-400' : hasHighEdge ? 'bg-amber-400' : 'bg-[#00E676]'}`}></span>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
