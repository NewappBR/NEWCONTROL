
import React, { useState, useEffect } from 'react';
import { User, ProductionStep, DEPARTMENTS, TaskAssignment } from '../types';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentStep: ProductionStep;
  onAssign: (userId: string, note: string) => void;
  currentAssignment?: TaskAssignment;
  preSelectedUserId?: string; // Nova prop para suportar Drag & Drop
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ 
  isOpen, 
  onClose, 
  users, 
  currentStep, 
  onAssign,
  currentAssignment,
  preSelectedUserId
}) => {
  const [selectedUser, setSelectedUser] = useState(currentAssignment?.userId || preSelectedUserId || '');
  const [note, setNote] = useState(currentAssignment?.note || '');
  const [filterText, setFilterText] = useState('');

  // Efeito para atualizar quando a prop mudar (ex: drag and drop)
  useEffect(() => {
      if (preSelectedUserId) {
          setSelectedUser(preSelectedUserId);
      } else if (currentAssignment?.userId) {
          setSelectedUser(currentAssignment.userId);
      } else {
          setSelectedUser('');
      }
  }, [preSelectedUserId, currentAssignment, isOpen]);

  // Filtrar usuários (Mostra todos, mas prioriza visualmente ou filtra por busca)
  // A pedido do usuário: "escolher colaborador, líder, diretor ou administrador"
  const filteredUsers = users.filter(u => 
      u.nome.toLowerCase().includes(filterText.toLowerCase()) ||
      u.cargo?.toLowerCase().includes(filterText.toLowerCase())
  ).sort((a, b) => {
      // Líderes e Admins no topo
      if (a.isLeader && !b.isLeader) return -1;
      if (!a.isLeader && b.isLeader) return 1;
      return a.nome.localeCompare(b.nome);
  });

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
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
            <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Delegar Tarefa</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{DEPARTMENTS[currentStep] || 'Geral'}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 flex flex-col overflow-hidden">
            
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável</label>
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-[9px] font-bold uppercase w-24 outline-none focus:ring-1 ring-emerald-500"
                    />
                </div>
                
                <div className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                    {filteredUsers.map(user => (
                        <label 
                            key={user.id} 
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${selectedUser === user.id ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 dark:bg-emerald-900/20 dark:border-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            <input 
                                type="radio" 
                                name="user" 
                                value={user.id} 
                                checked={selectedUser === user.id}
                                onChange={() => setSelectedUser(user.id)}
                                className="hidden"
                            />
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 ${selectedUser === user.id ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                {user.nome[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`text-[10px] font-black uppercase truncate ${selectedUser === user.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>{user.nome}</p>
                                    {user.isLeader && <span className="bg-blue-100 text-blue-600 text-[7px] font-black px-1.5 rounded uppercase">Líder</span>}
                                    {user.role === 'Admin' && <span className="bg-purple-100 text-purple-600 text-[7px] font-black px-1.5 rounded uppercase">Admin</span>}
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{user.cargo || 'Colaborador'}</p>
                            </div>
                            {selectedUser === user.id && <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>}
                        </label>
                    ))}
                    {filteredUsers.length === 0 && <p className="text-center text-[9px] text-slate-400 py-4">Nenhum colaborador encontrado.</p>}
                </div>
            </div>

            <div className="space-y-2 shrink-0">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota / Instrução</label>
                <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 ring-emerald-500 resize-none h-20"
                    placeholder="Adicione instruções, detalhes ou observações..."
                />
            </div>

            <div className="flex gap-3 pt-2 shrink-0">
                {currentAssignment && !preSelectedUserId && (
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
                    {currentAssignment && !preSelectedUserId ? 'Atualizar' : 'Designar'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentModal;
