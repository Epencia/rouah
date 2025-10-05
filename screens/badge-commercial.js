import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Image, Alert, TouchableOpacity, Dimensions, Modal, ScrollView, Linking } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BadgeCommercial() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [data, setData] = useState(null);
  const [scannedCode, setScannedCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  useEffect(() => {
    getCameraPermissions();
  }, []);

  const callApi = async (code) => {
    try {
      const url = `https://rouah.net/api/badge-commercial.php?matricule=${encodeURIComponent(code)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP ! statut: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setModalVisible(true);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      Alert.alert('Erreur', error.message);
      setScanned(false);
      setScannedCode('');
      setModalVisible(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    if (data.length === 6 && /^\d+$/.test(data)) {
      setScanned(true);
      setScannedCode(data);
      callApi(data);
    } else {
      Alert.alert('Erreur', 'Le code scanné doit contenir exactement 6 chiffres.');
      setScanned(false);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setData(null);
    setScannedCode('');
    setModalVisible(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons color="#0099cc" name="camera-flip-outline" size={150} />
        <Text style={styles.permissionText}>Demande d’autorisation de caméra !</Text>
        <TouchableOpacity onPress={getCameraPermissions} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === false) {
    return <Text style={styles.errorText}>Pas d’accès à la caméra</Text>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        enableTorch={torch}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.rectangleContainer}>
            <View style={styles.rectangle} />
          </View>
          <View style={styles.topButtonContainer}>
            <TouchableOpacity style={styles.button} onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}>
              <MaterialCommunityIcons color="white" name="camera-flip" size={30} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setTorch(current => !current)}>
              <MaterialCommunityIcons color="white" name={torch ? 'flashlight-off' : 'flashlight'} size={30} />
            </TouchableOpacity>
          </View>
          <View style={styles.bottomInputContainer}>
            <Text style={styles.inputLabel}>Code scanné :</Text>
            <View style={styles.otpContainer}>
              {[...Array(6)].map((_, index) => (
                <View key={index} style={styles.otpBox}>
                  <Text style={styles.otpBoxText}>{scannedCode[index] || ''}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </CameraView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetScan}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {data ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle2}>Profil commercial</Text>
                  {data.user.photo_base64 && (
                    <Image
                      source={{ uri: `data:image/${data.user.photo_type};base64,${data.user.photo_base64}` }}
                      style={styles.photo}
                    />
                  )}
                  <View style={styles.infoRow}>
                    
                    <Text style={styles.infoText2}>{data.user.nom_prenom}</Text>
                  </View>
                  <View style={styles.contactSection}>
  <Text style={styles.sectionTitle2}></Text>
  <View style={styles.buttonRow}>
    <TouchableOpacity
      style={[styles.contactButton, styles.callButton]}
      onPress={() => Linking.openURL(`tel:${data.user.telephone}`)}
    >
      <MaterialCommunityIcons name="phone" size={20} color="white" />
      <Text style={styles.contactButtonText}>Appel</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.contactButton, styles.smsButton]}
      onPress={() => Linking.openURL(`sms:${data.user.telephone}`)}
    >
      <MaterialCommunityIcons name="message-text" size={20} color="white" />
      <Text style={styles.contactButtonText}>SMS</Text>
    </TouchableOpacity>
  </View>
  <View style={styles.buttonRow}>
    <TouchableOpacity
      style={[styles.contactButton, styles.whatsappButton]}
      onPress={() => Linking.openURL(`whatsapp://send?phone=${data.user.telephone}`)}
    >
      <MaterialCommunityIcons name="whatsapp" size={20} color="white" />
      <Text style={styles.contactButtonText}>WhatsApp</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.contactButton, styles.emailButton]}
      onPress={() => Linking.openURL(`mailto:${data.user.email}`)}
    >
      <MaterialCommunityIcons name="email" size={20} color="white" />
      <Text style={styles.contactButtonText}>Email</Text>
    </TouchableOpacity>
  </View>
</View>
                </View>


                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Articles</Text>
                  {data.articles && data.articles.length > 0 ? (
                    data.articles.map((article, index) => {
                      const youtubeId = article.youtube_url?.includes('youtube.com')
                        ? article.youtube_url.split('v=')[1]?.split('&')[0]
                        : article.youtube_url;
                      return (
                        <View key={index} style={styles.itemContainer}>
                          {article.photo_base64 && (
                            <Image
                              source={{ uri: `data:image/${article.type_photo};base64,${article.photo_base64}` }}
                              style={styles.itemPhoto}
                            />
                          )}
                          <Text style={styles.itemTitle}>{article.titre}</Text>
                          <Text style={styles.itemText}>{article.description}</Text>
                          {article.contenu && (
                            <Text style={styles.itemText}>Contenu : {article.contenu}</Text>
                          )}
                          <Text style={styles.itemText}>
                            Prix : {article.prix ? `${article.prix} f.cfa` : 'Non spécifié'}
                          </Text>
                          <Text style={styles.itemText}>
                            Quantité : {article.quantite || 'Non spécifié'}
                          </Text>
                          <Text style={styles.itemText}>État : {article.etat || 'Non spécifié'}</Text>
                          {youtubeId && (
                            <TouchableOpacity
                              style={styles.youtubeButton}
                              onPress={() => Linking.openURL(article.youtube_url)}
                            >
                              <MaterialCommunityIcons name="youtube" size={24} color="white" />
                              <Text style={styles.youtubeButtonText}>Voir la vidéo</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noDataText}>Aucun article trouvé.</Text>
                  )}
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={resetScan}
                  >
                    <Text style={styles.buttonText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.errorText}>Aucune donnée valide scannée.</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rectangleContainer: {
    borderColor: 'white',
    borderWidth: 2,
    borderRadius: 10,
    width: 250,
    height: 250,
  },
  rectangle: {
    flex: 1,
  },
  topButtonContainer: {
    position: 'absolute',
    top: 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#000000a0',
    padding: 10,
    borderRadius: 5,
  },
  bottomInputContainer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width * 0.85,
    marginBottom: 10,
  },
  otpBox: {
    width: 50,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#fa4447',
  },
  otpBoxText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fa4447',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  section: {
    marginBottom: 20,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sectionTitle2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  photo: {
    width: 150,
    height: 150,
    marginBottom: 15,
    borderRadius: 75,
    alignSelf: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    flex: 2,
    textAlign: 'left',
  },
  infoText2: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#555',
    flex: 2,
    textAlign: 'center',
  },
  itemContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemPhoto: {
    width: '100%',
    height: 150,
    marginBottom: 10,
    borderRadius: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  youtubeButton: {
    flexDirection: 'row',
    backgroundColor: '#FF0000',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  youtubeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 5,
    marginBottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  permissionText: {
    fontSize: 18,
    margin: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0099cc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // appel, sms, email
  contactSection: {
  marginBottom: 20,
  width: '100%',
},
buttonRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 10,
},
contactButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  borderRadius: 8,
  marginHorizontal: 5,
},
callButton: {
  backgroundColor: '#28a745',
},
smsButton: {
  backgroundColor: '#17a2b8',
},
whatsappButton: {
  backgroundColor: '#25D366',
},
emailButton: {
  backgroundColor: '#007bff',
},
contactButtonText: {
  color: 'white',
  fontSize: 14,
  fontWeight: 'bold',
  marginLeft: 8,
},
});