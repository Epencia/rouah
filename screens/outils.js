import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.9;

export default function Outils({ navigation }) {
  const [outils, setOutils] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState('');

  useEffect(() => {
    fetchOutils();
  }, []);

  const fetchOutils = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://rouah.net/api/liste-outils.php');
      const result = await response.json();
      if (result.success) {
        setOutils(result.data);
        setError(null);
      } else {
        setError(result.message || 'Erreur lors de la récupération des outils');
      }
    } catch (err) {
      setError('Erreur réseau ou serveur indisponible');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (fichierBase64, typeFichier, nomOriginal) => {
    if (!fichierBase64) {
      Alert.alert('Erreur', 'Aucun fichier disponible pour le téléchargement');
      return;
    }

    try {
      // Déterminer l'extension du fichier
      const extension = typeFichier.split('/')[1] || 'file';
      const fileName = `${nomOriginal.replace(/[^a-zA-Z0-9.]/g, '_')}.${extension}`;

      // Définir le chemin du fichier
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Écrire le fichier à partir de base64
      await FileSystem.writeAsStringAsync(fileUri, fichierBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Vérifier si le fichier a été écrit
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        Alert.alert('Succès', `Fichier téléchargé avec succès : ${fileName}`);
      } else {
        Alert.alert('Erreur', 'Échec de la création du fichier');
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement :', err);
      Alert.alert('Erreur', `Impossible de télécharger le fichier : ${err.message}`);
    }
  };

  const handleProcedure = (procedure) => {
    setSelectedProcedure(procedure || 'Aucune procédure disponible');
    setModalVisible(true);
  };

  const renderOutil = ({ item }) => (
    <View style={styles.itemContainer}>
      {item.type_fichier.startsWith('image/') && item.fichier_base64 ? (
        <Image
          source={{ uri: `data:${item.type_fichier};base64,${item.fichier_base64}` }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.itemIcon}>
          <Feather name="file" size={50} color="#999" />
        </View>
      )}
      <Text style={styles.itemTitle} numberOfLines={1}>{item.nom_original}</Text>
      <Text style={styles.itemSize}>{(item.taille_fichier / 1024).toFixed(2)} KB</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handleDownload(item.fichier_base64, item.type_fichier, item.nom_original)}
        >
          <Feather name="download" size={20} color="white" />
          <Text style={styles.downloadButtonText}>Télécharger</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.procedureButton}
          onPress={() => handleProcedure(item.manuel)}
        >
          <Feather name="book" size={20} color="white" />
          <Text style={styles.procedureButtonText}>Procédure</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa4447" />
        <Text style={styles.loadingText}>Chargement des outils...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchOutils}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={outils}
        renderItem={renderOutil}
        keyExtractor={(item) => item.outil_id.toString()}
        contentContainerStyle={styles.listContainer}
        numColumns={1}
        showsVerticalScrollIndicator={false}
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Procédure / Manuel</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalText}>{selectedProcedure}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 15,
  },
  itemContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  itemImage: {
    width: ITEM_WIDTH - 30,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    color: '#333',
  },
  itemType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
    textAlign: 'center',
  },
  itemSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fa4447',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginRight: 5,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  procedureButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#666',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginLeft: 5,
  },
  procedureButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#fa4447',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: '70%',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign:'justify'
  },
  closeButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});