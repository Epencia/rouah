import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Image, Alert, TouchableOpacity, Dimensions, Modal, ScrollView, Linking, FlatList, TextInput } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Video } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper';

export default function BadgeCommercial() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [data, setData] = useState(null);
  const [scannedCode, setScannedCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { width } = Dimensions.get('window');
  const modalWidth = width * 0.9;
  const slidePaddingHorizontal = 15;
  const slideContentWidth = modalWidth - 2 * slidePaddingHorizontal;

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  useEffect(() => {
    getCameraPermissions();
  }, []);

  useEffect(() => {
    if (data && data.articles) {
      setCurrentArticleIndex(0);
    }
  }, [data]);

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

  // Envoi de notification de commande
  const sendNotificationToUser = async (utilisateur_id, titre, description) => {

  try {
    const formData = new FormData();

    // Remplacer par l'utilisateur cible
formData.append('utilisateur_id', utilisateur_id);
formData.append('titre', titre);
formData.append('description', description);


    const response = await fetch("https://rouah.net/api/validation-commande.php", {
      method: "POST",
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });

    const result = await response.json();

    if (result.status === "success") {
      Alert.alert("Message","✅ Notification envoyée avec succès !");
    } else {
      Alert.alert("❌","Erreur: " + result.message);
    }

  } catch (error) {
    Alert.alert("❌","Erreur côté client");
  }
};


const handleBarCodeScanned = ({ type, data }) => {
  // Extraire tous les chiffres du code scanné (même non consécutifs)
  const digits = data.replace(/\D/g, ""); // supprime tout sauf les chiffres

  if (digits.length === 6) {
    setScanned(true);
    setScannedCode(digits);
    callApi(digits);
  } else {
    Alert.alert(
      'Erreur',
      'Le QR Code doit contenir exactement 6 chiffres.'
    );
    setScanned(false);
  }
};

  const resetScan = () => {
    setScanned(false);
    setData(null);
    setScannedCode('');
    setModalVisible(false);
    setSearchQuery('');
  };

  const renderMedia = (media) => {
    if (media.type?.startsWith('image/')) {
      return (
        <Image
          source={{ uri: media.uri }}
          style={styles.itemPhoto}
          resizeMode="cover"
        />
      );
    } else {
      return (
        <Video
          source={{ uri: media.uri }}
          style={styles.itemPhoto}
          useNativeControls
          resizeMode="contain"
          isLooping={false}
          shouldPlay={false}
          isMuted={true}
        />
      );
    }
  };

  const filteredArticles = data?.articles?.filter(article =>
    article.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons color="#fa4447" name="camera-flip-outline" size={150} />
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
                      source={{ uri: `data:${data.user.photo_type};base64,${data.user.photo_base64}` }}
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
                  <TextInput
                    style={styles.searchBar}
                    placeholder="Rechercher un article..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {filteredArticles.length > 0 ? (
                    <>
                      <FlatList
                        data={filteredArticles}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        getItemLayout={(data, index) => ({ length: modalWidth, offset: modalWidth * index, index })}
                        keyExtractor={(item, index) => `article-${index}`}
                        renderItem={({ item: article }) => {
                          const media = [];
                          if (article.photo_base64) {
                            const imageType = article.type_photo || 'image/jpeg';
                            media.push({
                              uri: `data:${imageType};base64,${article.photo_base64}`,
                              type: `${imageType}`,
                            });
                          }
                          if (article.albums && Array.isArray(article.albums)) {
                            media.push(...article.albums);
                          }
                          return (
                            <View style={[styles.slide, { width: modalWidth }]}>
                              <View style={styles.contentContainer}>
                                {media.length > 0 ? (
                                  <Swiper
                                    style={styles.mediaSwiper}
                                    showsButtons={true}
                                    showsPagination={true}
                                    paginationStyle={styles.swiperPagination}
                                    activeDotColor="#0099cc"
                                    dotColor="#ccc"
                                    loop={false}
                                  >
                                    {media.map((m, index) => (
                                      <View key={`media-${index}`} style={[styles.mediaSlide, { width: slideContentWidth }]}>
                                        {renderMedia(m)}
                                      </View>
                                    ))}
                                  </Swiper>
                                ) : (
                                  <View style={[styles.mediaSlide, { width: slideContentWidth, height: 200 }]}>
                                    <Text style={styles.noDataText}>Aucun média disponible</Text>
                                  </View>
                                )}
                                <Text style={[styles.itemTitle, { marginTop: 10 }]}>{article.titre}</Text>
                                <Text style={[styles.itemText, { marginTop: 10 }]}>{article.description}</Text>
                              
                                <Text style={[styles.itemText, { marginTop: 10 }]}>
                                  Prix : {article.prix ? `${article.prix} ${article.devise}` : 'Non spécifié'}
                                </Text>
                              </View>
                              <View style={styles.buttonContainerArticle}>
                                {article.youtube_url && (
                                  <TouchableOpacity
                                    style={styles.youtubeButton}
                                    onPress={() => Linking.openURL(article.youtube_url)}
                                  >
                                    <MaterialCommunityIcons name="youtube" size={24} color="white" />
                                    <Text style={styles.youtubeButtonText}>Voir la vidéo</Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  style={styles.orderButton}
                                  onPress={() =>sendNotificationToUser(data.user.utilisateur_id,`Commande du client`, `Le client souhaite commander l'article ${article.titre}`)}>
                                  <MaterialCommunityIcons name="cart" size={24} color="white" />
                                  <Text style={styles.orderButtonText}>Commander</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        }}
                        style={styles.articlesSlider}
                        contentContainerStyle={{ paddingHorizontal: 0 }}
                        scrollEventThrottle={16}
                        onScroll={(event) => {
                          const index = Math.round(event.nativeEvent.contentOffset.x / modalWidth);
                          setCurrentArticleIndex(index);
                        }}
                      />
                      <View style={styles.paginationContainer}>
                        {filteredArticles.map((_, index) => (
                          <View
                            key={`dot-${index}`}
                            style={[
                              styles.paginationDot,
                              index === currentArticleIndex && styles.activePaginationDot,
                            ]}
                          />
                        ))}
                      </View>
                    </>
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
    width: Dimensions.get('window').width * 0.85,
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
    width: Dimensions.get('window').width * 0.9,
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
    textAlign: 'center',
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
  slide: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  articlesSlider: {
    height: 500,
    marginBottom: 10,
  },
  mediaSwiper: {
    height: 200,
    marginBottom: 10,
  },
  swiperPagination: {
    bottom: 0,
  },
  mediaSlide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'justify',
  },
  contentContainer: {
    flex: 1,
  },
  buttonContainerArticle: {
    marginTop: 'auto',
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
  orderButton: {
    flexDirection: 'row',
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  orderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  searchBar: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  paginationDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activePaginationDot: {
    backgroundColor: '#0099cc',
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
    backgroundColor: '#fa4447',
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