
import React from 'react';

interface AIInsightsModalProps {
  insights: string;
  isLoading: boolean;
  onClose: () => void;
}

const AIInsightsModal: React.FC<AIInsightsModalProps> = ({ insights, isLoading, onClose }) => {
  return (
    <div className="fixed bottom-24 right-10 z-[200] w-full max-w-md animate-pop">
      <div className="bg-white dark:bg-[#0f172a] rounded-[32px] shadow-4xl border border-emerald-500/20 overflow-hidden glass-panel">
        <div className="px-8 py-5 bg-[#1b3a16] flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2.5"/></svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Insights Gemini AI</span>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>
        
        <div className="p-8 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center py-12 gap-6">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse text-center">Calculando carga e gargalos...</p>
            </div>
          ) : (
            <div className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line italic">
              {insights || "Nenhuma análise gerada."}
            </div>
          )}
        </div>
        
        <div className="px-8 py-4 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/5 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
          Powered by Gemini 3 Industrial Engine
        </div>
      </div>
    </div>
  );
};

export default AIInsightsModal;
