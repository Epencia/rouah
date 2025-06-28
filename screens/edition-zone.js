import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConnexionInternet } from '../global/network/internet';
import { MaterialCommunityIcons,Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditionZone() {
  const [isConnected, setIsConnected] = useState(null);
  const [typedQuery, setTypedQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [nomZone, setNomZone] = useState('');
  const [coords, setCoords] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [consoleMessages, setConsoleMessages] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [matricule, setMatricule] = useState('');
  const webviewRef = useRef(null);

  // Add console message
  const addConsoleMessage = (message, type = 'log') => {
    setConsoleMessages(prev => [...prev, { message, type, id: Date.now() }]);
  };

  // Remove console message
  const removeConsoleMessage = (id) => {
    setConsoleMessages(prev => prev.filter(msg => msg.id !== id));
  };

  // Fetch matricule
  const fetchMatricule = async () => {
    try {
      const storedMatricule = await AsyncStorage.getItem('matricule');
      if (storedMatricule) {
        setMatricule(storedMatricule);
      }
    } catch (error) {
      addConsoleMessage(`Erreur récupération matricule: ${error.message}`, 'error');
    }
  };

  // Check internet connection
  useEffect(() => {
    let isMounted = true;
    let interval;

    const checkConnection = async () => {
      try {
        const status = await ConnexionInternet();
        if (isMounted) {
          setIsConnected(status);
        }
      } catch (error) {
        if (isMounted) {
          addConsoleMessage(`Erreur vérification connexion: ${error.message}`, 'error');
        }
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

  const clearSearch = () => setTypedQuery('');

  // Fetch zones
  const fetchZones = async () => {
    if (!matricule) return;

    try {
      const response = await fetch(`https://adores.cloud/api/liste-zone.php`);
      const data = await response.json();
      
      if (data.length > 0 && webviewRef.current) {
        const script = `
          if (typeof map !== 'undefined') {
            ${data.map(zone => `
              const marker = L.marker([${parseFloat(zone.latitude_zone)}, ${parseFloat(zone.longitude_zone)}]).addTo(map);
              marker.bindPopup('<div style="color:black"><strong>${zone.adresse_zone}</strong><br>Latitude: ${zone.latitude_zone}<br>Longitude: ${zone.longitude_zone}</div>');
              marker.on('contextmenu', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'longpress',
                  zone: ${JSON.stringify(zone)}
                }));
              });
            `).join('\n')}
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Map not initialized when trying to add markers'
            }));
          }
        `;
        webviewRef.current.injectJavaScript(script);
        //addConsoleMessage(`Chargement de ${data.length} zones réussi`, 'success');
      }
    } catch (err) {
      addConsoleMessage(`Erreur chargement zones: ${err.message}`, 'error');
    }
  };


  const enregistrerZone = async () => {
    if (!nomZone.trim() || !coords) {
      Alert.alert("Erreur", "Veuillez saisir le nom de la zone.");
      return;
    }

    const code = 'Z' + Date.now();
    const data = {
      code_zone: code,
      nom_zone: nomZone,
      latitude_zone: coords.lat,
      longitude_zone: coords.lng,
      utilisateur_id: matricule
    };

    try {
      const response = await fetch('https://adores.cloud/api/edition-zone.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success && webviewRef.current) {
        Alert.alert('✅ Zone enregistrée', nomZone);
        const script = `
          if (typeof map !== 'undefined') {
            const marker = L.marker([${coords.lat}, ${coords.lng}]).addTo(map);
            marker.bindPopup('<div style="color:green"><strong>${nomZone.replace(/'/g, "\\'")}</strong><br>Latitude: ${coords.lat}<br>Longitude: ${coords.lng}</div>').openPopup();
            marker.on('contextmenu', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'longpress',
                zone: ${JSON.stringify({...data, id_zone: result.id_zone})}
              }));
            });
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Map not initialized when adding new zone'
            }));
          }
        `;
        webviewRef.current.injectJavaScript(script);
      } else {
        Alert.alert("Erreur", result.error || "Impossible d’enregistrer la zone.");
        addConsoleMessage(`Erreur enregistrement: ${result.error || 'Inconnu'}`, 'error');
      }
      setModalVisible(false);
      setNomZone('');
      setCoords(null);
    } catch (err) {
      Alert.alert("Erreur réseau", err.message);
      addConsoleMessage(`Erreur enregistrement zone: ${err.message}`, 'error');
      setModalVisible(false);
    }
  };

  const modifierZone = async () => {
    if (!nomZone.trim() || !selectedZone) {
      Alert.alert("Erreur", "Veuillez saisir le nom de la zone.");
      return;
    }

    const data = {
      id_zone: selectedZone.id_zone,
      nom_zone: nomZone,
      latitude_zone: selectedZone.latitude_zone,
      longitude_zone: selectedZone.longitude_zone,
      utilisateur_id: matricule
    };

    try {
      const response = await fetch('https://adores.cloud/api/update-zone.php', {
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
                layer.setPopupContent('<div style="color:green"><strong>${nomZone.replace(/'/g, "\\'")}</strong><br>Latitude: ${selectedZone.latitude_zone}<br>Longitude: ${selectedZone.longitude_zone}</div>');
              }
            });
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Map not initialized when updating zone'
            }));
          }
        `;
        webviewRef.current.injectJavaScript(script);
      } else {
        Alert.alert("Erreur", result.error || "Impossible de modifier la zone.");
        addConsoleMessage(`Erreur modification: ${result.error || 'Inconnu'}`, 'error');
      }
      setEditModalVisible(false);
      setNomZone('');
      setSelectedZone(null);
    } catch (err) {
      Alert.alert("Erreur réseau", err.message);
      addConsoleMessage(`Erreur modification zone: ${err.message}`, 'error');
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
              const response = await fetch('https://adores.cloud/api/delete-zone.php', {
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
                  } else {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'error',
                      message: 'Map not initialized when deleting zone'
                    }));
                  }
                `;
                webviewRef.current.injectJavaScript(script);
              } else {
                Alert.alert("Erreur", result.error || "Impossible de supprimer la zone.");
                addConsoleMessage(`Erreur suppression: ${result.error || 'Inconnu'}`, 'error');
              }
              setEditModalVisible(false);
              setSelectedZone(null);
            } catch (err) {
              Alert.alert("Erreur réseau", err.message);
              addConsoleMessage(`Erreur suppression zone: ${err.message}`, 'error');
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
    <SafeAreaView style={styles.container}>
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
                    setEditModalVisible(true);
                    break;
                  case 'mapReady':
                    setMapReady(true);
                    //addConsoleMessage('Carte initialisée avec succès', 'success');
                    break;
                  case 'alert':
                    //Alert.alert('Information', data.message);
                    //addConsoleMessage(data.message, 'warn');
                    break;
                  case 'error':
                    //addConsoleMessage(data.message, 'error');
                    break;
                  default:
                    //addConsoleMessage(`Type de message inconnu: ${data.type}`, 'warn');
                }
              } catch (error) {
                //addConsoleMessage(`Erreur réception message: ${error.message}`, 'error');
              }
            }}
            style={{ flex: 1 }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              addConsoleMessage(`Erreur WebView: ${nativeEvent.description}`, 'error');
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
                <Text style={styles.modalTitle}>Principaux dangers</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex : Agressions, viol, etc."
                  value={nomZone}
                  onChangeText={setNomZone}
                />
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

          {consoleMessages.length > 0 && (
            <View style={styles.consoleContainer}>
              {consoleMessages.map((msg, index) => (
                <View key={msg.id} style={styles.consoleMessage}>
                  <Text style={styles.consoleText}>
                    [{msg.type.toUpperCase()}]: {msg.message}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeConsoleMessage(msg.id)}
                    style={styles.closeConsoleButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: 
  { flex: 1,
    backgroundColor:"white" 
  },
  loadingContainer: 
  { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: 
  { marginTop: 10, 
    color: '#555' 

  },
  searchBox: {
    position: 'absolute',
    top: 40,
    left: 15,
    right: 15,
    zIndex: 100,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  iconButton: { marginLeft: 5 },
  offlineContainer: { flex: 1, position: 'relative' },
  backgroundImage: { position: 'absolute', width: '100%', height: '100%' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBox: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    width: '80%',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  offlineText: { fontSize: 16, color: '#999' },
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
  consoleContainer: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    zIndex: 100,
  },
  consoleMessage: {
    backgroundColor: 'rgba(51,51,51,0.9)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  consoleText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  closeConsoleButton: {
    marginLeft: 10,
  },
});