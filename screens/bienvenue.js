import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  Image,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ConnexionInternet } from '../global/network/internet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocalisation from './geolocalisation';
import WaveEmitter from './onde';
import { GlobalContext } from '../global/GlobalState';
import * as Notifications from 'expo-notifications';

const { width, height } = Dimensions.get('window');

export default function Bienvenue({ navigation }) {
  const isConnected = ConnexionInternet();
  const [matricule, setMatricule] = useState('');
  const [user] = useContext(GlobalContext);
  const [notification, setNotification] = useState(null);

  if (isConnected === null) return null;

  // Function to register for push notifications
  const registerForPushNotificationsAsync = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permission for notifications not granted');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  // Function to setup notification listeners
  const setupNotificationListeners = (onNotification, onResponse) => {
  const notificationListener = Notifications.addNotificationReceivedListener(onNotification);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);
  
  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
};

  // Function to send token to server
  const sendTokenToServer = async (token) => {
    try {
      if (!matricule) return;
      
      const response = await fetch('https://adores.cloud/api/save-token.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          utilisateur_id: matricule,
          push_token: token,
        }),
      });
      const result = await response.json();
      console.log('Token envoyé au serveur:', result);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du token:', error);
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      const connectionStatus = await ConnexionInternet();
      setIsConnected(connectionStatus);
    };

    const fetchMatricule = async () => {
      const storedMatricule = await AsyncStorage.getItem('matricule');
      if (storedMatricule) {
        setMatricule(storedMatricule);
      }
    };

    checkConnection();
    fetchMatricule();
    const interval = setInterval(checkConnection, 5000);

    // Setup push notifications
    registerForPushNotificationsAsync().then(token => {
      if (token && matricule) {
        console.log('Push token:', token);
        sendTokenToServer(token);
      }
    });

    // Configure notification listeners
    const unsubscribe = setupNotificationListeners(
      (notification) => {
        setNotification(notification);
        Alert.alert(
          notification.request.content.title || 'Notification',
          notification.request.content.body
        );
      },
      (response) => {
        console.log('Notification interaction:', response);
      }
    );

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [matricule]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header - Toujours visible */}
        <View style={styles.header}>
          <View style={styles.headerLogo}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.avatarImg}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Adorès Cloud</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.appButton2}
              onPress={() => navigation.navigate('Gemini')}
            >
              <MaterialCommunityIcons name="chat" size={24} color="#414d63" />
            </TouchableOpacity>
            <View style={{ marginRight: 2 }} />
            <TouchableOpacity
              style={styles.appButton2}
              onPress={() => navigation.navigate('Connexion')}
            >
              <MaterialCommunityIcons name="login" size={24} color="#414d63" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenu principal */}
        <View style={styles.mainContent}>
          {isConnected === null ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0A84FF" />
              <Text style={styles.loadingText}>Vérification de la connexion...</Text>
            </View>
          ) : isConnected ? (
            <Geolocalisation navigation={navigation}/>
          ) : (
            <View style={styles.offlineContainer}>
              <Image 
                source={require('../assets/images/map.jpg')}
                style={styles.backgroundImage}
                resizeMode="cover"
              />
              <View style={styles.overlay}>
                <View style={styles.statusBox}>
                  <Text style={styles.offlineText}>Vous êtes hors ligne</Text>
                </View>
                <WaveEmitter color="#FF3B30" />
              </View>
            </View>
          )}
        </View>

        {/* Footer - Toujours visible */}
        {!user && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Connexion')}
              style={styles.skipButton}
            >
              <Text style={styles.skipText}>CONNEXION ›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Inscription')}
              style={styles.nextButton}
            >
              <Text style={styles.nextText}>INSCRIPTION ›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 10
  },
  logoText: {
    color: '#414d63',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: '#555',
  },
  offlineContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 20,
    color: '#DC3545',
    fontWeight: 'bold',
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'gray'
  },
  headerButtons: {
    flexDirection: 'row',
  },
  appButton2: {
    padding: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 15,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  skipButton: {
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  nextButton: {
    padding: 14,
    backgroundColor: '#0A84FF',
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
    elevation: 5,
  },
  skipText: {
    color: '#333',
    fontWeight: 'bold',
  },
  nextText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBox: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    width: '80%',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});