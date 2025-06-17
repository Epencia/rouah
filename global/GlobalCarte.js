import React, { createContext, useState } from 'react';

export const GlobalCarte = createContext();

export const GlobalCarteProvider = ({ children }) => {
  const [carte, setCarte] = useState(null);

  return (
    <GlobalCarte.Provider value={[carte, setCarte]}>
      {children}
    </GlobalCarte.Provider>
  );
};