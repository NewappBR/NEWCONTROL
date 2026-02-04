
import React, { useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Order, Status, ProductionStep, User, SortConfig, Attachment } from '../types';

export interface ProductionTableHandle {
  expandAll: () => void;
  collapseAll: () => void;
  expandToday: () => void;
  expandWeeks: () => void;
  expandOrders: () => void;
  scrollToTop: () => void;
}

interface ProductionTableProps {
  orders: Order[];
  onUpdateStatus: (id: string, field: ProductionStep, next: Status) => void;
  onEditOrder: (order: Order) => void;
  onCreateOrder?: () => void;
  onShowQR: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onReactivateOrder: (id: string) => void;
  onArchiveOrder?: (id: string) => void;
  onShowHistory?: (order: Order) => void;
  onShowTechSheet?: (order: Order) => void;
  onDirectPrint?: (order: Order) => void;
  currentUser: User;
  onSort: (key: string) => void;
  sortConfig: SortConfig;
  activeTab?: 'OPERACIONAL' | 'CONCLUÍDAS' | 'CALENDÁRIO';
  setActiveTab?: (tab: 'OPERACIONAL' | 'CONCLUÍDAS' | 'CALENDÁRIO') => void;
  onScrollTop?: () => void;
  onShowScanner?: () => void;
}

const STEP_LABELS: Record<ProductionStep, string> = {
  preImpressao: 'DESIGN',
  impressao: 'IMPRESSÃO',
  producao: 'ACABAM.',
  instalacao: 'INSTAL.',
  expedicao: 'LOGÍST.',
  Geral: 'GERAL'
};

const ProductionTable = forwardRef<ProductionTableHandle, ProductionTableProps>(({ 
  orders, 
  onUpdateStatus, 
  onEditOrder,
  onCreateOrder, 
  onShowQR, 
  onShowHistory,
  onShowTechSheet,
  onDirectPrint,
  onDeleteOrder,
  onReactivateOrder,
  onArchiveOrder,
  currentUser, 
  onSort, 
  sortConfig,
  activeTab,
  setActiveTab,
  onScrollTop,
  onShowScanner
}, ref) => {
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; orderId: string | null; or: string | null }>({ isOpen: false, orderId: null, or: null });
  const [reactivateModal, setReactivateModal] = useState<{ isOpen: boolean; orderId: string | null; or: string | null }>({ isOpen: false, orderId: null, or: null });
  const [shareModal, setShareModal] = useState<{ isOpen: boolean; order: Order | null }>({ isOpen: false, order: null });
  const [attachmentModal, setAttachmentModal] = useState<{ isOpen: boolean; order: Order | null }>({ isOpen: false, order: null });
  
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedOrs, setExpandedOrs] = useState<Set<string>>(new Set());
  
  // Estado para desktop (true = colapsado)
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);

  // Novo estado para filtro por coluna (Setor em Produção)
  const [activeSectorFilter, setActiveSectorFilter] = useState<ProductionStep | null>(null);

  const stepsList: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];

  // Função para alternar o filtro de setor
  const toggleSectorFilter = (step: ProductionStep) => {
      if (activeSectorFilter === step) {
          setActiveSectorFilter(null); // Remove filtro se clicar no mesmo
      } else {
          setActiveSectorFilter(step); // Ativa novo filtro
          // Expande tudo automaticamente para facilitar a visualização dos resultados
      }
  };

  // Efeito para expandir visualização ao ativar filtro
  useEffect(() => {
      if (activeSectorFilter) {
          handleExpandOrderMode();
      }
  }, [activeSectorFilter]);

  // Agrupamento de Ordens
  const groupedOrders = useMemo(() => {
    // 1. Filtragem por Setor (Feature Nova)
    // Se houver um filtro de setor ativo, mantém apenas as ordens que estão "Em Produção" naquele setor
    const filteredOrders = activeSectorFilter 
        ? orders.filter(o => o[activeSectorFilter] === 'Em Produção') 
        : orders;

    const orGroups: Record<string, Order[]> = {};
    filteredOrders.forEach(order => {
        if (!orGroups[order.or]) orGroups[order.or] = [];
        orGroups[order.or].push(order);
    });

    const unifiedGroups = Object.values(orGroups).map(groupItems => {
        const activeItems = groupItems.filter(i => !i.isArchived);
        let anchorDate: string;
        
        if (activeItems.length > 0) {
            activeItems.sort((a, b) => a.dataEntrega.localeCompare(b.dataEntrega));
            anchorDate = activeItems[0].dataEntrega;
        } else {
            groupItems.sort((a, b) => b.dataEntrega.localeCompare(a.dataEntrega));
            anchorDate = groupItems[0].dataEntrega;
        }

        const sortedItems = groupItems.sort((a, b) => {
             const refA = a.numeroItem || '';
             const refB = b.numeroItem || '';
             return refA.localeCompare(refB, undefined, { numeric: true, sensitivity: 'base' });
        });

        return { or: sortedItems[0].or, anchorDate, items: sortedItems };
    });

    unifiedGroups.sort((a, b) => {
        const dateDiff = a.anchorDate.localeCompare(b.anchorDate);
        if (dateDiff !== 0) return sortConfig.direction === 'asc' ? dateDiff : -dateDiff;
        return b.or.localeCompare(a.or); 
    });

    const getWeekNumber = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    type DayGroup = { dateStr: string; dayName: string; orGroups: typeof unifiedGroups; };
    type WeekGroup = { id: string; title: string; subTitle: string; days: Record<string, DayGroup>; date: Date; isCurrent: boolean; };

    const weekMap: Record<string, WeekGroup> = {};
    const today = new Date();
    const currentWeekNum = getWeekNumber(today);
    const currentYear = today.getFullYear();

    unifiedGroups.forEach(group => {
        const date = new Date(group.anchorDate);
        const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        const weekNum = getWeekNumber(utcDate);
        const year = utcDate.getFullYear();
        const groupId = `${year}-W${weekNum}`;

        if (!weekMap[groupId]) {
            const simpleDate = new Date(utcDate);
            const dayOfWeek = simpleDate.getDay(); 
            const diffToMonday = simpleDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(simpleDate);
            monday.setDate(diffToMonday);
            const friday = new Date(simpleDate);
            friday.setDate(monday.getDate() + 4); 
            const dateRangeStr = `${monday.getDate().toString().padStart(2,'0')}/${(monday.getMonth()+1).toString().padStart(2,'0')} A ${friday.getDate().toString().padStart(2,'0')}/${(friday.getMonth()+1).toString().padStart(2,'0')}`;
            const monthName = utcDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();

            weekMap[groupId] = {
            id: groupId,
            title: `${dateRangeStr} - SEMANA ${String(weekNum).padStart(2, '0')}`,
            subTitle: `${monthName} ${year}`,
            days: {},
            date: utcDate,
            isCurrent: weekNum === currentWeekNum && year === currentYear
            };
        }

        const dayKey = group.anchorDate;
        if (!weekMap[groupId].days[dayKey]) {
            const dayDate = new Date(dayKey);
            const dayDateUtc = new Date(dayDate.getTime() + dayDate.getTimezoneOffset() * 60000);
            const dayName = dayDateUtc.toLocaleDateString('pt-BR', { weekday: 'long' });
            const dayFormatted = `${dayName.toUpperCase()} - ${dayDateUtc.getDate().toString().padStart(2,'0')}/${(dayDateUtc.getMonth()+1).toString().padStart(2,'0')}`;

            weekMap[groupId].days[dayKey] = {
                dateStr: dayKey,
                dayName: dayFormatted,
                orGroups: []
            };
        }
        weekMap[groupId].days[dayKey].orGroups.push(group);
    });

    const sortedWeeks = Object.values(weekMap).sort((a, b) => a.date.getTime() - b.date.getTime());
    return sortedWeeks.map(week => {
        const daysWithArray = Object.values(week.days).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
        return { ...week, days: daysWithArray };
    });
  }, [orders, sortConfig, activeSectorFilter]);

  // Efeito para auto-expandir
  useEffect(() => {
      const totalOrs = groupedOrders.reduce((acc, w) => acc + w.days.reduce((dAcc, d) => dAcc + d.orGroups.length, 0), 0);
      if (totalOrs < 10 && totalOrs > 0) {
          handleExpandAll();
      }
  }, [groupedOrders.length]); 

  // --- ACTIONS DE EXPANSÃO ---

  const handleExpandAll = () => {
      const allWeeks = new Set(groupedOrders.map(w => w.id));
      const allOrs = new Set<string>();
      groupedOrders.forEach(w => {
          w.days.forEach(d => {
              d.orGroups.forEach(o => allOrs.add(o.or));
          });
      });
      setExpandedWeeks(allWeeks);
      setExpandedOrs(allOrs);
  };

  const handleExpandOrderMode = () => {
      const allWeeks = new Set(groupedOrders.map(w => w.id));
      setExpandedWeeks(allWeeks);
      setExpandedOrs(new Set()); // Fecha os itens, deixa apenas as semanas e ORs visíveis
  };

  const handleExpandCurrentWeek = () => {
      const current = groupedOrders.find(w => w.isCurrent);
      if (current) {
          setExpandedWeeks(new Set([current.id]));
          const weekOrs = new Set<string>();
          current.days.forEach(d => d.orGroups.forEach(o => weekOrs.add(o.or)));
          setExpandedOrs(weekOrs);
      } else {
          // If no current week data, just expand the first week
          if (groupedOrders.length > 0) {
              setExpandedWeeks(new Set([groupedOrders[0].id]));
          }
      }
  };

  const handleExpandCurrentDay = () => {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const weeksToOpen = new Set<string>();
      const orsToOpen = new Set<string>();

      groupedOrders.forEach(w => {
          let hasToday = false;
          w.days.forEach(d => {
              if (d.dateStr === todayStr) {
                  hasToday = true;
                  d.orGroups.forEach(o => orsToOpen.add(o.or));
              }
          });
          if (hasToday) weeksToOpen.add(w.id);
      });

      if (weeksToOpen.size > 0) {
          setExpandedWeeks(weeksToOpen);
          setExpandedOrs(orsToOpen);
      }
  };

  const handleCollapseAll = () => {
      setExpandedWeeks(new Set());
      setExpandedOrs(new Set());
  };

  // EXPOSE METHODS TO PARENT (App.tsx)
  useImperativeHandle(ref, () => ({
    expandAll: handleExpandAll,
    collapseAll: handleCollapseAll,
    expandToday: handleExpandCurrentDay,
    expandWeeks: handleExpandCurrentWeek,
    expandOrders: handleExpandOrderMode,
    scrollToTop: onScrollTop || (() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }));

  const toggleWeek = (groupId: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  const toggleOr = (orId: string) => {
    setExpandedOrs(prev => {
        const next = new Set(prev);
        if (next.has(orId)) next.delete(orId); else next.add(orId);
        return next;
    });
  };

  const handleStepClick = (orderId: string, step: ProductionStep, currentStatus: Status) => {
    const isOwner = currentUser.role === 'Admin' || currentUser.departamento === 'Geral' || currentUser.departamento === step;
    if (!isOwner) { alert(`ACESSO RESTRITO AO SETOR ${STEP_LABELS[step]}`); return; }
    let next: Status;
    if (currentStatus === 'Em Produção') next = 'Concluído';
    else if (currentStatus === 'Concluído') next = 'Pendente';
    else next = 'Em Produção';
    onUpdateStatus(orderId, step, next);
  };

  const confirmDelete = () => {
    if (deleteModal.orderId) { onDeleteOrder(deleteModal.orderId); setDeleteModal({ isOpen: false, orderId: null, or: null }); }
  };

  const confirmReactivate = () => {
    if (reactivateModal.orderId) { onReactivateOrder(reactivateModal.orderId); setReactivateModal({ isOpen: false, orderId: null, or: null }); }
  };

  const openShareModal = (order: Order) => setShareModal({ isOpen: true, order });

  const handleShareAction = (method: 'whatsapp' | 'email' | 'copy') => {
    const order = shareModal.order;
    if (!order) return;
    const body = `📋 O.R #${order.or} - ${order.cliente}\nItem: ${order.item}\nEntrega: ${order.dataEntrega.split('-').reverse().join('/')}`;
    if (method === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank');
    else if (method === 'email') window.location.href = `mailto:?subject=${encodeURIComponent(`O.R #${order.or}`)}&body=${encodeURIComponent(body)}`;
    else if (method === 'copy') { navigator.clipboard.writeText(body); alert('Copiado!'); }
    setShareModal({ isOpen: false, order: null });
  };

  const downloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a'); link.href = attachment.dataUrl; link.download = attachment.name; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const viewAttachment = (attachment: Attachment) => {
    const win = window.open();
    if (win) {
      if (attachment.type?.startsWith('image/')) win.document.write(`<img src="${attachment.dataUrl}" style="max-width:100%; height:auto;">`);
      else if (attachment.type === 'application/pdf') win.document.write(`<iframe src="${attachment.dataUrl}" style="width:100%; height:100vh; border:none;"></iframe>`);
      else { win.close(); downloadAttachment(attachment); }
    }
  };

  const getDeliveryStatusColor = (dateStr: string, isArchived: boolean) => {
    if (isArchived) return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    const todayStr = new Date().toLocaleDateString('en-CA'); 
    if (dateStr < todayStr) return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900';
    if (dateStr === todayStr) return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900';
    return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const getLastStepUpdate = (order: Order, step: ProductionStep) => {
    if (!order.history || order.history.length === 0) return null;
    const stepHistory = order.history.filter(h => h.sector === step).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return stepHistory.length > 0 ? stepHistory[0] : null;
  };

  const getLastUpdate = (order: Order) => {
    if (!order.history || order.history.length === 0) return null;
    const sorted = [...order.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted[0];
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
      if (sortConfig.key !== colKey) return <span className="opacity-20 ml-1">⇅</span>;
      return <span className="ml-1 text-emerald-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  let globalItemIndex = 0;

  const ToolIcon = ({ onClick, icon, title, active = false }: { onClick: () => void, icon: React.ReactNode, title?: string, active?: boolean }) => (
      <button 
          onClick={onClick}
          title={title}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm shrink-0
            ${active 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-600'}
          `}
      >
          {icon}
      </button>
  );

  const NavButton = ({ onClick, label, active = false }: { onClick: () => void, label: string, active?: boolean }) => (
      <button 
          onClick={onClick}
          className={`
            flex-1 py-3 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
            ${active 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                : 'bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
          `}
      >
          {label}
      </button>
  );

  return (
    <>
      {/* --- Legends --- */}
      <div className="flex justify-between items-center px-2 md:px-4 mb-2">
          <div className="flex items-center gap-3 opacity-70">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ativas</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Hoje</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Atrasadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Concluídas</span>
                </div>
                {activeSectorFilter && (
                    <div className="flex items-center gap-1.5 ml-4 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full animate-in fade-in">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                            Filtrando: {STEP_LABELS[activeSectorFilter]} EM CURSO
                        </span>
                        <button onClick={() => setActiveSectorFilter(null)} className="ml-1 text-amber-600 hover:text-red-500">✕</button>
                    </div>
                )}
          </div>
      </div>

      {/* --- DESKTOP VIEW: FLOATING CONTROL ISLAND --- */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 hidden md:block w-auto`}>
          {isToolbarCollapsed ? (
              <button 
                  onClick={() => setIsToolbarCollapsed(false)}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-8 py-3 rounded-full shadow-2xl border-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 hover:scale-105 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
              >
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-widest group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Abrir Menu</span>
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
          ) : (
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-3 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 min-w-[400px] animate-in slide-in-from-bottom-4">
                  
                  {/* Top Row: Navigation Tabs + Center QR */}
                  <div className="flex items-center justify-between gap-4 relative">
                      {/* Left Tab */}
                      <NavButton 
                          onClick={() => setActiveTab?.('OPERACIONAL')} 
                          label="Produção Ativa" 
                          active={activeTab === 'OPERACIONAL'} 
                      />
                      
                      {/* Center Floating QR Button */}
                      <button 
                          onClick={onShowScanner}
                          className="w-14 h-14 bg-slate-900 dark:bg-slate-800 text-white border-4 border-white dark:border-slate-900 rounded-full flex items-center justify-center hover:bg-emerald-500 transition-all active:scale-95 shadow-xl absolute left-1/2 -translate-x-1/2 -top-1 z-10"
                          title="Escanear QR Code"
                      >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4h4V8H6zm14 10.5c0 .276-.224.5-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3z" strokeWidth="2"/></svg>
                      </button>

                      {/* Right Tab */}
                      <NavButton 
                          onClick={() => setActiveTab?.('CONCLUÍDAS')} 
                          label="Arquivo Morto" 
                          active={activeTab === 'CONCLUÍDAS'} 
                      />
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>

                  {/* Bottom Row: Tools (Icons Only) */}
                  <div className="flex items-center justify-between gap-2 px-2">
                      <div className="flex items-center gap-2">
                          <ToolIcon onClick={handleExpandAll} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth="2"/></svg>} title="Expandir Tudo" />
                          <ToolIcon onClick={handleCollapseAll} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v16h16V4H4z" strokeWidth="2"/><path d="M9 9l6 6m0-6l-6 6" strokeWidth="2"/></svg>} title="Recolher Tudo" />
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                          <ToolIcon onClick={handleExpandCurrentDay} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v.01" /><circle cx="12" cy="15" r="1" /></svg>} title="Ordens de Hoje" />
                          <ToolIcon onClick={handleExpandCurrentWeek} icon={<span className="text-[9px] font-black">SEM</span>} title="Ver Semana" />
                          <ToolIcon onClick={handleExpandOrderMode} icon={<span className="text-[9px] font-black">ORD</span>} title="Ver Ordens" />
                      </div>

                      <div className="flex items-center gap-2">
                          <ToolIcon onClick={onScrollTop} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>} title="Topo" />
                          
                          {/* Collapse Button */}
                          <button 
                              onClick={() => setIsToolbarCollapsed(true)}
                              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                              title="Recolher Menu"
                          >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>

                          <button 
                              onClick={onCreateOrder}
                              className="px-5 py-2.5 rounded-full bg-[#064e3b] dark:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 hover:bg-emerald-800 shadow-md flex items-center gap-2 ml-2"
                          >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
                              Nova O.R
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* --- MOBILE VIEW: LIST --- */}
      <div className="md:hidden space-y-4 px-1 pb-10">
        {groupedOrders.map((weekGroup) => {
          const isWeekExpanded = expandedWeeks.has(weekGroup.id);
          const totalInWeek = weekGroup.days.reduce((acc, d) => acc + d.orGroups.reduce((oAcc, o) => oAcc + o.items.length, 0), 0);

          return (
            <div key={weekGroup.id} className="space-y-1">
                <div 
                    onClick={() => toggleWeek(weekGroup.id)}
                    className={`sticky top-0 z-10 flex justify-between items-center py-3 px-4 shadow-sm backdrop-blur-md border-y border-slate-200 dark:border-slate-800 transition-colors cursor-pointer rounded-xl mx-2 ${weekGroup.isCurrent ? 'bg-emerald-50/90 dark:bg-emerald-900/30' : 'bg-slate-100/90 dark:bg-slate-900/90'}`}
                >
                    <div className="flex items-center gap-2">
                        <div className={`transition-transform duration-300 ${isWeekExpanded ? 'rotate-0' : '-rotate-90'}`}>
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-widest leading-none">{weekGroup.title}</p>
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">{weekGroup.subTitle}</p>
                        </div>
                    </div>
                    <span className="bg-white dark:bg-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                        {totalInWeek} Itens
                    </span>
                </div>

                {isWeekExpanded && (
                    <div className="space-y-4 px-2 pt-2">
                        {weekGroup.days.map(dayGroup => (
                            <div key={dayGroup.dateStr} className="space-y-3">
                                <div className="flex items-center gap-2 px-1 ml-1">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dayGroup.dayName}</span>
                                </div>

                                {dayGroup.orGroups.map(orGroup => {
                                    const firstItem = orGroup.items[0];
                                    const isLate = !firstItem.isArchived && firstItem.dataEntrega < new Date().toLocaleDateString('en-CA');
                                    const isArchived = firstItem.isArchived;
                                    const isOrExpanded = expandedOrs.has(orGroup.or);

                                    return (
                                        <div 
                                            key={orGroup.or}
                                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
                                        >
                                            <div 
                                                className="bg-slate-50 dark:bg-slate-800/50 p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start cursor-pointer"
                                                onClick={() => toggleOr(orGroup.or)}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`transition-transform duration-300 ${isOrExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                                            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                        </div>
                                                        <span className={`text-base font-[950] ${isLate ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                                            #{orGroup.or}
                                                        </span>
                                                        {isArchived && <span className="bg-slate-200 text-slate-500 text-[8px] font-black px-1.5 rounded">ARQ</span>}
                                                    </div>
                                                    <h3 className="text-[10px] font-black uppercase text-slate-800 dark:text-white leading-tight line-clamp-1 mt-0.5 ml-5">
                                                        {firstItem.cliente}
                                                    </h3>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[8px] font-bold px-2 py-1 rounded border ${getDeliveryStatusColor(firstItem.dataEntrega, isArchived)} block mb-1`}>
                                                        {firstItem.dataEntrega.split('-').reverse().join('/')}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                                                        {orGroup.items.length} {orGroup.items.length === 1 ? 'Item' : 'Itens'}
                                                    </span>
                                                </div>
                                            </div>

                                            {isOrExpanded && (
                                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {orGroup.items.map((item, idx) => (
                                                        <div key={item.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors" onClick={() => onShowTechSheet?.(item)}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex-1 pr-2">
                                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                        <span className="text-[9px] font-black text-slate-300 dark:text-slate-600">#{String(idx + 1).padStart(2, '0')}</span>
                                                                        {item.numeroItem && (
                                                                            <span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 rounded">
                                                                                REF: {item.numeroItem}
                                                                            </span>
                                                                        )}
                                                                        {item.isRemake && (
                                                                            <span className="text-[8px] font-black bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 rounded uppercase border border-orange-200 dark:border-orange-800">
                                                                                ⚠️ Refazimento
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-snug line-clamp-2">
                                                                        {item.item}
                                                                    </p>
                                                                </div>
                                                                <div className="shrink-0 text-center bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                                                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">{item.quantidade || 1}</span>
                                                                    <span className="block text-[6px] font-bold text-slate-400 uppercase">UN</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full p-0.5">
                                                                {stepsList.map(step => {
                                                                    const status = item[step];
                                                                    const isDone = status === 'Concluído';
                                                                    const isProgress = status === 'Em Produção';
                                                                    return (
                                                                        <div key={step} className={`flex-1 h-1 rounded-full ${
                                                                            isDone ? 'bg-emerald-500' : 
                                                                            isProgress ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                                                                        }`}></div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
          );
        })}
        {groupedOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhuma ordem encontrada</p>
                {activeSectorFilter && <p className="text-[10px] font-bold text-amber-500 uppercase mt-2">Filtro Ativo: {STEP_LABELS[activeSectorFilter]} em produção</p>}
            </div>
        )}
      </div>

      {/* --- DESKTOP VIEW: TABLE --- */}
      <div className="hidden md:block bg-transparent md:bg-white dark:md:bg-slate-900 rounded-[16px] border-none md:border border-slate-200 dark:border-slate-800 md:shadow-lg mb-32 transition-colors w-full pb-48">
        <div className="w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-[62px] z-20 bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-700">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="w-[4%] px-2 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">QR</th>
                <th className="w-[3%] px-2 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">#</th>
                <th 
                    className="w-[6%] px-2 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={() => onSort('or')}
                >
                    O.R <SortIcon colKey="or"/>
                </th>
                <th className="w-[4%] px-2 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">QTD</th>
                
                <th 
                    className="w-[20%] px-2 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={() => onSort('item')}
                >
                    DESCRIÇÃO DO ITEM / CLIENTE <SortIcon colKey="item"/>
                </th>
                <th 
                    className="w-[6%] px-2 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={() => onSort('createdAt')}
                >
                    CRIAÇÃO <SortIcon colKey="createdAt"/>
                </th>
                <th 
                    className="w-[6%] px-2 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={() => onSort('dataEntrega')}
                >
                    ENTREGA <SortIcon colKey="dataEntrega"/>
                </th>
                
                {/* HEADERS INTERATIVOS PARA FILTRAGEM */}
                {stepsList.map(step => (
                  <th 
                    key={step} 
                    className={`w-[7%] px-1 py-4 text-[9px] font-black uppercase text-center border-l border-slate-50 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 select-none
                        ${activeSectorFilter === step ? 'text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : 'text-slate-400 dark:text-slate-500 hover:text-emerald-500'}
                    `}
                    onClick={() => toggleSectorFilter(step)}
                    title={`Clique para mostrar apenas itens EM PRODUÇÃO em ${STEP_LABELS[step]}`}
                  >
                      {STEP_LABELS[step]}
                      {activeSectorFilter === step && (
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mx-auto mt-1 animate-pulse"></div>
                      )}
                  </th>
                ))}
                
                <th className="w-[4%] px-2 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase text-center tracking-widest">ITENS</th>
                
                <th className="w-[12%] px-2 py-4 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase text-right pr-6">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {groupedOrders.length === 0 && (
                  <tr>
                      <td colSpan={18} className="py-20 text-center text-slate-400 uppercase text-xs font-bold">
                          {activeSectorFilter ? `Nenhuma ordem em andamento no setor: ${STEP_LABELS[activeSectorFilter]}` : 'Nenhuma ordem encontrada.'}
                      </td>
                  </tr>
              )}
              {groupedOrders.map((weekGroup) => {
                const isWeekExpanded = expandedWeeks.has(weekGroup.id);
                const totalInWeek = weekGroup.days.reduce((acc, day) => acc + day.orGroups.reduce((dAcc, or) => dAcc + or.items.length, 0), 0);

                return (
                  <React.Fragment key={weekGroup.id}>
                    <tr onClick={() => toggleWeek(weekGroup.id)} className={`cursor-pointer transition-all border-y border-slate-100 dark:border-slate-800 hover:bg-slate-100/80 ${weekGroup.isCurrent ? 'bg-emerald-50/40 dark:bg-emerald-900/20' : 'bg-slate-50/50 dark:bg-slate-900'}`}>
                      <td colSpan={18} className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={`transition-transform duration-300 ${isWeekExpanded ? 'rotate-0' : '-rotate-90'}`}><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                          <span className={`text-[10px] font-black uppercase tracking-[1.5px] ${weekGroup.isCurrent ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                              {weekGroup.title}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase opacity-70 tracking-widest">{weekGroup.subTitle}</span>
                          <div className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[8px] font-black text-slate-400 dark:text-slate-500 ml-auto mr-4">{totalInWeek} Itens</div>
                        </div>
                      </td>
                    </tr>

                    {isWeekExpanded && weekGroup.days.map((dayGroup) => (
                       <React.Fragment key={dayGroup.dateStr}>
                          <tr className="bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800">
                             <td colSpan={18} className="px-4 py-2 bg-slate-50/30 dark:bg-slate-800/30">
                                <div className="flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                   <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                      {dayGroup.dayName}
                                   </span>
                                </div>
                             </td>
                          </tr>

                          {dayGroup.orGroups.map((orGroup) => {
                              const isOrExpanded = expandedOrs.has(orGroup.or);
                              const firstItem = orGroup.items[0];
                              const totalItems = orGroup.items.length;
                              const hasHighPriority = orGroup.items.some(i => i.prioridade === 'Alta');
                              const todayStr = new Date().toLocaleDateString('en-CA');
                              const hasLateItems = orGroup.items.some(i => !i.isArchived && i.dataEntrega < todayStr);
                              const hasTodayItems = !hasLateItems && orGroup.items.some(i => !i.isArchived && i.dataEntrega === todayStr);

                              const displayStatusColor = hasLateItems ? 'text-red-700 dark:text-red-400' : hasTodayItems ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-800 dark:text-emerald-400';
                              const headerBgClass = hasLateItems 
                                  ? 'bg-red-50/60 dark:bg-red-900/10 hover:bg-red-100/50' 
                                  : hasTodayItems 
                                      ? 'bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-100/50'
                                      : 'bg-slate-50/30 dark:bg-slate-800/20 hover:bg-slate-50';
                              const borderClass = hasLateItems ? 'border-l-red-500' : hasTodayItems ? 'border-l-amber-500' : 'border-l-emerald-500';

                              return (
                                  <React.Fragment key={`${dayGroup.dateStr}-${orGroup.or}`}>
                                      <tr 
                                          className={`cursor-pointer group border-t border-slate-100 dark:border-slate-800 transition-colors ${headerBgClass}`}
                                          onClick={() => toggleOr(orGroup.or)}
                                      >
                                          <td colSpan={18} className="p-0">
                                              <div className={`flex items-center px-4 py-2 border-l-4 ${borderClass}`}>
                                                  <div className={`mr-3 transition-transform duration-200 ${isOrExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                                      <svg className={`w-3 h-3 ${hasLateItems ? 'text-red-400' : hasTodayItems ? 'text-amber-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                  </div>
                                                  <div className="flex items-center gap-4 flex-1">
                                                      <div className="flex flex-col">
                                                          <span className={`text-[11px] font-black leading-none ${displayStatusColor}`}>O.R #{orGroup.or}</span>
                                                      </div>
                                                      <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                                      <div className="flex flex-col">
                                                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-none">{firstItem.cliente}</span>
                                                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Vendedor: {firstItem.vendedor}</span>
                                                      </div>
                                                      {hasHighPriority && (
                                                          <span className="ml-2 bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded uppercase border border-red-200">Prioridade Alta</span>
                                                      )}
                                                      {hasLateItems && (
                                                          <span className="ml-2 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase shadow-sm animate-pulse">ATRASADO</span>
                                                      )}
                                                      {hasTodayItems && (
                                                          <span className="ml-2 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase shadow-sm">HOJE</span>
                                                      )}
                                                  </div>
                                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-4">
                                                      {totalItems} {totalItems === 1 ? 'Item' : 'Itens'}
                                                  </div>
                                              </div>
                                          </td>
                                      </tr>

                                      {isOrExpanded && orGroup.items.map((order, itemIndex) => {
                                          globalItemIndex++;
                                          const lastUpdate = getLastUpdate(order);
                                          const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-';
                                          const isItemLate = !order.isArchived && order.dataEntrega < todayStr;
                                          
                                          return (
                                              <tr key={order.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/50 transition-all bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800/50">
                                                  {/* Table cells... same as before */}
                                                  <td className="w-[4%] px-2 py-2 text-center">
                                                      <button 
                                                          onClick={(e) => { e.stopPropagation(); onShowQR(order); }} 
                                                          className="p-2 text-purple-600 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl transition-all shadow-sm hover:scale-110" 
                                                          title="QR Code"
                                                      >
                                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4h4V8H6zm14 10.5c0 .276-.224.5-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3z" strokeWidth="2"/></svg>
                                                      </button>
                                                  </td>

                                                  <td className="w-[3%] px-2 py-2 text-center">
                                                      <span className="text-[9px] font-black text-slate-300 dark:text-slate-600">
                                                          {String(globalItemIndex).padStart(2, '0')}
                                                      </span>
                                                  </td>
                                                  
                                                  <td className="w-[5%] px-2 py-2"></td>

                                                  <td className="w-[4%] px-2 py-2 text-center">
                                                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-md inline-block uppercase tabular-nums border border-emerald-100 dark:border-emerald-800/50">
                                                          {order.quantidade || '1'}
                                                      </span>
                                                  </td>

                                                  <td className="w-[20%] px-2 py-2">
                                                      <div className="flex flex-col gap-1 overflow-hidden">
                                                          <div className="flex items-center flex-wrap gap-2 mb-0.5">
                                                              {order.numeroItem && (
                                                                  <span className="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded inline-block uppercase tracking-wider">REF: {order.numeroItem}</span>
                                                              )}
                                                              {order.isRemake && (
                                                                  <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded inline-block uppercase tracking-wider border border-orange-200 dark:border-orange-800">
                                                                      ⚠️ Refazimento
                                                                  </span>
                                                              )}
                                                              {order.dataEntrega !== orGroup.anchorDate && (
                                                                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                                                     Entrega: {order.dataEntrega.split('-').reverse().join('/')}
                                                                  </span>
                                                              )}
                                                              {lastUpdate && (
                                                                  <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2 ml-1">
                                                                      <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                                                          {lastUpdate.userName.split(' ')[0]}
                                                                      </span>
                                                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                                                          lastUpdate.status === 'Concluído' ? 'bg-emerald-500' :
                                                                          lastUpdate.status === 'Em Produção' ? 'bg-amber-500' : 'bg-slate-300'
                                                                      }`}></span>
                                                                      <span className="text-[7px] text-slate-300 dark:text-slate-600 tabular-nums uppercase">
                                                                          {new Date(lastUpdate.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} • {lastUpdate.status}
                                                                      </span>
                                                                  </div>
                                                              )}
                                                          </div>
                                                          <div className={`text-[9px] font-semibold uppercase italic leading-tight line-clamp-2 ${isItemLate ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`} title={order.item}>{order.item}</div>
                                                          {order.attachments && order.attachments.length > 0 && (
                                                              <button onClick={(e) => { e.stopPropagation(); setAttachmentModal({ isOpen: true, order }); }} className="flex items-center gap-1 w-fit px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mt-1">
                                                                  <svg className="w-3 h-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeWidth="2.5"/></svg>
                                                                  <span className="text-[8px] font-bold text-slate-400 underline decoration-dotted">{order.attachments.length} anexo(s)</span>
                                                              </button>
                                                          )}
                                                      </div>
                                                  </td>
                                                  <td className="w-[6%] px-2 py-2 text-center"><span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">{createdDate}</span></td>
                                                  <td className="w-[6%] px-2 py-2 text-center"><span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black ${getDeliveryStatusColor(order.dataEntrega, order.isArchived)}`}>{order.dataEntrega.split('-').reverse().join('/')}</span></td>
                                                  {stepsList.map(step => {
                                                      const status = order[step];
                                                      const lastStepUpdate = getLastStepUpdate(order, step);
                                                      const isOwner = currentUser.role === 'Admin' || currentUser.departamento === 'Geral' || currentUser.departamento === step;

                                                      // Check if this specific cell should be highlighted due to active filter
                                                      const isHighlighted = activeSectorFilter === step && status === 'Em Produção';

                                                      return (
                                                      <td key={step} className={`w-[7%] px-1 py-2 text-center border-l border-slate-50 dark:border-slate-800 ${isHighlighted ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                                                          <div className="flex flex-col items-center justify-center h-full">
                                                              <button 
                                                                  onClick={(e) => { e.stopPropagation(); if (isOwner) handleStepClick(order.id, step, status); }}
                                                                  disabled={!isOwner}
                                                                  title={!isOwner ? 'Sem permissão para alterar' : ''}
                                                                  className={`w-[70px] py-1 rounded-md text-[8px] font-black uppercase border transition-all truncate 
                                                                      ${!isOwner ? 'opacity-30 cursor-not-allowed grayscale bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700' : 
                                                                      status === 'Concluído' ? 'bg-[#10b981] text-white border-emerald-600 hover:bg-[#059669]' : 
                                                                      status === 'Em Produção' ? 'bg-[#f59e0b] text-white border-amber-600 hover:bg-[#d97706]' : 
                                                                      'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600'
                                                                      }
                                                                  `}
                                                              >
                                                                  {status === 'Concluído' ? 'OK' : status === 'Em Produção' ? 'EM CURSO' : 'INICIAR'}
                                                              </button>
                                                              
                                                              {lastStepUpdate && (
                                                                  <div className="mt-1 flex flex-col items-center leading-none">
                                                                      <span className="text-[6px] font-black uppercase text-slate-500 dark:text-slate-400 truncate w-full text-center max-w-[70px]">{lastStepUpdate.userName.split(' ')[0]}</span>
                                                                      <span className="text-[6px] text-slate-400 dark:text-slate-500 tabular-nums">{new Date(lastStepUpdate.timestamp).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} {new Date(lastStepUpdate.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </td>
                                                      );
                                                  })}
                                                  
                                                  {itemIndex === 0 && (
                                                      <td 
                                                          rowSpan={totalItems} 
                                                          className="w-[4%] px-2 py-2 text-center border-l border-slate-50 dark:border-slate-800 align-middle bg-slate-50/20 dark:bg-slate-800/20"
                                                      >
                                                          <div className="flex flex-col items-center justify-center h-full">
                                                              <span className="text-[14px] font-black text-slate-400 dark:text-slate-500 tabular-nums">{totalItems}</span>
                                                              <span className="text-[6px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mt-1">ITENS</span>
                                                          </div>
                                                      </td>
                                                  )}

                                                  {/* ALINHAMENTO CORRIGIDO: text-right e pr-6 */}
                                                  <td className="w-[12%] px-2 py-2 text-right pr-6">
                                                  <div className="flex justify-end gap-1 w-full flex-nowrap whitespace-nowrap">
                                                      <button onClick={(e) => { e.stopPropagation(); openShareModal(order); }} className="p-1.5 text-slate-300 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex-shrink-0" title="Compartilhar"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth="2"/></svg></button>
                                                      
                                                      <button onClick={(e) => { e.stopPropagation(); onDirectPrint?.(order); }} className="p-1.5 text-slate-300 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex-shrink-0" title="Imprimir Direto"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeWidth="2"/></svg></button>

                                                      <button onClick={(e) => { e.stopPropagation(); onShowHistory?.(order); }} className="p-1.5 text-slate-300 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex-shrink-0" title="Histórico"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg></button>
                                                      {order.isArchived ? (
                                                          <button onClick={(e) => { e.stopPropagation(); setReactivateModal({ isOpen: true, orderId: order.id, or: order.or }); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex-shrink-0" title="Reativar"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2.5"/></svg></button>
                                                      ) : (
                                                          <button onClick={(e) => { e.stopPropagation(); onArchiveOrder?.(order.id); }} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all flex-shrink-0" title="Arquivar"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" strokeWidth="2.5"/></svg></button>
                                                      )}
                                                      <button onClick={(e) => { e.stopPropagation(); onEditOrder(order); }} className="p-1.5 text-slate-300 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex-shrink-0" title="Editar"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2"/></svg></button>
                                                      <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, orderId: order.id, or: order.or }); }} className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0" title="Excluir"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                                  </div>
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </React.Fragment>
                              );
                          })}
                       </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* ... (Rest of modal logic) ... */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-sm text-center border-4 border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-2">Excluir #{deleteModal.or}?</h3>
            <p className="text-xs text-slate-500 mb-6">Ação irreversível.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteModal({ isOpen: false, orderId: null, or: null })} className="flex-1 py-3 text-slate-400 font-black text-[10px] uppercase bg-slate-100 dark:bg-slate-800 rounded-xl">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 text-white font-black text-[10px] uppercase rounded-xl shadow-lg shadow-red-500/30">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      
      {reactivateModal.isOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-sm text-center border-4 border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-2">Reativar #{reactivateModal.or}?</h3>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setReactivateModal({ isOpen: false, orderId: null, or: null })} className="flex-1 py-3 text-slate-400 font-black text-[10px] uppercase bg-slate-100 dark:bg-slate-800 rounded-xl">Cancelar</button>
              <button onClick={confirmReactivate} className="flex-1 py-3 bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl shadow-lg shadow-emerald-500/30">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {shareModal.isOpen && shareModal.order && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6 text-center">Compartilhar O.R</h3>
              <div className="flex flex-col gap-3">
                 <button onClick={() => handleShareAction('whatsapp')} className="py-3 bg-green-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-green-600">WhatsApp</button>
                 <button onClick={() => handleShareAction('email')} className="py-3 bg-blue-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-blue-600">E-mail</button>
                 <button onClick={() => handleShareAction('copy')} className="py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700">Copiar</button>
                 <button onClick={() => setShareModal({isOpen: false, order: null})} className="mt-2 text-slate-400 text-xs uppercase font-bold hover:text-slate-600 dark:hover:text-slate-300">Cancelar</button>
              </div>
           </div>
        </div>
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
                       <div className="flex gap-1 w-full">
                          <button onClick={() => viewAttachment(att)} className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[8px] font-black uppercase">Ver</button>
                          <button onClick={() => downloadAttachment(att)} className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[8px] font-black uppercase">Baixar</button>
                       </div>
                    </div>
                 ))}
                 {(!attachmentModal.order.attachments || attachmentModal.order.attachments.length === 0) && <p className="col-span-2 text-center text-slate-400 text-xs py-4">Nenhum anexo.</p>}
              </div>
              <button onClick={() => setAttachmentModal({isOpen: false, order: null})} className="mt-4 w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase text-[10px] rounded-xl">Fechar</button>
           </div>
        </div>
      )}
    </>
  );
});

export default ProductionTable;
