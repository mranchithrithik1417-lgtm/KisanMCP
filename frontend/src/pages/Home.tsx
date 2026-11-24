import React from 'react';
import { PlusCircle, FileText, Mic, MapPin, ChevronRight, Award, Sparkles, Navigation } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AudioSpeaker } from '../components/AudioSpeaker';

interface HomeProps {
  farmer: { id: string; name: string };
  plot: any;
  onNavigate: (view: string) => void;
  lang: Language;
}

export const Home: React.FC<HomeProps> = ({ farmer, plot, onNavigate, lang }) => {
  const t = translations[lang];

  const voiceSummary = `${t.greeting}, ${farmer.name}. ${t.tagline}.`;

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-16">
      {/* Farmer Greeting Banner */}
      <div className="bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-white p-5 rounded-3xl shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-200 font-semibold tracking-wide uppercase">
              Kisan Portal
            </span>
            <h2 className="text-2xl font-black">
              {t.greeting}, {farmer.name}!
            </h2>
          </div>
          <AudioSpeaker text={voiceSummary} lang={lang} size="sm" />
        </div>
        <p className="text-xs text-emerald-100 font-medium leading-relaxed">
          {t.tagline}
        </p>
      </div>

      {/* 3 Huge Action Touch Targets (at least 56px high, large text, high contrast) */}
      <div className="space-y-3">
        {/* 1. File a Claim */}
        <button
          onClick={() => onNavigate('file-claim')}
          className="w-full min-h-[72px] p-4 bg-white hover:bg-emerald-50/70 border-2 border-[#2E7D32] text-left rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-between group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <PlusCircle className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-black text-stone-900 block group-hover:text-[#2E7D32] transition-colors">
                {t.fileClaimBtn}
              </span>
              <span className="text-xs text-stone-500 font-medium block">
                {t.fileClaimDesc}
              </span>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-stone-400 group-hover:text-[#2E7D32] transition-colors shrink-0" />
        </button>

        {/* 2. Talk to AI Assistant */}
        <button
          onClick={() => onNavigate('chat')}
          className="w-full min-h-[72px] p-4 bg-[#FFF8E1] hover:bg-amber-100/80 border-2 border-amber-400 text-left rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-between group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <Mic className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-black text-stone-900 block group-hover:text-amber-800 transition-colors">
                {t.assistantBtn}
              </span>
              <span className="text-xs text-stone-600 font-medium block">
                {t.assistantDesc}
              </span>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-amber-600 group-hover:text-amber-800 transition-colors shrink-0" />
        </button>

        {/* 3. My Insurance Claims */}
        <button
          onClick={() => onNavigate('claims')}
          className="w-full min-h-[72px] p-4 bg-white hover:bg-stone-50 border border-stone-200 text-left rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-between group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold shadow-sm shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-bold text-stone-900 block group-hover:text-[#2E7D32] transition-colors">
                {t.myClaimsBtn}
              </span>
              <span className="text-xs text-stone-500 font-medium block">
                {t.myClaimsDesc}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-[#2E7D32] transition-colors shrink-0" />
        </button>
      </div>

      {/* Registered Plot Summary Card */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#2E7D32]" />
            <h3 className="text-sm font-bold text-stone-800">
              {t.registeredPlotTitle}
            </h3>
          </div>
          <button
            onClick={() => onNavigate('plot')}
            className="text-xs font-bold text-[#2E7D32] hover:underline"
          >
            Edit on Map
          </button>
        </div>

        {plot ? (
          <div className="grid grid-cols-3 gap-2 bg-[#FFF8E1] p-3 rounded-xl border border-amber-200 text-center">
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase block">{t.areaLabel}</span>
              <span className="text-base font-black text-[#2E7D32]">{plot.area_acres}</span>
              <span className="text-[9px] text-stone-400 block">{t.acres}</span>
            </div>
            <div className="border-x border-amber-200">
              <span className="text-[10px] font-bold text-stone-500 uppercase block">{t.surveyLabel}</span>
              <span className="text-xs font-bold text-stone-800 block truncate mt-1">
                {plot.survey_number}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase block">{t.digipinLabel}</span>
              <span className="text-xs font-mono font-black text-amber-900 block mt-1">
                {plot.digipin}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
            <p className="text-xs text-stone-500 mb-2">No plot marked yet.</p>
            <button
              onClick={() => onNavigate('plot')}
              className="px-3 py-1.5 bg-[#2E7D32] text-white text-xs font-bold rounded-lg shadow"
            >
              Mark Plot Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
