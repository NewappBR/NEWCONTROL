
import React, { useState } from 'react';
import { User, Ramal } from '../types';

interface OperatorPanelProps {
  user: User;
  ramais?: Ramal[];
  onClose: () => void;
  onLogout: () => void;
  onOpenManagement: () => void;
  onUpdateUser: (userData: Partial<User>) => void;
  onRequestReset: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}

const OperatorPanel: React.FC<OperatorPanelProps> = ({ user, ramais, onClose, onLogout, onOpenManagement, onUpdateUser, onRequestReset, darkMode, onToggleTheme }) => {
  const [newPass, setNewPass] = useState('');
  const [changing, setChanging] = useState(false);
  const [activeTab, setActiveTab] = useState<'PERFIL' | 'RAMAIS'>('PERFIL');

  const handleUpdatePassword = () => {
    if (newPass.length < 4) {
      alert('A nova senha industrial deve ter no mínimo 4 caracteres.');
      return;
    }
    setChanging(true);
    setTimeout(() => {
      onUpdateUser({ password: newPass });
      alert('SENHA ATUALIZADA: Sua nova senha industrial foi salva com sucesso.');
      setNewPass('');
      setChanging(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[600] flex justify-end no-print animate-in slide-in-from-right duration-300">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase">Configurações</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 text-slate-400 dark:text-slate-500 hover:text-red-500 rounded-2xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
          </button>
        </div>

        {/* Abas simples */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
           <button 
             onClick={() => setActiveTab('PERFIL')}
             className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'PERFIL' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
           >
             Meu Perfil
           </button>
           <button 
             onClick={() => setActiveTab('RAMAIS')}
             className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'RAMAIS' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
           >
             Lista Telefônica
           </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {activeTab === 'PERFIL' ? (
            <>
              <div className="flex flex-col items-center mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700">
                <div className="w-16 h-16 bg-[#064e3b] dark:bg-emerald-900 rounded-2xl flex items-center justify-center text-emerald-400 text-2xl font-black shadow-lg mb-3 shadow-emerald-950/20">{user.nome[0]}</div>
                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase text-center leading-tight">{user.nome}</h4>
                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full mt-2 uppercase tracking-widest">{user.cargo || 'OPERADOR PCP'}</span>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1">{user.email}</p>
              </div>

              <div className="space-y-3">
                <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[28px] shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5"/></svg>
                    </div>
                    <span className="text-[9px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Segurança</span>
                  </div>
                  
                  <input 
                    type="password" 
                    placeholder="NOVA SENHA" 
                    value={newPass} 
                    onChange={e => setNewPass(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:ring-2 ring-emerald-500 transition-all" 
                  />
                  
                  <button 
                    onClick={handleUpdatePassword} 
                    disabled={changing}
                    className="w-full py-3 bg-slate-900 dark:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {changing ? 'ATUALIZANDO...' : 'SALVAR NOVA SENHA'}
                  </button>
                </div>

                {user.role === 'Admin' && (
                  <button 
                    onClick={onOpenManagement} 
                    className="w-full p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-[28px] flex items-center justify-between hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white dark:bg-emerald-800 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2.5"/></svg>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-black uppercase text-emerald-900 dark:text-emerald-300 tracking-widest">Painel Admin</span>
                        <p className="text-[7px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Gestão Geral</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-emerald-300 dark:text-emerald-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
               <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeWidth="2"/></svg>
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase">Contatos Internos</h3>
               </div>
               
               {(!ramais || ramais.length === 0) ? (
                 <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Nenhum ramal cadastrado.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-2">
                    {ramais.map(ramal => (
                       <div key={ramal.id} className="bg-white dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700 rounded-xl flex justify-between items-center shadow-sm">
                          <div>
                             <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase">{ramal.nome}</p>
                             <p className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase">{ramal.departamento || 'Geral'}</p>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg">
                             <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">{ramal.numero}</p>
                          </div>
                       </div>
                    ))}
                 </div>
               )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <button 
            onClick={onLogout} 
            className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[3px] flex items-center justify-center gap-3 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2.5"/></svg>
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperatorPanel;
