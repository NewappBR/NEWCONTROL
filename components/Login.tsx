
import React, { useState } from 'react';
import Logo from './Logo';

interface LoginProps {
  onLogin: (email: string, pass: string) => boolean;
  onResetPassword: (email: string) => void;
  companyLogo?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, onResetPassword, companyLogo }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);

    if (isResetMode) {
      if (!user) {
        setError(true);
        return;
      }
      onResetPassword(user);
      setResetSent(true);
      return;
    }

    if (!user || !pass) {
      setError(true);
      return;
    }
    
    const success = onLogin(user, pass);
    if (!success) {
      setError(true);
    }
  };

  const toggleResetMode = () => {
    setIsResetMode(!isResetMode);
    setResetSent(false);
    setError(false);
    setPass('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className={`w-full max-w-[400px] p-12 bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl border border-slate-200 dark:border-slate-800 transition-all ${error ? 'animate-shake border-red-300 dark:border-red-800' : ''}`}>
        <div className="flex flex-col items-center mb-10">
          <div className="w-28 h-28 bg-[#064e3b] dark:bg-emerald-950 rounded-[32px] flex items-center justify-center shadow-xl mb-6 text-emerald-400 relative overflow-hidden group p-4">
            <Logo 
              src={companyLogo} 
              className="w-full h-full transform group-hover:scale-110 transition-transform duration-500" 
            />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-[#064e3b] dark:text-emerald-500 uppercase text-center">NEWCOM <span className="text-emerald-500 dark:text-emerald-300">CONTROL</span></h1>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px] mt-2 leading-none text-center">Production Planning and Control</p>
        </div>

        {!resetSent ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {isResetMode && (
               <div className="text-center pb-2">
                 <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Recuperar Acesso</h3>
                 <p className="text-[10px] font-bold text-slate-400">Informe seu login para notificar a administração</p>
               </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-4 tracking-[2px]">Login Industrial</label>
              <input 
                type="text" 
                placeholder="ID de Usuário" 
                className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold outline-none transition-all dark:text-white ${error ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 shadow-sm'}`}
                value={user}
                onChange={e => { setUser(e.target.value); setError(false); }}
              />
            </div>

            {!isResetMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center pr-4">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-4 tracking-[2px]">Senha de Acesso</label>
                  <button type="button" onClick={toggleResetMode} className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase hover:underline">Esqueci</button>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold outline-none transition-all dark:text-white ${error ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 shadow-sm'}`}
                  value={pass}
                  onChange={e => { setPass(e.target.value); setError(false); }}
                />
              </div>
            )}
            
            {error && (
              <p className="text-[10px] font-black text-red-500 uppercase text-center animate-pulse">
                {isResetMode ? 'Informe seu login/email para continuar.' : 'Acesso negado. Verifique os dados.'}
              </p>
            )}
            
            <div className="py-2">
              <button type="submit" className="w-full bg-[#064e3b] hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-95">
                {isResetMode ? 'Solicitar Reset' : 'Entrar no Sistema'}
              </button>
            </div>

            {isResetMode && (
              <button type="button" onClick={toggleResetMode} className="w-full text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Voltar ao Login</button>
            )}
          </form>
        ) : (
          <div className="flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Solicitação Enviada</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase mt-2 leading-relaxed">
                A administração foi notificada.<br/>Aguarde o reset ou contate o suporte.
              </p>
            </div>
            <button onClick={toggleResetMode} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Voltar</button>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
};

export default Login;
