import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Sensors from 'expo-sensors';
import * as Notifications from 'expo-notifications';
import { Platform, Vibration, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectZone } from '../screens/detecteur-zone';

// Configuration
const SOS_TASK_NAME = 'background-sos-task';
const SHAKE_THRESHOLD = 2.5; // Même seuil que dans AlerteSOS.js
const CHECK_INTERVAL = 300000; // 5 minutes
const LOCATION_TIMEOUT = 15000; // 15 secondes
const ZONE_CHECK_INTERVAL = 180000; // 3 minutes pour envoyer une notification
let lastZoneCheck = 0;

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Définition de la tâche principale
TaskManager.defineTask(SOS_TASK_NAME, async ({ data: { locations, acceleration }, error }) => {
  if (error) {
    console.error('Task Error:', error);
    return;
  }

  // Détection de secousse
  if (acceleration && Math.sqrt(acceleration.x**2 + acceleration.y**2 + acceleration.z**2) > SHAKE_THRESHOLD) {
    console.log('Secousse détectée:', acceleration);
    await triggerSOS(locations?.[0], 'shake_detected');
  }

  // Détection de zone
  if (locations?.[0] && Date.now() - lastZoneCheck > ZONE_CHECK_INTERVAL) {
    console.log('Détection de zone déclenchée');
    await detectZone();
    lastZoneCheck = Date.now();
  }
});

// Déclenchement de l'alerte
async function triggerSOS(location, reason = 'manual_trigger') {
  try {
    console.log('Début de triggerSOS, reason:', reason);
    const currentLocation = location || await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: LOCATION_TIMEOUT,
    });
    console.log('Localisation obtenue:', currentLocation.coords);

    const matricule = await AsyncStorage.getItem('matricule');
    const userId = await AsyncStorage.getItem('userId');
    if (!matricule) {
      console.warn('⚠️ Matricule non trouvé.');
      return false;
    }

    const sosData = {
      userId,
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      matricule,
      type: reason === 'manual_trigger' ? 'MANUAL_SOS' : 'AUTO_SOS',
      timestamp: new Date().toISOString(),
    };

    // Stocker localement
    let alerts = JSON.parse(await AsyncStorage.getItem('sos_alerts')) || [];
    alerts.push(sosData);
    await AsyncStorage.setItem('sos_alerts', JSON.stringify(alerts));
    console.log('Alerte stockée localement:', sosData);

    // Envoi de la position au serveur avec réessai
    const url = `https://rouah.net/api/position.php?latitude=${sosData.latitude}&longitude=${sosData.longitude}&matricule=${matricule}`;
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const json = await response.json();
        console.log('📤 Réponse API (SOS):', json);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('Échec de l\'API après réessais:', error);
          return false;
        }
        console.warn(`Réessai de l'API SOS (${retries} tentatives restantes)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Notification locale
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Alerte SOS Activée",
        body: `Une situation d'urgence a été détectée (${getReasonText(reason)})`,
        sound: 'default',
        priority: 'max',
        vibrate: [500, 500, 500],
        data: {
          type: 'SOS',
          isAutomatic: reason !== 'manual_trigger',
          latitude: sosData.latitude,
          longitude: sosData.longitude,
        },
      },
      trigger: null,
    });

    Vibration.vibrate([500, 250, 500]);
    return true;
  } catch (error) {
    console.error('SOS Error:', error.message, error.stack);
    return false;
  }
}

function getReasonText(reason) {
  const reasons = {
    test_manual: 'Test manuel',
    shake_detected: 'Secousse détectée',
    fall_detected: 'Chute détectée',
    manual_trigger: 'Déclenchement manuel',
  };
  return reasons[reason] || reason;
}

// Vérification des paramètres de localisation
async function checkLocationSettings() {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      await Location.enableNetworkProviderAsync();
      return true;
    }
    return true;
  } catch (error) {
    console.error('Location settings error:', error);
    Alert.alert(
      'Paramètres requis',
      'Activez la localisation pour utiliser cette fonctionnalité',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Paramètres', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
}

// Fonction interne pour démarrer les services
async function startServices() {
  try {
    const settingsOK = await checkLocationSettings();
    if (!settingsOK) return false;

    // Configurer les capteurs (Android)
    if (Platform.OS === 'android') {
      Sensors.Accelerometer.setUpdateInterval(100);
    }

    // Démarrer la tâche combinée de localisation et accéléromètre
    await Location.startLocationUpdatesAsync(SOS_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 0,
      timeInterval: 100,
      foregroundService: {
        notificationTitle: "Protection SOS Active",
        notificationBody: "Secouez pour alerte",
        notificationColor: "#FF0000",
      },
      showsBackgroundLocationIndicator: true,
      activityType: 'other',
    });

    await AsyncStorage.setItem('emergencyServiceActive', 'true');
    console.log('Background services started');
    return true;
  } catch (error) {
    console.error('Start services error:', error);
    return false;
  }
}

// Fonctions principales exportées
export async function startEmergencyService() {
  try {
    // 1. Vérifier les permissions
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Activez la localisation en arrière-plan dans les paramètres',
        [{ text: 'OK', onPress: () => Linking.openSettings() }]
      );
      return false;
    }

    if (Platform.OS === 'android') {
      const { status: sensorStatus } = await Sensors.Accelerometer.requestPermissionsAsync();
      if (sensorStatus !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Activez les permissions des capteurs dans les paramètres',
          [{ text: 'OK', onPress: () => Linking.openSettings() }]
        );
        return false;
      }
    }

    // 2. Démarrer les services
    const success = await startServices();
    if (!success) return false;

    // 3. Vérification périodique
    const checkInterval = setInterval(async () => {
      const isActive = (await AsyncStorage.getItem('emergencyServiceActive')) === 'true';
      if (isActive) {
        const isRunning = await TaskManager.isTaskRegisteredAsync(SOS_TASK_NAME);
        if (!isRunning) {
          console.log('Redémarrage du service SOS...');
          await startServices();
        }
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(checkInterval);
  } catch (error) {
    console.error('Start Service Error:', error);
    return false;
  }
}

export async function stopEmergencyService() {
  try {
    await Location.stopLocationUpdatesAsync(SOS_TASK_NAME);
    await AsyncStorage.setItem('emergencyServiceActive', 'false');
    return true;
  } catch (error) {
    console.error('Stop Service Error:', error);
    return false;
  }
}

export async function checkEmergencyPermissions() {
  try {
    const { status: locationStatus } = await Location.requestBackgroundPermissionsAsync();
    if (Platform.OS === 'android') {
      const { status: sensorStatus } = await Sensors.Accelerometer.requestPermissionsAsync();
      return locationStatus === 'granted' && sensorStatus === 'granted';
    }
    return locationStatus === 'granted';
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

export async function testEmergencyAlert() {
  try {
    console.log('Début du test d\'alerte');
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: LOCATION_TIMEOUT,
    });
    console.log('Localisation pour test:', location.coords);
    const success = await triggerSOS(location, 'test_manual');
    console.log('Test d\'alerte réussi:', success);
    return success;
  } catch (error) {
    console.error('Test Alert Error:', error.message, error.stack);
    return false;
  }
}