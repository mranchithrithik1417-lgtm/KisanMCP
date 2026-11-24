import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Bot, User, CheckCircle2, Award, Download, ArrowRight, Loader2 } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { AudioSpeaker } from '../components/AudioSpeaker';

interface ChatPageProps {
  farmer: { id: string; name: string };
  plot: any;
  lang: Language;
  onNavigateTab: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user' | 'system';
  type?: 'message' | 'status' | 'draft_summary_card' | 'claim_completed_card';
  text_en?: string;
  text_kn?: string;
  quick_replies?: { label_en: string; label_kn: string; value: any }[];
  draft_id?: string;
  token?: string;
  score?: number;
  score_reasons?: string[];
  indicative_payout_inr?: number;
  pdf_url?: string;
  requires_confirm?: boolean;
}

export const ChatPage: React.FC<ChatPageProps> = ({ farmer, plot, lang, onNavigateTab }) => {
  const t = translations[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [sessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Start with greeting from assistant
  useEffect(() => {
    sendAgentMessage('', undefined, true);
  }, []);

  // Web Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputVal(transcript);
        setListening(false);
        // Automatically submit spoken message
        sendAgentMessage(transcript);
      };

      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
    }
  }, [lang]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert(t.micUnsupported);
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const sendAgentMessage = async (text: string, payload?: any, isInitial: boolean = false) => {
    if (!text && !payload && !isInitial) return;

    if (text) {
      setMessages(prev => [
        ...prev,
        {
          id: `usr_${Date.now()}`,
          sender: 'user',
          text_en: text,
          text_kn: text
        }
      ]);
      setInputVal('');
    }

    setLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          farmer_id: farmer.id,
          message: text,
          payload: payload
        })
      });

      const data = await res.json();
      const events: any[] = data.events || [];

      // Append returned status lines and messages
      for (const ev of events) {
        setMessages(prev => [
          ...prev,
          {
            id: `evt_${Date.now()}_${Math.random()}`,
            sender: ev.sender || 'assistant',
            type: ev.type,
            text_en: ev.text_en,
            text_kn: ev.text_kn,
            quick_replies: ev.quick_replies,
            draft_id: ev.draft_id,
            token: ev.token,
            score: ev.score,
            score_reasons: ev.score_reasons,
            indicative_payout_inr: ev.indicative_payout_inr,
            pdf_url: ev.pdf_url,
            requires_confirm: ev.requires_confirm
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text_en: "Connection error. Your draft is saved. Please try again.",
          text_kn: "ನೆಟ್‌ವರ್ಕ್ ದೋಷ. ನಿಮ್ಮ ಕರಡು ಉಳಿದಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (qr: { value: any; label_en: string; label_kn: string }) => {
    sendAgentMessage(lang === 'kn' ? qr.label_kn : qr.label_en, { value: qr.value });
  };

  const handleConfirmClaim = (draftId?: string, token?: string) => {
    sendAgentMessage(
      lang === 'kn' ? "ಹೌದು, ನನ್ನ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ" : "Yes, file my claim",
      { confirm: true, draft_id: draftId, token: token }
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-xl mx-auto">
      {/* Assistant Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2E7D32] text-white flex items-center justify-center font-bold">
            <Bot className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900">{t.chatTitle}</h2>
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected to Real MCP Tools
            </span>
          </div>
        </div>
        <AudioSpeaker
          text={t.talkToAssistant}
          lang={lang}
          size="sm"
          label={t.listenScreen}
        />
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const text = lang === 'kn' ? (msg.text_kn || msg.text_en) : (msg.text_en || msg.text_kn);

          // 1. Status progress line (small live step)
          if (msg.type === 'status') {
            return (
              <div key={msg.id} className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>{text}</span>
              </div>
            );
          }

          // 2. Draft summary card with confirm button
          if (msg.type === 'draft_summary_card') {
            return (
              <div key={msg.id} className="bg-white rounded-2xl p-4 border-2 border-amber-400 shadow-md space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Draft Dossier Ready
                  </span>
                  <span className="text-[11px] font-mono font-bold text-stone-600">
                    Token: {msg.token}
                  </span>
                </div>

                <p className="text-xs font-medium text-stone-800 whitespace-pre-line leading-relaxed">
                  {text}
                </p>

                {/* Big Confirm Button Gate */}
                <button
                  onClick={() => handleConfirmClaim(msg.draft_id, msg.token)}
                  disabled={loading}
                  className="w-full min-h-[52px] bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-black text-sm rounded-xl shadow flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5 text-amber-300" />
                  <span>{t.confirmBtn}</span>
                </button>
              </div>
            );
          }

          // 3. Claim completed final card
          if (msg.type === 'claim_completed_card') {
            return (
              <div key={msg.id} className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-4 border-2 border-emerald-600 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Claim Filed
                  </span>
                  <span className="text-xs font-black text-[#2E7D32]">
                    Score: {msg.score}/100
                  </span>
                </div>

                <p className="text-xs font-medium text-stone-800 whitespace-pre-line leading-relaxed">
                  {text}
                </p>

                {msg.pdf_url && (
                  <a
                    href={msg.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[48px] bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.downloadPdfBtn}</span>
                  </a>
                )}
              </div>
            );
          }

          // 4. Standard Message Bubble
          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-[#2E7D32] text-white rounded-br-none'
                    : 'bg-white text-stone-900 border border-stone-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="whitespace-pre-line">{text}</span>
                  {!isUser && text && (
                    <AudioSpeaker text={text} lang={lang} size="sm" />
                  )}
                </div>
              </div>

              {/* Quick Reply Action Buttons */}
              {msg.quick_replies && msg.quick_replies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 max-w-[95%]">
                  {msg.quick_replies.map((qr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickReply(qr)}
                      className="px-3 py-1.5 bg-[#FFF8E1] hover:bg-[#FFF176] text-stone-900 border border-amber-300 font-bold text-xs rounded-full shadow-sm transition-all active:scale-95 flex items-center gap-1"
                    >
                      <span>{lang === 'kn' ? qr.label_kn : qr.label_en}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-stone-500 italic p-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#2E7D32]" />
            <span>Assistant is thinking & calling MCP tools...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar with mic button */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendAgentMessage(inputVal);
          }}
          className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-stone-300 shadow-sm"
        >
          {/* Voice Microphone Button */}
          <button
            type="button"
            onClick={toggleMic}
            className={`p-3 rounded-xl transition-all ${
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-emerald-100 text-[#2E7D32] hover:bg-emerald-200'
            }`}
            title="Speak into microphone"
          >
            {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={listening ? t.listening : t.chatPlaceholder}
            className="flex-1 px-3 py-2 text-sm focus:outline-none font-medium"
          />

          <button
            type="submit"
            disabled={!inputVal.trim() || loading}
            className="p-3 bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-stone-300 text-white rounded-xl shadow transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
