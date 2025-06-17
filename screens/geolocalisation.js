import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Linking,Text,Image, StyleSheet, Dimensions, Animated, Alert, TouchableOpacity, Modal, TextInput, FlatList, TouchableWithoutFeedback } from 'react-native';
import MapView, { Marker, Polygon, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WaveEmitter from './onde';

// Dimensions de l'écran
const { width, height } = Dimensions.get('window');

// Constante pour convertir km en degrés
const KM_TO_DEGREES = 1 / 111; // 1 km ≈ 0.009 degrés
const margin = 0.009; // 1 km de marge

// Fonction pour calculer le centroïde et les limites d'une commune
const calculateBounds = (coordinates) => {
  const latitudes = coordinates.map(coord => coord.latitude);
  const longitudes = coordinates.map(coord => coord.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  return {
    center: { latitude: centerLat, longitude: centerLon },
    region: {
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: (maxLat - minLat) + 2 * margin,
      longitudeDelta: (maxLon - minLon) + 2 * margin,
    },
  };
};

// Fonction pour vérifier si un point est à l'intérieur d'un polygone (ray-casting)
const isPointInPolygon = (point, polygon) => {
  const { latitude: y, longitude: x } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};


export default function Geolocalisation() {
  // États pour la géolocalisation et les communes
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentCommune, setCurrentCommune] = useState(null);
  const [statusMessage, setStatusMessage] = useState('En attente de la position...');
  const [errorMsg, setErrorMsg] = useState(null);
  const [communes, setCommunes] = useState([]);
  const [mapRegion, setMapRegion] = useState(null);
  const [showInfoDetails, setShowInfoDetails] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showFamillyModal, setShowFamillyModal] = useState(false);
  const [showLaptopModal, setShowLaptopModal] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  // Interets
  const [DataInteret, setDataInteret] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  // Famille
  const [DataFamille, setDataFamille] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Positions
  const [PositionAppareils, setPositionAppareils] = useState([]);
  const [PositionFamilles, setPositionFamilles] = useState([]);
  const [searchQuery3, setSearchQuery3] = useState('');
  const [searchQuery4, setSearchQuery4] = useState('');
  // Location
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [searchedLocation, setSearchedLocation] = useState(null);
  const mapRef = useRef(null);

  // Animation pour la boîte d'informations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Charger les données des communes depuis l'API
  useEffect(() => {
     const updateData = () => {
      fetchCommunes();
      getFamille();
    };
    updateData();
    const intervalId = setInterval(updateData, 1000);
    return () => clearInterval(intervalId);

  }, []);

  // fonctions pour les communes
      const fetchCommunes = async () => {
      try {
        const response = await fetch('https://adores.cloud/api/commune.php');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const formattedCommunes = data
          .filter(commune => Array.isArray(commune.geojson_polygone) && commune.geojson_polygone.length > 0)
          .map(commune => ({
            ...commune,
            coordinates: commune.geojson_polygone.map(([longitude, latitude]) => ({
              latitude,
              longitude,
            })),
          }));

        if (formattedCommunes.length === 0) {
          throw new Error('Aucune commune valide trouvée');
        }

        setCommunes(formattedCommunes);
      } catch (error) {
        console.error('Erreur lors du chargement des communes:', error);
        setErrorMsg(`Erreur lors du chargement des communes : ${error.message}`);
        Alert.alert('Erreur', `Impossible de charger les données des communes : ${error.message}`);
      }
    };

    // Personnes ayant les memes interets
    const getPersonneInteret = async () => {
      // variable
      const matricule = await AsyncStorage.getItem('matricule');
              if (!matricule) {
                console.warn('⚠️ Matricule non trouvé.');
                return;
              }
        try {
          const response = await fetch(`https://adores.cloud/api/centre-interet-geoip.php?matricule=${matricule}`);
          const result = await response.json();
          setDataInteret(result);
          setShowFriendsModal(true);
        } catch (error) {
          Alert.alert('Erreur', 'Impossible de charger les données.');
          console.error(error);
        }
      };

      // fonction pour affichage de la famille
      const getFamille = async () => {
          try {
            const response = await fetch('https://adores.cloud/api/geoip-user.php');
            const result = await response.json();
            setDataFamille(result);
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de charger les données.');
            console.error(error);
          }
        };

        // Appareil et familles
         const getPositionAppareil = async () => {
           // variable
      const matricule = await AsyncStorage.getItem('matricule');
              if (!matricule) {
                Alert.alert('⚠️','Matricule non trouvé.');
                return;
              }else{ 
            try {
              const resAppareils = await fetch(`https://adores.cloud/api/liste-appareil.php?matricule=${matricule}`);
              const appareils = await resAppareils.json();
              setPositionAppareils(appareils);
              setShowLaptopModal(true);
            } catch (error) {
              Alert.alert("Erreur", "Impossible de charger les données.");
            }
            }
          };

           const getPositionFamille = async () => {
           // variable
      const matricule = await AsyncStorage.getItem('matricule');
              if (!matricule) {
                Alert.alert('⚠️','Matricule non trouvé.');
                return;
              }else{ 
            try {        
              const resFamilles = await fetch(`https://adores.cloud/api/liste-famille.php?matricule=${matricule}`);
              const familles = await resFamilles.json();
              setPositionFamilles(familles);
              setShowFamillyModal(true);
            } catch (error) {
              Alert.alert("Erreur", "Impossible de charger les données.");
            }
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
      
      // Animation pour zoomer sur la position
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
      
      setSelectedLocation(parsedData[0]); // Sélectionner le premier marqueur
    } else {
      setSelectedLocation(null);
    }
  } catch {
    Alert.alert('Message', 'Localisation non trouvée');
    setSearchedLocation(null);
    setSelectedLocation(null);
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
        Alert.alert('Permission refusée', 'L’accès à la localisation est nécessaire.');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });

          let foundCommune = null;
          for (const commune of communes) {
            if (commune.coordinates && isPointInPolygon({ latitude, longitude }, commune.coordinates)) {
              foundCommune = commune;
              break;
            }
          }

          if (foundCommune && (!currentCommune || currentCommune.libelle_commune !== foundCommune.libelle_commune)) {
            setCurrentCommune(foundCommune);
            setStatusMessage(`Vous êtes à ${foundCommune.libelle_commune} ! 🎉`);
            //Alert.alert('Bienvenue', `Vous êtes à ${foundCommune.libelle_commune} !`);
            const { region } = calculateBounds(foundCommune.coordinates);
            setMapRegion(region);
          } else if (!foundCommune && currentCommune) {
            setCurrentCommune(null);
            setStatusMessage('Vous êtes en dehors des communes.');
            //Alert.alert('Sortie', 'Vous avez quitté la commune.');
            if (communes.length > 0) {
              const { region } = calculateBounds(communes[0].coordinates);
              setMapRegion(region);
            }
          } else if (foundCommune) {
            setStatusMessage(`Vous êtes à ${foundCommune.libelle_commune} !`);
          } else {
            setStatusMessage('Vous êtes en dehors des communes.');
          }
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          setErrorMsg('Erreur de géolocalisation');
          setStatusMessage('Erreur de géolocalisation');
        }
      );
    };

    startContinuousTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [communes, currentCommune, fadeAnim]);

  // Fonction pour demander et actualiser la localisation
  const startLocationTracking = async (setCurrentLocation, setStatusMessage, setErrorMsg, setCurrentCommune, communes, setMapRegion, currentCommune) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission de localisation refusée');
      setStatusMessage('Permission de localisation refusée');
      Alert.alert('Permission refusée', 'Veuillez activer la localisation dans les paramètres de votre appareil.');
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;
      setCurrentLocation({ latitude, longitude });
      setStatusMessage('Position actualisée !');

      let foundCommune = null;
      for (const commune of communes) {
        if (commune.coordinates && isPointInPolygon({ latitude, longitude }, commune.coordinates)) {
          foundCommune = commune;
          break;
        }
      }

      if (foundCommune && (!currentCommune || currentCommune.libelle_commune !== foundCommune.libelle_commune)) {
        setCurrentCommune(foundCommune);
        setStatusMessage(`Vous êtes à ${foundCommune.libelle_commune} ! 🎉`);
        //Alert.alert('Bienvenue', `Vous êtes à ${foundCommune.libelle_commune} !`);
        const { region } = calculateBounds(foundCommune.coordinates);
        setMapRegion(region);
      } else if (!foundCommune && currentCommune) {
        setCurrentCommune(null);
        setStatusMessage('Vous êtes en dehors des communes.');
        //Alert.alert('Sortie', 'Vous avez quitté la commune.');
        if (communes.length > 0) {
          const { region } = calculateBounds(communes[0].coordinates);
          setMapRegion(region);
        }
      } else if (foundCommune) {
        setStatusMessage(`Vous êtes à ${foundCommune.libelle_commune} !`);
      } else {
        setStatusMessage('Vous êtes en dehors des communes.');
      }
    } catch (error) {
      console.error('Erreur de géolocalisation:', error);
      setErrorMsg('Erreur de géolocalisation');
      setStatusMessage('Erreur de géolocalisation');
      Alert.alert('Erreur', 'Impossible de récupérer la position GPS.');
    }
  };



  // Filtrer les événements selon la recherche
    const searchItems = useMemo(() => {
      return () => {
      const filteredData = events.filter(item =>
        item.titre_evenement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description_evenement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.horaire_evenement.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return filteredData;
  };
  }, [events, searchQuery]);
  // api recherche

  // Filtrer les amis selon la recherche
    const searchItems2 = useMemo(() => {
      return () => {
      const filteredData2 = DataInteret.filter(item =>
        item.nom_prenom.toLowerCase().includes(searchQuery2.toLowerCase()) ||
        String(item.nb_interets_communs_detectes).includes(searchQuery2.toLowerCase()) ||
        item.interets_communs_categories.toLowerCase().includes(searchQuery2.toLowerCase())
      );
      return filteredData2;
  };
  }, [DataInteret, searchQuery2]);
  // api recherche

   // Filtrer les amis selon la recherche
    const searchItems3 = useMemo(() => {
      return () => {
      const filteredData3 = PositionFamilles.filter(item =>
        item.nom_prenom.toLowerCase().includes(searchQuery3.toLowerCase()) ||
        item.telephone.toLowerCase().includes(searchQuery3.toLowerCase())
      );
      return filteredData3;
  };
  }, [PositionFamilles, searchQuery3]);
  // api recherche

    // Filtrer les amis selon la recherche
    const searchItems4 = useMemo(() => {
      return () => {
      const filteredData4 = PositionAppareils.filter(item =>
        item.titre_appareil.toLowerCase().includes(searchQuery4.toLowerCase()) ||
        item.reference_appareil.toLowerCase().includes(searchQuery4.toLowerCase())
      );
      return filteredData4;
  };
  }, [PositionAppareils, searchQuery4]);
  // api recherche

  // api recherche famille 
  const filteredPeople = DataFamille.filter(
    item =>
      (item?.nom_prenom &&
        item.nom_prenom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item?.telephone &&
        item.telephone.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  // api recherche

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      <MapView
        ref={mapRef}
        style={styles.map}
        region={mapRegion}
        showsUserLocation={true}
      >
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          subdomains="abc"
        />

        {communes
          .filter(commune => commune.coordinates && commune.coordinates.length > 0)
          .map((commune, index) => (
            <Polygon
              key={index}
              coordinates={commune.coordinates}
              fillColor={commune.couleur_fond || 'rgba(0, 0, 255, 0.3)'}
              strokeColor={commune.couleur_contours || '#000'}
              strokeWidth={2}
              tappable={true} // Activer l'interaction
            />
          ))}
        {currentCommune && currentCommune.coordinates && (
          <Marker
            coordinate={calculateBounds(currentCommune.coordinates).center}
            title={`Centre de ${currentCommune.libelle_commune}`}
            description={currentCommune.libelle_commune}
            pinColor="blue"
          />
        )}

        {filteredPeople.map(person => {
                  const latitude = parseFloat(person.latitude);
                  const longitude = parseFloat(person.longitude);
        
                  if (isNaN(latitude) || isNaN(longitude)) return null;
        
                  return (
                    <Marker
                      key={person.id_geoip}
                      coordinate={{ latitude, longitude }}
                      title={person.nom_prenom}
                      description={person.telephone}
                      onPress={() => setSelectedPerson(person)}
                    >
                      {person.photo64 ? (
                      <Image
                          source={{ uri: `data:${person.type};base64,${person.photo64}` }}
                          style={styles.markerImage}
                      />
                      ) : (
                      <Image
                        source={require('../assets/user.jpg')}
                        style={styles.markerImage}
                      />
                     )}
                    </Marker>
                  );
                })}
      </MapView>
      

      <View style={styles.overlayContent}>
        <View style={[styles.statusBox]}>
          <Text style={[currentCommune ? styles.statusText : styles.statusTextError]}>{statusMessage}</Text>
        </View>
        <View><WaveEmitter/></View>
      </View>

      

      {showInfoDetails && currentCommune && (
      
        <View style={styles.searchBar}>
              <Feather name="search" size={20} color="gray" style={styles.searchIcon} />
              <TextInput
                style={styles.input}
                placeholder="Rechercher nom ou téléphone..."
                onChangeText={setSearchTerm}
                value={searchTerm}
                autoCorrect={false}
                autoCapitalize="none"
                keyboardType="default"
              />
            </View>
        
      )}


       {/* Modal pour afficher les amis */}
      <Modal
  animationType="slide"
  transparent={true}
  visible={showFriendsModal} // Utiliser showFriendsModal au lieu de !!DataInteret
  onRequestClose={() => setShowFriendsModal(false)}
>
  <TouchableWithoutFeedback onPress={() => setShowFriendsModal(false)}>
    <View style={styles.modalOverlay}>
      <TouchableWithoutFeedback>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Intérêts communs
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un ami..."
            value={searchQuery2}
            onChangeText={setSearchQuery2}
          />
          <FlatList
            data={searchQuery2 ? searchItems2() : DataInteret}
            keyExtractor={item => item.matricule}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.eventItem} onPress={()=> Linking.openURL(`tel:${item.telephone}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.cardIcon}>
                 {item.photo64 ? (
                      <Image
                          source={{ uri: `data:${item.type};base64,${item.photo64}` }}
                          style={styles.markerImage}
                      />
                      ) : (
                      <Image
                        source={require('../assets/user.jpg')}
                        style={styles.markerImage}
                      />
                     )}
                </View>
                <View style={styles.userInfo}>
                <Text style={styles.eventTitle}>{item.nom_prenom}</Text>
                <Text style={styles.eventDescription}>Communs : {item.nb_interets_communs_detectes} intérêt(s)</Text>
                <Text style={styles.eventDate}>{item.interets_communs_categories}</Text>
                </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.noEvents}>Aucun ami trouvé</Text>}
            style={styles.eventList}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFriendsModal(false)}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>

 {/* Modal pour afficher le famille */}
      <Modal
  animationType="slide"
  transparent={true}
  visible={showFamillyModal} // Utiliser showFriendsModal au lieu de !!DataInteret
  onRequestClose={() => setShowFamillyModal(false)}
>
  <TouchableWithoutFeedback onPress={() => setShowFamillyModal(false)}>
    <View style={styles.modalOverlay}>
      <TouchableWithoutFeedback>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Familles & Amis
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une famille..."
            value={searchQuery3}
            onChangeText={setSearchQuery3}
          />
          <FlatList
            data={searchQuery3 ? searchItems3() : PositionFamilles}
            keyExtractor={item => item.matricule}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.eventItem} onPress={() => afficherLocalisation(item.matricule)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.cardIcon}>
                 {item.photo64 ? (
                      <Image
                          source={{ uri: `data:${item.type};base64,${item.photo64}` }}
                          style={styles.markerImage}
                      />
                      ) : (
                      <Image
                        source={require('../assets/user.jpg')}
                        style={styles.markerImage}
                      />
                     )}
                </View>
                <View style={styles.userInfo}>
                <Text style={styles.eventTitle}>{item.nom_prenom}</Text>
                <Text style={styles.eventDescription}>Tel : {item.telephone}</Text>
                </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.noEvents}>Aucun résultat</Text>}
            style={styles.eventList}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFamillyModal(false)}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>

 {/* Modal pour afficher les appareils */}
      <Modal
  animationType="slide"
  transparent={true}
  visible={showLaptopModal} // Utiliser showFriendsModal au lieu de !!DataInteret
  onRequestClose={() => setShowLaptopModal(false)}
>
  <TouchableWithoutFeedback onPress={() => setShowLaptopModal(false)}>
    <View style={styles.modalOverlay}>
      <TouchableWithoutFeedback>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Mes appareils
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un appareil..."
            value={searchQuery4}
            onChangeText={setSearchQuery4}
          />
          <FlatList
            data={searchQuery4 ? searchItems4() : PositionAppareils}
            keyExtractor={item => item.code_appareil}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.eventItem} onPress={() => afficherLocalisation(item.code_appareil)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.cardIcon}>
                 <MaterialCommunityIcons color="blue" name="laptop" size={35} />
                </View>
                <View style={styles.userInfo}>
                <Text style={styles.eventTitle}>{item.titre_appareil}</Text>
                <Text style={styles.eventDescription}>{item.reference_appareil}</Text>
                </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.noEvents}>Aucun résultat</Text>}
            style={styles.eventList}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowLaptopModal(false)}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>

      {/* Boutons flottants alignés à droite */}
<View style={styles.floatingButtonsContainer}>
  
  <TouchableOpacity
    style={styles.floatingButtonTop}
    onPress={() => setShowInfoDetails(!showInfoDetails)}
  >
    <Feather name="search" size={24} color="black" />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.floatingButtonMiddle}
    onPress={getPersonneInteret}
  >
    <Feather name="users" size={24} color="black" />
  </TouchableOpacity>

   <TouchableOpacity
    style={styles.floatingButtonMiddle}
    onPress={getPositionAppareil}
  >
    <Feather name="monitor" size={24} color="black" />
  </TouchableOpacity>

   <TouchableOpacity
    style={styles.floatingButtonMiddle}
    onPress={getPositionFamille}
  >
    <Feather name="home" size={24} color="black" />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.floatingButtonBottom}
    onPress={() => startLocationTracking(
      setCurrentLocation,
      setStatusMessage,
      setErrorMsg,
      setCurrentCommune,
      communes,
      setMapRegion,
      currentCommune
    )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'gray',
    paddingHorizontal: 8,
    margin: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  infoBox: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 6,
    textAlign: 'center',
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
  statusIn: {
    backgroundColor: '#28A745',
  },
  statusOut: {
    backgroundColor: '#DC3545',
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
  marginBottom: 15, // Espace entre les boutons
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
  marginBottom: 15, // Espace entre les boutons
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
    paddingTop: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
   eventList: {
    maxHeight: 300, // Hauteur maximale pour 4 éléments (ajustez selon la taille des éléments)
  },
  eventListContent: {
    paddingBottom: 10, // Espace en bas pour un défilement fluide
  },
  eventItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 70, // Hauteur fixe pour prévoir 4 éléments dans maxHeight
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDescription: {
    fontSize: 14,
    color: '#555',
  },
  eventDate: {
    fontSize: 12,
    color: '#888',
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
  // Images
  markerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth:1,
    borderColor:"blue"
  },
  cardIcon: {
    width: 46, height: 46, 
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 10,
  },
   userInfo: { flex: 1 },

});