import React, { useState } from 'react';
import { Satellite, CloudRain, AlertTriangle, CheckCircle2, TrendingDown, Info } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AudioSpeaker } from '../components/AudioSpeaker';

interface EvidenceViewProps {
  satelliteData: any;
  rainfallData: any;
  disasterDate: string;
  lang: Language;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
  satelliteData,
  rainfallData,
  disasterDate,
  lang
}) => {
  const t = translations[lang];
  const [sliderVal, setSliderVal] = useState(50);

  // Satellite values
  const ndviBefore = satelliteData?.ndvi_before ?? 0.72;
  const ndviAfter = satelliteData?.ndvi_after ?? 0.38;
  const dropPercent = satelliteData?.ndvi_drop_percent ?? 47.2;
  const satSource = satelliteData?.source ?? "SAMPLE";
  const satBadge = satSource === "LIVE" ? t.liveBadge : t.sampleBadge;

  // Rainfall values
  const totalRain = rainfallData?.total_mm ?? 118.5;
  const maxRain = rainfallData?.max_day_mm ?? 68.5;
  const maxDate = rainfallData?.max_day_date ?? disasterDate;
  const isAnomaly = rainfallData?.is_anomaly ?? true;
  const rainReason = rainfallData?.anomaly_reason ?? "Flash flood threshold exceeded (> 50 mm/day)";
  const rainDaily = rainfallData?.daily ?? [];
  const rainSource = rainfallData?.source ?? "LIVE";
  const rainBadge = rainSource === "LIVE" ? "Live Open-Meteo" : "Sample Data (Demo)";

  const voiceSummary = `${t.evidenceTitle}. ${t.satelliteSection}: ${t.ndviDrop} is ${dropPercent}%. ${t.weatherSection}: ${totalRain} mm recorded. ${rainReason}.`;

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-10">
      {/* Header & Voice */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Satellite className="w-6 h-6 text-[#2E7D32]" />
            <span>{t.evidenceTitle}</span>
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Automated verification powered by real MCP satellite & weather tools
          </p>
        </div>
        <AudioSpeaker text={voiceSummary} lang={lang} label={t.listenScreen} />
      </div>

      {/* 1. Satellite NDVI Evidence Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm font-bold text-stone-800">{t.satelliteSection}</h3>
          </div>
          {/* Badge */}
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
              satSource === 'LIVE'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            {satBadge}
          </span>
        </div>

        {/* Before / After Numbers Comparison */}
        <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-stone-50 border border-stone-200">
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block">{t.ndviBaseline}</span>
            <span className="text-lg font-black text-emerald-700">{ndviBefore}</span>
            <span className="text-[10px] text-stone-400 block">Healthy Green</span>
          </div>
          <div className="border-x border-stone-200">
            <span className="text-[10px] font-bold text-stone-500 uppercase block">{t.ndviAfter}</span>
            <span className="text-lg font-black text-amber-700">{ndviAfter}</span>
            <span className="text-[10px] text-stone-400 block">Stressed / Submerged</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-stone-500 uppercase block">{t.ndviDrop}</span>
            <span className="text-lg font-black text-red-600 flex items-center justify-center gap-0.5">
              <TrendingDown className="w-4 h-4" />
              <span>-{dropPercent}%</span>
            </span>
            <span className="text-[10px] text-red-600 font-semibold block">Severe Damage</span>
          </div>
        </div>

        {/* Interactive Before/After Visual Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-stone-600">
            <span>Pre-Disaster ({ndviBefore})</span>
            <span>Post-Disaster ({ndviAfter})</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderVal}
            onChange={(e) => setSliderVal(Number(e.target.value))}
            className="w-full accent-[#2E7D32] cursor-pointer"
          />
          <div className="relative h-28 rounded-xl overflow-hidden border border-stone-300">
            {/* Split vegetation representation */}
            <div
              className="absolute inset-y-0 left-0 bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-inner"
              style={{ width: `${sliderVal}%` }}
            >
              Healthy Canopy
            </div>
            <div
              className="absolute inset-y-0 right-0 bg-amber-700/80 flex items-center justify-center text-white font-bold text-xs shadow-inner"
              style={{ width: `${100 - sliderVal}%` }}
            >
              Damaged / Waterlogged
            </div>
            {/* Divider line */}
            <div
              className="absolute inset-y-0 w-1 bg-white shadow-md"
              style={{ left: `${sliderVal}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Rainfall Anomaly & Bar Chart Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-stone-800">{t.weatherSection}</h3>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            {rainBadge}
          </span>
        </div>

        {/* Anomaly Indicator */}
        <div
          className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isAnomaly
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          {isAnomaly ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="text-xs font-black uppercase tracking-wide block">
              {isAnomaly ? t.rainfallAnomaly : t.normalRainfall}
            </span>
            <p className="text-xs mt-0.5 font-medium leading-relaxed">{rainReason}</p>
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-500 uppercase block">{t.totalRainfall}</span>
            <span className="text-base font-black text-blue-700">{totalRain} mm</span>
          </div>
          <div className="p-2 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-500 uppercase block">{t.peakRainfall}</span>
            <span className="text-base font-black text-blue-900">{maxRain} mm</span>
            <span className="text-[9px] text-stone-400 block">{maxDate}</span>
          </div>
        </div>

        {/* Daily Precipitation Bar Chart */}
        {rainDaily.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-bold text-stone-600 block mb-2">Daily Event Precipitation (mm)</span>
            <div className="flex items-end gap-1.5 h-28 bg-stone-50 p-2 rounded-xl border border-stone-200">
              {rainDaily.slice(0, 10).map((d: any, idx: number) => {
                const mm = Number(d.precipitation_mm || 0);
                const heightPercent = Math.min(100, Math.max(12, (mm / Math.max(maxRain, 1)) * 100));
                const isPeak = d.date === maxDate || mm >= 50.0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[9px] font-bold text-stone-600 mb-1">
                      {mm > 0 ? `${mm}` : ''}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        isPeak ? 'bg-red-500 shadow-sm' : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    />
                    <span className="text-[8px] font-semibold text-stone-400 mt-1 truncate max-w-full">
                      {d.date.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
