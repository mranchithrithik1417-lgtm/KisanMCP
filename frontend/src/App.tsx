import React, { useState, useEffect } from 'react';
import { Header, MainNavTab } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { StepProgressBar } from './components/StepProgressBar';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { PlotMarking } from './pages/PlotMarking';
import { EvidenceView } from './pages/EvidenceView';
import { CameraCapture } from './pages/CameraCapture';
import { ClaimDraft } from './pages/ClaimDraft';
import { ClaimDone } from './pages/ClaimDone';
import { ClaimsList } from './pages/ClaimsList';
import { ChatPage } from './pages/ChatPage';
import { InsurerConsole } from './pages/InsurerConsole';
import { InsurerDetail } from './pages/InsurerDetail';
import { DemoShowcase } from './pages/DemoShowcase';
import { MCPToolsInspector } from './pages/MCPToolsInspector';
import { Language, translations } from './i18n/translations';
import { PhoneCall } from 'lucide-react';

export function App() {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<MainNavTab>('showcase');
  const [farmer, setFarmer] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [plot, setPlot] = useState<any>(null);
  const [farmerSubView, setFarmerSubView] = useState<string>('home');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedInsurerClaim, setSelectedInsurerClaim] = useState<any | null>(null);

  // Active claim workflow states
  const [claimWizardData, setClaimWizardData] = useState<any>({
    crop: 'Ragi (Finger Millet)',
    disaster_type: 'flood',
    disaster_date: '2026-10-15',
    loss_percent: 65.0,
    satellite_evidence: null,
    rainfall_evidence: null,
    photo_info: null,
    draft_result: null,
    final_result: null
  });

  // Attempt automatic demo farmer login on mount
  useEffect(() => {
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210', name: 'Ravi Kumar' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.farmer) {
          setFarmer(data.farmer);
          if (data.plot) setPlot(data.plot);
        }
      })
      .catch(err => console.warn("Backend not yet connected:", err));
  }, []);

  const handleToggleLang = () => {
    setLang(prev => (prev === 'en' ? 'kn' : 'en'));
  };

  const handleLogout = () => {
    setFarmer(null);
    setFarmerSubView('login');
  };

  const startClaimWorkflow = async () => {
    setWizardStep(1);
    setFarmerSubView('file-claim');
  };

  // Step transitions in File-Claim Wizard
  const handlePlotConfirmedInWizard = async (savedPlot: any) => {
    setPlot(savedPlot);
    try {
      const satRes = await fetch('/api/evidence/satellite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot_id: savedPlot.id,
          before_date: '2026-09-30',
          after_date: '2026-10-22',
          disaster_type: claimWizardData.disaster_type
        })
      });
      const satData = await satRes.json();

      const rainRes = await fetch('/api/evidence/rainfall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot_id: savedPlot.id,
          start_date: '2026-10-01',
          end_date: '2026-10-20',
          disaster_type: claimWizardData.disaster_type
        })
      });
      const rainData = await rainRes.json();

      setClaimWizardData((prev: any) => ({
        ...prev,
        satellite_evidence: satData,
        rainfall_evidence: rainData
      }));
    } catch (e) {
      console.error("Evidence fetch failed:", e);
    }
    setWizardStep(2);
  };

  const handleEvidenceNext = () => {
    setWizardStep(3);
  };

  const handlePhotoCapturedInWizard = async (photoInfo: any) => {
    setClaimWizardData((prev: any) => ({ ...prev, photo_info: photoInfo }));
    try {
      const draftRes = await fetch('/api/claims/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot_id: plot?.id || 'PLT-DEMO-DEVANAHALLI',
          crop: claimWizardData.crop,
          disaster_type: claimWizardData.disaster_type,
          disaster_date: claimWizardData.disaster_date,
          loss_percent_declared: claimWizardData.loss_percent,
          evidence: {
            ndvi_before: claimWizardData.satellite_evidence?.ndvi_before,
            ndvi_after: claimWizardData.satellite_evidence?.ndvi_after,
            ndvi_drop_percent: claimWizardData.satellite_evidence?.ndvi_drop_percent,
            satellite_source: claimWizardData.satellite_evidence?.source,
            rainfall_total_mm: claimWizardData.rainfall_evidence?.total_mm,
            rainfall_max_day_mm: claimWizardData.rainfall_evidence?.max_day_mm,
            rainfall_max_date: claimWizardData.rainfall_evidence?.max_day_date,
            rainfall_source: claimWizardData.rainfall_evidence?.source,
            photo_path: photoInfo.photo_path || '',
            photo_lat: photoInfo.photo_lat,
            photo_lon: photoInfo.photo_lon,
            photo_distance_meters: photoInfo.photo_distance_meters,
            photo_passed: photoInfo.photo_passed
          }
        })
      });
      const draftData = await draftRes.json();
      setClaimWizardData((prev: any) => ({ ...prev, draft_result: draftData }));
      setWizardStep(4);
    } catch (e) {
      console.error("Drafting claim failed:", e);
      setWizardStep(4);
    }
  };

  const handleClaimSubmitted = (subResult: any) => {
    setClaimWizardData((prev: any) => ({ ...prev, final_result: subResult }));
    setWizardStep(5);
  };

  return (
    <div className="min-h-screen bg-[#FFF8E1] text-[#1B1B1B] flex flex-col font-sans">
      {/* Top Header & Navigation */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        farmer={farmer}
        onLogout={handleLogout}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'insurer') setSelectedInsurerClaim(null);
        }}
      />

      {/* Main Website Content */}
      <main className="flex-1 w-full">
        {/* TAB 1: ⚡ Live Demo Showcase (Default Landing View for Judges) */}
        {activeTab === 'showcase' && (
          <DemoShowcase
            farmer={farmer}
            plot={plot}
            lang={lang}
            onNavigateToFarmer={() => {
              setActiveTab('farmer');
              setFarmerSubView('plot');
            }}
            onNavigateToChat={() => setActiveTab('chat')}
            onNavigateToInsurer={() => setActiveTab('insurer')}
          />
        )}

        {/* TAB 2: 🛠️ FastMCP Server Tools Inspector */}
        {activeTab === 'tools' && (
          <MCPToolsInspector lang={lang} />
        )}

        {/* TAB 3: 💬 Conversational AI Assistant */}
        {activeTab === 'chat' && farmer && (
          <div className="max-w-4xl mx-auto p-4">
            <ChatPage
              farmer={farmer}
              plot={plot}
              lang={lang}
              onNavigateTab={(tab) => {
                if (tab === 'claims') {
                  setActiveTab('farmer');
                  setFarmerSubView('claims');
                } else if (tab === 'plot') {
                  setActiveTab('farmer');
                  setFarmerSubView('plot');
                }
              }}
            />
          </div>
        )}

        {/* TAB 4: 🛡️ Insurer Adjudication Console */}
        {activeTab === 'insurer' && (
          <div className="max-w-6xl mx-auto p-4">
            {selectedInsurerClaim ? (
              <InsurerDetail
                claim={selectedInsurerClaim}
                onBack={() => setSelectedInsurerClaim(null)}
                onStatusUpdated={(updated) => setSelectedInsurerClaim(updated)}
                lang={lang}
              />
            ) : (
              <InsurerConsole
                onSelectClaim={(claim) => setSelectedInsurerClaim(claim)}
                lang={lang}
              />
            )}
          </div>
        )}

        {/* TAB 5: 🌾 Farmer Portal */}
        {activeTab === 'farmer' && (
          <div className="max-w-4xl mx-auto p-4">
            {!farmer && farmerSubView !== 'login' ? (
              <Login
                lang={lang}
                onLoginSuccess={(newFarmer, newPlot) => {
                  setFarmer(newFarmer);
                  if (newPlot) setPlot(newPlot);
                  setFarmerSubView('home');
                }}
              />
            ) : (
              <>
                {/* Step Bar (Active when filing a claim) */}
                {farmerSubView === 'file-claim' && (
                  <StepProgressBar currentStep={wizardStep} lang={lang} />
                )}

                {/* Subview: Home */}
                {farmerSubView === 'home' && farmer && (
                  <Home
                    farmer={farmer}
                    plot={plot}
                    onNavigate={(view) => {
                      if (view === 'file-claim') startClaimWorkflow();
                      else setFarmerSubView(view);
                    }}
                    lang={lang}
                  />
                )}

                {/* Subview: File Claim Wizard */}
                {farmerSubView === 'file-claim' && (
                  <div className="space-y-4">
                    {wizardStep === 1 && farmer && (
                      <PlotMarking
                        farmer={farmer}
                        initialPlot={plot}
                        onPlotSaved={handlePlotConfirmedInWizard}
                        lang={lang}
                      />
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-4">
                        <EvidenceView
                          satelliteData={claimWizardData.satellite_evidence}
                          rainfallData={claimWizardData.rainfall_evidence}
                          disasterDate={claimWizardData.disaster_date}
                          lang={lang}
                        />
                        <button
                          onClick={handleEvidenceNext}
                          className="w-full min-h-[56px] bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-black text-lg rounded-xl shadow-md transition-all"
                        >
                          Proceed to Field Photo (ಹಂತ ೩ಕ್ಕೆ ಮುಂದುವರಿಯಿರಿ) →
                        </button>
                      </div>
                    )}

                    {wizardStep === 3 && farmer && (
                      <CameraCapture
                        farmer={farmer}
                        plot={plot}
                        onPhotoConfirmed={handlePhotoCapturedInWizard}
                        lang={lang}
                      />
                    )}

                    {wizardStep === 4 && (
                      <ClaimDraft
                        draftData={{
                          ...claimWizardData.draft_result,
                          crop: claimWizardData.crop,
                          disaster_type: claimWizardData.disaster_type,
                          disaster_date: claimWizardData.disaster_date,
                          loss_percent: claimWizardData.loss_percent,
                          digipin: plot?.digipin || '4PC-MK3-J434',
                          indicative_payout_inr: (plot?.area_acres || 2.5) * 10000 * (claimWizardData.loss_percent / 100.0)
                        }}
                        onSubmitted={handleClaimSubmitted}
                        onCancel={() => setFarmerSubView('home')}
                        lang={lang}
                      />
                    )}

                    {wizardStep === 5 && (
                      <ClaimDone
                        claimResult={claimWizardData.final_result || { claim_id: 'CLM-DEMO-NEW', score: 85 }}
                        onGoHome={() => setFarmerSubView('home')}
                        lang={lang}
                      />
                    )}
                  </div>
                )}

                {/* Subview: Standalone Plot Marking */}
                {farmerSubView === 'plot' && farmer && (
                  <PlotMarking
                    farmer={farmer}
                    initialPlot={plot}
                    onPlotSaved={(newPlot) => setPlot(newPlot)}
                    lang={lang}
                  />
                )}

                {/* Subview: Claims List */}
                {farmerSubView === 'claims' && farmer && (
                  <ClaimsList
                    farmer={farmer}
                    onSelectClaim={(id) => console.log(id)}
                    lang={lang}
                  />
                )}

                {/* Subview: Help & Contact */}
                {farmerSubView === 'help' && (
                  <div className="max-w-xl mx-auto space-y-4 pb-16 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <PhoneCall className="w-8 h-8 text-[#2E7D32]" />
                      <div>
                        <h2 className="text-xl font-black text-stone-900">PMFBY Kisan Helpline</h2>
                        <p className="text-xs text-stone-500">Government of Karnataka & India Post DIGIPIN Support</p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="font-bold text-emerald-900 block">Toll-Free Crop Insurance Helpline:</span>
                        <span className="text-lg font-black text-[#2E7D32] block">1800-180-1551</span>
                        <span className="text-xs text-stone-500">Available 24x7 in Kannada and English</span>
                      </div>

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="font-bold text-amber-900 block">DIGIPIN Postal Assistance:</span>
                        <span className="text-sm font-semibold text-stone-800">Department of Posts, Karnataka Circle</span>
                        <p className="text-xs text-stone-600 mt-1">
                          10-level geo-addressing allows surveyors to pinpoint damaged crops without ambiguity.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-6 text-xs text-center border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌾</span>
            <span className="font-bold text-white">KisanClaim MCP</span>
            <span>— wHACKiest 2026 (Track 1: Make MCP Matter)</span>
          </div>
          <div className="flex items-center gap-4 text-stone-400">
            <span>FastMCP Server on stdio</span>
            <span>•</span>
            <span>Sentinel-2 STAC</span>
            <span>•</span>
            <span>Open-Meteo</span>
            <span>•</span>
            <span>India Post DIGIPIN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
