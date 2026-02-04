import React from 'react';

const TabNavigation: React.FC<{ activeTab: string, onTabChange: (t: any) => void }> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-[#064e3b] p-1.5 rounded-full flex gap-1 shadow-2xl border border-emerald-900/50">
      <button 
        onClick={() => onTabChange('OPERACIONAL')}
        className={`flex-1 py-3 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'OPERACIONAL' ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-300/50 hover:text-white'}`}
      >
        Produção Ativa
      </button>
      <button 
        onClick={() => onTabChange('CONCLUÍDAS')}
        className={`flex-1 py-3 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'CONCLUÍDAS' ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-300/50 hover:text-white'}`}
      >
        Arquivo PCP
      </button>
    </div>
  );
};

export default TabNavigation;