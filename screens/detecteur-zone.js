import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';

// Configuration
const API_PUBLIC_URL = 'https://rouah.net/api/zone-public.php';
const API_PRIVATE_URL = 'https://rouah.net/api/zone-prive.php';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde
const LOCATION_TIMEOUT = 15000; // 15 secondes

// Fonction pour envoyer une requête à une API
async function sendZoneRequest(url, latitude, longitude, matricule) {
  try {
    const requestUrl = `${url}?latitude=${latitude}&longitude=${longitude}&matricule=${matricule}`;
    console.log(`Envoi de la requête à ${url}:`, requestUrl);

    let retries = MAX_RETRIES;
    while (retries > 0) {
      try {
        const response = await fetch(requestUrl);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        const json = await response.json();
        console.log(`Réponse de ${url}:`, json);
        return { status: 'fulfilled', value: json };
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error(`Échec de ${url} après ${MAX_RETRIES} tentatives:`, error.message);
          return { status: 'rejected', reason: error };
        }
        console.warn(`Réessai de ${url} (${retries} tentatives restantes)`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  } catch (error) {
    console.error(`Erreur lors de l'envoi à ${url}:`, error.message, error.stack);
    return { status: 'rejected', reason: error };
  }
}

// Fonction principale pour détecter la zone
export async function detectZone() {
  try {
    console.log('Début de la détection de zone');

    // Vérifier les permissions de localisation
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permission de localisation refusée');
      Alert.alert(
        'Permission requise',
        'La localisation est nécessaire pour détecter la zone. Veuillez activer la localisation.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Paramètres', onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }

    // Récupérer la localisation
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: LOCATION_TIMEOUT,
    });
    console.log('Localisation obtenue:', location.coords);

    // Récupérer le matricule
    const matricule = await AsyncStorage.getItem('matricule');
    if (!matricule) {
      console.warn('⚠️ Matricule non trouvé.');
      Alert.alert(
        'Erreur',
        'Matricule non configuré. Veuillez vous connecter pour configurer votre matricule.'
      );
      return false;
    }
    console.log('Matricule:', matricule);

    // Préparer les données
    const zoneData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      matricule,
      timestamp: new Date().toISOString(),
    };

    // Envoyer les requêtes aux deux API indépendamment
    const [publicResult, privateResult] = await Promise.allSettled([
      sendZoneRequest(API_PUBLIC_URL, zoneData.latitude, zoneData.longitude, matricule),
      sendZoneRequest(API_PRIVATE_URL, zoneData.latitude, zoneData.longitude, matricule)
    ]);

    // Traiter les résultats
    const publicResponse = publicResult.status === 'fulfilled' ? publicResult.value : null;
    const privateResponse = privateResult.status === 'fulfilled' ? privateResult.value : null;

    // Stocker les résultats localement
    let zoneHistory = JSON.parse(await AsyncStorage.getItem('zone_history')) || [];
    zoneHistory.push({
      ...zoneData,
      publicResponse: publicResponse || (publicResult.reason ? { error: publicResult.reason.message } : null),
      privateResponse: privateResponse || (privateResult.reason ? { error: privateResult.reason.message } : null),
    });
    await AsyncStorage.setItem('zone_history', JSON.stringify(zoneHistory));
    console.log('Historique de zone stocké:', zoneData);

    // Vérifier si au moins une requête a réussi
    if (publicResult.status === 'rejected' && privateResult.status === 'rejected') {
      console.error('Échec des deux requêtes API');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur de détection de zone:', error.message, error.stack);
    return false;
  }
}

// Fonction pour tester la détection de zone
export async function testZoneDetection() {
  try {
    console.log('Début du test de détection de zone');
    const success = await detectZone();
    if (success) {
      console.log('Test de détection de zone réussi');
      Alert.alert('Test réussi', 'La détection de zone a été effectuée avec succès');
      return true;
    } else {
      console.error('Test de détection de zone échoué');
      Alert.alert('Erreur', 'Échec de la détection de zone. Vérifiez votre connexion ou les paramètres.');
      return false;
    }
  } catch (error) {
    console.error('Erreur lors du test de détection de zone:', error.message, error.stack);
    Alert.alert('Erreur', `Échec de la détection de zone : ${error.message}`);
    return false;
  }
}