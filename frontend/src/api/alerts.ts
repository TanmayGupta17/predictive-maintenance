import { http } from './http';
import type { Alert, PaginatedResponse } from '../types/domain';

export async function getActiveAlerts() {
  const response = await http.get<PaginatedResponse<Alert>>('/alerts', {
    params: {
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  });
  return response.data;
}

export async function getAlertHistory() {
  const response = await http.get<PaginatedResponse<Alert>>('/alerts/history', {
    params: {
      pageSize: 30,
      sortBy: 'resolvedAt',
      sortOrder: 'desc',
    },
  });
  return response.data;
}
