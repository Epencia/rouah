import React, { useState, useContext } from "react";
import {
  StyleSheet,
  View,
  Image,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';

export default function Deconnexion({ navigation }) {
  const [user, setUser] = useContext(GlobalContext);

  // === FONCTION DE DÉCONNEXION ===
  const handleLogout = async () => {
    try {
      // 1. Appel API de déconnexion
      const response = await fetch('https://rouah.net/api/deconnexion.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Envoie l'ID utilisateur si disponible
        body: JSON.stringify({
          utilisateur_id: user?.utilisateur_id || user?.matricule || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.warn("API déconnexion échouée :", result.message);
      }
    } catch (error) {
      console.warn("Erreur réseau lors de la déconnexion :", error.message);
      // On continue la déconnexion locale même si l'API échoue
    } finally {
      // 2. Déconnexion locale
      setUser(null);
      navigation.replace("Bienvenue"); // replace() évite le retour en arrière
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Image
            source={require("../assets/images/EmptyState.png")}
            style={styles.image}
            resizeMode="contain"
          />

          <Text style={styles.title}>
            {user?.nom_prenom ? `${user.nom_prenom}` : "Déconnexion"}
          </Text>

          <Text style={styles.description}>
            Vous serez déconnecté si vous cliquez sur le bouton 'Se déconnecter' !
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <View style={styles.buttonContent}>
                <View style={{ width: 29 }} />
                <Text style={styles.logoutButtonText}>Se déconnecter</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={17}
                  color="#fff"
                  style={styles.icon}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('BottomTabs')}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  image: {
    width: 300,
    height: 300,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1d1d1d',
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: '#8c9197',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  actions: {
    width: '100%',
    marginTop: 'auto',
  },
  logoutButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  icon: {
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: '#000',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
});