import { useEffect } from 'react';

import { useRealtimeContext } from '../context/RealtimeContext';

export function useRealtimeEvent<TPayload>(
  eventName: string,
  handler: (payload: TPayload) => void,
) {
  const { socket } = useRealtimeContext();

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [eventName, handler, socket]);
}
