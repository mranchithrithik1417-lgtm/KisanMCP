import React, { useState, useEffect } from 'react';
import { FileText, Download, Award, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { StatusBadge } from '../components/StatusBadge';
import { AudioSpeaker } from '../components/AudioSpeaker';

interface ClaimsListProps {
  farmer: { id: string; name: string };
  onSelectClaim?: (claimId: string) => void;
  lang: Language;
}

export const ClaimsList: React.FC<ClaimsListProps> = ({ farmer, onSelectClaim, lang }) => {
  const t = translations[lang];
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/claims?farmer_id=${farmer.id}`)
      .then(res => res.json())
      .then(data => {
        setClaims(data.claims || []);
      })
      .catch(err => console.error("Failed to load claims:", err))
      .finally(() => setLoading(false));
  }, [farmer.id]);

  const voiceSummary = `${t.claimsListTitle}. You have ${claims.length} claims on record.`;

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#2E7D32]" />
            <span>{t.claimsListTitle}</span>
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            {claims.length} claim records found
          </p>
        </div>
        <AudioSpeaker text={voiceSummary} lang={lang} label={t.listenScreen} />
      </div>

      {loading ? (
        <div className="p-8 text-center text-stone-500 text-sm">Loading claims...</div>
      ) : claims.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 space-y-2">
          <FileText className="w-10 h-10 text-stone-400 mx-auto" />
          <p className="text-sm font-medium">{t.noClaimsYet}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 space-y-3 hover:border-emerald-500/50 transition-colors"
            >
              {/* Row 1: ID & Status Badge */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg">
                  {claim.id}
                </span>
                <StatusBadge status={claim.status} lang={lang} />
              </div>

              {/* Row 2: Crop & Disaster info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-400 font-semibold block">{t.cropLabel}</span>
                  <span className="font-bold text-stone-800 text-sm">{claim.crop}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-semibold block">{t.disasterLabel}</span>
                  <span className="font-bold text-stone-800 text-sm capitalize">{claim.disaster_type}</span>
                </div>
              </div>

              {/* Row 3: Score & Indicative Payout */}
              <div className="flex items-center justify-between p-2.5 bg-[#FFF8E1] rounded-xl border border-amber-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Score: {claim.score ?? 'N/A'}/100</span>
                </div>
                <div className="font-black text-[#2E7D32] text-sm">
                  ₹{(claim.indicative_payout_inr ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Insurer Note if reviewed */}
              {claim.insurer_notes && (
                <div className="p-2 bg-stone-50 rounded-lg text-xs text-stone-600 border border-stone-200">
                  <span className="font-bold text-stone-700">Insurer Note: </span>
                  {claim.insurer_notes}
                </div>
              )}

              {/* Footer: Date & PDF Download button */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[11px] text-stone-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{claim.disaster_date}</span>
                </div>
                <a
                  href={`/api/claims/${claim.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#2E7D32] font-bold rounded-lg flex items-center gap-1.5 border border-emerald-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Dossier</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
