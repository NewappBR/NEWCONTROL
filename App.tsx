
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order, Status, User, ProductionStep, SortConfig, Notification, HistoryEntry, CompanySettings, GlobalLogEntry, Ramal, DEPARTMENTS, TaskAssignment, NetworkPath, Attachment } from './types';
import ProductionTable, { ProductionTableHandle } from './components/ProductionTable';
import Login from './components/Login';
import QRCodeModal from './components/QRCodeModal';
import OrderModal from './components/OrderModal';
import NotificationPanel from './components/NotificationPanel';
import UserManagementModal from './components/UserManagementModal';
import OrderHistoryModal from './components/OrderHistoryModal';
import CalendarView from './components/CalendarView';
import KanbanView, { KanbanViewHandle } from './components/KanbanView';
import AssignmentModal from './components/AssignmentModal';
import OperatorPanel from './components/OperatorPanel';
import CreateAlertModal from './components/CreateAlertModal';
import QRScannerModal from './components/QRScannerModal';
import TechnicalSheetModal from './components/TechnicalSheetModal';
import Logo from './components/Logo';
import { MOCK_USERS, DEFAULT_USER_PASS, MOCK_ORDERS } from './constants';
import { 
  loadFullData, 
  apiCreateOrder, 
  apiUpdateOrder, 
  apiDeleteOrder, 
  saveGlobalData, 
  subscribeToChanges 
} from './services/storageService';
import { generateTechnicalSheetHtml } from './utils/printHelpers';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('offline');
  
  const mainRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<ProductionTableHandle>(null);
  const kanbanRef = useRef<KanbanViewHandle>(null); 
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ramais, setRamais] = useState<Ramal[]>([]);
  const [globalLogs, setGlobalLogs] = useState<GlobalLogEntry[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
      name: 'NEWCOM CONTROL',
      address: 'Rua da Produção, 123',
      contact: 'Tel: (00) 0000-0000',
      reminderEnabled: false
  });

  // Controls for Floating Dock (Unified)
  const [isDockExpanded, setIsDockExpanded] = useState(true);

  // --- CARREGAMENTO DE DADOS (Híbrido) ---
  const fetchData = async () => {
      setIsSyncing(true);
      const data = await loadFullData(); 
      
      if (data) {
          setConnectionStatus(data.isOffline ? 'offline' : 'online');

          if (!data.orders || data.orders.length < 5) {
              console.log("Carregando dados de exemplo (Mock)...");
              setOrders(MOCK_ORDERS); 
          } else {
              setOrders(data.orders);
          }

          if (data.users && data.users.length > 0) setUsers(data.users);
          
          if (data.settings && Object.keys(data.settings).length > 0) {
              setCompanySettings(data.settings);
          }
          if (data.logs) setGlobalLogs(data.logs);
      }
      
      setIsDataLoaded(true);
      setTimeout(() => setIsSyncing(false), 500);
  };

  useEffect(() => {
    fetchData(); 

    subscribeToChanges(() => {
        fetchData(); 
    });
  }, []);

  const [activeTab, setActiveTab] = useState<'OPERACIONAL' | 'CONCLUÍDAS' | 'CALENDÁRIO' | 'KANBAN'>('OPERACIONAL');
  const [dashboardFilter, setDashboardFilter] = useState<'TODAS' | 'PRODUCAO' | 'ATRASADAS'>('TODAS');
  const [showDashboard, setShowDashboard] = useState(true); // Controle de visibilidade do dashboard
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showQRModal, setShowQRModal] = useState<Order | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showOperatorPanel, setShowOperatorPanel] = useState(false);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showTechSheetModal, setShowTechSheetModal] = useState<Order | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dataEntrega', direction: 'asc' });
  const [attachmentModal, setAttachmentModal] = useState<{ isOpen: boolean; order: Order | null }>({ isOpen: false, order: null });
  
  const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean; orderId: string | null; step: ProductionStep | null; userId?: string }>({
      isOpen: false, orderId: null, step: null
  });

  const [manualNotifications, setManualNotifications] = useState<Notification[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);

  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' | 'info' }>({ 
    show: false, message: '', type: 'info' 
  });

  const formatHeaderTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    };
    return date.toLocaleString('pt-BR', options).toUpperCase().replace(/\.|,/g, '');
  };

  const handleScrollToTop = () => {
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToBottom = () => {
    if (mainRef.current) mainRef.current.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
    else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); } 
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setInterval(() => { setCurrentTime(new Date()); checkAutomatedNotifications(); }, 60000); 
    checkAutomatedNotifications();
    return () => clearInterval(timer);
  }, [orders, currentUser]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleUpdateUsers = (newUsers: User[]) => {
      setUsers(newUsers);
      saveGlobalData(newUsers, undefined, undefined);
  };
  const handleUpdateSettings = (newSettings: CompanySettings) => {
      setCompanySettings(newSettings);
      saveGlobalData(undefined, newSettings, undefined);
  };
  const handleUpdateLogs = (newLogs: GlobalLogEntry[]) => {
      setGlobalLogs(newLogs);
      saveGlobalData(undefined, undefined, newLogs);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const addNotification = (title: string, message: string, type: 'urgent' | 'warning' | 'info' | 'success', targetId: string = 'ALL', sector?: string, actionLabel?: string, metadata?: any) => {
    const newNotif: Notification = {
      id: Date.now().toString() + Math.random().toString(),
      title, message, type, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      readBy: [], targetUserId: targetId, targetSector: sector || 'Geral',
      actionLabel, metadata
    };
    setSystemNotifications(prev => {
        const isDuplicate = prev.some(n => n.title === title && n.message === message && n.targetUserId === targetId);
        if (isDuplicate) return prev;
        return [newNotif, ...prev].slice(0, 50);
    });
  };

  const clearAssignmentNotification = (orderId: string, userId: string) => {
      setSystemNotifications(prev => prev.filter(n => {
          return !(n.metadata?.type === 'ASSIGNMENT' && n.metadata?.orderId === orderId && n.targetUserId === userId);
      }));
  };

  const checkAutomatedNotifications = () => {
    if (!currentUser) return;
    const todayStr = new Date().toLocaleDateString('en-CA');
    const newAlerts: Notification[] = [];
    orders.forEach(o => {
      if (o.isArchived) return;
      if (o.dataEntrega === todayStr) {
        newAlerts.push({ id: `today-${o.id}-${todayStr}`, title: '📅 ATENÇÃO: PRAZO HOJE', message: `O.R #${o.or} vence hoje. Prioridade máxima.`, type: 'warning', timestamp: new Date().toLocaleTimeString(), readBy: [], targetUserId: 'ALL', targetSector: 'Geral', referenceDate: o.dataEntrega });
      }
      if (o.dataEntrega < todayStr) {
        newAlerts.push({ id: `delay-${o.id}-${todayStr}`, title: '🚨 URGENTE: ATRASADO', message: `O.R #${o.or} está atrasada!`, type: 'urgent', timestamp: new Date().toLocaleTimeString(), readBy: [], targetUserId: 'ALL', targetSector: 'Geral', referenceDate: o.dataEntrega });
      }
    });
    setSystemNotifications(prev => {
        const currentIds = new Set(prev.map(n => n.id));
        const uniqueNewAlerts = newAlerts.filter(a => !currentIds.has(a.id));
        if (uniqueNewAlerts.length === 0) return prev;
        return [...uniqueNewAlerts, ...prev].slice(0, 50);
    });
  };

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const allNotifs = [...manualNotifications, ...systemNotifications];
    const visibleNotifs = allNotifs.filter(n => {
       const isForUser = n.targetUserId === 'ALL' || n.targetUserId === currentUser.id;
       if (!isForUser || n.readBy.includes(currentUser.id)) return false;
       return true;
    });
    const typePriority = { urgent: 3, warning: 2, success: 1, info: 0 };
    return visibleNotifs.sort((a, b) => typePriority[b.type] - typePriority[a.type]);
  }, [manualNotifications, systemNotifications, currentUser]);

  const handleCreateAlert = (targetUserId: string, title: string, message: string, type: Notification['type'], date?: string) => {
    const newAlert: Notification = { 
        id: `manual-${Date.now()}`, title: title.toUpperCase(), message, type, timestamp: new Date().toLocaleTimeString(), readBy: [], targetUserId, senderName: currentUser?.nome, referenceDate: date, targetSector: 'Geral' 
    };
    setManualNotifications(prev => [newAlert, ...prev]);
    showToast('Alerta enviado!', 'success');
  };

  const handleMarkAsRead = (id: string) => {
    if (!currentUser) return;
    const updateReadBy = (n: Notification) => n.id === id && !n.readBy.includes(currentUser.id) ? { ...n, readBy: [...n.readBy, currentUser.id] } : n;
    setManualNotifications(prev => prev.map(updateReadBy)); 
    setSystemNotifications(prev => prev.map(updateReadBy));
  };

  const handleMarkAllRead = () => {
    if (!currentUser) return;
    const updateAll = (n: Notification) => (n.targetUserId === 'ALL' || n.targetUserId === currentUser.id) && !n.readBy.includes(currentUser.id) ? { ...n, readBy: [...n.readBy, currentUser.id] } : n;
    setManualNotifications(prev => prev.map(updateAll)); 
    setSystemNotifications(prev => prev.map(updateAll));
  };

  const handleNotificationAction = (notification: Notification) => { 
      if (notification.metadata && notification.metadata.type === 'RESET_PASSWORD') {
          const targetLogin = String(notification.metadata.targetUserLogin || '').trim();
          const targetUser = users.find(u => u.email.toLowerCase().includes(targetLogin.toLowerCase()) || u.nome.toLowerCase().includes(targetLogin.toLowerCase()));
          if (targetUser) {
              handleUpdateUsers(users.map(user => user.id === targetUser.id ? { ...user, password: '1234' } : user));
              handleMarkAsRead(notification.id);
              showToast(`Senha de "${targetUser.nome}" resetada para 1234`, 'success');
          } else { showToast(`Erro: Usuário não encontrado.`, 'error'); }
      }
      
      if (notification.metadata && notification.metadata.type === 'ASSIGNMENT') {
          handleMarkAsRead(notification.id);
          setActiveTab('KANBAN'); 
          setShowNotifications(false); 
          setTimeout(() => {
              if (kanbanRef.current) {
                  kanbanRef.current.switchToMyTasks(); 
                  showToast('Filtrando suas tarefas atribuídas.', 'info');
              }
          }, 100);
      }
  };

  const handleScanSuccess = (decodedText: string) => {
    setShowScanner(false);
    const orMatch = decodedText.match(/#(\w+)/);
    const orNumber = orMatch ? orMatch[1] : null;
    const foundOrder = orders.find(o => o.or === orNumber || decodedText.includes(o.or) || decodedText.includes(o.id));
    if (foundOrder) { setShowTechSheetModal(foundOrder); showToast(`O.R #${foundOrder.or} carregada!`, 'success'); } 
    else { showToast('O.R não encontrada no sistema.', 'error'); }
  };

  const handlePrintTechSheet = (order: Order) => setShowTechSheetModal(order);
  
  const handleDirectPrint = (order: Order) => {
    const html = generateTechnicalSheetHtml(order, orders, companySettings);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
      printWindow.document.close();
    }
  };

  const handleCalendarDateClick = (dateStr: string) => {
      setSearchTerm(dateStr.split('-').reverse().join('/'));
      setActiveTab('OPERACIONAL');
      setDashboardFilter('TODAS');
      showToast(`Filtrando por: ${dateStr.split('-').reverse().join('/')}`, 'info');
  };

  const stats = useMemo(() => {
    const active = orders.filter(o => !o.isArchived);
    const today = new Date().toISOString().split('T')[0];
    return {
      total: active.length,
      emAndamento: active.filter(o => ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'].includes(o.preImpressao) && o.preImpressao === 'Em Produção').length, 
      atrasadas: active.filter(o => o.dataEntrega < today).length
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders.filter(o => {
      const term = debouncedSearch.toLowerCase();
      const dateFormatted = o.dataEntrega.split('-').reverse().join('/');
      const matchesSearch = o.cliente.toLowerCase().includes(term) || o.or.toLowerCase().includes(term) || o.vendedor.toLowerCase().includes(term) || o.item.toLowerCase().includes(term) || (o.numeroItem && o.numeroItem.toLowerCase().includes(term)) || dateFormatted.includes(term);
      if (activeTab === 'CALENDÁRIO' || activeTab === 'KANBAN') return matchesSearch;
      return (activeTab === 'OPERACIONAL' ? !o.isArchived : o.isArchived) && matchesSearch;
    });
    if (activeTab === 'OPERACIONAL' && dashboardFilter !== 'TODAS') {
      if (dashboardFilter === 'PRODUCAO') result = result.filter(o => o.preImpressao === 'Em Produção' || o.impressao === 'Em Produção' || o.producao === 'Em Produção' || o.instalacao === 'Em Produção' || o.expedicao === 'Em Produção');
      else if (dashboardFilter === 'ATRASADAS') result = result.filter(o => o.dataEntrega < new Date().toISOString().split('T')[0]);
    }
    return result;
  }, [orders, activeTab, debouncedSearch, dashboardFilter]);

  const handleUpdateStatus = async (id: string, step: ProductionStep, next: Status) => {
    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex === -1) return;
    
    const order = orders[orderIndex];
    const newEntry: HistoryEntry = { userId: currentUser?.id || 'sys', userName: currentUser?.nome || 'Sistema', timestamp: new Date().toISOString(), status: next, sector: step };
    
    let updatedAssignments = order.assignments ? { ...order.assignments } : {};
    const currentAssignment = updatedAssignments[step];

    if (currentAssignment) {
        if (next === 'Em Produção' && !currentAssignment.startedAt) {
            updatedAssignments[step] = { ...currentAssignment, startedAt: new Date().toISOString() };
            clearAssignmentNotification(id, currentAssignment.userId);
        } else if (next === 'Concluído') {
            updatedAssignments[step] = { ...currentAssignment, completedAt: new Date().toISOString() };
        }
    }

    const updatedOrder = { 
        ...order, 
        [step]: next, 
        history: [...(order.history || []), newEntry],
        assignments: updatedAssignments 
    };
    
    if (step === 'expedicao' && next === 'Concluído') { 
        updatedOrder.isArchived = true; 
        updatedOrder.archivedAt = new Date().toISOString(); 
        showToast('FINALIZADO E ARQUIVADO', 'success'); 
    }

    const newOrders = [...orders];
    newOrders[orderIndex] = updatedOrder;
    setOrders(newOrders);

    await apiUpdateOrder(updatedOrder);
  };

  const handleAssignUser = async (orderId: string, step: ProductionStep, userId: string, note: string, assignerName: string) => {
      const orderIndex = orders.findIndex(o => o.id === orderId);
      if (orderIndex === -1) return;

      const order = orders[orderIndex];
      const targetUser = users.find(u => u.id === userId);
      const userName = targetUser ? targetUser.nome : 'Desconhecido';

      const newAssignment: TaskAssignment = {
          userId,
          userName,
          assignedBy: assignerName,
          assignedAt: new Date().toISOString(),
          note
      };

      const updatedAssignments = { ...(order.assignments || {}) };
      if (userId) {
          updatedAssignments[step] = newAssignment;
      } else {
          delete updatedAssignments[step];
      }

      const newEntry: HistoryEntry = { 
          userId: currentUser?.id || 'sys', 
          userName: assignerName, 
          timestamp: new Date().toISOString(), 
          status: order[step], 
          sector: step 
      };
      
      const updatedOrder = { 
          ...order, 
          assignments: updatedAssignments,
          history: [...(order.history || []), newEntry] 
      };

      const newOrders = [...orders];
      newOrders[orderIndex] = updatedOrder;
      setOrders(newOrders);
      
      await apiUpdateOrder(updatedOrder);
      
      if (userId) {
          showToast(`Tarefa atribuída a ${userName}`, 'success');
          addNotification(
              'NOVA TAREFA DESIGNADA', 
              `Você foi designado para a O.R #${order.or} por ${assignerName}.`, 
              'info', 
              userId, 
              DEPARTMENTS[step],
              'VER MEUS TRABALHOS', 
              { type: 'ASSIGNMENT', orderId: orderId } 
          );
      } else {
          showToast('Atribuição removida.', 'info');
      }
  };

  const handleSavePaths = async (orderId: string, paths: NetworkPath[]) => {
      const orderIndex = orders.findIndex(o => o.id === orderId);
      if (orderIndex === -1) return;

      const order = orders[orderIndex];
      const updatedOrder = { ...order, filePaths: paths };
      
      const newOrders = [...orders];
      newOrders[orderIndex] = updatedOrder;
      setOrders(newOrders);
      
      await apiUpdateOrder(updatedOrder);
      showToast('Caminhos de rede atualizados.', 'success');
  };

  const handleLogin = (email: string, pass: string) => {
    const user = users.find(u => u.email.toUpperCase() === email.toUpperCase() && u.password === pass);
    if (user) {
      setCurrentUser(user);
      if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowOperatorPanel(false);
    setActiveTab('OPERACIONAL');
  };

  const handleResetPasswordRequest = (email: string) => {
      const targetUser = users.find(u => u.email.toUpperCase() === email.toUpperCase());
      if (targetUser) {
          addNotification(
              'SOLICITAÇÃO DE RESET DE SENHA',
              `O usuário ${targetUser.nome} solicitou reset de senha.`,
              'urgent',
              'ALL',
              'Geral',
              'RESETAR AGORA',
              { type: 'RESET_PASSWORD', targetUserLogin: email }
          );
      }
  };

  const handleCreateOrder = (newOrdersData: Partial<Order>[], idsToDelete?: string[]) => {
    // 1. Process Deletions
    if (idsToDelete && idsToDelete.length > 0) {
        idsToDelete.forEach(id => {
            apiDeleteOrder(id);
        });
        setOrders(prev => prev.filter(o => !idsToDelete.includes(o.id)));
    }

    // 2. Process Adds/Updates
    newOrdersData.forEach(async (data) => {
        if (data.id) {
            // Update
            const orderIndex = orders.findIndex(o => o.id === data.id);
            if (orderIndex === -1) return;
            
            const existingOrder = orders[orderIndex];
            const updatedOrder = { ...existingOrder, ...data };
            
            // Check if archived status changed
            if (data.isArchived !== undefined && data.isArchived !== existingOrder.isArchived) {
                updatedOrder.archivedAt = data.isArchived ? new Date().toISOString() : undefined;
            }

            const newOrders = [...orders];
            newOrders[orderIndex] = updatedOrder; 
            setOrders(prev => prev.map(o => o.id === data.id ? updatedOrder : o)); 
            await apiUpdateOrder(updatedOrder);

        } else {
            // Create
            const newOrder: Order = {
                id: Date.now().toString() + Math.random().toString().slice(2, 5),
                or: data.or!,
                cliente: data.cliente!,
                vendedor: data.vendedor!,
                item: data.item!,
                dataEntrega: data.dataEntrega!,
                quantidade: data.quantidade,
                numeroItem: data.numeroItem,
                createdAt: data.createdAt || new Date().toISOString(),
                createdBy: currentUser?.nome || 'Sistema',
                preImpressao: 'Pendente',
                impressao: 'Pendente',
                producao: 'Pendente',
                instalacao: 'Pendente',
                expedicao: 'Pendente',
                prioridade: data.prioridade || 'Média',
                isArchived: false,
                isRemake: data.isRemake,
                observacao: data.observacao,
                assignments: {},
                history: [{
                    userId: currentUser?.id || 'sys',
                    userName: currentUser?.nome || 'Sistema',
                    timestamp: new Date().toISOString(),
                    status: 'Pendente',
                    sector: 'Geral'
                }],
                filePaths: data.filePath ? [{ name: 'Principal', path: data.filePath }] : [],
                attachments: data.attachments || []
            };
            
            setOrders(prev => [newOrder, ...prev]);
            await apiCreateOrder(newOrder);
            
            // Notify Leaders
            addNotification(
                'NOVA ORDEM CRIADA',
                `O.R #${newOrder.or} - ${newOrder.cliente}`,
                'info',
                'ALL', // Target everyone or specifically leaders
                'preImpressao', 
                'VER DETALHES'
            );
        }
    });

    setShowOrderModal(false);
    setEditingOrder(null);
    showToast('Salvo com sucesso!', 'success');
  };

  const handleBulkDelete = (ids: string[]) => {
      ids.forEach(id => apiDeleteOrder(id));
      setOrders(prev => prev.filter(o => !ids.includes(o.id)));
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} onResetPassword={handleResetPasswordRequest} companyLogo={companySettings.logoUrl} />;
  }

  // Calculate unread notifications
  const unreadCount = notifications.filter(n => !n.readBy.includes(currentUser.id)).length;

  return (
    <div className={`flex flex-col h-screen bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
        {/* TOAST */}
        {toast.show && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[1500] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 ${
                toast.type === 'success' ? 'bg-emerald-500 text-white' : 
                toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'
            }`}>
                {toast.type === 'success' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                {toast.type === 'error' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                <span className="text-xs font-black uppercase tracking-wide">{toast.message}</span>
            </div>
        )}

        {/* HEADER */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 md:px-8 flex justify-between items-center z-40 shrink-0 shadow-sm relative">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#064e3b] dark:bg-emerald-900 rounded-xl flex items-center justify-center shadow-lg text-emerald-400 p-1">
                    <Logo src={companySettings.logoUrl} className="w-full h-full" />
                </div>
                <div className="hidden md:block">
                    <h1 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{companySettings.name}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[2px]">{formatHeaderTime(currentTime)}</span>
                        {connectionStatus === 'offline' && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-black rounded uppercase">OFFLINE</span>}
                    </div>
                </div>
            </div>

            {/* VIEW MODE ICONS - MOVED TO HEADER */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
               <button 
                  onClick={() => setActiveTab('OPERACIONAL')}
                  className={`p-2 rounded-lg transition-all ${activeTab === 'OPERACIONAL' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  title="Lista"
               >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
               </button>
               <button 
                  onClick={() => setActiveTab('KANBAN')}
                  className={`p-2 rounded-lg transition-all ${activeTab === 'KANBAN' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  title="Kanban"
               >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
               </button>
               <button 
                  onClick={() => setActiveTab('CALENDÁRIO')}
                  className={`p-2 rounded-lg transition-all ${activeTab === 'CALENDÁRIO' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  title="Calendário"
               >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
               </button>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {/* Theme Toggle */}
                <button 
                    onClick={() => setIsDarkMode(!isDarkMode)} 
                    className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-all"
                    title="Alternar Tema"
                >
                    {isDarkMode ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                </button>

                <div className="relative">
                    <button onClick={() => setShowNotifications(!showNotifications)} className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-all relative">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2.5"/></svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full shadow-sm border-2 border-white dark:border-slate-900">{unreadCount}</span>
                        )}
                    </button>
                    {showNotifications && (
                        <NotificationPanel 
                            notifications={notifications} 
                            onClose={() => setShowNotifications(false)}
                            onMarkAsRead={handleMarkAsRead}
                            onMarkAllAsRead={handleMarkAllRead}
                            onAction={handleNotificationAction}
                        />
                    )}
                </div>

                <button onClick={() => setShowOperatorPanel(true)} className="flex items-center gap-3 pl-2 pr-2 md:pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 group">
                    <div className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                        {currentUser.nome[0]}
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                        <span className="text-[10px] font-black text-slate-700 dark:text-white uppercase leading-none">{currentUser.nome.split(' ')[0]}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-0.5">{currentUser.cargo || 'Operador'}</span>
                    </div>
                </button>
            </div>
        </header>

        {/* BIG DASHBOARD - Collapsible & Conditional */}
        {(activeTab === 'OPERACIONAL' || activeTab === 'CALENDÁRIO') && (
            <>
                <div className={`bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0 z-30 transition-all duration-300 overflow-hidden relative ${showDashboard ? 'max-h-[500px] py-6' : 'max-h-0 py-0'}`}>
                     <div className="px-4 md:px-8">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center group hover:scale-[1.02] transition-transform">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Total Ativas</span>
                               <span className="text-3xl font-black text-slate-700 dark:text-white leading-none">{stats.total}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center group hover:scale-[1.02] transition-transform">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-500 transition-colors">Em Produção</span>
                               <span className="text-3xl font-black text-amber-500 leading-none">{stats.emAndamento}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center group hover:scale-[1.02] transition-transform">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-red-500 transition-colors">Atrasadas</span>
                               <span className="text-3xl font-black text-red-500 leading-none">{stats.atrasadas}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center group hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => setShowCreateAlert(true)}>
                                <div className="flex flex-col items-center gap-2">
                                   <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-blue-500 flex items-center justify-center transition-colors">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" strokeWidth="2.5"/></svg>
                                   </div>
                                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Enviar Aviso</span>
                               </div>
                            </div>
                         </div>
                     </div>
                </div>
                
                {/* Collapse Button - Placed Outside to avoid clipping */}
                <div className="flex justify-center -mt-3 z-30 relative h-3">
                    <button 
                        onClick={() => setShowDashboard(!showDashboard)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-500 rounded-full w-6 h-6 flex items-center justify-center shadow-sm transition-transform active:scale-95"
                        title={showDashboard ? "Recolher Dashboard" : "Expandir Dashboard"}
                    >
                        <svg className={`w-3 h-3 transition-transform duration-300 ${showDashboard ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                </div>
            </>
        )}

        {/* MAIN CONTENT AREA */}
        <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 relative custom-scrollbar p-2 md:p-6 pb-40">
            
            {/* SEARCH & NEW ORDER BAR (ONLY FOR LIST/ARCHIVE VIEWS) */}
            {(activeTab === 'OPERACIONAL' || activeTab === 'CONCLUÍDAS') && (
                <div className="max-w-7xl mx-auto mb-6 flex gap-3 animate-in fade-in slide-in-from-top-4 mt-2">
                    <div className="flex-1 relative group">
                        <input 
                            type="text" 
                            placeholder={activeTab === 'OPERACIONAL' ? "BUSCAR NA PRODUÇÃO..." : "BUSCAR NO ARQUIVO..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] text-sm font-bold uppercase shadow-sm outline-none focus:ring-2 ring-emerald-500 transition-all dark:text-white"
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
                        
                        {/* New Order Button - INSIDE SEARCH BAR RIGHT SIDE */}
                        {activeTab === 'OPERACIONAL' && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <button 
                                    onClick={() => { setEditingOrder(null); setShowOrderModal(true); }}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
                                    <span className="hidden sm:inline">Nova O.R</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'KANBAN' ? (
                <KanbanView 
                    ref={kanbanRef}
                    orders={filteredOrders}
                    onUpdateStatus={handleUpdateStatus}
                    onEditOrder={(order) => { setEditingOrder(order); setShowOrderModal(true); }}
                    currentUser={currentUser}
                    onShowQR={(order) => setShowQRModal(order)}
                    onShowAttachment={(order) => { if(order.attachments?.length) setAttachmentModal({isOpen: true, order}); else showToast('Sem anexos', 'info'); }}
                    onShowTechSheet={handlePrintTechSheet}
                    users={users}
                    onAssignUser={handleAssignUser}
                />
            ) : activeTab === 'CALENDÁRIO' ? (
                <CalendarView 
                    orders={orders}
                    onEditOrder={(order) => { setEditingOrder(order); setShowOrderModal(true); }}
                    onDateClick={handleCalendarDateClick}
                />
            ) : (
                <ProductionTable 
                    ref={tableRef}
                    orders={filteredOrders}
                    onUpdateStatus={handleUpdateStatus}
                    onEditOrder={(order) => { setEditingOrder(order); setShowOrderModal(true); }}
                    onCreateOrder={() => { setEditingOrder(null); setShowOrderModal(true); }}
                    onShowQR={(order) => setShowQRModal(order)}
                    onDeleteOrder={apiDeleteOrder}
                    onReactivateOrder={(id) => {
                        const order = orders.find(o => o.id === id);
                        if (order) {
                            const updated = { ...order, isArchived: false, archivedAt: undefined };
                            setOrders(prev => prev.map(o => o.id === id ? updated : o));
                            apiUpdateOrder(updated);
                            showToast('O.R Reativada!', 'success');
                        }
                    }}
                    onArchiveOrder={(id) => {
                        const order = orders.find(o => o.id === id);
                        if (order) {
                            const updated = { ...order, isArchived: true, archivedAt: new Date().toISOString() };
                            setOrders(prev => prev.map(o => o.id === id ? updated : o));
                            apiUpdateOrder(updated);
                            showToast('O.R Arquivada!', 'success');
                        }
                    }}
                    onShowHistory={(order) => setShowHistoryModal(order)}
                    onShowTechSheet={handlePrintTechSheet}
                    onDirectPrint={handleDirectPrint}
                    currentUser={currentUser}
                    onSort={(key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                    sortConfig={sortConfig}
                    activeTab={activeTab === 'CONCLUÍDAS' ? 'CONCLUÍDAS' : 'OPERACIONAL'}
                    setActiveTab={(tab) => {
                        if (tab === 'CALENDÁRIO') setActiveTab('CALENDÁRIO');
                        else setActiveTab(tab as any);
                    }}
                    onScrollTop={handleScrollToTop}
                    onShowScanner={() => setShowScanner(true)}
                />
            )}
        </main>

        {/* --- FLOATING DOCK (ONLY VISIBLE IN LIST/CALENDAR) --- */}
        {(activeTab === 'OPERACIONAL' || activeTab === 'CONCLUÍDAS' || activeTab === 'CALENDÁRIO') && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-in slide-in-from-bottom-10 duration-500 w-full max-w-sm pointer-events-none gap-2">
                
                {isDockExpanded ? (
                    <>
                        {/* 1. Main Navigation Pill (Dark) */}
                        <div className="pointer-events-auto bg-slate-900/95 dark:bg-black/90 backdrop-blur-xl p-1.5 rounded-full shadow-2xl border border-slate-700/50 ring-1 ring-white/10 flex items-center relative animate-in fade-in zoom-in-95">
                            {/* Production Button */}
                            <button 
                                onClick={() => setActiveTab('OPERACIONAL')} 
                                className={`
                                    pl-6 pr-8 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all
                                    ${activeTab === 'OPERACIONAL' 
                                        ? 'bg-emerald-600 text-white shadow-lg' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                Produção
                            </button>

                            {/* QR Scanner Center Button (Floating Overlay) */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <button 
                                    onClick={() => setShowScanner(true)}
                                    className="w-14 h-14 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 border-[4px] border-[#f8fafc] dark:border-slate-950 z-20 group relative"
                                    title="Ler QR Code"
                                >
                                    <svg className="w-6 h-6 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4h4V8H6zm14 10.5c0 .276-.224.5-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3z" strokeWidth="2.5"/></svg>
                                </button>
                            </div>

                            {/* Spacer for Center Button */}
                            <div className="w-10"></div>

                            {/* Archive Button */}
                            <button 
                                onClick={() => setActiveTab('CONCLUÍDAS')} 
                                className={`
                                    pl-8 pr-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all
                                    ${activeTab === 'CONCLUÍDAS' 
                                        ? 'bg-slate-700 text-white shadow-lg' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                Arquivo
                            </button>
                        </div>

                        {/* 2. Tools Row (Scrollable Actions - Light/Glassy) */}
                        <div className="pointer-events-auto flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 animate-in slide-in-from-bottom-2 fade-in max-w-full overflow-x-auto custom-scrollbar no-scrollbar">
                            
                            {/* Quick Filters/Actions */}
                            <button onClick={() => tableRef.current?.expandOrders()} className="w-10 h-10 shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all shadow-sm" title="Ver Lista"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                            <button onClick={() => tableRef.current?.expandAll()} className="w-10 h-10 shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all shadow-sm" title="Expandir Tudo"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 13l-7 7-7-7m14-8l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                            <button onClick={() => tableRef.current?.collapseAll()} className="w-10 h-10 shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all shadow-sm" title="Recolher Tudo"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7m-14-8l7-7 7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                            
                            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>

                            <button onClick={() => tableRef.current?.expandToday()} className="w-10 h-10 shrink-0 bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl flex items-center justify-center transition-all font-black text-[9px] shadow-sm" title="Hoje">HOJE</button>
                            <button onClick={() => tableRef.current?.expandWeeks()} className="w-10 h-10 shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all font-black text-[9px] shadow-sm" title="Semana">SEM</button>
                            
                            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0"></div>

                            <button onClick={handleScrollToTop} className="w-10 h-10 shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all shadow-sm" title="Topo"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                            
                            {/* Hide Tools Toggle (Collapses EVERYTHING) */}
                            <button onClick={() => setIsDockExpanded(false)} className="w-8 h-8 shrink-0 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all ml-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        </div>
                    </>
                ) : (
                    // Show Tools Trigger (Small chevron) - Opens EVERYTHING
                    <button 
                        onClick={() => setIsDockExpanded(true)} 
                        className="pointer-events-auto mt-1 w-10 h-8 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                )}
            </div>
        )}

        {/* MODALS */}
        {showOrderModal && (
            <OrderModal 
                order={editingOrder || undefined} 
                existingOrders={orders}
                onClose={() => { setShowOrderModal(false); setEditingOrder(null); }}
                onSave={handleCreateOrder}
                currentUser={currentUser}
                companySettings={companySettings}
                showToast={showToast}
            />
        )}

        {showQRModal && (
            <QRCodeModal 
                order={showQRModal} 
                companySettings={companySettings}
                onClose={() => setShowQRModal(null)} 
            />
        )}

        {showHistoryModal && (
            <OrderHistoryModal 
                order={showHistoryModal} 
                onClose={() => setShowHistoryModal(null)} 
            />
        )}

        {showOperatorPanel && (
            <OperatorPanel 
                user={currentUser}
                ramais={ramais}
                onClose={() => setShowOperatorPanel(false)}
                onLogout={handleLogout}
                onOpenManagement={() => { setShowOperatorPanel(false); setShowUserManagement(true); }}
                onUpdateUser={(data) => {
                    const updated = { ...currentUser, ...data };
                    handleUpdateUsers(users.map(u => u.id === currentUser.id ? updated : u));
                    setCurrentUser(updated);
                }}
                onRequestReset={() => {}}
                darkMode={isDarkMode}
                onToggleTheme={() => setIsDarkMode(!isDarkMode)}
            />
        )}

        {showUserManagement && (
            <UserManagementModal 
                users={users}
                orders={orders}
                companySettings={companySettings}
                ramais={ramais}
                globalLogs={globalLogs}
                onClose={() => setShowUserManagement(false)}
                onAddUser={(userData) => {
                    const newUser: User = { 
                        id: Date.now().toString(), 
                        ...userData as any,
                        isLeader: userData.isLeader || false 
                    };
                    handleUpdateUsers([...users, newUser]);
                    showToast('Colaborador adicionado.', 'success');
                }}
                onDeleteUser={(id) => {
                    const deletedUser = users.find(u => u.id === id);
                    if (deletedUser) {
                        const log: GlobalLogEntry = { id: Date.now().toString(), userId: currentUser.id, userName: currentUser.nome, timestamp: new Date().toISOString(), actionType: 'DELETE_USER', targetInfo: deletedUser.nome };
                        handleUpdateLogs([...globalLogs, log]);
                    }
                    handleUpdateUsers(users.filter(u => u.id !== id));
                    showToast('Colaborador removido.', 'success');
                }}
                onUpdateUser={(updatedUser) => {
                    handleUpdateUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
                    if (currentUser.id === updatedUser.id) setCurrentUser(updatedUser);
                    showToast('Dados atualizados.', 'success');
                }}
                onUpdateCompanySettings={handleUpdateSettings}
                onUpdateRamais={(newRamais) => { setRamais(newRamais); saveGlobalData(undefined, undefined, undefined); }} 
                onBulkDeleteOrders={handleBulkDelete}
                showToast={showToast}
            />
        )}

        {showCreateAlert && (
            <CreateAlertModal 
                users={users} 
                currentUser={currentUser} 
                onClose={() => setShowCreateAlert(false)} 
                onSend={handleCreateAlert} 
            />
        )}

        {showScanner && (
            <QRScannerModal 
                onScanSuccess={handleScanSuccess} 
                onClose={() => setShowScanner(false)} 
            />
        )}

        {showTechSheetModal && (
            <TechnicalSheetModal 
                order={showTechSheetModal} 
                allOrders={orders}
                companySettings={companySettings}
                onClose={() => setShowTechSheetModal(null)}
                onEdit={() => { setEditingOrder(showTechSheetModal); setShowTechSheetModal(null); setShowOrderModal(true); }}
                onUpdateStatus={handleUpdateStatus}
                onShowQR={(o) => { setShowTechSheetModal(null); setShowQRModal(o); }}
                currentUser={currentUser}
                onSavePaths={handleSavePaths}
            />
        )}

        {/* Assignment Modal (Global for Drag & Drop from ManagementView) */}
        {assignmentModal.isOpen && assignmentModal.step && (
            <AssignmentModal
                isOpen={assignmentModal.isOpen}
                onClose={() => setAssignmentModal({ isOpen: false, orderId: null, step: null })}
                users={users}
                currentStep={assignmentModal.step}
                onAssign={(userId, note) => {
                    if (assignmentModal.orderId) {
                        handleAssignUser(assignmentModal.orderId, assignmentModal.step!, userId, note, currentUser.nome);
                    }
                    setAssignmentModal({ isOpen: false, orderId: null, step: null });
                }}
                currentAssignment={orders.find(o => o.id === assignmentModal.orderId)?.assignments?.[assignmentModal.step]}
                preSelectedUserId={assignmentModal.userId}
            />
        )}
    </div>
  );
};

export default App;
