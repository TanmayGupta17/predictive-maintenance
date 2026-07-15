import { useEffect } from 'react';

import { useRealtimeContext } from '../context/RealtimeContext';

export function useDeviceRealtime(deviceId: string | undefined) {
  const { subscribeToDevice, unsubscribeFromDevice } = useRealtimeContext();

  useEffect(() => {
    if (!deviceId) {
      return undefined;
    }

    subscribeToDevice(deviceId);

    return () => {
      unsubscribeFromDevice(deviceId);
    };
  }, [deviceId, subscribeToDevice, unsubscribeFromDevice]);
}
