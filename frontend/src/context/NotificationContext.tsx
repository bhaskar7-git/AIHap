import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Notification } from '../types/index.js';
import { notificationApi } from '../services/api.js';
import { useAuth } from './AuthContext.js';
import { useSocket } from './SocketContext.js';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'URGENT';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  toast: Toast | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissToast: () => void;
  showToast: (title: string, message: string, type?: Toast['type']) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationApi.getAll();
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, fetchNotifications]);

  const showToast = (title: string, message: string, type: Toast['type'] = 'INFO') => {
    const newToast: Toast = {
      id: Math.random().toString(),
      title,
      message,
      type,
    };
    setToast(newToast);

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToast(curr => (curr?.id === newToast.id ? null : curr));
    }, 6000);
  };

  const dismissToast = () => setToast(null);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      showToast(notif.title, notif.message, notif.type);
    };

    const handleTokenStatus = (data: any) => {
      if (data.status === 'CALLED') {
        showToast('🚨 YOU ARE NEXT!', data.message || 'Please proceed to consultation room immediately.', 'URGENT');
      }
    };

    socket.on('NOTIFICATION_RECEIVED', handleNewNotification);
    socket.on('TOKEN_STATUS_UPDATED', handleTokenStatus);

    return () => {
      socket.off('NOTIFICATION_RECEIVED', handleNewNotification);
      socket.off('TOKEN_STATUS_UPDATED', handleTokenStatus);
    };
  }, [socket, user]);

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toast,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        dismissToast,
        showToast,
      }}
    >
      {children}
      {/* Real-time Global Toast Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-bounce-subtle">
          <div
            className={`p-4 rounded-xl shadow-2xl border flex items-start justify-between gap-3 text-white backdrop-blur-md ${
              toast.type === 'URGENT'
                ? 'bg-rose-600 border-rose-400'
                : toast.type === 'WARNING'
                ? 'bg-amber-600 border-amber-400'
                : toast.type === 'SUCCESS'
                ? 'bg-emerald-600 border-emerald-400'
                : toast.type === 'ALERT'
                ? 'bg-orange-600 border-orange-400'
                : 'bg-brand-700 border-brand-500'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
                <span>{toast.title}</span>
              </div>
              <p className="mt-1 text-xs text-white/95 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={dismissToast}
              className="text-white/80 hover:text-white p-1 rounded-md transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
