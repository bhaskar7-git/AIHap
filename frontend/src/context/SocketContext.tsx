import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { socketClient } from '../services/socket.js';
import { QueueState } from '../types/index.js';

interface SocketContextType {
  socket: Socket;
  isConnected: boolean;
  activeQueue: QueueState | null;
  subscribeToDoctorQueue: (doctorId: string) => void;
  unsubscribeFromDoctorQueue: (doctorId: string) => void;
  lastEventTimestamp: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket] = useState<Socket>(() => socketClient.connect());
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [activeQueue, setActiveQueue] = useState<QueueState | null>(null);
  const [lastEventTimestamp, setLastEventTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleQueueUpdate = (data: QueueState) => {
      setActiveQueue(data);
      setLastEventTimestamp(Date.now());
    };

    const handleGlobalQueueChange = () => {
      setLastEventTimestamp(Date.now());
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('QUEUE_UPDATED', handleQueueUpdate);
    socket.on('GLOBAL_QUEUE_CHANGED', handleGlobalQueueChange);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('QUEUE_UPDATED', handleQueueUpdate);
      socket.off('GLOBAL_QUEUE_CHANGED', handleGlobalQueueChange);
    };
  }, [socket]);

  const subscribeToDoctorQueue = (doctorId: string) => {
    socketClient.joinDoctorQueue(doctorId);
  };

  const unsubscribeFromDoctorQueue = (doctorId: string) => {
    socketClient.leaveDoctorQueue(doctorId);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeQueue,
        subscribeToDoctorQueue,
        unsubscribeFromDoctorQueue,
        lastEventTimestamp,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
