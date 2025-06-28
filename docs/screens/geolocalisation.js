import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StatusBar, Linking, Text, Vibration, Image, StyleSheet, Dimensions, Animated, Alert, TouchableOpacity, TextInput, FlatList, TouchableWithoutFeedback } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Sensors from 'expo-sensors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import WaveEmitter from './onde';

// Dimensions de l'écran
const { width, height } = Dimensions.get('window');

// Coordonnées initiales centrées sur la Côte d'Ivoire
const INITIAL_COORDS = [7.5399, -5.5471];
const INITIAL_ZOOM = 7;

export default function Geolocalisation({ navigation }) {
  // États pour la géolocalisation et les communes
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentCommune, setCurrentCommune] = useState(null);
  const [statusMessage, setStatusMessage] = useState('En attente de la position...');
  const [errorMsg, setErrorMsg] = useState(null);
  const [communes, setCommunes] = useState([]);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [activeTab, setActiveTab] = useState('famille');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [searchQuery3, setSearchQuery3] = useState('');
  const [searchQuery4, setSearchQuery4] = useState('');
  const [DataInteret, setDataInteret] = useState([]);
  const [PositionAppareils, setPositionAppareils] = useState([]);
  const [PositionFamilles, setPositionFamilles] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const webviewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [ZoneDangereuse, setZoneDangereuse] = useState([]);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fonction pour obtenir la commune via géocodage
  const getCommuneFromGeocoding = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'MyApp/1.0 (infoseric35@gmail.com)',
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const text = await response.text();
      const data = JSON.parse(text);
      if (data && data.address && data.address.city) {
        return { libelle_commune: data.address.city ?? data.address.town ?? data.address.village };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Erreur de géocodage:', error.message);
      if (error.message.includes('Unexpected character')) {
        console.warn('Réponse HTML reçue au lieu de JSON.');
      }
      return null;
    }
  };

  // Personnes ayant les mêmes intérêts
  const getPersonneInteret = async () => {
    const matricule = await AsyncStorage.getItem('matricule');
    if (!matricule) {
      console.warn('⚠️ Veuillez vous connecter pour accéder à cette fonctionnalité.');
      return;
    }
    try {
      const response = await fetch(`https://adores.cloud/api/liste-menace.php?matricule=${matricule}`);
      const result = await response.json();
      setDataInteret(result);
      setActiveTab('interets');
      setShowBottomSheet(true);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données.');
      console.error(error);
    }
  };

  // Appareils et familles
  const getPositionAppareil = async () => {
    const matricule = await AsyncStorage.getItem('matricule');
    if (!matricule) {
      Alert.alert('⚠️', 'Veuillez vous connecter pour accéder à cette fonctionnalité.');
      return;
    }
    try {
      const resAppareils = await fetch(`https://adores.cloud/api/liste-appareil.php?matricule=${matricule}`);
      const appareils = await resAppareils.json();
      setPositionAppareils(appareils);
      setActiveTab('appareils');
      setShowBottomSheet(true);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données.');
    }
  };

  const getPositionFamille = async () => {
    const matricule = await AsyncStorage.getItem('matricule');
    if (!matricule) {
      Alert.alert('⚠️', 'Veuillez vous connecter pour accéder à cette fonctionnalité.');
      return;
    }
    try {
      const resFamilles = await fetch(`https://adores.cloud/api/liste-famille.php?matricule=${matricule}`);
      const familles = await resFamilles.json();
      setPositionFamilles(familles);
      setActiveTab('famille');
      setShowBottomSheet(true);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données.');
    }
  };

  const afficherLocalisation = async (id) => {
    try {
      const res = await fetch(`https://adores.cloud/api/geoip-recherche.php?matricule=${encodeURIComponent(id)}`);
      const data = await res.json();
      const parsedData = data.map(loc => ({
        ...loc,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        color: loc.couleur || 'red',
      }));
      setSearchedLocation(parsedData);
      if (parsedData.length > 0) {
        const { latitude, longitude } = parsedData[0];
        const script = `
          if (typeof map !== 'undefined') {
            map.setView([${latitude}, ${longitude}], 16);
            if (window.searchedMarker) {
              map.removeLayer(window.searchedMarker);
            }
            window.searchedMarker = L.marker([${latitude}, ${longitude}])
              .addTo(map)
              .bindPopup('<strong>${(parsedData[0].nom_prenom || 'Localisation').replace(/'/g, "\\'")}</strong>')
              .openPopup();
          }
        `;
        webviewRef.current?.injectJavaScript(script);
        setSelectedLocation(parsedData[0]);
      } else {
        setSelectedLocation(null);
      }
    } catch {
      Alert.alert('Message', 'Localisation non trouvée');
      setSearchedLocation(null);
      setSelectedLocation(null);
    }
  };

  // Zones dangereuses
  const getZoneDangereuse = async () => {
    const matricule = await AsyncStorage.getItem('matricule');
    if (!matricule) {
      console.warn('⚠️ Veuillez vous connecter pour accéder aux alertes.');
      Alert.alert('Erreur', 'Matricule non configuré. Veuillez vous connecter.');
      return;
    }
    try {
      const response = await fetch(`https://adores.cloud/api/zone-dangereuse.php`);
      const data = await response.json();
      setZoneDangereuse(data);
    } catch (error) {
      setZoneDangereuse([]);
    }
  };

  // Configurer la géolocalisation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    let locationSubscription;
    const startContinuousTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission de localisation refusée');
        setStatusMessage('Permission de localisation refusée');
        Alert.alert('Permission refusée', "L'accès à la localisation est nécessaire.");
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          setLocation(position);

          const commune = await getCommuneFromGeocoding(latitude, longitude);
          if (commune) {
            setCurrentCommune(commune);
            setStatusMessage(`Vous êtes à ${commune.libelle_commune}`);
          } else {
            setCurrentCommune(null);
            setStatusMessage('Position actuelle');
          }

          const script = `
            if (typeof map !== 'undefined') {
              // Supprimer l'ancien marqueur s'il existe
              if (window.currentUserMarker) {
                map.removeLayer(window.currentUserMarker);
              }
              
              // Créer un nouveau marqueur
              window.currentUserMarker = L.marker([${latitude}, ${longitude}])
                .addTo(map)
                .bindPopup('<strong>Votre position</strong><br>Latitude: ${latitude}<br>Longitude: ${longitude}');
                
              ${ZoneDangereuse.map(alert => `
                L.marker([${alert.latitude_zone}, ${alert.longitude_zone}])
                  .addTo(map)
                  .bindPopup('<strong>${alert.adresse_zone || alert.ville_zone}</strong><br>${alert.observation_zone}');
              `).join('')}
            }
          `;
          webviewRef.current?.injectJavaScript(script);
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          setErrorMsg('Erreur de géolocalisation');
          setStatusMessage('Erreur de géolocalisation');
        }
      );
    };

    startContinuousTracking();
    getZoneDangereuse();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [fadeAnim]);

  // Fonction pour actualiser la localisation
  const refreshLocation = async () => {
    try {
      setStatusMessage('Actualisation en cours...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission refusée');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      const { latitude, longitude } = position.coords;
      setCurrentLocation({ latitude, longitude });
      setLocation(position);

      const commune = await getCommuneFromGeocoding(latitude, longitude);
      if (commune) {
        setCurrentCommune(commune);
        setStatusMessage(`Position actualisée - ${commune.libelle_commune}`);
      } else {
        setStatusMessage('Position actualisée');
      }

      // Recentrer seulement si l'utilisateur le demande explicitement
      const script = `
        if (typeof map !== 'undefined') {
          map.setView([${latitude}, ${longitude}], 16);
        }
      `;
      webviewRef.current?.injectJavaScript(script);

    } catch (error) {
      console.error('Erreur actualisation:', error);
      setStatusMessage("Erreur lors de l'actualisation");
      Alert.alert(
        'Erreur', 
        'Impossible de mettre à jour la position. Vérifiez votre connexion et les permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  // Alerte SOS
  useEffect(() => {
    let subscription;
    Sensors.Accelerometer.setUpdateInterval(100);
    subscription = Sensors.Accelerometer.addListener(({ x, y, z }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      if (acceleration > 2.5) {
        startCountdown();
      }
    });
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
    if (!location) {
      Alert.alert('Erreur', 'Localisation indisponible.');
      return;
    }

    const matricule = await AsyncStorage.getItem('matricule');
    if (!matricule) {
      console.warn('⚠️ Veuillez vous connecter pour accéder à cette fonctionnalité.');
      Alert.alert('Erreur', 'Matricule non configuré. Veuillez vous connecter.');
      return;
    }

    const userId = await AsyncStorage.getItem('userId');
    const pushToken = await AsyncStorage.getItem('pushToken');
    const sosData = {
      userId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      matricule,
      type: isAutomatic ? 'AUTO_SOS' : 'MANUAL_SOS',
      timestamp: new Date().toISOString(),
    };

    try {
      let alerts = JSON.parse(await AsyncStorage.getItem('sos_alerts')) || [];
      alerts.push(sosData);
      await AsyncStorage.setItem('sos_alerts', JSON.stringify(alerts));

      const url = `https://adores.cloud/api/position.php?latitude=${sosData.latitude}&longitude=${sosData.longitude}&matricule=${matricule}`;
      const response = await fetch(url);
      const json = await response.json();
      console.log('📤 Réponse API (SOS):', json);

      const circle = JSON.parse(await AsyncStorage.getItem('circle')) || [];
      for (const contact of circle) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Alerte SOS',
            body: `Alerte déclenchée par ${matricule} à ${sosData.latitude}, ${sosData.longitude}`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          to: contact.pushToken,
        });
      }
      Vibration.vibrate([500, 500, 500]);
      Alert.alert('Succès', 'Alerte envoyée à vos contacts et enregistrée.');
    } catch (error) {
      Alert.alert('Erreur', "Échec de l'envoi de l'alerte. Vérifiez votre connexion.");
      console.error('Erreur SOS:', error);
    }
  };

  const handleAutomaticSOS = () => {
    Alert.alert(
      'Chute détectée',
      'Voulez-vous envoyer une alerte SOS ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Envoyer', onPress: () => sendSOS(true) },
      ],
      { cancelable: false }
    );
  };

  // Filtrer les données
  const searchItems2 = useMemo(() => () => DataInteret.filter(item =>
    item.identite.toLowerCase().includes(searchQuery2.toLowerCase()) ||
    item.details.toLowerCase().includes(searchQuery2.toLowerCase())
  ), [DataInteret, searchQuery2]);

  const searchItems3 = useMemo(() => () => PositionFamilles.filter(item =>
    item.nom_prenom.toLowerCase().includes(searchQuery3.toLowerCase()) ||
    item.telephone.toLowerCase().includes(searchQuery3.toLowerCase())
  ), [PositionFamilles, searchQuery3]);

  const searchItems4 = useMemo(() => () => PositionAppareils.filter(item =>
    item.titre_appareil.toLowerCase().includes(searchQuery4.toLowerCase()) ||
    item.reference_appareil.toLowerCase().includes(searchQuery4.toLowerCase())
  ), [PositionAppareils, searchQuery4]);

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body { 
          margin: 0; 
          padding: 0; 
          width: 100%; 
          height: 100%; 
          overflow: hidden;
        }
        #map { 
          width: 100%; 
          height: 100%; 
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${INITIAL_COORDS[0]}, ${INITIAL_COORDS[1]}], ${INITIAL_ZOOM});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // Variable pour stocker le marqueur utilisateur
        let currentUserMarker = null;
        let searchedMarker = null;

        map.on('click', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapClick',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }));
        });

        map.whenReady(function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
        });
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <StatusBar backgroundColor="transparent" translucent />
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'mapReady') {
            setMapReady(true);
          }
        }}
        style={styles.map}
      />
      <View style={styles.overlayContent}>
        <View style={styles.statusBox}>
          <Text style={[currentCommune ? styles.statusText : styles.statusTextError]}>{statusMessage}</Text>
        </View>
        <TouchableOpacity onLongPress={startCountdown}>
          {ZoneDangereuse.length > 0 ? (
            <WaveEmitter color="#FF3B30" />
          ) : (
            <WaveEmitter />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal pour alerte SOS */}
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

      {/* Bottom Sheet pour appareils, familles et intérêts */}
      <Modal
        isVisible={showBottomSheet}
        onBackdropPress={() => setShowBottomSheet(false)}
        style={styles.bottomSheet}
        backdropOpacity={0.5}
      >
        <View style={styles.bottomSheetContent}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'famille' && styles.activeTab]}
              onPress={() => setActiveTab('famille')}
            >
              <Text style={[styles.tabText, activeTab === 'famille' && styles.tabActiveText]}>Familles</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'appareils' && styles.activeTab]}
              onPress={() => setActiveTab('appareils')}
            >
              <Text style={[styles.tabText, activeTab === 'appareils' && styles.tabActiveText]}>Appareils</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'interets' && styles.activeTab]}
              onPress={() => setActiveTab('interets')}
            >
              <Text style={[styles.tabText, activeTab === 'interets' && styles.tabActiveText]}>Menaces</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder={`Rechercher ${activeTab === 'famille' ? 'une famille' : activeTab === 'appareils' ? 'un appareil' : 'une menace'}...`}
            value={activeTab === 'famille' ? searchQuery3 : activeTab === 'appareils' ? searchQuery4 : searchQuery2}
            onChangeText={text => {
              if (activeTab === 'famille') setSearchQuery3(text);
              else if (activeTab === 'appareils') setSearchQuery4(text);
              else setSearchQuery2(text);
            }}
          />
          <FlatList
            data={
              activeTab === 'famille'
                ? (searchQuery3 ? searchItems3() : PositionFamilles)
                : activeTab === 'appareils'
                ? (searchQuery4 ? searchItems4() : PositionAppareils)
                : (searchQuery2 ? searchItems2() : DataInteret)
            }
            keyExtractor={item => item.matricule || item.code_appareil || item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.eventItem}
                onPress={() => {
                  if (activeTab === 'famille') afficherLocalisation(item.matricule);
                  if (activeTab === 'appareils') afficherLocalisation(item.code_appareil);
                  if (activeTab === 'interets') Alert.alert('A lire', item.details);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.cardIcon}>
                    {item.photo64 ? (
                      <Image
                        source={{ uri: `data:${item.type};base64,${item.photo64}` }}
                        style={styles.markerImage}
                      />
                    ) : activeTab === 'appareils' ? (
                      <MaterialCommunityIcons color="blue" name="laptop" size={35} />
                    ) : (
                      <Image
                        source={require('../assets/user.jpg')}
                        style={styles.markerImage}
                      />
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.eventTitle}>
                      {item.nom_prenom || item.titre_appareil || item.identite}
                    </Text>
                    {activeTab === 'famille' ? (
                      <Text style={styles.eventDescription}>Tel : {item.telephone}</Text>
                    ) : activeTab === 'appareils' ? (
                      <Text style={styles.eventDescription}>{item.reference_appareil}</Text>
                    ) : (
                      <>
                        <Text style={styles.eventDescription}>{item.details}</Text>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.noEvents}>Aucun résultat</Text>}
            style={styles.eventList}
          />
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowBottomSheet(false)}>
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Boutons flottants alignés à droite */}
      <View style={styles.floatingButtonsContainer}>
        <TouchableOpacity
          style={styles.floatingButtonMiddle}
          onPress={() => {
            getPositionFamille();
            getPositionAppareil();
            getPersonneInteret();
          }}
        >
          <Feather name="search" size={24} color="black" />
        </TouchableOpacity>
         <TouchableOpacity
          style={styles.floatingButtonMiddle}
          onPress={() => navigation.navigate("Detecteur de vitesse")}
        >
          <Feather name="shield" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButtonMiddle}
          onPress={() => navigation.navigate("Detecteur magnetique")}
        >
          <Feather name="activity" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButtonMiddle}
          onPress={() => navigation.navigate("Zone dangereuse")}
        >
          <Feather name="shield" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButtonTop}
          onPress={() => handleAutomaticSOS()}
        >
          <Feather name="alert-triangle" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButtonBottom}
          onPress={refreshLocation}
        >
          <Feather name="refresh-cw" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  statusBox: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
  },
  statusTextError: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC3545',
    textAlign: 'center',
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: '#555',
    marginTop: '50%',
  },
  floatingButtonsContainer: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    alignItems: 'flex-end',
  },
  floatingButtonTop: {
    backgroundColor: '#FF3B30',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 3,
    marginBottom: 15,
  },
  floatingButtonMiddle: {
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 3,
    marginBottom: 15,
  },
  floatingButtonBottom: {
    backgroundColor: '#007bff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 3,
  },
  overlayContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bottomSheet: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  bottomSheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tabActiveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  eventList: {
    maxHeight: 200,
  },
  eventItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 70,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDescription: {
    fontSize: 14,
    color: '#555',
  },
  noEvents: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  closeButton: {
    backgroundColor: '#007bff',
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  markerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userInfo: { flex: 1 },
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