
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Order, User, Attachment, DEPARTMENTS, CompanySettings } from '../types';

interface OrderModalProps {
  order?: Order;
  existingOrders?: Order[]; // Lista de ordens para verificar duplicidade
  onClose: () => void;
  onSave: (data: Partial<Order>[], idsToDelete?: string[]) => void;
  currentUser?: User | null;
  companySettings?: CompanySettings;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// Tipo interno para gerenciar os itens no estado do formulário
interface OrderItemForm extends Partial<Order> {
  tempId: string; // Identificador temporário para a UI
  hasDuplicateError?: boolean; // Controle local de erro
}

const OrderModal: React.FC<OrderModalProps> = ({ order, existingOrders, onClose, onSave, currentUser, companySettings, showToast }) => {
  // Estado para dados comuns a todos os itens
  const [commonData, setCommonData] = useState({
    or: order?.or || '',
    cliente: order?.cliente || '',
    vendedor: order?.vendedor || '',
    prioridade: order?.prioridade || 'Média',
    observacao: order?.observacao || ''
  });

  const [items, setItems] = useState<OrderItemForm[]>([]);
  // Use activeItemIndex as the primary way to view items (Pagination)
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  
  // Estado para o Modal de Confirmação de Exclusão de Item
  const [deleteCandidate, setDeleteCandidate] = useState<{ index: number; item: OrderItemForm } | null>(null);
  
  // Estado para o Modal de Confirmação de Exclusão de Anexo
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string; name: string } | null>(null);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const attachmentsContainerRef = useRef<HTMLDivElement>(null);

  // Inicialização: Carregar todos os itens da mesma O.R. se estiver editando
  useEffect(() => {
    if (order && existingOrders) {
        // Encontra todos os itens irmãos
        const siblings = existingOrders.filter(o => o.or === order.or);
        
        if (siblings.length > 0) {
            // Ordena por referência ou ID para manter consistência
            siblings.sort((a, b) => {
                const refA = a.numeroItem || '';
                const refB = b.numeroItem || '';
                return refA.localeCompare(refB, undefined, { numeric: true, sensitivity: 'base' });
            });

            setItems(siblings.map(s => ({
                ...s,
                tempId: s.id,
                quantidade: s.quantidade || '1',
                hasDuplicateError: false
            })));
            
            // Sincroniza o cabeçalho com os dados mais recentes encontrados (caso haja divergência)
            const master = siblings[0];
            setCommonData({
                or: master.or,
                cliente: master.cliente,
                vendedor: master.vendedor,
                prioridade: master.prioridade || 'Média',
                observacao: master.observacao || ''
            });
            
            // Find index of the clicked order to open that specific item
            const clickedIndex = siblings.findIndex(s => s.id === order.id);
            if(clickedIndex !== -1) setActiveItemIndex(clickedIndex);

        } else {
            // Fallback
            setItems([{ ...order, tempId: order.id, quantidade: order.quantidade || '1', hasDuplicateError: false }]);
        }
    } else {
        // Novo cadastro
        setItems([{ 
            tempId: Date.now().toString(), 
            numeroItem: '01', 
            quantidade: '1',
            item: '', 
            dataEntrega: new Date().toISOString().split('T')[0],
            attachments: [],
            isRemake: false,
            hasDuplicateError: false,
            filePath: ''
        }]);
    }
  }, [order]); 

  // Rastrear itens excluídos para remoção definitiva
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const isAdmin = currentUser?.role === 'Admin';

  // Verifica se a O.R já existe ao digitar e preenche dados (Apenas para novas ORs)
  const handleOrChange = (value: string) => {
    const newOr = value.toUpperCase();
    setCommonData(prev => ({ ...prev, or: newOr }));

    // Auto-completar dados do cabeçalho E ITENS se encontrar a OR (apenas se for NOVO cadastro)
    if (!order && existingOrders && newOr.length > 2) {
        const matchingOrders = existingOrders.filter(o => o.or === newOr);
        
        if (matchingOrders.length > 0) {
            const found = matchingOrders[0];
            setCommonData(prev => ({
                ...prev,
                or: newOr,
                cliente: found.cliente,
                vendedor: found.vendedor,
                prioridade: found.prioridade || 'Média',
                observacao: prev.observacao || found.observacao || '' // Mantém observação se já digitou algo, ou pega da existente
            }));

            // CARREGAMENTO INTELIGENTE DE ITENS EXISTENTES
            const loadedItems = matchingOrders.map(s => ({
                ...s,
                tempId: s.id,
                quantidade: s.quantidade || '1',
                hasDuplicateError: false
            })).sort((a, b) => {
                const refA = a.numeroItem || '';
                const refB = b.numeroItem || '';
                return refA.localeCompare(refB, undefined, { numeric: true, sensitivity: 'base' });
            });

            setItems(loadedItems);
            setActiveItemIndex(0);
        }
    }
  };

  const updateItem = (index: number, field: keyof OrderItemForm, value: any) => {
    setItems(prevItems => {
        const newItems = [...prevItems];
        // Se estiver atualizando a referência, reseta o erro de duplicata temporariamente para revalidação
        const duplicateReset = field === 'numeroItem' ? { hasDuplicateError: false } : {};
        
        newItems[index] = { 
            ...newItems[index], 
            [field]: value,
            ...duplicateReset
        };
        return newItems;
    });
  };

  // Efeito para validar duplicidade em tempo real quando o item ativo ou sua referência muda
  useEffect(() => {
      const current = items[activeItemIndex];
      if (!current || !current.numeroItem) return;

      const currentRef = current.numeroItem.trim().toUpperCase();
      if (!currentRef) return;

      // Verifica duplicata global (ignora o próprio item se for edição)
      const isGlobalDuplicate = existingOrders?.some(o => 
          o.numeroItem?.trim().toUpperCase() === currentRef && 
          o.id !== current.id // ID persistido
      );

      // Verifica duplicata local (na lista atual, ignora índice atual)
      const isLocalDuplicate = items.some((item, idx) => 
          idx !== activeItemIndex && 
          item.numeroItem?.trim().toUpperCase() === currentRef
      );

      const isDuplicate = isGlobalDuplicate || isLocalDuplicate;

      // Se detectou duplicata e NÃO é remake, marca erro. Se é remake, limpa erro.
      if (isDuplicate && !current.isRemake) {
          if (!current.hasDuplicateError) {
              setItems(prev => {
                  const next = [...prev];
                  next[activeItemIndex] = { ...next[activeItemIndex], hasDuplicateError: true };
                  return next;
              });
          }
      } else {
          if (current.hasDuplicateError) {
              setItems(prev => {
                  const next = [...prev];
                  next[activeItemIndex] = { ...next[activeItemIndex], hasDuplicateError: false };
                  return next;
              });
          }
      }
  }, [items[activeItemIndex]?.numeroItem, items[activeItemIndex]?.isRemake, activeItemIndex, existingOrders]); // Dependências controladas

  const getNextRefSuggestion = () => {
      const usedRefs = new Set<string>();
      items.forEach(i => {
          if (i.numeroItem) usedRefs.add(i.numeroItem);
      });
      let maxNum = 0;
      let hasNumeric = false;
      usedRefs.forEach(ref => {
          const num = parseInt(ref, 10);
          if (!isNaN(num)) {
              if (num > maxNum) maxNum = num;
              hasNumeric = true;
          }
      });
      if (hasNumeric) {
          return String(maxNum + 1).padStart(2, '0');
      }
      return '';
  };

  const addItem = () => {
    const suggestedRef = getNextRefSuggestion();
    const newTempId = Date.now().toString() + Math.random(); // Ensure unique
    const newItem = {
      tempId: newTempId,
      numeroItem: suggestedRef,
      quantidade: '1',
      item: '',
      dataEntrega: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(), // Add creation date immediately
      attachments: [],
      isRemake: false,
      hasDuplicateError: false,
      filePath: ''
    };
    
    setItems(prev => [...prev, newItem]);
    
    // Switch to the new item immediately
    setTimeout(() => {
        setActiveItemIndex(items.length); // items.length is the new index
        // Auto-focus description of new item
        const inputEl = document.getElementById('current-item-desc');
        if(inputEl) inputEl.focus();
        // Scroll tabs to end
        if (tabsContainerRef.current) {
            tabsContainerRef.current.scrollLeft = tabsContainerRef.current.scrollWidth;
        }
    }, 50);
  };

  const initiateRemoveItem = (index: number) => {
    // TRIGGER THE CONFIRMATION MODAL
    setDeleteCandidate({ index, item: items[index] });
  };

  const confirmRemoveItem = () => {
    if (deleteCandidate) {
        const itemToRemove = deleteCandidate.item;
        if (itemToRemove.id) {
            setDeletedIds(prev => [...prev, itemToRemove.id as string]);
        }
        
        const newItems = items.filter((_, i) => i !== deleteCandidate.index);
        setItems(newItems);
        
        // Adjust active index if needed
        if (activeItemIndex >= newItems.length) {
            setActiveItemIndex(Math.max(0, newItems.length - 1));
        }
        
        setDeleteCandidate(null);
    }
  };

  // --- LÓGICA DE ANEXOS POR ITEM ---
  const handleFileClick = () => {
    if (isProcessingFile) return;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const currentItem = items[activeItemIndex];
      const currentAttachments = currentItem.attachments || [];

      if (currentAttachments.length >= 5) {
        alert('Limite de 5 anexos por item atingido.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) { 
        alert(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Limite: 5MB.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setIsProcessingFile(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type || 'application/octet-stream', 
          size: file.size,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString()
        };
        
        updateItem(activeItemIndex, 'attachments', [...currentAttachments, newAttachment]);
        setIsProcessingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Scroll to end of attachments
        setTimeout(() => {
            if (attachmentsContainerRef.current) {
                attachmentsContainerRef.current.scrollLeft = attachmentsContainerRef.current.scrollWidth;
            }
        }, 50);
      };
      reader.onerror = () => {
        alert("Erro ao ler arquivo.");
        setIsProcessingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const initiateRemoveAttachment = (attachment: Attachment) => {
      setAttachmentToDelete({ id: attachment.id, name: attachment.name });
  };

  const confirmRemoveAttachment = () => {
    if (attachmentToDelete) {
        const currentItem = items[activeItemIndex];
        const newAttachments = (currentItem.attachments || []).filter(a => a.id !== attachmentToDelete.id);
        updateItem(activeItemIndex, 'attachments', newAttachments);
        if (showToast) showToast('Anexo removido com sucesso.', 'info');
        setAttachmentToDelete(null);
    }
  };

  const handleMarkAsRemake = () => {
      setItems(prev => {
          const next = [...prev];
          next[activeItemIndex] = { ...next[activeItemIndex], isRemake: true, hasDuplicateError: false };
          return next;
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingFile) return;

    if (items.length === 0) {
        setDeleteCandidate({ index: -1, item: { item: 'TODOS OS ITENS' } as any }); 
        return;
    }

    if (!commonData.or || !commonData.cliente || !commonData.vendedor) {
      alert('Preencha os dados gerais da O.R (Número, Cliente e Vendedor).');
      return;
    }

    // 1. Validar Campos Obrigatórios e Erros de Duplicidade
    for (let i = 0; i < items.length; i++) {
        if (!items[i].item) {
            alert(`O item #${i + 1} precisa de uma descrição.`);
            setActiveItemIndex(i);
            return;
        }
        if (items[i].hasDuplicateError) {
            alert(`O item #${i + 1} possui uma referência duplicada. Corrija ou marque como Refazimento.`);
            setActiveItemIndex(i);
            return;
        }
    }

    // Prepara o payload final
    const ordersToSave: Partial<Order>[] = items.map(item => ({
        ...item, 
        or: commonData.or,
        cliente: commonData.cliente,
        vendedor: commonData.vendedor,
        prioridade: commonData.prioridade as any,
        observacao: commonData.observacao,
        id: item.id || undefined,
        // Garante que flags temporárias não vão para o banco (embora o tipo OrderPartial ignore, boa prática)
        hasDuplicateError: undefined,
        tempId: undefined
    }));

    onSave(ordersToSave, deletedIds);
  };

  const confirmDeleteAll = () => {
      onSave([], deletedIds);
  };

  // Helper function for scrolling tabs
  const scrollTabs = (direction: 'left' | 'right') => {
      if (tabsContainerRef.current) {
          const scrollAmount = 200;
          tabsContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      }
  };

  // Helper function for scrolling attachments
  const scrollAttachments = (direction: 'left' | 'right') => {
      if (attachmentsContainerRef.current) {
          const scrollAmount = 200;
          attachmentsContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      }
  };

  const activeItem = items[activeItemIndex];

  return (
    <>
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl md:p-4 animate-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-h-[95vh] md:max-w-6xl md:rounded-[32px] md:shadow-4xl border-none md:border border-white dark:border-slate-800 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* SIDEBAR (Common Data) - Desktop Only */}
        <div className="hidden md:flex flex-col w-[300px] bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-6 overflow-y-auto shrink-0">
             <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-1">
                {order ? `Editar O.R` : 'Nova O.R'}
             </h4>
             <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[3px] mb-6">
                Dados Globais
             </p>

             <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Número O.R</label>
                    <input 
                        type="text" 
                        required
                        value={commonData.or}
                        onChange={e => handleOrChange(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 dark:text-white border-2 border-emerald-500/20 rounded-xl text-sm font-black uppercase focus:ring-2 ring-emerald-500 outline-none text-emerald-700 dark:text-emerald-400"
                        placeholder="12345"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Cliente / Projeto</label>
                    <input 
                        type="text" 
                        required
                        value={commonData.cliente}
                        onChange={e => setCommonData({...commonData, cliente: e.target.value.toUpperCase()})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase focus:ring-2 ring-emerald-500 outline-none"
                        placeholder="NOME DO CLIENTE"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Vendedor</label>
                    <input 
                        type="text" 
                        required
                        value={commonData.vendedor}
                        onChange={e => setCommonData({...commonData, vendedor: e.target.value.toUpperCase()})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase focus:ring-2 ring-emerald-500 outline-none"
                        placeholder="NOME"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Prioridade</label>
                    <select 
                        value={commonData.prioridade}
                        onChange={e => setCommonData({...commonData, prioridade: e.target.value as any})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase focus:ring-2 ring-emerald-500 outline-none cursor-pointer"
                    >
                        <option value="Baixa">Baixa</option>
                        <option value="Média">Média</option>
                        <option value="Alta">Alta</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Observações Gerais</label>
                    <textarea 
                        value={commonData.observacao}
                        onChange={e => setCommonData({...commonData, observacao: e.target.value.toUpperCase()})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase focus:ring-2 ring-emerald-500 outline-none h-24 resize-none"
                        placeholder="NOTAS GERAIS..."
                    />
                </div>
             </div>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50/50 dark:bg-slate-950/50">
            {/* Header / Nav Bar - Mobile & Desktop Unified for Items */}
            <div className="bg-white dark:bg-slate-900 z-10 shrink-0 border-b border-slate-100 dark:border-slate-800">
                {/* Mobile: Common Data Summary */}
                <div className="md:hidden p-4 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">
                            {order ? `Editar O.R ${commonData.or}` : 'Nova Ordem'}
                        </h4>
                        <button onClick={onClose} className="p-2 -mr-2 text-slate-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
                        </button>
                    </div>
                    {/* Simplified Inputs for Mobile Header */}
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold uppercase w-full" 
                            placeholder="Nº O.R"
                            value={commonData.or}
                            onChange={e => handleOrChange(e.target.value)}
                        />
                        <input 
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold uppercase w-full" 
                            placeholder="CLIENTE"
                            value={commonData.cliente}
                            onChange={e => setCommonData({...commonData, cliente: e.target.value.toUpperCase()})}
                        />
                    </div>
                </div>

                {/* --- ITEM NAVIGATION BAR (Redesigned) --- */}
                <div className="flex items-center bg-slate-100 dark:bg-black/20 shadow-inner px-2 py-3 relative">
                    {/* Seta Esquerda */}
                    <button 
                        type="button" 
                        onClick={() => scrollTabs('left')}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors z-10 shrink-0 md:hidden"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg>
                    </button>

                    <div 
                        ref={tabsContainerRef}
                        className="flex items-center gap-2 overflow-x-auto custom-scrollbar flex-1 px-2 scroll-smooth"
                    >
                        {items.map((it, idx) => (
                            <button 
                                key={idx}
                                type="button"
                                onClick={(e) => { e.preventDefault(); setActiveItemIndex(idx); }}
                                className={`
                                    h-10 shrink-0 rounded-xl border font-black text-[10px] flex items-center justify-center transition-all shadow-sm px-4 gap-1.5 whitespace-nowrap min-w-[60px]
                                    ${activeItemIndex === idx 
                                        ? 'bg-emerald-500 text-white border-emerald-600 scale-105 shadow-emerald-500/30 ring-2 ring-emerald-500/20' 
                                        : it.hasDuplicateError 
                                            ? 'bg-red-50 border-red-300 text-red-500 animate-pulse'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-600'}
                                `}
                            >
                                <span className="text-sm leading-none">{String(idx + 1).padStart(2, '0')}</span>
                                {it.isRemake && (
                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Refazimento"></span>
                                )}
                                {it.hasDuplicateError && !it.isRemake && (
                                    <span className="w-2 h-2 rounded-full bg-red-500" title="Erro: Duplicado"></span>
                                )}
                                {it.numeroItem && <span className="opacity-80 font-bold text-[9px] uppercase border-l pl-1.5 border-current leading-none">REF: {it.numeroItem}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Seta Direita */}
                    <button 
                        type="button" 
                        onClick={() => scrollTabs('right')}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors z-10 shrink-0 md:hidden"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                    </button>

                    <div className="w-[1px] h-8 bg-slate-300 dark:bg-slate-700 mx-2 shrink-0"></div>

                    <button 
                        type="button" 
                        onClick={addItem}
                        className="h-10 w-12 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-black text-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-sm"
                        title="Adicionar Item"
                    >
                        +
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                    
                    {/* Mobile Only: Extra Fields (Vendedor, Prio, Obs) */}
                    <div className="md:hidden space-y-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6">
                        <div className="grid grid-cols-2 gap-3">
                            <input 
                                className="bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-2 text-xs font-bold uppercase" 
                                placeholder="VENDEDOR"
                                value={commonData.vendedor}
                                onChange={e => setCommonData({...commonData, vendedor: e.target.value.toUpperCase()})}
                            />
                            <select 
                                className="bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-2 text-xs font-bold uppercase"
                                value={commonData.prioridade}
                                onChange={e => setCommonData({...commonData, prioridade: e.target.value as any})}
                            >
                                <option value="Média">Média</option>
                                <option value="Alta">Alta</option>
                                <option value="Baixa">Baixa</option>
                            </select>
                        </div>
                        <input 
                            className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-2 text-xs font-bold uppercase" 
                            placeholder="OBSERVAÇÕES GERAIS"
                            value={commonData.observacao}
                            onChange={e => setCommonData({...commonData, observacao: e.target.value.toUpperCase()})}
                        />
                    </div>

                    {/* SINGLE ACTIVE ITEM FORM */}
                    {activeItem && (
                        <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-emerald-500/20 shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Item Header */}
                            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                            Item {String(activeItemIndex + 1).padStart(2, '0')}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            Editando Detalhes
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded w-fit">
                                        Abertura: {activeItem.createdAt ? new Date(activeItem.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => initiateRemoveItem(activeItemIndex)}
                                    className="p-2 bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                                    title="Remover Item"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                            
                            <div className="p-6 flex flex-col gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1">Descrição do Item</label>
                                    <textarea 
                                        id="current-item-desc"
                                        required
                                        value={activeItem.item || ''}
                                        onChange={e => updateItem(activeItemIndex, 'item', e.target.value.toUpperCase())}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-sm font-bold uppercase outline-none resize-none h-28 transition-all shadow-inner"
                                        placeholder="DESCRIÇÃO DO SERVIÇO/PRODUTO"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref. Item</label>
                                            {activeItem.isRemake && (
                                                <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded uppercase border border-orange-200 dark:border-orange-800 animate-pulse">⚠️ Refazimento</span>
                                            )}
                                        </div>
                                        <input 
                                            type="text" 
                                            value={activeItem.numeroItem || ''}
                                            onChange={e => updateItem(activeItemIndex, 'numeroItem', e.target.value.toUpperCase())}
                                            className={`w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/10 dark:text-white border rounded-xl text-xs font-black uppercase outline-none focus:ring-2 transition-colors
                                                ${activeItem.hasDuplicateError && !activeItem.isRemake
                                                    ? 'border-red-500 ring-2 ring-red-200 text-red-800 bg-red-50' 
                                                    : activeItem.isRemake 
                                                        ? 'border-orange-500 ring-2 ring-orange-200 text-orange-800 dark:text-orange-300' 
                                                        : 'border-amber-200 dark:border-amber-800 focus:ring-amber-500 text-amber-800'}
                                            `}
                                            placeholder="REF"
                                        />
                                        {/* ALERTA DE DUPLICIDADE EM TEMPO REAL */}
                                        {activeItem.hasDuplicateError && !activeItem.isRemake && (
                                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between gap-2 animate-in slide-in-from-top-1">
                                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2"/></svg>
                                                    <span className="text-[9px] font-bold leading-tight">Referência já existe!</span>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={handleMarkAsRemake}
                                                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 rounded text-[8px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-colors uppercase whitespace-nowrap"
                                                >
                                                    É Refazimento?
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Entrega</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={activeItem.dataEntrega}
                                            disabled={!isAdmin && !!activeItem.id}
                                            onChange={e => updateItem(activeItemIndex, 'dataEntrega', e.target.value)}
                                            style={{ colorScheme: 'light' }}
                                            className={`w-full px-4 py-3 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase focus:ring-2 ring-emerald-500 outline-none ${!isAdmin && !!activeItem.id ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800 dark:text-white'}`}
                                        />
                                    </div>
                                    <div className="space-y-2 w-full md:w-32">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Qtd</label>
                                        <input 
                                            type="text" 
                                            value={activeItem.quantidade || '1'}
                                            onChange={e => updateItem(activeItemIndex, 'quantidade', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 rounded-xl text-lg font-black uppercase focus:ring-2 ring-emerald-500 outline-none text-center"
                                        />
                                    </div>
                                </div>

                                {/* NOVO CAMPO: CAMINHO DO ARQUIVO */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2.5"/></svg>
                                        Caminho do Arquivo (Rede/Nuvem)
                                    </label>
                                    <input 
                                        type="text" 
                                        value={activeItem.filePath || ''}
                                        onChange={e => updateItem(activeItemIndex, 'filePath', e.target.value)}
                                        className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/10 dark:text-white border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs font-bold focus:ring-2 ring-blue-500 outline-none transition-colors placeholder-blue-300"
                                        placeholder="Ex: Z:\CLIENTES\2024\..."
                                    />
                                </div>

                                {/* Anexos do Item */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 relative">
                                    <div className="flex items-center absolute left-0 top-6 z-10 md:hidden">
                                        <button type="button" onClick={() => scrollAttachments('left')} className="p-2 bg-white/80 dark:bg-slate-800/80 rounded-full shadow-md text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg>
                                        </button>
                                    </div>
                                    <div className="flex items-center absolute right-0 top-6 z-10 md:hidden">
                                        <button type="button" onClick={() => scrollAttachments('right')} className="p-2 bg-white/80 dark:bg-slate-800/80 rounded-full shadow-md text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                                        </button>
                                    </div>

                                    <div 
                                        className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar scroll-smooth px-8 md:px-0"
                                        ref={attachmentsContainerRef}
                                    >
                                        <button 
                                            type="button"
                                            onClick={handleFileClick}
                                            disabled={isProcessingFile}
                                            className="shrink-0 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all flex flex-col items-center justify-center gap-1 min-w-[80px]"
                                        >
                                            {isProcessingFile ? (
                                                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5"/></svg>
                                            )}
                                            Anexar
                                        </button>
                                        
                                        {activeItem.attachments && activeItem.attachments.map(att => (
                                            <div key={att.id} className="shrink-0 relative group">
                                                <div className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex items-center gap-3 w-[180px] overflow-hidden">
                                                    <div className="w-8 h-8 shrink-0 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2"/></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[9px] font-bold text-slate-700 dark:text-slate-200 uppercase truncate" title={att.name}>{att.name}</p>
                                                        <p className="text-[7px] font-bold text-slate-400 uppercase">{(att.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                {/* Overlay Delete Button - Centered */}
                                                <div className="absolute inset-0 bg-slate-900/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => initiateRemoveAttachment(att)} 
                                                        className="bg-red-500/80 text-white rounded-full p-2.5 shadow-lg transform hover:scale-110 transition-transform backdrop-blur-md"
                                                        title="Excluir Anexo"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Inner Navigation within Form */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                                <button 
                                    type="button"
                                    onClick={() => setActiveItemIndex(Math.max(0, activeItemIndex - 1))}
                                    disabled={activeItemIndex === 0}
                                    className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 font-bold text-[10px] uppercase flex items-center gap-1"
                                >
                                    ← Anterior
                                </button>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                    Item {activeItemIndex + 1} de {items.length}
                                </span>
                                <button 
                                    type="button"
                                    onClick={() => setActiveItemIndex(Math.min(items.length - 1, activeItemIndex + 1))}
                                    disabled={activeItemIndex === items.length - 1}
                                    className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 font-bold text-[10px] uppercase flex items-center gap-1"
                                >
                                    Próximo →
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div className="h-10"></div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 z-10 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    <div className="md:hidden flex-1">
                        <button type="button" onClick={onClose} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] bg-slate-100 dark:bg-slate-800 rounded-2xl">Voltar</button>
                    </div>
                    <div className="flex gap-3 flex-1 justify-end">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="hidden md:block px-6 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isProcessingFile}
                            className={`w-full md:w-auto px-12 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95 disabled:opacity-50
                                ${items.length === 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-[#064e3b] dark:bg-emerald-700 hover:bg-emerald-900 dark:hover:bg-emerald-600'}
                            `}
                        >
                            {items.length === 0 ? 'Excluir O.R' : (items.some(i => !!i.id) ? 'Salvar Tudo' : 'Criar O.R')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
        
        {/* Hidden Input for File Upload */}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
        />
      </div>
      
      {/* ... (Existing modals logic) ... */}
      {deleteCandidate && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 border-[4px] border-red-500 shadow-2xl relative">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  
                  <h3 className="text-xl font-black text-center text-slate-900 dark:text-white uppercase mb-2">Excluir Item?</h3>
                  
                  {deleteCandidate.index === -1 ? (
                      <p className="text-xs font-bold text-center text-slate-500 dark:text-slate-400 mb-6">
                          Você está prestes a remover <span className="text-red-500">TODOS OS ITENS</span>.<br/>Isso excluirá a Ordem de Serviço.
                      </p>
                  ) : (
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-6 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Item Selecionado</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2">
                              {deleteCandidate.item.item || 'Item sem descrição'}
                          </p>
                      </div>
                  )}

                  <div className="flex gap-3">
                      <button 
                          onClick={() => setDeleteCandidate(null)}
                          className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={deleteCandidate.index === -1 ? confirmDeleteAll : confirmRemoveItem}
                          className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
                      >
                          Confirmar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {attachmentToDelete && (
          <div className="fixed inset-0 z-[750] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
              <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 border-[4px] border-amber-500 shadow-2xl relative">
                  <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  
                  <h3 className="text-lg font-black text-center text-slate-900 dark:text-white uppercase mb-4">Excluir Anexo?</h3>
                  
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-6 text-center">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                          {attachmentToDelete.name}
                      </p>
                  </div>

                  <div className="flex gap-3">
                      <button 
                          onClick={() => setAttachmentToDelete(null)}
                          className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                          Voltar
                      </button>
                      <button 
                          onClick={confirmRemoveAttachment}
                          className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-colors"
                      >
                          Apagar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
    </>
  );
};

export default OrderModal;
