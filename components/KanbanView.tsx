
import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Order, ProductionStep, Status, DEPARTMENTS, User, TaskAssignment } from '../types';
import AssignmentModal from './AssignmentModal';
import ManagementView from './ManagementView';

export interface KanbanViewHandle {
    switchToMyTasks: () => void;
    expandAll: () => void;
    collapseAll: () => void;
}

interface KanbanViewProps {
  orders: Order[];
  onUpdateStatus: (id: string, field: ProductionStep, next: Status) => void;
  onEditOrder: (order: Order) => void;
  currentUser: User | null;
  onShowQR: (order: Order) => void;
  onShowAttachment: (order: Order) => void;
  onShowTechSheet?: (order: Order) => void;
  users?: User[]; 
  onAssignUser?: (orderId: string, step: ProductionStep, userId: string, note: string, assignerName: string) => void;
}

// --- HELPER FUNCTIONS ---

const getOrderStage = (order: Order): string => {
    if (order.isArchived) return 'done';
    if (order.preImpressao !== 'Concluído') return 'design';
    if (order.impressao !== 'Concluído') return 'print';
    if (order.producao !== 'Concluído') return 'prod';
    if (order.instalacao !== 'Concluído') return 'install';
    if (order.expedicao !== 'Concluído') return 'shipping';
    return 'done';
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('');

const getDateColorClass = (dateStr: string, isArchived: boolean) => {
    if (isArchived) return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700';
    const today = new Date().toLocaleDateString('en-CA');
    if (dateStr < today) return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900 font-black';
    if (dateStr === today) return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900 font-black';
    return 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold';
};

const getDuration = (startStr: string) => {
    const start = new Date(startStr);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
};

// --- SUB-COMPONENT: Scroll Button (Inner Column) ---
const ScrollToTopButton = ({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) => {
    const [visible, setVisible] = useState(false);
    
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handleScroll = () => setVisible(el.scrollTop > 100);
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, [containerRef]);

    if (!visible) return null;

    return (
        <button 
            onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="absolute bottom-4 right-4 bg-slate-900/50 dark:bg-white/20 hover:bg-emerald-500 text-white p-2 rounded-full shadow-lg backdrop-blur-sm transition-all z-20 animate-in fade-in zoom-in"
            title="Voltar ao Topo"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
    );
};

// --- SUB-COMPONENT: Kanban Column ---
const KanbanColumn = ({ col, groups, isLocked, isMySector, isCollapsed, mobileSelectedCol, hasMyPending, expandedOrGroups, toggleOrGroup, toggleColumnCollapse, handleFocusColumn, onToggleColumnCards, renderCard }: any) => {
    const columnRef = useRef<HTMLDivElement>(null);
    const isMobileVisible = mobileSelectedCol === col.id;
    let widthClass = isCollapsed ? 'w-14 min-w-[3.5rem]' : isLocked ? 'min-w-[260px] w-[260px]' : 'min-w-[340px] w-[380px]';
    if (mobileSelectedCol && isMobileVisible) { widthClass = 'w-full min-w-full md:min-w-[500px] md:w-[600px]'; } 
    else if (mobileSelectedCol && !isMobileVisible) { widthClass = 'w-14 min-w-[3.5rem]'; }
    let bgClass = 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800';
    if (isMySector) bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800';
    if (isLocked) bgClass = 'bg-slate-50/50 dark:bg-black/20 border-slate-200 dark:border-slate-800 opacity-90';
    const forceCollapseVisual = mobileSelectedCol && !isMobileVisible;
    const effectivelyCollapsed = isCollapsed || forceCollapseVisual;

    if (effectivelyCollapsed) {
        return (
            <div className="w-14 min-w-[3.5rem] h-full flex flex-col items-center bg-slate-100 dark:bg-slate-800/50 md:rounded-t-2xl border-x border-t border-slate-200 dark:border-slate-800 transition-all py-4 gap-4 relative">
                {hasMyPending && <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-md border border-white z-10"></div>}
                <button onClick={() => { if (mobileSelectedCol) handleFocusColumn(col.id); else toggleColumnCollapse(col.id); }} className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-500 hover:text-emerald-500 transition-colors active:scale-95 group">
                    <svg className="w-4 h-4 rotate-90 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase text-white shadow-md ${groups.length > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>{col.label.substring(0, 1)}</div>
                <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-[3px] truncate max-h-[300px]">{col.label}</div>
                <div className="mt-auto flex flex-col items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${hasMyPending ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{groups.length}</span>
                    <div className={`w-2 h-2 rounded-full ${groups.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
            </div>
        );
    }
    return (
        <div className={`${widthClass} flex-shrink-0 flex flex-col h-full md:rounded-t-2xl border-x border-t border-b-0 ${bgClass} transition-all duration-300 relative`}>
            <div className={`p-3 border-b border-inherit flex justify-between items-center md:rounded-t-2xl ${isMySector ? 'bg-emerald-100/50 dark:bg-emerald-900/30' : ''}`}>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleFocusColumn(col.id)} className={`p-1.5 rounded-full transition-all ${mobileSelectedCol === col.id ? 'bg-blue-500 text-white animate-pulse' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`} title={mobileSelectedCol ? "Sair do Foco" : "Focar nesta Coluna"}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2.5"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>
                    </button>
                    {isLocked ? <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5"/></svg> : <div className={`w-2.5 h-2.5 rounded-full ${isMySector ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>}
                    <span className={`text-xs font-black uppercase tracking-wider ${isMySector ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>{col.label}</span>
                    {hasMyPending && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-md ml-1" title="Nova Tarefa Pendente"></div>}
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded text-[10px] font-black shadow-sm">{groups.length}</span>
                    <button onClick={() => onToggleColumnCards(col.id)} className="p-1 text-slate-300 hover:text-blue-500 active:scale-95 transition-transform" title="Recolher/Expandir Ordens"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth="2"/></svg></button>
                    {!isMySector && !mobileSelectedCol && (<button onClick={() => toggleColumnCollapse(col.id)} className="hidden md:block p-1 text-slate-300 hover:text-slate-500 active:scale-95 transition-transform group"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" strokeWidth="2.5"/></svg></button>)}
                    {mobileSelectedCol === col.id && <button onClick={() => handleFocusColumn(col.id)} className="bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded uppercase">Sair Foco</button>}
                </div>
            </div>
            <div ref={columnRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3 pb-4 relative">
                {groups.map((group: any) => {
                    const isMultiItem = group.items.length > 1;
                    const isGroupExpanded = expandedOrGroups[group.or];
                    const firstItem = group.items[0];
                    let priorityBorderClass = 'border-l-slate-300';
                    if (group.items.some((i: any) => i.prioridade === 'Alta')) priorityBorderClass = 'border-l-red-500';
                    else if (group.items.some((i: any) => i.prioridade === 'Média')) priorityBorderClass = 'border-l-blue-400';
                    const isLate = group.items.some((i: any) => !i.isArchived && i.dataEntrega < new Date().toLocaleDateString('en-CA'));

                    if (!isMultiItem) { return (<div key={group.or}>{group.items.map((item: any) => renderCard(item, col, isLocked))}</div>); }

                    return (
                        <div key={group.or} className="mb-2">
                            <div onClick={() => toggleOrGroup(group.or)} className={`bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 border-l-[4px] ${priorityBorderClass} cursor-pointer hover:shadow-md transition-all relative overflow-hidden group/stack`}>
                                <div className="absolute top-0 right-0 p-1">
                                    <div className={`p-1 rounded-full transition-transform duration-300 ${isGroupExpanded ? 'rotate-180 bg-slate-100 dark:bg-slate-800' : 'bg-transparent'}`}><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                                </div>
                                <div className="p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-[950] text-emerald-600 dark:text-emerald-400">#{group.or}</span>
                                        <div className="flex gap-1">
                                            <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">{group.items.length} ITENS</span>
                                            {isLate && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">!</span>}
                                        </div>
                                    </div>
                                    <div className="pr-6">
                                        <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate">{firstItem.cliente}</p>
                                        <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Vendedor: {firstItem.vendedor.split(' ')[0]}</p>
                                    </div>
                                    {!isGroupExpanded && (
                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Clique para ver itens</span>
                                            <div className="flex -space-x-1">{group.items.slice(0,3).map((i:any, idx:number) => (<div key={idx} className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-800 flex items-center justify-center text-[6px] font-black text-slate-500">{idx+1}</div>))}{group.items.length > 3 && <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-800 flex items-center justify-center text-[6px] font-black text-slate-400">+</div>}</div>
                                        </div>
                                    )}
                                </div>
                                {!isGroupExpanded && <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent opacity-50"></div>}
                            </div>
                            {isGroupExpanded && (<div className="mt-2 pl-3 ml-2 border-l-2 border-slate-200 dark:border-slate-700 space-y-2 animate-in slide-in-from-left-2 duration-200">{group.items.map((item:any) => renderCard(item, col, isLocked))}</div>)}
                        </div>
                    );
                })}
                <ScrollToTopButton containerRef={columnRef} />
            </div>
        </div>
    );
};

const KanbanView = forwardRef<KanbanViewHandle, KanbanViewProps>(({ 
    orders, 
    onUpdateStatus, 
    onEditOrder, 
    currentUser,
    onShowQR,
    onShowAttachment,
    onShowTechSheet,
    users = [],
    onAssignUser
}, ref) => {
  // ... (State logic kept same) ...
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'Alta' | 'Média' | 'Baixa'>('ALL');
  const [adminSelectedSector, setAdminSelectedSector] = useState<ProductionStep>(
      currentUser?.departamento !== 'Geral' ? (currentUser?.departamento as ProductionStep) : 'preImpressao'
  );
  
  const canAccessTeamView = useMemo(() => {
      if (!currentUser) return false;
      return currentUser.role === 'Admin' || currentUser.isLeader === true;
  }, [currentUser]);

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [minimizedItems, setMinimizedItems] = useState<Record<string, boolean>>({}); 
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [expandedOrGroups, setExpandedOrGroups] = useState<Record<string, boolean>>({}); 
  const [focusedColumnId, setFocusedColumnId] = useState<string | 'all'>('all');
  const [mobileSelectedCol, setMobileSelectedCol] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'BOARD' | 'MY_TASKS' | 'TEAM'>('BOARD');
  const [now, setNow] = useState(new Date());
  
  const boardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const timer = setInterval(() => setNow(new Date()), 60000);
      return () => clearInterval(timer);
  }, []);

  const myPendingCount = useMemo(() => {
      if (!currentUser) return 0;
      const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
      return orders.filter(o => !o.isArchived && steps.some(step => o.assignments?.[step]?.userId === currentUser.id && o[step] !== 'Concluído')).length;
  }, [orders, currentUser]);

  const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean; orderId: string | null; step: ProductionStep | null }>({
      isOpen: false, orderId: null, step: null
  });

  const activeSector = useMemo(() => {
      if (!currentUser) return null;
      if (currentUser.role === 'Admin' || currentUser.departamento === 'Geral') { return adminSelectedSector; }
      return currentUser.departamento as ProductionStep;
  }, [currentUser, adminSelectedSector]);

  useEffect(() => {
      if (searchTerm.trim().length > 0 && viewMode === 'BOARD') { setCollapsedColumns({}); setFocusedColumnId('all'); }
  }, [searchTerm, viewMode]);

  // Columns definition (same as before)
  const boardColumns: { id: string; label: string; step?: ProductionStep }[] = [
    { id: 'design', label: '1. Design', step: 'preImpressao' },
    { id: 'print', label: '2. Impressão', step: 'impressao' },
    { id: 'prod', label: '3. Acabamento', step: 'producao' },
    { id: 'install', label: '4. Instalação', step: 'instalacao' },
    { id: 'shipping', label: '5. Expedição', step: 'expedicao' },
    { id: 'done', label: 'Finalizado', step: undefined }
  ];
  const myTaskColumns: { id: string; label: string; step?: ProductionStep }[] = [
      { id: 'pending', label: 'Aguardando Início' },
      { id: 'in_progress', label: 'Em Execução' }
  ];
  const activeColumns = viewMode === 'MY_TASKS' ? myTaskColumns : boardColumns;

  // Grouped Data Memo (Same logic)
  const groupedData = useMemo(() => {
    if (viewMode === 'TEAM') return {}; 
    const data: Record<string, { or: string; client: string; items: Order[] }[]> = {};
    activeColumns.forEach(col => data[col.id] = []);
    const filtered = orders.filter(o => {
        const term = searchTerm.toLowerCase();
        const dateFormatted = o.dataEntrega.split('-').reverse().join('/');
        const matchesSearch = o.cliente.toLowerCase().includes(term) || o.or.toLowerCase().includes(term) || o.item.toLowerCase().includes(term) || o.vendedor.toLowerCase().includes(term) || (o.numeroItem && o.numeroItem.toLowerCase().includes(term)) || dateFormatted.includes(term);
        if (!matchesSearch) return false;
        if (priorityFilter !== 'ALL' && o.prioridade !== priorityFilter) return false;
        return true;
    });

    if (viewMode === 'MY_TASKS' && currentUser) {
        const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
        filtered.forEach(order => {
            if (order.isArchived) return;
            steps.forEach(step => {
                const assignment = order.assignments?.[step];
                const status = order[step];
                const isMyStep = assignment?.userId === currentUser.id;
                if (isMyStep && status !== 'Concluído') {
                    const targetCol = (status === 'Em Produção' || assignment.startedAt) ? 'in_progress' : 'pending';
                    let existingGroup = data[targetCol].find(g => g.or === order.or);
                    if (!existingGroup) { existingGroup = { or: order.or, client: order.cliente, items: [] }; data[targetCol].push(existingGroup); }
                    if (!existingGroup.items.find(i => i.id === order.id)) { existingGroup.items.push(order); }
                }
            });
        });
    } else {
        const tempGroup: Record<string, Record<string, Order[]>> = {}; 
        filtered.forEach(order => {
            if (order.isArchived && order.expedicao === 'Concluído') return; 
            const stage = getOrderStage(order);
            if (!tempGroup[stage]) tempGroup[stage] = {};
            if (!tempGroup[stage][order.or]) tempGroup[stage][order.or] = [];
            tempGroup[stage][order.or].push(order);
        });
        Object.keys(tempGroup).forEach(colId => {
            const orKeys = Object.keys(tempGroup[colId]);
            orKeys.forEach(or => {
                const items = tempGroup[colId][or];
                items.sort((a,b) => (a.numeroItem || '').localeCompare(b.numeroItem || ''));
                data[colId].push({ or, client: items[0].cliente, items });
            });
            data[colId].sort((a, b) => {
                const itemA = a.items[0];
                const itemB = b.items[0];
                if (itemA.prioridade === 'Alta' && itemB.prioridade !== 'Alta') return -1;
                if (itemA.prioridade !== 'Alta' && itemB.prioridade === 'Alta') return 1;
                return itemA.dataEntrega.localeCompare(itemB.dataEntrega);
            });
        });
    }
    return data;
  }, [orders, searchTerm, viewMode, currentUser, activeColumns, priorityFilter]);

  // Actions (Same logic)
  const handleProcessStep = (e: React.MouseEvent, order: Order, step?: ProductionStep) => {
      e.stopPropagation();
      if (viewMode === 'MY_TASKS') {
          const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
          const targetStep = steps.find(s => order.assignments?.[s]?.userId === currentUser?.id && order[s] !== 'Concluído');
          if (targetStep) {
              const currentStatus = order[targetStep];
              if (currentStatus === 'Pendente') { onUpdateStatus(order.id, targetStep, 'Em Produção'); } 
              else if (currentStatus === 'Em Produção') { onUpdateStatus(order.id, targetStep, 'Concluído'); }
          }
          return;
      }
      if (!step) return;
      if (currentUser?.role !== 'Admin' && currentUser?.departamento !== 'Geral' && currentUser?.departamento !== step) { alert("Acesso Negado."); return; }
      const currentStatus = order[step];
      if (currentStatus === 'Pendente') { onUpdateStatus(order.id, step, 'Em Produção'); } 
      else if (currentStatus === 'Em Produção') { onUpdateStatus(order.id, step, 'Concluído'); }
  };

  const handleOpenAssignment = (e: React.MouseEvent, orderId: string, step?: ProductionStep) => { e.stopPropagation(); if (step) { setAssignmentModal({ isOpen: true, orderId, step }); } };
  const handleConfirmAssignment = (userId: string, note: string) => { if (assignmentModal.orderId && assignmentModal.step && currentUser && onAssignUser) { onAssignUser(assignmentModal.orderId, assignmentModal.step, userId, note, currentUser.nome); } };
  const toggleDetails = (itemId: string) => { setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] })); };
  const toggleMinimize = (itemId: string, e: React.MouseEvent) => { 
      // Prevent minimize if user is selecting text
      if (window.getSelection()?.toString()) return;
      e.stopPropagation(); 
      setMinimizedItems(prev => { const currentVal = prev[itemId]; return { ...prev, [itemId]: currentVal === undefined ? false : !currentVal }; }); 
  };
  const toggleColumnCollapse = (colId: string) => { setCollapsedColumns(prev => ({ ...prev, [colId]: !prev[colId] })); };
  const toggleColumnCards = (colId: string) => {
      const itemsInColumn = groupedData[colId]?.flatMap(g => g.items) || [];
      if (itemsInColumn.length === 0) return;
      const newMinimizedState = { ...minimizedItems };
      const allCurrentlyMinimized = itemsInColumn.every(item => newMinimizedState[item.id] === true);
      const targetState = !allCurrentlyMinimized;
      itemsInColumn.forEach(item => { newMinimizedState[item.id] = targetState; });
      setMinimizedItems(newMinimizedState);
  };
  const toggleOrGroup = (or: string) => { setExpandedOrGroups(prev => ({ ...prev, [or]: !prev[or] })); };
  const handleCollapseAllCards = () => { const allItems = orders.map(o => o.id); const newState: Record<string, boolean> = {}; allItems.forEach(id => newState[id] = true); setMinimizedItems(newState); };
  const handleExpandAllCards = () => { setMinimizedItems({}); };
  const handleExpandAll = () => { setCollapsedColumns({}); setFocusedColumnId('all'); setMobileSelectedCol(null); handleExpandAllCards(); };
  const handleCollapseAll = () => { const allCollapsed = activeColumns.reduce((acc, col) => ({...acc, [col.id]: true}), {}); setCollapsedColumns(allCollapsed); setFocusedColumnId('all'); };
  const handleFocusColumn = (colId: string) => { if (focusedColumnId === colId) { setFocusedColumnId('all'); setMobileSelectedCol(null); setCollapsedColumns({}); } else { setFocusedColumnId(colId); setMobileSelectedCol(colId); const allOtherCollapsed = activeColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.id !== colId }), {}); setCollapsedColumns(allOtherCollapsed); } };
  const scrollBoardLeft = () => { if (boardContainerRef.current) boardContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' }); };
  const scrollBoardRight = () => { if (boardContainerRef.current) boardContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' }); };

  useImperativeHandle(ref, () => ({ switchToMyTasks: () => { setViewMode('MY_TASKS'); }, expandAll: handleExpandAll, collapseAll: handleCollapseAll }));
  const canAssign = (step?: ProductionStep) => { if (!currentUser || !step) return false; if (currentUser.role === 'Admin') return true; return currentUser.isLeader === true && (currentUser.departamento === 'Geral' || currentUser.departamento === step); };

  // Render Card (Same logic used for Board/My Tasks)
  const renderCard = (item: Order, col: { id: string; step?: ProductionStep }, isLocked: boolean) => {
        // ... (Render logic remains identical to previous provided KanbanView, omitting for brevity in this specific update block but keeping functionality)
        const isExpanded = expandedItems[item.id];
        const attachmentsCount = item.attachments?.length || 0;
        let currentStatus: Status = 'Pendente';
        let relevantStep = col.step;
        if (viewMode === 'MY_TASKS') {
            const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
            relevantStep = steps.find(s => item.assignments?.[s]?.userId === currentUser?.id && item[s] !== 'Concluído');
            if (relevantStep) currentStatus = item[relevantStep];
        } else if (col.step) { currentStatus = item[col.step]; } else { currentStatus = 'Concluído'; }
        const isPending = currentStatus === 'Pendente';
        const isInProgress = currentStatus === 'Em Produção';
        const isDone = currentStatus === 'Concluído';
        const isLate = !item.isArchived && item.dataEntrega < new Date().toLocaleDateString('en-CA');
        const assignment = relevantStep && item.assignments ? item.assignments[relevantStep] : null;
        const isNewAssignmentForMe = assignment && assignment.userId === currentUser?.id && isPending && viewMode === 'MY_TASKS';
        const isAssigned = !!assignment;
        const userPreference = minimizedItems[item.id];
        const defaultMinimizedState = viewMode === 'BOARD' ? isAssigned : false;
        const isMinimized = userPreference !== undefined ? userPreference : defaultMinimizedState;
        let priorityBorderClass = 'border-l-slate-300';
        if (item.prioridade === 'Alta') priorityBorderClass = 'border-l-red-500';
        else if (item.prioridade === 'Média') priorityBorderClass = 'border-l-blue-400';
        else priorityBorderClass = 'border-l-slate-300';
        let actionIcon = null; let actionClass = ""; let actionTitle = ""; let buttonLabel = "";
        if (isLocked && viewMode !== 'MY_TASKS') { actionIcon = <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5"/></svg>; actionClass = "bg-slate-50 text-slate-300 cursor-not-allowed border-slate-100 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700"; actionTitle = "Apenas setor responsável pode alterar"; } 
        else if (isPending) { actionIcon = <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeWidth="2.5"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>; actionClass = "bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border-blue-200 dark:bg-blue-900/20 dark:text-blue-400"; actionTitle = "Iniciar Trabalho"; buttonLabel = "Iniciar"; } 
        else if (isInProgress) { actionIcon = <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>; actionClass = "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 animate-pulse"; actionTitle = "Finalizar"; buttonLabel = "Concluir"; }

        if (isMinimized) {
            return (
                <div 
                    key={item.id} 
                    onClick={(e) => toggleMinimize(item.id, e)}
                    className={`group/item transition-all border-l-[4px] rounded-r-lg mb-2 shadow-sm relative overflow-hidden flex flex-col shrink-0 cursor-pointer bg-white dark:bg-slate-900 ${priorityBorderClass} ${assignment ? 'bg-blue-50/10' : 'border-slate-300 dark:border-slate-700'} ${isInProgress ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
                >
                    <div className="p-2.5 flex flex-col gap-1.5 relative">
                        {isInProgress && assignment?.startedAt && (<div className="absolute top-1 right-7 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm flex items-center gap-0.5 z-10"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>{getDuration(assignment.startedAt)}</div>)}
                        <div className="flex items-center justify-between"><div className="flex items-center gap-2 overflow-hidden"><span className="text-xs font-[950] text-emerald-600 dark:text-emerald-400 shrink-0">#{item.or}</span><div className="text-slate-400 p-0.5 ml-auto"><svg className="w-3.5 h-3.5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div></div></div>
                        <div className="flex flex-col gap-0.5"><span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase truncate leading-tight" title={item.cliente}>{item.cliente}</span><span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase leading-tight line-clamp-2" title={item.item}>{item.item}</span></div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap pt-1 border-t border-slate-50 dark:border-slate-800">{item.numeroItem && (<span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[8px] font-black border border-slate-200 dark:border-slate-700">REF {item.numeroItem}</span>)}<span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[8px] font-black border border-blue-100 dark:border-blue-800">{item.quantidade} UN</span><span className={`px-1.5 py-0.5 rounded border text-[8px] ${getDateColorClass(item.dataEntrega, item.isArchived)}`}>{item.dataEntrega.split('-').reverse().join('/')}</span>{isLate && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse text-[8px] font-bold">!</span>}</div>
                        {assignment && (<div className="flex items-center gap-1.5 mt-0.5"><div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] font-black uppercase">{getInitials(assignment.userName)}</div><span className="text-[8px] text-blue-600 dark:text-blue-400 font-bold truncate">{assignment.userName.split(' ')[0]}</span></div>)}
                    </div>
                </div>
            );
        }
        return (
            <div 
                key={item.id} 
                onClick={(e) => toggleMinimize(item.id, e)}
                className={`group/item transition-all border-l-[4px] rounded-r-lg mb-2 shadow-sm relative overflow-hidden flex flex-col shrink-0 cursor-pointer ${priorityBorderClass} ${assignment ? 'bg-blue-50/10' : 'border-transparent'} ${isInProgress ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''} ${isNewAssignmentForMe ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 z-10' : ''}`}
            >
                {viewMode === 'MY_TASKS' && relevantStep && (currentUser?.role === 'Admin' || currentUser?.isLeader) && (<div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-2 py-1 flex justify-between items-center"><span className="text-[7px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{DEPARTMENTS[relevantStep]}</span>{isLate && <span className="text-[7px] font-black text-red-500 uppercase animate-pulse">Atrasado</span>}</div>)}
                {isNewAssignmentForMe && (<div className="bg-blue-500 text-white text-[8px] font-black uppercase px-2 py-0.5 w-full text-center tracking-widest animate-pulse shrink-0">Nova Atribuição - Iniciar</div>)}
                <div className="flex flex-col p-2.5 bg-white dark:bg-slate-900 rounded-r-lg flex-1 relative">
                    {isInProgress && assignment?.startedAt && (<div className="absolute top-2 right-8 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm animate-pulse flex items-center gap-1 z-10"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>{getDuration(assignment.startedAt)}</div>)}
                    <div className="flex justify-between items-start mb-1.5 gap-2 pr-6"><span className="text-sm font-[950] text-emerald-600 dark:text-emerald-400 leading-none tracking-tight">#{item.or}</span><div className="flex flex-wrap items-center justify-end gap-1 absolute top-2 right-2"><div className="p-0.5 text-slate-300 ml-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div></div></div>
                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate mb-1 pr-4" title={item.cliente}>{item.cliente}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">{item.numeroItem && <span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">REF {item.numeroItem}</span>}<span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{item.quantidade} UN</span><span className={`text-xs px-1.5 py-0.5 rounded border ${getDateColorClass(item.dataEntrega, item.isArchived)}`}>{item.dataEntrega.split('-').reverse().join('/')}</span>{item.prioridade === 'Alta' && <span className="text-[7px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase border border-red-200">Alta</span>}</div>
                    <div className={`text-[9px] text-slate-600 dark:text-slate-300 uppercase leading-snug font-medium mb-2 ${isExpanded ? '' : 'line-clamp-2'}`} title={item.item}>{item.item}</div>
                    {(assignment || (relevantStep && canAssign(relevantStep) && !isDone && viewMode !== 'MY_TASKS')) && (
                        <div className="mt-auto pt-2 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-2 mb-2">
                            {assignment ? (
                                <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700 flex-1 min-w-0 group/assign hover:border-blue-200 dark:hover:border-blue-800 transition-colors cursor-default">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-black uppercase shrink-0 shadow-sm">{getInitials(assignment.userName)}</div>
                                    <div className="flex-1 min-w-0"><p className="text-[8px] font-black text-slate-700 dark:text-slate-300 truncate leading-tight">{assignment.userName.split(' ')[0]}</p>{assignment.note ? (<p className="text-[7px] text-slate-400 dark:text-slate-500 truncate italic leading-tight" title={assignment.note}>"{assignment.note}"</p>) : (<p className="text-[7px] text-slate-300 dark:text-slate-600 uppercase leading-tight">Designado</p>)}</div>
                                    {relevantStep && canAssign(relevantStep) && viewMode !== 'MY_TASKS' && (<button onClick={(e) => handleOpenAssignment(e, item.id, relevantStep)} className="text-slate-300 hover:text-blue-500 opacity-0 group-hover/assign:opacity-100 transition-opacity" title="Editar Atribuição"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2"/></svg></button>)}
                                </div>
                            ) : (relevantStep && canAssign(relevantStep) && (<button onClick={(e) => handleOpenAssignment(e, item.id, relevantStep)} className="flex items-center gap-1 text-[8px] font-bold text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1.5 rounded-lg transition-colors border border-dashed border-slate-300 dark:border-slate-700 w-full justify-center group"><svg className="w-3 h-3 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeWidth="2"/></svg>DESIGNAR</button>))}
                        </div>
                    )}
                    {isExpanded && (
                        <div className="mt-2 space-y-2 animate-in slide-in-from-top-1 border-t border-slate-50 dark:border-slate-800 pt-2 mb-2">
                            {item.filePath && <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800 break-all"><span className="font-black text-[8px] text-blue-600 dark:text-blue-400 uppercase block mb-0.5">Arquivo Principal</span><p className="text-slate-700 dark:text-slate-300 font-mono text-[8px]">{item.filePath}</p></div>}
                            {item.filePaths && item.filePaths.length > 0 && <div className="space-y-1">{item.filePaths.map((fp, idx) => <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 flex flex-col"><span className="text-[7px] font-black text-slate-400 uppercase">{fp.name || 'Caminho'}</span><span className="text-[8px] font-mono text-slate-600 dark:text-slate-300 break-all">{fp.path}</span></div>)}</div>}
                            <div className="text-[8px] text-slate-400 flex justify-between"><span>Vendedor: <span className="font-bold text-slate-600 dark:text-slate-300">{item.vendedor}</span></span></div>
                        </div>
                    )}
                    <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-0.5">
                            <button onClick={(e) => { e.stopPropagation(); onShowAttachment(item); }} className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${attachmentsCount > 0 ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeWidth="2"/></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); onShowQR(item); }} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4h4V8H6zm14 10.5c0 .276-.224.5-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3z" strokeWidth="2"/></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); onShowTechSheet?.(item); }} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2"/></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); onEditOrder(item); }} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2"/></svg></button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); toggleDetails(item.id); }} className={`p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${isExpanded ? 'bg-slate-100 dark:bg-slate-800 text-emerald-500' : ''}`}><svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                            {col.id !== 'done' && !isDone && (
                                <button 
                                    onClick={(e) => !isLocked && handleProcessStep(e, item, relevantStep)}
                                    className={`h-6 px-3 rounded-lg flex items-center gap-1 justify-center transition-all shadow-sm active:scale-95 shrink-0 ${actionClass}`}
                                    title={actionTitle}
                                    disabled={isLocked && viewMode !== 'MY_TASKS'}
                                >
                                    {actionIcon}
                                    {buttonLabel && <span className="text-[8px] font-black uppercase hidden sm:inline">{buttonLabel}</span>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
      {/* Top Bar and Sub-Toolbar ... (Keep existing layout) */}
      <div className="shrink-0 px-4 py-3 flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
          {/* ... */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex shrink-0">
                  <button onClick={() => setViewMode('BOARD')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'BOARD' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>Quadro (Fluxo)</button>
                  <button onClick={() => setViewMode('MY_TASKS')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'MY_TASKS' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>Meus Trabalhos {(viewMode === 'MY_TASKS' || myPendingCount > 0) && (<div className={`w-4 h-4 text-[8px] flex items-center justify-center rounded-full ${myPendingCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-white'}`}>{myPendingCount > 0 ? myPendingCount : ''}</div>)}</button>
                  {canAccessTeamView && (<button onClick={() => setViewMode('TEAM')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'TEAM' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>Gestão de Equipe</button>)}
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto flex-1 justify-end">
                  {viewMode !== 'TEAM' && (<div className="relative w-full md:w-64"><input type="text" placeholder="Buscar Ref, O.R, Cliente..." className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 ring-emerald-500 transition-all dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg></div>)}
              </div>
          </div>
      </div>

      {viewMode !== 'TEAM' && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                  {/* ... (Existing toolbar content) ... */}
                  <span className="text-[9px] font-bold text-slate-400 uppercase hidden sm:block">Prioridade:</span>
                  {(['ALL', 'Alta', 'Média', 'Baixa'] as const).map(p => (
                      <button key={p} onClick={() => setPriorityFilter(p)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all whitespace-nowrap ${priorityFilter === p ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}>{p === 'ALL' ? 'Todas' : p}</button>
                  ))}
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block"></div>
                  <button onClick={handleExpandAllCards} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-emerald-500 transition-colors text-[9px] font-black uppercase whitespace-nowrap">Expandir Cards</button>
                  <button onClick={handleCollapseAllCards} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-emerald-500 transition-colors text-[9px] font-black uppercase whitespace-nowrap">Recolher Cards</button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block"></div>
                  <button onClick={handleExpandAll} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-emerald-500 transition-colors text-[9px] font-black uppercase whitespace-nowrap">Exp. Colunas</button>
                  <button onClick={handleCollapseAll} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-emerald-500 transition-colors text-[9px] font-black uppercase whitespace-nowrap">Rec. Colunas</button>
              </div>
              <div className="hidden md:flex items-center gap-1">
                  <button onClick={scrollBoardLeft} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all shadow-sm active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                  <button onClick={scrollBoardRight} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all shadow-sm active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
          </div>
      )}

      {viewMode === 'TEAM' ? (
          <ManagementView 
            orders={orders}
            users={users}
            currentUser={currentUser || { id: 'guest', nome: 'Guest', email: '', role: 'Operador', departamento: 'Geral' }}
            onAssignUser={(orderId, step) => setAssignmentModal({ isOpen: true, orderId, step })}
            onEditOrder={onEditOrder}
            onShowQR={onShowQR}
            onShowAttachment={onShowAttachment}
            onShowTechSheet={onShowTechSheet}
          />
      ) : (
          <div ref={boardContainerRef} className={`flex-1 flex overflow-x-auto overflow-y-hidden px-0 pt-0 md:px-4 md:pt-4 pb-0 gap-3 md:gap-4 custom-scrollbar items-stretch bg-slate-50/50 dark:bg-slate-900/50 scroll-smooth`}>
            {activeColumns.map((col) => {
                const isMySector = viewMode === 'MY_TASKS' ? true : (activeSector === col.step);
                const userIsAdmin = currentUser?.role === 'Admin' || currentUser?.departamento === 'Geral';
                const isLocked = viewMode !== 'MY_TASKS' && !isMySector && !userIsAdmin && col.id !== 'done';
                const isCollapsed = collapsedColumns[col.id];
                const hasMyPending = groupedData[col.id]?.some(g => g.items.some(i => i.assignments?.[col.step!]?.userId === currentUser?.id && i[col.step!] === 'Pendente'));
                const groups = groupedData[col.id] || [];

                return (
                    <KanbanColumn
                        key={col.id}
                        col={col}
                        groups={groups}
                        isLocked={isLocked}
                        isMySector={isMySector}
                        isCollapsed={isCollapsed || false}
                        mobileSelectedCol={mobileSelectedCol}
                        hasMyPending={hasMyPending || false}
                        expandedOrGroups={expandedOrGroups}
                        toggleOrGroup={toggleOrGroup}
                        toggleColumnCollapse={toggleColumnCollapse}
                        handleFocusColumn={handleFocusColumn}
                        onToggleColumnCards={toggleColumnCards}
                        renderCard={renderCard}
                    />
                );
            })}
          </div>
      )}

      {assignmentModal.isOpen && assignmentModal.step && (
          <AssignmentModal isOpen={assignmentModal.isOpen} onClose={() => setAssignmentModal({ isOpen: false, orderId: null, step: null })} users={users} currentStep={assignmentModal.step} onAssign={handleConfirmAssignment} currentAssignment={orders.find(o => o.id === assignmentModal.orderId)?.assignments?.[assignmentModal.step]} />
      )}
    </div>
  );
});

export default KanbanView;
