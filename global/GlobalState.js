import React, { createContext, useState } from 'react';

export const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  return (
    <GlobalContext.Provider value={[user, setUser]}>
      {children}
    </GlobalContext.Provider>
  );
};