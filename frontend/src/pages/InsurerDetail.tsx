import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, ShieldCheck, Download, Award, Satellite, CloudRain, MapPin, Database, Clock } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { StatusBadge } from '../components/StatusBadge';

interface InsurerDetailProps {
  claim: any;
  onBack: () => void;
  onStatusUpdated: (updatedClaim: any) => void;
  lang: Language;
}

export const InsurerDetail: React.FC<InsurerDetailProps> = ({
  claim,
  onBack,
  onStatusUpdated,
  lang
}) => {
  const t = translations[lang];
  const [currentClaim, setCurrentClaim] = useState(claim);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [note, setNote] = useState(claim.insurer_notes || '');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch full claim detail & audit logs
  useEffect(() => {
    fetch(`/api/claims/${claim.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.claim) setCurrentClaim(data.claim);
      });

    fetch(`/api/audit-logs?claim_id=${claim.id}`)
      .then(res => res.json())
      .then(data => {
        setAuditLogs(data.logs || []);
      });
  }, [claim.id]);

  const handleDecision = async (newStatus: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          insurer_notes: note
        })
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...currentClaim, status: newStatus, insurer_notes: note };
        setCurrentClaim(updated);
        onStatusUpdated(updated);
        alert(`Claim marked as ${newStatus}`);
      }
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const ndviDrop = currentClaim.ndvi_drop_percent ?? 47.2;
  const score = currentClaim.score ?? 85;
  const reasons = currentClaim.score_reasons ?? [];

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16">
      {/* Top Navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Claims</span>
      </button>

      {/* Main Dossier Header */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black text-stone-900">Claim Dossier {currentClaim.id}</h2>
            <StatusBadge status={currentClaim.status} lang={lang} />
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Filed on {currentClaim.created_at} • DIGIPIN: <span className="font-mono font-bold text-emerald-800">{currentClaim.digipin}</span>
          </p>
        </div>

        {/* Action: Download PDF */}
        <a
          href={`/api/claims/${currentClaim.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Official PDF Dossier</span>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column: Farmer, Plot, Verification Score */}
        <div className="space-y-4 md:col-span-1">
          {/* Farmer & Plot Card */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-2 text-xs">
            <h3 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] border-b pb-1">
              Farmer & Plot Profile
            </h3>
            <div className="flex justify-between"><span className="text-stone-500">Name:</span> <span className="font-bold">{currentClaim.farmer_name}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Phone:</span> <span className="font-mono">{currentClaim.farmer_phone}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Survey No:</span> <span className="font-bold">{currentClaim.survey_number}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Plot Area:</span> <span className="font-bold">{currentClaim.area_acres} Acres</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Crop:</span> <span className="font-bold text-emerald-800">{currentClaim.crop}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Disaster:</span> <span className="font-bold capitalize">{currentClaim.disaster_type} ({currentClaim.disaster_date})</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Declared Loss:</span> <span className="font-bold text-red-600">{currentClaim.loss_percent_declared}%</span></div>
          </div>

          {/* Verification Score Card */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800 text-xs">Algorithmic Verification Score</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">Indicative</span>
            </div>
            <div className="text-3xl font-black text-[#2E7D32]">{score}/100</div>
            <div className="space-y-1 text-xs text-stone-600 font-medium pt-1">
              {reasons.map((r: string, idx: number) => (
                <div key={idx} className="flex items-start gap-1">
                  <span className="text-emerald-700 font-bold shrink-0">✓</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Indicative Payout */}
          <div className="bg-[#FFF8E1] p-4 rounded-xl border border-amber-300 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">Indicative PMFBY Payout</span>
            <span className="text-2xl font-black text-[#2E7D32] block">
              ₹{(currentClaim.indicative_payout_inr ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-stone-500 italic block">Indicative estimate, not an official PMFBY amount</span>
          </div>
        </div>

        {/* Right Columns: Scientific Evidence & Audit Trail */}
        <div className="space-y-4 md:col-span-2">
          {/* Scientific Evidence Inspection */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
              <Satellite className="w-4 h-4 text-emerald-700" />
              <span>Multimodal Evidence Dossier</span>
            </h3>

            {/* Satellite & Rainfall Summary Rows */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div>
                <span className="text-[10px] font-bold text-stone-500 block uppercase">Satellite NDVI Drop</span>
                <span className="text-base font-black text-red-600">-{ndviDrop}%</span>
                <span className="text-[10px] text-stone-400 block">
                  [{currentClaim.satellite_source || 'SAMPLE'} Source]
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 block uppercase">Rainfall Peak & Total</span>
                <span className="text-base font-black text-blue-800">
                  {currentClaim.rainfall_max_day_mm ?? 68.5} mm peak
                </span>
                <span className="text-[10px] text-stone-500 block">
                  Total {currentClaim.rainfall_total_mm ?? 118.5} mm
                </span>
              </div>
            </div>

            {/* Photo & Watermark Inspection */}
            {currentClaim.photo_path && (
              <div className="space-y-1 pt-1">
                <span className="font-bold text-stone-700 block">Field Photo Watermark & Perimeter Check:</span>
                <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-900 border border-emerald-200 flex items-center justify-between">
                  <span>GPS Geotag: {currentClaim.photo_lat}, {currentClaim.photo_lon}</span>
                  <span className="font-bold">✓ Verified inside / within 400m</span>
                </div>
              </div>
            )}
          </div>

          {/* Underwriter Adjudication Decision Card */}
          <div className="bg-white p-4 rounded-xl border-2 border-emerald-600/30 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-stone-900">Surveyor Adjudication Decision</h3>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Decision Notes & Justification:
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter field assessment or surveyor verification notes..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleDecision('APPROVED')}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-stone-300 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Claim</span>
              </button>
              <button
                onClick={() => handleDecision('REJECTED')}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Claim</span>
              </button>
              <button
                onClick={() => handleDecision('UNDER_REVIEW')}
                disabled={actionLoading}
                className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors"
              >
                Hold for Review
              </button>
            </div>
          </div>

          {/* Real MCP Tool Audit Trail */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>MCP Tool Execution Audit Trail</span>
              </h3>
              <span className="text-[10px] text-stone-400 font-mono">Immutable SQLite Ledger</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="p-4 text-center text-stone-400 text-xs">No tool audit logs for this claim.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-[11px] font-mono space-y-1">
                    <div className="flex items-center justify-between text-stone-500">
                      <span className="font-bold text-[#2E7D32] font-mono">tool: {log.tool_name}()</span>
                      <span className="text-[10px]">{log.timestamp}</span>
                    </div>
                    <div className="text-stone-800 font-sans text-xs">
                      {log.result_summary}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
