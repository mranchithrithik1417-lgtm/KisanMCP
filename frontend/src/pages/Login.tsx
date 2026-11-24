import React, { useState } from 'react';
import { Phone, User, LogIn, Sparkles, ShieldCheck } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AudioSpeaker } from '../components/AudioSpeaker';

interface LoginProps {
  onLoginSuccess: (farmer: any, plot: any) => void;
  lang: Language;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, lang }) => {
  const t = translations[lang];
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (loginPhone: string, loginName: string) => {
    if (!loginPhone.trim()) {
      alert("Please enter a mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, name: loginName || 'Demo Farmer' })
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.farmer, data.plot);
      }
    } catch (err) {
      alert("Login failed. Check that the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    handleLogin("9876543210", "Ravi Kumar");
  };

  const voiceSummary = `${t.loginTitle}. ${t.loginSubtitle}. ${t.demoFarmerBtn}.`;

  return (
    <div className="min-h-[80vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8">
      {/* Brand Card */}
      <div className="text-center space-y-2 mb-6">
        <span className="text-5xl inline-block" role="img" aria-label="Kisan">🌾</span>
        <h2 className="text-2xl font-black text-stone-900 tracking-tight">
          {t.appName}
        </h2>
        <p className="text-xs text-stone-600 font-medium">
          {t.appSubtitle}
        </p>
        <div className="pt-1 flex justify-center">
          <AudioSpeaker text={voiceSummary} lang={lang} label={t.listenScreen} />
        </div>
      </div>

      {/* Main Login Form Card */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-lg space-y-4">
        <div>
          <h3 className="text-base font-bold text-stone-800">{t.loginTitle}</h3>
          <p className="text-xs text-stone-500 mt-0.5">{t.loginSubtitle}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin(phone, name);
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>{t.phoneLabel}</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
              className="w-full px-3.5 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>{t.nameLabel}</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-3.5 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[52px] bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-stone-300 text-white font-black text-base rounded-xl shadow transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? "Logging in..." : t.loginBtn}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <span className="relative bg-white px-2 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            Quick Hackathon Demo
          </span>
        </div>

        {/* 1-Click Demo Login Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full min-h-[50px] bg-[#FFF8E1] hover:bg-amber-100 border-2 border-amber-400 text-stone-900 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 text-center px-2"
        >
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t.demoFarmerBtn}</span>
        </button>

        <p className="text-[11px] text-stone-400 text-center font-medium">
          {t.loginNote}
        </p>
      </div>
    </div>
  );
};
