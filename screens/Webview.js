// screens/WebViewModal.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const ROUAH = {
  primary: '#075E54',
  primarySoft: '#0A7A6C',
  accent: '#25D366',
  bg: '#F0F2F5',
  surface: '#FFFFFF',
  text: '#111B21',
  textSoft: '#3B4A54',
  muted: '#667781',
  border: '#E9EDEF',
  danger: '#EF4444',
};

export default function WebViewModal({
  url,
  title = '',
  onClose,
  onDeepLink,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [pageTitle, setPageTitle] = useState(title);
  const webviewRef = useRef(null);

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    webviewRef.current?.reload();
  };

  const handleBack = () => {
    if (canGoBack) {
      webviewRef.current?.goBack();
    } else {
      onClose();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={ROUAH.primary}
        translucent={false}
      />

      {/* ═══ Header identique à ServicesScreen ═══ */}
      <View style={styles.header}>
        <View style={styles.HeaderLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons
              name={canGoBack ? 'arrow-back' : 'close'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {pageTitle || 'Chargement…'}
          </Text>
        </View>
      </View>

      {/* ═══ Contenu ═══ */}
      <View style={{ flex: 1 }}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={ROUAH.primary} />
          </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline" size={56} color={ROUAH.danger} />
            <Text style={styles.errorTitle}>Impossible de charger la page</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={{ uri: url }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            onNavigationStateChange={(nav) => {
              setCanGoBack(nav.canGoBack);
              if (nav.title) setPageTitle(nav.title);
            }}
            onShouldStartLoadWithRequest={(req) => {
              const u = req.url || '';

              if (u.startsWith('rouah://')) {
                console.log('[WebView] Deep link intercepté :', u);
                if (typeof onDeepLink === 'function') {
                  onDeepLink(u);
                }
                return false;
              }

              if (u.startsWith('mailto:') || u.startsWith('tel:') || u.startsWith('sms:')) {
                Linking.openURL(u).catch(() => {});
                return false;
              }

              return true;
            }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            userAgent={
              Platform.OS === 'ios'
                ? 'RouahApp/1.0 ReactNativeWebView'
                : 'RouahApp/1.0 ReactNativeWebView'
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ROUAH.bg,
  },

  // ═══ Header : copie fidèle de ServicesScreen ═══
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
  HeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },

  // ═══ Contenu ═══
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#111',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROUAH.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  cancelText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
});