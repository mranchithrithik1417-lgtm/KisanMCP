import React from 'react';
import { Home, MessageSquare, FileText, MapPin, PhoneCall } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, lang }) => {
  const t = translations[lang];

  const items = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'plot', label: t.navPlot, icon: MapPin },
    { id: 'chat', label: t.navChat, icon: MessageSquare },
    { id: 'claims', label: t.navClaims, icon: FileText },
    { id: 'help', label: t.navHelp, icon: PhoneCall },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-h-[56px] transition-colors relative ${
                isActive ? 'text-[#2E7D32] font-bold' : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-[#2E7D32]' : 'stroke-2'}`} />
              <span className="text-[11px] mt-1 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-[#2E7D32] rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
