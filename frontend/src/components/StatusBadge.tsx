import React from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, FileEdit } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface StatusBadgeProps {
  status: string;
  lang: Language;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, lang, size = 'md' }) => {
  const s = status.toUpperCase();
  const t = translations[lang];

  let bg = 'bg-gray-100 text-gray-800 border-gray-300';
  let icon = <FileEdit className="w-3.5 h-3.5" />;
  let label = t.statusDraft;

  if (s === 'SUBMITTED') {
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
    icon = <Clock className="w-3.5 h-3.5 text-blue-600" />;
    label = t.statusSubmitted;
  } else if (s === 'UNDER_REVIEW') {
    bg = 'bg-amber-50 text-amber-800 border-amber-300';
    icon = <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
    label = t.statusUnderReview;
  } else if (s === 'APPROVED') {
    bg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
    label = t.statusApproved;
  } else if (s === 'REJECTED') {
    bg = 'bg-red-50 text-red-800 border-red-300';
    icon = <XCircle className="w-3.5 h-3.5 text-red-600" />;
    label = t.statusRejected;
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${bg} ${padding}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
};
