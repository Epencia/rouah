import { useEffect, useState, useCallback } from 'react';
import { Vibration, Linking } from 'react-native';

export const useCallHandler = () => {
  const [callState, setCallState] = useState({
    number: null,
    isVisible: false,
    isActive: false
  });

  // Fonction de test manuelle
  const simulateCall = (number = "+33612345678") => {
    setCallState({
      number,
      isVisible: true,
      isActive: true
    });
    Vibration.vibrate([500, 500], true);
  };

  const handleCallAction = useCallback((action) => {
    if (action === 'accept' && callState.number) {
      Linking.openURL(`tel:${callState.number}`);
    }
    Vibration.cancel();
    setCallState(prev => ({ ...prev, isVisible: false }));
  }, [callState.number]);

  return {
    incomingNumber: callState.number,
    isCallScreenVisible: callState.isVisible,
    isCallActive: callState.isActive,
    handleCallAction,
    simulateCall // Exportez la fonction de test
  };
};