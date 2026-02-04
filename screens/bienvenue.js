import React, { useRef, useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Image,
  Platform,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalContext } from '../global/GlobalState';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants'; // IMPORT MANQUANT
import * as Application from 'expo-application'; // IMPORT MANQUANT

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;

// Adaptatif : la taille du cercle varie selon l'écran
const CIRCLE_DIAMETER = Math.min(
  width * (isSmallScreen ? 0.85 : 0.92),
  height * 0.55,
  420
);
const RADIUS = CIRCLE_DIAMETER * (isSmallScreen ? 0.38 : 0.42);

// Calcul des tailles de police adaptatives
const scaleFont = (size) => {
  const scaleFactor = isSmallScreen ? 0.9 : isLargeScreen ? 1.1 : 1;
  return size * scaleFactor;
};

const partners = [
  { name: 'Annonces', src: "Annonces", icon: 'bullhorn' },
  { name: 'Catalogues', src: "Chaines", icon: 'book' },
  { name: 'Certificats', src: "Diplomes", icon: 'graduation-cap' },
  { name: 'Comptoir', src: "Comptoir", icon: 'comments' },
  { name: 'Outils', src: "Outils", icon: 'tools' },
  { name: 'Partenaires', src: "Partenaires", icon: 'handshake' },
  { name: 'Galeries', src: "Galeries", icon: 'images', isCenter: true },
];

const Bienvenue = ({ navigation }) => {
  const [count, setCount] = useState(0);
  const [countAvis, setCountAvis] = useState(0);
  const [countArticle, setCountArticle] = useState(0);
  const [countOutils, setCountOutils] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const [versets, setVersets] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [pushToken, setPushToken] = useState(null);

  // === NOTIFICATIONS PUSH ===
  const registerForPushNotificationsAsync = async () => {
    // Votre code original inchangé
    try {
      if (!Device.isDevice) {
        Alert.alert('Avertissement', 'Les notifications push ne sont pas disponibles sur un émulateur.');
        return null;
      }
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Avertissement', 'Les notifications push sont désactivées.');
        return null;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '8b74f350-58f4-4c6c-b308-738040a6846d',
      });
      const token = tokenData.data;
      let utilisateur_id = await AsyncStorage.getItem('userId') || 'anonymous';

      // Récupérer les informations du device
      const deviceInfo = {
        Proprietaire: Device.deviceName || 'Inconnu',
        Annee: Device.deviceYearClass || 'Inconnu',
        Marque: Device.brand || 'Inconnu',
        Modele: Device.modelName|| Device.modelId  || 'Inconnu',
        VersionOS: Device.osVersion || 'Inconnu',
        Plateforme: Device.platformApiLevel || 'Inconnu',
        buildVersion: Application.nativeBuildVersion || '1',
        Design: Device.designName || 'Inconnu',
        UID: (await Device.getDeviceTypeAsync()) || 'Inconnu',
        Date: new Date().toISOString(),
        Application: Constants.expoConfig?.name || 'Rouah',
      };

       // Préparer les données pour l'envoi
      const postData = {
        utilisateur_id: utilisateur_id,
        push_token: token,
        device: JSON.stringify(deviceInfo)
      };


      const response = await fetch('https://rouah.net/api/save-token.php', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(postData),      
});
      const result = await response.json();

      console.log('Token envoyé au serveur:', result);

      if (result.success || result.error === 'utilisateur ou token manquant') {
        await AsyncStorage.setItem('pushToken', token);
        setPushToken(token); // ← Stocker dans l'état
      }
      return token;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => { registerForPushNotificationsAsync(); }, []);

  // === COMPTEURS EN TEMPS RÉEL ===
  useEffect(() => {
    const fetchers = [
      { setter: setCount, url: 'https://rouah.net/api/nombre-publicite.php' },
      { setter: setCountAvis, url: 'https://rouah.net/api/nombre-avis-recherche.php' },
      { setter: setCountArticle, url: 'https://rouah.net/api/nombre-article.php' },
      { setter: setCountOutils, url: 'https://rouah.net/api/nombre-chaine.php' },
    ];

    fetchers.forEach(({ setter, url }) => {
      const fetchData = () => {
        fetch(url, { method: 'POST' })
          .then(r => r.json())
          .then(res => setter(typeof res === 'number' ? res : res?.count || 0))
          .catch(() => {});
      };
      fetchData();
      const id = setInterval(fetchData, 8000);
      return () => clearInterval(id);
    });
  }, []);

  // === VERSETS BIBLIQUES ===
  useEffect(() => {
    const fetchVersets = async () => {
      try {
        const response = await fetch("https://rouah.net/api/versets.php");
        const data = await response.json();
        if (data.success && data.versets.length > 0) {
          setVersets(data.versets);
        }
      } catch (e) {
        console.log("Erreur de récupération des versets :", e);
      }
    };
    fetchVersets();
  }, []);

  useEffect(() => {
  if (versets.length === 0) return;

  let isMounted = true;

  const showNextVerse = (index = 0) => {
    if (!isMounted) return;

    setCurrentMessage(versets[index]);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      ]),
      Animated.delay(60000),
      Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      scaleAnim.setValue(0.5);
      const nextIndex = (index + 1) % versets.length;
      showNextVerse(nextIndex); // récursion contrôlée
    });
  };

  showNextVerse(); // lancement initial

  return () => { isMounted = false; };
}, [versets]);

// Ajoutez useEffect pour charger le token au démarrage
useEffect(() => {
  const loadToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('pushToken');
      if (savedToken) {
        setPushToken(savedToken);
      }
    } catch (error) {
      console.error('Erreur chargement token:', error);
    }
  };
  loadToken();
}, []);



  // Fonction pour gérer le layout du conteneur
  const handleContainerLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <Image 
          source={require('../assets/logo-original.png')} 
          style={[
            styles.logo,
            isSmallScreen && styles.logoSmall,
            isLargeScreen && styles.logoLarge
          ]} 
          resizeMode="contain" 
        />
        <Text style={[
          styles.title,
          isSmallScreen && styles.titleSmall,
          isLargeScreen && styles.titleLarge
        ]}>
          Rouah
        </Text>

        <Animated.View 
          style={[
            styles.messageContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          {currentMessage && (
            <Text style={[
              styles.subtitle,
              isSmallScreen && styles.subtitleSmall,
              isLargeScreen && styles.subtitleLarge
            ]} numberOfLines={3}>
              {currentMessage}
            </Text>
          )}
        </Animated.View>
      </View>

      <View 
        style={[styles.circleWrapper, { width: CIRCLE_DIAMETER, height: CIRCLE_DIAMETER }]}
        onLayout={handleContainerLayout}
      >
        {partners.map((partner, index) => {
          if (partner.isCenter) {
            return (
              <TouchableOpacity
                key={index}
                style={styles.centerPartner}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(partner.src)}
              >
                <View style={[
                  styles.centerIcon,
                  isSmallScreen && styles.centerIconSmall,
                  isLargeScreen && styles.centerIconLarge
                ]}>
                  <Icon 
                    name={partner.icon} 
                    size={isSmallScreen ? 30 : isLargeScreen ? 38 : 34} 
                    color="white" 
                  />
                </View>
                <Text style={[
                  styles.centerName,
                  isSmallScreen && styles.centerNameSmall,
                  isLargeScreen && styles.centerNameLarge
                ]}>
                  {partner.name}
                </Text>
              </TouchableOpacity>
            );
          }

          const angle = index * 60 - 90;
          const radians = (angle * Math.PI) / 180;
          const x = RADIUS * Math.cos(radians);
          const y = RADIUS * Math.sin(radians);

          // === DÉTERMINATION DU BADGE ===
          let badgeCount = 0;
          if (partner.name === 'Annonces') badgeCount = count;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.outerPartner, 
                { 
                  transform: [{ translateX: x }, { translateY: y }],
                  width: isSmallScreen ? 85 : isLargeScreen ? 110 : 100
                }
              ]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(partner.src)}
            >
              <View style={styles.outerIconContainer}>
                <View style={[
                  styles.outerIcon,
                  isSmallScreen && styles.outerIconSmall,
                  isLargeScreen && styles.outerIconLarge
                ]}>
                  <Icon 
                    name={partner.icon} 
                    size={isSmallScreen ? 22 : isLargeScreen ? 28 : 26} 
                    color="#414d63" 
                  />
                </View>
                {badgeCount > 0 && (
                  <View style={[
                    styles.badge,
                    isSmallScreen && styles.badgeSmall,
                    isLargeScreen && styles.badgeLarge
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      isSmallScreen && styles.badgeTextSmall,
                      isLargeScreen && styles.badgeTextLarge
                    ]}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.outerName,
                isSmallScreen && styles.outerNameSmall,
                isLargeScreen && styles.outerNameLarge
              ]}>
                {partner.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[
        styles.buttons,
        isSmallScreen && styles.buttonsSmall,
        isLargeScreen && styles.buttonsLarge
      ]}>
        <TouchableOpacity 
          style={[
            styles.btnLogin,
            isSmallScreen && styles.btnLoginSmall,
            isLargeScreen && styles.btnLoginLarge
          ]} 
          onPress={() => navigation.navigate('Connexion')}
        >
          <Text style={[
            styles.btnLoginText,
            isSmallScreen && styles.btnLoginTextSmall,
            isLargeScreen && styles.btnLoginTextLarge
          ]}>
            Connexion
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.btnSignup,
            isSmallScreen && styles.btnSignupSmall,
            isLargeScreen && styles.btnSignupLarge
          ]} 
          onPress={() => navigation.navigate('Inscription')}
        >
          <Text style={[
            styles.btnSignupText,
            isSmallScreen && styles.btnSignupTextSmall,
            isLargeScreen && styles.btnSignupTextLarge
          ]}>
            Inscription
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.select({
      ios: 30,
      android: 20,
      default: 25
    }),
    paddingHorizontal: 16,
  },
  header: { 
    alignItems: 'center',
    width: '100%',
    flexShrink: 1,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginTop: Platform.OS === 'ios' ? 10 : 16,
    marginBottom: 16,
  },
  logoSmall: {
    width: 70,
    height: 70,
    marginBottom: 12,
  },
  logoLarge: {
    width: 90,
    height: 90,
    marginBottom: 20,
  },
  title: {
    fontSize: scaleFont(36),
    fontWeight: '800',
    color: '#414d63',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  titleSmall: {
    fontSize: scaleFont(32),
    marginBottom: 8,
  },
  titleLarge: {
    fontSize: scaleFont(40),
    marginBottom: 12,
  },
  messageContainer: {
    alignItems: 'center',
    width: '100%',
  },
  subtitle: {
    fontSize: scaleFont(15),
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  subtitleSmall: {
    fontSize: scaleFont(13),
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  subtitleLarge: {
    fontSize: scaleFont(17),
    lineHeight: 24,
    paddingHorizontal: 24,
  },
  circleWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 1,
    marginVertical: 10,
  },
  outerPartner: {
    position: 'absolute',
    alignItems: 'center',
  },
  outerIconContainer: {
    position: 'relative',
  },
  outerIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f8faf9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  outerIconSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  outerIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3366',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeSmall: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    top: -6,
    right: -6,
    borderWidth: 1.5,
  },
  badgeLarge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    top: -10,
    right: -10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeTextSmall: {
    fontSize: 9,
  },
  badgeTextLarge: {
    fontSize: 13,
  },
  outerName: {
    marginTop: 8,
    fontSize: scaleFont(12.5),
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
  },
  outerNameSmall: {
    fontSize: scaleFont(11),
    marginTop: 6,
  },
  outerNameLarge: {
    fontSize: scaleFont(14),
    marginTop: 10,
  },
  centerPartner: { 
    alignItems: 'center' 
  },
  centerIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#414d63',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 14,
  },
  centerIconSmall: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  centerIconLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  centerName: {
    marginTop: 12,
    fontSize: scaleFont(14),
    fontWeight: '700',
    color: '#414d63',
  },
  centerNameSmall: {
    fontSize: scaleFont(12),
    marginTop: 10,
  },
  centerNameLarge: {
    fontSize: scaleFont(16),
    marginTop: 14,
  },
  buttons: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    paddingHorizontal: 10,
    marginTop: Platform.select({
      ios: 'auto',
      android: 10,
      default: 20
    }),
  },
  buttonsSmall: {
    gap: 10,
    paddingHorizontal: 8,
  },
  buttonsLarge: {
    gap: 18,
    paddingHorizontal: 12,
  },
  btnLogin: {
    flex: 1,
    height: 56,
    backgroundColor: '#414d63',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#414d63',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  btnLoginSmall: {
    height: 50,
    borderRadius: 12,
  },
  btnLoginLarge: {
    height: 62,
    borderRadius: 16,
  },
  btnLoginText: { 
    color: 'white', 
    fontSize: scaleFont(17), 
    fontWeight: '600' 
  },
  btnLoginTextSmall: {
    fontSize: scaleFont(15),
  },
  btnLoginTextLarge: {
    fontSize: scaleFont(19),
  },
  btnSignup: {
    flex: 1,
    height: 56,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSignupSmall: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  btnSignupLarge: {
    height: 62,
    borderRadius: 16,
    borderWidth: 2.5,
  },
  btnSignupText: { 
    color: '#414d63', 
    fontSize: scaleFont(17), 
    fontWeight: '600' 
  },
  btnSignupTextSmall: {
    fontSize: scaleFont(15),
  },
  btnSignupTextLarge: {
    fontSize: scaleFont(19),
  },
});

export default Bienvenue;