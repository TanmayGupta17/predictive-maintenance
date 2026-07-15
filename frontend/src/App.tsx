import { Navigate, Route, Routes } from 'react-router-dom';

import { AppProviders } from './context/AppProviders';
import { MainLayout } from './components/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AssetsPage } from './pages/AssetsPage';
import { AlertsPage } from './pages/AlertsPage';
import { DeviceDetailPage } from './pages/DeviceDetailPage';

export function App() {
  return (
    <AppProviders>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/devices" element={<AssetsPage />} />
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
        </Route>
      </Routes>
    </AppProviders>
  );
}
