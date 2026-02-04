
import { Order, User, CompanySettings, GlobalLogEntry } from '../types';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:3001';

// --- LOCAL STORAGE HELPERS (Offline Mode) ---
const getLocalData = () => ({
    orders: JSON.parse(localStorage.getItem('pcp_orders') || '[]'),
    users: JSON.parse(localStorage.getItem('pcp_users') || '[]'),
    settings: JSON.parse(localStorage.getItem('pcp_company_settings') || '{}'),
    logs: JSON.parse(localStorage.getItem('pcp_global_logs') || '[]')
});

const setLocalData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- SOCKET ---
let socket: Socket | null = null;

export const initSocket = (onRefresh: () => void) => {
  try {
      if (!socket) {
        socket = io(API_URL, { 
            reconnectionAttempts: 3,
            timeout: 2000,
            autoConnect: false // Connect manually to handle errors better
        });
        
        socket.connect();

        socket.on('connect', () => console.log('🟢 Conectado ao servidor'));
        socket.on('connect_error', () => { 
            // Silently fail on socket connection error to avoid console spam
        });
        
        socket.on('refresh_data', () => {
            console.log('🔄 Atualização recebida');
            onRefresh();
        });
      }
      return socket;
  } catch (e) {
      return null;
  }
};

export const subscribeToChanges = (callback: () => void) => {
    initSocket(callback);
};

// --- API CALLS WITH FALLBACK ---

export const loadFullData = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

    const res = await fetch(`${API_URL}/api/data`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('Server Offline');
    const data = await res.json();
    
    // Atualiza o cache local quando online para garantir backup
    setLocalData('pcp_orders', data.orders || []);
    if(data.users) setLocalData('pcp_users', data.users);
    if(data.settings) setLocalData('pcp_company_settings', data.settings);
    
    return { ...data, isOffline: false };
  } catch (error) {
    // FALLBACK: Retorna dados locais
    const local = getLocalData();
    return { ...local, isOffline: true };
  }
};

export const saveGlobalData = async (users?: User[], settings?: CompanySettings, logs?: GlobalLogEntry[]) => {
  // Salva localmente primeiro (Optimistic UI)
  if (users) setLocalData('pcp_users', users);
  if (settings) setLocalData('pcp_company_settings', settings);
  if (logs) setLocalData('pcp_global_logs', logs);

  try {
    await fetch(`${API_URL}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users, settings, logs })
    });
  } catch (error) {
    // Ignora erro se estiver offline, pois já salvou localmente
  }
};

export const apiCreateOrder = async (order: Order) => {
  // Salva localmente
  const localOrders = getLocalData().orders;
  setLocalData('pcp_orders', [order, ...localOrders]);

  try {
    await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
  } catch (error) { /* Offline mode handled */ }
};

export const apiUpdateOrder = async (order: Order) => {
  // Salva localmente
  const localOrders = getLocalData().orders.map((o: Order) => o.id === order.id ? order : o);
  setLocalData('pcp_orders', localOrders);

  try {
    await fetch(`${API_URL}/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
  } catch (error) { /* Offline mode handled */ }
};

export const apiDeleteOrder = async (id: string) => {
  // Salva localmente
  const localOrders = getLocalData().orders.filter((o: Order) => o.id !== id);
  setLocalData('pcp_orders', localOrders);

  try {
    await fetch(`${API_URL}/api/orders/${id}`, {
      method: 'DELETE'
    });
  } catch (error) { /* Offline mode handled */ }
};

// Legacy compatibility
export const loadOrders = async (): Promise<Order[]> => {
  const data = await loadFullData();
  return data.orders || [];
};

export const saveOrders = async (orders: Order[], notify: boolean = true): Promise<void> => {
    // No-op for bulk save in this architecture
};
