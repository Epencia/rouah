import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export default function App() {
  const [userLocation, setUserLocation] = useState(null);

  const GEOFENCES = [
    {
      identifier: 'zone_rouge',
      latitude: 7.6716138,
      longitude: -5.0165134,
      radius: 100,
      color: 'red',
    },
    {
      identifier: 'zone_verte',
      latitude: 48.8585,
      longitude: 2.3475,
      radius: 100,
      color: 'green',
    },
    {
      identifier: 'zone_bleue',
      latitude: 48.854,
      longitude: 2.35,
      radius: 100,
      color: 'blue',
    },
  ];

  useEffect(() => {
    configureNotifications();
    requestPermissions();
  }, []);

  const configureNotifications = async () => {
    // Demande de permission de notification
    await Notifications.requestPermissionsAsync();
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
        };
      },
    });
  };

  const requestPermissions = async () => {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: backgroundLocationStatus } = await Location.requestBackgroundPermissionsAsync();

    if (locationStatus !== 'granted' || backgroundLocationStatus !== 'granted') {
      alert('Les permissions de localisation sont nécessaires pour fonctionner !');
      return;
    }

    // Démarre le suivi en arrière-plan
    await Location.startLocationUpdatesAsync('geofencing-task', {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Suivi de localisation actif',
        notificationBody: 'Vous êtes suivi pour le géorepérage',
      },
    });
  };

  useEffect(() => {
    const subscription = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
      },
      (location) => {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        checkGeofences(location.coords);
      }
    );
    return () => {
      subscription?.then((sub) => sub.remove());
    };
  }, []);

  const checkGeofences = (coords) => {
    GEOFENCES.forEach((zone) => {
      const distance = getDistance(
        coords.latitude,
        coords.longitude,
        zone.latitude,
        zone.longitude
      );
      if (distance <= zone.radius) {
        sendNotification(`Entrée de ${zone.identifier}`, `Vous êtes entré dans la zone ${zone.identifier}`);
      }
    });
  };

  const sendNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null,
    });
  };
  
  const getDistance = (lat1, lon1, lat2, lon2) => {
    // Formule de Haversine
    const R = 6371000;
    const toRad = (val) => (val * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  
  return (
    <View style={styles.container}>
      {userLocation ? (
        <MapView
          style={styles.map}
          region={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
        >
          {GEOFENCES.map((zone, index) => (
            <React.Fragment key={index}>
              <Circle
                center={{
                  latitude: zone.latitude,
                  longitude: zone.longitude,
                }}
                radius={zone.radius}
                fillColor={`${zone.color}33`} // Couleur semi-transparente
                strokeColor={zone.color}
                strokeWidth={2}
              />
              <Marker
                coordinate={{
                  latitude: zone.latitude,
                  longitude: zone.longitude,
                }}
                title={zone.identifier}
              />
            </React.Fragment>
          ))}
        </MapView>
      ) : (
        <View style={styles.loading}>
          <Text>Récupération de la localisation…</Text>
        </View>
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
