import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons, Entypo } from '@expo/vector-icons';

export default function CallWithMapScreen() {
  const [location, setLocation] = useState(null);
  const [timer, setTimer] = useState(0); // seconds

  // Timer dynamique
  useEffect(() => {
    const interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Obtenir la localisation
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission de localisation refusée');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  return (
    <View style={styles.container}>
      {/* Carte OSM */}
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        region={
          location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {
                latitude: 5.3599517,
                longitude: -4.0082563,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
        }
        mapType="standard"
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Vous êtes ici"
          />
        )}
      </MapView>

      {/* Filtre sombre */}
      <View style={styles.overlay} />

      {/* Heure */}
      <Text style={styles.time}>23:22</Text>

      {/* Nom et durée d'appel */}
      <Text style={styles.name}>Ange Michael</Text>
      <Text style={styles.timer}>{formatTime(timer)}</Text>


      {/* Boutons */}
      <View style={styles.buttonBar}>
        <TouchableOpacity style={styles.iconButton}>
          <Entypo name="dots-three-horizontal" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="videocam" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconButton, styles.active]}>
          <Ionicons name="volume-high" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="mic-off" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconButton, styles.endCall]}>
          <MaterialIcons name="call-end" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  time: {
    color: '#fff',
    position: 'absolute',
    top: 10,
    right: 20,
    fontSize: 14,
  },
  name: {
    marginTop: 80,
    alignSelf: 'center',
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  timer: {
    alignSelf: 'center',
    color: '#ccc',
    marginTop: 4,
  },
  avatarContainer: {
    marginTop: 40,
    alignSelf: 'center',
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#333',
  },
  avatar: {
    width: 160,
    height: 160,
  },
  buttonBar: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 10,
  },
  iconButton: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 50,
  },
  active: {
    backgroundColor: '#444',
  },
  endCall: {
    backgroundColor: '#e53935',
  },
});
