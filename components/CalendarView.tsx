
import React, { useState, useMemo } from 'react';
import { Order } from '../types';

interface CalendarViewProps {
  orders: Order[];
  onEditOrder: (order: Order) => void;
  onDateClick?: (dateStr: string) => void; // Nova prop para clique na data
}

type ViewMode = 'SEMANA' | 'MÊS' | 'ANO';

const CalendarView: React.FC<CalendarViewProps> = ({ orders, onEditOrder, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('MÊS');
  const [filterMode, setFilterMode] = useState<'TODAS' | 'OPERACIONAIS' | 'CONCLUÍDAS'>('TODAS');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
  ];

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterMode === 'OPERACIONAIS') return !o.isArchived;
      if (filterMode === 'CONCLUÍDAS') return o.isArchived;
      return true;
    });
  }, [orders, filterMode]);

  const handlePrev = () => {
    if (viewMode === 'MÊS') setCurrentDate(new Date(year, month - 1, 1));
    else if (viewMode === 'SEMANA') setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    else setCurrentDate(new Date(year - 1, 0, 1));
  };

  const handleNext = () => {
    if (viewMode === 'MÊS') setCurrentDate(new Date(year, month + 1, 1));
    else if (viewMode === 'SEMANA') setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    else setCurrentDate(new Date(year + 1, 0, 1));
  };

  const calendarDays = useMemo(() => {
    const days = [];
    if (viewMode === 'MÊS') {
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push({ day: null, dateStr: null });
      }
      
      for (let d = 1; d <= daysInMonth; d++) {
        days.push({
          day: d,
          dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        });
      }
    } else if (viewMode === 'SEMANA') {
      const currentDay = currentDate.getDay();
      const diff = currentDate.getDate() - currentDay;
      for (let i = 0; i < 7; i++) {
        const d = new Date(year, month, diff + i);
        days.push({
          day: d.getDate(),
          dateStr: d.toISOString().split('T')[0]
        });
      }
    }
    return days;
  }, [year, month, viewMode, currentDate]);

  const renderYearView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-8 overflow-y-auto max-h-[75vh] bg-white dark:bg-slate-900">
      {monthNames.map((m, idx) => {
        const monthOrders = filteredOrders.filter(o => {
          const d = new Date(o.dataEntrega);
          return d.getFullYear() === year && d.getMonth() === idx;
        });
        const activeCount = monthOrders.filter(o => !o.isArchived).length;
        const archivedCount = monthOrders.filter(o => o.isArchived).length;

        return (
          <button
            key={m}
            onClick={() => { setCurrentDate(new Date(year, idx, 1)); setViewMode('MÊS'); }}
            className="flex flex-col p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xl transition-all group text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-2 h-full bg-slate-100 dark:bg-slate-700 group-hover:bg-emerald-500 transition-colors"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-4">{m}</span>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{monthOrders.length}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Total de O.R</span>
            </div>
            <div className="mt-4 flex gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Ativas</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">{activeCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase">Arquivadas</span>
                <span className="text-sm font-black text-slate-500 dark:text-slate-500">{archivedCount}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in duration-500">
      <div className="px-8 py-6 flex flex-wrap items-center justify-between gap-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {viewMode === 'ANO' ? year : `${monthNames[month]} ${year}`}
            </h3>
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest">
              {viewMode}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            {['SEMANA', 'MÊS', 'ANO'].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m as ViewMode)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${viewMode === m ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl hidden md:flex">
            {['TODAS', 'OPERACIONAIS', 'CONCLUÍDAS'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterMode(f as any)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filterMode === f ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handlePrev} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg>
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-6 py-3 bg-slate-900 dark:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">Hoje</button>
            <button onClick={handleNext} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></div>
          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ativas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Concluídas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Hoje</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/20"></div>
          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Atrasadas</span>
        </div>
      </div>

      {viewMode === 'ANO' ? renderYearView() : (
        <div className="bg-white dark:bg-slate-900">
          <div className="hidden md:grid md:grid-cols-7 border-b border-slate-100 dark:border-slate-800">
            {['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'].map(d => (
              <div key={d} className="py-4 text-center text-[9px] font-black text-slate-400 tracking-[2px]">{d}</div>
            ))}
          </div>

          <div className="flex flex-col md:grid md:grid-cols-7">
            {calendarDays.map((item, idx) => {
              // No mobile (flex-col), ocultar dias que são apenas preenchimento (nulos)
              if (!item.day) {
                 return <div key={idx} className="hidden md:block min-h-[140px] border-r border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40"></div>;
              }

              const dayOrders = item.dateStr ? filteredOrders.filter(o => o.dataEntrega === item.dateStr) : [];
              const isToday = new Date().toISOString().split('T')[0] === item.dateStr;
              const hasAtrasada = dayOrders.some(o => !o.isArchived && new Date(o.dataEntrega) < new Date(new Date().setHours(0,0,0,0)));
              
              // Contadores
              const totalItems = dayOrders.length;

              return (
                <div 
                  key={idx} 
                  className={`min-h-[100px] md:min-h-[140px] border-b md:border-r border-slate-100 dark:border-slate-800 p-3 flex flex-col transition-all relative group cursor-pointer
                    bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50
                    ${isToday ? 'bg-emerald-50/20 dark:bg-emerald-900/10 ring-1 ring-inset ring-emerald-100 dark:ring-emerald-900' : ''}
                  `}
                  onClick={() => item.dateStr && onDateClick?.(item.dateStr)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {String(item.day).padStart(2, '0')}
                        </span>
                        {/* Exibir dia da semana no mobile ao lado do número */}
                        <span className="md:hidden text-[9px] font-bold text-slate-300 uppercase">
                            {new Date(year, month, item.day).toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        {totalItems > 0 && (
                            <span className="bg-slate-200 dark:bg-slate-700 text-[8px] font-black text-slate-600 dark:text-slate-300 px-1.5 rounded-md min-w-[18px] text-center" title="Total de Ordens">
                                {totalItems}
                            </span>
                        )}
                        {hasAtrasada && (
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mt-1"></span>
                        )}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1 max-h-[120px]">
                    {dayOrders.map(o => {
                        const todayStr = new Date().toLocaleDateString('en-CA');
                        const isLate = !o.isArchived && o.dataEntrega < todayStr;
                        const isTodayDelivery = !o.isArchived && o.dataEntrega === todayStr;

                        return (
                        <button
                            key={o.id}
                            onClick={(e) => { e.stopPropagation(); onEditOrder(o); }}
                            className={`w-full text-left px-2 py-2 rounded-xl text-[8px] font-black truncate border transition-all flex items-center gap-2
                            ${o.isArchived 
                                ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 italic opacity-60' 
                                : isLate
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/40'
                                : isTodayDelivery
                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 hover:bg-amber-100'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-md'
                            }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${o.isArchived ? 'bg-slate-300 dark:bg-slate-600' : isLate ? 'bg-red-500' : isTodayDelivery ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                            <span className="tabular-nums opacity-60">#{o.or}</span>
                            <span className="truncate">{o.cliente}</span>
                        </button>
                        );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
