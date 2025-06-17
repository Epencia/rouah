import { enableScreens } from 'react-native-screens';
enableScreens();
import React from "react";
import { GlobalProvider } from './global/GlobalState';
import { GlobalCarteProvider } from "./global/GlobalCarte";
import Routes from './routes';

export default function App() {
  return (
    <GlobalProvider>
      <GlobalCarteProvider>
          <Routes />
      </GlobalCarteProvider>
    </GlobalProvider>
  );
}
