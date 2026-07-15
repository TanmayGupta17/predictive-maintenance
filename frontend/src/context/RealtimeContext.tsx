import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { io, type Socket } from 'socket.io-client';

import { frontendEnv } from '../utils/env';
import { realtimeEvents } from '../types/realtime';

type RealtimeContextValue = {
  socket: Socket | null;
  connected: boolean;
  subscribeToDevice(deviceId: string): void;
  unsubscribeFromDevice(deviceId: string): void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: PropsWithChildren) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = io(frontendEnv.socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    setSocket(client);

    client.on('connect', () => setConnected(true));
    client.on('disconnect', () => setConnected(false));

    return () => {
      client.disconnect();
      setSocket(null);
    };
  }, []);

  const subscribeToDevice = useCallback(
    (deviceId: string) => {
      socket?.emit(realtimeEvents.subscribeDevice, deviceId);
    },
    [socket],
  );

  const unsubscribeFromDevice = useCallback(
    (deviceId: string) => {
      socket?.emit(realtimeEvents.unsubscribeDevice, deviceId);
    },
    [socket],
  );

  const value = useMemo(
    () => ({
      socket,
      connected,
      subscribeToDevice,
      unsubscribeFromDevice,
    }),
    [connected, socket, subscribeToDevice, unsubscribeFromDevice],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error('useRealtimeContext must be used inside RealtimeProvider');
  }

  return context;
}
