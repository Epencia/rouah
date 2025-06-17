// BatteryLevelDisplay.js
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Battery from 'expo-battery';

export default function AlerteBatterie() {
  const [batteryLevel, setBatteryLevel] = useState(null);

  useEffect(() => {
  const getBatteryLevel = async () => {
    const level = await Battery.getBatteryLevelAsync();
    setBatteryLevel((level * 100).toFixed(0));
  };

  // Appel initial
  getBatteryLevel();

  // Écoute les changements
  const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
    setBatteryLevel((batteryLevel * 100).toFixed(0));
  });

  // Nettoyage
  return () => {
    subscription.remove();
  };
}, []);


const getBatteryColor = () => {
  const level = Number(batteryLevel);
  if (level <= 20) return 'red';
  if (level <= 50) return 'orange';
  return 'green';
};


  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, color: getBatteryColor() }}>
  Niveau de batterie : {batteryLevel !== null ? `${batteryLevel}%` : 'Chargement...'}
</Text>

    </View>
  );
}
