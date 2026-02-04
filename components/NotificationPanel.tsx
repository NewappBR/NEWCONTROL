
import React from 'react';
import { Notification, ProductionStep, DEPARTMENTS } from '../types';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onAction?: (notification: Notification) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  notifications, 
  onClose, 
  onMarkAsRead,
  onMarkAllAsRead,
  onAction
}) => {
  const groupedNotifications = notifications.reduce((acc, notif) => {
    const sector = notif.targetSector || 'Geral';
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(notif);
    return acc;
  }, {} as Record<string, Notification[]>);

  const sectors = Object.keys(groupedNotifications).sort();

  return (
    <div className="fixed inset-0 z-[999] md:absolute md:top-full md:right-0 md:mt-2 md:w-[400px] md:h-auto md:max-h-[85vh] md:inset-auto bg-white dark:bg-slate-900 md:rounded-3xl shadow-4xl border-none md:border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-top-2 duration-200 flex flex-col">
      <div className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3 md:gap-2">
            <button onClick={onClose} className="p-1 -ml-2 text-slate-400 hover:text-red-500 transition-colors" title="Fechar Painel">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg>
            </button>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
               <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
               Central de Alertas
            </h4>
        </div>
        {notifications.length > 0 && (
            <button 
            onClick={onMarkAllAsRead}
            className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg transition-all border border-emerald-100 dark:border-emerald-800"
            >
            Limpar tudo
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50 p-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center opacity-50">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Você está em dia!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sectors.map(sector => {
              const sectorLabel = DEPARTMENTS[sector as ProductionStep] || sector;
              const sectorNotifs = groupedNotifications[sector];
              
              return (
                <div key={sector} className="animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">{sectorLabel}</span>
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-bold px-1.5 py-0.5 rounded-md">{sectorNotifs.length}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {sectorNotifs.map((notif) => {
                      const borderColor = 
                        notif.type === 'urgent' ? 'border-l-red-500' : 
                        notif.type === 'warning' ? 'border-l-amber-500' : 
                        notif.type === 'success' ? 'border-l-emerald-500' : 'border-l-blue-500';

                      const titleColor = 
                        notif.type === 'urgent' ? 'text-red-600 dark:text-red-400' : 
                        notif.type === 'warning' ? 'text-amber-600 dark:text-amber-400' : 
                        notif.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400';

                      const icon = 
                        notif.type === 'urgent' ? <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2"/></svg> :
                        notif.type === 'warning' ? <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg> :
                        notif.type === 'success' ? <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg> :
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>;

                      return (
                        <div 
                          key={notif.id} 
                          className={`bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative group border-y border-r border-slate-100 dark:border-slate-700 ${borderColor}`}
                          onClick={() => onMarkAsRead(notif.id)}
                        >
                          <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                  {icon}
                                  <span className={`text-[10px] font-black uppercase tracking-tight ${titleColor}`}>{notif.title}</span>
                              </div>
                              <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 whitespace-nowrap ml-2">{notif.timestamp}</span>
                          </div>

                          <div className="pl-6">
                              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 leading-snug">{notif.message}</p>
                              
                              {notif.referenceDate && (
                                <div className="mt-2 inline-block bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-600">
                                    <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                                        📅 Ref: {notif.referenceDate.split('-').reverse().join('/')}
                                    </p>
                                </div>
                              )}

                              {notif.actionLabel && onAction && (
                                <button 
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    onAction(notif);
                                    }}
                                    className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeWidth="2.5"/></svg>
                                    {notif.actionLabel}
                                </button>
                              )}
                          </div>
                          
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-emerald-500"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center shrink-0 md:hidden">
        <button onClick={onClose} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fechar</button>
      </div>
    </div>
  );
};

export default NotificationPanel;
