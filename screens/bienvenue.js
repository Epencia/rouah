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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalContext } from '../global/GlobalState';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export default function Bienvenue({ navigation }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [count, setCount] = useState(0);
  const [countAvis, setCountAvis] = useState(0);
  const [countArticle, setCountArticle] = useState(0);
  const [countOutils, setCountOutils] = useState(0);
  const [user] = useContext(GlobalContext);

  const apps = [
    { id: '1', name: 'Publicités', src:"Publicites", icon: '📢', color: '#1DB954', notifications: count > 0 ? count : '0' },
    { id: '2', name: "Avis de recherche", src:"Avis de recherche", icon: '🔍', color: '#FF0000', notifications: countAvis > 0 ? countAvis : '0' },
    { id: '3', name: 'Badge commercial', src:"Badge commercial", icon: '📱', color: '#25D366' },
    { id: '4', name: 'Catalogues', src:"Articles", icon: '📚', color: '#4285F4',notifications: countArticle > 0 ? countArticle : '0' },
    { id: '5', name: 'Outils', src:"Outils", icon: '🛠️', color: '#E1306C', notifications: countOutils > 0 ? countOutils : '0' },
    
  ];

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

   // Fonction pour récupérer le token push
const registerForPushNotificationsAsync = async () => {
  try {
    console.log('Vérification si l\'appareil est physique...');
    if (!Device.isDevice) {
      console.log('Échec : appareil non physique (émulateur détecté)');
      Alert.alert('Avertissement', 'Les notifications push ne sont pas disponibles sur un émulateur. Veuillez tester sur un appareil physique.');
      return null;
    }

    console.log('Vérification des permissions de notification...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('Statut actuel des permissions :', existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('Demande de permissions de notification...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
      console.log('Nouveau statut des permissions :', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('Échec : permissions de notification refusées');
      Alert.alert('Avertissement', 'Les notifications push sont désactivées. Activez-les dans les paramètres de votre appareil pour recevoir des notifications.');
      return null;
    }

    console.log('Récupération du token push Expo...');
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '8b74f350-58f4-4c6c-b308-738040a6846d', // Remplace par ton projectId depuis app.json
    });
    const token = tokenData.data;
    console.log('Token de notification généré :', token);

    // Récupérer utilisateur_id depuis AsyncStorage (peut être null)
    let utilisateur_id = await AsyncStorage.getItem('userId');
    
    // Si utilisateur_id est null, utiliser une valeur par défaut
    if (!utilisateur_id) {
      utilisateur_id = 'anonymous'; // Valeur par défaut pour contourner la vérification de l'API
      //console.log('Aucun utilisateur connecté, utilisation de utilisateur_id = anonymous');
    }

    // Appeler l'API save-token.php
    //console.log('Envoi du token à l\'API save-token.php...');
    const response = await fetch('https://rouah.net/api/save-token.php', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        utilisateur_id: utilisateur_id,
        push_token: token,
      }),
    });

    const result = await response.json();
    //console.log('Réponse de l\'API save-token.php :', result);

    if (result.success) {
      // Stocker le token localement
      await AsyncStorage.setItem('pushToken', token);
      //console.log('Token stocké localement :', token);
      //Alert.alert('Succès', result.message || 'Token de notification enregistré avec succès.');
      return token;
    } else {
      //console.error('Erreur API :', result.error || 'Erreur inconnue');
      // Gérer le cas où l'API rejette la requête (par exemple, utilisateur_id manquant)
      if (result.error === 'utilisateur ou token manquant') {
        console.log('Tentative d\'enregistrement sans utilisateur_id strict...');
        // Vous pouvez choisir d'ignorer l'erreur ou de réessayer avec une autre logique
        await AsyncStorage.setItem('pushToken', token); // Stocker localement malgré l'erreur
       // Alert.alert('Information', 'Token stocké localement, mais non enregistré sur le serveur.');
        return token;
      }
      //Alert.alert('Erreur', `Échec de l'enregistrement du token : ${result.error || 'Erreur inconnue'}`);
      return null;
    }
  } catch (error) {
   // console.error('Erreur lors de la récupération ou de l\'enregistrement du token :', error);
    //Alert.alert('Erreur', `Impossible de gérer le token de notification : ${error.message}`);
    return null;
  }
};

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
  const initializeNotifications = async () => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      //console.log('Token push initialisé :', token);
    }
  };
  initializeNotifications();
}, []);

  const time = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });


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
      fetch(`https://rouah.net/api/nombre-publicite.php`, {
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
          //console.error('Erreur notification:', error);
        });
    };

    const intervalId = setInterval(getNombreNotification, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const getNombreAvisRecherche = () => {
      fetch(`https://rouah.net/api/nombre-avis-recherche.php`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((result) => {
          const notificationCount = typeof result === 'number' ? result : result?.count || 0;
          setCountAvis(notificationCount);
        })
        .catch((error) => {
          //console.error('Erreur notification:', error);
        });
    };

    const intervalId = setInterval(getNombreAvisRecherche, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // articles
    useEffect(() => {
    const getNombreArticle = () => {
      fetch(`https://rouah.net/api/nombre-article.php`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((result) => {
          const notificationCount = typeof result === 'number' ? result : result?.count || 0;
          setCountArticle(notificationCount);
        })
        .catch((error) => {
          //console.error('Erreur notification:', error);
        });
    };

    const intervalId = setInterval(getNombreArticle, 1000);
    return () => clearInterval(intervalId);
  }, []);


  // outils
    useEffect(() => {
    const getNombreOutils = () => {
      fetch(`https://rouah.net/api/nombre-outils.php`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((result) => {
          const notificationCount = typeof result === 'number' ? result : result?.count || 0;
          setCountOutils(notificationCount);
        })
        .catch((error) => {
          //console.error('Erreur notification:', error);
        });
    };

    const intervalId = setInterval(getNombreOutils, 1000);
    return () => clearInterval(intervalId);
  }, []);


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

        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >


          <View style={styles.header}>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={[styles.themeToggle2, isDarkMode ? styles.themeToggleDark : styles.themeToggleLight]}
                onPress={() => navigation.navigate('Informations')}
              >
                <Text style={styles.themeToggleText}>ℹ️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.themeToggle, isDarkMode ? styles.themeToggleDark : styles.themeToggleLight]}
                onPress={toggleTheme}
              >
                <Text style={styles.themeToggleText}>{isDarkMode ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.date, { color: currentColors.textSecondary }]}>{date}</Text>
            <Text style={[styles.time, { color: currentColors.text }]}>{time}</Text>
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
            onPress={() => navigation.navigate(user?.matricule ? 'Connexion' : 'Connexion')}
          >
            <Text style={[styles.authButtonText, { color: currentColors.text }]}>{user?.matricule ? 'Se connecter' : 'Se connecter'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.authButton, isDarkMode ? styles.themeToggleDark : styles.themeToggleLight]}
            onPress={() => navigation.navigate('Inscription')}
          >
            <Text style={[styles.authButtonText, { color: currentColors.text }]}>Créer un compte</Text>
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
  themeToggle2: {
    position: 'absolute',
    top: 10,
    left: 20,
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
   headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
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
    bottom: 50,
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