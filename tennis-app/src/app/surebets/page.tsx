'use client';

import React from 'react';
import { Target, AlertTriangle } from 'lucide-react';

export default function SurebetsPage() {
  return (
    <div className="p-4 space-y-6 min-h-screen bg-[#0B101A] text-slate-100">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Target className="text-[#00E676]" />
          Surebets & Steam Moves
        </h2>
        <p className="text-slate-400 text-sm">Détection automatique des chutes de cotes anormales et opportunités d'arbitrage sécurisées.</p>
      </div>

      <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 mt-10">
        <div className="w-16 h-16 bg-[#1A2233] rounded-full flex items-center justify-center border border-[#2A3245]">
          <AlertTriangle className="text-[#FFC107]" size={32} />
        </div>
        <div>
          <h3 className="font-bold text-lg">En attente d'opportunité</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-xs">
            Le marché est actuellement stable. Le système vous alertera dès qu'une opportunité d'arbitrage sera détectée sur le réseau Kambi.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 text-[#00E676] text-xs font-bold bg-[#00E676]/10 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></span>
          SCANNING LIVE MARKETS
        </div>
      </div>
    </div>
  );
}
