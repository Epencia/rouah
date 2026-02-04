import React, { useState, useEffect } from 'react';
import { 
  Text, View, StyleSheet, Image, Alert, TouchableOpacity, 
  Dimensions, Modal, ScrollView, TextInput, Linking, ActivityIndicator 
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { MaterialCommunityIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

// URL de votre API
const API_URL = 'https://rouah.net/api/diplome.php'; // Remplacez par votre URL
const PDF_API_URL = 'https://rouah.net/api/diplome-pdf.php'; // URL pour générer le PDF

export default function Diplomes() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [data, setData] = useState([]);
  const [scannedCode, setScannedCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data: scannedData }) => {
    const code = scannedData.replace(/\D/g, '');
    if (code.length > 0) {
      setScanned(true);
      setScannedCode(code);
      fetchCertificats(code);
    } else {
      Alert.alert('Erreur', 'Le QR Code doit contenir des chiffres.');
    }
  };

  const fetchCertificats = async (numeroCarte) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?numero_carte=${numeroCarte}`);
      const result = await response.json();
      
      if (result.success) {
        // Formater les dates si nécessaire
        const formattedData = result.data.map(item => ({
          ...item,
          date_naissance: item.date_naissance ? formatDate(item.date_naissance) : '',
          // Si la description est vide, utiliser l'observation par défaut
          description: item.description || "Nous certifions par la présente que l'intéressé a suivi avec succès le programme de formation."
        }));
        
        setData(formattedData);
        setFilteredData(formattedData);
        setModalVisible(true);
      } else {
        Alert.alert('Erreur', result.message || 'Aucun diplôme trouvé');
        resetScan();
      }
    } catch (error) {
      console.error('Erreur API:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les données');
      resetScan();
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ouvrir le PDF d'un diplôme
  const openDiplomePDF = async (matricule, nomPrenom) => {
    if (!matricule) {
      Alert.alert('Erreur', 'Matricule non disponible');
      return;
    }

    setPdfLoading(true);
    
    try {
      // Construire l'URL du PDF avec les paramètres requis
      const pdfUrl = `${PDF_API_URL}?matricule=${encodeURIComponent(matricule)}`;
      
      // Vérifier si le lien peut être ouvert
      const supported = await Linking.canOpenURL(pdfUrl);
      
      if (supported) {
        // Ouvrir le PDF dans le navigateur/visualiseur PDF
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert(
          'Erreur', 
          `Impossible d'ouvrir le PDF. Vous pouvez y accéder manuellement : ${pdfUrl}`
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du PDF:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir le certificat PDF');
    } finally {
      setPdfLoading(false);
      setPdfModalVisible(false);
    }
  };

  // Fonction pour prévisualiser le PDF dans un modal web
  const previewDiplomePDF = (matricule, nomPrenom) => {
    if (!matricule) {
      Alert.alert('Erreur', 'Matricule non disponible');
      return;
    }

    // Construire l'URL du PDF
    const pdfUrl = `${PDF_API_URL}?matricule=${encodeURIComponent(matricule)}`;
    setCurrentPdfUrl(pdfUrl);
    setPdfModalVisible(true);
  };

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatDate2 = (date) =>
  new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });


  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item => 
        item.nom_prenom.toLowerCase().includes(text.toLowerCase()) ||
        item.matricule.includes(text) ||
        item.diplome.toLowerCase().includes(text.toLowerCase()) ||
        item.titre.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredData(filtered);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setData([]);
    setScannedCode('');
    setModalVisible(false);
    setShowScanner(false);
    setSearchQuery('');
    setFilteredData([]);
    setLoading(false);
    setPdfModalVisible(false);
    setCurrentPdfUrl('');
  };

  // Fonction pour ouvrir le lien du QR Code
  const openqrcode = (url) => {
    if (url && url.startsWith('http')) {
      Linking.openURL(url).catch(err => {
        Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
        console.error('Erreur lors de l\'ouverture du lien:', err);
      });
    }
  };

  const CertificatCard = ({ item }) => {
    // Vérifier si le logo de la société est disponible
    const logoSource = item.logo_societe 
      ? { uri: `data:${item.type_logo || 'image/png'};base64,${item.logo_societe}` }
      : require("../assets/logo-original.png"); // Logo par défaut

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => previewDiplomePDF(item.matricule, item.nom_prenom)}
        onLongPress={() => openDiplomePDF(item.matricule, item.nom_prenom)}
        style={styles.certificatCardTouchable}
      >
        <View style={styles.certificatCard}>
          {/* Cadres décoratifs */}
          <View style={styles.decorTopLeft} />
          <View style={styles.decorTopRight} />
          <View style={styles.decorBottomLeft} />
          <View style={styles.decorBottomRight} />

          {/* Ligne avec Logo, diplomes et Sceau */}
          <View style={styles.headerRow}>
            <Image
              source={logoSource}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.titles}>
              <Text style={styles.diplome2}>{item.diplome}</Text>
            </View>

            <Image
              source={require("../assets/gold-seal3.jpeg")}
              style={styles.seal}
              resizeMode="contain"
            />
          </View>

          {/* Sous-diplome */}
          <Text style={styles.sousdiplome}>
            {item.nom_prenom}{"\n"}
            <Text style={{ fontStyle: "italic" }}>
              {item.matricule && `Matricule : ${item.matricule}`}{"\n"}
            {item.niveau && ` Niveau : ${item.niveau}`}
            {item.categorie && ` ● ${item.categorie}`}
            {item.annee && ` ● Année : ${item.annee}`}
            </Text>
          </Text>

          {/* Titre et informations */}
          <Text style={styles.nomnom_prenom}>{item.titre}</Text>
          

          

          {/* Footer avec QR Code */}
          <View style={styles.footer}>
           
            
            <View style={styles.dateContainer}>
              <Text style={styles.date}>
                {item.date ? `Fait le ${item.date}` : ''}
              </Text>
              {item.organisme && (
                <Text style={styles.organismeText}>
                  Organisme : {item.organisme}
                </Text>
              )}
            </View>

            <View style={styles.signatureContent}>
              <Text style={styles.signatureLabel}>Signature</Text>
              <Text style={styles.signatureName}>{item.signature}</Text>
            </View>
          </View>

          {/* Indicateur de clic */}
          <View style={styles.clickIndicator}>
            <MaterialCommunityIcons name="file-pdf-box" size={16} color="#cfa24e" />
            <Text style={styles.clickIndicatorText}>
              Appuyez pour voir le certificat PDF
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Demande d'accès à la caméra...</Text>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="camera-off" size={80} color="#fa4447" />
        <Text style={styles.errorText}>Pas d'accès à la caméra</Text>
        <Text style={styles.errorSubtext}>Veuillez autoriser l'accès à la caméra dans les paramètres</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Scanner */}
      {showScanner && !scanned && (
        <CameraView
          style={styles.camera}
          facing={facing}
          enableTorch={torch}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        >
          <View style={styles.overlay}>
            <View style={styles.rectangleContainer}>
              <View style={styles.rectangle} />
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
            <View style={styles.topButtonContainer}>
              <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} style={styles.cameraButton}>
                <MaterialCommunityIcons name="camera-flip" size={28} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTorch(t => !t)} style={styles.cameraButton}>
                <MaterialCommunityIcons name={torch ? 'flashlight-off' : 'flashlight'} size={28} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.scanInstruction}>
              <Text style={styles.instructionText}>Scannez le QR Code</Text>
            </View>
            {loading && (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>Chargement des données...</Text>
              </View>
            )}
            {scannedCode ? (
              <View style={styles.codeDisplay}>
                <Text style={styles.codeText}>Code: {scannedCode}</Text>
              </View>
            ) : null}
          </View>
        </CameraView>
      )}

      {/* Aucun scanner activé - écran d'accueil */}
      {!showScanner && !scanned && (
        <View style={styles.homeContainer}>
          <View style={styles.homeContent}>
            <MaterialCommunityIcons name="certificate" size={100} color="#cfa24e" />
            <Text style={styles.homeTitle}>Scannez le QR Code</Text>
            <Text style={styles.homeSubtitle}>
              Scannez le QR code de votre carte pour découvrir vos diplômes et certificats
            </Text>
            <TouchableOpacity 
              style={styles.homeButtonPrimary}
              onPress={() => setShowScanner(true)}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={24} color="#fff" />
              <Text style={styles.homeButtonText}>Scanner QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal des résultats avec barre de recherche */}
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent={false}
        onRequestClose={resetScan}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Diplômes Trouvés ({filteredData.length})</Text>
            <TouchableOpacity onPress={resetScan} style={styles.closeModalButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche dans le modal */}
          <View style={styles.modalSearchContainer}>
            <View style={styles.modalSearchInputContainer}>
              <FontAwesome name="search" size={18} color="#666" style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Rechercher par nom, matricule, diplôme..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="words"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Indicateur de recherche */}
            {searchQuery.length > 0 && (
              <View style={styles.searchInfo}>
                <Text style={styles.searchInfoText}>
                  {filteredData.length} résultat{filteredData.length !== 1 ? 's' : ''} trouvé{filteredData.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          <ScrollView 
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Chargement des diplômes...</Text>
              </View>
            ) : filteredData.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <MaterialCommunityIcons name="certificate" size={60} color="#ccc" />
                <Text style={styles.noResultsText}>
                  {searchQuery ? 'Aucun diplôme ne correspond à votre recherche' : 'Aucun diplôme trouvé'}
                </Text>
                {searchQuery && (
                  <TouchableOpacity 
                    style={styles.clearSearchButton}
                    onPress={() => handleSearch('')}
                  >
                    <Text style={styles.clearSearchText}>Effacer la recherche</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredData.map((item, index) => (
                <View key={item.id || index} style={styles.certificatWrapper}>
                  <CertificatCard item={item} />
                  {index < filteredData.length - 1 && <View style={styles.separator} />}
                </View>
              ))
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.scanAgainButton} onPress={resetScan}>
              <MaterialCommunityIcons name="camera" size={20} color="#fff" />
              <Text style={styles.scanAgainText}>Scanner à nouveau</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal pour le PDF */}
      <Modal
        visible={pdfModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPdfModalVisible(false)}
      >
        <View style={styles.pdfModalContainer}>
          <View style={styles.pdfModalContent}>
            <View style={styles.pdfModalHeader}>
              <Text style={styles.pdfModalTitle}>Certificat PDF</Text>
              <TouchableOpacity 
                onPress={() => setPdfModalVisible(false)}
                style={styles.pdfCloseButton}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.pdfModalBody}>
              {pdfLoading ? (
                <View style={styles.pdfLoadingContainer}>
                  <ActivityIndicator size="large" color="#cfa24e" />
                  <Text style={styles.pdfLoadingText}>Chargement du certificat...</Text>
                </View>
              ) : (
                <View style={styles.pdfOptionsContainer}>
                  <MaterialCommunityIcons name="file-pdf-box" size={80} color="#cfa24e" />
                  <Text style={styles.pdfInfoText}>
                    Le certificat PDF va s'ouvrir dans votre navigateur
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.pdfOpenButton}
                    onPress={() => {
                      setPdfModalVisible(false);
                      // Extraire le matricule de l'URL
                      const matriculeMatch = currentPdfUrl.match(/matricule=([^&]*)/);
                      const matricule = matriculeMatch ? decodeURIComponent(matriculeMatch[1]) : '';
                      if (matricule) {
                        openDiplomePDF(matricule, '');
                      }
                    }}
                  >
                    <MaterialCommunityIcons name="open-in-app" size={24} color="#fff" />
                    <Text style={styles.pdfOpenButtonText}>Ouvrir le certificat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.pdfShareButton}
                    onPress={() => {
                      // Option pour partager l'URL
                      if (currentPdfUrl) {
                        Alert.alert(
                          'URL du certificat',
                          currentPdfUrl,
                          [
                            { text: 'Copier', onPress: () => {
                              // Copier dans le presse-papier
                              // (vous aurez besoin d'une bibliothèque comme expo-clipboard)
                            }},
                            { text: 'Annuler', style: 'cancel' }
                          ]
                        );
                      }
                    }}
                  >
                    <MaterialCommunityIcons name="share-variant" size={20} color="#cfa24e" />
                    <Text style={styles.pdfShareButtonText}>Partager le lien</Text>
                  </TouchableOpacity>

                  <Text style={styles.pdfNoteText}>
                    Note : Maintenez appuyé sur une carte pour ouvrir directement le PDF
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },

  // Home screen
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  homeContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  homeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  homeButtonPrimary: {
    backgroundColor: '#cfa24e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  homeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  // Camera
  camera: { 
    flex: 1 
  },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  rectangleContainer: { 
    borderColor: 'white', 
    borderWidth: 2, 
    borderRadius: 15,
    width: 280,
    height: 280,
    position: 'relative',
  },
  rectangle: { 
    flex: 1 
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#cfa24e',
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#cfa24e',
    borderTopRightRadius: 10,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#cfa24e',
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#cfa24e',
    borderBottomRightRadius: 10,
  },
  topButtonContainer: { 
    position: 'absolute', 
    top: 60, 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    width: '100%', 
    paddingHorizontal: 30 
  },
  cameraButton: { 
    backgroundColor: 'rgba(207, 162, 78, 0.8)', 
    padding: 12, 
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  scanInstruction: {
    position: 'absolute',
    bottom: 120,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 70,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#cfa24e',
  },
  codeDisplay: {
    position: 'absolute',
    bottom: 70,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#cfa24e',
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  // Modal des diplômes
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#fff',
  },
  modalHeader: {
    backgroundColor: '#2c3e50',
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#cfa24e',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeModalButton: {
    padding: 5,
  },

  // Barre de recherche dans le modal
  modalSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modalSearchIcon: {
    marginRight: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  searchInfo: {
    marginTop: 8,
    paddingLeft: 5,
  },
  searchInfoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },

  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 30,
  },
  certificatWrapper: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 20,
  },
  certificatCardTouchable: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  separator: {
    height: 20,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  scanAgainButton: {
    backgroundColor: '#cfa24e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scanAgainText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  // Message aucun résultat
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    lineHeight: 24,
  },
  clearSearchButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  // Styles du diplôme avec QR Code
  certificatCard: {
    backgroundColor: "white",
    borderWidth: 3,
    borderColor: "#cfa24e",
    borderRadius: 10,
    padding: 12,
    position: "relative",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  decorTopLeft: { 
    position: "absolute", 
    top: 4, 
    left: 4, 
    width: 30, 
    height: 30, 
    borderLeftWidth: 3, 
    borderTopWidth: 3, 
    borderColor: "#cfa24e", 
    borderTopLeftRadius: 8 
  },
  decorTopRight: { 
    position: "absolute", 
    top: 4, 
    right: 4, 
    width: 30, 
    height: 30, 
    borderRightWidth: 3, 
    borderTopWidth: 3, 
    borderColor: "#cfa24e", 
    borderTopRightRadius: 8 
  },
  decorBottomLeft: { 
    position: "absolute", 
    bottom: 4, 
    left: 4, 
    width: 30, 
    height: 30, 
    borderLeftWidth: 3, 
    borderBottomWidth: 3, 
    borderColor: "#cfa24e", 
    borderBottomLeftRadius: 8 
  },
  decorBottomRight: { 
    position: "absolute", 
    bottom: 4, 
    right: 4, 
    width: 30, 
    height: 30, 
    borderRightWidth: 3, 
    borderBottomWidth: 3, 
    borderColor: "#cfa24e", 
    borderBottomRightRadius: 8 
  },
  headerRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  logo: { 
    width: 50, 
    height: 50 
  },
  seal: { 
    width: 50, 
    height: 50 
  },
  titles: { 
    flex: 1, 
    alignItems: "center" 
  },
  diplome2: { 
    fontSize: 18, 
    color: "#cfa24e", 
    fontWeight: "900",
    textAlign: 'center',
  },
  sousdiplome: { 
    fontSize: 11, 
    textAlign: "center", 
    marginBottom: 6,
    color: '#666',
    lineHeight: 18,
  },
  nomnom_prenom: { 
    fontSize: 20, 
    fontWeight: "900", 
    color: "#cfa24e", 
    marginBottom: 2,
    textAlign: 'center',
  },
  texte: { 
    width: "95%", 
    textAlign: "center", 
    fontSize: 11, 
    lineHeight: 20, 
    marginBottom: 12,
    color: '#444',
  },
  footer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    width: "95%",
    marginTop: 8,
    alignItems: 'center',
  },
dateContainer: {
  flex: 1,
  alignItems: 'flex-start',
  marginTop: 10,
  flexDirection: 'column'
},
  date: { 
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  organismeText: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureContent: {
    alignItems: "center",
  },
  signatureLabel: { 
    fontSize: 12, 
    marginBottom: 2,
    color: '#666',
    fontWeight: '500',
  },
  signatureName: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  clickIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(207, 162, 78, 0.1)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(207, 162, 78, 0.3)',
  },
  clickIndicatorText: {
    fontSize: 10,
    color: '#cfa24e',
    marginLeft: 5,
    fontStyle: 'italic',
  },

  // Modal PDF
  pdfModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pdfModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  pdfModalHeader: {
    backgroundColor: '#2c3e50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#cfa24e',
  },
  pdfModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  pdfCloseButton: {
    padding: 5,
  },
  pdfModalBody: {
    padding: 30,
  },
  pdfLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  pdfLoadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  pdfOptionsContainer: {
    alignItems: 'center',
  },
  pdfInfoText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 25,
    lineHeight: 22,
  },
  pdfOpenButton: {
    backgroundColor: '#cfa24e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    gap: 10,
    width: '100%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfOpenButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pdfShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#cfa24e',
    backgroundColor: 'rgba(207, 162, 78, 0.1)',
    marginBottom: 20,
  },
  pdfShareButtonText: {
    fontSize: 14,
    color: '#cfa24e',
    fontWeight: '500',
  },
  pdfNoteText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },

  // Loading & Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});