
import React, { useState, useMemo, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Order, ProductionStep, Status, DEPARTMENTS, User } from '../types';
import AssignmentModal from './AssignmentModal';

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

const getOrderStage = (order: Order): string => {
    if (order.isArchived) return 'done';
    if (order.preImpressao !== 'Concluído') return 'design';
    if (order.impressao !== 'Concluído') return 'print';
    if (order.producao !== 'Concluído') return 'prod';
    if (order.instalacao !== 'Concluído') return 'install';
    if (order.expedicao !== 'Concluído') return 'shipping';
    return 'done';
};

const getDateColorClass = (dateStr: string, isArchived: boolean) => {
    if (isArchived) return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700';
    const today = new Date().toLocaleDateString('en-CA');
    if (dateStr < today) return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900 font-black';
    if (dateStr === today) return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900 font-black';
    return 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold';
};

const ScrollToTopButton = ({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handleScroll = () => setVisible(el.scrollTop > 300);
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, [containerRef]);

    return (
        <button 
            onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`
                absolute bottom-3 right-3 z-30
                w-8 h-8 rounded-full flex items-center justify-center
                bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-emerald-500
                shadow-sm border border-slate-200 dark:border-slate-700
                hover:border-emerald-500 hover:shadow-md
                transition-all duration-300 ease-out active:scale-95
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
            `}
            title="Voltar ao Topo"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
    );
};

const KanbanColumn = ({ col, groups, isLocked, isMySector, isCollapsed, mobileSelectedCol, hasMyPending, expandedOrGroups, toggleOrGroup, toggleColumnCollapse, handleFocusColumn, onToggleColumnCards, renderCard, onDrop, onDragOver }: any) => {
    const columnRef = useRef<HTMLDivElement>(null);
    const isMobileVisible = mobileSelectedCol === col.id;
    let widthClass = isCollapsed ? 'w-14 min-w-[3.5rem]' : isLocked ? 'min-w-[260px] w-[260px]' : 'min-w-[340px] w-[380px]';
    if (mobileSelectedCol && isMobileVisible) { widthClass = 'w-full min-w-full md:min-w-[500px] md:w-[600px]'; } 
    else if (mobileSelectedCol && !isMobileVisible) { widthClass = 'w-14 min-w-[3.5rem]'; }
    
    let bgClass = 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800';
    let stickyClass = '';
    let headerClass = '';

    if (col.id === 'backlog') {
        bgClass = 'bg-slate-200/50 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700 border-r-2';
        stickyClass = 'sticky left-0 z-10 shadow-lg';
        headerClass = 'bg-slate-200 dark:bg-slate-800';
    } else if (col.id === 'finish_zone') {
        widthClass = 'w-[180px] min-w-[180px]'; 
        bgClass = 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 border-dashed border-2';
        headerClass = 'bg-emerald-100/50 dark:bg-emerald-900/30';
    } else if (col.isLeader) {
        bgClass = 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800';
        headerClass = 'bg-indigo-100/50 dark:bg-indigo-900/30';
    } else if (isMySector) {
        bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800';
        headerClass = 'bg-emerald-100/50 dark:bg-emerald-900/30';
    }
    
    if (isLocked) bgClass = 'bg-slate-50/50 dark:bg-black/20 border-slate-200 dark:border-slate-800 opacity-90';
    
    const forceCollapseVisual = mobileSelectedCol && !isMobileVisible;
    const effectivelyCollapsed = isCollapsed || forceCollapseVisual;

    if (effectivelyCollapsed) {
        return (
            <div 
                className={`w-14 min-w-[3.5rem] h-full flex flex-col items-center bg-slate-100 dark:bg-slate-800/50 md:rounded-t-2xl border-x border-t border-slate-200 dark:border-slate-800 transition-all py-4 gap-4 relative ${stickyClass}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
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
    
    if (col.id === 'finish_zone') {
        return (
            <div 
                className={`${widthClass} flex-shrink-0 flex flex-col h-full md:rounded-t-2xl border-x border-t border-b-0 ${bgClass} transition-all duration-300 relative group/column`}
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
                <div className={`p-3 border-b border-inherit flex justify-center items-center md:rounded-t-2xl ${headerClass}`}>
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">FINALIZAR</span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-400 flex items-center justify-center mb-2 animate-pulse">
                        <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 leading-tight">Arraste aqui para<br/>Concluir</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`${widthClass} flex-shrink-0 flex flex-col h-full md:rounded-t-2xl border-x border-t border-b-0 ${bgClass} transition-all duration-300 relative group/column ${stickyClass}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
        >
            <div className={`p-3 border-b border-inherit flex justify-between items-center md:rounded-t-2xl ${headerClass}`}>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleFocusColumn(col.id)} className={`p-1.5 rounded-full transition-all ${mobileSelectedCol === col.id ? 'bg-blue-500 text-white animate-pulse' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`} title={mobileSelectedCol ? "Sair do Foco" : "Focar nesta Coluna"}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2.5"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>
                    </button>
                    {isLocked ? <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5"/></svg> : <div className={`w-2.5 h-2.5 rounded-full ${isMySector ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>}
                    
                    <div className="flex flex-col">
                        <span className={`text-xs font-black uppercase tracking-wider ${isMySector ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>{col.label}</span>
                        {col.isLeader && <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">Líder / Admin</span>}
                    </div>
                    {hasMyPending && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-md ml-1" title="Nova Tarefa Pendente"></div>}
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded text-[10px] font-black shadow-sm">{groups.length}</span>
                    <button onClick={() => onToggleColumnCards(col.id)} className="p-1 text-slate-300 hover:text-blue-500 active:scale-95 transition-transform" title="Recolher/Expandir Ordens"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth="2"/></svg></button>
                    {!isMySector && !mobileSelectedCol && (<button onClick={() => toggleColumnCollapse(col.id)} className="hidden md:block p-1 text-slate-300 hover:text-slate-500 active:scale-95 transition-transform group"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" strokeWidth="2.5"/></svg></button>)}
                    {mobileSelectedCol === col.id && <button onClick={() => handleFocusColumn(col.id)} className="bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded uppercase">Sair Foco</button>}
                </div>
            </div>
            <div ref={columnRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3 pb-4 relative min-h-[200px]">
                {groups.map((group: any) => {
                    const isMultiItem = group.items.length > 1;
                    const isGroupExpanded = expandedOrGroups[group.or];
                    const firstItem = group.items[0];
                    let priorityBorderClass = 'border-l-slate-300';
                    if (group.items.some((i: any) => i.prioridade === 'Alta')) priorityBorderClass = 'border-l-red-500';
                    else if (group.items.some((i: any) => i.prioridade === 'Média')) priorityBorderClass = 'border-l-blue-400';
                    const isLate = group.items.some((i: any) => !i.isArchived && i.dataEntrega < new Date().toLocaleDateString('en-CA'));

                    const uniqueRefs = Array.from(new Set(group.items.map((i: any) => i.numeroItem))).filter(Boolean);

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
                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            {uniqueRefs.length > 0 ? (
                                                <div className="flex flex-wrap gap-1 mb-1">
                                                    {uniqueRefs.slice(0, 3).map((ref: any, idx: number) => (
                                                        <span key={idx} className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 rounded border border-slate-200 dark:border-slate-700">REF {ref}</span>
                                                    ))}
                                                    {uniqueRefs.length > 3 && <span className="text-[8px] font-bold text-slate-400">+{uniqueRefs.length - 3}</span>}
                                                </div>
                                            ) : (
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">Clique para ver itens</span>
                                            )}
                                            <div className="flex items-center justify-between mt-1">
                                                <div className="flex -space-x-1">{group.items.slice(0,3).map((i:any, idx:number) => (<div key={idx} className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-800 flex items-center justify-center text-[6px] font-black text-slate-500">{idx+1}</div>))}{group.items.length > 3 && <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-800 flex items-center justify-center text-[6px] font-black text-slate-400">+</div>}</div>
                                                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Ver Todos</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {!isGroupExpanded && <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent opacity-50"></div>}
                            </div>
                            {isGroupExpanded && (<div className="mt-2 pl-3 ml-2 border-l-2 border-slate-200 dark:border-slate-700 space-y-2 animate-in slide-in-from-left-2 duration-200">{group.items.map((item:any) => renderCard(item, col, isLocked))}</div>)}
                        </div>
                    );
                })}
                {groups.length === 0 && <div className="flex flex-col items-center justify-center h-32 opacity-20"><p className="text-[8px] font-black text-slate-400 uppercase">Vazio</p></div>}
            </div>
            <ScrollToTopButton containerRef={columnRef} />
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
  users, 
  onAssignUser 
}, ref) => {
    // STATE
    const [viewMode, setViewMode] = useState<'MY_TASKS' | 'TEAM'>('MY_TASKS');
    const [selectedTeamSector, setSelectedTeamSector] = useState<ProductionStep | 'ALL'>('ALL');
    const [minimizedItems, setMinimizedItems] = useState<Record<string, boolean>>({});
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [expandedOrGroups, setExpandedOrGroups] = useState<Record<string, boolean>>({});
    const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
    const [mobileSelectedCol, setMobileSelectedCol] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());
    
    const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean; orderId: string | null; step: ProductionStep | null; userId?: string }>({
        isOpen: false, orderId: null, step: null
    });

    const boardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    useImperativeHandle(ref, () => ({
        switchToMyTasks: () => setViewMode('MY_TASKS'),
        expandAll: () => setMinimizedItems({}),
        collapseAll: () => {
            const allIds = orders.map(o => o.id);
            const newState = allIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
            setMinimizedItems(newState);
        }
    }));

    // --- HANDLERS ---
    const handleDragStart = (e: React.DragEvent, order: Order) => {
        e.dataTransfer.setData("orderId", order.id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnd = () => {};

    const toggleMinimize = (id: string, e: React.MouseEvent) => {
        if (window.getSelection()?.toString()) return;
        setMinimizedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleDetails = (id: string) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    
    const toggleOrGroup = (or: string) => setExpandedOrGroups(prev => ({ ...prev, [or]: !prev[or] }));
    const toggleColumnCollapse = (id: string) => setCollapsedColumns(prev => ({ ...prev, [id]: !prev[id] }));
    const handleFocusColumn = (id: string) => setMobileSelectedCol(prev => prev === id ? null : id);
    const onToggleColumnCards = (colId: string) => {
       // Logic to toggle all cards in column (simplified as expand/collapse all for now or handled per column)
       // This could be implemented to fetch all orders in this column and set minimized state
    };

    const handleDrop = (e: React.DragEvent, targetColId: string) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData("orderId");
        if (!orderId) return;
        
        // Logic for drag/drop status change or assignment
        // If targetColId is 'finish_zone', complete the relevant step
        if (targetColId === 'finish_zone') {
            // Find which step is currently active for this order and user
            const order = orders.find(o => o.id === orderId);
            if (order) {
                // Infer step from view mode or active assignment
                // Simplification: In 'MY_TASKS', complete the assigned step
                const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
                const step = steps.find(s => order.assignments?.[s]?.userId === currentUser?.id && order[s] === 'Em Produção');
                if (step) onUpdateStatus(orderId, step, 'Concluído');
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleProcessStep = (e: React.MouseEvent, order: Order, step?: ProductionStep) => {
        e.stopPropagation();
        if (!step) return;
        const current = order[step];
        let next: Status = 'Em Produção';
        if (current === 'Em Produção') next = 'Concluído';
        else if (current === 'Concluído') next = 'Pendente';
        onUpdateStatus(order.id, step, next);
    };

    const handleConfirmAssignment = (userId: string, note: string) => {
        if (assignmentModal.orderId && assignmentModal.step && onAssignUser) {
            onAssignUser(assignmentModal.orderId, assignmentModal.step, userId, note, currentUser?.nome || 'Sistema');
        }
    };

    const getLiveDuration = (startStr?: string) => {
        if (!startStr) return '0h 0m';
        const start = new Date(startStr).getTime();
        const diff = Math.max(0, now.getTime() - start);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    // --- RENDER CARD (Moved Inside) ---
    const renderCard = (order: Order, col?: { id: string, step?: ProductionStep }, isLocked?: boolean) => {
        const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
        let relevantStep: ProductionStep | undefined;
        
        // Determine relevant step based on View Mode
        if (viewMode === 'MY_TASKS') {
             // Find step assigned to current user
             relevantStep = steps.find(s => order.assignments?.[s]?.userId === currentUser?.id && order[s] !== 'Concluído');
             // If not assigned or completed, maybe show pending? For now, focused on assignments.
             if (!relevantStep && col?.step) relevantStep = col.step;
        } else {
             // Team View / Standard View
             if (col?.step) relevantStep = col.step;
             else if (selectedTeamSector !== 'ALL') relevantStep = selectedTeamSector;
        }

        const assignment = relevantStep ? order.assignments?.[relevantStep] : null;
        const status = relevantStep ? order[relevantStep] : 'Pendente';
        const isInProgress = status === 'Em Produção';
        
        const isMinimized = minimizedItems[order.id];
        const isExpanded = expandedItems[order.id];
        const attachmentsCount = order.attachments?.length || 0;

        let priorityBorderClass = 'border-l-slate-300';
        if (order.prioridade === 'Alta') priorityBorderClass = 'border-l-red-500';
        else if (order.prioridade === 'Média') priorityBorderClass = 'border-l-blue-400';

        const showActionButtons = !isLocked && relevantStep && (
            viewMode === 'MY_TASKS' || 
            (viewMode === 'TEAM' && (currentUser?.isLeader || currentUser?.role === 'Admin'))
        );

        if (isMinimized) {
            return (
                <div 
                    key={order.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, order)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => toggleMinimize(order.id, e)}
                    className={`bg-white dark:bg-slate-900 rounded-r-lg mb-2 shadow-sm border-l-[4px] relative group/item transition-all flex flex-col shrink-0 cursor-grab active:cursor-grabbing hover:shadow-md ${priorityBorderClass} ${isInProgress ? 'bg-amber-50/30 dark:bg-amber-900/10' : 'border-y border-r border-slate-200 dark:border-slate-700'}`}
                >
                    <div className="p-2.5 flex flex-col gap-1.5 relative">
                        {isInProgress && assignment?.startedAt && (
                            <div className="absolute top-1 right-7 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm flex items-center gap-0.5 z-10 animate-pulse">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>
                                {getLiveDuration(assignment.startedAt)}
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-xs font-[950] text-emerald-600 dark:text-emerald-400 shrink-0">#{order.or}</span>
                                <div className="text-slate-400 p-0.5 ml-auto">
                                    <svg className="w-3.5 h-3.5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase truncate leading-tight">{order.cliente}</span>
                            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase leading-tight line-clamp-2">{order.item}</span>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div 
                key={order.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, order)}
                onDragEnd={handleDragEnd}
                onClick={(e) => toggleMinimize(order.id, e)}
                className={`bg-white dark:bg-slate-900 rounded-r-lg mb-2 shadow-sm border-l-[4px] relative group/item transition-all flex flex-col shrink-0 cursor-grab active:cursor-grabbing hover:shadow-md ${priorityBorderClass} ${isInProgress ? 'bg-amber-50/30 dark:bg-amber-900/10' : 'border-y border-r border-slate-200 dark:border-slate-700'}`}
            >
                <div className="flex flex-col p-2.5 flex-1 relative">
                    {isInProgress && assignment?.startedAt && (
                        <div className="absolute top-2 right-8 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm animate-pulse flex items-center gap-1 z-10">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>
                            {getLiveDuration(assignment.startedAt)}
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-1.5 gap-2 pr-6">
                        <span className="text-sm font-[950] text-emerald-600 dark:text-emerald-400 leading-none tracking-tight">#{order.or}</span>
                        <div className="flex flex-wrap items-center justify-end gap-1 absolute top-2 right-2">
                            <div className="p-0.5 text-slate-300 ml-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate mb-1 pr-4">{order.cliente}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {order.numeroItem && <span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">REF {order.numeroItem}</span>}
                        <span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{order.quantidade || '1'} UN</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${getDateColorClass(order.dataEntrega, order.isArchived)}`}>{order.dataEntrega.split('-').reverse().join('/')}</span>
                        {order.prioridade === 'Alta' && <span className="text-[7px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase border border-red-200">Alta</span>}
                    </div>
                    <div className={`text-[9px] text-slate-600 dark:text-slate-300 uppercase leading-snug font-medium mb-2 ${isExpanded ? '' : 'line-clamp-2'}`} title={order.item}>{order.item}</div>
                    
                    <div className="mt-auto pt-2 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-2 mb-2">
                        {assignment ? (
                            <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700 flex-1 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-black uppercase shrink-0 shadow-sm">{assignment.userName.substring(0,2)}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black text-slate-700 dark:text-slate-300 truncate leading-tight">{relevantStep ? DEPARTMENTS[relevantStep].split(' ')[0] : 'Tarefa'}</p>
                                    <p className="text-[7px] text-slate-400 dark:text-slate-500 truncate italic leading-tight">{assignment.note || 'Designado'}</p>
                                </div>
                            </div>
                        ) : (
                            relevantStep && onAssignUser && (
                                <button onClick={(e) => { e.stopPropagation(); setAssignmentModal({ isOpen: true, orderId: order.id, step: relevantStep! }); }} className="flex items-center gap-1 text-[8px] font-bold text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1.5 rounded-lg transition-colors border border-dashed border-slate-300 dark:border-slate-700 w-full justify-center group">
                                    <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeWidth="2"/></svg>
                                    DESIGNAR
                                </button>
                            )
                        )}
                    </div>

                    <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-0.5">
                            <button onClick={(e) => { e.stopPropagation(); onShowAttachment(order); }} className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${attachmentsCount > 0 ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeWidth="2"/></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); onShowQR(order); }} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4h4V8H6zm14 10.5c0 .276-.224.5-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3z" strokeWidth="2"/></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); onShowTechSheet?.(order); }} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2"/></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); onEditOrder(order); }} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2"/></svg></button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); toggleDetails(order.id); }} className={`p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${isExpanded ? 'bg-slate-100 dark:bg-slate-800 text-emerald-500' : ''}`}><svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                            {showActionButtons && (
                                <div className="flex items-center gap-1">
                                    {status === 'Em Produção' ? (
                                        <>
                                            <div className="h-7 px-2.5 rounded-lg flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse cursor-default select-none">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"></div>
                                                <span className="text-[8px] font-black uppercase">EM CURSO</span>
                                            </div>
                                            <button 
                                                onClick={(e) => handleProcessStep(e, order, relevantStep)}
                                                className="h-7 w-7 rounded-lg flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
                                                title="Concluir Tarefa"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={(e) => handleProcessStep(e, order, relevantStep)}
                                            className="h-7 px-3 rounded-lg flex items-center gap-2 justify-center transition-all shadow-sm active:scale-95 shrink-0 bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300/50" 
                                            title="Iniciar Tarefa"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeWidth="2"/></svg>
                                            <span className="text-[9px] font-black uppercase">INICIAR</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- DATA PREPARATION ---
    // If My Tasks: 5 Fixed Columns (Stages)
    // If Team: N Columns (Users) + Backlog? Or Stages?
    // Based on previous KanbanView usage, it seems it is STAGE based for personal view or standard view.
    // However, ManagementView uses it differently. 
    // We will support a simplified STAGE based Kanban for "My Tasks" and "Team View" (where team members are rows or just global stages).
    // Given the previous code, let's implement standard Stage Kanban.

    const columns: { id: string, label: string, step?: ProductionStep }[] = [
        { id: 'backlog', label: 'Backlog', step: undefined },
        { id: 'preImpressao', label: 'Design & Pré', step: 'preImpressao' },
        { id: 'impressao', label: 'Impressão', step: 'impressao' },
        { id: 'producao', label: 'Produção', step: 'producao' },
        { id: 'instalacao', label: 'Instalação', step: 'instalacao' },
        { id: 'expedicao', label: 'Expedição', step: 'expedicao' },
        { id: 'finish_zone', label: 'Concluído', step: undefined }
    ];

    const groupedData = useMemo(() => {
        const data: Record<string, { or: string; client: string; items: Order[] }[]> = {};
        columns.forEach(c => data[c.id] = []);

        const activeOrders = orders.filter(o => !o.isArchived);

        const temp: Record<string, Record<string, Order[]>> = {};
        columns.forEach(c => temp[c.id] = {});

        activeOrders.forEach(order => {
            // Determine which column this order belongs to
            // For a general Kanban, an order flows through steps. 
            // We need to know the *current* active step.
            // Simplified logic: Find the first step that is NOT finished.
            
            const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
            let currentStep: ProductionStep | 'finish_zone' = 'finish_zone';
            
            for (const step of steps) {
                if (order[step] !== 'Concluído') {
                    currentStep = step;
                    break;
                }
            }

            // Filter by View Mode
            let include = true;
            if (viewMode === 'MY_TASKS' && currentUser) {
                // Include if assigned to me in the current step OR if I am in that department and it's unassigned/pending
                // For simplicity: assigned to me OR (I am in that dept AND it is NOT assigned to anyone else)
                const assignment = order.assignments?.[currentStep as ProductionStep];
                const myDept = currentUser.departamento;
                
                const isAssignedToMe = assignment?.userId === currentUser.id;
                const isMyDeptAndUnassigned = !assignment?.userId && (myDept === currentStep || myDept === 'Geral');
                
                if (!isAssignedToMe && !isMyDeptAndUnassigned) include = false;
            }

            if (include) {
                const colId = currentStep === 'finish_zone' ? 'finish_zone' : currentStep;
                
                // Backlog logic: If pending and unassigned? 
                // For now, mapping directly to steps.
                
                if (!temp[colId][order.or]) temp[colId][order.or] = [];
                temp[colId][order.or].push(order);
            }
        });

        // Convert temp to array
        Object.keys(temp).forEach(key => {
            const groups = Object.keys(temp[key]).map(or => ({
                or,
                client: temp[key][or][0].cliente,
                items: temp[key][or]
            }));
            // Sort groups by priority/date
            groups.sort((a,b) => a.items[0].dataEntrega.localeCompare(b.items[0].dataEntrega));
            data[key] = groups;
        });

        return data;
    }, [orders, viewMode, currentUser]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex gap-2">
                    <button onClick={() => setViewMode('MY_TASKS')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'MY_TASKS' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>Minhas Tarefas</button>
                    <button onClick={() => setViewMode('TEAM')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'TEAM' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>Visão Geral</button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setMinimizedItems({})} className="text-slate-400 hover:text-emerald-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth="2"/></svg></button>
                </div>
            </div>

            {/* Board */}
            <div ref={boardRef} className="flex-1 flex overflow-x-auto overflow-y-hidden px-0 pt-0 md:px-4 md:pt-4 pb-0 gap-3 md:gap-4 custom-scrollbar items-stretch bg-slate-50/50 dark:bg-slate-900/50 scroll-smooth">
                {columns.filter(c => c.id !== 'backlog').map(col => (
                    <KanbanColumn
                        key={col.id}
                        col={col}
                        groups={groupedData[col.id]}
                        isLocked={false}
                        isMySector={currentUser?.departamento === col.step}
                        isCollapsed={collapsedColumns[col.id]}
                        mobileSelectedCol={mobileSelectedCol}
                        hasMyPending={false}
                        expandedOrGroups={expandedOrGroups}
                        toggleOrGroup={toggleOrGroup}
                        toggleColumnCollapse={toggleColumnCollapse}
                        handleFocusColumn={handleFocusColumn}
                        onToggleColumnCards={onToggleColumnCards}
                        renderCard={renderCard}
                        onDrop={(e: React.DragEvent) => handleDrop(e, col.id)}
                        onDragOver={handleDragOver}
                    />
                ))}
            </div>

            {/* Assignment Modal */}
            {assignmentModal.isOpen && assignmentModal.step && (
                <AssignmentModal
                    isOpen={assignmentModal.isOpen}
                    onClose={() => setAssignmentModal({ isOpen: false, orderId: null, step: null })}
                    users={users || []}
                    currentStep={assignmentModal.step}
                    onAssign={(userId, note) => {
                        handleConfirmAssignment(userId, note);
                        setAssignmentModal({ isOpen: false, orderId: null, step: null });
                    }}
                    currentAssignment={orders.find(o => o.id === assignmentModal.orderId)?.assignments?.[assignmentModal.step]}
                    preSelectedUserId={assignmentModal.userId} 
                />
            )}
        </div>
    );
});

export default KanbanView;
