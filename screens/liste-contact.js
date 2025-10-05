import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts'; // Import manquant ajouté
import { GlobalContext } from '../global/GlobalState';

export default function ListeContact({ navigation }) {
  // États
  const [contacts, setContacts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [famille, setFamille] = useState([]);
  const [status, setStatus] = useState('Aucun contact récupéré');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user] = useContext(GlobalContext);

  // Rafraîchissement
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    getListeContact();
    getFamilleContact();
    setRefreshing(false);
  };

  // Effet initial
  useEffect(() => {
    const delay = 10000;
    getFamilleContact();
    getListeContact();
    const intervalId = setInterval(getListeContact2, delay);
    return () => clearInterval(intervalId);
  }, []);

  // Filtrage des contacts
  const filteredContacts = useMemo(() => {
    if (!searchText) return contacts;
    return contacts.filter(item =>
      item.nom_prenom_contact.toLowerCase().includes(searchText.toLowerCase()) ||
      item.telephone_contact.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [contacts, searchText]);

  const cleanPhoneNumber = (phone) => {
    if (!phone || typeof phone !== 'string') return '';
    return phone.replace(/\D/g, '');
  };

  // Charger les contacts
  const getListeContact = async () => {
    setIsLoading(true);
    try {
      
      const response = await fetch(`https://rouah.net/api/liste-contact.php?matricule=${user?.matricule}`, {
        //headers: { 'Cache-Control': 'no-cache' },
      });
      const newData = await response.json();
      setContacts(newData);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // liste 
const getListeContact2 = async () => {
 try {

  const response = await fetch(`https://rouah.net/api/liste-contact.php?matricule=${user?.matricule}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  const newData = await response.json();
  setContacts(newData);
} catch (error) {
  setError(error);
}
}

  // Valider la sélection
  const handleValidate = async (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert('Aucun contact sélectionné');
      return;
    }
    try {
     
      const response = await fetch('https://rouah.net/api/edition-famille.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demandeur: user.matricule,
          receveur: phoneNumber
        }),
      });

      const result = await response.json();
      Alert.alert('Message', result.message || result);
      getFamilleContact(); // Rafraîchir la liste après modification

    } catch (err) {
      Alert.alert('Erreur', err.message || 'Échec de l\'opération');
    }
  };

  // Charger les contacts existants
  const getFamilleContact = async () => {
    try {

      const response = await fetch(`https://rouah.net/api/liste-famille.php?matricule=${user?.matricule}`);
      if (!response.ok) return;
      const data = await response.json();
      setFamille(data);
    } catch (error) {
      console.error('Erreur chargement contacts existants:', error);
    }
  };

  // Récupérer et envoyer les contacts
  const getAndSendContacts = async () => {
    try {

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setStatus('Permission refusée');
        Alert.alert('Erreur', 'Permission d\'accès aux contacts refusée');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      if (data.length > 0) {
        const formattedContacts = data.map(contact => ({
          name: contact.name || 'Inconnu',
          phoneNumbers: contact.phoneNumbers
            ? contact.phoneNumbers.map(num => num.number).filter(num => num)
            : [],
        }));

        const response = await fetch('https://rouah.net/api/contact.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: formattedContacts, proprietaire: user.matricule }),
        });

        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.message || 'Échec de l\'envoi');
        }

        setStatus(`Succès : ${response.status} - ${responseData.message || 'Contacts envoyés'}`);
        Alert.alert('Succès', 'Contacts sauvegardés avec succès');
        getListeContact(); // Rafraîchir la liste après ajout
      } else {
        setStatus('Aucun contact trouvé');
        Alert.alert('Info', 'Aucun contact trouvé sur l\'appareil');
      }
    } catch (error) {
      setStatus('Erreur lors de l\'envoi');
      Alert.alert('Erreur', `Échec de l'envoi : ${error.message}`);
      console.error(error);
    }
  };

  // Rendu d'un contact
  const renderItem = ({ item }) => {
    const initials = item.nom_prenom_contact
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

    return (
      <TouchableOpacity
        style={[
          styles.contactItem,
          famille.some(f => cleanPhoneNumber(f.telephone) === cleanPhoneNumber(item.telephone_contact)) && 
            styles.selectedContact,
        ]}
        onPress={() => handleValidate(item.telephone_contact)}
        activeOpacity={0.8}
      >
        <View style={styles.contactInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.contactDetails}>
            <Text style={styles.name}>{item.nom_prenom_contact}</Text>
            <Text style={styles.phone}>
              {item.telephone_contact || 'Aucun numéro'}
            </Text>
          </View>
          {famille.some(f => cleanPhoneNumber(f.telephone) === cleanPhoneNumber(item.telephone_contact)) && (
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Erreur et Chargement
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5500dc" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <MaterialCommunityIcons color="#266EF1" name="access-point-off" size={150} />
        <Text style={{ fontSize: 18, marginRight: 10, marginLeft: 10, marginBottom: 10 }}>
          Pas de connexion internet !
        </Text>
        <TouchableOpacity 
          onPress={handleRefresh} 
          style={{ backgroundColor: '#0099cc', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Barre de recherche */}
      {contacts.length > 0 ? (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#8E8E93"
          />
        </View>
      ) : (
        <View style={styles.emptyMessage}>
          <Text style={styles.emptyText}>Aucune donnée disponible</Text>
        </View>
      )}

      {/* Liste */}
      <FlatList
        data={filteredContacts}
        renderItem={renderItem}
        keyExtractor={item => item.code_contact}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#C7C7CC" />
            <Text>{searchText ? 'Aucun résultat' : 'Aucun contact'}</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.floatingButtonRight}
        onPress={getAndSendContacts}
      >
        <Feather name="refresh-cw" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  validateBtn: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 8,
  },
  disabledBtn: {
    backgroundColor: '#ccc',
  },
  validateText: {
    color: '#fff',
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#000',
  },
  contactItem: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedContact: {
    backgroundColor: '#E8F3FF',
    borderColor: '#007AFF',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fa4447',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  contactDetails: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  phone: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    margin: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '500',
  },
  floatingButtonRight: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#fa4447',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 3,
  },
});