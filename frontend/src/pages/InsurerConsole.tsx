import React, { useState, useEffect } from 'react';
import { ShieldCheck, Eye, CheckCircle2, XCircle, Clock, Award, FileText, Download, Filter, RefreshCw } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { StatusBadge } from '../components/StatusBadge';

interface InsurerConsoleProps {
  onSelectClaim: (claim: any) => void;
  lang: Language;
}

export const InsurerConsole: React.FC<InsurerConsoleProps> = ({ onSelectClaim, lang }) => {
  const t = translations[lang];
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/claims');
      const data = await res.json();
      setClaims(data.claims || []);
    } catch (err) {
      console.error("Failed to load claims for insurer:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const filtered = filterStatus === 'ALL'
    ? claims
    : claims.filter(c => c.status.toUpperCase() === filterStatus);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-[#2E7D32] rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-900">
              Insurance Surveyor & Underwriting Portal
            </h2>
            <p className="text-xs text-stone-500">
              Review algorithmic MCP evidence, inspection photos, and adjudicate PMFBY claims
            </p>
          </div>
        </div>

        {/* Filter & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs font-bold text-stone-700">
            <Filter className="w-3.5 h-3.5 ml-1 text-stone-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer pr-2"
            >
              <option value="ALL">All Statuses ({claims.length})</option>
              <option value="SUBMITTED">Submitted ({claims.filter(c => c.status === 'SUBMITTED').length})</option>
              <option value="UNDER_REVIEW">Under Review ({claims.filter(c => c.status === 'UNDER_REVIEW').length})</option>
              <option value="APPROVED">Approved ({claims.filter(c => c.status === 'APPROVED').length})</option>
              <option value="REJECTED">Rejected ({claims.filter(c => c.status === 'REJECTED').length})</option>
            </select>
          </div>

          <button
            onClick={fetchClaims}
            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
            title="Refresh Claims"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Desktop Claims Table */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 text-stone-600 uppercase font-black tracking-wider border-b border-stone-200">
                <th className="py-3 px-3">Claim ID</th>
                <th className="py-3 px-3">Farmer & Phone</th>
                <th className="py-3 px-3">DIGIPIN / Plot</th>
                <th className="py-3 px-3">Crop / Loss</th>
                <th className="py-3 px-3">Algorithmic Score</th>
                <th className="py-3 px-3">Indicative Payout</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">Loading claims list...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">No claims match the selected filter.</td>
                </tr>
              ) : (
                filtered.map((claim) => (
                  <tr key={claim.id} className="hover:bg-amber-50/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">
                      {claim.id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-stone-900 block">{claim.farmer_name}</span>
                      <span className="text-[11px] text-stone-500 font-mono">{claim.farmer_phone}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs font-bold text-emerald-800 block">{claim.digipin}</span>
                      <span className="text-[11px] text-stone-500">{claim.area_acres} ac • {claim.survey_number}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-stone-900 block">{claim.crop}</span>
                      <span className="text-red-600 font-bold">{claim.loss_percent_declared}% ({claim.disaster_type})</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded font-black text-xs ${
                          (claim.score ?? 0) >= 70
                            ? 'bg-emerald-100 text-emerald-800'
                            : (claim.score ?? 0) >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {claim.score ?? 'N/A'}/100
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-black text-stone-900">
                      ₹{(claim.indicative_payout_inr ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={claim.status} lang={lang} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectClaim(claim)}
                          className="px-2.5 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold rounded-lg flex items-center gap-1 transition-colors"
                          title="Inspect Evidence & Adjudicate"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                        <a
                          href={`/api/claims/${claim.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                          title="Download PDF Dossier"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
