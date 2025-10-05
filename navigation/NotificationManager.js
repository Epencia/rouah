import React, { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert, Linking } from 'react-native';
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

  // Gestion des liens profonds
  const handleDeepLink = (event) => {
    if (!event.url) return;
    
    console.log('Deep link reçu:', event.url);
    
    // Exemple: rouah://details/annonce/123
    const route = event.url.replace(/.*?:\/\//g, '');
    const parts = route.split('/');
    // Detais des annonces
    if (parts[0] === 'annonce' && navigationRef.current) {
      navigationRef.current.navigate("Details d'annonce", {
        code: parts[1],
        utilisateur_id: parts[2] || '',
        titre: parts[3] ? decodeURIComponent(parts[3]) : '',
       description: parts[4] ? decodeURIComponent(parts[4]) : ''
        // autres params si nécessaire
      });
    }

  };

  // Gestion des réponses aux notifications
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

    

  };

  useEffect(() => {
    let linkingSubscription;
    let notificationReceivedSubscription;
    let notificationResponseSubscription;

    const init = async () => {
      // Initialisation du matricule
      const storedMatricule = await AsyncStorage.getItem('matricule');
      if (storedMatricule) {
        setMatricule(storedMatricule);

        // Enregistrement pour les notifications push
        const token = await registerForPushNotificationsAsync();
        if (token) {
          console.log("Push token obtenu :", token);
          await sendTokenToServer(token);
        }

        // NOUVELLE METHODE POUR L'ECOUTE DES LIENS PROFONDS
        linkingSubscription = Linking.addEventListener('url', handleDeepLink);

        // Vérification du lien initial si l'app a été ouverte via un lien
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) handleDeepLink({ url: initialUrl });
      }
    };

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Écouteurs de notifications
    notificationReceivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      Alert.alert(
        notification.request.content.title || 'Notification',
        notification.request.content.body
      );
    });

    notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    init();

    return () => {
      // NOUVELLE METHODE DE NETTOYAGE
      if (linkingSubscription) linkingSubscription.remove();
      if (notificationReceivedSubscription) notificationReceivedSubscription.remove();
      if (notificationResponseSubscription) notificationResponseSubscription.remove();
    };
  }, [matricule]);

  return null; // Ce composant n'affiche rien
};

export default NotificationManager;