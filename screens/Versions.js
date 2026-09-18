import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Linking, Platform, BackHandler
} from 'react-native';

const API_URL = 'https://rouah.net/api/api-version.php';

// Version actuelle de l'application (à aligner avec app.json / store)
export const APP_VERSION = '1.0.0';

function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export default function VersionGate({ onReady, onBlocked }) {
  const [checking, setChecking] = useState(true);
  const [mustUpdate, setMustUpdate] = useState(false);
  const [remote, setRemote] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_latest_version', source:'rouah' }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (data.success && data.version) {
          const serverVersion = data.version.version;
          const needs = compareVersions(serverVersion, APP_VERSION) > 0;
          setRemote(data.version);
          setMustUpdate(needs);
          if (needs) {
            if (onBlocked) onBlocked(data.version);
          } else if (onReady) {
            onReady();
          }
        } else if (onReady) {
          onReady();
        }
      } catch (e) {
        if (!cancelled && onReady) onReady();
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    check();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mustUpdate) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [mustUpdate]);

  const openStore = async () => {
    if (!remote) return;
    const url =
      Platform.OS === 'ios'
        ? (remote.appstore || remote.playstore)
        : (remote.playstore || remote.appstore);
    if (!url) return;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
    } catch (e) {
      // ignore
    }
  };

  if (checking) {
    return null;
  }

  if (!mustUpdate) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}>
              <Text style={styles.modalIcon}>🔄</Text>
            </View>
            <Text style={styles.modalTitle}>Mise à jour obligatoire</Text>
            <Text style={styles.modalSubtitle}>
              Une nouvelle version est disponible. Installez-la pour continuer.
            </Text>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.versionBox}>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Votre version</Text>
                <Text style={styles.versionValue}>{APP_VERSION}</Text>
              </View>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Nouvelle version</Text>
                <Text style={[styles.versionValue, { color: '#075E54' }]}>
                  {remote?.version || '—'}
                </Text>
              </View>
            </View>

            {!!remote?.description && (
              <View style={styles.descBox}>
                <Text style={styles.descTitle}>Nouveautés</Text>
                <Text style={styles.descText}>{remote.description}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={openStore} activeOpacity={0.85}>
              <Text style={styles.resetButtonText}>⬇️ Télécharger</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Accès bloqué jusqu'à l'installation de la version {remote?.version}.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalIcon: { fontSize: 26 },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBody: { width: '100%' },
  versionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 14,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  versionLabel: { fontSize: 13, color: '#64748b' },
  versionValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  descBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 14,
  },
  descTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  descText: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  resetButton: {
    backgroundColor: '#075E54',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  hint: {
    marginTop: 14,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 17,
  },
});
