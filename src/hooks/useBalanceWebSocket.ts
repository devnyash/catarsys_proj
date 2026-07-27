import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Connects to the WebSocket notification endpoint and listens for
 * balance_update events, updating the auth store automatically.
 * Also handles notification events by triggering a refetch.
 */
export function useBalanceWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const token = localStorage.getItem('catarsys_access_token');
    if (!token) return;

    // Remove quotes if stored with them
    const cleanToken = token.replace(/"/g, '');

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      const url = `${protocol}://${host}/api/v1/ws/notifications?token=${cleanToken}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.debug('[WS] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'balance_update') {
            const newBalance = msg.data?.balance;
            if (typeof newBalance === 'number') {
              useAuthStore.getState().setBalance(newBalance);
            }
          }

          if (msg.type === 'notification') {
            // Trigger notification refetch
            import('@/store/notificationStore').then(({ useNotificationStore }) => {
              useNotificationStore.getState().fetchNotifications();
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        console.debug('[WS] Disconnected');
        wsRef.current = null;
        // Reconnect after 10s on unexpected close
        reconnectTimer.current = setTimeout(connect, 10000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional cleanup
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);
}
