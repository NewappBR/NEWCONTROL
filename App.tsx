
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order, Status, User, ProductionStep, SortConfig, Notification, HistoryEntry, CompanySettings, GlobalLogEntry, Ramal, DEPARTMENTS, TaskAssignment, NetworkPath } from './types';
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
  const kanbanRef = useRef<KanbanViewHandle>(null); // Ref para controlar o Kanban
  
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

  // --- CARREGAMENTO DE DADOS (Híbrido) ---
  const fetchData = async () => {
      setIsSyncing(true);
      const data = await loadFullData(); 
      
      if (data) {
          setConnectionStatus(data.isOffline ? 'offline' : 'online');

          // FORCE MOCK DATA IF LOW COUNT (FOR DEMO/TESTING AS REQUESTED)
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
    fetchData(); // Carga inicial

    subscribeToChanges(() => {
        fetchData(); 
    });
  }, []);

  // Updated Tab Type - Removed GESTÃO as it is now inside Kanban
  const [activeTab, setActiveTab] = useState<'OPERACIONAL' | 'CONCLUÍDAS' | 'CALENDÁRIO' | 'KANBAN'>('OPERACIONAL');
  const [dashboardFilter, setDashboardFilter] = useState<'TODAS' | 'PRODUCAO' | 'ATRASADAS'>('TODAS');
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
  
  // Assignment Modal Control
  const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean; orderId: string | null; step: ProductionStep | null }>({
      isOpen: false, orderId: null, step: null
  });

  // Collapse States
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false); // Desktop
  const [isMobileDockCollapsed, setIsMobileDockCollapsed] = useState(false); // Mobile

  const [manualNotifications, setManualNotifications] = useState<Notification[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);

  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' | 'info' }>({ 
    show: false, message: '', type: 'info' 
  });

  // Derived state to check if any modal is open (to hide mobile dock)
  const isAnyModalOpen = showOrderModal || showQRModal || showHistoryModal || showUserManagement || showOperatorPanel || showCreateAlert || showScanner || showTechSheetModal || showNotifications || attachmentModal.isOpen || assignmentModal.isOpen;

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

  const handleDashboardFilterClick = (filter: 'TODAS' | 'PRODUCAO' | 'ATRASADAS') => {
      setSearchTerm(''); // Limpa a busca para garantir que a lista apareça
      setActiveTab('OPERACIONAL'); 
      setDashboardFilter(filter); 
      if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' }); 
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

  // Persistência Híbrida
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

  // Helper para limpar notificação específica de atribuição
  const clearAssignmentNotification = (orderId: string, userId: string) => {
      setSystemNotifications(prev => prev.filter(n => {
          // Mantém se não for a notificação desta ordem para este usuário
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
      // Ação: Reset de Senha
      if (notification.metadata && notification.metadata.type === 'RESET_PASSWORD') {
          const targetLogin = String(notification.metadata.targetUserLogin || '').trim();
          const targetUser = users.find(u => u.email.toLowerCase().includes(targetLogin.toLowerCase()) || u.nome.toLowerCase().includes(targetLogin.toLowerCase()));
          if (targetUser) {
              handleUpdateUsers(users.map(user => user.id === targetUser.id ? { ...user, password: '1234' } : user));
              handleMarkAsRead(notification.id);
              showToast(`Senha de "${targetUser.nome}" resetada para 1234`, 'success');
          } else { showToast(`Erro: Usuário não encontrado.`, 'error'); }
      }
      
      // Ação: Ver Meus Trabalhos (Nova Atribuição)
      if (notification.metadata && notification.metadata.type === 'ASSIGNMENT') {
          handleMarkAsRead(notification.id);
          setActiveTab('KANBAN'); // Troca para a aba Kanban
          setShowNotifications(false); // Fecha o painel de notificações
          // Pequeno delay para garantir que o Kanban montou e a ref está disponível
          setTimeout(() => {
              if (kanbanRef.current) {
                  kanbanRef.current.switchToMyTasks(); // Força a visão "Meus Trabalhos"
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

  // --- ACTIONS (Atualizam localmente + API em background) ---

  const handleUpdateStatus = async (id: string, step: ProductionStep, next: Status) => {
    // 1. Atualização Otimista no Estado React
    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex === -1) return;
    
    const order = orders[orderIndex];
    const newEntry: HistoryEntry = { userId: currentUser?.id || 'sys', userName: currentUser?.nome || 'Sistema', timestamp: new Date().toISOString(), status: next, sector: step };
    
    // Atualização de Assignment se houver
    let updatedAssignments = order.assignments ? { ...order.assignments } : {};
    const currentAssignment = updatedAssignments[step];

    if (currentAssignment) {
        if (next === 'Em Produção' && !currentAssignment.startedAt) {
            // INICIAR TAREFA (Marca tempo e remove notificação)
            updatedAssignments[step] = { ...currentAssignment, startedAt: new Date().toISOString() };
            clearAssignmentNotification(id, currentAssignment.userId);
        } else if (next === 'Concluído') {
            // FINALIZAR TAREFA
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

    // Atualiza UI
    const newOrders = [...orders];
    newOrders[orderIndex] = updatedOrder;
    setOrders(newOrders);

    // 2. Chama Service (que lida com LocalStorage/API)
    await apiUpdateOrder(updatedOrder);
  };

  // --- NOVA AÇÃO: ATRIBUIÇÃO DE TAREFA ---
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

      // Se userId vazio, remove a atribuição
      const updatedAssignments = { ...(order.assignments || {}) };
      if (userId) {
          updatedAssignments[step] = newAssignment;
      } else {
          delete updatedAssignments[step];
      }

      // Log no histórico
      const newEntry: HistoryEntry = { 
          userId: currentUser?.id || 'sys', 
          userName: assignerName, 
          timestamp: new Date().toISOString(), 
          status: order[step], // Mantém status atual (provavelmente Pendente)
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
          // CRIAR NOTIFICAÇÃO
          addNotification(
              'NOVA TAREFA DESIGNADA', 
              `Você foi designado para a O.R #${order.or} por ${assignerName}.`, 
              'info', 
              userId, 
              DEPARTMENTS[step],
              'VER MEUS TRABALHOS', // Label do botão que dispara a ação
              { type: 'ASSIGNMENT', orderId: orderId } // Metadata para ação
          );
      } else {
          showToast('Atribuição removida.', 'info');
      }
  };

  // Ação para salvar múltiplos caminhos de rede (ATUALIZADA para aceitar NetworkPath[])
  const handleSavePaths = async (orderId: string, paths: NetworkPath[]) => {
      const orderIndex = orders.findIndex(o => o.id === orderId);
      if (orderIndex === -1) return;

      const order = orders[orderIndex];
      // Atualiza paths E mantém retrocompatibilidade com filePath (usa o path do primeiro item)
      const updatedOrder = { 
          ...order, 
          filePaths: paths,
          filePath: paths.length > 0 ? paths[0].path : order.filePath 
      };

      const newOrders = [...orders];
      newOrders[orderIndex] = updatedOrder;
      setOrders(newOrders);

      await apiUpdateOrder(updatedOrder);
      showToast('Caminhos de rede salvos.', 'success');
  };

  // Trigger Assignment Modal from Management View
  const handleOpenAssignment = (orderId: string, step: ProductionStep) => {
      setAssignmentModal({ isOpen: true, orderId, step });
  };

  const handleArchiveOrder = async (id: string) => { 
      const order = orders.find(o => o.id === id);
      if (order) {
          const updated = { ...order, isArchived: true, archivedAt: new Date().toISOString() };
          setOrders(prev => prev.map(o => o.id === id ? updated : o));
          await apiUpdateOrder(updated);
      }
      showToast('ARQUIVADO', 'success'); 
  };

  const handleReactivateOrder = async (id: string) => { 
      const order = orders.find(o => o.id === id);
      if(order) {
          const updated: Order = { ...order, isArchived: false, archivedAt: undefined, expedicao: 'Pendente' };
          setOrders(prev => prev.map(o => o.id === id ? updated : o));
          await apiUpdateOrder(updated);
      }
      showToast('REATIVADO', 'success'); 
  };

  const handleDeleteOrder = async (id: string) => { 
      const order = orders.find(o => o.id === id);
      if (order) {
          const log: GlobalLogEntry = { id: Date.now().toString(), userId: currentUser?.id || 'sys', userName: currentUser?.nome || 'Sys', timestamp: new Date().toISOString(), actionType: 'DELETE_ORDER', targetInfo: `O.R #${order.or}` };
          handleUpdateLogs([...globalLogs, log]);
      }
      setOrders(prev => prev.filter(o => o.id !== id));
      await apiDeleteOrder(id);
      showToast('EXCLUÍDO', 'error'); 
  };

  // ... (Other handlers like handleBulkDeleteOrders, handleDeleteUser, handleSaveOrder... kept same)
  const handleBulkDeleteOrders = (ids: string[]) => { 
      const newLogs: GlobalLogEntry[] = [];
      const now = new Date().toISOString();
      ids.forEach(id => {
          const order = orders.find(o => o.id === id);
          if (order) {
              newLogs.push({
                  id: Math.random().toString(36).substr(2, 9),
                  userId: currentUser?.id || 'sys',
                  userName: currentUser?.nome || 'Sistema',
                  timestamp: now,
                  actionType: 'DELETE_ORDER',
                  targetInfo: `O.R #${order.or} - ${order.cliente} (Limpeza)`
              });
          }
      });
      handleUpdateLogs([...globalLogs, ...newLogs]);
      setOrders(prev => prev.filter(o => !ids.includes(o.id)));
      ids.forEach(async id => await apiDeleteOrder(id));
      showToast('LIMPEZA CONCLUÍDA', 'success'); 
  };

  const handleDeleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete) {
        const log: GlobalLogEntry = { 
            id: Date.now().toString(), 
            userId: currentUser?.id || 'sys', 
            userName: currentUser?.nome || 'Sys', 
            timestamp: new Date().toISOString(), 
            actionType: 'DELETE_USER', 
            targetInfo: `Usuário ${userToDelete.nome}` 
        };
        handleUpdateLogs([...globalLogs, log]);
    }
    const newUsers = users.filter(u => u.id !== id);
    handleUpdateUsers(newUsers);
    showToast('Usuário excluído.', 'success');
  };

  const handleSaveOrder = async (orderData: Partial<Order>[], idsToDelete?: string[]) => {
    if (idsToDelete && idsToDelete.length > 0) {
        setOrders(prev => prev.filter(o => !idsToDelete.includes(o.id)));
        for (const id of idsToDelete) await apiDeleteOrder(id);
    }
    const newOrdersList = [...orders];
    for (const itemData of orderData) {
        if (itemData.id && newOrdersList.some(o => o.id === itemData.id)) {
            const idx = newOrdersList.findIndex(o => o.id === itemData.id);
            if (idx !== -1) {
                const oldOrder = newOrdersList[idx];
                const newEntry: HistoryEntry = { userId: currentUser?.id || 'sys', userName: currentUser?.nome || 'Sys', timestamp: new Date().toISOString(), status: 'Dados Editados' as any, sector: 'Geral' };
                const updated = { ...oldOrder, ...itemData, history: [...(oldOrder.history || []), newEntry] } as Order;
                newOrdersList[idx] = updated;
                apiUpdateOrder(updated); 
            }
        } else {
            const newOrder = { 
                ...itemData,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.nome,
                preImpressao: 'Pendente', impressao: 'Pendente', producao: 'Pendente', instalacao: 'Pendente', expedicao: 'Pendente',
                isArchived: false,
                history: []
            } as Order;
            newOrdersList.unshift(newOrder); 
            apiCreateOrder(newOrder);
        }
    }
    setOrders(newOrdersList);
    showToast('Salvo com sucesso!', 'success');
    setShowOrderModal(false); 
    setEditingOrder(null);
  };

  const handleLogin = (loginOrName: string, pass: string) => {
    const input = loginOrName.trim().toLowerCase();
    const found = users.find(x => {
        const email = (x.email || '').toLowerCase().trim();
        const nome = (x.nome || '').toLowerCase().trim();
        return (email === input || nome === input) && x.password === pass;
    });
    if (found) { setCurrentUser(found); return true; }
    return false;
  };

  const handleResetRequest = (login: string) => { 
      localStorage.setItem('pcp_reset_request_user', login); 
      const admins = users.filter(u => u.role === 'Admin');
      admins.forEach(admin => {
          addNotification(
            '🔐 RESET DE SENHA', 
            `Usuário "${login}" pediu reset.`, 
            'urgent', 
            admin.id, 
            undefined,
            'RESETAR (1234)', 
            { type: 'RESET_PASSWORD', targetUserLogin: login }
          );
      });
      showToast("Solicitação enviada.", "success");
  };

  // Toggle Logic: Switch between Calendar, List and Kanban view
  // Not used directly but kept for compatibility logic
  const toggleViewMode = () => {
      setActiveTab(prev => prev === 'CALENDÁRIO' ? 'OPERACIONAL' : 'CALENDÁRIO');
  };

  const handleCreateNewOrder = () => {
      setEditingOrder(null); 
      setShowOrderModal(true);
  };

  if (!currentUser) return <Login onLogin={handleLogin} onResetPassword={handleResetRequest} companyLogo={companySettings.logoUrl} />;

  // Permission Check for Management Tab
  const showManagementTab = currentUser.isLeader === true || currentUser.role === 'Admin';

  return (
    <div className="h-screen flex flex-col bg-[#fdfdfd] dark:bg-slate-950 overflow-hidden relative transition-colors duration-300">
      <header className="bg-[#064e3b] dark:bg-emerald-950 h-14 flex items-center justify-between px-4 md:px-6 shrink-0 z-50 border-b border-emerald-900 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-inner p-1">
             <Logo src={companySettings.logoUrl} className="w-full h-full" />
          </div>
          <div className="hidden md:block"><h1 className="text-white font-black text-xs md:text-sm tracking-[2px] uppercase">{companySettings.name.split(' ')[0]}</h1><span className="text-emerald-400 font-black text-[8px] uppercase tracking-[3px]">CONTROL</span></div>
        </div>
        <div className="hidden md:flex flex-1 justify-center">
          <div className={`px-6 py-1.5 bg-black/20 rounded-full border border-white/5 flex items-center gap-3 ${isSyncing ? 'animate-pulse ring-1 ring-emerald-400' : ''}`}>
            <span className="text-emerald-400 font-black text-[10px] uppercase tracking-[2px] tabular-nums">{formatHeaderTime(currentTime)}</span>
            {connectionStatus === 'online' ? (
                <div className="w-2 h-2 bg-emerald-500 rounded-full" title="Online"></div>
            ) : (
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full" title="Modo Offline"></div>
                    <span className="text-[7px] text-slate-400 font-bold uppercase">OFFLINE</span>
                </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-5">
            {/* Ícone de Calendário/Lista/Kanban (Toggle) */}
            <div className="flex bg-black/20 rounded-lg p-1 gap-1">
                <button 
                    onClick={() => setActiveTab('OPERACIONAL')} 
                    className={`p-1.5 rounded-md transition-colors ${activeTab === 'OPERACIONAL' ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
                    title="Lista"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </button>
                <button 
                    onClick={() => setActiveTab('CALENDÁRIO')} 
                    className={`p-1.5 rounded-md transition-colors ${activeTab === 'CALENDÁRIO' ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
                    title="Calendário"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2.5"/></svg>
                </button>
                <button 
                    onClick={() => setActiveTab('KANBAN')} 
                    className={`p-1.5 rounded-md transition-colors ${activeTab === 'KANBAN' ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
                    title="Kanban (Fluxo)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 00-2 2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
            </div>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-white/70 hover:text-yellow-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2.5"/></svg></button>
            
            <button 
                onClick={() => setShowCreateAlert(true)} 
                className="p-2 text-white/70 hover:text-blue-400 transition-colors"
                title="Enviar Recado/Alerta"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            </button>

            <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-white/70 hover:text-emerald-400"><svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2.5"/></svg>{notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#064e3b]"></span>}</button>
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
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="hidden md:flex flex-col items-end"><span className="text-[11px] font-black text-white uppercase">{currentUser.nome}</span><span className="text-[8px] font-bold text-emerald-400 uppercase">{currentUser.cargo}</span></div>
                <button onClick={() => setShowOperatorPanel(true)} className="w-10 h-10 bg-white/10 hover:bg-emerald-500 text-white rounded-2xl flex items-center justify-center transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg></button>
            </div>
        </div>
      </header>

      <main ref={mainRef} className={`flex-1 bg-slate-50/30 dark:bg-slate-900/50 transition-all ${activeTab === 'KANBAN' ? 'overflow-hidden p-0' : 'overflow-auto p-0 md:p-4 pb-48 md:pb-32'}`}>
        <div className={`w-full max-w-[1450px] mx-auto h-full ${activeTab === 'KANBAN' ? '' : 'space-y-4 p-4 md:p-0'}`}>
          {activeTab !== 'KANBAN' && (
            <>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    {/* Stats Cards - Cores Suaves no Modo Claro, Transparência no Modo Escuro */}
                    <div onClick={() => handleDashboardFilterClick('TODAS')} className={`flex-1 p-4 rounded-3xl border flex items-center justify-between cursor-pointer transition-colors ${dashboardFilter === 'TODAS' && activeTab === 'OPERACIONAL' ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/20 dark:border-emerald-500/50' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                        <div><p className="text-[9px] font-black text-slate-400 uppercase">Ativas</p><p className="text-3xl font-black text-slate-900 dark:text-white">{stats.total}</p></div>
                    </div>
                    <div onClick={() => handleDashboardFilterClick('PRODUCAO')} className={`flex-1 p-4 rounded-3xl border flex items-center justify-between cursor-pointer transition-colors ${dashboardFilter === 'PRODUCAO' && activeTab === 'OPERACIONAL' ? 'bg-amber-50 border-amber-500 dark:bg-amber-900/20 dark:border-amber-500/50' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                        <div><p className="text-[9px] font-black text-slate-400 uppercase">Em Produção</p><p className="text-3xl font-black text-amber-500">{stats.emAndamento}</p></div>
                    </div>
                    <div onClick={() => handleDashboardFilterClick('ATRASADAS')} className={`flex-1 p-4 rounded-3xl border flex items-center justify-between cursor-pointer transition-colors ${dashboardFilter === 'ATRASADAS' && activeTab === 'OPERACIONAL' ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500/50' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                        <div><p className="text-[9px] font-black text-slate-400 uppercase">Atrasadas</p><p className="text-3xl font-black text-red-500">{stats.atrasadas}</p></div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sticky top-0 z-30">
                    <div className="flex flex-row items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-2 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <input type="text" placeholder="Buscar..." className="flex-1 w-full pl-4 pr-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-[11px] font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        <button onClick={() => { setEditingOrder(null); setShowOrderModal(true); }} className="px-6 py-3 bg-[#064e3b] dark:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-900 transition-all flex items-center gap-2">Nova O.R</button>
                    </div>
                </div>
            </>
          )}

          {activeTab === 'CALENDÁRIO' ? (
             <CalendarView orders={orders} onEditOrder={(o) => { setEditingOrder(o); setShowOrderModal(true); }} onDateClick={handleCalendarDateClick} />
          ) : activeTab === 'KANBAN' ? (
             <KanbanView 
                ref={kanbanRef}
                orders={orders} 
                onUpdateStatus={handleUpdateStatus} 
                onEditOrder={(o) => { setEditingOrder(o); setShowOrderModal(true); }} 
                currentUser={currentUser}
                onShowQR={(o) => setShowQRModal(o)}
                onShowAttachment={(o) => setAttachmentModal({ isOpen: true, order: o })}
                onShowTechSheet={handlePrintTechSheet}
                users={users}
                onAssignUser={(orderId, step, userId, note, assignerName) => handleAssignUser(orderId, step, userId, note, assignerName)}
             />
          ) : (
             <ProductionTable 
                ref={tableRef}
                orders={filteredOrders} 
                onUpdateStatus={handleUpdateStatus} 
                onEditOrder={(o) => { setEditingOrder(o); setShowOrderModal(true); }}
                onCreateOrder={() => { setEditingOrder(null); setShowOrderModal(true); }}
                onShowQR={(o) => setShowQRModal(o)}
                onDeleteOrder={handleDeleteOrder}
                onReactivateOrder={handleReactivateOrder}
                onArchiveOrder={handleArchiveOrder}
                onShowHistory={(o) => setShowHistoryModal(o)}
                onShowTechSheet={handlePrintTechSheet}
                onDirectPrint={handleDirectPrint}
                currentUser={currentUser}
                onSort={(key) => setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))}
                sortConfig={sortConfig}
                activeTab={activeTab}
                setActiveTab={setActiveTab as any}
                onScrollTop={handleScrollToTop}
                onShowScanner={() => setShowScanner(true)}
             />
          )}
        </div>
      </main>

      {/* ... (Resto do código dos modais e menu flutuante mantido) ... */}
      {!isAnyModalOpen && activeTab !== 'CALENDÁRIO' && activeTab !== 'KANBAN' && (
        <>
            {/* ... Mobile dock buttons code ... */}
            {isMobileDockCollapsed && (
                <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[800] md:hidden animate-in slide-in-from-bottom-4">
                    <button 
                        onClick={() => setIsMobileDockCollapsed(false)}
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-8 py-3 rounded-full shadow-2xl border-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 active:scale-95 transition-all"
                    >
                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-widest">ABRIR MENU</span>
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                </div>
            )}

            {!isMobileDockCollapsed && (
                <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[800] md:hidden w-[98%] max-w-[420px] animate-in slide-in-from-bottom-6 duration-300">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-1.5 rounded-[24px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 relative">
                        
                        <button 
                            onClick={() => setIsMobileDockCollapsed(true)}
                            className="absolute -top-6 left-1/2 -translate-x-1/2 w-20 h-10 bg-white dark:bg-slate-900 rounded-t-2xl shadow-sm border-t border-x border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all active:scale-95 z-0"
                            title="Recolher Ferramentas"
                        >
                            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mt-2"></div>
                        </button>

                        {/* ... Mobile Tabs ... */}
                        <div className="flex bg-slate-100 dark:bg-black/40 rounded-xl p-1 h-10 relative z-10">
                            <button 
                                onClick={() => setActiveTab('OPERACIONAL')}
                                className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all z-10 ${activeTab === 'OPERACIONAL' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}
                            >
                                Produção
                            </button>
                            <button 
                                onClick={() => setActiveTab('CONCLUÍDAS')}
                                className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all z-10 ${activeTab === 'CONCLUÍDAS' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}
                            >
                                Arquivo
                            </button>
                            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-800 rounded-lg shadow-sm transition-transform duration-300 ${activeTab === 'CONCLUÍDAS' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}></div>
                        </div>

                        {/* ... Mobile Tools ... */}
                        <div className="flex justify-between items-end px-0.5 pb-0.5 relative h-14 z-10">
                            <div className="flex gap-1 overflow-x-auto custom-scrollbar w-[calc(50%-32px)] pr-0.5 items-center h-full justify-start mask-linear-fade-right">
                                <button onClick={() => tableRef.current?.expandAll()} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 flex items-center justify-center active:scale-90 transition-transform shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth="2"/></svg></button>
                                <button onClick={() => tableRef.current?.collapseAll()} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v16h16V4H4z" strokeWidth="2"/><path d="M9 9l6 6m0-6l-6 6" strokeWidth="2"/></svg></button>
                                <button onClick={() => tableRef.current?.expandToday()} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                                <button onClick={() => handleScrollToTop()} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 z-20">
                                <button onClick={() => setShowScanner(true)} className="w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900 active:scale-90 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4h4V8H6zm14 10.5c0 .276-.224.5-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3z" strokeWidth="2"/></svg></button>
                            </div>
                            <div className="flex gap-1 overflow-x-auto custom-scrollbar w-[calc(50%-32px)] pl-0.5 items-center h-full justify-end mask-linear-fade-left">
                                <button onClick={() => tableRef.current?.expandWeeks()} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 flex items-center justify-center active:scale-90 transition-transform shrink-0 font-black text-[9px]">SEM</button>
                                <button onClick={() => tableRef.current?.expandOrders()} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 flex items-center justify-center active:scale-90 transition-transform shrink-0 font-black text-[9px]">ORD</button>
                                <button onClick={handleCreateNewOrder} className="w-9 h-9 rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30 flex items-center justify-center active:scale-90 transition-transform shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                                <button onClick={() => setShowOperatorPanel(true)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* --- FLOATING CONTROL ISLAND (DESKTOP) --- */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 hidden md:block w-auto`}>
          {isToolbarCollapsed ? (
              <button onClick={() => setIsToolbarCollapsed(false)} className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-8 py-3 rounded-full shadow-2xl border-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 hover:scale-105 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"><span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-widest group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Abrir Menu</span><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          ) : ( <></> )}
      </div>

      {/* MODALS */}
      {showQRModal && <QRCodeModal order={showQRModal} companySettings={companySettings} onClose={() => setShowQRModal(null)} />}
      {showOrderModal && <OrderModal order={editingOrder || undefined} existingOrders={orders} onClose={() => { setShowOrderModal(false); setEditingOrder(null); }} onSave={handleSaveOrder} currentUser={currentUser} companySettings={companySettings} showToast={showToast} />}
      {showHistoryModal && <OrderHistoryModal order={showHistoryModal} onClose={() => setShowHistoryModal(null)} />}
      {showUserManagement && <UserManagementModal users={users} orders={orders} companySettings={companySettings} ramais={ramais} globalLogs={globalLogs} onClose={() => setShowUserManagement(false)} onAddUser={(u) => handleUpdateUsers([...users, { ...u, id: Date.now().toString() } as User])} onDeleteUser={handleDeleteUser} onUpdateUser={(u) => handleUpdateUsers(users.map(user => user.id === u.id ? u : user))} onUpdateCompanySettings={handleUpdateSettings} onUpdateRamais={setRamais} onBulkDeleteOrders={handleBulkDeleteOrders} showToast={showToast} />}
      {showOperatorPanel && <OperatorPanel user={currentUser} ramais={ramais} onClose={() => setShowOperatorPanel(false)} onLogout={() => setCurrentUser(null)} onOpenManagement={() => { setShowOperatorPanel(false); setShowUserManagement(true); }} onUpdateUser={(u) => handleUpdateUsers(users.map(user => user.id === currentUser.id ? { ...user, ...u } : user))} onRequestReset={() => handleResetRequest(currentUser.email)} darkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} />}
      {showCreateAlert && <CreateAlertModal users={users} currentUser={currentUser} onClose={() => setShowCreateAlert(false)} onSend={handleCreateAlert} />}
      {showScanner && <QRScannerModal onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />}
      
      {showTechSheetModal && (
          <TechnicalSheetModal 
              order={showTechSheetModal} 
              allOrders={orders} 
              companySettings={companySettings} 
              onClose={() => setShowTechSheetModal(null)} 
              onEdit={() => { setEditingOrder(showTechSheetModal); setShowTechSheetModal(null); setShowOrderModal(true); }} 
              onUpdateStatus={handleUpdateStatus} 
              onShowQR={(o) => setShowQRModal(o)} 
              currentUser={currentUser} 
              onSavePaths={handleSavePaths}
          />
      )}

      {attachmentModal.isOpen && attachmentModal.order && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200" onClick={() => setAttachmentModal({isOpen: false, order: null})}>
           <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-700 relative max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-4 shrink-0">Anexos #{attachmentModal.order.or}</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-3 p-1">
                 {attachmentModal.order.attachments?.map(att => (
                    <div key={att.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center">
                       <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center mb-2 text-slate-400 overflow-hidden shadow-sm">
                          {att.type?.startsWith('image/') ? ( <img src={att.dataUrl} className="w-full h-full object-cover" alt="preview" /> ) : ( <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> )}
                       </div>
                       <p className="text-[8px] font-bold text-slate-700 dark:text-slate-300 truncate w-full mb-2" title={att.name}>{att.name}</p>
                       <button onClick={() => { 
                           const link = document.createElement('a'); link.href = att.dataUrl; link.download = att.name; document.body.appendChild(link); link.click(); document.body.removeChild(link);
                        }} className="w-full py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[8px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-colors">Baixar</button>
                    </div>
                 ))}
                 {(!attachmentModal.order.attachments || attachmentModal.order.attachments.length === 0) && <p className="col-span-2 text-center text-slate-400 text-xs py-4">Nenhum anexo.</p>}
              </div>
              <button onClick={() => setAttachmentModal({isOpen: false, order: null})} className="mt-4 w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase text-[10px] rounded-xl">Fechar</button>
           </div>
        </div>
      )}
      
      {/* Assignment Modal (Reused for Kanban View) */}
      {assignmentModal.isOpen && assignmentModal.step && (
          <AssignmentModal 
              isOpen={assignmentModal.isOpen}
              onClose={() => setAssignmentModal({ isOpen: false, orderId: null, step: null })}
              users={users}
              currentStep={assignmentModal.step}
              onAssign={(userId, note) => handleAssignUser(assignmentModal.orderId!, assignmentModal.step!, userId, note, currentUser.nome)}
              currentAssignment={orders.find(o => o.id === assignmentModal.orderId)?.assignments?.[assignmentModal.step]}
          />
      )}

      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[1000] animate-in slide-in-from-top border border-white/10 ${toast.type === 'success' ? 'bg-[#064e3b] text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}>
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default App;
