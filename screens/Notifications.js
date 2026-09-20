// screens/Notifications.js
// Gestion des notifications push pour Rouah
// Design aux couleurs Rouah : #075E54 (vert foncé), #25D366 (vert clair)

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {
  Platform, Alert, Modal, View, Text, TouchableOpacity,
  ScrollView, StyleSheet, StatusBar,
} from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('expo-notifications indisponible dans ce runtime');
}

const API_URL = 'https://rouah.net/api/api-save-token.php';

// ============ COULEURS ROUAH ============
const ROUAH = {
  primary: '#075E54',       // Vert foncé Rouah
  primaryDark: '#054640',
  primaryLight: '#0d7a6c',
  accent: '#25D366',        // Vert clair
  accentLight: '#e8f9f0',
  cream: '#ECE5DD',         // Fond crème
  text: '#171717',
  textMuted: '#6b7280',
  white: '#ffffff',
  border: '#e5e7eb',
  danger: '#dc2626',
  warning: '#f59e0b',
  blue: '#2563eb',
  purple: '#7c3aed',
};

// ================================================================
// CONFIGURATION DU COMPORTEMENT DES NOTIFICATIONS
// ================================================================
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowList: true,
    }),
  });
}

// ================================================================
// ENREGISTREMENT DU PUSH TOKEN
// ================================================================
export async function registerForPushNotifications(userId) {
  try {
    if (!Notifications) {
      console.warn('⚠️ Notifications non disponibles');
      return null;
    }

    if (!Device.isDevice) {
      console.log('⚠️ Push notifications nécessitent un device physique');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Permissions push refusées');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('⚠️ ProjectId manquant - push notifications désactivées');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;
    console.log('📱 Push Token:', pushToken);

    const deviceInfo = {
      platform: Device.osName || Platform.OS,
      osVersion: Device.osVersion || 'unknown',
      model: Device.modelName || Device.modelId || 'unknown',
      manufacturer: Device.manufacturer || 'unknown',
      appVersion: Constants.expoConfig?.version || 'unknown',
      deviceYear: Device.deviceYearClass || null,
      isTablet: Device.isTablet || false,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        utilisateur_id: String(userId),
        push_token: pushToken,
        device: JSON.stringify(deviceInfo),
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Push token enregistré:', result.message);
      return pushToken;
    } else {
      console.error('❌ Erreur enregistrement token:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur registerForPushNotifications:', error);
    return null;
  }
}

// ================================================================
// GESTION DES ÉVÉNEMENTS NOTIFICATIONS
// ================================================================
export function setupNotificationListeners(handlers = {}) {
  if (!Notifications) {
    console.warn('⚠️ expo-notifications indisponible : listeners non initialisés');
    return () => {};
  }

  const {
    onNotificationReceived = null,
    onNotificationResponse = null,
  } = handlers;

  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('📱 Notification reçue:', notification?.request?.content?.title);

      if (onNotificationReceived) {
        onNotificationReceived({
          id: Date.now().toString(),
          title: notification?.request?.content?.title || '',
          body: notification?.request?.content?.body || '',
          data: notification?.request?.content?.data || {},
          date: new Date(),
          type: 'received',
        });
      }
    }
  );

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const notification = response.notification;
      const data = notification?.request?.content?.data || {};

      console.log('👆 Notification tapée:', notification?.request?.content?.title);

      if (onNotificationResponse) {
        onNotificationResponse({
          id: Date.now().toString(),
          title: notification?.request?.content?.title || '',
          body: notification?.request?.content?.body || '',
          data: data,
          date: new Date(),
          type: 'tapped',
          actionIdentifier: response.actionIdentifier,
        });
      }
    });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

// ================================================================
// ENVOYER UNE NOTIFICATION LOCALE (pour tests)
// ================================================================
export async function scheduleLocalNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger: null,
    });
  } catch (error) {
    console.error('❌ Erreur notification locale:', error);
  }
}

// ================================================================
// GESTION DU TAP SUR NOTIFICATION
// ================================================================
export const handleNotificationResponse = (
  response,
  setNotificationModalVisible,
  setNotifications
) => {
  const notification = response.notification;
  const data = notification?.request?.content?.data || {};

  console.log('👆 Notification tapée:', notification?.request?.content?.title);

  const notif = {
    id: Date.now().toString(),
    title: notification?.request?.content?.title || '',
    body: notification?.request?.content?.body || '',
    data: data,
    date: new Date(),
    type: 'tapped',
    actionIdentifier: response.actionIdentifier,
  };

  setNotifications((prev) => [notif, ...prev].slice(0, 50));

  setTimeout(() => {
    setNotificationModalVisible(true);
  }, 300);

  if (data?.action === 'open_task' && data?.task_id) {
    if (typeof data.onTaskOpen === 'function') {
      data.onTaskOpen(data.task_id);
    }
  }

  return notif;
};

// ================================================================
// LECTURE VOCALE
// ================================================================
export const speakNotification = (title, body, speakFunction) => {
  if (!title && !body) return;

  let message = '';
  if (title && body) {
    message = `📢 ${title}. ${body}`;
  } else if (title) {
    message = `📢 ${title}`;
  } else if (body) {
    message = `📢 ${body}`;
  }

  if (speakFunction && typeof speakFunction === 'function') {
    speakFunction(message);
  }
};

// ================================================================
// COMPOSANT MODAL DES NOTIFICATIONS (DESIGN ROUAH)
// ================================================================
export function NotificationModal({
  visible,
  onClose,
  notifications,
  onNotificationPress,
  onClearAll,
}) {
  const formatDate = (date) => {
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formatTime = (date) => {
    try {
      return new Date(date).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getNotifIcon = (notif) => {
    if (notif.data?.type === 'vente') return 'cart';
    if (notif.data?.type === 'stock') return 'cube';
    if (notif.data?.type === 'caisse') return 'cash';
    if (notif.data?.type === 'message') return 'chatbubble';
    return 'notifications';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={ROUAH.primary} />

        {/* ===== HEADER ROUAH ===== */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={ROUAH.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {notifications.length} notification{notifications.length > 1 ? 's' : ''}
            </Text>
          </View>
          {notifications.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Effacer les notifications',
                  'Voulez-vous vraiment effacer toutes les notifications ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Effacer',
                      style: 'destructive',
                      onPress: () => onClearAll && onClearAll(),
                    },
                  ]
                );
              }}
              style={styles.headerBtn}
            >
              <Ionicons name="trash-outline" size={22} color={ROUAH.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        {/* ===== CONTENU ===== */}
        {notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={48} color={ROUAH.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyHint}>
              Les notifications reçues s'afficheront ici
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          >
            {notifications.map((notif, index) => {
              const isTapped = notif.type === 'tapped';
              return (
                <TouchableOpacity
                  key={notif.id || index}
                  style={[
                    styles.notifCard,
                    isTapped && styles.notifCardTapped,
                  ]}
                  onPress={() => onNotificationPress && onNotificationPress(notif)}
                  activeOpacity={0.8}
                >
                  {/* Icône + titre */}
                  <View style={styles.notifRow}>
                    <View
                      style={[
                        styles.notifIconBox,
                        {
                          backgroundColor: isTapped
                            ? ROUAH.accentLight
                            : 'rgba(7, 94, 84, 0.1)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={getNotifIcon(notif)}
                        size={20}
                        color={isTapped ? ROUAH.accent : ROUAH.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle} numberOfLines={1}>
                        {notif.title || 'Notification'}
                      </Text>
                      <Text style={styles.notifDate}>
                        {formatDate(notif.date)} à {formatTime(notif.date)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.notifBadge,
                        {
                          backgroundColor: isTapped
                            ? ROUAH.accentLight
                            : 'rgba(37, 211, 102, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.notifBadgeText,
                          {
                            color: isTapped ? ROUAH.accent : ROUAH.primary,
                          },
                        ]}
                      >
                        {isTapped ? 'Tapée' : 'Reçue'}
                      </Text>
                    </View>
                  </View>

                  {/* Corps */}
                  {notif.body ? (
                    <Text style={styles.notifBody} numberOfLines={3}>
                      {notif.body}
                    </Text>
                  ) : null}

                  {/* Données additionnelles */}
                  {notif.data && Object.keys(notif.data).length > 0 && (
                    <View style={styles.dataBox}>
                      <View style={styles.dataHeader}>
                        <Ionicons name="cube-outline" size={12} color={ROUAH.primary} />
                        <Text style={styles.dataLabel}>Données</Text>
                      </View>
                      {Object.entries(notif.data)
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <Text key={key} style={styles.dataItem}>
                            • {key}:{' '}
                            {typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                          </Text>
                        ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ================================================================
// STYLES - COULEURS ROUAH
// ================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },

  // ===== HEADER =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ROUAH.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 60,
  },
  backBtn: { padding: 6 },
  headerBtn: { padding: 6, width: 36, alignItems: 'center' },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: ROUAH.white,
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 1,
  },

  // ===== EMPTY STATE =====
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: ROUAH.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ROUAH.primary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: ROUAH.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },

  // ===== CARTE NOTIFICATION =====
  notifCard: {
    backgroundColor: ROUAH.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: ROUAH.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  notifCardTapped: {
    borderColor: ROUAH.accent,
    borderWidth: 2,
    backgroundColor: 'rgba(37, 211, 102, 0.04)',
  },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  notifIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ROUAH.text,
    marginBottom: 2,
  },
  notifDate: {
    fontSize: 11,
    color: ROUAH.textMuted,
  },
  notifBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  notifBody: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 19,
    marginBottom: 4,
  },

  // ===== DONNÉES =====
  dataBox: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: ROUAH.border,
  },
  dataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dataLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: ROUAH.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dataItem: {
    fontSize: 11,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 3,
  },
});