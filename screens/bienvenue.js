import React, { useRef, useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions,
  ScrollView,
  Alert,
  Image,
  StatusBar,
  Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Sensors from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import { GlobalContext } from '../global/GlobalState';

export default function Bienvenue({ navigation }) {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [count, setCount] = useState(0);
  const [location, setLocation] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef(null);
  const [user] = useContext(GlobalContext);

  const apps = [
    { id: '1', name: 'Annonces', src:"Annonces", icon: '📢', color: '#1DB954', notifications: count > 0 ? count : '0' },
    { id: '2', name: 'Zones dangereuses', src:"Zones dangereuses", icon: '⚠️', color: '#E1306C', notification: '' },
    { id: '3', name: 'Publier une annonce', src:"Edition d'annonce", icon: '📱', color: '#25D366' },
    { id: '4', name: 'Alerte SOS', src:"Alerte SOS", icon: '🆘', color: '#FF0000' },
    { id: '5', name: 'Localisations', src:"Geolocalisation", icon: '🗺️', color: '#4285F4' },
  ];

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const time = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission de localisation refusée');
          setLoading(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        
        const addresses = await Location.reverseGeocodeAsync(currentLocation.coords);
        
        if (addresses.length > 0) {
          const addr = addresses[0];
          setAddress({
            street: addr.street || 'Rue inconnue',
            city: addr.city || addr.region || 'Ville inconnue',
            country: addr.country || 'Pays inconnu',
            fullAddress: `${addr.country || ''}, ${addr.city || addr.region || ''}, ${addr.street || ''}`
          });
        }
      } catch (err) {
        setError('En attente de la position...');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const colors = {
    dark: {
      gradient: ['#0f2027', '#203a43', '#2c5364'],
      text: '#fff',
      textSecondary: 'rgba(255, 255, 255, 0.8)',
      textTertiary: 'rgba(255, 255, 255, 0.7)',
      cardBg: 'rgba(255, 255, 255, 0.1)',
      error: 'rgba(255, 100, 100, 0.9)',
      buttonBorder: 'rgba(255, 255, 255, 0.3)',
      loginButton: 'rgba(255, 255, 255, 0.2)',
      signupButton: 'rgba(74, 144, 226, 0.6)',
      statusBar: 'light',
    },
    light: {
      gradient: ['#f5f7fa', '#e4e8f0', '#d8e1e8'],
      text: '#333',
      textSecondary: '#555',
      textTertiary: '#666',
      cardBg: 'rgba(255, 255, 255, 0.7)',
      error: '#d32f2f',
      buttonBorder: 'rgba(0, 0, 0, 0.1)',
      loginButton: 'rgba(255, 255, 255, 0.8)',
      signupButton: 'rgba(74, 144, 226, 0.8)',
      statusBar: 'dark',
    }
  };

  useEffect(() => {
    const getNombreNotification = () => {
      fetch(`https://rouah.net/api/nombre-annonce.php`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((result) => {
          const notificationCount = typeof result === 'number' ? result : result?.count || 0;
          setCount(notificationCount);
        })
        .catch((error) => {
          console.error('Erreur notification:', error);
        });
    };

    const intervalId = setInterval(getNombreNotification, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let subscription;
    
    const checkAcceleration = async ({ x, y, z }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      if (acceleration > 2.5) {
        try {
          const currentLoc = location || await Location.getCurrentPositionAsync({});
          setLocation(currentLoc);
          startCountdown();
        } catch {
          Alert.alert('Attention', 'Alerte SOS non disponible - GPS indisponible');
        }
      }
    };

    Sensors.Accelerometer.setUpdateInterval(100);
    subscription = Sensors.Accelerometer.addListener(checkAcceleration);
    
    return () => subscription?.remove();
  }, [location]);

  const startCountdown = () => {
    setModalVisible(true);
    setCountdown(10);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setModalVisible(false);
          sendSOS(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(countdownRef.current);
    setModalVisible(false);
    setCountdown(10);
  };

  const sendSOS = async (isAutomatic = false) => {
    let currentLocation = location;
    if (!currentLocation) {
      try {
        currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      } catch (err) {
        Alert.alert('Erreur', 'Impossible d\'obtenir votre position. Veuillez vérifier votre connexion GPS.');
        return;
      }
    }

    const matricule = await AsyncStorage.getItem('matricule');
    if (!matricule) {
      Alert.alert('Erreur', 'Matricule non configuré. Veuillez vous connecter.');
      return;
    }

    const userId = await AsyncStorage.getItem('userId');
    const pushToken = await AsyncStorage.getItem('pushToken');
    
    const sosData = {
      userId,
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      matricule,
      type: isAutomatic ? 'AUTO_SOS' : 'MANUAL_SOS',
      timestamp: new Date().toISOString(),
    };

    try {
      let alerts = JSON.parse(await AsyncStorage.getItem('sos_alerts')) || [];
      alerts.push(sosData);
      await AsyncStorage.setItem('sos_alerts', JSON.stringify(alerts));

      const url = `https://rouah.net/api/position.php?latitude=${sosData.latitude}&longitude=${sosData.longitude}&matricule=${matricule}`;
      const response = await fetch(url);
      const json = await response.json();
      
      if (json.success) {
        Vibration.vibrate([500, 500, 500]);
        Alert.alert('Succès', 'Alerte envoyée à vos contacts et enregistrée.');
      } else {
        throw new Error(json.message || 'Erreur serveur');
      }
    } catch (error) {
      Alert.alert('Erreur', `Échec de l'envoi: ${error.message}`);
      //console.error('Erreur SOS:', error);
    }
  };

  const currentColors = isDarkMode ? colors.dark : colors.light;

  return (
    <LinearGradient
      colors={currentColors.gradient}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar backgroundColor="transparent" barStyle={currentColors.statusBar} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        <Modal isVisible={isModalVisible} backdropOpacity={0.7}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Envoi de l'alerte SOS</Text>
            <Text style={styles.modalCountdown}>{countdown}</Text>
            <Text style={styles.modalText}>L'alerte sera envoyée dans {countdown} secondes</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelCountdown}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </Modal>
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            {loading ? (
              <ActivityIndicator size="small" color={currentColors.text} style={styles.loading} />
            ) : error ? (
              <Text style={[styles.errorText, { color: currentColors.error }]}>{error}</Text>
            ) : (
              <View style={[styles.addressContainer, { backgroundColor: currentColors.cardBg }]}>
                <Text style={[styles.addressText, { color: currentColors.text }]} numberOfLines={1} ellipsizeMode="tail">
                  {address?.fullAddress}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.header}>
            <Text style={[styles.date, { color: currentColors.textSecondary }]}>{date}</Text>
            <Text style={[styles.time, { color: currentColors.text }]}>{time}</Text>
            <TouchableOpacity 
              style={[styles.themeToggle, isDarkMode ? styles.themeToggleDark : styles.themeToggleLight]}
              onPress={toggleTheme}
            >
              <Text style={styles.themeToggleText}>{isDarkMode ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <Image
              source={require('../assets/logo-original.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.appList}>
            {apps.map((app) => (
              <TouchableOpacity 
                key={app.id} 
                style={[styles.appItem, { backgroundColor: currentColors.cardBg }]} 
                onPress={() => navigation.navigate(app.src)}
              >
                <View style={[styles.appIcon, { backgroundColor: app.color }]}>
                  <Text style={styles.iconText}>{app.icon}</Text>
                  {app.notifications && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{app.notifications}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.appTextContainer}>
                  <Text style={[styles.appName, { color: currentColors.text }]}>{app.name}</Text>
                  {app.notification && (
                    <Text style={[styles.notification, { color: currentColors.textTertiary }]}>{app.notification}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.authButton, 
              { 
                backgroundColor: currentColors.loginButton,
                borderColor: currentColors.buttonBorder
              }
            ]}
            onPress={() => navigation.navigate(user?.matricule ? 'BottomTabs' : 'Connexion')}
          >
            <Text style={[styles.authButtonText, { color: currentColors.text }]}>{user?.matricule ? 'Menu' : 'Connexion'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.authButton, isDarkMode ? styles.themeToggleDark : styles.themeToggleLight]}
            onPress={() => navigation.navigate('Inscription')}
          >
            <Text style={[styles.authButtonText, { color: currentColors.text }]}>Inscription</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradient: {
    flex: 1,
    width: width,
    height: height,
  },
  themeToggle: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeToggleDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  themeToggleLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  themeToggleText: {
    fontSize: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  topSection: {
    width: '100%',
    marginTop: 5,
  },
  header: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  date: {
    fontSize: 18,
    marginBottom: 5,
  },
  time: {
    fontSize: 40,
    fontWeight: '200',
    marginBottom: 10,
  },
  addressContainer: {
    width: '100%',
    paddingHorizontal: 15,
    borderRadius: 15,
    paddingVertical: 8,
    marginTop: 5,
  },
  addressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loading: {
    marginTop: 10,
  },
  appList: {
    width: '100%',
    bottom: 0,
    top: -30,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 5,
    borderRadius: 15,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '500',
  },
  notification: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  authButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logo: {
    width: 120,
    height: 100,
    marginBottom: 20,
    borderRadius: 10,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff3333',
    marginBottom: 10,
  },
  modalCountdown: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff3333',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff3333',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});