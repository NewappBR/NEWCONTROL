
import React, { useState } from 'react';
import { User, ProductionStep, DEPARTMENTS, TaskAssignment } from '../types';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentStep: ProductionStep;
  onAssign: (userId: string, note: string) => void;
  currentAssignment?: TaskAssignment;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ 
  isOpen, 
  onClose, 
  users, 
  currentStep, 
  onAssign,
  currentAssignment
}) => {
  const [selectedUser, setSelectedUser] = useState(currentAssignment?.userId || '');
  const [note, setNote] = useState(currentAssignment?.note || '');

  // Filtrar usuários do departamento atual
  const sectorUsers = users.filter(u => u.departamento === currentStep || u.departamento === 'Geral');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
        onAssign(selectedUser, note);
        onClose();
    }
  };

  const handleRemove = () => {
      onAssign('', ''); // Remove assignment
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Delegar Tarefa</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{DEPARTMENTS[currentStep]}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável</label>
                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {sectorUsers.map(user => (
                        <label 
                            key={user.id} 
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedUser === user.id ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 dark:bg-emerald-900/20 dark:border-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            <input 
                                type="radio" 
                                name="user" 
                                value={user.id} 
                                checked={selectedUser === user.id}
                                onChange={() => setSelectedUser(user.id)}
                                className="hidden"
                            />
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase ${selectedUser === user.id ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                {user.nome[0]}
                            </div>
                            <div className="flex-1">
                                <p className={`text-[10px] font-black uppercase ${selectedUser === user.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>{user.nome}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">{user.cargo || 'Operador'}</p>
                            </div>
                            {selectedUser === user.id && <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>}
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instruções / Orientações</label>
                <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:ring-2 ring-emerald-500 resize-none h-20"
                    placeholder="Instruções importantes para o operador..."
                />
            </div>

            <div className="flex gap-3 pt-2">
                {currentAssignment && (
                    <button 
                        type="button" 
                        onClick={handleRemove}
                        className="flex-1 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors"
                    >
                        Remover
                    </button>
                )}
                <button 
                    type="submit" 
                    disabled={!selectedUser}
                    className="flex-[2] py-3 bg-[#064e3b] dark:bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-800 dark:hover:bg-emerald-500 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {currentAssignment ? 'Atualizar' : 'Designar'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentModal;
