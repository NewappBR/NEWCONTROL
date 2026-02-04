
import React, { useState, useMemo, useRef } from 'react';
import { User, UserRole, DEPARTMENTS, Order, HistoryEntry, CompanySettings } from '../types';
import { DEFAULT_USER_PASS } from '../constants';

interface UserManagementModalProps {
  users: User[];
  orders: Order[];
  companySettings: CompanySettings;
  onClose: () => void;
  onAddUser: (user: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (user: User) => void;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ 
  users, 
  orders, 
  companySettings, 
  onClose, 
  onAddUser, 
  onDeleteUser, 
  onUpdateUser,
  onUpdateCompanySettings,
  showToast
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'USUÁRIOS' | 'LOGS' | 'CONFIGURAÇÕES'>('USUÁRIOS');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [localSettings, setLocalSettings] = useState<CompanySettings>(companySettings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const allLogs = useMemo(() => {
    const logs: Array<HistoryEntry & { orderOr: string, orderCliente: string }> = [];
    orders.forEach(order => {
      (order.history || []).forEach(h => {
        logs.push({ ...h, orderOr: order.or, orderCliente: order.cliente });
      });
    });
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders]);

  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData: Partial<User> = {
      nome: (formData.get('nome') as string).toUpperCase(),
      cargo: (formData.get('cargo') as string).toUpperCase(),
      role: formData.get('role') as UserRole,
      email: formData.get('email') as string,
      password: (formData.get('password') as string) || DEFAULT_USER_PASS,
      departamento: formData.get('departamento') as any,
    };
    if (editingUser) onUpdateUser({ ...editingUser, ...userData } as User);
    else onAddUser(userData);
    setShowForm(false);
    setEditingUser(null);
  };

  const handleSaveCompanySettings = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    // Simula processamento de persistência de dados
    setTimeout(() => {
      onUpdateCompanySettings(localSettings);
      setIsSaving(false);
      setSaveSuccess(true);
      // Mantém o feedback de sucesso por 3 segundos
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  const handleDeleteClick = (id: string, name: string) => {
    // Confirmação técnica conforme pedido
    if (window.confirm(`🚨 EXCLUSÃO DEFINITIVA DE COLABORADOR!\n\nVocê está prestes a remover o registro de "${name}" do sistema.\nEste usuário não terá mais acesso a nenhuma função industrial e seus logs de atividade serão mantidos apenas para auditoria histórica.\n\nConfirmar remoção permanente?`)) {
      onDeleteUser(id);
    }
  };

  const handleManualReset = (user: User) => {
    if (window.confirm(`Deseja resetar a senha de ${user.nome} para "1234"?`)) {
        onUpdateUser({ ...user, password: '1234' });
        showToast(`Senha de ${user.nome} redefinida com sucesso.`, 'success');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("A logo deve ter no máximo 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings({ ...localSettings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#f8fafc] rounded-[40px] shadow-4xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-white">
        
        <div className="px-10 py-6 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-[#064e3b] rounded-2xl flex items-center justify-center shadow-xl overflow-hidden">
               {localSettings.logoUrl ? (
                 <img src={localSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                 <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4 7L12 12L20 7L12 2Z" fill="currentColor" fillOpacity="0.4"/>
                    <path d="M12 12L4 17L12 22L20 17L12 12Z" fill="currentColor" fillOpacity="0.2"/>
                    <path d="M4 7V17L12 12L4 7Z" fill="currentColor" fillOpacity="0.7"/>
                    <path d="M20 7V17L12 12L20 7Z" fill="currentColor"/>
                 </svg>
               )}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Painel Administrativo</h3>
              <div className="flex gap-4 mt-3">
                <button onClick={() => setActiveTab('USUÁRIOS')} className={`text-[9px] font-black uppercase tracking-[2px] transition-all ${activeTab === 'USUÁRIOS' ? 'text-emerald-600 border-b-2 border-emerald-600 pb-1' : 'text-slate-400'}`}>Colaboradores</button>
                <button onClick={() => setActiveTab('LOGS')} className={`text-[9px] font-black uppercase tracking-[2px] transition-all ${activeTab === 'LOGS' ? 'text-emerald-600 border-b-2 border-emerald-600 pb-1' : 'text-slate-400'}`}>Auditoria</button>
                <button onClick={() => setActiveTab('CONFIGURAÇÕES')} className={`text-[9px] font-black uppercase tracking-[2px] transition-all ${activeTab === 'CONFIGURAÇÕES' ? 'text-emerald-600 border-b-2 border-emerald-600 pb-1' : 'text-slate-400'}`}>Dados Remetentes</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-3 text-slate-400 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-slate-50/30">
          {activeTab === 'USUÁRIOS' ? (
            <>
              <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 max-w-md">
                   <input 
                    type="text" 
                    placeholder="Buscar colaborador..." 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[11px] font-bold focus:ring-2 ring-emerald-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
                </div>
                <button 
                  onClick={() => { setEditingUser(null); setShowForm(true); }}
                  className="px-8 py-3 bg-[#064e3b] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-emerald-900 active:scale-95 transition-all"
                >
                  Novo Colaborador
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map(user => (
                  <div key={user.id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner uppercase">{user.nome[0]}</div>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${user.role === 'Admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {user.role}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase truncate leading-tight mb-1">{user.nome}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{user.cargo || 'CARGO NÃO DEFINIDO'}</p>
                      
                      <button 
                        onClick={() => handleManualReset(user)} 
                        className="w-full mb-3 py-2 bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeWidth="2.5"/></svg>
                         Resetar Senha (1234)
                      </button>

                      <div className="flex gap-2 pt-4 border-t border-slate-50">
                        <button onClick={() => { setEditingUser(user); setShowForm(true); }} className="flex-1 py-3 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Editar</button>
                        <button onClick={() => handleDeleteClick(user.id, user.nome)} className="px-4 py-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : activeTab === 'LOGS' ? (
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data/Hora</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">O.R / Evento</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Novo Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-3"><span className="text-[10px] font-bold text-slate-400 tabular-nums">{new Date(log.timestamp).toLocaleString('pt-BR')}</span></td>
                      <td className="px-6 py-3"><span className="text-[10px] font-black text-slate-900 uppercase leading-none">{log.userName}</span></td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-emerald-600 uppercase">O.R {log.orderOr}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[200px] leading-tight">{log.orderCliente}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          log.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : 
                          log.status === 'Em Produção' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-500">
              <div className="text-center">
                <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Dados Remetentes</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">Configurações da Unidade Industrial</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome Fantasia / Razão</label>
                      <input 
                        type="text" 
                        value={localSettings.name}
                        onChange={e => setLocalSettings({...localSettings, name: e.target.value.toUpperCase()})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 ring-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Endereço da Planta</label>
                      <input 
                        type="text" 
                        value={localSettings.address}
                        onChange={e => setLocalSettings({...localSettings, address: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contato Oficial</label>
                      <input 
                        type="text" 
                        value={localSettings.contact}
                        onChange={e => setLocalSettings({...localSettings, contact: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all"
                      />
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl flex flex-col items-center justify-center space-y-6">
                        <div className="text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Identidade Visual (Logo)</span>
                        <div className="w-32 h-32 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                            {localSettings.logoUrl ? (
                            <img src={localSettings.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg>
                            )}
                            <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase text-center p-4 leading-tight"
                            >
                            Trocar Logo
                            </button>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-emerald-600 uppercase">Logo Customizada</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase max-w-[180px]">Será visível para todos os setores e nas etiquetas impressas.</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-xl space-y-4">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Configuração de Lembretes</span>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-emerald-600 uppercase tracking-tight ml-2">Antecedência Instalação (Dias)</label>
                            <input 
                              type="number" 
                              min="1"
                              max="30"
                              value={localSettings.reminderInstallationDays || 1}
                              onChange={e => setLocalSettings({...localSettings, reminderInstallationDays: parseInt(e.target.value) || 1})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 ring-emerald-500 transition-all text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-emerald-600 uppercase tracking-tight ml-2">Antecedência Expedição (Dias)</label>
                            <input 
                              type="number" 
                              min="1"
                              max="30"
                              value={localSettings.reminderShippingDays || 1}
                              onChange={e => setLocalSettings({...localSettings, reminderShippingDays: parseInt(e.target.value) || 1})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 ring-emerald-500 transition-all text-center"
                            />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col items-center pt-8 gap-4">
                 <button 
                  onClick={handleSaveCompanySettings}
                  disabled={isSaving}
                  className={`px-16 py-5 rounded-[24px] font-black uppercase tracking-[3px] text-xs shadow-xl transition-all active:scale-95 flex items-center gap-4 ${isSaving ? 'bg-slate-500 cursor-not-allowed text-white' : saveSuccess ? 'bg-[#10b981] text-white shadow-emerald-500/20' : 'bg-[#064e3b] text-white hover:bg-emerald-900 shadow-emerald-950/20'}`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Persistindo dados...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>
                      Configurações Atualizadas
                    </>
                  ) : 'Salvar Alterações de Planta'}
                </button>
                {saveSuccess && <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[2px] animate-pulse">Sincronização concluída com sucesso.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {(showForm || editingUser) && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[48px] p-12 w-full max-w-xl shadow-4xl border border-white">
            <div className="text-center mb-10">
              <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
                {editingUser ? 'Ajustar Perfil' : 'Novo Colaborador'}
              </h4>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <input name="nome" defaultValue={editingUser?.nome} required className="w-full px-6 py-4 bg-slate-100 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 ring-emerald-500 transition-all" placeholder="NOME COMPLETO" />
                <div className="grid grid-cols-2 gap-4">
                  <select name="role" defaultValue={editingUser?.role || 'Operador'} className="w-full px-6 py-4 bg-slate-100 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all cursor-pointer">
                    <option value="Admin">Administrador</option>
                    <option value="Operador">Operador</option>
                  </select>
                  <select name="departamento" defaultValue={editingUser?.departamento || 'preImpressao'} className="w-full px-6 py-4 bg-slate-100 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all cursor-pointer">
                    <option value="Geral">Todos os Setores</option>
                    {Object.entries(DEPARTMENTS).map(([k, v]) => <option key={k} value={k}>{v.toUpperCase()}</option>)}
                  </select>
                </div>
                <input name="email" defaultValue={editingUser?.email} required className="w-full px-6 py-4 bg-slate-100 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all" placeholder="ID DE LOGIN (E-MAIL)" />
                <input name="cargo" defaultValue={editingUser?.cargo} required className="w-full px-6 py-4 bg-slate-100 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all" placeholder="CARGO NA PLANTA" />
              </div>
              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => { setShowForm(false); setEditingUser(null); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-[#064e3b] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-950/20 hover:bg-emerald-900 transition-all active:scale-95">Confirmar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementModal;
