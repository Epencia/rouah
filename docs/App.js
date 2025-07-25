import { enableScreens } from 'react-native-screens';
enableScreens();
import React from "react";
import { GlobalProvider } from './global/GlobalState';
import Routes from './routes';

export default function App() {
  return (
    <GlobalProvider>
          <Routes />
    </GlobalProvider>
  );
}
