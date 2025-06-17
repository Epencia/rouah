import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const [location, setLocation] = useState(null);
  const [typedQuery, setTypedQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [marker, setMarker] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  const fetchSuggestions = async () => {
    if (typedQuery.length < 3) return setSuggestions([]);
    setSearchQuery(typedQuery);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        typedQuery
      )}&countrycodes=ci&limit=5`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MyReactNativeApp/1.0 (contact@example.com)',
        },
      });

      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectSuggestion = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    setMarker({
      latitude: lat,
      longitude: lon,
      title: place.display_name,
    });

    setLocation({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    setSearchQuery(place.display_name);
    setTypedQuery(place.display_name);
    setSuggestions([]);
  };

  const clearSearch = () => {
    setTypedQuery('');
    setSearchQuery('');
    setSuggestions([]);
    setMarker(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    
      <MapView style={styles.map} region={location} showsUserLocation>
        {marker && <Marker coordinate={marker} title={searchQuery} />}
      </MapView>

      <View style={styles.searchBox}>
        <TextInput
          placeholder="Rechercher un lieu..."
          value={typedQuery}
          onChangeText={setTypedQuery}
          style={styles.input}
        />

        {typedQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.iconButton}>
            <Ionicons name="close-circle" size={20} color="gray" />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={fetchSuggestions} style={styles.iconButton}>
          <Ionicons name="search" size={24} color="gray" />
        </TouchableOpacity>
      </View>

      {suggestions.length > 0 && (
        <FlatList
          style={styles.suggestionList}
          data={suggestions}
          keyExtractor={(item) => item.place_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => selectSuggestion(item)}
              style={styles.suggestionItem}
            >
              <Text>{item.display_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
   </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchBox: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  iconButton: {
    marginLeft: 6,
  },
  suggestionList: {
    position: 'absolute',
    top: 90,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: 200,
    elevation: 3,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
});
