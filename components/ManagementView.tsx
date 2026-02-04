
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Order, User, ProductionStep, DEPARTMENTS } from '../types';

interface ManagementViewProps {
  orders: Order[];
  users: User[];
  currentUser: User;
  onAssignUser: (orderId: string, step: ProductionStep) => void;
  onEditOrder: (order: Order) => void;
  onShowQR: (order: Order) => void;
  onShowAttachment: (order: Order) => void;
  onShowTechSheet?: (order: Order) => void;
}

// --- SUB-COMPONENT: Scroll Button ---
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

const ManagementView: React.FC<ManagementViewProps> = ({ 
    orders, 
    users, 
    currentUser, 
    onAssignUser,
    onEditOrder,
    onShowQR,
    onShowAttachment,
    onShowTechSheet
}) => {
  const [now, setNow] = useState(new Date());
  
  // Filtro de Visualização de Setor (Columns Filter)
  const [viewSectorFilter, setViewSectorFilter] = useState<ProductionStep | 'ALL'>('ALL');
  
  // Filtros e Estados de Visualização
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'Alta' | 'Média' | 'Baixa'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controles de Expansão/Colapso
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [expandedOrGroups, setExpandedOrGroups] = useState<Record<string, boolean>>({});
  const [minimizedItems, setMinimizedItems] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = currentUser.role === 'Admin' || currentUser.departamento === 'Geral';

  // --- ACTIONS ---
  const toggleColumn = (colId: string) => setCollapsedColumns(prev => ({ ...prev, [colId]: !prev[colId] }));
  const toggleOrGroup = (or: string) => setExpandedOrGroups(prev => ({ ...prev, [or]: !prev[or] }));
  
  const toggleMinimize = (itemId: string, e: React.MouseEvent) => {
      if (window.getSelection()?.toString()) return;
      setMinimizedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const toggleDetails = (itemId: string) => setExpandedDetails(prev => ({ ...prev, [itemId]: !prev[itemId] }));

  // 1. Filtrar Usuários (Colunas)
  const teamMembers = useMemo(() => {
      return users.filter(u => {
          if (u.id === currentUser.id) return false;

          // Filtro de Busca
          if (searchTerm) {
              const term = searchTerm.toLowerCase();
              const matchName = u.nome.toLowerCase().includes(term);
              const matchRole = u.cargo?.toLowerCase().includes(term);
              const matchDept = u.departamento && DEPARTMENTS[u.departamento as keyof typeof DEPARTMENTS]?.toLowerCase().includes(term);
              
              if (!matchName && !matchRole && !matchDept) return false;
          }

          // Filtro de Setor
          if (viewSectorFilter !== 'ALL') {
              const isUserInSector = u.departamento === viewSectorFilter;
              const isGeneralOrAdmin = u.departamento === 'Geral' || u.role === 'Admin';
              if (!isUserInSector && !isGeneralOrAdmin) return false;
          }

          return true;
      }).sort((a, b) => {
          if (a.role === 'Admin' && b.role !== 'Admin') return -1;
          if (b.role === 'Admin' && a.role !== 'Admin') return 1;
          return a.nome.localeCompare(b.nome);
      });
  }, [users, currentUser, searchTerm, viewSectorFilter]);

  // 2. Filtrar Ordens
  const relevantOrders = useMemo(() => {
      return orders.filter(o => {
          if (o.isArchived) return false;
          if (priorityFilter !== 'ALL' && o.prioridade !== priorityFilter) return false;
          return true;
      });
  }, [orders, priorityFilter]);

  // 3. Distribuir Ordens nas Colunas
  const kanbanData = useMemo(() => {
      const data: Record<string, { or: string, client: string, items: Order[] }[]> = {};
      
      data['unassigned'] = [];
      teamMembers.forEach(u => data[u.id] = []);

      const tempGrouping: Record<string, Record<string, Order[]>> = {};
      tempGrouping['unassigned'] = {};
      teamMembers.forEach(u => tempGrouping[u.id] = {});

      relevantOrders.forEach(o => {
          const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
          let assignedToSomeoneInView = false;

          steps.forEach(step => {
              const assignment = o.assignments?.[step];
              if (viewSectorFilter !== 'ALL' && step !== viewSectorFilter) return;

              if (assignment && assignment.userId) {
                  if (data[assignment.userId]) {
                      if (!tempGrouping[assignment.userId][o.or]) tempGrouping[assignment.userId][o.or] = [];
                      if (!tempGrouping[assignment.userId][o.or].find(i => i.id === o.id)) {
                          tempGrouping[assignment.userId][o.or].push(o);
                      }
                      assignedToSomeoneInView = true;
                  }
              }
          });

          if (!assignedToSomeoneInView && viewSectorFilter !== 'ALL') {
             const assignment = o.assignments?.[viewSectorFilter];
             if (!assignment || !assignment.userId) {
                 if (o[viewSectorFilter] !== 'Concluído') {
                     if (!tempGrouping['unassigned'][o.or]) tempGrouping['unassigned'][o.or] = [];
                     tempGrouping['unassigned'][o.or].push(o);
                 }
             }
          }
      });

      const allKeys = ['unassigned', ...teamMembers.map(u => u.id)];
      allKeys.forEach(key => {
          if (!tempGrouping[key]) return;
          const groups = Object.keys(tempGrouping[key]).map(or => {
              const items = tempGrouping[key][or];
              items.sort((a,b) => (a.numeroItem || '').localeCompare(b.numeroItem || ''));
              return { or, client: items[0].cliente, items };
          });

          groups.sort((a, b) => {
              const itemA = a.items[0];
              const itemB = b.items[0];
              if (itemA.prioridade === 'Alta' && itemB.prioridade !== 'Alta') return -1;
              if (itemA.prioridade !== 'Alta' && itemB.prioridade === 'Alta') return 1;
              return itemA.dataEntrega.localeCompare(itemB.dataEntrega);
          });

          data[key] = groups;
      });

      return data;
  }, [relevantOrders, teamMembers, viewSectorFilter]);

  // Global Actions (Updated to avoid iteration errors)
  const expandAllGroups = () => {
      const allOrs = new Set<string>();
      const allDataValues = Object.values(kanbanData) as { or: string, client: string, items: Order[] }[][];
      allDataValues.forEach(groups => {
          if (Array.isArray(groups)) {
              groups.forEach(g => allOrs.add(g.or));
          }
      });
      const newState = Array.from(allOrs).reduce((acc, or) => ({ ...acc, [or]: true }), {});
      setExpandedOrGroups(newState);
  };
  
  const collapseAllGroups = () => setExpandedOrGroups({}); 
  const expandAllColumns = () => setCollapsedColumns({});
  const collapseAllColumns = () => {
      const allColIds = ['unassigned', ...teamMembers.map(u => u.id)];
      const newState = allColIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
      setCollapsedColumns(newState);
  };
  const expandAllCards = () => setMinimizedItems({});
  const collapseAllCards = () => {
      const allIds = orders.map(o => o.id);
      const newState = allIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
      setMinimizedItems(newState);
  };

  const scrollBoardLeft = () => boardRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  const scrollBoardRight = () => boardRef.current?.scrollBy({ left: 320, behavior: 'smooth' });

  // Helpers
  const getDuration = (startStr?: string) => {
      if (!startStr) return '-';
      const start = new Date(startStr);
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
  };

  const getDateColorClass = (dateStr: string, isArchived: boolean) => {
      if (isArchived) return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500';
      const today = new Date().toLocaleDateString('en-CA');
      if (dateStr < today) return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 font-black';
      if (dateStr === today) return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 font-black';
      return 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 font-bold';
  };

  // --- CARD COMPONENT ---
  const OrderCard: React.FC<{ order: Order, userId: string }> = ({ order, userId }) => {
      const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
      let relevantStep: ProductionStep | undefined;
      
      if (userId === 'unassigned') {
          relevantStep = viewSectorFilter !== 'ALL' ? viewSectorFilter : undefined;
      } else {
          relevantStep = steps.find(s => order.assignments?.[s]?.userId === userId);
      }

      const assignment = relevantStep ? order.assignments?.[relevantStep] : null;
      const status = relevantStep ? order[relevantStep] : 'Pendente';
      const isInProgress = status === 'Em Produção';
      
      const isMinimized = minimizedItems[order.id];
      const isExpanded = expandedDetails[order.id];
      const attachmentsCount = order.attachments?.length || 0;

      let priorityBorderClass = 'border-l-slate-300';
      if (order.prioridade === 'Alta') priorityBorderClass = 'border-l-red-500';
      else if (order.prioridade === 'Média') priorityBorderClass = 'border-l-blue-400';

      if (isMinimized) {
          return (
              <div 
                  onClick={(e) => toggleMinimize(order.id, e)}
                  className={`bg-white dark:bg-slate-900 rounded-r-lg mb-2 shadow-sm border-l-[4px] relative group/item transition-all flex flex-col shrink-0 cursor-pointer hover:shadow-md ${priorityBorderClass} ${isInProgress ? 'bg-amber-50/30 dark:bg-amber-900/10' : 'border-y border-r border-slate-200 dark:border-slate-700'}`}
              >
                  <div className="p-2.5 flex flex-col gap-1.5 relative">
                      {isInProgress && assignment?.startedAt && (
                          <div className="absolute top-1 right-7 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm flex items-center gap-0.5 z-10 animate-pulse">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>
                              {getDuration(assignment.startedAt)}
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
              onClick={(e) => toggleMinimize(order.id, e)}
              className={`bg-white dark:bg-slate-900 rounded-r-lg mb-2 shadow-sm border-l-[4px] relative group/item transition-all flex flex-col shrink-0 cursor-pointer hover:shadow-md ${priorityBorderClass} ${isInProgress ? 'bg-amber-50/30 dark:bg-amber-900/10' : 'border-y border-r border-slate-200 dark:border-slate-700'}`}
          >
              <div className="flex flex-col p-2.5 flex-1 relative">
                  {isInProgress && assignment?.startedAt && (
                      <div className="absolute top-2 right-8 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm animate-pulse flex items-center gap-1 z-10">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>
                          {getDuration(assignment.startedAt)}
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
                            <button onClick={(e) => { e.stopPropagation(); onAssignUser(order.id, relevantStep!); }} className="flex items-center gap-1 text-[8px] font-bold text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1.5 rounded-lg transition-colors border border-dashed border-slate-300 dark:border-slate-700 w-full justify-center group">
                                <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeWidth="2"/></svg>
                                {relevantStep ? `DESIGNAR ${DEPARTMENTS[relevantStep].split(' ')[0]}` : 'DESIGNAR'}
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
                          {relevantStep && (
                              <button onClick={(e) => { e.stopPropagation(); onAssignUser(order.id, relevantStep!); }} className="h-6 px-3 rounded-lg flex items-center gap-1 justify-center transition-all shadow-sm active:scale-95 shrink-0 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" title={userId !== 'unassigned' ? "Reatribuir" : "Atribuir"}>
                                  {userId !== 'unassigned' ? (<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg>) : (<span className="text-[8px] font-black uppercase">ATRIBUIR</span>)}
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  // --- COLUMN LAYOUT ---
  const TeamColumn: React.FC<{ id: string; label: string; avatar: React.ReactNode; count: number; isActive: boolean; groups: { or: string; client: string; items: Order[] }[] }> = ({ id, label, avatar, count, isActive, groups }) => {
      const isCollapsed = collapsedColumns[id];
      const columnRef = useRef<HTMLDivElement>(null);

      if (isCollapsed) {
          return (
              <div className="w-14 min-w-[3.5rem] flex-shrink-0 flex flex-col h-full items-center bg-slate-100/50 dark:bg-slate-800/30 border-x border-t border-b-0 border-slate-200 dark:border-slate-800 md:rounded-t-2xl py-4 gap-4 transition-all">
                  <button onClick={() => toggleColumn(id)} className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-500 hover:text-emerald-500 transition-colors group">
                      <svg className="w-4 h-4 rotate-90 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {avatar}
                  <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-[3px] truncate max-h-[300px]">{label}</div>
                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-black mt-auto">{count}</span>
                  {isActive && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>}
              </div>
          );
      }

      return (
          <div className={`w-[340px] flex-shrink-0 flex flex-col h-full md:rounded-t-2xl border-x border-t border-b-0 transition-all duration-300 relative ${isActive ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'}`}>
              <div className={`p-3 border-b border-inherit flex justify-between items-center md:rounded-t-2xl ${isActive ? 'bg-emerald-100/50 dark:bg-emerald-900/30' : ''}`}>
                  <div className="flex items-center gap-3">
                      {avatar}
                      <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[150px]">{label}</h3>
                          <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                              <span className={`text-[8px] font-black uppercase tracking-wide ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{isActive ? 'Ativo' : 'Disponível'}</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded text-[9px] font-black shadow-sm">{count}</span>
                      <button onClick={() => toggleColumn(id)} className="text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" strokeWidth="2.5"/></svg></button>
                  </div>
              </div>

              <div ref={columnRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2 pb-4 relative">
                  {groups.map(group => {
                      const isMulti = group.items.length > 1;
                      const isExpanded = expandedOrGroups[group.or];
                      const firstItem = group.items[0];
                      const activeItems = group.items.filter(i => {
                          const steps = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'] as ProductionStep[];
                          return steps.some(s => i.assignments?.[s]?.userId === id && i[s] === 'Em Produção');
                      });
                      const isGroupActive = activeItems.length > 0;
                      
                      let priorityBorderClass = 'border-l-slate-300';
                      if (firstItem.prioridade === 'Alta') priorityBorderClass = 'border-l-red-500';
                      else if (firstItem.prioridade === 'Média') priorityBorderClass = 'border-l-blue-400';

                      if (!isMulti) return <OrderCard key={firstItem.id} order={firstItem} userId={id} />;

                      return (
                          <div key={group.or} className="mb-2">
                              <div onClick={() => toggleOrGroup(group.or)} className={`bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 border-l-[4px] ${priorityBorderClass} cursor-pointer hover:shadow-md transition-all relative overflow-hidden group/stack ${isGroupActive ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                                  <div className="absolute top-0 right-0 p-1">
                                      <div className={`p-1 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-slate-100 dark:bg-slate-800' : 'bg-transparent'}`}><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                                  </div>
                                  <div className="p-3">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-[950] text-emerald-600 dark:text-emerald-400">#{group.or}</span>
                                          <div className="flex gap-1">
                                              <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">{group.items.length} ITENS</span>
                                              {isGroupActive && <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">EM USO</span>}
                                          </div>
                                      </div>
                                      <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate pr-4">{group.client}</p>
                                      {!isExpanded && (
                                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase">Clique para ver itens</span>
                                              <div className="flex -space-x-1">{group.items.slice(0,3).map((i, idx) => (<div key={idx} className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-800 flex items-center justify-center text-[6px] font-black text-slate-500">{idx+1}</div>))}{group.items.length > 3 && <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-800 flex items-center justify-center text-[6px] font-black text-slate-400">+</div>}</div>
                                          </div>
                                      )}
                                  </div>
                                  {!isExpanded && <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent opacity-50"></div>}
                              </div>
                              {isExpanded && (<div className="mt-2 pl-3 ml-2 border-l-2 border-slate-200 dark:border-slate-700 space-y-2 animate-in slide-in-from-left-2">{group.items.map(item => <OrderCard key={item.id} order={item} userId={id} />)}</div>)}
                          </div>
                      );
                  })}
                  {groups.length === 0 && <div className="py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 mt-4"><p className="text-[8px] text-slate-400 uppercase font-bold">Fila Vazia</p></div>}
                  <ScrollToTopButton containerRef={columnRef} />
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
      
      {/* HEADER & CONTROLS */}
      <div className="shrink-0 px-4 py-3 flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
             <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Gestão de Equipe</h2><p className="text-[9px] font-bold text-slate-400 uppercase tracking-[2px] mt-0.5">Distribuição de Carga</p></div>
          </div>
      </div>

      {/* TOOLBAR (MATCHING KANBAN VIEW DARK STYLE) */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-20 shadow-md">
          {/* Left: Search + Sector */}
          <div className="flex items-center gap-4 overflow-x-auto custom-scrollbar flex-1 w-full sm:w-auto">
              {/* Search */}
              <div className="relative min-w-[200px] w-full sm:w-auto">
                  <input 
                      type="text" 
                      placeholder="Buscar Colaborador..." 
                      className="w-full pl-9 pr-4 py-1.5 bg-slate-800 rounded-lg text-xs font-bold uppercase outline-none focus:ring-1 ring-emerald-500 text-white placeholder-slate-500" 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                  />
                  <svg className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
              </div>

              {/* Sector Filter Buttons (Next to search as requested) */}
              <div className="flex gap-1 bg-slate-800 p-0.5 rounded-lg">
                  <button 
                      onClick={() => setViewSectorFilter('ALL')}
                      className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all whitespace-nowrap ${viewSectorFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                      Todos
                  </button>
                  {Object.keys(DEPARTMENTS).map(deptKey => (
                      <button 
                          key={deptKey}
                          onClick={() => setViewSectorFilter(deptKey as ProductionStep)}
                          className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all whitespace-nowrap ${viewSectorFilter === deptKey ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                          title={DEPARTMENTS[deptKey as ProductionStep]}
                      >
                          {DEPARTMENTS[deptKey as ProductionStep].split(' ')[0]}
                      </button>
                  ))}
              </div>
          </div>

          <div className="w-px h-6 bg-slate-700 hidden sm:block mx-2"></div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg mr-2">
                  {(['ALL', 'Alta', 'Média', 'Baixa'] as const).map(p => (
                      <button key={p} onClick={() => setPriorityFilter(p)} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap transition-all ${priorityFilter === p ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>{p === 'ALL' ? 'Prior: Todas' : p}</button>
                  ))}
              </div>

              <div className="flex gap-1">
                  <button onClick={expandAllCards} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all text-[8px] font-black uppercase whitespace-nowrap">Exp. Cards</button>
                  <button onClick={collapseAllCards} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all text-[8px] font-black uppercase whitespace-nowrap">Rec. Cards</button>
              </div>
              <div className="flex gap-1">
                  <button onClick={expandAllGroups} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all text-[8px] font-black uppercase whitespace-nowrap">Exp. Grupos</button>
                  <button onClick={collapseAllGroups} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all text-[8px] font-black uppercase whitespace-nowrap">Rec. Grupos</button>
              </div>
          </div>
      </div>

      {/* Main Board */}
      <div ref={boardRef} className="flex-1 flex overflow-x-auto overflow-y-hidden px-0 pt-0 md:px-4 md:pt-4 pb-0 gap-3 md:gap-4 custom-scrollbar items-stretch bg-slate-50/50 dark:bg-slate-900/50 scroll-smooth">
          {/* Unassigned Column */}
          {(viewSectorFilter !== 'ALL') && (
             <TeamColumn 
                id="unassigned" 
                label={`Backlog ${DEPARTMENTS[viewSectorFilter]}`} 
                avatar={<div className="w-8 h-8 rounded-lg bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth="2"/></svg></div>}
                count={kanbanData['unassigned']?.flatMap(g => g.items).length || 0}
                isActive={false}
                groups={kanbanData['unassigned'] || []}
             />
          )}

          {/* User Columns */}
          {teamMembers.map(u => {
              const userGroups = kanbanData[u.id];
              const totalItems = userGroups.reduce((acc, g) => acc + g.items.length, 0);
              // Check if actively working on something in the filtered view
              const isBusy = userGroups.some(g => g.items.some(i => {
                  const steps: ProductionStep[] = ['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'];
                  // If filtering by sector, check only that sector. If ALL, check any.
                  if (viewSectorFilter !== 'ALL') return i.assignments?.[viewSectorFilter]?.userId === u.id && i[viewSectorFilter] === 'Em Produção';
                  return steps.some(s => i.assignments?.[s]?.userId === u.id && i[s] === 'Em Produção');
              }));

              return (
                  <TeamColumn 
                      key={u.id}
                      id={u.id}
                      label={u.nome}
                      avatar={<div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase text-white shadow-sm ${isBusy ? 'bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-800 animate-pulse' : 'bg-emerald-500'}`}>{u.nome.substring(0,2)}</div>}
                      count={totalItems}
                      isActive={isBusy}
                      groups={userGroups}
                  />
              );
          })}
          <ScrollToTopButton containerRef={boardRef} />
      </div>
    </div>
  );
};

export default ManagementView;
