import { enableScreens } from 'react-native-screens';
enableScreens();
import React, { useEffect } from 'react';
import { GlobalProvider } from './global/GlobalState';
import Routes from './routes';
import { startEmergencyService } from './navigation/EmergencyDetectionService';

export default function App() {
  useEffect(() => {
    // Initialisation unique du service SOS
    startEmergencyService().catch(console.error);
  }, []);

  return (
    <GlobalProvider>
      <Routes />
    </GlobalProvider>
  );
}