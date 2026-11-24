import React from 'react';
import {
  Sparkles,
  MapPin,
  Mic,
  ShieldCheck,
  Terminal,
  Languages,
  LogOut
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';

export type MainNavTab = 'showcase' | 'farmer' | 'chat' | 'insurer' | 'tools';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  farmer: { name: string; phone: string } | null;
  onLogout: () => void;
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  farmer,
  onLogout,
  activeTab,
  onSelectTab
}) => {
  const t = translations[lang];

  const navItems: { id: MainNavTab; label: string; icon: any; badge?: string }[] = [
    { id: 'showcase', label: '⚡ Live Demo', icon: Sparkles, badge: 'Judge View' },
    { id: 'farmer', label: '🌾 Farmer Portal', icon: MapPin },
    { id: 'chat', label: '💬 AI Assistant', icon: Mic },
    { id: 'insurer', label: '🛡️ Insurer Console', icon: ShieldCheck },
    { id: 'tools', label: '🛠️ MCP Tools', icon: Terminal, badge: '8 Tools' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#1B5E20] text-white shadow-md border-b-2 border-[#F9A825]">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={() => onSelectTab('showcase')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <span className="text-2xl" role="img" aria-label="Sprout">🌾</span>
          <div>
            <h1 className="text-base md:text-xl font-black tracking-tight flex items-center gap-1.5 leading-tight">
              <span>KisanClaim</span>
              <span className="bg-[#F9A825] text-stone-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                MCP
              </span>
            </h1>
            <p className="text-[10px] md:text-[11px] text-emerald-200 font-medium hidden sm:block">
              wHACKiest 2026 • Track 1: Make MCP Matter
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-black/20 p-1 rounded-2xl border border-white/10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#F9A825] text-stone-950 shadow'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-black uppercase ${
                      isActive ? 'bg-stone-950 text-white' : 'bg-emerald-800 text-emerald-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Language, Server Status, User Profile */}
        <div className="flex items-center gap-2">
          {/* Active Server Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/80 border border-emerald-600 text-[11px] font-bold text-emerald-200 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FastMCP stdio</span>
          </div>

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/20"
            title="Toggle between English and Kannada"
          >
            <Languages className="w-3.5 h-3.5 text-[#F9A825]" />
            <span>{lang === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
          </button>

          {/* Farmer Profile / Logout */}
          {farmer && (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-xs font-semibold text-emerald-100 hidden md:inline truncate max-w-[120px]">
                {farmer.name}
              </span>
              <button
                onClick={onLogout}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subnav for Mobile/Tablets */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-1.5 gap-1 bg-black/20 border-t border-white/10 text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 flex items-center gap-1 transition-all ${
                isActive
                  ? 'bg-[#F9A825] text-stone-950 font-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
