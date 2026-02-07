import React from 'react';
import { SessionProvider, useSession } from './src/hooks/SessionContext';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';

function Router() {
  const { isConnected } = useSession();
  return isConnected ? <DashboardScreen /> : <ConnectScreen />;
}

export default function App() {
  return (
    <SessionProvider>
      <Router />
    </SessionProvider>
  );
}
