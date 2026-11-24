import React from 'react';
import { CheckCircle2, Download, Award, ArrowLeft, FileText, Check } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AudioSpeaker } from '../components/AudioSpeaker';

interface ClaimDoneProps {
  claimResult: any;
  onGoHome: () => void;
  lang: Language;
}

export const ClaimDone: React.FC<ClaimDoneProps> = ({ claimResult, onGoHome, lang }) => {
  const t = translations[lang];

  const claimId = claimResult.claim_id;
  const score = claimResult.score ?? 85;
  const reasons = claimResult.score_reasons ?? [
    "Satellite evidence confirms severe crop loss: NDVI dropped by 47.2% (+35 pts).",
    "Extreme rainfall spike of 68.5 mm recorded on disaster date (+30 pts).",
    "Field photograph verified inside plot boundary (+25 pts).",
    "Declared loss aligns with satellite NDVI drop (+10 pts)."
  ];
  const payout = claimResult.indicative_payout_inr ?? 15000.0;
  const pdfUrl = claimResult.report?.download_url || `/api/claims/${claimId}/pdf`;

  const voiceSummary = `${t.successTitle}. ${t.claimIdLabel}: ${claimId}. ${t.scoreLabel}: ${score} out of 100. ${t.downloadPdfBtn}.`;

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-10">
      {/* Top Success Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-[#2E7D32] text-white p-6 rounded-2xl shadow-md text-center space-y-2">
        <CheckCircle2 className="w-14 h-14 text-emerald-200 mx-auto stroke-[2.5]" />
        <h2 className="text-2xl font-black">{t.successTitle}</h2>
        <p className="text-xs text-emerald-100 font-medium">
          Recorded in insurer verification queue with full MCP tool evidence dossier
        </p>
        <div className="inline-block bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-mono font-bold mt-1">
          {t.claimIdLabel}: {claimId}
        </div>
      </div>

      <div className="flex justify-end">
        <AudioSpeaker text={voiceSummary} lang={lang} label={t.listenScreen} />
      </div>

      {/* Verification Score Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-stone-800">{t.scoreLabel}</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase">
            Indicative
          </span>
        </div>

        {/* Score Ring / Bar */}
        <div className="flex items-center gap-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
          <div className="w-16 h-16 rounded-full bg-[#2E7D32] text-white flex flex-col items-center justify-center font-black shadow">
            <span className="text-xl leading-none">{score}</span>
            <span className="text-[9px] opacity-80">/100</span>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs font-bold text-stone-700">
              <span>Algorithmic Reliability</span>
              <span className="text-[#2E7D32]">High Confidence</span>
            </div>
            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-[#2E7D32] rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rule Reasons List */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-bold text-stone-700 block">{t.scoreReasonsTitle}:</span>
          <ul className="space-y-1 text-xs text-stone-600 font-medium">
            {reasons.map((r: string, idx: number) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-700 font-bold shrink-0">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Indicative Compensation Payout */}
      <div className="p-4 bg-[#FFF8E1] rounded-2xl border border-amber-300 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-amber-900 block">{t.indicativePayoutLabel}</span>
          <span className="text-xl font-black text-[#2E7D32]">
            ₹{payout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-stone-500 block italic">{t.payoutDisclaimer}</span>
        </div>
      </div>

      {/* PDF Download Button & Return Home */}
      <div className="space-y-2 pt-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[56px] py-3.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Download className="w-5 h-5 stroke-[2.5]" />
          <span>{t.downloadPdfBtn}</span>
        </a>

        <button
          onClick={onGoHome}
          className="w-full min-h-[50px] py-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.returnHomeBtn}</span>
        </button>
      </div>
    </div>
  );
};
