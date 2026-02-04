import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  AppState,
  Modal,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto'; // Utiliser expo-crypto au lieu de crypto-js
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Video } from 'expo-av';

const VAULT_DIR = FileSystem.documentDirectory + 'secure_vault/';
const THUMBNAIL_DIR = FileSystem.cacheDirectory + 'thumbnails/';
const AUTO_LOCK_TIME = 5 * 60 * 1000; // 5 minutes
const PASSWORD_KEY = 'gallery_lock_password_hash';

// Fonction pour générer un nom de fichier unique
// Fonction pour générer un nom de fichier unique AVEC TYPE
const generateUniqueFileName = (type) => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const prefix = type === 'video' ? 'video_' : 'image_';
  return `${prefix}secure_${timestamp}_${randomStr}.enc`;
};

// Fonction pour hacher le mot de passe avec expo-crypto
const hashPassword = async (password) => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
};

// Fonction pour chiffrer avec expo-crypto
const encryptData = async (data, password) => {
  // Créer un sel aléatoire
  const salt = await Crypto.getRandomBytesAsync(16);
  const saltHex = Array.from(new Uint8Array(salt))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Créer une clé dérivée du mot de passe
  const derivedKey = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + saltHex
  );
  
  // Simple chiffrement XOR (pour l'exemple)
  // Dans une vraie app, utiliser AES via expo-crypto
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    const keyChar = derivedKey.charCodeAt(i % derivedKey.length);
    const dataChar = data.charCodeAt(i);
    encrypted += String.fromCharCode(dataChar ^ keyChar);
  }
  
  // Retourner le sel + données chiffrées en base64
  const combined = saltHex + ':' + btoa(encrypted);
  return combined;
};

// Fonction pour déchiffrer
const decryptData = async (encryptedData, password) => {
  try {
    const [saltHex, encryptedBase64] = encryptedData.split(':');
    const encrypted = atob(encryptedBase64);
    
    // Recréer la clé
    const derivedKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + saltHex
    );
    
    // Déchiffrement XOR
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const keyChar = derivedKey.charCodeAt(i % derivedKey.length);
      const encChar = encrypted.charCodeAt(i);
      decrypted += String.fromCharCode(encChar ^ keyChar);
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
};

export default function Galerie() {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const lastActiveTime = useRef(Date.now());
  const appState = useRef(AppState.currentState);
  const videoRef = useRef(null);
  const autoLockTimerRef = useRef(null);

  /* ============ INITIALISATION ============ */
  useEffect(() => {
    initializeApp();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      ScreenCapture.allowScreenCaptureAsync();
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current);
      }
    };
  }, []);

  // CORRECTION 1: Charger les fichiers quand on change de dossier
  useEffect(() => {
    if (currentFolder && isUnlocked) {
      loadFiles();
    }
  }, [currentFolder, isUnlocked]);

  const initializeApp = async () => {
    try {
      await ScreenCapture.preventScreenCaptureAsync();
      await checkBiometricAvailability();
      await setupDirectories();
      await loadFolders();
      // Ne pas charger les fichiers ici, ils seront chargés quand le dossier sera sélectionné
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

 const setupDirectories = async () => {
    try {
      // Vérifier et créer le dossier principal
      const vaultInfo = await FileSystem.getInfoAsync(VAULT_DIR);
      if (!vaultInfo.exists) {
        await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
        console.log('Dossier principal créé:', VAULT_DIR);
      }

      // Vérifier et créer le dossier des miniatures
      const thumbInfo = await FileSystem.getInfoAsync(THUMBNAIL_DIR);
      if (!thumbInfo.exists) {
        await FileSystem.makeDirectoryAsync(THUMBNAIL_DIR, { intermediates: true });
        console.log('Dossier thumbnails créé:', THUMBNAIL_DIR);
      }

      // Créer le dossier rouah_lock par défaut
      const defaultFolder = VAULT_DIR + 'rouah_lock/';
      const defaultFolderInfo = await FileSystem.getInfoAsync(defaultFolder);
      if (!defaultFolderInfo.exists) {
        await FileSystem.makeDirectoryAsync(defaultFolder, { intermediates: true });
        console.log('Dossier par défaut créé:', defaultFolder);
        
        // Si c'est la première fois, sélectionner ce dossier
        if (!currentFolder) {
          setCurrentFolder({
            name: 'rouah_lock',
            path: defaultFolder,
            fileCount: 0,
            date: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('Setup directories error:', error);
      Alert.alert('Erreur', 'Impossible de créer les dossiers nécessaires');
    }
  };

  /* ============ GESTION DES DOSSIERS ============ */
 const loadFolders = async () => {
    try {
      const items = await FileSystem.readDirectoryAsync(VAULT_DIR);
      const folderList = await Promise.all(
        items.map(async (item) => {
          const itemPath = VAULT_DIR + item;
          const info = await FileSystem.getInfoAsync(itemPath);
          if (info.isDirectory) {
            // Compter les fichiers dans le dossier
            let fileCount = 0;
            try {
              const folderFiles = await FileSystem.readDirectoryAsync(itemPath);
              fileCount = folderFiles.length;
            } catch {
              fileCount = 0;
            }
            
            return {
              name: item,
              path: itemPath.endsWith('/') ? itemPath : itemPath + '/',
              fileCount: fileCount,
              date: info.modificationTime,
            };
          }
          return null;
        })
      );
      
      const validFolders = folderList.filter(folder => folder !== null);
      setFolders(validFolders);
      
      // Sélectionner le dossier rouah_lock par défaut s'il existe
      if (validFolders.length > 0 && !currentFolder) {
        const rouahLockFolder = validFolders.find(f => f.name === 'rouah_lock');
        if (rouahLockFolder) {
          setCurrentFolder(rouahLockFolder);
        } else {
          // Sinon sélectionner le premier dossier disponible
          setCurrentFolder(validFolders[0]);
        }
      }
    } catch (error) {
      console.error('Load folders error:', error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de dossier');
      return;
    }

    // Nettoyer le nom du dossier
    const cleanName = newFolderName.trim().replace(/[^a-zA-Z0-9_\- ]/g, '');
    if (!cleanName) {
      Alert.alert('Erreur', 'Nom de dossier invalide');
      return;
    }

    try {
      const folderPath = VAULT_DIR + cleanName + '/';
      const folderExists = await FileSystem.getInfoAsync(folderPath);
      
      if (folderExists.exists) {
        Alert.alert('Erreur', 'Ce dossier existe déjà');
        return;
      }

      await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
      setNewFolderName('');
      setShowFolderModal(false);
      await loadFolders();
// Mettre à jour le compteur du dossier
if (currentFolder) {
  await updateFolderFileCount(currentFolder.name);
}
      
      // Sélectionner le nouveau dossier
      const newFolder = {
        name: cleanName,
        path: folderPath,
        fileCount: 0,
        date: Date.now(),
      };
      setCurrentFolder(newFolder);
      
      Alert.alert('Succès', 'Dossier créé avec succès');
    } catch (error) {
      console.error('Create folder error:', error);
      Alert.alert('Erreur', 'Impossible de créer le dossier');
    }
  };

  const deleteFolder = async (folderName) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer le dossier "${folderName}" et tout son contenu ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const folderPath = VAULT_DIR + folderName + '/';
              await FileSystem.deleteAsync(folderPath, { idempotent: true });
              
              // Supprimer les miniatures associées
              const thumbPath = THUMBNAIL_DIR + folderName + '/';
              try {
                await FileSystem.deleteAsync(thumbPath, { idempotent: true });
              } catch {
                // Ignorer si le dossier des miniatures n'existe pas
              }
              
              await loadFolders();
              
              // Si on supprime le dossier courant, sélectionner un autre dossier
              if (currentFolder && currentFolder.name === folderName) {
                if (folders.length > 1) {
                  const otherFolder = folders.find(f => f.name !== folderName);
                  setCurrentFolder(otherFolder);
                } else {
                  setCurrentFolder(null);
                }
              }
              
              Alert.alert('Succès', 'Dossier supprimé');
            } catch (error) {
              console.error('Delete folder error:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le dossier');
            }
          },
        },
      ]
    );
  };

  /* ============ GESTION VERROUILLAGE ============ */
  const handleAppStateChange = (nextAppState) => {
    if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      // CORRECTION 3: Ne pas verrouiller automatiquement quand l'app passe en arrière-plan
      // On ne verrouille que quand l'app est complètement fermée
      //console.log('App en arrière-plan, verrouillage différé');
    }
    appState.current = nextAppState;
  };

  // CORRECTION 2: Gestion du verrouillage automatique sans Alert.alert
  const startAutoLockTimer = () => {
    if (autoLockTimerRef.current) {
      clearInterval(autoLockTimerRef.current);
    }
    
    autoLockTimerRef.current = setInterval(() => {
      if (isUnlocked && Date.now() - lastActiveTime.current > AUTO_LOCK_TIME) {
        handleAutoLock();
      }
    }, 1000);
  };

  const handleAutoLock = () => {
    setIsUnlocked(false);
    setViewingMedia(null);
    //console.log('Application verrouillée automatiquement');
  };

  const updateLastActiveTime = () => {
    lastActiveTime.current = Date.now();
  };

  /* ============ AUTHENTIFICATION ============ */
  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const hasEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricEnabled(hasHardware && hasEnrolled);
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentification requise',
        fallbackLabel: 'Utiliser le mot de passe',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await unlockWithBiometric();
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  const unlockWithBiometric = async () => {
    try {
      const storedHash = await SecureStore.getItemAsync(PASSWORD_KEY);
      if (storedHash) {
        setIsUnlocked(true);
        updateLastActiveTime();
        startAutoLockTimer();
      } else {
        setShowPasswordInput(true);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de déverrouiller');
    }
  };

  const handlePasswordAuth = async (inputPassword) => {
    if (!inputPassword) {
      Alert.alert('Erreur', 'Veuillez entrer un mot de passe');
      return;
    }

    try {
      const storedHash = await SecureStore.getItemAsync(PASSWORD_KEY);
      
      if (!storedHash) {
        // Premier lancement, définir le mot de passe
        const hash = await hashPassword(inputPassword);
        await SecureStore.setItemAsync(PASSWORD_KEY, hash);
        setPassword(inputPassword);
        setIsUnlocked(true);
        updateLastActiveTime();
        startAutoLockTimer();
        Alert.alert('Succès', 'Mot de passe défini avec succès');
      } else {
        // Vérifier le mot de passe
        const inputHash = await hashPassword(inputPassword);
        if (inputHash === storedHash) {
          setPassword(inputPassword);
          setIsUnlocked(true);
          updateLastActiveTime();
          startAutoLockTimer();
          setShowPasswordInput(false);
        } else {
          Alert.alert('Erreur', 'Mot de passe incorrect');
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Échec de l\'authentification');
    }
  };

  /* ============ GESTION DES FICHIERS ============ */
 const loadFiles = async () => {
    try {
      if (!currentFolder) {
        setFiles([]);
        return;
      }

      const filesList = await FileSystem.readDirectoryAsync(currentFolder.path);
      const filesWithInfo = await Promise.all(
        filesList.map(async (file) => {
          if (!file.endsWith('.enc')) return null;
          
          const fileInfo = await FileSystem.getInfoAsync(currentFolder.path + file);
          const thumbnailPath = THUMBNAIL_DIR + currentFolder.name + '/' + file.replace('.enc', '.jpg');
          
          let thumbnailExists = false;
          try {
            const thumbInfo = await FileSystem.getInfoAsync(thumbnailPath);
            thumbnailExists = thumbInfo.exists;
          } catch {
            thumbnailExists = false;
          }
          
          // CORRECTION: Déterminer le type à partir du nom du fichier
          const fileType = file.startsWith('video_') ? 'video' : 'image';
          
          return {
            name: file,
            uri: currentFolder.path + file,
            thumbnail: thumbnailExists ? thumbnailPath : null,
            size: fileInfo.size,
            date: fileInfo.modificationTime,
            type: fileType, // Utiliser le type déterminé
          };
        })
      );
      
      const validFiles = filesWithInfo.filter(file => file !== null);
      validFiles.sort((a, b) => b.date - a.date);
      setFiles(validFiles);
      
      // Mettre à jour le nombre de fichiers dans le dossier courant
      if (currentFolder) {
        const updatedFolders = folders.map(folder => {
          if (folder.name === currentFolder.name) {
            return {
              ...folder,
              fileCount: validFiles.length
            };
          }
          return folder;
        });
        setFolders(updatedFolders);
      }
    } catch (error) {
      console.error('Load files error:', error);
      setFiles([]);
    }
  };

  const updateFolderFileCount = async (folderName) => {
  try {
    const folderPath = VAULT_DIR + folderName + '/';
    const filesList = await FileSystem.readDirectoryAsync(folderPath);
    const encFiles = filesList.filter(file => file.endsWith('.enc'));
    
    const updatedFolders = folders.map(folder => {
      if (folder.name === folderName) {
        return {
          ...folder,
          fileCount: encFiles.length
        };
      }
      return folder;
    });
    setFolders(updatedFolders);
  } catch (error) {
    console.error('Update folder count error:', error);
  }
};

  const pickAndEncryptMedia = async () => {
    try {
      if (!currentFolder) {
        Alert.alert('Erreur', 'Veuillez d\'abord sélectionner ou créer un dossier');
        return;
      }

      // CORRECTION 3: Mettre à jour le temps d'activité pour éviter le verrouillage
      updateLastActiveTime();

      // Demander la permission pour la galerie
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à la galerie dans les paramètres',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'OK', onPress: () => {} }
          ]
        );
        return;
      }

      // Sélectionner des médias
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images','videos'],
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        setIsLoading(true);
        let successCount = 0;
        
        // Traiter chaque média sélectionné
        for (const asset of result.assets) {
          const type = asset.type === 'video' ? 'video' : 'image';
          try {
            await encryptAndStoreFile(asset.uri, type);
            successCount++;
          } catch (error) {
            console.error('Error processing file:', error);
          }
        }
        
await loadFiles();
// Mettre à jour le compteur du dossier
if (currentFolder) {
  await updateFolderFileCount(currentFolder.name);
}
        setIsLoading(false);
        
        if (successCount > 0) {
          Alert.alert('Succès', `${successCount} média(s) ajouté(s) au dossier "${currentFolder.name}"`);
        } else {
          Alert.alert('Erreur', 'Aucun média n\'a pu être ajouté');
        }
      }
    } catch (error) {
      console.error('Pick media error:', error);
      setIsLoading(false);
      Alert.alert('Erreur', error.message || 'Impossible d\'ajouter le média');
    }
  };

  const encryptAndStoreFile = async (fileUri, type) => {
    try {
      // Lire le fichier en base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Créer un objet avec métadonnées
      const fileData = {
        type,
        data: base64,
        timestamp: Date.now(),
        originalUri: fileUri,
      };

      // Chiffrer avec expo-crypto
      const encrypted = await encryptData(JSON.stringify(fileData), password);

      // Générer un nom unique AVEC le type
      const fileName = generateUniqueFileName(type);
      const filePath = currentFolder.path + fileName;

      // Sauvegarder le fichier chiffré
      await FileSystem.writeAsStringAsync(filePath, encrypted);

      // Créer un dossier pour les miniatures de ce dossier
      const folderThumbDir = THUMBNAIL_DIR + currentFolder.name + '/';
      try {
        await FileSystem.makeDirectoryAsync(folderThumbDir, { intermediates: true });
      } catch {
        // Le dossier existe déjà
      }

      // Créer une miniature pour les images
      if (type === 'image') {
        await createThumbnail(fileUri, fileName, folderThumbDir);
      }

      console.log('Fichier chiffré et sauvegardé:', fileName);
      return fileName;
    } catch (error) {
      console.error('Encrypt and store error:', error);
      throw new Error('Impossible de chiffrer le fichier: ' + error.message);
    }
  };

  const createThumbnail = async (imageUri, fileName, folderThumbDir) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 200, height: 200 } }],
        { 
          compress: 0.5, 
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true 
        }
      );

      if (!manipResult.base64) {
        throw new Error('No base64 data in thumbnail result');
      }

      const thumbnailPath = folderThumbDir + fileName.replace('.enc', '.jpg');
      await FileSystem.writeAsStringAsync(
        thumbnailPath,
        manipResult.base64,
        { encoding: FileSystem.EncodingType.Base64 }
      );
    } catch (error) {
      console.error('Thumbnail creation error:', error);
    }
  };

  const decryptAndViewFile = async (file) => {
    try {
      updateLastActiveTime();
      
      // Lire le fichier chiffré
      const safeUri = file.uri.replace(/([^:]\/)\/+/g, "$1");
const encryptedData = await FileSystem.readAsStringAsync(safeUri);

      
      // Déchiffrer avec expo-crypto
      const decryptedStr = await decryptData(encryptedData, password);
      const decryptedData = JSON.parse(decryptedStr);

      // Créer un fichier temporaire
      const extension = decryptedData.type === 'image' ? 'jpg' : 'mp4';
      const tempPath = FileSystem.cacheDirectory + `temp_${Date.now()}.${extension}`;
      
      // Écrire le fichier décrypté
      await FileSystem.writeAsStringAsync(tempPath, decryptedData.data, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      setMediaType(decryptedData.type);
      setViewingMedia(tempPath);
      
    } catch (error) {
      console.error('Decryption error:', error);
      Alert.alert(
        'Erreur', 
        error.message.includes('Decryption failed')
          ? 'Mot de passe incorrect ou fichier corrompu'
          : 'Impossible d\'ouvrir le fichier'
      );
    }
  };

  const deleteFile = async (fileName) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce fichier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const filePath = currentFolder.path + fileName;
              await FileSystem.deleteAsync(filePath);
              
              // Supprimer la miniature si elle existe
              const thumbnailPath = THUMBNAIL_DIR + currentFolder.name + '/' + fileName.replace('.enc', '.jpg');
              try {
                await FileSystem.deleteAsync(thumbnailPath);
              } catch {
                // La miniature n'existe pas, on ignore
              }
              
              await loadFiles();
// Mettre à jour le compteur du dossier
if (currentFolder) {
  await updateFolderFileCount(currentFolder.name);
}
              Alert.alert('Succès', 'Fichier supprimé');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le fichier');
            }
          },
        },
      ]
    );
  };

  // Fonction pour réinitialiser l'application (pour les tests)
  const resetApp = async () => {
    Alert.alert(
      'Réinitialiser',
      'Voulez-vous vraiment tout supprimer ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(VAULT_DIR, { idempotent: true });
              await FileSystem.deleteAsync(THUMBNAIL_DIR, { idempotent: true });
              await SecureStore.deleteItemAsync(PASSWORD_KEY);
              setFiles([]);
              setFolders([]);
              setCurrentFolder(null);
              setIsUnlocked(false);
              setPassword('');
              await setupDirectories();
              await loadFolders();
              Alert.alert('Succès', 'Application réinitialisée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de réinitialiser');
            }
          },
        },
      ]
    );
  };

  /* ============ ÉCRANS ============ */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#414d63" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.lockScreenContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.lockContent}>
          <Ionicons name="lock-closed" size={80} color="#414d63" />
          <Text style={styles.appTitle}>Galerie Privée</Text>
          <Text style={styles.appSubtitle}>Coffre-fort sécurisé</Text>
          
          {biometricEnabled && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricAuth}
            >
              <Ionicons name="finger-print" size={24} color="#FFF" />
              <Text style={styles.biometricButtonText}>Déverrouiller avec biométrie</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.passwordButton}
            onPress={() => setShowPasswordInput(true)}
          >
            <Text style={styles.passwordButtonText}>Utiliser le mot de passe</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showPasswordInput}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPasswordInput(false)}
        >
          <BlurView intensity={80} style={styles.modalContainer}>
            <View style={styles.passwordModal}>
              <Text style={styles.modalTitle}>Mot de passe</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Entrez votre mot de passe"
                secureTextEntry
                autoFocus
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => handlePasswordAuth(password)}
                placeholderTextColor="#8E8E93"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowPasswordInput(false);
                    setPassword('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => handlePasswordAuth(password)}
                >
                  <Text style={styles.submitButtonText}>Valider</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Galerie Privée</Text>
          <Text style={styles.headerSubtitle}>
            {currentFolder ? currentFolder.name : 'Sélectionnez un dossier'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.folderButton}
            onPress={() => setShowFolderModal(true)}
          >
            <Ionicons name="folder-open" size={22} color="#414d63" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.lockButton}
            onPress={() => setIsUnlocked(false)}
          >
            <Ionicons name="lock-closed" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des dossiers */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.folderScroll}
        contentContainerStyle={styles.folderContainer}
      >
        {folders.map((folder, index) => (
          <TouchableOpacity
            key={folder.name}
            style={[
              styles.folderItem,
              currentFolder?.name === folder.name && styles.folderItemActive
            ]}
            onPress={() => {
              setCurrentFolder(folder);
            }}
            onLongPress={() => deleteFolder(folder.name)}
          >
            <Ionicons 
              name="folder" 
              size={24} 
              color={currentFolder?.name === folder.name ? "#414d63" : "#8E8E93"} 
            />
            <Text 
              style={[
                styles.folderName,
                currentFolder?.name === folder.name && styles.folderNameActive
              ]}
              numberOfLines={1}
            >
              {folder.name}
            </Text>
            <Text style={styles.folderCount}>{folder.fileCount}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.addFolderButton}
          onPress={() => setShowFolderModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#414d63" />
          <Text style={styles.addFolderText}>Nouveau</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bouton d'ajout */}
      {currentFolder && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={pickAndEncryptMedia}
          disabled={!currentFolder}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>
            Ajouter à {currentFolder?.name || '...'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Liste des fichiers */}
      {!currentFolder ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={80} color="#C7C7CC" />
          <Text style={styles.emptyStateTitle}>Aucun dossier sélectionné</Text>
          <Text style={styles.emptyStateText}>
            Sélectionnez un dossier ou créez-en un nouveau
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setShowFolderModal(true)}
          >
            <Text style={styles.emptyStateButtonText}>Créer un dossier</Text>
          </TouchableOpacity>
        </View>
      ) : files.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={80} color="#C7C7CC" />
          <Text style={styles.emptyStateTitle}>Dossier vide</Text>
          <Text style={styles.emptyStateText}>
            Ajoutez des photos et vidéos pour les protéger
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={pickAndEncryptMedia}
          >
            <Text style={styles.emptyStateButtonText}>Ajouter maintenant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.name}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.fileCard}
              onPress={() => decryptAndViewFile(item)}
              onLongPress={() => deleteFile(item.name)}
              delayLongPress={500}
            >
              {item.thumbnail ? (
                <Image 
                  source={{ uri: item.thumbnail }} 
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons 
                    name={item.type === 'video' ? 'videocam' : 'image'}
                    size={40} 
                    color="#C7C7CC" 
                  />
                </View>
              )}
              <View style={styles.fileInfo}>
                <View style={styles.fileTypeIndicator}>
                  <Ionicons
                    name={item.type === 'video' ? 'videocam' : 'image'}
                    size={12}
                    color="#8E8E93"
                  />
                </View>
                <Text style={styles.fileDate}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal création dossier */}
      <Modal
        visible={showFolderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFolderModal(false)}
      >
        <BlurView intensity={80} style={styles.modalContainer}>
          <View style={styles.folderModal}>
            <Text style={styles.modalTitle}>Nouveau dossier</Text>
            <TextInput
              style={styles.folderInput}
              placeholder="Nom du dossier"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              placeholderTextColor="#8E8E93"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowFolderModal(false);
                  setNewFolderName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={createFolder}
              >
                <Text style={styles.submitButtonText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Modal de visualisation */}
      <Modal
        visible={!!viewingMedia}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setViewingMedia(null);
          setMediaType(null);
          if (videoRef.current) {
            videoRef.current.unloadAsync();
          }
        }}
      >
        <View style={styles.viewerContainer}>
          <TouchableOpacity
            style={styles.closeViewerButton}
            onPress={() => {
              setViewingMedia(null);
              setMediaType(null);
              if (videoRef.current) {
                videoRef.current.unloadAsync();
              }
            }}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          
          {mediaType === 'image' && viewingMedia && (
            <Image 
              source={{ uri: viewingMedia }} 
              style={styles.fullMedia} 
              resizeMode="contain" 
            />
          )}
          
          {mediaType === 'video' && viewingMedia && (
            <Video
              ref={videoRef}
              source={{ uri: viewingMedia }}
              style={styles.fullMedia}
              useNativeControls
              resizeMode="contain"
              isLooping
              shouldPlay
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  lockScreenContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  lockContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 20,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 40,
  },
  biometricButton: {
    flexDirection: 'row',
    backgroundColor: '#414d63',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  biometricButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  passwordButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  passwordButtonText: {
    color: '#414d63',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  folderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockButton: {
    backgroundColor: '#FF3B30',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  folderScroll: {
    maxHeight: 80,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  folderContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  folderItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    minWidth: 80,
  },
  folderItemActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#414d63',
  },
  folderName: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '500',
  },
  folderNameActive: {
    color: '#414d63',
    fontWeight: '600',
  },
  folderCount: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  addFolderButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  addFolderText: {
    fontSize: 12,
    color: '#414d63',
    marginTop: 4,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#414d63',
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  fileCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: '#F2F2F7',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileTypeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDate: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: '#414d63',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  passwordModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  folderModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#F2F2F7',
  },
  folderInput: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#F2F2F7',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    color: '#414d63',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#414d63',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeViewerButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullMedia: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
});