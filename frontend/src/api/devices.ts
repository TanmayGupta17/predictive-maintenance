import { http } from './http';
import type {
  DeviceDetailResponse,
  FleetSummaryResponse,
  PaginatedResponse,
  TelemetryReading,
} from '../types/domain';

export async function getDevices() {
  const response = await http.get<FleetSummaryResponse>('/devices', {
    params: {
      pageSize: 50,
      sortBy: 'healthScore',
      sortOrder: 'asc',
    },
  });
  return response.data;
}

export async function getDevice(deviceId: string) {
  const response = await http.get<DeviceDetailResponse>(`/devices/${deviceId}`);
  return response.data;
}

export async function getDeviceHistory(deviceId: string, metric?: string) {
  const response = await http.get<PaginatedResponse<TelemetryReading>>(
    `/devices/${deviceId}/history`,
    {
      params: {
        metric,
        // Backend pagination caps pageSize at 100; live socket updates extend
        // the series beyond the initial load.
        pageSize: 100,
        sortBy: 'timestamp',
        sortOrder: 'asc',
      },
    },
  );
  return response.data;
}
