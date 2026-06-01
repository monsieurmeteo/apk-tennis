'use client';

import React from 'react';
import { Settings, Bell, Wallet, Shield } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-4 space-y-6 min-h-screen bg-[#0B101A] text-slate-100">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-[#00E676]" />
          Réglages
        </h2>
        <p className="text-slate-400 text-sm">Gérez vos notifications et préférences de trading.</p>
      </div>

      <div className="space-y-4">
        {/* Notifications */}
        <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-slate-400" size={20} />
            <h3 className="font-bold">Notifications Push</h3>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2A3245]">
            <span className="text-sm text-slate-300">Alerte "Value Bet &gt; 5%"</span>
            <div className="w-10 h-6 bg-[#00E676] rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-300">Alerte "Steam Move (Chute brutale)"</span>
            <div className="w-10 h-6 bg-[#00E676] rounded-full relative cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
            </div>
          </div>
        </div>

        {/* Bankroll */}
        <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="text-slate-400" size={20} />
            <h3 className="font-bold">Gestion Bankroll</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Capital de départ (€)</span>
            <input type="number" defaultValue={1000} className="w-24 bg-[#1A2233] border border-[#2A3245] rounded px-2 py-1 text-right text-white" />
          </div>
        </div>

        {/* System */}
        <div className="bg-[#151A26] border border-[#2A3245] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-slate-400" size={20} />
            <h3 className="font-bold">Système</h3>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Format des cotes</span>
            <span className="text-xs font-bold bg-[#1A2233] border border-[#2A3245] px-2 py-1 rounded text-slate-300">Décimal (EU)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
