// QRCode.js - Version simplifiée
// L'app mobile ne fait que scanner et notifier la réussite
// C'est la page web qui gère la redirection

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  Vibration,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';

const QR_API_URL = 'https://rouah.net/api/api-qr.php';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = Math.min(width * 0.7, 280);

export const QRCodeScanner = ({ visible, onClose, onSuccess, userId }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (visible) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [visible]);

  // ============================================================
  // SCAN DU QR CODE - Version simplifiée
  // ============================================================
  const handleBarcodeScanned = async (result) => {
    if (scanned || loading) return;

    const { data } = result;
    console.log('🔍 QR Code scanné:', data);
    
    Vibration.vibrate(200);
    setScanned(true);
    setLoading(true);

    try {
      let sessionData;
      try {
        sessionData = JSON.parse(data);
        console.log('✅ QR Code parsé:', sessionData);
      } catch {
        Alert.alert('Erreur', 'QR Code invalide');
        setScanned(false);
        setLoading(false);
        return;
      }

      if (!sessionData.session_id || !sessionData.token) {
        Alert.alert('Erreur', 'QR Code incomplet');
        setScanned(false);
        setLoading(false);
        return;
      }

      if (!userId) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        setScanned(false);
        setLoading(false);
        return;
      }

      // Envoyer le scan au serveur
      const formData = new FormData();
      formData.append('action', 'scan');
      formData.append('session_id', sessionData.session_id);
      formData.append('token', sessionData.token);
      formData.append('user_id', String(userId));
      formData.append('device_info', `Mobile App - ${Platform.OS}`);

      const response = await fetch(QR_API_URL, {
        method: 'POST',
        body: formData,
      });

      const resultJson = await response.json();
      console.log('📥 Réponse serveur:', resultJson);

      if (resultJson.success) {
        // ✅ Scan réussi - Juste notifier l'utilisateur
        Alert.alert(
          '✅ Connexion réussie',
          'Votre session a été validée. Vous pouvez fermer cette fenêtre.',
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.(resultJson);
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', resultJson.message || 'Scan échoué');
        setScanned(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Erreur scan:', error);
      Alert.alert('Erreur', error.message || 'Impossible de scanner le QR Code');
      setScanned(false);
      setLoading(false);
    }
  };

  const closeScanner = () => {
    setScanned(false);
    setLoading(false);
    setTorchOn(false);
    onClose();
  };

  const toggleTorch = () => {
    setTorchOn(prev => !prev);
  };

  // ============================================================
  // RENDU
  // ============================================================
  if (!visible) return null;

  if (hasPermission === null) {
    return (
      <Modal visible={visible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ActivityIndicator size="large" color="#075E54" />
            <Text style={styles.modalText}>Demande d'accès à la caméra...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Ionicons name="camera-off-outline" size={60} color="#ff6b6b" />
            <Text style={[styles.modalText, { fontWeight: 'bold', marginTop: 12 }]}>
              Permission refusée
            </Text>
            <Text style={[styles.modalText, { color: '#666' }]}>
              Vous devez autoriser l'accès à la caméra dans les paramètres
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={async () => {
                const { status } = await Camera.requestCameraPermissionsAsync();
                setHasPermission(status === 'granted');
              }}
            >
              <Text style={styles.permissionButtonText}>Demander l'autorisation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: '#999' }]}
              onPress={closeScanner}
            >
              <Text style={styles.permissionButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeScanner}
    >
      <View style={styles.scannerContainer}>
        <View style={styles.scannerHeader}>
          <Text style={styles.scannerTitle}>Scanner un QR Code</Text>
          <TouchableOpacity onPress={closeScanner} style={styles.scannerCloseBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.scannerWrapper}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraView}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            enableTorch={torchOn}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
              interval: 500,
            }}
          />

          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={styles.scannerCornerTL} />
              <View style={styles.scannerCornerTR} />
              <View style={styles.scannerCornerBL} />
              <View style={styles.scannerCornerBR} />
            </View>

            <View style={styles.scannerInstructions}>
              <Ionicons name="scan" size={24} color="#fff" />
              <Text style={styles.scannerInstructionsText}>
                Positionnez le QR Code dans le cadre
              </Text>
              {loading && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="small" color="#22c55e" />
                  <Text style={styles.scanningText}>Vérification en cours...</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.scannerFooter}>
          <TouchableOpacity
            style={styles.scannerFlashBtn}
            onPress={toggleTorch}
          >
            <Ionicons
              name={torchOn ? 'flash' : 'flash-outline'}
              size={24}
              color={torchOn ? '#22c55e' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
  },
  permissionButton: {
    backgroundColor: '#075E54',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',paddingVertical:20
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scannerCloseBtn: {
    padding: 8,
  },
  scannerWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  cameraView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
  },
  scannerCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#22c55e',
  },
  scannerCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#22c55e',
  },
  scannerCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#22c55e',
  },
  scannerCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#22c55e',
  },
  scannerInstructions: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    gap: 8,
  },
  scannerInstructionsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scanningText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '500',
  },
  scannerFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    gap: 20,
  },
  scannerFlashBtn: {
    padding: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});