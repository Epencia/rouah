import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MaterialCommunityIcons, Feather, MaterialIcons} from '@expo/vector-icons';

const AnnonceDetails = ({navigation, route}) => {
  const [annonce, setAnnonce] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matricule, setMatricule] = useState(null);

  // Récupérer les paramètres de navigation
  const { code } = route.params;


useEffect(() => {
  const fetchMatricule = async () => {
    const storedMatricule = await AsyncStorage.getItem('matricule');
    setMatricule(storedMatricule);
  };
  
  fetchMatricule();
}, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer le matricule de l'utilisateur connecté
        const matricule = await AsyncStorage.getItem('matricule');
       if (!matricule) {
      console.warn('⚠️ Veuillez vous connecter pour accéder à cette fonctionnalité.');
      return;
      }

        // Récupérer les détails de l'annonce avec les infos utilisateur
        const response = await fetch(`https://rouah.net/api/details-annonce.php?code=${code}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          setAnnonce(data[0]);
        } else {
          throw new Error('Aucune donnée disponible');
        }

      } catch (error) {
        Alert.alert('Erreur', 'Impossible de charger les détails de l\'annonce');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Configurer le header de navigation
    navigation.setOptions({
      title: 'Détails de l\'annonce',
    });
  }, [code]);

  // Validation
  useEffect(() => {
    const trackView = async () => {
      try {
        // 1. Récupérer le matricule
        const matricule = await AsyncStorage.getItem('matricule');
    if (!matricule) {
      console.warn('⚠️ Veuillez vous connecter pour accéder à cette fonctionnalité.');
      return;
    }

        // 2. Appeler l'API
        const response = await fetch(
          `https://rouah.net/api/validation-annonce.php?code=${code}&matricule=${matricule}`
        );

        // 3. Vérifier la réponse
        if (!response.ok) throw new Error('Erreur réseau');

        const data = await response.json();

        // 4. Traiter le résultat
        if (data.success) {
          console.log('Suivi réussi:', data.message);
        } else {
          console.warn('Suivi échoué:', data.message);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    trackView();
  }, [code]);

  const handleCall = () => {
    if (annonce?.telephone) {
      Linking.openURL(`tel:${annonce.telephone}`);
    }
  };

  const handleSMS = () => {
    if (annonce?.telephone) {
      Linking.openURL(`sms:${annonce.telephone}`);
    }
  };

  const handleWhatsApp = () => {
    if (annonce?.telephone) {
      Linking.openURL(`https://wa.me/${annonce.telephone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!annonce) {
    return (
      <View style={styles.container}>
        <Text>Aucune donnée disponible pour cette annonce</Text>
      </View>
    );
  }

  return (
     <SafeAreaView style={styles.container} edges={[]}>
    <ScrollView>
      {/* Image de l'annonce */}
      {annonce.photo64_annonce && (
        <Image 
          source={{ uri: `data:${annonce.type_annonce};base64,${annonce.photo64_annonce}` }} 
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Section annonceur */}
      <View style={styles.publisherContainer}>
        {annonce.photo64 && (
          <Image 
            source={{ uri: `data:${annonce.type};base64,${annonce.photo64}` }}
            style={styles.publisherImage}
          />
        )}
        <View style={styles.publisherInfo}>
          <Text style={styles.publisherName}>{annonce.nom_prenom}</Text>
          {annonce.vues !==annonce.audience && (
            <Text style={styles.publisherRating}>
                <MaterialCommunityIcons
                  name={'star'} 
                  size={16} 
                  color="#f39c12" 
                />
              {annonce.categorie || "Sponsorisé"}
            </Text>
          )}
        </View>
      </View>

      {/* Titre */}
      <Text style={styles.title}>{annonce.titre}</Text>

      {/* Prix et quantité */}
      <View style={styles.priceContainer}>
        <Text style={styles.quantity}>Vues : {annonce.vues}</Text>
        <Text style={styles.quantity}>Audience : {annonce.quantite}</Text>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{annonce.description}</Text>
      </View>

      {/* Informations supplémentaires */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <Text>Publiée le : {annonce.date} à {annonce.heure}</Text>
      </View>

      {/* Boutons de contact */}
      {matricule == annonce.utilisateur_id && annonce.telephone && (
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Contacter l'annonceur</Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity 
              style={[styles.contactButton, styles.callButton]}
              onPress={handleCall}
            >
              <MaterialIcons name="call" size={20} color="#fff" />
              <Text style={styles.buttonText}>Appel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.contactButton, styles.smsButton]}
              onPress={handleSMS}
            >
              <MaterialIcons name="sms" size={20} color="#fff" />
              <Text style={styles.buttonText}>SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.contactButton, styles.whatsappButton]}
              onPress={handleWhatsApp}
            >
              <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" />
              <Text style={styles.buttonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  publisherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  publisherImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  publisherInfo: {
    flex: 1,
  },
  publisherName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  publisherRating: {
    fontSize: 14,
    color: '#f39c12',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 23,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  quantity: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
  },
  contactContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#2c3e50',
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  callButton: {
    backgroundColor: '#2ecc71',
  },
  smsButton: {
    backgroundColor: '#3498db',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});

export default AnnonceDetails;