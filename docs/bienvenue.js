import React, { useRef, useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalContext } from '../global/GlobalState';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const { width } = Dimensions.get('window');
const CIRCLE_DIAMETER = Math.min(width * 0.92, 420);
const RADIUS = CIRCLE_DIAMETER * 0.42;

const partners = [
  { name: 'Publicités', src: "Publicites", icon: 'bullhorn' },
  { name: 'Avis de recherche', src: "Avis de recherche", icon: 'search' },
  { name: 'Badge commercial', src: "Badge commercial", icon: 'id-card' },
  { name: 'Catalogues', src: "Chaines", icon: 'book' },
  { name: 'Je cherche', src: "Je cherche", icon: 'question-circle' },
  { name: 'Partenaires', src: "Je cherche", icon: 'handshake' },
  { name: 'Rouah Pro', src: "Rouah Pro", icon: 'home', isCenter: true },
];

const Bienvenue = ({ navigation }) => {
  const [count, setCount] = useState(0);           // Publicités
  const [countAvis, setCountAvis] = useState(0);   // Avis de recherche
  const [countArticle, setCountArticle] = useState(0); // Catalogues
  const [countOutils, setCountOutils] = useState(0);   // Badge commercial

  const [currentMessage, setCurrentMessage] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  const [versets, setVersets] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // === NOTIFICATIONS PUSH (100% conservé) ===
  const registerForPushNotificationsAsync = async () => {
    // Ton code original complet → inchangé
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

      const response = await fetch('https://rouah.net/api/save-token.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utilisateur_id, push_token: token }),
      });
      const result = await response.json();

      if (result.success || result.error === 'utilisateur ou token manquant') {
        await AsyncStorage.setItem('pushToken', token);
      }
      return token;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => { registerForPushNotificationsAsync(); }, []);

  // === COMPTEURS EN TEMPS RÉEL (inchangé) ===
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

  // === VERSETS BIBLIQUES (100% conservé) ===
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

    const showNextVerse = () => {
      setCurrentMessage(versets[currentIndex]);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
        ]),
        Animated.delay(60000),
        Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start(() => {
        scaleAnim.setValue(0.5);
        setCurrentIndex((prev) => (prev + 1) % versets.length);
      });
    };

    showNextVerse();
  }, [currentIndex, versets]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/logo-original.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Rouah</Text>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          {currentMessage && (
            <Text style={styles.subtitle} numberOfLines={3}>
              {currentMessage}
            </Text>
          )}
        </Animated.View>
      </View>

      <View style={[styles.circleWrapper, { width: CIRCLE_DIAMETER, height: CIRCLE_DIAMETER }]}>
        {partners.map((partner, index) => {
          if (partner.isCenter) {
            return (
              <TouchableOpacity
                key={index}
                style={styles.centerPartner}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(partner.src)}
              >
                <View style={styles.centerIcon}>
                  <Icon name={partner.icon} size={34} color="white" />
                </View>
                <Text style={styles.centerName}>{partner.name}</Text>
              </TouchableOpacity>
            );
          }

          const angle = index * 60 - 90;
          const radians = (angle * Math.PI) / 180;
          const x = RADIUS * Math.cos(radians);
          const y = RADIUS * Math.sin(radians);

          // === DÉTERMINATION DU BADGE ===
          let badgeCount = 0;
          if (partner.name === 'Publicités') badgeCount = count;
          if (partner.name === 'Avis de recherche') badgeCount = countAvis;
          if (partner.name === 'Catalogues') badgeCount = countArticle;
          if (partner.name === 'Badge commercial') badgeCount = countOutils;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.outerPartner, { transform: [{ translateX: x }, { translateY: y }] }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(partner.src)}
            >
              <View style={styles.outerIconContainer}>
                <View style={styles.outerIcon}>
                  <Icon name={partner.icon} size={26} color="#414d63" />
                </View>
                {badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.outerName}>{partner.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.btnLogin} onPress={() => navigation.navigate('Connexion')}>
          <Text style={styles.btnLoginText}>Connexion</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSignup} onPress={() => navigation.navigate('Inscription')}>
          <Text style={styles.btnSignupText}>Inscription</Text>
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
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  header: { alignItems: 'center' },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#414d63',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  circleWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerPartner: {
    position: 'absolute',
    alignItems: 'center',
    width: 100,
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
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  outerName: {
    marginTop: 10,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
  },
  centerPartner: { alignItems: 'center' },
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
  centerName: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#414d63',
  },
  buttons: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    paddingHorizontal: 10,
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
  btnLoginText: { color: 'white', fontSize: 17, fontWeight: '600' },
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
  btnSignupText: { color: '#414d63', fontSize: 17, fontWeight: '600' },
});

export default Bienvenue;