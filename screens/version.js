import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Linking,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function Versions ({ 
  visible, 
  onClose, 
  currentVersion,
  onVersionCheck 
}) {
  const [loading, setLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    needs_update: false,
    is_required: false,
    message: '',
    latest_version: null,
    latest_description: null
  });

  // Vérifier la version au montage ou quand visible change
  useEffect(() => {
    if (visible) {
      checkVersion();
    }
  }, [visible]);

  const checkVersion = async () => {
    if (!currentVersion) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://rouah.net/api/version.php?current_version=${currentVersion}`);
      const data = await response.json();
      
      if (data.success) {
        setUpdateInfo({
          needs_update: data.needs_update,
          is_required: data.is_required,
          message: data.message,
          latest_version: data.latest_version,
          latest_description: data.latest_description
        });
        
       // Sauvegarder avec une expiration (24h)
  const cacheData = {
    timestamp: Date.now(),
    expiresIn: 24 * 60 * 60 * 1000, // 24 heures
    ...data
  };
  await AsyncStorage.setItem('lastVersionCheck', JSON.stringify(cacheData));
        
        // Notifier le parent du résultat
        if (onVersionCheck) {
          onVersionCheck(data);
        }
      }
    } catch (error) {
      console.error('Erreur vérification version:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/idVOTRE_APP_ID',
      android: 'https://play.google.com/store/apps/details?id=com.mandigoentreprise.adores',
    });
    Linking.openURL(storeUrl);
  };

  const handleClose = () => {
    if (!updateInfo.is_required) {
      onClose();
    }
  };

  // Au début du composant, avant useEffect
useEffect(() => {
  const checkCache = async () => {
    try {
      const cached = await AsyncStorage.getItem('lastVersionCheck');
      if (cached) {
        const cacheData = JSON.parse(cached);
        // Vérifier si le cache est encore valide (moins de 24h)
        if (Date.now() - cacheData.timestamp < cacheData.expiresIn) {
          setUpdateInfo({
            needs_update: cacheData.needs_update,
            is_required: cacheData.is_required,
            message: cacheData.message,
            latest_version: cacheData.latest_version,
            latest_description: cacheData.latest_description
          });
          
          if (cacheData.needs_update && onVersionCheck) {
            onVersionCheck(cacheData);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lecture cache:', error);
    }
  };
  
  checkCache();
}, []);

  // Ne pas afficher si pas de mise à jour nécessaire
  if (!updateInfo.needs_update && !loading) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {loading ? (
            <>
              <ActivityIndicator size="large" color="#414d63" />
              <Text style={styles.loadingText}>Vérification des mises à jour...</Text>
            </>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Icon 
                  name={updateInfo.is_required ? "exclamation-triangle" : "cloud-download-alt"} 
                  size={50} 
                  color={updateInfo.is_required ? "#ff6b6b" : "#414d63"} 
                />
              </View>
              
              <Text style={styles.modalTitle}>
                {updateInfo.is_required ? 'Mise à jour requise' : 'Nouvelle version disponible'}
              </Text>
              
              <Text style={styles.modalMessage}>
                {updateInfo.message || (updateInfo.is_required 
                  ? "Votre version de l'application n'est plus supportée."
                  : "Une nouvelle version de Rouah est disponible."
                )}
              </Text>
              
              {updateInfo.latest_version && (
                <View style={styles.versionInfo}>
                  <Text style={styles.versionLabel}>Version {updateInfo.latest_version}</Text>
                  {updateInfo.latest_description && (
                    <Text style={styles.versionDescription}>{updateInfo.latest_description}</Text>
                  )}
                </View>
              )}
              
              <View style={styles.modalButtons}>
                {!updateInfo.is_required && (
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={handleClose}
                  >
                    <Text style={styles.cancelButtonText}>Plus tard</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[
                    styles.modalButton, 
                    styles.updateButton,
                    !updateInfo.is_required && styles.updateButtonFlex
                  ]} 
                  onPress={handleUpdate}
                >
                  <Icon name="cloud-download-alt" size={18} color="#fff" />
                  <Text style={styles.updateButtonText}>Mettre à jour</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  iconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  versionInfo: {
    backgroundColor: '#f7fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  versionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#414d63',
    marginBottom: 6,
    textAlign: 'center',
  },
  versionDescription: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButton: {
    backgroundColor: '#414d63',
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  updateButtonFlex: {
    flex: 1,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    flex: 1,
  },
  cancelButtonText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '600',
  },
});