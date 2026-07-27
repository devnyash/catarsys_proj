import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

/**
 * Connects to the WebSocket notification endpoint and listens for
 * balance_update events, updating the auth store automatically.
 * Also handles notification events by triggering a refetch.
 */
export function useBalanceWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      const url = `${protocol}://${host}/api/v1/ws/notifications?token=${token}`;

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
            console.debug('[WS] Notification event, fetching notifications');
            useNotificationStore.getState().fetchNotifications();
          }

          // Handle initial unread notifications list sent on connect
          if (msg.type === 'unread_notifications') {
            console.debug('[WS] Got unread notifications list:', msg.data?.length);
            useNotificationStore.getState().fetchNotifications();
          }
        } catch (e) {
          console.error('[WS] Error processing message:', e);
        }
      };

      ws.onclose = (event) => {
        console.debug('[WS] Disconnected:', event.code, event.reason);
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connect, 10000);
      };

      ws.onerror = () => {
        console.error('[WS] Connection error');
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
