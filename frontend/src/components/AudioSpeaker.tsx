import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Language } from '../i18n/translations';

interface AudioSpeakerProps {
  text: string;
  lang: Language;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const AudioSpeaker: React.FC<AudioSpeakerProps> = ({
  text,
  lang,
  size = 'md',
  className = '',
  label
}) => {
  const [speaking, setSpeaking] = useState(false);

  // Check browser support
  const hasSupport = typeof window !== 'undefined' && 'speechSynthesis' in window;
  if (!hasSupport) return null;

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean plain text without Markdown symbols
    const cleanText = text
      .replace(/[#*•_`~[\]()]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
    utterance.rate = 0.95; // slightly slower for better rural farmer comprehension

    // Attempt to pick a natural regional voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.toLowerCase().includes(lang === 'kn' ? 'kn' : 'en-in'));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const btnClasses = size === 'sm'
    ? 'p-1.5 text-xs'
    : size === 'lg'
    ? 'px-4 py-2 text-base'
    : 'px-3 py-1.5 text-sm';

  return (
    <button
      type="button"
      onClick={handleSpeak}
      title={lang === 'kn' ? 'ಓದಿ ಕೇಳಿ' : 'Listen aloud'}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all ${
        speaking
          ? 'bg-amber-500 text-white shadow-md animate-voice'
          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
      } ${btnClasses} ${className}`}
      aria-label={label || (lang === 'kn' ? 'ಧ್ವನಿ ಓದು' : 'Listen aloud')}
    >
      {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-700" />}
      {label && <span>{label}</span>}
    </button>
  );
};
