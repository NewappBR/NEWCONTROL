
import React, { useState, useMemo, useRef } from 'react';
import { User, UserRole, DEPARTMENTS, Order, HistoryEntry, CompanySettings, Ramal, GlobalLogEntry } from '../types';
import { DEFAULT_USER_PASS } from '../constants';
import Logo from './Logo';

interface UserManagementModalProps {
  users: User[];
  orders: Order[];
  companySettings: CompanySettings;
  ramais: Ramal[];
  globalLogs: GlobalLogEntry[];
  onClose: () => void;
  onAddUser: (user: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (user: User) => void;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  onUpdateRamais: (ramais: Ramal[]) => void;
  onBulkDeleteOrders?: (ids: string[]) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ 
  users, 
  orders, 
  companySettings, 
  ramais,
  globalLogs,
  onClose, 
  onAddUser, 
  onDeleteUser, 
  onUpdateUser,
  onUpdateCompanySettings,
  onUpdateRamais,
  onBulkDeleteOrders,
  showToast
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string | null; userName: string | null }>({ isOpen: false, userId: null, userName: null });
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // States para Filtros de Auditoria (Logs)
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');

  const [activeTab, setActiveTab] = useState<'USUÁRIOS' | 'LOGS' | 'CONFIGURAÇÕES' | 'RAMAIS' | 'MANUTENÇÃO' | 'RELATÓRIOS'>('USUÁRIOS');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [passwordValue, setPasswordValue] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isLeaderForm, setIsLeaderForm] = useState(false);
  
  const [newRamal, setNewRamal] = useState<Partial<Ramal>>({ nome: '', numero: '', departamento: '' });

  // Manutenção States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [previewItems, setPreviewItems] = useState<Order[] | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [inputToken, setInputToken] = useState('');

  // Relatórios States
  const [reportStartDate, setReportStartDate] = useState(() => {
      const date = new Date();
      date.setDate(1); // Primeiro dia do mês atual
      return date.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [localSettings, setLocalSettings] = useState<CompanySettings>(companySettings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ESTATÍSTICAS PARA RELATÓRIOS ---
  const stats = useMemo(() => {
      const filteredOrders = orders.filter(o => {
          if (!o.createdAt) return false;
          const createdDate = o.createdAt.split('T')[0];
          return createdDate >= reportStartDate && createdDate <= reportEndDate;
      });

      const totalOrders = filteredOrders.length;
      const totalArchived = filteredOrders.filter(o => o.isArchived).length;
      const totalActive = totalOrders - totalArchived;
      const totalRemakes = filteredOrders.filter(o => o.isRemake).length;
      
      const clientCounts: Record<string, number> = {};
      filteredOrders.forEach(o => {
          const c = o.cliente || 'N/A';
          clientCounts[c] = (clientCounts[c] || 0) + 1;
      });
      const topClients = Object.entries(clientCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

      return { totalOrders, totalActive, totalArchived, totalRemakes, topClients };
  }, [orders, reportStartDate, reportEndDate]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // --- LOGS UNIFICADOS ---
  const allLogs = useMemo(() => {
    type CombinedLogEntry = { id?: string; userId: string; userName: string; timestamp: string; status: string; sector: string; orderOr: string; orderCliente: string; type: 'history' | 'global' };
    const logs: CombinedLogEntry[] = [];
    
    // Logs de Ordens
    orders.forEach(order => {
      (order.history || []).forEach(h => {
        logs.push({ ...h, orderOr: order.or, orderCliente: order.cliente, type: 'history' });
      });
    });

    // Logs Globais (Exclusões, etc)
    if (globalLogs && globalLogs.length > 0) {
        globalLogs.forEach(g => {
            let statusLabel = 'Ação Admin';
            if (g.actionType === 'DELETE_ORDER') statusLabel = 'Exclusão de O.R';
            else if (g.actionType === 'DELETE_USER') statusLabel = 'Exclusão Usuário';
            logs.push({ 
                userId: g.userId, 
                userName: g.userName, 
                timestamp: g.timestamp, 
                status: statusLabel, 
                sector: 'Sistema', 
                orderOr: '-', 
                orderCliente: g.targetInfo,
                type: 'global'
            });
        });
    }
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders, globalLogs]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
        const matchesText = !logSearchTerm || 
            log.userName.toLowerCase().includes(logSearchTerm.toLowerCase()) || 
            log.orderOr.toLowerCase().includes(logSearchTerm.toLowerCase()) || 
            log.orderCliente.toLowerCase().includes(logSearchTerm.toLowerCase()) || 
            log.status.toLowerCase().includes(logSearchTerm.toLowerCase());
        
        const matchesDate = !logDateFilter || log.timestamp.startsWith(logDateFilter);

        return matchesText && matchesDate;
    });
  }, [allLogs, logSearchTerm, logDateFilter]);

  // Handlers (User, Settings, Ramal, Maintenance) - Mantidos simplificados para focar no render
  const handleEditClick = (user: User) => { setEditingUser(user); setPasswordValue(user.password || ''); setIsLeaderForm(!!user.isLeader); setShowPasswordText(false); setShowForm(true); };
  const handleNewUserClick = () => { setEditingUser(null); setPasswordValue(''); setIsLeaderForm(false); setShowPasswordText(false); setShowForm(true); };
  const handleResetPasswordInForm = () => { setPasswordValue(DEFAULT_USER_PASS); showToast('Senha definida para "1234".', 'info'); };
  
  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData: Partial<User> = {
      nome: (formData.get('nome') as string).toUpperCase(),
      cargo: (formData.get('cargo') as string).toUpperCase(),
      role: formData.get('role') as UserRole,
      email: formData.get('email') as string,
      password: passwordValue.trim() || DEFAULT_USER_PASS,
      departamento: formData.get('departamento') as any,
      isLeader: isLeaderForm,
    };
    if (editingUser) onUpdateUser({ ...editingUser, ...userData } as User);
    else onAddUser(userData);
    setShowForm(false); setEditingUser(null);
  };

  const handleSaveCompanySettings = () => {
    setIsSaving(true); setSaveSuccess(false);
    setTimeout(() => { onUpdateCompanySettings(localSettings); setIsSaving(false); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); }, 1000);
  };

  const handleAddRamal = () => {
    if (!newRamal.nome || !newRamal.numero) { showToast('Preencha Nome e Número.', 'error'); return; }
    const ramal: Ramal = { id: Date.now().toString(), nome: newRamal.nome.toUpperCase(), numero: newRamal.numero, departamento: newRamal.departamento?.toUpperCase() || 'GERAL' };
    onUpdateRamais([...ramais, ramal]);
    setNewRamal({ nome: '', numero: '', departamento: '' });
    showToast('Ramal adicionado.', 'success');
  };

  const handleDeleteRamal = (id: string) => onUpdateRamais(ramais.filter(r => r.id !== id));
  const handleDeleteClick = (id: string, name: string) => setDeleteModal({ isOpen: true, userId: id, userName: name });
  const confirmDeleteUser = () => { if (deleteModal.userId) onDeleteUser(deleteModal.userId); setDeleteModal({ isOpen: false, userId: null, userName: null }); };
  
  const handleAnalyzeData = () => {
    if (!startDate || !endDate) { alert("Selecione o período."); return; }
    const items = orders.filter(o => o.isArchived && o.dataEntrega >= startDate && o.dataEntrega <= endDate);
    if (items.length === 0) showToast("Nenhum item arquivado encontrado.", "info");
    setPreviewItems(items);
    setGeneratedToken(Math.floor(100000 + Math.random() * 900000).toString());
    setInputToken('');
  };

  const handleFinalizeDeletion = () => {
    if (inputToken !== generatedToken) { showToast("Token inválido.", "error"); return; }
    if (onBulkDeleteOrders && previewItems) {
        onBulkDeleteOrders(previewItems.map(o => o.id));
        setPreviewItems(null);
        showToast("Limpeza concluída.", "success");
    }
  };

  const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
    <button onClick={() => setActiveTab(id)} className={`relative flex-1 md:flex-none px-3 md:px-6 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-[0.5px] md:tracking-[2px] transition-all whitespace-nowrap shrink-0 border-b-2 md:border-b-0 rounded-lg md:rounded-none ${activeTab === id ? 'text-emerald-700 dark:text-emerald-400 border-emerald-500 bg-emerald-50 md:bg-transparent dark:bg-emerald-900/20 md:dark:bg-transparent' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border-transparent'}`}>{label}{activeTab === id && (<div className="hidden md:block absolute bottom-0 left-0 w-full h-[3px] bg-emerald-500 rounded-t-full"></div>)}</button>
  );

  return (
    <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 md:p-4 animate-in fade-in">
      <div className="bg-[#f8fafc] dark:bg-slate-950 rounded-none md:rounded-[40px] shadow-4xl w-full h-full md:max-w-6xl md:h-[90vh] flex flex-col overflow-hidden border-none md:border border-white dark:border-slate-800">
        
        {/* Header */}
        <div className="px-4 py-4 md:px-10 md:pt-8 md:pb-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 md:gap-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-6">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-[#064e3b] dark:bg-emerald-900 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl overflow-hidden shrink-0 p-1">
                <Logo src={localSettings.logoUrl} className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Painel Admin</h3>
                <p className="text-[8px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5 md:mt-1">Gestão Centralizada</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 md:p-3 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 md:flex-nowrap md:overflow-x-auto md:custom-scrollbar md:-mx-4 md:px-4">
            <TabButton id="USUÁRIOS" label="Colaboradores" />
            <TabButton id="LOGS" label="Auditoria" />
            <TabButton id="RELATÓRIOS" label="Relatórios" />
            <TabButton id="RAMAIS" label="Ramais" />
            <TabButton id="CONFIGURAÇÕES" label="Empresa" />
            <TabButton id="MANUTENÇÃO" label="Manutenção" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-10 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/50">
          
          {/* ABA USUÁRIOS */}
          {activeTab === 'USUÁRIOS' && (
            <>
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-6 bg-white dark:bg-slate-900 p-3 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm gap-3">
                <div className="relative flex-1 max-w-full md:max-w-md">
                  <input type="text" placeholder="Buscar colaborador..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[11px] font-bold dark:text-white focus:ring-2 ring-emerald-500 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
                </div>
                <button onClick={handleNewUserClick} className="px-6 py-2.5 bg-[#064e3b] dark:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-900 dark:hover:bg-emerald-600 active:scale-95 transition-all whitespace-nowrap">Novo Colaborador</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredUsers.map(user => (
                  <div key={user.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 text-emerald-400 rounded-xl flex items-center justify-center text-lg font-black shadow-inner uppercase shrink-0">{user.nome[0]}</div>
                        <div className="flex flex-col items-end gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${user.role === 'Admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{user.role}</span>
                            {user.isLeader && <span className="text-[6px] font-black uppercase bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Líder</span>}
                        </div>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase truncate leading-tight mb-0.5" title={user.nome}>{user.nome}</h4>
                      <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 truncate">{user.cargo || 'CARGO NÃO DEFINIDO'}</p>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-slate-50 dark:border-slate-800">
                      <button onClick={() => handleEditClick(user)} className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">Editar</button>
                      <button onClick={() => handleDeleteClick(user.id, user.nome)} className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ABA AUDITORIA (LOGS) */}
          {activeTab === 'LOGS' && (
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Buscar no Histórico</label>
                        <input 
                            type="text" 
                            placeholder="O.R, Colaborador ou Evento..." 
                            className="w-full pl-4 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[11px] font-bold dark:text-white focus:ring-2 ring-emerald-500 outline-none" 
                            value={logSearchTerm}
                            onChange={e => setLogSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Data Específica</label>
                        <input 
                            type="date" 
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[11px] font-bold dark:text-white focus:ring-2 ring-emerald-500 outline-none"
                            value={logDateFilter}
                            onChange={e => setLogDateFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-40">Data/Hora</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-40">Colaborador</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Detalhe</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredLogs.map((log, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                    <td className="px-6 py-3">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-none">{log.userName}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            {log.orderOr !== '-' && <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">O.R #{log.orderOr}</span>}
                                            <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[300px] leading-tight">{log.orderCliente}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                            log.status.includes('Concluído') ? 'bg-emerald-100 text-emerald-700' : 
                                            log.status.includes('Em Produção') ? 'bg-amber-100 text-amber-700' : 
                                            log.status.includes('Exclusão') ? 'bg-red-100 text-red-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                        }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-xs uppercase font-bold">Nenhum registro encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* ABA RELATÓRIOS */}
          {activeTab === 'RELATÓRIOS' && (
              <div className="space-y-6">
                  <div className="flex gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Início</label>
                          <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800 dark:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase border-none" />
                      </div>
                      <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Fim</label>
                          <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800 dark:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase border-none" />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Ordens</p>
                          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.totalOrders}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Concluídas</p>
                          <p className="text-3xl font-black text-emerald-500 mt-1">{stats.totalArchived}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Em Andamento</p>
                          <p className="text-3xl font-black text-amber-500 mt-1">{stats.totalActive}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Refazimentos</p>
                          <p className="text-3xl font-black text-red-500 mt-1">{stats.totalRemakes}</p>
                      </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase mb-4">Top Clientes no Período</h4>
                      <div className="space-y-2">
                          {stats.topClients.map((client, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{client.name}</span>
                                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{client.count} Ordens</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* ABA RAMAIS */}
          {activeTab === 'RAMAIS' && (
              <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-3">
                      <input type="text" placeholder="Nome / Setor" value={newRamal.nome} onChange={e => setNewRamal({...newRamal, nome: e.target.value})} className="flex-[2] px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold uppercase" />
                      <input type="text" placeholder="Número" value={newRamal.numero} onChange={e => setNewRamal({...newRamal, numero: e.target.value})} className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold uppercase" />
                      <button onClick={handleAddRamal} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px]">Adicionar</button>
                  </div>
                  <div className="space-y-2">
                      {ramais.map(ramal => (
                          <div key={ramal.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <div>
                                  <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{ramal.nome}</p>
                                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{ramal.numero}</p>
                              </div>
                              <button onClick={() => handleDeleteRamal(ramal.id)} className="text-red-400 hover:text-red-600 p-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* ABA CONFIGURAÇÕES (EMPRESA) */}
          {activeTab === 'CONFIGURAÇÕES' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Fantasia</label>
                      <input type="text" value={localSettings.name} onChange={e => setLocalSettings({...localSettings, name: e.target.value.toUpperCase()})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 ring-emerald-500 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Endereço</label>
                      <input type="text" value={localSettings.address} onChange={e => setLocalSettings({...localSettings, address: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contato</label>
                      <input type="text" value={localSettings.contact} onChange={e => setLocalSettings({...localSettings, contact: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all" />
                    </div>
                 </div>

                 <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center space-y-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Logo do Sistema</span>
                    <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center relative overflow-hidden group">
                        <Logo src={localSettings.logoUrl} className="w-full h-full p-4" />
                        <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase text-center p-4">Trocar</button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if(file){ const reader = new FileReader(); reader.onloadend = () => setLocalSettings({...localSettings, logoUrl: reader.result as string}); reader.readAsDataURL(file); } }} />
                 </div>
              </div>
              <div className="flex justify-center">
                 <button onClick={handleSaveCompanySettings} disabled={isSaving} className={`px-16 py-5 rounded-[24px] font-black uppercase tracking-[3px] text-xs shadow-xl transition-all active:scale-95 flex items-center gap-4 ${isSaving ? 'bg-slate-500 cursor-not-allowed text-white' : saveSuccess ? 'bg-[#10b981] text-white' : 'bg-[#064e3b] text-white hover:bg-emerald-900'}`}>{isSaving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Alterações'}</button>
              </div>
            </div>
          )}

          {/* ABA MANUTENÇÃO */}
          {activeTab === 'MANUTENÇÃO' && (
              <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-red-100 dark:border-red-900/30 shadow-xl text-center space-y-6">
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                  </div>
                  <div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">Limpeza de Arquivo</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Remover ordens arquivadas antigas para liberar espaço.</p>
                  </div>
                  
                  {!previewItems ? (
                      <div className="space-y-4">
                          <div className="flex gap-4">
                              <div className="flex-1 text-left">
                                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">De</label>
                                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl text-xs font-bold uppercase border-none" />
                              </div>
                              <div className="flex-1 text-left">
                                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Até</label>
                                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl text-xs font-bold uppercase border-none" />
                              </div>
                          </div>
                          <button onClick={handleAnalyzeData} className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all">Analisar Dados</button>
                      </div>
                  ) : (
                      <div className="space-y-4 animate-in fade-in">
                          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800">
                              <p className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase">{previewItems.length} Itens Encontrados</p>
                              <p className="text-[9px] font-bold text-amber-500/70 uppercase mt-1">Aguardando confirmação de segurança</p>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl">
                              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Token de Segurança</p>
                              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-[5px] select-none">{generatedToken}</p>
                          </div>
                          <input type="text" placeholder="DIGITE O TOKEN ACIMA" value={inputToken} onChange={e => setInputToken(e.target.value)} className="w-full px-6 py-4 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-center font-black uppercase tracking-widest outline-none focus:border-red-500 transition-colors" maxLength={6} />
                          <div className="flex gap-2">
                              <button onClick={() => setPreviewItems(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black uppercase text-[9px]">Cancelar</button>
                              <button onClick={handleFinalizeDeletion} className="flex-[2] py-3 bg-red-500 text-white rounded-xl font-black uppercase text-[9px] hover:bg-red-600 shadow-lg shadow-red-500/30">Confirmar Exclusão</button>
                          </div>
                      </div>
                  )}
              </div>
          )}

        </div>
      </div>

      {/* Formulários Modais (Edit User / Delete Confirm) - Mantidos idênticos ao original */}
      {(showForm || editingUser) && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[48px] p-12 w-full max-w-xl shadow-4xl border border-white dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="text-center mb-10">
              <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">
                {editingUser ? 'Ajustar Perfil' : 'Novo Colaborador'}
              </h4>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <input name="nome" defaultValue={editingUser?.nome} required className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 ring-emerald-500 transition-all" placeholder="NOME COMPLETO" />
                  <div className="grid grid-cols-2 gap-4">
                    <select name="role" defaultValue={editingUser?.role || 'Operador'} className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all cursor-pointer">
                      <option value="Admin">Administrador</option>
                      <option value="Operador">Operador</option>
                    </select>
                    <select name="departamento" defaultValue={editingUser?.departamento || 'preImpressao'} className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all cursor-pointer">
                      <option value="Geral">Todos os Setores</option>
                      {Object.entries(DEPARTMENTS).map(([k, v]) => <option key={k} value={k}>{v.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <input name="email" defaultValue={editingUser?.email} required className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all" placeholder="ID DE LOGIN (E-MAIL)" />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="cargo" defaultValue={editingUser?.cargo} required className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all" placeholder="CARGO NA PLANTA" />
                    <div className="flex gap-2 relative">
                        <input name="password" type={showPasswordText ? "text" : "password"} placeholder="SENHA" value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} className="w-full pl-6 pr-10 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all" />
                        <button type="button" onClick={() => setShowPasswordText(!showPasswordText)} className="absolute right-[80px] top-1/2 -translate-y-1/2 text-slate-400 p-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2"/></svg></button>
                        <button type="button" onClick={handleResetPasswordInForm} className="px-3 bg-amber-100 text-amber-700 rounded-2xl text-[8px] font-black uppercase w-[70px]">RESET</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-6 py-4 rounded-2xl">
                      <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Líder de Setor</span><span className="text-[8px] font-bold text-slate-400 uppercase">Permite atribuir tarefas</span></div>
                      <button type="button" onClick={() => setIsLeaderForm(!isLeaderForm)} className={`w-12 h-6 rounded-full relative transition-colors ${isLeaderForm ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isLeaderForm ? 'left-7' : 'left-1'}`}></div></button>
                  </div>
                </div>
                <div className="flex gap-4 pt-8">
                  <button type="button" onClick={() => { setShowForm(false); setEditingUser(null); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-[2] py-4 bg-[#064e3b] dark:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-900 transition-all active:scale-95">Confirmar</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-10 w-full max-w-md shadow-4xl border border-red-100 dark:border-red-900 flex flex-col items-center text-center">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-3">Excluir Colaborador?</h3>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-8">Você está removendo <span className="text-slate-900 dark:text-white">{deleteModal.userName}</span> permanentemente.</p>
              <div className="flex gap-4 w-full">
                <button onClick={() => setDeleteModal({ isOpen: false, userId: null, userName: null })} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl">Cancelar</button>
                <button onClick={confirmDeleteUser} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-red-600">Confirmar</button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default UserManagementModal;
