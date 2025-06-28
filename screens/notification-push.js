import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurer le gestionnaire de notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function NotificationPush() {
  const [notification, setNotification] = useState(null);

  // Demander les permissions et obtenir le token push
  useEffect(() => {
    async function configurePushNotifications() {

        const matricule = await AsyncStorage.getItem('matricule');
      if (!matricule) {
        throw new Error('Matricule non trouvé');
      }
      // Vérifier si l'application n'est pas dans Expo Go
      if (Constants.appOwnership === 'standalone') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Erreur', 'Permission de notification refusée.');
          return;
        }

        const token = (await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;

        console.log('Push Token:', token);

        // Envoyer le token au serveur avec utilisateur_id
        fetch('https://adores.cloud/api/save-token.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            utilisateur_id: matricule, // Remplacer par l'ID de l'utilisateur connecté
            push_token: token,
          }),
        });
      } else {
        console.log('Notifications non supportées dans Expo Go.');
      }

      // Configurer le canal de notification pour Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }
    }

    configurePushNotifications();

    // Écouter les notifications reçues en avant-plan
    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      Alert.alert(
        notification.request.content.title || 'Notification',
        notification.request.content.body || 'Nouvelle notification reçue.'
      );
    });

    // Écouter les interactions avec les notifications (clic)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification cliquée:', response);
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    // Votre JSX ici
    // Par exemple, affichez la notification dans l'interface si nécessaire
    <View>
      {notification && (
        <Text>
          {notification.request.content.title}: {notification.request.content.body}
        </Text>
      )}
    </View>
  );
}