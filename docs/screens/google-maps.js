import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Modal,
  SafeAreaView,
  Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons, FontAwesome, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const INITIAL_POSITION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

export default function GoogleMapsApp() {
  // États principaux
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [region, setRegion] = useState(INITIAL_POSITION);
  const [selectedTransportMode, setSelectedTransportMode] = useState('car');
  const [fromLocation, setFromLocation] = useState('Ma position');
  const [toLocation, setToLocation] = useState('');

  // Références
  const mapRef = useRef(null);
  const bottomPanelHeight = useRef(new Animated.Value(0)).current;
  const searchPanelHeight = useRef(new Animated.Value(0)).current;

  // Données simulées
  const searchSuggestions = [
    { id: 1, name: 'Tour Eiffel', address: 'Champ de Mars, Paris', type: 'monument', latitude: 48.8584, longitude: 2.2945 },
    { id: 2, name: 'Louvre Museum', address: 'Rue de Rivoli, Paris', type: 'museum', latitude: 48.8606, longitude: 2.3376 },
    { id: 3, name: 'Notre-Dame', address: 'Île de la Cité, Paris', type: 'church', latitude: 48.8530, longitude: 2.3499 },
    { id: 4, name: 'Arc de Triomphe', address: 'Place Charles de Gaulle, Paris', type: 'monument', latitude: 48.8738, longitude: 2.2950 },
    { id: 5, name: 'Café de Flore', address: 'Boulevard Saint-Germain, Paris', type: 'café', latitude: 48.8540, longitude: 2.3329 },
  ];

  const savedPlaces = [
    { id: 1, name: 'Tour Eiffel', address: 'Champ de Mars, Paris', rating: 4.5, image: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=300', isFavorite: true, latitude: 48.8584, longitude: 2.2945 },
    { id: 2, name: 'Le Comptoir du Relais', address: '9 Carrefour de l\'Odéon, Paris', rating: 4.7, image: 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=300', isFavorite: true, latitude: 48.8525, longitude: 2.3394 },
    { id: 3, name: 'Musée du Louvre', address: 'Rue de Rivoli, Paris', rating: 4.6, image: 'https://images.pexels.com/photos/2675266/pexels-photo-2675266.jpeg?auto=compress&cs=tinysrgb&w=300', isFavorite: false, latitude: 48.8606, longitude: 2.3376 },
  ];

  const transportModes = [
    { id: 'car', name: 'Voiture', icon: 'directions-car', color: '#1976D2' },
    { id: 'transit', name: 'Transport', icon: 'directions-bus', color: '#4CAF50' },
    { id: 'bike', name: 'Vélo', icon: 'directions-bike', color: '#FF9800' },
    { id: 'walk', name: 'À pied', icon: 'directions-walk', color: '#9C27B0' },
  ];

  // Fonctions utilitaires
  const handleSearch = (query) => {
    setSearchQuery(query);
    setShowSearchResults(query.length > 0);
    animateSearchPanel(query.length > 0);
  };

  const selectLocation = (location) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setShowSearchResults(false);
    animateSearchPanel(false);
    animateBottomPanel(true);
    
    // Centrer la carte sur le lieu sélectionné
    mapRef.current.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    }, 500);
  };

  const closeLocationDetails = () => {
    setSelectedLocation(null);
    animateBottomPanel(false);
  };

  const animateBottomPanel = (show) => {
    Animated.spring(bottomPanelHeight, {
      toValue: show ? 320 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 10,
    }).start();
  };

  const animateSearchPanel = (show) => {
    Animated.spring(searchPanelHeight, {
      toValue: show ? height * 0.6 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 10,
    }).start();
  };

  const focusOnUserLocation = () => {
    // En production, vous utiliseriez la géolocalisation réelle
    mapRef.current.animateToRegion(INITIAL_POSITION, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Carte principale */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_POSITION}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        customMapStyle={mapStyle}
      >
        {/* Marqueurs sur la carte */}
        {searchSuggestions.map(marker => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            onPress={() => selectLocation(marker)}
          >
            <View style={[
              styles.markerContainer,
              selectedLocation?.id === marker.id && styles.selectedMarkerContainer
            ]}>
              <MaterialIcons 
                name="location-on" 
                size={selectedLocation?.id === marker.id ? 32 : 24} 
                color={selectedLocation?.id === marker.id ? '#FF5252' : '#1976D2'} 
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header avec recherche */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={() => setShowProfile(true)}
        >
          <MaterialIcons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={22} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un lieu"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Panneau de résultats de recherche */}
      <Animated.View style={[styles.searchPanel, { height: searchPanelHeight }]}>
        <ScrollView 
          style={styles.searchResults}
          keyboardShouldPersistTaps="handled"
        >
          {searchSuggestions
            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(suggestion => (
              <TouchableOpacity
                key={suggestion.id}
                style={styles.suggestionItem}
                onPress={() => selectLocation(suggestion)}
              >
                <MaterialIcons name="location-on" size={24} color="#1976D2" />
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionName}>{suggestion.name}</Text>
                  <Text style={styles.suggestionAddress}>{suggestion.address}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#ccc" />
              </TouchableOpacity>
            ))}
        </ScrollView>
      </Animated.View>

      {/* Contrôles de la carte */}
      <View style={styles.mapControls}>
        {/* Bouton de géolocalisation */}
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={focusOnUserLocation}
        >
          <MaterialIcons name="my-location" size={22} color="#1976D2" />
        </TouchableOpacity>

        {/* Boutons d'action rapide */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickActionButton, styles.directionsButton]}
            onPress={() => setShowDirections(true)}
          >
            <MaterialIcons name="directions" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, styles.savedButton]}
            onPress={() => setShowSavedPlaces(true)}
          >
            <MaterialIcons name="bookmark" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Panneau d'informations du lieu sélectionné */}
      <Animated.View style={[styles.bottomPanel, { height: bottomPanelHeight }]}>
        {selectedLocation && (
          <View style={styles.locationDetails}>
            <ScrollView>
              <View style={styles.locationHeader}>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{selectedLocation.name}</Text>
                  <Text style={styles.locationAddress}>{selectedLocation.address}</Text>
                  {selectedLocation.rating && (
                    <View style={styles.ratingContainer}>
                      <FontAwesome name="star" size={16} color="#FFD700" />
                      <Text style={styles.ratingText}>{selectedLocation.rating}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={closeLocationDetails} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <Image 
                source={{ uri: `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${selectedLocation.latitude},${selectedLocation.longitude}&fov=80&heading=70&pitch=0&key=YOUR_API_KEY` }} 
                style={styles.locationImage}
                defaultSource={require('../assets/logo.png')}
              />

              <View style={styles.locationActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialIcons name="directions" size={24} color="#1976D2" />
                  <Text style={styles.actionText}>Itinéraire</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialIcons name="call" size={24} color="#4CAF50" />
                  <Text style={styles.actionText}>Appeler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialIcons name="bookmark" size={24} color="#FF9800" />
                  <Text style={styles.actionText}>Enregistrer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialIcons name="share" size={24} color="#666" />
                  <Text style={styles.actionText}>Partager</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.additionalInfo}>
                <View style={styles.infoRow}>
                  <MaterialIcons name="access-time" size={20} color="#666" />
                  <Text style={styles.infoText}>Ouvert · Ferme à 22:00</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="info-outline" size={20} color="#666" />
                  <Text style={styles.infoText}>Site web · Plus d'infos</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* Modal Itinéraires */}
      <Modal visible={showDirections} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Itinéraires</Text>
            <TouchableOpacity onPress={() => setShowDirections(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.routeInputs}>
              <View style={styles.inputRow}>
                <View style={styles.locationDot} />
                <TextInput
                  style={styles.routeInput}
                  placeholder="Point de départ"
                  value={fromLocation}
                  onChangeText={setFromLocation}
                />
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.locationDot, styles.destinationDot]} />
                <TextInput
                  style={styles.routeInput}
                  placeholder="Destination"
                  value={toLocation}
                  onChangeText={setToLocation}
                />
              </View>
            </View>

            <View style={styles.transportModes}>
              {transportModes.map(mode => {
                const isSelected = selectedTransportMode === mode.id;
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.transportMode,
                      isSelected && { 
                        backgroundColor: `${mode.color}20`, 
                        borderColor: mode.color 
                      }
                    ]}
                    onPress={() => setSelectedTransportMode(mode.id)}
                  >
                    <MaterialIcons 
                      name={mode.icon} 
                      size={24} 
                      color={isSelected ? mode.color : '#666'} 
                    />
                    <Text style={[
                      styles.transportText, 
                      isSelected && { color: mode.color }
                    ]}>
                      {mode.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.routeOptions}>
              <Text style={styles.sectionTitle}>Options d'itinéraires</Text>
              {[
                { duration: '25 min', distance: '12.5 km', type: 'Le plus rapide', color: '#4CAF50' },
                { duration: '30 min', distance: '10.8 km', type: 'Éviter les péages', color: '#2196F3' },
                { duration: '35 min', distance: '11.2 km', type: 'Le plus économique', color: '#FF9800' },
              ].map((route, index) => (
                <TouchableOpacity key={index} style={styles.routeOption}>
                  <View style={[styles.routeIndicator, { backgroundColor: route.color }]} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeDuration}>{route.duration}</Text>
                    <Text style={styles.routeDistance}>({route.distance})</Text>
                  </View>
                  <Text style={styles.routeType}>{route.type}</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Lieux enregistrés */}
      <Modal visible={showSavedPlaces} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lieux enregistrés</Text>
            <TouchableOpacity onPress={() => setShowSavedPlaces(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {savedPlaces.map(place => (
              <TouchableOpacity 
                key={place.id} 
                style={styles.savedPlaceCard}
                onPress={() => {
                  selectLocation(place);
                  setShowSavedPlaces(false);
                }}
              >
                <Image source={{ uri: place.image }} style={styles.savedPlaceImage} />
                <View style={styles.savedPlaceInfo}>
                  <Text style={styles.savedPlaceName}>{place.name}</Text>
                  <Text style={styles.savedPlaceAddress}>{place.address}</Text>
                  <View style={styles.savedPlaceRating}>
                    <FontAwesome name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>{place.rating}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.favoriteButton}>
                  <MaterialIcons 
                    name={place.isFavorite ? "favorite" : "favorite-border"} 
                    size={24} 
                    color={place.isFavorite ? '#F44336' : '#666'} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Profil */}
      <Modal visible={showProfile} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Profil</Text>
            <TouchableOpacity onPress={() => setShowProfile(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.profileSection}>
              <Image 
                source={{ uri: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=150' }}
                style={styles.profileImage}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Marie Dubois</Text>
                <Text style={styles.profileEmail}>marie.dubois@email.com</Text>
                <TouchableOpacity style={styles.editProfileButton}>
                  <Text style={styles.editProfileText}>Modifier le profil</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Statistiques</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <MaterialIcons name="location-on" size={24} color="#1976D2" />
                  <Text style={styles.statValue}>127</Text>
                  <Text style={styles.statLabel}>Lieux visités</Text>
                </View>
                <View style={styles.statCard}>
                  <MaterialIcons name="star" size={24} color="#1976D2" />
                  <Text style={styles.statValue}>45</Text>
                  <Text style={styles.statLabel}>Avis donnés</Text>
                </View>
                <View style={styles.statCard}>
                  <MaterialIcons name="directions-walk" size={24} color="#1976D2" />
                  <Text style={styles.statValue}>2,450</Text>
                  <Text style={styles.statLabel}>Km parcourus</Text>
                </View>
              </View>
            </View>

            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Paramètres</Text>
              {[
                { title: 'Paramètres', subtitle: 'Préférences de l\'application', icon: 'settings' },
                { title: 'Confidentialité', subtitle: 'Sécurité et données', icon: 'lock-outline' },
                { title: 'Aide et support', subtitle: 'FAQ et contact', icon: 'help-outline' },
                { title: 'A propos', subtitle: 'Version 1.0.0', icon: 'info-outline' },
              ].map((item, index) => (
                <TouchableOpacity key={index} style={styles.menuItem}>
                  <MaterialIcons name={item.icon} size={24} color="#666" />
                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Style personnalisé pour la carte
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#dadada"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c9c9c9"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
  },
  menuButton: {
    backgroundColor: '#fff',
    borderRadius: 50,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  searchPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 999,
    overflow: 'hidden',
  },
  searchResults: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  suggestionText: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  suggestionAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    alignItems: 'center',
  },
  locationButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActions: {
    alignItems: 'center',
  },
  quickActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  directionsButton: {
    backgroundColor: '#1976D2',
  },
  savedButton: {
    backgroundColor: '#FF9800',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  locationDetails: {
    padding: 20,
    height: '100%',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationInfo: {
    flex: 1,
    marginRight: 16,
  },
  locationName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  closeButton: {
    padding: 4,
  },
  locationImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  locationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  additionalInfo: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  routeInputs: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1976D2',
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: '#F44336',
  },
  routeInput: {
    flex: 1,
    fontSize: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  transportModes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transportMode: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  transportText: {
    fontSize: 14,
    marginTop: 8,
    color: '#666',
    fontWeight: '500',
  },
  routeOptions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  routeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  routeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  routeInfo: {
    alignItems: 'center',
    marginRight: 16,
  },
  routeDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  routeDistance: {
    fontSize: 12,
    color: '#666',
  },
  routeType: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  savedPlaceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  savedPlaceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  savedPlaceInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  savedPlaceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  savedPlaceAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  savedPlaceRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 8,
    alignSelf: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  editProfileButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  markerContainer: {
    backgroundColor: 'transparent',
  },
  selectedMarkerContainer: {
    transform: [{ scale: 1.2 }],
  },
});