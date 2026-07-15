import type { PropsWithChildren } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { RealtimeProvider } from './RealtimeContext';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <RealtimeProvider>
      <BrowserRouter>{children}</BrowserRouter>
    </RealtimeProvider>
  );
}
