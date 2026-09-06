'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';

type SocketEventHandler = (payload: unknown) => void;

type SocketContextValue = {
  isConnected: boolean;
  socketId: string | null;
  connectionError: string | null;
  subscribe: (eventName: string, handler: SocketEventHandler) => () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const subscriptionsRef = useRef<Map<string, Set<SocketEventHandler>>>(
    new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_SOCKET_SERVER_URL,
      {
        autoConnect: false,
        reconnection: true,
      },
    );
    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id ?? null);
      setConnectionError(null);
    };
    const onDisconnect = () => {
      setIsConnected(false);
      setSocketId(null);
    };
    const onConnectError = (error: Error) => {
      setConnectionError(error.message || 'Unable to connect to the socket server.');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    for (const [eventName, handlers] of subscriptionsRef.current) {
      for (const handler of handlers) {
        socket.on(eventName, handler);
      }
    }

    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, []);

  const subscribe = useCallback(
    (eventName: string, handler: SocketEventHandler): (() => void) => {
      if (!eventName.trim()) {
        console.warn('[socket] Cannot subscribe to an empty event name.');
        return () => undefined;
      }

      const subscriptions = subscriptionsRef.current;
      const handlers = subscriptions.get(eventName) ?? new Set<SocketEventHandler>();
      handlers.add(handler);
      subscriptions.set(eventName, handlers);

      socketRef.current?.on(eventName, handler);

      return () => {
        const currentHandlers = subscriptions.get(eventName);
        if (!currentHandlers?.delete(handler)) {
          return;
        }

        socketRef.current?.off(eventName, handler);
        if (currentHandlers.size === 0) {
          subscriptions.delete(eventName);
        }
      };
    },
    [],
  );

  const value = useMemo(
    () => ({ isConnected, socketId, connectionError, subscribe }),
    [connectionError, isConnected, socketId, subscribe],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider.');
  }

  return context;
}
