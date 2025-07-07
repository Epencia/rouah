import React, { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Créez une référence de navigation
export const navigationRef = React.createRef();

const NotificationManager = () => {
  
  const [matricule, setMatricule] = useState(null);

  const registerForPushNotificationsAsync = async () => {
    try {
      if (!Device.isDevice) return null;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission pour les notifications refusée');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error) {
      console.error('Erreur de récupération du token :', error);
      return null;
    }
  };

  const sendTokenToServer = async (token) => {
    try {
      if (!matricule || !token) return;

      const response = await fetch('https://rouah.net/api/save-token.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          utilisateur_id: matricule,
          push_token: token,
        }),
      });

      const result = await response.json();
      console.log('Token envoyé au serveur:', result);
    } catch (error) {
      console.error("Erreur d'envoi du token :", error);
    }
  };

  const handleNotificationResponse = (response) => {
    const data = response.notification.request.content.data;
    
    // Gestion des notifications d'annonces
    if (data?.screen === "Details d'annonce" && navigationRef.current) {
      navigationRef.current.navigate("Details d'annonce", {
            code: data.params.code,
            utilisateur_id: data.params.utilisateur_id,
            titre: data.params.titre,
            description: data.params.description
        });
    }

    // Gestion des notifications de signal sos
    if (data?.screen === "Signal d'alerte" && navigationRef.current) {
      navigationRef.current.navigate("Signal d'alerte", {
            id_geoip: data.params.id_geoip,
            utilisateur_id: data.params.utilisateur_id,
            latitude: data.params.latitude,
            longitude: data.params.longitude,
            adresse: data.params.adresse
        });
    } 

  };

  useEffect(() => {
    const init = async () => {
      const storedMatricule = await AsyncStorage.getItem('matricule');
      if (storedMatricule) {
        setMatricule(storedMatricule);

        const token = await registerForPushNotificationsAsync();
        if (token) {
          console.log("Push token obtenu :", token);
          await sendTokenToServer(token);
        }
      }
    };

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      Alert.alert(
        notification.request.content.title || 'Notification',
        notification.request.content.body
      );
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    init();

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [matricule]);

  return null; // Ce composant n'affiche rien
};

export default NotificationManager;