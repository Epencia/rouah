import React, { useState, useRef } from 'react';
import { View, Text, Button, Alert, Vibration, StyleSheet } from 'react-native';

export default function VibrationAlarm() {
  const [isVibrating, setIsVibrating] = useState(false);
  const intervalRef = useRef(null);

  const startAlarm = () => {
    if (isVibrating) return;

    Alert.alert('Alerte', 'La vibration va commencer !');
    setIsVibrating(true);

    intervalRef.current = setInterval(() => {
      Vibration.vibrate(1000);
    }, 1500);
  };
  
  const stopAlarm = () => {
    if (!isVibrating) return;

    setIsVibrating(false);
    Vibration.cancel();
    clearInterval(intervalRef.current);
    Alert.alert('Arrêt', 'La vibration a été stoppée.');
  };
  
  return (
    <View style={[
      styles.container,
      isVibrating && styles.dangerContainer
    ]}>
      <Text style={styles.emoji}>{isVibrating ? '⚠️' : '✅'}</Text>
      <Text style={styles.alertText}>
        {isVibrating ? 'DANGER !' : 'Tout est calme.'}
      </Text>
      <Text style={styles.subtitle}>
        {isVibrating 
            ? 'Une alarme est en cours !' 
            : 'Appuyez sur "Démarrer" pour lancer l\'alarme.'}
      </Text>

      <View style={styles.buttonWrapper}>
        <Button
          title="Démarrer l'alarme"
          onPress={startAlarm}
          disabled={isVibrating}
          color="#DC2626"
        />
      </View>
      <View style={styles.buttonWrapper}>
        <Button
          title="Arrêter l'alarme"
          onPress={stopAlarm}
          disabled={!isVibrating}
          color="#2563EB"
        />
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
  },
  dangerContainer: {
    backgroundColor: '#B91C1C',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  alertText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  buttonWrapper: {
    marginVertical: 10,
    width: '60%',
  },
});