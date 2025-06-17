import React, { useEffect,useState, useContext } from "react";
import {
  View,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';
import { GlobalCarte } from '../global/GlobalCarte';

export default function GeoInteret({ navigation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const [user, setUser] = useContext(GlobalContext);
    const [carte, setCarte] = useContext(GlobalCarte);

  const getData = async () => {
    try {
      const response = await fetch(`https://adores.cloud/api/centre-interet-geoip.php?matricule=${user[0].matricule}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données.');
      console.error(error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const filteredPeople = data.filter(
    item =>
      (item?.nom_prenom &&
        item.nom_prenom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item?.telephone &&
        item.telephone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const callNumber = phone => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const sendSMS = phone => {
    if (phone) {
      Linking.openURL(`sms:${phone}`);
    }
  };

  const openWhatsApp = phone => {
    if (!phone) return;
    const phoneClean = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phoneClean}`;

    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Erreur', "WhatsApp n'est pas installé sur ce téléphone.");
        }
      })
      .catch(err => console.error(err));
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Feather name="search" size={20} color="gray" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Rechercher nom ou téléphone..."
          onChangeText={setSearchTerm}
          value={searchTerm}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="default"
        />
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 7.6717026,
          longitude: -5.0162297,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }}
        // Pas de provider précisé pour utiliser les tuiles OSM
      >
        {/* Tuiles OpenStreetMap */}
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          subdomains="abc"
        />

        {filteredPeople.map(person => {
          const latitude = parseFloat(person.latitude);
          const longitude = parseFloat(person.longitude);

          if (isNaN(latitude) || isNaN(longitude)) return null;

          return (
            <Marker
              key={person.matricule}
              coordinate={{ latitude, longitude }}
              title={person.nom_prenom}
              description={person.telephone}
              onPress={() => setSelectedPerson(person)}
            >
              {person.photo64 && (
                <Image
                  source={{ uri: `data:${person.type};base64,${person.photo64}` }}
                  style={styles.markerImage}
                />
              )}
            </Marker>
          );
        })}
      </MapView>

      {/* Modal d'action */}
      <Modal
        visible={!!selectedPerson}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPerson(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{selectedPerson?.nom_prenom}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => selectedPerson && callNumber(selectedPerson.telephone)}
              >
                <Feather name="phone" size={20} color="white" />
                <Text style={styles.buttonText}>Appeler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => selectedPerson && sendSMS(selectedPerson.telephone)}
              >
                <Feather name="message-square" size={20} color="white" />
                <Text style={styles.buttonText}>SMS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => selectedPerson && openWhatsApp(selectedPerson.telephone)}
              >
                <Feather name="message-circle" size={20} color="white" />
                <Text style={styles.buttonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>

            <Pressable onPress={() => setSelectedPerson(null)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Localisation')}>
        <Feather name="refresh-cw" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'gray',
    paddingHorizontal: 8,
    margin: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  map: {
    flex: 1,
  },
  markerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    width: 80,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: '#007bff',
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
  },
});
