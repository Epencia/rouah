import { enableScreens } from 'react-native-screens';
enableScreens();
import React, { useEffect } from 'react';
import { GlobalProvider } from './global/GlobalState';
import Routes from './routes';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME, SENSOR_TASK_NAME } from './navigation/EmergencyDetectionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export default function App() {
  const checkAndRestartServices = async () => {
    try {
      const isServiceActive = await AsyncStorage.getItem('emergencyServiceActive');
      if (isServiceActive === 'true') {
        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (!isTaskRegistered) {
          await startBackgroundServices();
        }
      }
    } catch (error) {
      console.error('Error checking services:', error);
    }
  };

  const startBackgroundServices = async () => {
    try {
      // Vérifier les permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
        console.log('Permissions not granted');
        return;
      }

      // Démarrer le suivi de localisation
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
        foregroundService: {
          notificationTitle: "Protection SOS Active",
          notificationBody: "Détection en cours...",
          notificationColor: "#FF0000",
        },
        showsBackgroundLocationIndicator: true,
      });

      // Démarrer le service de capteurs (Android seulement)
      if (Platform.OS === 'android') {
        await TaskManager.registerTaskAsync(SENSOR_TASK_NAME, {
          minimumInterval: 100,
          stopOnTerminate: false,
          startOnBoot: true
        });
      }

      await AsyncStorage.setItem('emergencyServiceActive', 'true');
      console.log('Background services started');
    } catch (error) {
      console.error('Error starting background services:', error);
    }
  };

  useEffect(() => {
    const initBackgroundService = async () => {
      try {
        const isServiceActive = await AsyncStorage.getItem('emergencyServiceActive');
        if (isServiceActive === 'true') {
          await startBackgroundServices();
        }
        
        // Vérifier périodiquement que les services tournent
        const interval = setInterval(checkAndRestartServices, 300000); // Toutes les 5 minutes
        return () => clearInterval(interval);
      } catch (error) {
        console.error('Error initializing background service:', error);
      }
    };

    initBackgroundService();
  }, []);

  return (
    <GlobalProvider>
      <Routes />
    </GlobalProvider>
  );
}