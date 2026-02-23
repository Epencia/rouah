import React, { useState, useContext, useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
   BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

export default function Deconnexion({ navigation }) {
  const [user, setUser] = useContext(GlobalContext);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isLoading) {
          return true;
        }
        navigation.navigate('BottomTabs');
        return true;
      }
    );

    return () => backHandler.remove();
  }, [isLoading, navigation]);

   // NETTOYAGE COMPLET DES DONNÉES
  const clearAllData = async () => {
    try {
      // Récupérer toutes les clés
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filtrer les clés à supprimer (tout sauf peut-être les préférences générales)
      const keysToRemove = allKeys.filter(key => 
        key.includes('user') || 
        key.includes('token') || 
        key.includes('matricule') ||
        key.includes('biometric') ||
        key.includes('credentials') ||
        key.includes('session')
      );
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      // Supprimer aussi les items spécifiques
      await AsyncStorage.removeItem('userCredentials');
      await AsyncStorage.removeItem('biometricEnabled');
      
      // Si l'utilisateur avait un login, supprimer sa préférence biométrique
      if (user?.login) {
        await AsyncStorage.removeItem(`biometric_${user.login}`);
      }
      
      //console.log('✅ Toutes les données ont été nettoyées');
    } catch (error) {
      //console.warn('❌ Erreur nettoyage données:', error);
    }
  };

  // === FONCTION DE DÉCONNEXION AMÉLIORÉE ===
  const handleLogout = async () => {
    setModalVisible(true);
    setIsLoading(true);

    try {
      // 1. Appel API de déconnexion
      await fetch('https://rouah.net/api/deconnexion.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          utilisateur_id: user?.utilisateur_id || user?.matricule || null,
        }),
      }).catch(err => console.warn('API déconnexion échouée'));

      // 2. NETTOYAGE COMPLET DES DONNÉES LOCALES
      await clearAllData();

      // 3. Petit délai pour montrer le succès
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Déconnexion locale
      setUser(null);
      
      // 5. Redirection avec réinitialisation complète
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { name: 'Connexion' },
          ],
        })
      );
      
    } catch (error) {
      console.warn("Erreur lors de la déconnexion :", error.message);
      
      // Même en cas d'erreur, on nettoie et redirige
      await clearAllData();
      setUser(null);
      
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { name: 'Connexion' },
          ],
        })
      );
    } finally {
      setModalVisible(false);
      setIsLoading(false);
    }
  };
  // === CONFIRMATION AVANT DÉCONNEXION ===
  const confirmLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Se déconnecter",
          onPress: handleLogout,
          style: "destructive"
        }
      ],
      { cancelable: true }
    );
  };

  // === FORMATAGE DU NOM D'UTILISATEUR ===
  const getUserDisplayName = () => {
    if (!user?.nom_prenom) return "Utilisateur";
    
    // Afficher seulement le prénom si disponible
    const names = user.nom_prenom.split(' ');
    if (names.length > 1) {
      return `${names[0]} ${names[1].charAt(0)}.`;
    }
    return user.nom_prenom;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left', 'right']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Image d'illustration */}
            <Image
              source={require("../assets/images/EmptyState.png")}
              style={styles.image}
              resizeMode="contain"
            />

            {/* Message de bienvenue */}
            <View style={styles.welcomeContainer}>
              <MaterialIcons name="waving-hand" size={28} color="#414d63" />
              <Text style={styles.welcomeText}>
                Au revoir {getUserDisplayName()} 👋
              </Text>
            </View>

            {/* Informations utilisateur */}
            {user && (
              <View style={styles.userInfoCard}>
                <View style={styles.userInfoRow}>
                  <Ionicons name="person-outline" size={18} color="#666" />
                  <Text style={styles.userInfoText}>
                    {user.nom_prenom || 'Non renseigné'}
                  </Text>
                </View>
                
                {user.email && (
                  <View style={styles.userInfoRow}>
                    <Ionicons name="mail-outline" size={18} color="#666" />
                    <Text style={styles.userInfoText}>{user.email}</Text>
                  </View>
                )}
                
                {user.matricule && (
                  <View style={styles.userInfoRow}>
                    <Ionicons name="card-outline" size={18} color="#666" />
                    <Text style={styles.userInfoText}>Matricule: {user.matricule}</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.description}>
              Vous êtes sur le point de vous déconnecter. 
              Vous devrez vous reconnecter pour accéder à nouveau à votre compte.
            </Text>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity 
                onPress={confirmLogout} 
                style={styles.logoutButton}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons
                    name="logout"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.logoutButtonText}>
                    {isLoading ? 'Déconnexion...' : 'Se déconnecter'}
                  </Text>
                  {!isLoading && (
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={17}
                      color="#fff"
                      style={styles.buttonIconRight}
                    />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('BottomTabs')}
                style={styles.cancelButton}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Annuler et rester connecté</Text>
              </TouchableOpacity>
            </View>

            {/* Informations supplémentaires */}
            <View style={styles.infoContainer}>
              <MaterialIcons name="info-outline" size={14} color="#999" />
              <Text style={styles.infoText}>
                La déconnexion fermera votre session sur cet appareil uniquement
              </Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Modal de chargement */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#414d63" />
            <Text style={styles.modalText}>
              {isLoading ? 'Déconnexion en cours...' : 'Redirection...'}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  image: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  welcomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f0f3ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#414d63',
    marginLeft: 8,
  },
  userInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    flex: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#8c9197',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  actions: {
    width: '100%',
    marginTop: 10,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonIconRight: {
    marginLeft: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#414d63',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#414d63',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 6,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalText: {
    marginTop: 16,
    fontSize: 16,
    color: '#414d63',
    fontWeight: '500',
  },
});