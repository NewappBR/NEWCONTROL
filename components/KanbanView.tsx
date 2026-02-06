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

// Ícones dos Setores para a Barra de Ferramentas
const SECTOR_ICONS: Record<string, React.ReactNode> = {
    'ALL': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeWidth="2.5" strokeLinecap="round"/></svg>,
    'preImpressao': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'impressao': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'producao': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'instalacao': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'expedicao': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
};

// ... (Helper functions) ...
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

// ... (ScrollToTopButton Component) ...
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

// ... (KanbanColumn Component) ...
const KanbanColumn = ({ col, groups, isLocked, isMySector, isCollapsed, mobileSelectedCol, hasMyPending, expandedOrGroups, toggleOrGroup, toggleColumnCollapse, handleFocusColumn, onToggleColumnCards, renderCard, onDrop, onDragOver }: any) => {
    const columnRef = useRef<HTMLDivElement>(null);
    const isMobileVisible = mobileSelectedCol === col.id;
    let widthClass = isCollapsed ? 'w-14 min-w-[3.5rem]' : isLocked ? 'min-w-[260px] w-[260px]' : 'min-w-[340px] w-[380px]';
    if (mobileSelectedCol && isMobileVisible) { widthClass = 'w-full min-w-full md:min-w-[500px] md:w-[600px]'; } 
    else if (mobileSelectedCol && !isMobileVisible) { widthClass = 'w-14 min-w-[3.5rem]'; }
    
    // --- STYLING LOGIC ---
    let bgClass = 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800';
    let stickyClass = '';
    let headerClass = '';

    if (col.id === 'backlog') {
        // Backlog Highlight & Sticky
        bgClass = 'bg-slate-200/50 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700 border-r-2';
        stickyClass = 'sticky left-0 z-10 shadow-lg';
        headerClass = 'bg-slate-200 dark:bg-slate-800';
    } else if (col.id === 'finish_zone') {
        // Finish Zone Styling
        widthClass = 'w-[180px] min-w-[180px]'; // Menor que as outras
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
    
    // Special Render for Finish Zone Column
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
                    // ... (Card Group rendering logic) ...
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
    users = [],
    onAssignUser
}, ref) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'Alta' | 'Média' | 'Baixa'>('ALL');
  
  // Timer State for auto-updating card durations
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Board Ref for ScrollToTop
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const interval = setInterval(() => setCurrentTime(Date.now()), 60000); // Update every minute
      return () => clearInterval(interval);
  }, []);

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
  
  // -- TEAM VIEW SECTOR FILTER STATE --
  const [selectedTeamSector, setSelectedTeamSector] = useState<ProductionStep | 'ALL'>('ALL');
  const [teamMemberFilter, setTeamMemberFilter] = useState('');

  const [isDragging, setIsDragging] = useState(false);

  // Enforce permissions for Sector Filter
  useEffect(() => {
      if (viewMode === 'TEAM' && currentUser) {
          const isAdminOrGeneral = currentUser.role === 'Admin' || currentUser.departamento === 'Geral';
          if (!isAdminOrGeneral) {
              // Force user to see only their sector
              setSelectedTeamSector(currentUser.departamento as ProductionStep);
          } else {
              // Reset to ALL if they switch views and are admin
              // (Optional: keep last selected if preferred)
          }
      }
  }, [viewMode, currentUser]);

  // ... (Rest of state initialization) ...
  const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean; orderId: string | null; step: ProductionStep | null; userId?: string }>({
      isOpen: false, orderId: null, step: null
  });

  const activeSector = useMemo(() => {
      if (!currentUser) return null;
      return currentUser.departamento as ProductionStep;
  }, [currentUser]);

  const myPendingCount = useMemo(() => {
      if (!currentUser) return 0;
      const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
      return orders.filter(o => !o.isArchived && steps.some(step => o.assignments?.[step]?.userId === currentUser.id && o[step] !== 'Concluído')).length;
  }, [orders, currentUser]);

  useEffect(() => {
      if (searchTerm.trim().length > 0) { setCollapsedColumns({}); setFocusedColumnId('all'); }
  }, [searchTerm, viewMode]);

  const scrollBoard = (direction: 'left' | 'right') => {
      if (boardRef.current) {
          const amount = 300;
          boardRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
      }
  };

  // COLUMNS DEFINITION
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
      { id: 'in_progress', label: 'Em Execução' },
      { id: 'finish_zone', label: 'Finalizar', step: undefined } // Nova coluna de finalização
  ];

  // Team Columns - Dynamic based on users AND selectedTeamSector
  const teamColumns = useMemo(() => {
      // Filter users based on selectedTeamSector
      const filteredUsers = users.filter(u => {
          if (u.id === currentUser?.id) return false; // Hide self
          
          if (teamMemberFilter && !u.nome.toLowerCase().includes(teamMemberFilter.toLowerCase())) return false;

          if (selectedTeamSector === 'ALL') {
              // Show everyone relevant
              return true;
          }
          
          const isUniversal = u.role === 'Admin' || u.cargo?.toUpperCase().includes('DIRETOR') || u.departamento === 'Geral';
          return u.departamento === selectedTeamSector || isUniversal;
      });
      
      // Sort: Admin/Director > Leader > Operators
      filteredUsers.sort((a, b) => {
          const getScore = (u: User) => {
              if (u.role === 'Admin' || u.cargo?.toUpperCase().includes('DIRETOR')) return 3;
              if (u.isLeader) return 2;
              return 1;
          };
          const scoreA = getScore(a);
          const scoreB = getScore(b);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return a.nome.localeCompare(b.nome);
      });
      
      const cols = filteredUsers.map(u => ({
          id: u.id,
          label: u.nome,
          step: undefined,
          isLeader: u.isLeader,
          role: u.role
      }));
      
      const backlogLabel = selectedTeamSector === 'ALL' ? 'Backlog Geral' : `Backlog ${DEPARTMENTS[selectedTeamSector]?.split(' ')[0]}`;
      
      return [{ id: 'backlog', label: backlogLabel, step: selectedTeamSector === 'ALL' ? undefined : selectedTeamSector }, ...cols];
  }, [users, currentUser, selectedTeamSector, teamMemberFilter]);

  const activeColumns = viewMode === 'MY_TASKS' ? myTaskColumns : viewMode === 'TEAM' ? teamColumns : boardColumns;

  // DATA GROUPING LOGIC
  const groupedData = useMemo(() => {
    const data: Record<string, { or: string; client: string; items: Order[] }[]> = {};
    activeColumns.forEach(col => data[col.id] = []);
    
    // Common filtering
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
    } else if (viewMode === 'TEAM') {
        // Group by User Assignment in current sector
        filtered.forEach(order => {
            if (order.isArchived) return;
            
            // Check based on selectedTeamSector
            const stepsToCheck: ProductionStep[] = selectedTeamSector === 'ALL' ? ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'] : [selectedTeamSector as ProductionStep];

            stepsToCheck.forEach(step => {
                const assignment = order.assignments?.[step];
                
                // BACKLOG LOGIC: If status NOT 'Concluído' AND NOT Assigned to anyone
                if(order[step] !== 'Concluído' && (!assignment || !assignment.userId)) {
                     // Only show in backlog if it matches the filter scope
                     if (selectedTeamSector === 'ALL' || selectedTeamSector === step) {
                         if (data['backlog']) {
                             let existingGroup = data['backlog'].find(g => g.or === order.or);
                             if (!existingGroup) { existingGroup = { or: order.or, client: order.cliente, items: [] }; data['backlog'].push(existingGroup); }
                             if (!existingGroup.items.find(i => i.id === order.id)) existingGroup.items.push(order);
                         }
                     }
                     return; 
                }

                if (assignment && assignment.userId) {
                    const targetCol = assignment.userId;
                    // Only add if we have a column for this user (i.e., they are visible in current filter)
                    if (data[targetCol]) {
                        let existingGroup = data[targetCol].find(g => g.or === order.or);
                        if (!existingGroup) { existingGroup = { or: order.or, client: order.cliente, items: [] }; data[targetCol].push(existingGroup); }
                        if (!existingGroup.items.find(i => i.id === order.id)) existingGroup.items.push(order);
                    }
                }
            });
        });

    } else {
        // BOARD VIEW
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
  }, [orders, searchTerm, viewMode, currentUser, activeColumns, priorityFilter, selectedTeamSector]);

  // ... (Methods: handleProcessStep, toggleDetails, etc. remain the same) ...
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
      
      // Team View logic handled in permissions
      if (step) {
          const currentStatus = order[step];
          if (currentStatus === 'Pendente') { onUpdateStatus(order.id, step, 'Em Produção'); } 
          else if (currentStatus === 'Em Produção') { onUpdateStatus(order.id, step, 'Concluído'); }
      }
  };

  const handleConfirmAssignment = (userId: string, note: string) => { 
      if (assignmentModal.orderId && assignmentModal.step && currentUser && onAssignUser) { 
          onAssignUser(assignmentModal.orderId, assignmentModal.step, userId, note, currentUser.nome); 
      } 
  };
  const toggleDetails = (itemId: string) => { setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] })); };
  const toggleMinimize = (itemId: string, e: React.MouseEvent) => { 
      if (window.getSelection()?.toString()) return;
      e.stopPropagation(); 
      setMinimizedItems(prev => { const currentVal = prev[itemId]; return { ...prev, [itemId]: currentVal === undefined ? false : !currentVal }; }); 
  };
  const toggleColumnCollapse = (colId: string) => { setCollapsedColumns(prev => ({ ...prev, [colId]: !prev[colId] })); };
  const onToggleColumnCards = (colId: string) => {
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
  const handleCollapseAll = () => { const allCollapsed = activeColumns.reduce((acc, col) => ({...acc, [col.id]: true}), {}); setCollapsedColumns(allCollapsed); setFocusedColumnId('all'); setMobileSelectedCol(null); };
  const handleFocusColumn = (colId: string) => { if (focusedColumnId === colId) { setFocusedColumnId('all'); setMobileSelectedCol(null); setCollapsedColumns({}); } else { setFocusedColumnId(colId); setMobileSelectedCol(colId); const allOtherCollapsed = activeColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.id !== colId }), {}); setCollapsedColumns(allOtherCollapsed); } };

  const expandAllColumns = () => { setCollapsedColumns({}); setFocusedColumnId('all'); setMobileSelectedCol(null); };
  const collapseAllColumns = () => { const allCollapsed = activeColumns.reduce((acc, col) => ({...acc, [col.id]: true}), {}); setCollapsedColumns(allCollapsed); setFocusedColumnId('all'); setMobileSelectedCol(null); };

  useImperativeHandle(ref, () => ({ switchToMyTasks: () => { setViewMode('MY_TASKS'); }, expandAll: handleExpandAll, collapseAll: handleCollapseAll }));

  // --- DRAG AND DROP HANDLERS (UPDATED) ---
  const handleDragStart = (e: React.DragEvent, order: Order) => {
      e.dataTransfer.setData("orderId", order.id);
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
  };

  const handleDragEnd = () => {
      setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault();
      setIsDragging(false);
      const orderId = e.dataTransfer.getData("orderId");
      if (!orderId) return;
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Drop on "finish_zone" (Column in MyTasks) OR "FINISH_ZONE" (global - not used anymore)
      if (targetColumnId === 'finish_zone' || targetColumnId === 'FINISH_ZONE') {
          // If in Team View or My Tasks, we need to know WHICH step we are finishing
          let stepToFinish: ProductionStep | undefined;
          
          if (viewMode === 'MY_TASKS') {
              const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
              stepToFinish = steps.find(s => order.assignments?.[s]?.userId === currentUser?.id && order[s] === 'Em Produção');
          } else if (viewMode === 'TEAM') {
              // In Team mode, assume finishing selected sector if valid
              if (selectedTeamSector !== 'ALL') stepToFinish = selectedTeamSector;
          }

          if (stepToFinish) {
              onUpdateStatus(orderId, stepToFinish, 'Concluído');
          } else {
              alert("Não foi possível identificar qual etapa finalizar. Certifique-se que o item está em produção.");
          }
          return;
      }

      if (viewMode === 'MY_TASKS') {
          const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
          // Find the relevant step for this user on this order that is active or pending
          const relevantStep = steps.find(s => order.assignments?.[s]?.userId === currentUser?.id && order[s] !== 'Concluído');
          
          if (relevantStep) {
              if (targetColumnId === 'in_progress') {
                  if (order[relevantStep] !== 'Em Produção') {
                      onUpdateStatus(orderId, relevantStep, 'Em Produção');
                  }
              } else if (targetColumnId === 'pending') {
                  if (order[relevantStep] !== 'Pendente') {
                      onUpdateStatus(orderId, relevantStep, 'Pendente');
                  }
              }
          }
          return;
      }

      // Logic for BOARD view drag and drop (Changing Status)
      if (viewMode === 'BOARD') {
          // Find Target Step from Column ID
          const targetCol = boardColumns.find(c => c.id === targetColumnId);
          if (!targetCol || !targetCol.step) return; // 'done' or invalid

          const targetStep = targetCol.step;

          // Check permissions
          if (currentUser?.role !== 'Admin' && currentUser?.departamento !== 'Geral' && currentUser?.departamento !== targetStep) {
              alert(`Você não tem permissão para mover itens para o setor ${targetStep}.`);
              return;
          }
          
          const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
          const targetIndex = steps.indexOf(targetStep);
          
          onUpdateStatus(orderId, targetStep, 'Em Produção');
          if (targetIndex > 0) {
              const prevStep = steps[targetIndex - 1];
              if (order[prevStep] !== 'Concluído') {
                  onUpdateStatus(orderId, prevStep, 'Concluído');
              }
          }
      } else if (viewMode === 'TEAM') {
          // Logic for TEAM view drag and drop (Changing Assignment)
          if (targetColumnId === 'backlog') {
              // Unassign
              // If selectedTeamSector is specific, remove assignment for that sector
              if (selectedTeamSector !== 'ALL') {
                  onAssignUser?.(orderId, selectedTeamSector, '', 'Removido via Drag&Drop', currentUser?.nome || '');
              } else {
                  alert("Para desatribuir, filtre por um setor específico.");
              }
          } else {
              // Assign to User (targetColumnId is UserId)
              // We need to know WHICH step we are assigning.
              // If selectedTeamSector is specific, use that.
              if (selectedTeamSector !== 'ALL') {
                  // Direct Assignment
                  // Also set status to 'Em Produção' automatically for better flow
                  if (onAssignUser) {
                      onAssignUser(orderId, selectedTeamSector, targetColumnId, '', currentUser?.nome || '');
                      // Optional: Auto-start status if coming from backlog
                      if (order[selectedTeamSector] === 'Pendente') {
                          onUpdateStatus(orderId, selectedTeamSector, 'Em Produção');
                      }
                  }
              } else {
                  alert("Para atribuir, filtre por um setor específico (não 'Geral').");
              }
          }
      }
  };

  // --- CARD COMPONENT ---
  const OrderCard: React.FC<{ order: Order, userId: string, col?: { id: string, step?: ProductionStep } }> = ({ order, userId, col }) => {
      const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
      let relevantStep: ProductionStep | undefined;
      
      if (viewMode === 'MY_TASKS') {
           relevantStep = steps.find(s => order.assignments?.[s]?.userId === userId && order[s] !== 'Concluído');
      } else if (viewMode === 'TEAM') {
           if (col?.id === 'backlog') {
                relevantStep = col.step; 
                if (!relevantStep && selectedTeamSector !== 'ALL') relevantStep = selectedTeamSector;
           } else {
                if (selectedTeamSector !== 'ALL') {
                    relevantStep = selectedTeamSector;
                } else {
                    relevantStep = steps.find(s => order.assignments?.[s]?.userId === col?.id);
                }
           }
      } else {
           relevantStep = col?.step;
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

      // --- PERMISSION CHECK FOR BUTTONS ---
      // Buttons appear if:
      // 1. My Tasks view
      // 2. Team View AND user is Leader/Admin
      const showActionButtons = relevantStep && (
          viewMode === 'MY_TASKS' || 
          (viewMode === 'TEAM' && (currentUser?.isLeader || currentUser?.role === 'Admin'))
      );

      // LIVE TIMER LOGIC
      const getLiveDuration = (startStr?: string) => {
          if (!startStr) return '';
          const start = new Date(startStr).getTime();
          const now = Date.now(); // Updated every minute by parent
          const diff = Math.max(0, now - start);
          
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          return `${hours}h ${minutes}m`;
      };

      if (isMinimized) {
          return (
              <div 
                  draggable={true} // Enable drag always, logic handles drop
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap pt-1 border-t border-slate-50 dark:border-slate-800">
                          <span className={`px-1.5 py-0.5 rounded border text-[8px] ${getDateColorClass(order.dataEntrega, order.isArchived)}`}>
                              {order.dataEntrega.split('-').reverse().join('/')}
                          </span>
                          {relevantStep && <span className="text-[8px] font-black text-slate-400 uppercase">{DEPARTMENTS[relevantStep].split(' ')[0]}</span>}
                      </div>
                  </div>
              </div>
          );
      }

      return (
          <div 
              draggable={true} // Enable drag always
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
                      <span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{order.quantidade} UN</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${getDateColorClass(order.dataEntrega, order.isArchived)}`}>{order.dataEntrega.split('-').reverse().join('/')}</span>
                      {order.prioridade === 'Alta' && <span className="text-[7px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase border border-red-200">Alta</span>}
                  </div>
                  <div className={`text-[9px] text-slate-600 dark:text-slate-300 uppercase leading-snug font-medium mb-2 ${isExpanded ? '' : 'line-clamp-2'}`} title={order.item}>{order.item}</div>
                  
                  <div className="mt-auto pt-2 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-2 mb-2">
                      {userId !== 'unassigned' && assignment ? (
                          <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700 flex-1 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-black uppercase shrink-0 shadow-sm">{assignment.userName.substring(0,2)}</div>
                              <div className="flex-1 min-w-0">
                                  <p className="text-[8px] font-black text-slate-700 dark:text-slate-300 truncate leading-tight">{relevantStep ? DEPARTMENTS[relevantStep].split(' ')[0] : 'Tarefa'}</p>
                                  <p className="text-[7px] text-slate-400 dark:text-slate-500 truncate italic leading-tight">{assignment.note || 'Designado'}</p>
                              </div>
                          </div>
                      ) : (
                          relevantStep && (
                            <button onClick={(e) => { e.stopPropagation(); setAssignmentModal({ isOpen: true, orderId: order.id, step: relevantStep }); }} className="flex items-center gap-1 text-[8px] font-bold text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1.5 rounded-lg transition-colors border border-dashed border-slate-300 dark:border-slate-700 w-full justify-center group">
                                {assignment?.userId ? (
                                    <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[6px] font-black">{assignment.userName.substring(0,2)}</div>
                                ) : (
                                    <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeWidth="2"/></svg>
                                )}
                                {assignment?.userId ? `ALTERAR` : `DESIGNAR`}
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
                              <button 
                                onClick={(e) => handleProcessStep(e, order, relevantStep)}
                                className={`
                                    h-7 px-3 rounded-lg flex items-center gap-2 justify-center transition-all shadow-sm active:scale-95 shrink-0
                                    ${status === 'Em Produção' 
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-300' 
                                        : 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300'}
                                `} 
                                title={status === 'Em Produção' ? "Finalizar" : "Iniciar"}
                              >
                                  {status === 'Em Produção' 
                                    ? (<><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg><span className="text-[9px] font-black uppercase">FINALIZAR</span></>) 
                                    : (<><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeWidth="2"/></svg><span className="text-[9px] font-black uppercase">INICIAR</span></>)}
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const isColumnLocked = (step?: ProductionStep) => {
      if (!step) return false;
      if (!currentUser) return true;
      if (currentUser.role === 'Admin') return false;
      if (currentUser.departamento === 'Geral') return false;
      return currentUser.departamento !== step;
  };

  const renderCard = (item: Order, col: any, isLocked: boolean) => {
      return <OrderCard key={item.id} order={item} userId={col.id} col={col} />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
      
      {/* TOOLBAR - REDESIGNED WITH ICONS */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-col gap-3 shrink-0 z-20 shadow-md">
          
          {/* Row 1: Title + Search */}
          <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 pr-4">
                  <div>
                      <h2 className="text-sm font-black text-white uppercase tracking-tighter">Fluxo de Produção</h2>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Kanban</p>
                  </div>
              </div>

              {/* Search Expanded */}
              <div className="relative flex-1 max-w-2xl">
                  <input 
                      type="text" 
                      placeholder="Buscar O.R / Cliente / Vendedor..." 
                      className="w-full pl-10 pr-4 py-2 bg-slate-800 rounded-xl text-xs font-bold uppercase outline-none focus:ring-1 ring-emerald-500 text-white placeholder-slate-500 transition-all" 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                  />
                  <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
              </div>
          </div>

          {/* Row 2: View Modes + Actions (ICONS) */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar pb-1">
              {/* View Modes Group */}
              <div className="flex bg-slate-800 p-1 rounded-xl shrink-0 gap-1">
                  <button 
                      onClick={() => setViewMode('BOARD')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'BOARD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      title="Geral"
                  >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeWidth="2"/></svg>
                  </button>
                  <button 
                      onClick={() => setViewMode('MY_TASKS')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'MY_TASKS' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      title={`Minhas Tarefas (${myPendingCount})`}
                  >
                      <div className="relative">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {myPendingCount > 0 && <span className="absolute -top-2 -right-2 w-3.5 h-3.5 bg-red-500 rounded-full text-[7px] flex items-center justify-center font-black">{myPendingCount}</span>}
                      </div>
                  </button>
                  {canAccessTeamView && (
                      <button 
                          onClick={() => setViewMode('TEAM')}
                          className={`p-2 rounded-lg transition-all ${viewMode === 'TEAM' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                          title="Gestão de Equipe"
                      >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2.5"/></svg>
                      </button>
                  )}
              </div>

              {/* SECTOR FILTERS (ICONS ONLY) - Visible only in Team Mode for Admins/General */}
              {viewMode === 'TEAM' && (currentUser?.role === 'Admin' || currentUser?.departamento === 'Geral') && (
                  <>
                      <div className="w-px h-6 bg-slate-700 hidden sm:block mx-1"></div>
                      <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl shrink-0">
                          {['ALL', 'preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'].map(sector => (
                              <button 
                                  key={sector}
                                  onClick={() => setSelectedTeamSector(sector as ProductionStep | 'ALL')}
                                  className={`p-2 rounded-lg transition-all ${selectedTeamSector === sector ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                  title={sector === 'ALL' ? 'Todos os Setores' : DEPARTMENTS[sector as ProductionStep]}
                              >
                                  {SECTOR_ICONS[sector]}
                              </button>
                          ))}
                          {/* User Search in Team Mode */}
                          <div className="w-px h-4 bg-slate-700 mx-1"></div>
                          <input 
                              type="text" 
                              placeholder="Filtrar Usuário" 
                              className="bg-transparent border-none text-[9px] font-bold text-white placeholder-slate-500 w-24 outline-none focus:ring-0"
                              value={teamMemberFilter}
                              onChange={e => setTeamMemberFilter(e.target.value)}
                          />
                      </div>
                  </>
              )}

              <div className="w-px h-6 bg-slate-700 hidden sm:block mx-1"></div>

              {/* Action Buttons & Scroll Controls */}
              <div className="flex gap-1 ml-auto items-center">
                  <div className="flex gap-1 mr-2">
                      <button onClick={() => scrollBoard('left')} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all" title="Rolar Esquerda"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5"/></svg></button>
                      <button onClick={() => scrollBoard('right')} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all" title="Rolar Direita"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2.5"/></svg></button>
                  </div>

                  <button onClick={expandAllColumns} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all hidden md:block" title="Expandir Colunas"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth="2"/></svg></button>
                  <button onClick={collapseAllColumns} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all hidden md:block" title="Recolher Colunas"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" strokeWidth="2.5"/></svg></button>
              </div>
          </div>
      </div>

      {/* Main Board */}
      <div ref={boardRef} className="flex-1 flex overflow-x-auto overflow-y-hidden px-0 pt-0 md:px-4 md:pt-4 pb-0 gap-3 md:gap-4 custom-scrollbar items-stretch bg-slate-50/50 dark:bg-slate-900/50 scroll-smooth">
          
          {activeColumns.map(col => {
              // Sticky Logic for Backlog Column
              const isBacklog = col.id === 'backlog';
              
              // Conditional styles for Backlog Column to make it stand out
              let columnStyle = {};
              if (isBacklog) {
                  columnStyle = {
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      boxShadow: '4px 0 15px -5px rgba(0,0,0,0.1)'
                  };
              }

              return (
                  <div key={col.id} style={columnStyle} className={isBacklog ? "h-full flex-shrink-0" : "h-full flex-shrink-0"}>
                      <KanbanColumn
                          col={col}
                          groups={groupedData[col.id]}
                          isLocked={isColumnLocked(col.step)}
                          isMySector={activeSector === col.step}
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
                  </div>
              );
          })}
      </div>

      {/* Assignment Modal */}
      {assignmentModal.isOpen && assignmentModal.step && (
          <AssignmentModal
              isOpen={assignmentModal.isOpen}
              onClose={() => setAssignmentModal({ isOpen: false, orderId: null, step: null })}
              users={users}
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