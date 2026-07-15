import { http } from './http';
import type { DashboardResponse } from '../types/domain';

export async function getDashboard() {
  const response = await http.get<DashboardResponse>('/dashboard', {
    params: {
      pageSize: 8,
    },
  });
  return response.data;
}
