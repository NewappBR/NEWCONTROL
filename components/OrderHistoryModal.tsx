
import React from 'react';
import { Order, DEPARTMENTS } from '../types';

interface OrderHistoryModalProps {
  order: Order;
  onClose: () => void;
}

const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({ order, onClose }) => {
  const history = [...(order.history || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-4xl border border-white dark:border-slate-800 overflow-hidden">
        
        <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[4px]">Histórico de Auditoria</span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mt-1">O.R {order.or}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{order.cliente}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/50">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-slate-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
              <p className="text-xs font-black uppercase tracking-widest">Nenhuma alteração registrada</p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((entry, idx) => (
                <div key={idx} className="relative pl-10 border-l-2 border-slate-200 dark:border-slate-700 pb-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-full"></div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</span>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{entry.userName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</span>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                          {new Date(entry.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-3 border-t border-slate-50 dark:border-slate-700">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Setor</span>
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{DEPARTMENTS[entry.sector]}</span>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Novo Status</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          entry.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' :
                          entry.status === 'Em Produção' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-10 py-6 bg-slate-900 dark:bg-black text-white flex items-center justify-between shrink-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">PCP Industrial Audit System</p>
          <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryModal;
