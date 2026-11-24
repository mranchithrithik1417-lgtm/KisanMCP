import React, { useState } from 'react';
import { FileCheck, ShieldAlert, KeyRound, CheckCircle2, XCircle } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AudioSpeaker } from '../components/AudioSpeaker';

interface ClaimDraftProps {
  draftData: any;
  onSubmitted: (submissionResult: any) => void;
  onCancel: () => void;
  lang: Language;
}

export const ClaimDraft: React.FC<ClaimDraftProps> = ({
  draftData,
  onSubmitted,
  onCancel,
  lang
}) => {
  const t = translations[lang];
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const draftId = draftData.draft_id || draftData.claim_id;
  const token = draftData.token;
  const crop = draftData.crop || "Ragi";
  const disasterType = draftData.disaster_type || "Flood";
  const disasterDate = draftData.disaster_date || "2026-10-15";
  const lossPercent = draftData.loss_percent || draftData.loss_percent_declared || 60;
  const payoutInr = draftData.indicative_payout_inr || 15000.0;
  const digipin = draftData.digipin || "4PC-MK3-J434";

  const voiceSummary = `${t.draftTitle}. ${t.cropLabel}: ${crop}. ${t.disasterLabel}: ${disasterType}. ${t.indicativePayoutLabel}: ₹${payoutInr}. ${t.confirmBtn}.`;

  const handleSubmit = async () => {
    if (!token) {
      setErrorMsg("Confirmation token missing! Security gate prevented submission.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/claims/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draftId,
          token: token
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Submission failed");
      }

      onSubmitted(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit claim.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-[#2E7D32]" />
            <span>{t.draftTitle}</span>
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">{t.draftSummary}</p>
        </div>
        <AudioSpeaker text={voiceSummary} lang={lang} label={t.listenScreen} />
      </div>

      {/* Security Gate Token Banner */}
      <div className="bg-[#FFF8E1] p-3.5 rounded-xl border border-amber-300 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <KeyRound className="w-5 h-5 text-amber-700" />
          <div>
            <span className="text-[10px] font-bold text-amber-900 uppercase block">{t.oneTimeTokenLabel}</span>
            <span className="font-mono text-sm font-black text-stone-900">{token || "MISSING"}</span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
          Valid (30m)
        </span>
      </div>

      {/* Summary Details Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 divide-y divide-stone-100 space-y-3">
        <div className="flex justify-between py-1 text-sm">
          <span className="text-stone-500 font-semibold">{t.cropLabel}:</span>
          <span className="font-bold text-stone-900">{crop}</span>
        </div>
        <div className="flex justify-between py-1 text-sm">
          <span className="text-stone-500 font-semibold">{t.disasterLabel}:</span>
          <span className="font-bold text-stone-900 capitalize">{disasterType}</span>
        </div>
        <div className="flex justify-between py-1 text-sm">
          <span className="text-stone-500 font-semibold">{t.dateLabel}:</span>
          <span className="font-bold text-stone-900">{disasterDate}</span>
        </div>
        <div className="flex justify-between py-1 text-sm">
          <span className="text-stone-500 font-semibold">{t.lossPercentLabel}:</span>
          <span className="font-bold text-red-600">{lossPercent}%</span>
        </div>
        <div className="flex justify-between py-1 text-sm">
          <span className="text-stone-500 font-semibold">{t.digipinLabel}:</span>
          <span className="font-mono font-bold text-stone-800">{digipin}</span>
        </div>
      </div>

      {/* Indicative Payout Estimate Card */}
      <div className="p-4 bg-gradient-to-br from-emerald-50 to-[#FFF8E1] rounded-2xl border-2 border-emerald-600/30 shadow-sm space-y-1">
        <span className="text-xs font-black text-emerald-900 uppercase tracking-wide">
          {t.indicativePayoutLabel}
        </span>
        <div className="text-2xl font-black text-[#2E7D32]">
          ₹{payoutInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        <p className="text-[11px] text-stone-500 font-medium italic">
          {t.payoutDisclaimer}
        </p>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 bg-red-100 text-red-900 rounded-xl text-xs font-bold border border-red-300 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Big Action Confirmation Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full min-h-[56px] py-4 bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-stone-300 text-white font-black text-lg rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-300 stroke-[2.5]" />
          <span>{submitting ? "Verifying Token & Submitting..." : t.confirmBtn}</span>
        </button>

        <button
          onClick={onCancel}
          disabled={submitting}
          className="w-full py-2.5 text-stone-500 hover:text-stone-800 text-sm font-bold transition-colors"
        >
          {t.cancelBtn}
        </button>
      </div>
    </div>
  );
};
