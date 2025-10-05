import React, { useEffect, useState, useRef, useContext } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConnexionInternet } from '../global/network/internet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalContext } from '../global/GlobalState';

export default function EditionBoutique() {
  const [isConnected, setIsConnected] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [nomZone, setNomZone] = useState('');
  const [rayonZone, setRayonZone] = useState('');
  const [coords, setCoords] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [matricule, setMatricule] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedMembre, setSelectedMembre] = useState(null);
  const webviewRef = useRef(null);

  const [user] = useContext(GlobalContext);

  // Fetch matricule
  const fetchMatricule = async () => {
    try {
      const storedMatricule = await AsyncStorage.getItem('matricule');
      if (storedMatricule) {
        setMatricule(storedMatricule);
      }
    } catch (error) {
      console.error('Erreur récupération matricule:', error);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`https://rouah.net/api/liste-categorie.php`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Erreur chargement Categories:', error);
    }
  };

  // Check internet connection
  useEffect(() => {
    fetchCategories();

    let isMounted = true;
    let interval;

    const checkConnection = async () => {
      try {
        const status = await ConnexionInternet();
        if (isMounted) {
          setIsConnected(status);
          if (status) {
            fetchCategories();
          }
        }
      } catch (error) {
        console.error('Erreur vérification connexion:', error);
      }
    };

    checkConnection();
    interval = setInterval(checkConnection, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch zones when matricule and map are ready
  useEffect(() => {
    if (matricule && mapReady) {
      fetchZones();
    }
  }, [matricule, mapReady]);

  // Fetch zones
  const fetchZones = async () => {

    try {
      const response = await fetch(`https://rouah.net/api/liste-zone.php`);
      const data = await response.json();
      
      if (data.length > 0 && webviewRef.current) {
        const script = `
          if (typeof map !== 'undefined') {
            // Clear existing markers
            map.eachLayer(layer => {
              if (layer instanceof L.Marker) {
                map.removeLayer(layer);
              }
            });

            // Add new markers
            ${data.map(zone => `
              const marker = L.marker([${parseFloat(zone.latitude_zone)}, ${parseFloat(zone.longitude_zone)}], {
                icon: L.divIcon({
                  className: 'custom-marker',
                  html: '<div style="background-color: #266EF1; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; font-weight: bold;">${zone.nom_zone.charAt(0)}</div>',
                  iconSize: [30, 30],
                  iconAnchor: [15, 15]
                })
              }).addTo(map);
              
              marker.bindPopup('<div style="color:black; min-width: 200px;"><strong>${zone.nom_zone}</strong><br>${zone.adresse_zone}<br>Lat: ${zone.latitude_zone}<br>Lng: ${zone.longitude_zone}</div>');
              
              marker.on('contextmenu', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'longpress',
                  zone: ${JSON.stringify(zone)}
                }));
              });
            `).join('\n')}
          }
        `;
        webviewRef.current.injectJavaScript(script);
      }
    } catch (err) {
      console.error('Erreur chargement zones:', err);
    }
  };

  const enregistrerZone = async () => {
    if (!nomZone.trim() || !coords || !selectedMembre) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    const code = 'Z' + Date.now();
    const data = {
      code_zone: code,
      nom_zone: nomZone,
      rayon_zone: rayonZone,
      latitude_zone: coords.lat,
      longitude_zone: coords.lng,
      utilisateur_id: user.matricule ,
      beneficiaire_id: selectedMembre.matricule
    };

    try {
      const response = await fetch('https://rouah.net/api/edition-zone.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success && webviewRef.current) {
        Alert.alert('✅ Zone enregistrée', nomZone);
        const script = `
          if (typeof map !== 'undefined') {
            const marker = L.marker([${coords.lat}, ${coords.lng}], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background-color: #4CAF50; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; font-weight: bold;">${nomZone.charAt(0)}</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              })
            }).addTo(map);
            
            marker.bindPopup('<div style="color:green; min-width: 200px;"><strong>${nomZone.replace(/'/g, "\\'")}</strong><br>Responsable: ${data.beneficiaire_id}<br>Lat: ${coords.lat}<br>Lng: ${coords.lng}</div>').openPopup();
            
            marker.on('contextmenu', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'longpress',
                zone: ${JSON.stringify({...data, id_zone: result.id_zone})}
              }));
            });
          }
        `;
        webviewRef.current.injectJavaScript(script);
      } else {
        Alert.alert("Erreur", result.error || "Impossible d'enregistrer la zone.");
      }
      setModalVisible(false);
      setNomZone('');
      setRayonZone('');
      setCoords(null);
      setSelectedMembre(null);
    } catch (err) {
      Alert.alert("Erreur réseau", err.message);
      setModalVisible(false);
    }
  };

  const modifierZone = async () => {
    if (!nomZone.trim() || !selectedZone || !selectedMembre) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    const data = {
      id_zone: selectedZone.id_zone,
      nom_zone: nomZone,
      rayon_zone: rayonZone,
      latitude_zone: selectedZone.latitude_zone,
      longitude_zone: selectedZone.longitude_zone,
      utilisateur_id: user.matricule,
      beneficiaire_id: selectedMembre.matricule
    };

    try {
      const response = await fetch('https://rouah.net/api/update-zone.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success && webviewRef.current) {
        Alert.alert('✅ Zone modifiée', nomZone);
        const script = `
          if (typeof map !== 'undefined') {
            map.eachLayer(layer => {
              if (layer instanceof L.Marker && layer.getLatLng().lat == ${selectedZone.latitude_zone} && layer.getLatLng().lng == ${selectedZone.longitude_zone}) {
                layer.setPopupContent('<div style="color:green; min-width: 200px;"><strong>${nomZone.replace(/'/g, "\\'")}</strong><br>Responsable: ${data.beneficiaire_id}<br>Lat: ${selectedZone.latitude_zone}<br>Lng: ${selectedZone.longitude_zone}</div>');
              }
            });
          }
        `;
        webviewRef.current.injectJavaScript(script);
      } else {
        Alert.alert("Erreur", result.error || "Impossible de modifier la zone.");
      }
      setEditModalVisible(false);
      setNomZone('');
      setRayonZone('');
      setSelectedZone(null);
      setSelectedMembre(null);
    } catch (err) {
      Alert.alert("Erreur réseau", err.message);
      setEditModalVisible(false);
    }
  };

  const supprimerZone = () => {
    if (!selectedZone) return;

    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous supprimer la zone "${selectedZone.nom_zone}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch('https://rouah.net/api/delete-zone.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_zone: selectedZone.id_zone })
              });
              const result = await response.json();
              if (result.success && webviewRef.current) {
                Alert.alert('✅ Zone supprimée', selectedZone.nom_zone);
                const script = `
                  if (typeof map !== 'undefined') {
                    map.eachLayer(layer => {
                      if (layer instanceof L.Marker && layer.getLatLng().lat == ${selectedZone.latitude_zone} && layer.getLatLng().lng == ${selectedZone.longitude_zone}) {
                        map.removeLayer(layer);
                      }
                    });
                  }
                `;
                webviewRef.current.injectJavaScript(script);
              } else {
                Alert.alert("Erreur", result.error || "Impossible de supprimer la zone.");
              }
              setEditModalVisible(false);
              setSelectedZone(null);
            } catch (err) {
              Alert.alert("Erreur réseau", err.message);
              setEditModalVisible(false);
            }
          }
        }
      ]
    );
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let map;
        try {
          map = L.map('map').setView([5.34, -4.03], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);

          map.on('click', function(e) {
            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'click', lat, lng }));
          });

          map.whenReady(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
          });
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'Erreur initialisation carte: ' + error.message
          }));
        }
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    fetchMatricule();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {isConnected === null ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={styles.loadingText}>Vérification de la connexion...</Text>
        </View>
      ) : isConnected ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center',backgroundColor:'white' }}>
          <MaterialCommunityIcons color="#266EF1" name="access-point-off" size={150}/>
          <Text style={{ fontSize: 18,marginRight:10,marginLeft:10,marginBottom:10}}>
            Pas de connexion internet !
          </Text>
          <TouchableOpacity onPress={fetchZones} style={{ backgroundColor: '#007aff',paddingVertical: 10,paddingHorizontal: 20,borderRadius: 5,}}>
            <Text style={{ color: 'white',fontSize: 16,fontWeight: 'bold',textAlign: 'center', }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            javaScriptEnabled
            domStorageEnabled
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                switch (data.type) {
                  case 'click':
                    setCoords({ lat: data.lat, lng: data.lng });
                    setModalVisible(true);
                    break;
                  case 'longpress':
                    setSelectedZone(data.zone);
                    setNomZone(data.zone.nom_zone);
                    // Trouver le membre correspondant
                    const membre = categories.find(m => m.matricule == data.zone.utilisateur_id);
                    setSelectedMembre(membre);
                    setEditModalVisible(true);
                    break;
                  case 'mapReady':
                    setMapReady(true);
                    break;
                }
              } catch (error) {
                console.error('Erreur réception message:', error);
              }
            }}
            style={{ flex: 1 }}
            onError={(syntheticEvent) => {
              console.error('Erreur WebView:', syntheticEvent.nativeEvent.description);
            }}
          />

          <Modal
            animationType="slide"
            transparent
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Nouvelle zone d'alerte</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nom de la zone"
                  value={nomZone}
                  onChangeText={setNomZone}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Rayon de la zone"
                  value={rayonZone}
                  onChangeText={setRayonZone}
                />
                
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedMembre}
                    onValueChange={(itemValue) => setSelectedMembre(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Sélectionner un membre" value={null} />
                    {categories.map(membre => (
                      <Picker.Item 
                        key={membre.matricule}
                        label={`${membre.nom_prenom} (${membre.matricule})`}
                        value={membre}
                      />
                    ))}
                  </Picker>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={enregistrerZone}
                  >
                    <Text style={styles.buttonText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="slide"
            transparent
            visible={editModalVisible}
            onRequestClose={() => setEditModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Modifier la zone</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nom de la zone"
                  value={nomZone}
                  onChangeText={setNomZone}
                />

                <TextInput
                  style={styles.modalInput}
                  placeholder="Rayon de la zone"
                  value={rayonZone}
                  onChangeText={setRayonZone}
                />
                
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedMembre}
                    onValueChange={(itemValue) => setSelectedMembre(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Sélectionner une catégorie" value={null} />
                    {categories.map(membre => (
                      <Picker.Item 
                        key={membre.categorie_id}
                        label={`${membre.titre_categorie}`}
                        value={membre}
                      />
                    ))}
                  </Picker>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={supprimerZone}
                  >
                    <Text style={styles.buttonText}>Supprimer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={modifierZone}
                  >
                    <Text style={styles.buttonText}>Modifier</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "white" 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 10, 
    color: '#555' 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalInput: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  saveButton: {
    backgroundColor: '#0A84FF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});