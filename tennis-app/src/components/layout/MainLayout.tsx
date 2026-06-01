'use client';

import React from 'react';
import { Home, LineChart, Target, Bell, Settings, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400">
            <Target size={20} />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            QuantEdge
          </h1>
        </div>
        <button className="relative p-2 text-slate-400 hover:text-slate-100 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-3 bg-slate-900 border-t border-slate-800 pb-safe">
        <NavItem href="/" icon={<Home size={24} />} label="Dashboard" active={pathname === '/'} />
        <NavItem href="/compare" icon={<ArrowRightLeft size={24} />} label="H2H" active={pathname === '/compare'} />
        <NavItem href="/surebets" icon={<Target size={24} />} label="Surebets" active={pathname === '/surebets'} />
        <NavItem href="/settings" icon={<Settings size={24} />} label="Settings" active={pathname === '/settings'} />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 min-w-[4rem] transition-colors ${active ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
