
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Order, CompanySettings, DEPARTMENTS, ProductionStep, Status, User, TaskAssignment, NetworkPath } from '../types';
import { generateTechnicalSheetHtml } from '../utils/printHelpers';
import Logo from './Logo';

interface TechnicalSheetModalProps {
  order: Order;
  allOrders?: Order[]; 
  companySettings: CompanySettings;
  onClose: () => void;
  onEdit: () => void;
  onUpdateStatus: (id: string, field: ProductionStep, next: Status) => void;
  onShowQR: (order: Order) => void;
  currentUser: User | null;
  onSavePaths?: (orderId: string, paths: NetworkPath[]) => void; // Atualizado tipo
}

const TechnicalSheetModal: React.FC<TechnicalSheetModalProps> = ({ 
  order, 
  allOrders, 
  companySettings, 
  onClose, 
  onEdit, 
  onUpdateStatus, 
  onShowQR,
  currentUser,
  onSavePaths
}) => {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [searchRef, setSearchRef] = useState('');
  
  // Caminhos de Rede State
  const [paths, setPaths] = useState<NetworkPath[]>([]);
  const [isEditingPaths, setIsEditingPaths] = useState(false);

  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const siblingItems = useMemo(() => {
      if (!allOrders) return [order];
      return allOrders
        .filter(o => o.or === order.or)
        .sort((a, b) => {
            const refA = a.numeroItem || '';
            const refB = b.numeroItem || '';
            return refA.localeCompare(refB, undefined, { numeric: true, sensitivity: 'base' });
        });
  }, [order, allOrders]);

  const currentItem = siblingItems[activeItemIndex];

  // Sincronizar paths locais com o item atual
  useEffect(() => {
      if (currentItem) {
          // Prioriza o array novo filePaths, fallback para o antigo filePath se existir
          let initialPaths: NetworkPath[] = [];
          if (currentItem.filePaths && currentItem.filePaths.length > 0) {
              initialPaths = currentItem.filePaths;
          } else if (currentItem.filePath) {
              initialPaths = [{ path: currentItem.filePath, name: 'Principal' }];
          }
          setPaths(initialPaths);
      }
  }, [currentItem]);

  // Efeito para buscar item por referência
  useMemo(() => {
      if (searchRef) {
          const index = siblingItems.findIndex(item => 
              item.numeroItem?.toLowerCase().includes(searchRef.toLowerCase()) || 
              item.item.toLowerCase().includes(searchRef.toLowerCase())
          );
          if (index !== -1) setActiveItemIndex(index);
      }
  }, [searchRef, siblingItems]);

  // Funções de navegação
  const goNext = () => setActiveItemIndex((prev) => Math.min(prev + 1, siblingItems.length - 1));
  const goPrev = () => setActiveItemIndex((prev) => Math.max(prev - 1, 0));

  // Touch Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) goNext();
    if (isRightSwipe) goPrev();
  };

  const handleStepClick = (orderId: string, step: ProductionStep, currentStatus: Status) => {
    if (!currentUser) return;
    const isOwner = currentUser.role === 'Admin' || currentUser.departamento === 'Geral' || currentUser.departamento === step;
    
    if (!isOwner) {
      alert(`ACESSO RESTRITO AO SETOR ${DEPARTMENTS[step] || step}`);
      return;
    }
    
    let next: Status;
    if (currentStatus === 'Em Produção') next = 'Concluído';
    else if (currentStatus === 'Concluído') next = 'Pendente';
    else next = 'Em Produção';
    
    onUpdateStatus(orderId, step, next);
  };

  const getLastStepUpdate = (item: Order, step: ProductionStep) => {
    if (!item.history || item.history.length === 0) return null;
    const stepHistory = item.history
        .filter(h => h.sector === step)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return stepHistory.length > 0 ? stepHistory[0] : null;
  };

  const handlePrint = () => {
    const htmlContent = generateTechnicalSheetHtml(order, allOrders || [order], companySettings);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
      printWindow.document.close();
    }
  };

  const handleDownloadAttachment = (dataUrl: string, name: string) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleCopySummary = (item: Order) => {
    const summary = `📋 O.R #${item.or}\nCLIENTE: ${item.cliente}\nITEM: ${item.item}\nQTD: ${item.quantidade || '1'}\nENTREGA: ${item.dataEntrega.split('-').reverse().join('/')}`;
    navigator.clipboard.writeText(summary);
    alert('Resumo copiado!');
  };

  // --- LOGICA DE CAMINHOS DE REDE ---
  const canEditPaths = currentUser?.role === 'Admin' || currentUser?.departamento === 'Geral' || currentUser?.departamento === 'preImpressao';

  const handleAddPath = () => {
      setPaths([...paths, { name: '', path: '' }]);
      setIsEditingPaths(true);
  };

  const handlePathChange = (index: number, field: keyof NetworkPath, value: string) => {
      const newPaths = [...paths];
      newPaths[index] = { ...newPaths[index], [field]: value };
      setPaths(newPaths);
  };

  const handleRemovePath = (index: number) => {
      const newPaths = paths.filter((_, i) => i !== index);
      setPaths(newPaths);
      setIsEditingPaths(true); // Marca como editado para habilitar salvar
  };

  const handleSavePathsClick = () => {
      // Remove vazios
      const cleanPaths = paths.filter(p => p.path.trim() !== '');
      setPaths(cleanPaths);
      if (onSavePaths && currentItem) {
          onSavePaths(currentItem.id, cleanPaths);
      }
      setIsEditingPaths(false);
  };

  const handleCopyPath = (path: string) => {
      navigator.clipboard.writeText(path);
      alert('Caminho copiado!');
  };

  // --- NOVO COMPONENTE DE FLUXO VISUAL (Mini Kanban) ---
  const WorkflowVisualizer = ({ item }: { item: Order }) => {
      const steps: { key: ProductionStep; label: string }[] = [
          { key: 'preImpressao', label: 'Design' },
          { key: 'impressao', label: 'Impressão' },
          { key: 'producao', label: 'Acabamento' },
          { key: 'instalacao', label: 'Instalação' },
          { key: 'expedicao', label: 'Expedição' },
      ];

      return (
          <div className="flex items-center w-full justify-between relative px-2 mb-4">
              {/* Linha de Conexão */}
              <div className="absolute top-2.5 left-4 right-4 h-0.5 bg-slate-200 dark:bg-slate-700 z-0"></div>
              
              {steps.map((s, index) => {
                  const status = item[s.key];
                  const isDone = status === 'Concluído';
                  const isProgress = status === 'Em Produção';
                  const isPending = status === 'Pendente';
                  
                  return (
                      <div key={s.key} className="flex flex-col items-center z-10 relative">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all bg-white dark:bg-slate-900
                              ${isDone ? 'border-emerald-500 text-emerald-500' : 
                                isProgress ? 'border-amber-500 text-amber-500 scale-110 shadow-lg shadow-amber-500/30' : 
                                'border-slate-300 dark:border-slate-600 text-slate-300 dark:text-slate-600'}
                          `}>
                              {isDone ? (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>
                              ) : (
                                  <div className={`w-1.5 h-1.5 rounded-full ${isProgress ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                              )}
                          </div>
                          <span className={`text-[7px] font-black uppercase mt-1 ${isProgress ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                              {s.label}
                          </span>
                      </div>
                  )
              })}
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[800] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-2 md:p-4 animate-in fade-in duration-300">
      <div className="bg-[#f8fafc] dark:bg-slate-900 w-full h-full md:w-[98vw] md:max-w-7xl md:max-h-[95vh] md:rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative border border-slate-200 dark:border-slate-800">
        
        {/* Header Visual Compacto */}
        <div className="bg-[#064e3b] dark:bg-emerald-950 px-4 py-3 md:px-6 md:py-3 relative shrink-0 shadow-md z-10 flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 bg-white/10 rounded-xl flex items-center justify-center text-emerald-400 backdrop-blur-sm p-1">
                 <Logo src={companySettings.logoUrl} className="w-full h-full" />
              </div>
              <div>
                 <h2 className="text-white font-black uppercase text-xs md:text-sm tracking-widest leading-none">Ficha Técnica</h2>
                 <p className="text-emerald-400/60 text-[8px] md:text-[9px] font-bold uppercase tracking-[2px] mt-0.5">O.R #{order.or}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
               <div className="hidden md:flex flex-col items-end mr-4 border-r border-white/10 pr-4">
                   <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Cliente</span>
                   <span className="text-sm font-bold text-white uppercase truncate max-w-[200px]">{order.cliente}</span>
               </div>
               <button onClick={onClose} className="p-2 bg-black/20 text-white hover:bg-red-500/80 rounded-full transition-all backdrop-blur-sm active:scale-95">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
               </button>
           </div>
        </div>

        {/* Info Geral Sticky (Seletor de Item) */}
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 px-4 pt-2 pb-2 border-b border-slate-200 dark:border-slate-800 relative transition-all shrink-0">
             {siblingItems.length > 1 && (
                 <div className="flex items-center justify-between gap-4 mb-2">
                     <span className="text-[9px] font-black text-slate-400 uppercase">Selecione o Item ({siblingItems.length})</span>
                     <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 max-w-[150px]">
                        <input 
                            type="text" 
                            placeholder="Buscar Ref..." 
                            value={searchRef}
                            onChange={(e) => setSearchRef(e.target.value)}
                            className="w-full bg-transparent text-[9px] font-bold uppercase outline-none dark:text-white placeholder:text-slate-400"
                        />
                     </div>
                 </div>
             )}

             {/* Tab Navigation for Items */}
             <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                 {siblingItems.map((_, idx) => (
                     <button
                        key={idx}
                        onClick={() => setActiveItemIndex(idx)}
                        className={`
                            whitespace-nowrap px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border
                            ${idx === activeItemIndex 
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' 
                                : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}
                        `}
                     >
                        Item #{idx + 1}
                     </button>
                 ))}
             </div>
        </div>

        {/* Content Scrollable - Active Item Only */}
        <div 
            className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 bg-slate-100 dark:bg-slate-950 pb-20 relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
           {/* Navigation Arrows Mobile */}
           <div className="absolute inset-y-0 left-0 flex items-center z-20 pointer-events-none px-2 md:hidden">
               {activeItemIndex > 0 && (
                   <button onClick={goPrev} className="pointer-events-auto p-3 bg-white/80 dark:bg-slate-800/80 shadow-lg rounded-full backdrop-blur-sm text-slate-500 dark:text-slate-300 hover:scale-110 transition-all border border-slate-200 dark:border-slate-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg></button>
               )}
           </div>
           <div className="absolute inset-y-0 right-0 flex items-center z-20 pointer-events-none px-2 md:hidden">
               {activeItemIndex < siblingItems.length - 1 && (
                   <button onClick={goNext} className="pointer-events-auto p-3 bg-white/80 dark:bg-slate-800/80 shadow-lg rounded-full backdrop-blur-sm text-slate-500 dark:text-slate-300 hover:scale-110 transition-all border border-slate-200 dark:border-slate-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg></button>
               )}
           </div>

           <div className="w-full">
              {currentItem && (
                  <div className="flex flex-col lg:flex-row gap-4 h-full">
                      
                      {/* COLUNA PRINCIPAL: FICHA COMPLETA */}
                      <div className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          
                          {/* WORKFLOW VISUALIZER */}
                          <div className="mb-6">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fluxo</span>
                              <WorkflowVisualizer item={currentItem} />
                          </div>

                          {/* Grid Compacto de Informações */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              {/* BLOCO 1: IDENTIFICAÇÃO */}
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="text-[8px] font-black text-slate-400 uppercase">O.R / Entrega</span>
                                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                                          {currentItem.dataEntrega.split('-').reverse().join('/')}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">#{currentItem.or}</span>
                                      {currentItem.numeroItem && <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 text-[9px] font-bold rounded">REF: {currentItem.numeroItem}</span>}
                                  </div>
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase leading-snug line-clamp-3">
                                      {currentItem.item}
                                  </p>
                              </div>

                              {/* BLOCO 2: DETALHES TÉCNICOS */}
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3">
                                  <div>
                                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Quantidade</span>
                                      <span className="text-sm font-black text-slate-900 dark:text-white">{currentItem.quantidade || '1'} UN</span>
                                  </div>
                                  <div>
                                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Vendedor</span>
                                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate block">{currentItem.vendedor.split(' ')[0]}</span>
                                  </div>
                                  <div>
                                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Cliente</span>
                                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate block">{currentItem.cliente}</span>
                                  </div>
                                  <div>
                                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Abertura</span>
                                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">{currentItem.createdAt ? new Date(currentItem.createdAt).toLocaleDateString('pt-BR') : '-'}</span>
                                  </div>
                              </div>
                          </div>

                          {/* CAMINHOS DE REDE (MULTIPLOS E EDITÁVEIS COM NOME) */}
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>
                                      Caminhos de Rede ({paths.length})
                                  </span>
                                  <div className="flex gap-2">
                                      {canEditPaths && (
                                          <button onClick={handleAddPath} className="text-[8px] font-bold bg-white dark:bg-blue-800 text-blue-600 dark:text-white px-2 py-1 rounded shadow-sm hover:bg-blue-100">+ Add</button>
                                      )}
                                      {canEditPaths && (isEditingPaths || paths.length !== (currentItem.filePaths?.length || 0)) && (
                                          <button onClick={handleSavePathsClick} className="text-[8px] font-bold bg-blue-600 text-white px-2 py-1 rounded shadow-sm hover:bg-blue-700">Salvar</button>
                                      )}
                                  </div>
                              </div>
                              
                              <div className="space-y-2">
                                  {paths.length === 0 && <p className="text-[9px] text-blue-400 italic">Nenhum caminho especificado.</p>}
                                  {paths.map((pObj, idx) => (
                                      <div key={idx} className="flex flex-col gap-1 md:flex-row md:items-center">
                                          {canEditPaths ? (
                                              <div className="flex-1 flex gap-2">
                                                  <input 
                                                      type="text" 
                                                      value={pObj.name} 
                                                      onChange={(e) => { handlePathChange(idx, 'name', e.target.value); setIsEditingPaths(true); }}
                                                      className="w-1/3 bg-white dark:bg-slate-900 px-2 py-1.5 rounded border border-blue-200 dark:border-blue-800 text-[10px] font-bold uppercase text-blue-800 dark:text-blue-300 outline-none focus:ring-1 ring-blue-500"
                                                      placeholder="Nome (Ex: Final)"
                                                  />
                                                  <input 
                                                      type="text" 
                                                      value={pObj.path} 
                                                      onChange={(e) => { handlePathChange(idx, 'path', e.target.value); setIsEditingPaths(true); }}
                                                      className="flex-1 bg-white dark:bg-slate-900 px-2 py-1.5 rounded border border-blue-200 dark:border-blue-800 text-[10px] font-mono text-blue-800 dark:text-blue-300 outline-none focus:ring-1 ring-blue-500"
                                                      placeholder="Cole o caminho..."
                                                  />
                                              </div>
                                          ) : (
                                              <div className="flex-1 flex gap-2">
                                                  <div className="w-1/3 bg-white dark:bg-slate-900 px-2 py-1.5 rounded border border-blue-200 dark:border-blue-800">
                                                      <p className="font-bold text-[10px] text-blue-800 dark:text-blue-300 truncate">{pObj.name || 'Caminho'}</p>
                                                  </div>
                                                  <div className="flex-1 bg-white dark:bg-slate-900 px-2 py-1.5 rounded border border-blue-200 dark:border-blue-800">
                                                      <p className="font-mono text-[10px] font-bold text-blue-800 dark:text-blue-300 truncate">{pObj.path}</p>
                                                  </div>
                                              </div>
                                          )}
                                          
                                          <div className="flex gap-1 justify-end">
                                              <button onClick={() => handleCopyPath(pObj.path)} className="p-1.5 bg-white dark:bg-blue-800 rounded hover:text-blue-600 transition-colors shadow-sm" title="Copiar">
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="2"/></svg>
                                              </button>
                                              
                                              {canEditPaths && (
                                                  <button onClick={() => handleRemovePath(idx)} className="p-1.5 bg-white dark:bg-red-900/30 text-red-400 hover:text-red-600 rounded shadow-sm">
                                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2"/></svg>
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* Notas e Observações (Lado a Lado) */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                                  <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase block mb-1">Observações da O.R</span>
                                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 italic min-h-[30px] leading-snug">{currentItem.observacao || 'Sem observações.'}</p>
                              </div>
                              <div className="p-3 bg-slate-100 dark:bg-slate-700/20 border border-slate-200 dark:border-slate-700 rounded-xl">
                                  <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase block mb-1">Notas de Produção</span>
                                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 italic min-h-[30px] leading-snug">
                                      {Object.values(currentItem.assignments || {}).map((a) => (a as TaskAssignment)?.note).filter(Boolean).join(' • ') || 'Nenhuma nota específica.'}
                                  </p>
                              </div>
                          </div>
                      </div>

                      {/* COLUNA LATERAL: STATUS E AÇÕES */}
                      <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-3">
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex-1">
                              <span className="text-[9px] text-slate-400 font-black uppercase block mb-3 text-center tracking-widest">Painel de Controle</span>
                              <div className="space-y-2">
                                  {['preImpressao', 'impressao', 'producao', 'instalacao', 'expedicao'].map(step => {
                                      const prodStep = step as ProductionStep;
                                      const status = currentItem[prodStep];
                                      const isDone = status === 'Concluído';
                                      const isProgress = status === 'Em Produção';
                                      const lastUpdate = getLastStepUpdate(currentItem, prodStep);
                                      
                                      return (
                                          <div key={step} className="flex flex-col bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                              <button 
                                                  onClick={() => handleStepClick(currentItem.id, prodStep, status)}
                                                  className={`
                                                      px-3 py-2 rounded-lg flex items-center justify-between transition-all active:scale-95
                                                      ${isDone ? 'bg-emerald-50 text-emerald-700' : 
                                                        isProgress ? 'bg-amber-50 text-amber-700' : 
                                                        'bg-transparent text-slate-400 dark:text-slate-500'}
                                                  `}
                                              >
                                                  <span className="text-[9px] font-black uppercase">{DEPARTMENTS[prodStep].split(' ')[0]}</span>
                                                  <div className={`w-2.5 h-2.5 rounded-full ${isDone ? 'bg-emerald-500' : isProgress ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-600'}`}></div>
                                              </button>
                                              {lastUpdate && (
                                                  <div className="text-[7px] text-slate-400 font-bold text-right px-3 pb-1 uppercase truncate border-t border-slate-50 dark:border-slate-700 mt-1 pt-0.5">
                                                      {lastUpdate.userName.split(' ')[0]} • {new Date(lastUpdate.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                  </div>
                                              )}
                                          </div>
                                      )
                                  })}
                              </div>
                          </div>

                          {/* Seção de Anexos Compacta */}
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Arquivos ({currentItem.attachments?.length || 0})</span>
                              <div className="space-y-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                                  {currentItem.attachments && currentItem.attachments.length > 0 ? currentItem.attachments.map(att => (
                                      <button 
                                          key={att.id}
                                          onClick={() => handleDownloadAttachment(att.dataUrl, att.name)}
                                          className="flex items-center gap-2 w-full p-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left"
                                      >
                                          <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeWidth="2"/></svg>
                                          <span className="text-[9px] font-bold uppercase truncate">{att.name}</span>
                                      </button>
                                  )) : (
                                      <p className="text-[8px] text-slate-300 italic text-center py-2">Sem anexos</p>
                                  )}
                              </div>
                          </div>

                          {/* Ações Rápidas Grid */}
                          <div className="grid grid-cols-2 gap-2 shrink-0">
                              <button onClick={() => onEdit()} className="py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all flex flex-col items-center justify-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2"/></svg>
                                  Editar
                              </button>
                              <button onClick={() => onShowQR(currentItem)} className="py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 shadow-sm transition-all flex flex-col items-center justify-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 8v4h4V8H6zm14 10.5c0 .276-.224.5-.5.5h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v3z" strokeWidth="2"/></svg>
                                  QR Code
                              </button>
                              <button onClick={() => handleCopySummary(currentItem)} className="py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm transition-all flex flex-col items-center justify-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="2"/></svg>
                                  Copiar
                              </button>
                              <button onClick={handlePrint} className="py-2.5 bg-slate-100 dark:bg-slate-700 border border-transparent rounded-xl text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 shadow-sm transition-all flex flex-col items-center justify-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" strokeWidth="2"/></svg>
                                  Imprimir
                              </button>
                          </div>
                      </div>
                  </div>
              )}
           </div>
        </div>

        {/* Footer Actions Fixed Bottom */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-end">
           <button 
              onClick={() => { onClose(); onEdit(); }}
              className="w-full md:w-auto px-8 py-3 bg-[#064e3b] dark:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-900 transition-all active:scale-95 flex items-center justify-center gap-2"
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2.5"/></svg>
              Editar O.R Completa
           </button>
        </div>

      </div>
    </div>
  );
};

export default TechnicalSheetModal;
