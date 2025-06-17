import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome'; // Importation de l'icône de recherche

// --- Définition des lieux pour les marqueurs et la recherche ---
const PLACES = [
  {
    id: 'abidjan',
    name: 'Abidjan',
    coordinates: { latitude: 5.3453, longitude: -4.0270 },
    description: 'Capitale économique de la Côte d\'Ivoire',
  },
  {
    id: 'yamoussoukro',
    name: 'Yamoussoukro',
    coordinates: { latitude: 6.8205, longitude: -5.2758 },
    description: 'Capitale politique et administrative de la Côte d\'Ivoire',
  },
  {
    id: 'bouake',
    name: 'Bouaké',
    coordinates: { latitude: 7.6749, longitude: -5.0276 },
    description: 'Deuxième plus grande ville de Côte d\'Ivoire',
  },
  {
    id: 'sanpedro',
    name: 'San Pedro',
    coordinates: { latitude: 4.7431, longitude: -6.6133 },
    description: 'Ville portuaire importante',
  },
  {
    id: 'korhogo',
    name: 'Korhogo',
    coordinates: { latitude: 9.4589, longitude: -5.6322 },
    description: 'Grande ville du nord de la Côte d\'Ivoire',
  },
];

export default function OSMMap() {
  // État pour gérer la région visible de la carte (latitude, longitude et zoom)
  const [region, setRegion] = useState({
    latitude: 7.5,    // Latitude initiale centrée sur la Côte d'Ivoire
    longitude: -5.5,  // Longitude initiale centrée sur la Côte d'Ivoire
    latitudeDelta: 5, // Écart de latitude pour le zoom initial (plus le chiffre est grand, plus on est dézoomé)
    longitudeDelta: 5, // Écart de longitude pour le zoom initial
  });
  // État pour indiquer si la carte est chargée
  const [mapLoaded, setMapLoaded] = useState(false);
  // État pour la valeur de la barre de recherche
  const [searchQuery, setSearchQuery] = useState('');
  // État pour stocker les résultats de la recherche
  const [searchResults, setSearchResults] = useState([]);

  // URL des tuiles OpenStreetMap. C'est l'adresse d'où la carte va télécharger ses images de fond.
  const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  /**
   * Gère la recherche en filtrant les lieux prédéfinis.
   * Dans une application réelle, cela ferait appel à une API de géocodage (ex: Nominatim).
   * @param {string} text Le texte saisi dans la barre de recherche.
   */
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
      // Filtrer les lieux dont le nom inclut le texte recherché (insensible à la casse)
      const filtered = PLACES.filter(place =>
        place.name.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      // Si la recherche est vide, effacer les résultats
      setSearchResults([]);
    }
  };

  /**
   * Sélectionne un lieu à partir des résultats de recherche et centre la carte dessus.
   * @param {object} place L'objet lieu sélectionné.
   */
  const selectLocation = (place) => {
    // Met à jour la région de la carte pour centrer sur le lieu sélectionné avec un zoom plus rapproché
    setRegion({
      latitude: place.coordinates.latitude,
      longitude: place.coordinates.longitude,
      latitudeDelta: 0.1, // Zoom plus près
      longitudeDelta: 0.1,
    });
    setSearchQuery(place.name); // Affiche le nom du lieu sélectionné dans la barre de recherche
    setSearchResults([]); // Efface les suggestions de recherche
  };

  return (
    <View style={styles.container}>
      {/* Superposition de chargement tant que la carte n'est pas prête */}
      {!mapLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Chargement de la carte...</Text>
        </View>
      )}

      {/* Barre de Recherche */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un lieu..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing" // Option pratique pour iOS : effacer le texte pendant la saisie
        />
      </View>

      {/* Résultats de la Recherche (liste déroulante) */}
      {searchResults.length > 0 && (
        <ScrollView style={styles.searchResultsContainer}>
          {searchResults.map(place => (
            <TouchableOpacity key={place.id} style={styles.searchResultItem} onPress={() => selectLocation(place)}>
              <Text style={styles.searchResultText}>{place.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Composant principal de la carte */}
      <MapView
        style={styles.map}
        region={region} // Utilise l'état `region` pour contrôler la vue de la carte
        onRegionChangeComplete={setRegion} // Met à jour l'état `region` lorsque l'utilisateur se déplace/zoome
        onMapReady={() => setMapLoaded(true)} // Déclenche quand la carte est prête
        provider={null} // Important pour désactiver le fournisseur de carte par défaut (Google/Apple) et utiliser uniquement les tuiles OSM
      >
        {/* URLTile est le composant qui charge les tuiles OpenStreetMap */}
        <UrlTile
          urlTemplate={OSM_TILE_URL}
          maximumZ={19} // Zoom maximum supporté par les tuiles OSM
          minimumZ={0}  // Zoom minimum supporté par les tuiles OSM
          // flipY={false} // Par défaut pour OSM, peut être nécessaire pour d'autres fournisseurs de tuiles
        />

        {/* Affichage de multiples marqueurs */}
        {PLACES.map(place => (
          <Marker
            key={place.id} // Clé unique pour chaque marqueur (obligatoire pour les listes React)
            coordinate={place.coordinates} // Coordonnées du marqueur
            title={place.name} // Titre affiché quand le marqueur est tapé
            description={place.description} // Description affichée sous le titre
          />
        ))}
      </MapView>
    </View>
  );
}

// --- Styles du composant ---
const styles = StyleSheet.create({
  container: {
    flex: 1, // Le conteneur remplit tout l'espace disponible
  },
  map: {
    ...StyleSheet.absoluteFillObject, // La carte s'étend pour remplir tout son conteneur parent
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // La superposition de chargement couvre tout l'écran
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Fond blanc semi-transparent
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Assure que le calque de chargement est au-dessus de la carte
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  searchContainer: {
    position: 'absolute', // Positionnement absolu pour être par-dessus la carte
    top: 50, // Marge du haut
    left: 20, // Marge de gauche
    right: 20, // Marge de droite
    backgroundColor: 'white', // Fond blanc
    borderRadius: 25, // Coins arrondis
    flexDirection: 'row', // Alignement des éléments (icône, champ de texte)
    alignItems: 'center', // Centrage vertical des éléments
    paddingHorizontal: 15, // Espacement horizontal interne
    paddingVertical: 10, // Espacement vertical interne
    elevation: 5, // Ombre pour Android (effet de profondeur)
    shadowColor: '#000', // Couleur de l'ombre pour iOS
    shadowOffset: { width: 0, height: 2 }, // Décalage de l'ombre pour iOS
    shadowOpacity: 0.25, // Opacité de l'ombre pour iOS
    shadowRadius: 3.84, // Rayon de l'ombre pour iOS
    zIndex: 100, // Assure que la barre de recherche est au-dessus de tout
  },
  searchIcon: {
    marginRight: 10, // Marge à droite de l'icône
  },
  searchInput: {
    flex: 1, // Le champ de texte prend l'espace restant
    fontSize: 16,
    color: '#333',
    paddingVertical: 0, // Supprime le padding vertical par défaut du TextInput
  },
  searchResultsContainer: {
    position: 'absolute', // Positionnement absolu pour les résultats
    top: 110, // Positionnement juste en dessous de la barre de recherche (50 + 40 de hauteur de barre de recherche + 20 d'espacement)
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.62,
    maxHeight: 200, // Limite la hauteur des résultats pour éviter qu'ils ne remplissent tout l'écran
    zIndex: 99, // Se trouve juste en dessous de la barre de recherche mais au-dessus de la carte
  },
  searchResultItem: {
    padding: 15,
    borderBottomWidth: 1, // Ligne de séparation entre les résultats
    borderBottomColor: '#eee',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
  },
});
