import React, { useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Créez une référence de navigation
export const navigationRef = React.createRef();

// Configuration du gestionnaire de notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationManager = () => {
  
  const [matricule, setMatricule] = useState(null);
  const [utilisateur_id, setUtilisateurId] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  const registerForPushNotificationsAsync = async () => {
    try {
      if (!Device.isDevice) {
        
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
       
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
      
      return token;
    } catch (error) {
      //console.error('Erreur de récupération du token :', error);
      return null;
    }
  };

  const sendTokenToServer = async (token) => {
    try {
      if (!token || !utilisateur_id) return;

      const deviceInfo = {
        Proprietaire: Device.deviceName || 'Inconnu',
        Annee: Device.deviceYearClass || 'Inconnu',
        Marque: Device.brand || 'Inconnu',
        Modele: Device.modelName || Device.modelId || 'Inconnu',
        VersionOS: Device.osVersion || 'Inconnu',
        Plateforme: Device.platformApiLevel || 'Inconnu',
        buildVersion: Application.nativeBuildVersion || '1',
        Design: Device.designName || 'Inconnu',
        UID: (await Device.getDeviceTypeAsync()) || 'Inconnu',
        Date: new Date().toISOString(),
        Application: Constants.expoConfig?.name || 'Rouah',
      };

      const postData = {
        utilisateur_id: utilisateur_id,
        push_token: token,
        device: JSON.stringify(deviceInfo)
      };


      const response = await fetch('https://rouah.net/api/save-token.php', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(postData),
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
    
    const route = event.url.replace(/.*?:\/\//g, '');
    const parts = route.split('/');
    
    if (parts[0] === 'notification' && navigationRef.current?.isReady()) {
      console.log('Navigation vers Notifications avec params:', {
        notificationId: parts[1],
        notificationType: parts[2] || 'general',
      });
      
      navigationRef.current.navigate('Notifications', {
        notificationId: parts[1],
        notificationType: parts[2] || 'general',
        title: parts[3] ? decodeURIComponent(parts[3]) : 'Notification',
        body: parts[4] ? decodeURIComponent(parts[4]) : '',
        data: {}
      });
    }
  };

  // Gestion des réponses aux notifications (QUAND ON CLIQUE SUR LA NOTIFICATION)
  const handleNotificationResponse = (response) => {
    
    
    const data = response.notification.request.content.data || {};
    const { title, body } = response.notification.request.content;
    

    // Vérifier que la navigation est prête
    if (!navigationRef.current?.isReady()) {
      
      setTimeout(() => {
        if (navigationRef.current?.isReady()) {
          handleNotificationResponse(response);
        }
      }, 500);
      return;
    }

    // Extraire le type et l'ID des données ou utiliser des valeurs par défaut
    const notificationType = data?.type || data?.notificationType || 'general';
    const notificationId = data?.id || data?.notificationId || Date.now().toString();
  
    
    try {
      navigationRef.current.navigate('Notifications', {
        notificationId: notificationId,
        notificationType: notificationType,
        title: data?.title || title || 'Notification',
        body: data?.body || body || '',
        data: data,
        // Ajouter un timestamp pour éviter les doublons
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Erreur de navigation:', error);
    }
  };

  // Fonction pour afficher une notification locale
  const showLocalNotification = async (title, body, data = {}) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: {
          ...data,
          type: data.type || 'general',
          notificationId: data.id || data.notificationId || Date.now().toString(),
          timestamp: new Date().toISOString()
        },
        sound: true,
      },
      trigger: null,
    });
  };

  // Fonction pour simuler une notification de test
  const sendTestNotification = async () => {
    await showLocalNotification(
      'Test Notification',
      'Ceci est une notification de test',
      {
        type: 'cours',
        id: '123',
        title: 'Test Cours',
        body: 'Détails du cours de test',
        important: true
      }
    );
  };

  useEffect(() => {
    let linkingSubscription;

    const init = async () => {
      const storedMatricule = await AsyncStorage.getItem('matricule');
      const storedUserId = await AsyncStorage.getItem('utilisateur_id');
    
      
      if (storedMatricule) setMatricule(storedMatricule);
      if (storedUserId) setUtilisateurId(storedUserId);

      if (storedUserId) {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await sendTokenToServer(token);
        }
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      linkingSubscription = Linking.addEventListener('url', handleDeepLink);

      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        
        handleDeepLink({ url: initialUrl });
      }

      // Pour tester : décommentez la ligne suivante pour envoyer une notification de test au démarrage
      // setTimeout(() => sendTestNotification(), 2000);
    };

    init();

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
    
      const { title, body, data } = notification.request.content;
      
      Alert.alert(
        title || 'Nouvelle notification',
        body,
        [
          { 
            text: 'Voir', 
            onPress: () => {
              handleNotificationResponse({ 
                notification: { 
                  request: { 
                    content: { data, title, body } 
                  } 
                } 
              });
            } 
          },
          { text: 'Fermer', style: 'cancel' }
        ]
      );
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      if (linkingSubscription) linkingSubscription.remove();
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [matricule, utilisateur_id]);

  return null;
};

export default NotificationManager;

// Hook personnalisé pour utiliser les fonctions de notification
export const useNotifications = () => {
  const functions = {
    showLocalNotification: async (title, body, data = {}) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: {
            ...data,
            type: data.type || 'general',
            notificationId: data.id || data.notificationId || Date.now().toString(),
          },
          sound: true,
        },
        trigger: null,
      });
    },
    
    getPushToken: async () => {
      try {
        if (!Device.isDevice) return null;
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') return null;
        }
        return (await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;
      } catch (error) {
        //console.error('Erreur de récupération du token:', error);
        return null;
      }
    },

    cancelAllNotifications: async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
    },

    sendTestNotification: async () => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'Ceci est une notification de test',
          data: {
            type: 'test',
            id: 'test-' + Date.now(),
            title: 'Test',
            body: 'Détails du test',
            important: true
          },
          sound: true,
        },
        trigger: null,
      });
    }
  };

  return functions;
};

export const NotificationContext = React.createContext({});

export const NotificationProvider = ({ children }) => {
  const notifications = useNotifications();
  
  return (
    <NotificationContext.Provider value={notifications}>
      <NotificationManager />
      {children}
    </NotificationContext.Provider>
  );
};