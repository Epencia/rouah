// screens/Notifications.js
// Gestion des notifications push + affichage depuis api-notification.php
// Design aux couleurs Rouah : #075E54 (vert foncé), #25D366 (vert clair)
// ⭐ Ouverture automatique du modal quand on tape sur un push

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {
  Platform, Alert, Modal, View, Text, TouchableOpacity,
  ScrollView, StyleSheet, StatusBar, ActivityIndicator,
  RefreshControl, TextInput, Linking, Image,
} from 'react-native';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { offlineFetch } from '../services/offlineApi';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('expo-notifications indisponible dans ce runtime');
}

const API_URL = 'https://rouah.net/api/api-save-token.php';
const NOTIFICATION_API_URL = 'https://rouah.net/api/api-notification.php';

// ============ COULEURS ROUAH ============
const ROUAH = {
  primary: '#075E54',
  primaryDark: '#054640',
  primaryLight: '#0d7a6c',
  accent: '#25D366',
  accentLight: '#e8f9f0',
  cream: '#ECE5DD',
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
// HELPERS API NOTIFICATIONS
// ================================================================
export async function fetchNotifications({
  societeId,
  utilisateurId,
  onlyUnread = false,
  type = null,
  limit = 100,
}) {
  try {
    const payload = {
      action: 'list_notifications',
      societe_id: societeId,
      utilisateur_id: utilisateurId,
      only_unread: onlyUnread,
      limit,
    };
    if (type) payload.type = type;

    const json = await offlineFetch(NOTIFICATION_API_URL, payload);
    if (json.success) return json.data || [];
    console.warn('fetchNotifications error:', json.message);
    return [];
  } catch (e) {
    console.error('fetchNotifications exception:', e.message);
    return [];
  }
}

export async function fetchUnreadCount({ societeId, utilisateurId }) {
  try {
    const json = await offlineFetch(NOTIFICATION_API_URL, {
      action: 'count_unread',
      societe_id: societeId,
      utilisateur_id: utilisateurId,
    });
    return json.success ? (json.unread || 0) : 0;
  } catch (e) {
    console.error('fetchUnreadCount exception:', e.message);
    return 0;
  }
}

export async function markNotificationAsRead({ societeId, utilisateurId, notificationId }) {
  try {
    const json = await offlineFetch(NOTIFICATION_API_URL, {
      action: 'mark_as_read',
      societe_id: societeId,
      utilisateur_id: utilisateurId,
      notification_id: notificationId,
    });
    return json.success;
  } catch (e) {
    console.error('markNotificationAsRead exception:', e.message);
    return false;
  }
}

export async function markAllNotificationsAsRead({ societeId, utilisateurId }) {
  try {
    const json = await offlineFetch(NOTIFICATION_API_URL, {
      action: 'mark_all_as_read',
      societe_id: societeId,
      utilisateur_id: utilisateurId,
    });
    return json.success ? (json.updated || 0) : 0;
  } catch (e) {
    console.error('markAllNotificationsAsRead exception:', e.message);
    return 0;
  }
}

export async function deleteNotification({ societeId, notificationId }) {
  try {
    const json = await offlineFetch(NOTIFICATION_API_URL, {
      action: 'delete_notification',
      societe_id: societeId,
      notification_id: notificationId,
    });
    return json.success;
  } catch (e) {
    console.error('deleteNotification exception:', e.message);
    return false;
  }
}

export async function createNotification({
  societeId,
  expediteurId,
  titre,
  contenu,
  type = 'info',
  priorite = 'normale',
  utilisateurs = [],
  boutiqueId = null,
  data = null,
  lien = null,
  dateExpiration = null,
}) {
  try {
    const json = await offlineFetch(NOTIFICATION_API_URL, {
      action: 'create_notification',
      societe_id: societeId,
      utilisateur_id: expediteurId,
      expediteur_id: expediteurId,
      titre,
      contenu,
      type,
      priorite,
      utilisateurs,
      boutique_id: boutiqueId,
      data,
      lien,
      date_expiration: dateExpiration,
    });
    return json.success ? json : { success: false, message: json.message };
  } catch (e) {
    console.error('createNotification exception:', e.message);
    return { success: false, message: e.message };
  }
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
// ⭐ RÉCUPÉRER LE TAP INITIAL (app fermée ou arrière-plan)
// ================================================================
export async function getInitialNotificationResponse() {
  if (!Notifications) return null;

  try {
    // Fallback si la méthode n'existe pas (anciennes versions)
    if (typeof Notifications.getLastNotificationResponseAsync !== 'function') {
      const legacy =
        typeof Notifications.getInitialNotificationAsync === 'function'
          ? await Notifications.getInitialNotificationAsync()
          : null;
      if (!legacy) return null;
      return {
        id: Date.now().toString(),
        title: legacy.notification?.request?.content?.title || '',
        body: legacy.notification?.request?.content?.body || '',
        data: legacy.notification?.request?.content?.data || {},
        date: new Date(),
        type: 'tapped',
      };
    }

    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return null;

    const notification = response.notification;
    const data = notification?.request?.content?.data || {};

    // ⭐ Vérifier que la réponse est récente (< 10s) pour éviter
    //    de ré-ouvrir le modal à chaque relance de l'app
    const timestamp = notification?.date || Date.now();
    const age = Date.now() - timestamp;
    if (age > 10000) return null;

    return {
      id: Date.now().toString(),
      title: notification?.request?.content?.title || '',
      body: notification?.request?.content?.body || '',
      data,
      date: new Date(),
      type: 'tapped',
      actionIdentifier: response.actionIdentifier,
    };
  } catch (e) {
    console.warn('getInitialNotificationResponse error:', e.message);
    return null;
  }
}

// ================================================================
// ⭐ HOOK : ouvrir automatiquement le modal de notifications
// ================================================================
export function useNotificationHandler({ onOpen, onReceive } = {}) {
  const [pendingData, setPendingData] = React.useState(null);

  // 1. Capter le tap initial (app fermée ou arrière-plan)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = await getInitialNotificationResponse();
      if (!cancelled && initial) {
        setPendingData(initial);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2. Écouter les notifications reçues / tapées pendant que l'app est ouverte
  React.useEffect(() => {
    const cleanup = setupNotificationListeners({
      onNotificationReceived: (notif) => {
        if (onReceive) onReceive(notif);
      },
      onNotificationResponse: (notif) => {
        setPendingData(notif);
      },
    });
    return cleanup;
  }, [onReceive]);

  // 3. Notifier le parent quand une notif doit ouvrir l'écran
  React.useEffect(() => {
    if (pendingData) {
      if (onOpen) onOpen(pendingData);
      setPendingData(null);
    }
  }, [pendingData, onOpen]);

  return pendingData;
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
// GESTION MANUELLE DU TAP (pour usages avancés)
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
// HELPERS D'AFFICHAGE
// ================================================================
const getTypeColor = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'vente':   return { bg: '#dcfce7', fg: '#16a34a', icon: 'cart' };
    case 'achat':   return { bg: '#ffedd5', fg: '#ea580c', icon: 'bag-handle' };
    case 'stock':   return { bg: '#dbeafe', fg: '#2563eb', icon: 'cube' };
    case 'caisse':  return { bg: '#fef3c7', fg: '#d97706', icon: 'cash' };
    case 'message': return { bg: '#ede9fe', fg: '#7c3aed', icon: 'chatbubble' };
    case 'alerte':  return { bg: '#fee2e2', fg: '#dc2626', icon: 'warning' };
    case 'systeme': return { bg: '#e5e7eb', fg: '#374151', icon: 'settings' };
    default:        return { bg: '#e8f9f0', fg: '#075E54', icon: 'notifications' };
  }
};

const getPrioriteColor = (priorite) => {
  switch ((priorite || '').toLowerCase()) {
    case 'urgente': return { bg: '#fee2e2', fg: '#dc2626', label: 'URGENTE' };
    case 'haute':   return { bg: '#ffedd5', fg: '#ea580c', label: 'HAUTE' };
    case 'basse':   return { bg: '#f3f4f6', fg: '#6b7280', label: 'BASSE' };
    default:        return { bg: '#dbeafe', fg: '#2563eb', label: 'NORMALE' };
  }
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD} j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// ================================================================
// HELPERS CONTACT — Appel / SMS / WhatsApp / Email
// ================================================================
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return String(phone).replace(/[^0-9+]/g, '');
}

function normalizeForWhatsApp(phone) {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
}

async function callPhone(phone) {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) {
    Alert.alert('Impossible', 'Aucun numéro de téléphone disponible.');
    return;
  }
  try {
    await Linking.openURL(`tel:${cleaned}`);
  } catch (e) {
    Alert.alert('Erreur', "Impossible d'ouvrir le composeur téléphonique.");
  }
}

async function sendSMS(phone, message = '') {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) {
    Alert.alert('Impossible', 'Aucun numéro de téléphone disponible.');
    return;
  }
  const url = `sms:${cleaned}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
  try {
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert('Erreur', "Impossible d'ouvrir l'application SMS.");
  }
}

async function sendWhatsApp(phone, message = '') {
  const normalized = normalizeForWhatsApp(phone);
  if (!normalized) {
    Alert.alert('Impossible', 'Aucun numéro WhatsApp disponible.');
    return;
  }
  const appUrl = `whatsapp://send?phone=${normalized}${message ? `&text=${encodeURIComponent(message)}` : ''}`;
  const webUrl = `https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

  try {
    await Linking.openURL(appUrl);
  } catch (e) {
    try {
      await Linking.openURL(webUrl);
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ouvrir WhatsApp.");
    }
  }
}

async function sendEmail(email, subject = '', body = '') {
  if (!email) {
    Alert.alert('Impossible', 'Aucune adresse email disponible.');
    return;
  }
  const url = `mailto:${email}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert('Erreur', "Impossible d'ouvrir l'application email.");
  }
}

// ================================================================
// COMPOSANT MODAL DES NOTIFICATIONS (DESIGN ROUAH)
// ================================================================
export function NotificationModal({
  visible,
  onClose,
  societeId,
  utilisateurId,
  onNotificationPress,
  targetNotifId,        // ⭐ ID de la notif à surligner
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <NotificationsScreen
        societeId={societeId}
        utilisateurId={utilisateurId}
        onBack={onClose}
        onNotificationPress={onNotificationPress}
        isModal={true}
        targetNotifId={targetNotifId}
      />
    </Modal>
  );
}

// ================================================================
// ÉCRAN NOTIFICATIONS (utilisable en plein écran)
// ================================================================
export default function NotificationsScreen({
  societeId,
  utilisateurId,
  onBack,
  onNotificationPress,
  isModal = false,
  targetNotifId,      // ⭐ NOUVEAU
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [highlightId, setHighlightId] = useState(targetNotifId || null);

  const scrollRef = useRef(null);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (!societeId || !utilisateurId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchNotifications({
        societeId,
        utilisateurId,
        onlyUnread: filter === 'unread',
        type: typeFilter,
        limit: 200,
      });
      setNotifications(data || []);
    } catch (e) {
      console.warn('loadNotifications error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societeId, utilisateurId, filter, typeFilter]);

  const loadUnreadCount = useCallback(async () => {
    if (!societeId || !utilisateurId) return;
    const count = await fetchUnreadCount({ societeId, utilisateurId });
    setUnreadCount(count);
  }, [societeId, utilisateurId]);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // ⭐ Surligner et marquer comme lu la notif ciblée
  useEffect(() => {
    if (!targetNotifId || notifications.length === 0) return;
    const found = notifications.find(
      (n) => n.notification_id === targetNotifId
    );
    if (found) {
      setHighlightId(targetNotifId);
      // Marquer comme lue automatiquement
      if (!found.lu) handleMarkAsRead(found);
      // Effacer le surlignage après 3s
      setTimeout(() => setHighlightId(null), 3000);
    }
  }, [targetNotifId, notifications]);

  const handleRefresh = () => {
    loadNotifications(true);
    loadUnreadCount();
  };

  const handleMarkAsRead = async (notif) => {
    if (!societeId || !utilisateurId || notif.lu) return;
    const ok = await markNotificationAsRead({
      societeId,
      utilisateurId,
      notificationId: notif.notification_id,
    });
    if (ok) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notif.notification_id ? { ...n, lu: true } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!societeId || !utilisateurId) return;
    Alert.alert(
      'Tout marquer comme lu',
      'Voulez-vous marquer toutes les notifications comme lues ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Oui',
          onPress: async () => {
            const updated = await markAllNotificationsAsRead({
              societeId,
              utilisateurId,
            });
            if (updated > 0) {
              setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
              setUnreadCount(0);
            } else {
              Alert.alert('Information', 'Aucune notification non lue');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (notif) => {
    if (!societeId) return;
    Alert.alert(
      'Supprimer la notification',
      `Voulez-vous supprimer « ${notif.titre} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteNotification({
              societeId,
              notificationId: notif.notification_id,
            });
            if (ok) {
              setNotifications((prev) =>
                prev.filter((n) => n.notification_id !== notif.notification_id)
              );
              if (!notif.lu) setUnreadCount((c) => Math.max(0, c - 1));
            }
          },
        },
      ]
    );
  };

  const handleNotifPress = async (notif) => {
    await handleMarkAsRead(notif);
    if (onNotificationPress) {
      onNotificationPress(notif);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (!searchText.trim()) return notifications;
    const q = searchText.toLowerCase();
    return notifications.filter(
      (n) =>
        (n.titre && n.titre.toLowerCase().includes(q)) ||
        (n.contenu && n.contenu.toLowerCase().includes(q)) ||
        (n.type && n.type.toLowerCase().includes(q))
    );
  }, [notifications, searchText]);

  const renderNotifCard = (notif) => {
    const typeInfo = getTypeColor(notif.type);
    const prioInfo = getPrioriteColor(notif.priorite);
    const isUnread = !notif.lu;
    const isHighlighted = highlightId === notif.notification_id;

    return (
      <TouchableOpacity
        key={notif.notification_id}
        style={[
          styles.notifCard,
          isUnread && styles.notifCardUnread,
          isHighlighted && styles.notifCardHighlighted,
        ]}
        onPress={() => handleNotifPress(notif)}
        activeOpacity={0.8}
      >
        <View style={styles.notifRow}>
          <View style={[styles.notifIconBox, { backgroundColor: typeInfo.bg }]}>
            <Ionicons name={typeInfo.icon} size={20} color={typeInfo.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.notifTitleRow}>
              {isUnread && <View style={styles.unreadDot} />}
              <Text
                style={[styles.notifTitle, isUnread && { fontWeight: '800' }]}
                numberOfLines={1}
              >
                {notif.titre || 'Notification'}
              </Text>
            </View>
            <Text style={styles.notifDate}>{formatDateShort(notif.date_creation)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(notif)}
            style={styles.deleteBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color={ROUAH.textMuted} />
          </TouchableOpacity>
        </View>

        {notif.contenu ? (
          <Text style={styles.notifBody} numberOfLines={4}>
            {notif.contenu}
          </Text>
        ) : null}

        {/* ⭐ BLOC EXPÉDITEUR avec actions de contact */}
        {notif.expediteur && (
          <View style={styles.expediteurBox}>
            <View style={styles.expediteurHeader}>
              {notif.expediteur.photo ? (
                <Image
                  source={{ uri: notif.expediteur.photo }}
                  style={styles.expediteurAvatar}
                />
              ) : (
                <View style={[styles.expediteurAvatar, styles.expediteurAvatarFallback]}>
                  <Text style={styles.expediteurAvatarLetter}>
                    {(notif.expediteur.nom_prenom || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.expediteurName} numberOfLines={1}>
                  {notif.expediteur.nom_prenom || 'Utilisateur'}
                </Text>
                {!!notif.expediteur.role && (
                  <Text style={styles.expediteurRole} numberOfLines={1}>
                    {notif.expediteur.role}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.contactRow}>
              {!!notif.expediteur.telephone && (
                <>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: '#dbeafe' }]}
                    onPress={() => callPhone(notif.expediteur.telephone)}
                  >
                    <Ionicons name="call" size={16} color="#2563eb" />
                    <Text style={[styles.contactBtnText, { color: '#2563eb' }]}>
                      Appeler
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: '#e5e7eb' }]}
                    onPress={() =>
                      sendSMS(
                        notif.expediteur.telephone,
                        `Bonjour, concernant votre notification "${notif.titre}" : `
                      )
                    }
                  >
                    <Ionicons name="chatbubble" size={16} color="#374151" />
                    <Text style={[styles.contactBtnText, { color: '#374151' }]}>
                      SMS
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: '#dcfce7' }]}
                    onPress={() =>
                      sendWhatsApp(
                        notif.expediteur.telephone,
                        `Bonjour, concernant votre notification "${notif.titre}" : `
                      )
                    }
                  >
                    <MaterialCommunityIcons name="whatsapp" size={16} color="#16a34a" />
                    <Text style={[styles.contactBtnText, { color: '#16a34a' }]}>
                      WhatsApp
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {!!notif.expediteur.email && (
                <TouchableOpacity
                  style={[styles.contactBtn, { backgroundColor: '#fef3c7' }]}
                  onPress={() =>
                    sendEmail(
                      notif.expediteur.email,
                      `Re: ${notif.titre}`,
                      `Bonjour, concernant votre notification "${notif.titre}" : `
                    )
                  }
                >
                  <Ionicons name="mail" size={16} color="#d97706" />
                  <Text style={[styles.contactBtnText, { color: '#d97706' }]}>
                    Email
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: typeInfo.bg }]}>
            <Text style={[styles.badgeText, { color: typeInfo.fg }]}>
              {(notif.type || 'info').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: prioInfo.bg }]}>
            <Text style={[styles.badgeText, { color: prioInfo.fg }]}>
              {prioInfo.label}
            </Text>
          </View>
          {isUnread && (
            <View style={[styles.badge, { backgroundColor: ROUAH.accentLight }]}>
              <Text style={[styles.badgeText, { color: ROUAH.accent }]}>NON LUE</Text>
            </View>
          )}
        </View>

        {notif.data && typeof notif.data === 'object' && Object.keys(notif.data).length > 0 && (
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
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Text>
              ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={ROUAH.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''} / ${notifications.length}`
              : `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerBtn}>
            <Ionicons name="checkmark-done-outline" size={24} color={ROUAH.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* ===== SEARCH ===== */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={ROUAH.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor={ROUAH.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color={ROUAH.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ===== FILTRES ===== */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        >
          {[
            { key: 'all', label: 'Toutes', icon: 'list' },
            { key: 'unread', label: 'Non lues', icon: 'mail-unread' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons
                name={f.icon}
                size={14}
                color={filter === f.key ? ROUAH.white : ROUAH.primary}
              />
              <Text
                style={[
                  styles.filterChipText,
                  filter === f.key && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.filterDivider} />

          {[
            { key: null, label: 'Tous types' },
            { key: 'vente', label: 'Ventes' },
            { key: 'achat', label: 'Achats' },
            { key: 'stock', label: 'Stock' },
            { key: 'caisse', label: 'Caisse' },
            { key: 'alerte', label: 'Alertes' },
            { key: 'systeme', label: 'Système' },
          ].map((t) => (
            <TouchableOpacity
              key={t.key || 'all-types'}
              style={[styles.filterChip, typeFilter === t.key && styles.filterChipActive]}
              onPress={() => setTypeFilter(t.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  typeFilter === t.key && styles.filterChipTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ===== CONTENU ===== */}
      {loading ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator size="large" color={ROUAH.primary} />
          <Text style={[styles.emptyHint, { marginTop: 12 }]}>Chargement...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="notifications-off-outline" size={48} color={ROUAH.primary} />
          </View>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptyHint}>
            {searchText
              ? 'Aucun résultat pour cette recherche'
              : filter === 'unread'
              ? 'Toutes les notifications sont lues'
              : "Les notifications reçues s'afficheront ici"}
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[ROUAH.primary]}
              tintColor={ROUAH.primary}
            />
          }
        >
          {filteredNotifications.map(renderNotifCard)}
        </ScrollView>
      )}
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 46,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#075E54',
  },
  backBtn: { padding: 6 },
  headerBtn: { padding: 6, width: 40, alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: ROUAH.white, fontSize: 17, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },

  // ===== SEARCH BAR =====
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROUAH.white,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: ROUAH.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: ROUAH.text,
    paddingVertical: 4,
  },

  // ===== FILTRES =====
  filterBar: {
    paddingVertical: 10,
    backgroundColor: ROUAH.white,
    borderBottomWidth: 1,
    borderBottomColor: ROUAH.border,
    marginTop: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: ROUAH.border,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: ROUAH.primary,
    borderColor: ROUAH.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: ROUAH.primary,
    fontWeight: '600',
  },
  filterChipTextActive: { color: ROUAH.white },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: ROUAH.border,
    marginHorizontal: 4,
    alignSelf: 'center',
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
  notifCardUnread: {
    borderColor: ROUAH.accent,
    borderWidth: 2,
    backgroundColor: 'rgba(37, 211, 102, 0.04)',
  },
  // ⭐ Style quand la notif vient d'être ouverte par un push
  notifCardHighlighted: {
    borderColor: ROUAH.accent,
    borderWidth: 3,
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    shadowColor: ROUAH.accent,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
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
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ROUAH.accent,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ROUAH.text,
    marginBottom: 2,
    flexShrink: 1,
  },
  notifDate: {
    fontSize: 11,
    color: ROUAH.textMuted,
  },
  deleteBtn: {
    padding: 4,
  },

  notifBody: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 19,
    marginBottom: 8,
  },

  // ===== BADGES =====
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // ===== DONNÉES =====
  dataBox: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
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

  // ===== BLOC EXPÉDITEUR =====
  expediteurBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ROUAH.border,
  },
  expediteurHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  expediteurAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ROUAH.accentLight,
  },
  expediteurAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  expediteurAvatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: ROUAH.primary,
  },
  expediteurName: {
    fontSize: 13,
    fontWeight: '700',
    color: ROUAH.text,
  },
  expediteurRole: {
    fontSize: 11,
    color: ROUAH.textMuted,
    marginTop: 1,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});