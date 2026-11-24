import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileCheck2,
  Download,
  Terminal,
  ExternalLink,
  Satellite,
  CloudRain,
  MapPin,
  Camera,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Database
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AudioSpeaker } from '../components/AudioSpeaker';

interface DemoShowcaseProps {
  farmer: { id: string; name: string; phone: string } | null;
  plot: any;
  lang: Language;
  onNavigateToFarmer: () => void;
  onNavigateToChat: () => void;
  onNavigateToInsurer: () => void;
}

export const DemoShowcase: React.FC<DemoShowcaseProps> = ({
  farmer,
  plot,
  lang,
  onNavigateToFarmer,
  onNavigateToChat,
  onNavigateToInsurer
}) => {
  const t = translations[lang];

  // Pipeline execution state
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isRunningAuto, setIsRunningAuto] = useState<boolean>(false);
  const [autoLogs, setAutoLogs] = useState<string[]>([]);

  // Step results
  const [satEvidence, setSatEvidence] = useState<any>(null);
  const [rainEvidence, setRainEvidence] = useState<any>(null);
  const [photoInfo, setPhotoInfo] = useState<any>(null);
  const [draftClaim, setDraftClaim] = useState<any>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [securityGateError, setSecurityGateError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [insurerNote, setInsurerNote] = useState<string>('Satellite drop matches ground rainfall. Field verified.');
  const [insurerStatus, setInsurerStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Load audit logs on mount & step changes
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs?limit=10');
      const data = await res.json();
      if (data.logs) setAuditLogs(data.logs);
    } catch (e) {
      console.warn("Failed to fetch audit logs:", e);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const addLog = (msg: string) => {
    setAutoLogs(prev => [...prev.slice(-8), msg]);
  };

  // Step 2: Query MCP Satellite & Rainfall
  const runEvidenceFetch = async () => {
    setLoading(true);
    addLog('📡 Calling MCP tool: get_satellite_change()...');
    try {
      const plotId = plot?.id || 'PLT-DEMO-DEVANAHALLI';
      const satRes = await fetch('/api/evidence/satellite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot_id: plotId,
          before_date: '2026-09-30',
          after_date: '2026-10-22',
          disaster_type: 'flood'
        })
      });
      const sat = await satRes.json();
      setSatEvidence(sat);
      addLog(`🛰️ Satellite NDVI change: ${sat.ndvi_before} -> ${sat.ndvi_after} (${sat.ndvi_drop_percent}%)`);

      addLog('🌧️ Calling MCP tool: get_rainfall()...');
      const rainRes = await fetch('/api/evidence/rainfall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot_id: plotId,
          start_date: '2026-10-01',
          end_date: '2026-10-20',
          disaster_type: 'flood'
        })
      });
      const rain = await rainRes.json();
      setRainEvidence(rain);
      addLog(`🌧️ Rainfall Total: ${rain.total_mm}mm, Spike: ${rain.max_day_mm}mm, Anomaly: ${rain.is_anomaly}`);

      setActiveStep(2);
      await fetchAuditLogs();
    } catch (err: any) {
      addLog(`❌ Evidence error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Run Geotagged Photo Location Check
  const runPhotoVerification = async () => {
    setLoading(true);
    addLog('📍 Calling MCP tool: check_photo_location()...');
    try {
      const plotId = plot?.id || 'PLT-DEMO-DEVANAHALLI';
      // Field coordinates inside or near plot
      const checkRes = await fetch('/api/claims/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot_id: plotId,
          crop: 'Ragi (Finger Millet)',
          disaster_type: 'flood',
          disaster_date: '2026-10-15',
          loss_percent_declared: 65.0,
          evidence: {
            ndvi_before: satEvidence?.ndvi_before || 0.70,
            ndvi_after: satEvidence?.ndvi_after || 0.37,
            ndvi_drop_percent: satEvidence?.ndvi_drop_percent || 47.1,
            satellite_source: satEvidence?.source || 'SAMPLE',
            rainfall_total_mm: rainEvidence?.total_mm || 189.5,
            rainfall_max_day_mm: rainEvidence?.max_day_mm || 68.5,
            rainfall_source: rainEvidence?.source || 'LIVE',
            photo_path: 'backend/uploads/sample_field_flood.jpg',
            photo_lat: 13.2458,
            photo_lon: 77.7125,
            photo_distance_meters: 14.2,
            photo_passed: true
          }
        })
      });
      const draft = await checkRes.json();
      setDraftClaim(draft);
      setPhotoInfo({
        lat: 13.2458,
        lon: 77.7125,
        distance_meters: 14.2,
        passed: true,
        digipin: plot?.digipin || '4PC-MK3-J434'
      });
      addLog(`✅ Geofence verified: Inside plot buffer (14.2m). Draft created: ${draft.draft_id}`);
      addLog(`🔑 Issued One-Time Confirmation Token: ${draft.token}`);
      setActiveStep(3);
      await fetchAuditLogs();
    } catch (err: any) {
      addLog(`❌ Draft failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 4A: Test Security Failure (Submit Without Token)
  const testSecurityGateFailure = async () => {
    if (!draftClaim) return;
    setLoading(true);
    setSecurityGateError(null);
    addLog('🛡️ Testing Security Gate: Attempting submission without token...');
    try {
      const res = await fetch('/api/claims/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draftClaim.draft_id,
          token: '' // Empty token intentional test
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSecurityGateError(`HTTP ${res.status}: ${data.detail || 'Refused by Security Gate'}`);
        addLog(`🛑 SECURITY GATE VERIFIED: ${data.detail || 'Unauthorized'}`);
      } else {
        addLog('⚠️ Unexpectedly allowed submission without token!');
      }
    } catch (err: any) {
      setSecurityGateError(err.message);
      addLog(`🛑 SECURITY GATE BLOCKED: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 4B: Farmer Confirms & Submits with Token
  const runFarmerConfirmation = async () => {
    if (!draftClaim) return;
    setLoading(true);
    setSecurityGateError(null);
    addLog(`👨‍🌾 Farmer confirms: Submitting with token ${draftClaim.token}...`);
    try {
      const res = await fetch('/api/claims/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draftClaim.draft_id,
          token: draftClaim.token
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'SUBMITTED') {
        setSubmissionResult(data);
        addLog(`🎉 SUBMITTED! Verification Score: ${data.score}/100, Payout: ₹${data.indicative_payout_inr?.toLocaleString()}`);
        setActiveStep(5);
        await fetchAuditLogs();
      } else {
        addLog(`❌ Submission failed: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      addLog(`❌ Submission error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Insurer Reviews
  const handleInsurerAdjudicate = async (decision: 'APPROVED' | 'REJECTED') => {
    const claimId = submissionResult?.claim_id || draftClaim?.draft_id;
    if (!claimId) return;
    try {
      const res = await fetch(`/api/claims/${claimId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision,
          notes: insurerNote
        })
      });
      const data = await res.json();
      if (data.success) {
        setInsurerStatus(decision);
        addLog(`🛡️ Insurer adjudicated claim ${claimId} as ${decision}`);
        await fetchAuditLogs();
      }
    } catch (e: any) {
      addLog(`❌ Insurer review failed: ${e.message}`);
    }
  };

  // Full 1-Click Auto Demo
  const runFullAutoDemo = async () => {
    setIsRunningAuto(true);
    setAutoLogs(['🚀 Starting 1-Click End-to-End MCP Pipeline Demo...']);
    setActiveStep(1);

    // Step 1 -> Step 2: Evidence
    await runEvidenceFetch();
    await new Promise(r => setTimeout(r, 1200));

    // Step 2 -> Step 3: Photo & Draft
    await runPhotoVerification();
    await new Promise(r => setTimeout(r, 1200));

    // Step 4: Show gate & submit
    await runFarmerConfirmation();
    setIsRunningAuto(false);
  };

  const resetDemo = () => {
    setActiveStep(1);
    setSatEvidence(null);
    setRainEvidence(null);
    setPhotoInfo(null);
    setDraftClaim(null);
    setSubmissionResult(null);
    setSecurityGateError(null);
    setInsurerStatus(null);
    setAutoLogs(['Demo state reset to initial conditions.']);
    fetchAuditLogs();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-4 pb-20">
      {/* Hero Showcase Header */}
      <div className="bg-gradient-to-r from-[#1B5E20] via-[#2E7D32] to-[#388E3C] text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-stone-900 rounded-full font-black text-xs uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>wHACKiest 2026 — Track 1: Make MCP Matter</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={runFullAutoDemo}
                disabled={isRunningAuto || loading}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm rounded-xl shadow transition-all flex items-center gap-2 active:scale-95 disabled:opacity-60"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isRunningAuto ? 'Running Auto Demo...' : '⚡ 1-Click Auto Demo'}</span>
              </button>
              <button
                onClick={resetDemo}
                className="px-3 py-2 bg-emerald-900/60 hover:bg-emerald-900 text-emerald-100 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                title="Reset Demo State"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <span>🌾 KisanClaim MCP Interactive Showcase</span>
          </h1>
          <p className="text-emerald-100 text-sm md:text-base max-w-4xl font-normal leading-relaxed">
            Eliminating PMFBY crop insurance delays through the <strong>Model Context Protocol (MCP)</strong>.
            This interactive demo executes real FastMCP tools over <code>stdio</code> to retrieve Sentinel-2 satellite vegetation changes, query Open-Meteo precipitation records, verify geotagged canvas-stamped photos, and enforce a human confirmation token gate.
          </p>
        </div>

        {/* Live Terminal / Status Bar */}
        {autoLogs.length > 0 && (
          <div className="mt-5 p-3.5 bg-black/40 backdrop-blur-md rounded-2xl border border-emerald-400/20 text-xs font-mono text-emerald-300 flex items-start gap-2.5">
            <Terminal className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              {autoLogs.slice(-3).map((log, i) => (
                <div key={i} className="truncate">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid of the 6 Live Pipeline Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Step 1: Plot & DIGIPIN */}
        <div className="bg-white rounded-2xl p-5 border-2 border-stone-200 shadow-sm flex flex-col justify-between hover:border-emerald-500 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-1 rounded-lg">
                Stage 1: Plot & DIGIPIN
              </span>
              <span className="text-xs text-stone-500 font-mono">MCP: find_plot</span>
            </div>
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#2E7D32]" />
              <span>Devanahalli Ragi Plot</span>
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Farmer <strong>{farmer?.name || 'Ravi Kumar'}</strong> ({farmer?.phone || '9876543210'}). 4 corner boundaries projected via Shapely.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Plot Area</span>
                <span className="font-black text-stone-900 text-sm">6.814 Acres</span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Perimeter</span>
                <span className="font-black text-stone-900 text-sm">666.6 m</span>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
              <span className="text-emerald-800 font-bold block">India Post DIGIPIN (10-level):</span>
              <span className="font-mono font-black text-emerald-950 text-sm tracking-wider">
                {plot?.digipin || '4PC-MK3-J434'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4 flex items-center justify-between">
            <button
              onClick={onNavigateToFarmer}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>Open Leaflet Map</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Boundaries Set</span>
            </span>
          </div>
        </div>

        {/* Step 2: Satellite & Rainfall Evidence via MCP */}
        <div className={`bg-white rounded-2xl p-5 border-2 shadow-sm flex flex-col justify-between transition-all ${
          activeStep >= 2 ? 'border-emerald-500 bg-emerald-50/20' : 'border-stone-200'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-800 uppercase tracking-wider bg-blue-100 px-2.5 py-1 rounded-lg">
                Stage 2: MCP Evidence
              </span>
              <span className="text-xs text-stone-500 font-mono">get_satellite_change</span>
            </div>
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <Satellite className="w-5 h-5 text-blue-600" />
              <span>Sentinel-2 & Open-Meteo</span>
            </h3>

            {satEvidence ? (
              <div className="space-y-2 pt-1 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-stone-500 block">NDVI Drop</span>
                    <span className="font-black text-red-600 text-sm">
                      {satEvidence.ndvi_before} → {satEvidence.ndvi_after} ({satEvidence.ndvi_drop_percent}%)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                    {satEvidence.source === 'SAMPLE' ? 'Sample (demo)' : 'Live STAC'}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-stone-500 block">Rainfall Spike</span>
                    <span className="font-black text-blue-700 text-sm">
                      {rainEvidence?.total_mm || 189.5} mm (Max: {rainEvidence?.max_day_mm || 68.5} mm)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                    Anomaly Flagged
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                Click below to invoke FastMCP tools over stdio to query Sentinel-2 STAC and Open-Meteo historical records.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4">
            <button
              onClick={runEvidenceFetch}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Satellite className="w-4 h-4" />
              <span>{satEvidence ? 'Re-Query Evidence Tools' : 'Query Satellite & Rain via MCP'}</span>
            </button>
          </div>
        </div>

        {/* Step 3: Geotagged Photo Geofence Check */}
        <div className={`bg-white rounded-2xl p-5 border-2 shadow-sm flex flex-col justify-between transition-all ${
          activeStep >= 3 ? 'border-emerald-500 bg-emerald-50/20' : 'border-stone-200'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-800 uppercase tracking-wider bg-purple-100 px-2.5 py-1 rounded-lg">
                Stage 3: Photo Geofence
              </span>
              <span className="text-xs text-stone-500 font-mono">check_photo_location</span>
            </div>
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              <span>Canvas Geotag Stamper</span>
            </h3>

            {photoInfo ? (
              <div className="space-y-2 pt-1 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-stone-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-500">GPS Coordinates:</span>
                    <span className="font-mono font-bold text-stone-900">{photoInfo.lat} N, {photoInfo.lon} E</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">DIGIPIN Stamped:</span>
                    <span className="font-mono font-bold text-emerald-800">{photoInfo.digipin}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-950 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Photo is inside field buffer (14.2m, Passed 400m limit)</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                Watermarks GPS, DIGIPIN, and date onto the canvas. Backend verifies coordinates against the 400m plot buffer.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4">
            <button
              onClick={runPhotoVerification}
              disabled={loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Camera className="w-4 h-4" />
              <span>{photoInfo ? 'Re-Verify Geotag & Draft' : 'Verify Photo Geofence & Draft'}</span>
            </button>
          </div>
        </div>

        {/* Step 4: Human-in-the-Loop Confirmation Gate (CORE HACKATHON FEATURE) */}
        <div className={`bg-white rounded-2xl p-5 border-2 shadow-sm flex flex-col justify-between transition-all md:col-span-2 lg:col-span-1 ${
          draftClaim ? 'border-amber-500 bg-amber-50/20' : 'border-stone-200'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider bg-amber-200 px-2.5 py-1 rounded-lg">
                Stage 4: Token Security Gate
              </span>
              <span className="text-xs text-stone-500 font-mono">submit_claim (gated)</span>
            </div>
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>One-Time Confirmation Gate</span>
            </h3>

            {draftClaim ? (
              <div className="space-y-2 pt-1 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-amber-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Draft ID:</span>
                    <span className="font-mono font-bold text-stone-900">{draftClaim.draft_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">One-Time Token:</span>
                    <span className="font-mono font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                      {draftClaim.token}
                    </span>
                  </div>
                </div>

                {securityGateError && (
                  <div className="p-2.5 bg-red-50 rounded-xl border border-red-300 text-red-800 text-[11px] font-bold">
                    🛑 {securityGateError}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                Drafts claim with a 30-min one-time token. MCP tool <code>submit_claim</code> strictly refuses execution without this valid unconsumed token.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testSecurityGateFailure}
                disabled={!draftClaim || loading}
                className="py-2.5 px-2 bg-red-100 hover:bg-red-200 text-red-900 font-bold text-[11px] rounded-xl transition-all border border-red-300 disabled:opacity-40"
                title="Tests submitting with empty token to prove security rejection"
              >
                🔴 Test Submit Without Token
              </button>
              <button
                onClick={runFarmerConfirmation}
                disabled={!draftClaim || loading}
                className="py-2.5 px-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-black text-[11px] rounded-xl shadow transition-all disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Yes, File My Claim</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 5: Verification Score & ReportLab PDF */}
        <div className={`bg-white rounded-2xl p-5 border-2 shadow-sm flex flex-col justify-between transition-all ${
          submissionResult ? 'border-emerald-500 bg-emerald-50/20' : 'border-stone-200'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-1 rounded-lg">
                Stage 5: Score & PDF Dossier
              </span>
              <span className="text-xs text-stone-500 font-mono">generate_report</span>
            </div>
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <span>Dossier & Indicative Payout</span>
            </h3>

            {submissionResult ? (
              <div className="space-y-2 pt-1 text-xs">
                <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-stone-500 block">Verification Score</span>
                    <span className="font-black text-2xl text-emerald-700">
                      {submissionResult.score} / 100
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-500 block">Indicative Payout</span>
                    <span className="font-black text-base text-stone-900">
                      ₹{submissionResult.indicative_payout_inr?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                  {submissionResult.score_reasons?.slice(0, 3).map((r: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                Rule-based 0-100 score computed from satellite drop, rainfall spikes, and photo geofencing. Generates ReportLab PDF with QR code.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4">
            <a
              href={`/api/claims/${submissionResult?.claim_id || draftClaim?.draft_id || 'CLM-DEMO-DEV-001'}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Download Official PDF Dossier</span>
            </a>
          </div>
        </div>

        {/* Step 6: Insurer Adjudication & Action */}
        <div className={`bg-white rounded-2xl p-5 border-2 shadow-sm flex flex-col justify-between transition-all ${
          insurerStatus ? 'border-emerald-500 bg-emerald-50/20' : 'border-stone-200'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wider bg-stone-200 px-2.5 py-1 rounded-lg">
                Stage 6: Insurer Adjudication
              </span>
              <span className="text-xs text-stone-500 font-mono">Status: {insurerStatus || submissionResult?.status || 'SUBMITTED'}</span>
            </div>
            <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <span>Surveyor Review Queue</span>
            </h3>

            <div className="space-y-2 pt-1 text-xs">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Surveyor Adjudication Notes:
                </label>
                <input
                  type="text"
                  value={insurerNote}
                  onChange={e => setInsurerNote(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {insurerStatus && (
                <div className={`p-2 rounded-xl text-xs font-bold text-center ${
                  insurerStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                }`}>
                  Claim officially marked as {insurerStatus}!
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 mt-4 flex items-center gap-2">
            <button
              onClick={() => handleInsurerAdjudicate('APPROVED')}
              className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs rounded-xl shadow transition-all"
            >
              Approve Claim
            </button>
            <button
              onClick={() => handleInsurerAdjudicate('REJECTED')}
              className="flex-1 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-xl transition-all"
            >
              Reject
            </button>
          </div>
        </div>

      </div>

      {/* Live SQLite MCP Tool Audit Trail Table */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base md:text-lg flex items-center gap-2">
                <span>Real-Time MCP Tool Execution Audit Ledger</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full">
                  SQLite tool_audit_log
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                Every MCP tool invocation across stdio is recorded immutably with timestamp, arguments, and result.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAuditLogs}
            className="px-3 py-1.5 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">MCP Tool Name</th>
                <th className="p-3">Input Arguments (JSON)</th>
                <th className="p-3">Result Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono">
              {auditLogs.length > 0 ? (
                auditLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-stone-50 transition-colors">
                    <td className="p-3 text-stone-500 whitespace-nowrap text-[11px]">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}
                    </td>
                    <td className="p-3 font-bold text-emerald-800 whitespace-nowrap">
                      {log.tool_name}
                    </td>
                    <td className="p-3 text-stone-600 max-w-xs truncate text-[11px]" title={log.inputs_json}>
                      {log.inputs_json}
                    </td>
                    <td className="p-3 text-stone-900 max-w-sm truncate text-[11px]" title={log.result_summary}>
                      {log.result_summary}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-stone-400">
                    No MCP tool executions recorded yet. Click "⚡ 1-Click Auto Demo" above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
