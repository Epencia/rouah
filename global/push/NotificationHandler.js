import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurer le gestionnaire de notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Fonction pour demander la permission des notifications
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission de notification non accordée !');
    return;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'bbac64c5-b061-4e2a-9f06-a05a65759e72', // Project ID de adores-cloud
    })).data;
    console.log('Expo Push Token:', token);
  } catch (error) {
    console.error('Erreur lors de la récupération du token push:', error);
  }

  return token;
}

// Fonction pour planifier une notification locale
export async function schedulePushNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: data,
    },
    trigger: { seconds: 2 },
  });
}

// Écouter les notifications reçues
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    onNotificationReceived(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    onNotificationResponse(response);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}