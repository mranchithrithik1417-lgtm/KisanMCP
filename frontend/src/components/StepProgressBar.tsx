import React from 'react';
import { Language } from '../i18n/translations';

interface StepProgressBarProps {
  currentStep: number; // 1 to 5
  lang: Language;
}

export const StepProgressBar: React.FC<StepProgressBarProps> = ({ currentStep, lang }) => {
  const steps = [
    { num: 1, labelEn: "1. Plot", labelKn: "೧. ಹೊಲ" },
    { num: 2, labelEn: "2. Evidence", labelKn: "೨. ಸಾಕ್ಷ್ಯ" },
    { num: 3, labelEn: "3. Photo", labelKn: "೩. ಫೋಟೋ" },
    { num: 4, labelEn: "4. Confirm", labelKn: "೪. ಪರಿಶೀಲನೆ" },
    { num: 5, labelEn: "5. Done", labelKn: "೫. ಪೂರ್ಣ" },
  ];

  return (
    <div className="w-full bg-[#FFFDE7] border-b border-amber-200 py-2.5 px-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {steps.map((st, idx) => {
          const isDone = currentStep > st.num;
          const isCurrent = currentStep === st.num;

          return (
            <React.Fragment key={st.num}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#2E7D32] text-white ring-2 ring-emerald-300 shadow-sm'
                      : isDone
                      ? 'bg-emerald-100 text-[#2E7D32] border border-emerald-300'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {isDone ? '✓' : st.num}
                </div>
                <span
                  className={`text-[10px] mt-1 font-semibold truncate ${
                    isCurrent ? 'text-[#2E7D32]' : isDone ? 'text-stone-700' : 'text-stone-400'
                  }`}
                >
                  {lang === 'kn' ? st.labelKn : st.labelEn}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors ${
                    currentStep > st.num ? 'bg-[#2E7D32]' : 'bg-stone-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
