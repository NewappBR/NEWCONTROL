
import React, { useState } from 'react';
import { User, Notification } from '../types';

interface CreateAlertModalProps {
  users: User[];
  currentUser: User;
  onClose: () => void;
  onSend: (targetId: string, title: string, message: string, type: Notification['type'], date?: string) => void;
}

const CreateAlertModal: React.FC<CreateAlertModalProps> = ({ users, currentUser, onClose, onSend }) => {
  const [targetId, setTargetId] = useState<string>('ALL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<Notification['type']>('info');
  
  const [scheduledDate, setScheduledDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    onSend(targetId, title, message, type, scheduledDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-xl p-0 md:p-4 animate-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-w-lg md:rounded-[40px] p-6 md:p-10 shadow-4xl border-none md:border border-white dark:border-slate-800 flex flex-col">
        <div className="text-center mb-6 md:mb-8 shrink-0">
          <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">
            Enviar Comunicado
          </h4>
          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[3px]">Mensageria Interna</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Destinatário</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 ring-emerald-500 transition-all cursor-pointer"
            >
              <option value="ALL">TODOS OS COLABORADORES</option>
              <option value={currentUser.id} className="font-black text-emerald-600 dark:text-emerald-400">🙋 PARA MIM (LEMBRETE PESSOAL)</option>
              {users.filter(u => u.id !== currentUser.id).map(user => (
                <option key={user.id} value={user.id}>{user.nome} ({user.cargo || 'Func.'})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Data de Referência</label>
             <input 
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                style={{ colorScheme: 'light' }}
                className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 ring-emerald-500 transition-all text-slate-600 dark:text-white"
             />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Tipo de Alerta</label>
            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={() => setType('info')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${type === 'info' ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700'}`}>Info</button>
              <button type="button" onClick={() => setType('success')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${type === 'success' ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-700'}`}>Sucesso</button>
              <button type="button" onClick={() => setType('warning')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${type === 'warning' ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-amber-50 dark:hover:bg-slate-700'}`}>Atenção</button>
              <button type="button" onClick={() => setType('urgent')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${type === 'urgent' ? 'bg-red-100 text-red-600 ring-2 ring-red-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-red-50 dark:hover:bg-slate-700'}`}>Urgente</button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Título / Assunto</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.toUpperCase())}
              placeholder="EX: FALTA DE MATERIAL"
              required
              className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 ring-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              required
              rows={4}
              className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4 shrink-0 pb-4 md:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] py-4 bg-[#064e3b] dark:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-950/20 hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2.5"/></svg>
              Enviar Alerta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAlertModal;
