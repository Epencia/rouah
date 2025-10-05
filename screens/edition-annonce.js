import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';
import { Picker } from '@react-native-picker/picker';

export default function EditionAnnonce({ navigation }) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [quantite, setQuantite] = useState('');
  const [categorie, setCategorie] = useState('Publicité');
  const [media, setMedia] = useState(null);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedMediaExtension, setSelectedMediaExtension] = useState('');
  const [albumImages, setAlbumImages] = useState([null, null, null]); // 3 images album
  const [user] = useContext(GlobalContext);
  const videoRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);

  const MAX_FILE_SIZE = 15 * 1024 * 1024;

  // Media principal
  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      videoMaxDuration: 90,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const extension = asset.uri.split('.').pop().toLowerCase();

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Alert.alert('Erreur', 'La taille du fichier ne doit pas dépasser 15 Mo.');
        return;
      }

      let mediaType = asset.mimeType || '';
      if (asset.type === 'video' && !mediaType) {
        const videoTypes = {
          mp4: 'video/mp4',
          mov: 'video/quicktime',
          avi: 'video/x-msvideo',
          mkv: 'video/x-matroska',
          webm: 'video/webm',
        };
        mediaType = videoTypes[extension] || `video/${extension}`;
      } else if (asset.type === 'image' && !mediaType) {
        mediaType = `image/${extension}`;
      }

      setSelectedMedia(result);
      setSelectedMediaExtension(mediaType);
      setMedia(asset.uri);
      setType(mediaType);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      pickMedia();
      return;
    }
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', "L'accès à la caméra est nécessaire pour prendre une photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Alert.alert('Erreur', 'La taille de la photo ne doit pas dépasser 15 Mo.');
        return;
      }

      setMedia(asset.uri);
      setType('image/jpeg');
      setSelectedMedia(result);
      setSelectedMediaExtension('image/jpeg');
    }
  };

  const takeVideo = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Info', "La capture vidéo n'est pas supportée sur le web");
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissions requises', "L'accès à la caméra et au microphone est nécessaire pour enregistrer une vidéo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        videoMaxDuration: 90,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const fileSizeMB = fileInfo.size / (1024 * 1024);
        if (fileSizeMB > 15) {
          Alert.alert('Fichier trop volumineux', `La vidéo (${fileSizeMB.toFixed(1)} MB) dépasse la limite de 15 MB.`);
          return;
        }

        const extension = asset.uri.split('.').pop().toLowerCase();
        const videoTypes = {
          mp4: 'video/mp4',
          mov: 'video/quicktime',
          avi: 'video/x-msvideo',
          mkv: 'video/x-matroska',
          webm: 'video/webm',
          '3gp': 'video/3gpp',
          m4v: 'video/x-m4v',
        };
        const mediaType = videoTypes[extension] || `video/${extension}`;

        setMedia(asset.uri);
        setType(mediaType);
        setSelectedMedia(result);
        setSelectedMediaExtension(mediaType);
      }
    } catch (error) {
      Alert.alert('Erreur', "Une erreur est survenue lors de l'enregistrement de la vidéo.");
    }
  };

  const removeMedia = () => {
    setMedia(null);
    setType('');
    setSelectedMedia(null);
    setSelectedMediaExtension('');
  };

  const getMediaPreview = () => {
    if (!media) return null;
    if (type.startsWith('image/')) {
      return <Image source={{ uri: media }} style={styles.selectedMedia} resizeMode="cover" />;
    } else if (type.startsWith('video/')) {
      return (
        <View style={styles.videoPreview}>
          <Video
            ref={videoRef}
            source={{ uri: media }}
            style={styles.selectedMedia}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
        </View>
      );
    }
    return null;
  };

  // Album images
  const pickAlbumImage = async (index) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Alert.alert('Erreur', 'La taille de l’image ne doit pas dépasser 15 Mo.');
        return;
      }

      const newAlbum = [...albumImages];
      newAlbum[index] = asset;
      setAlbumImages(newAlbum);
    }
  };

  const removeAlbumImage = (index) => {
    const newAlbum = [...albumImages];
    newAlbum[index] = null;
    setAlbumImages(newAlbum);
  };





const saveAlbumImages = async (codeAnnonce) => {
  // Vérification des entrées
  if (!codeAnnonce) {
    console.error('Erreur : codeAnnonce est requis');
    return { success: false, message: 'codeAnnonce est requis' };
  }
  if (!Array.isArray(albumImages) || albumImages.length === 0) {
    console.warn('Aucune image à uploader');
    return { success: false, message: 'Aucune image fournie' };
  }

  // Filtrer les images valides
  const validImages = albumImages.filter((img) => img && img.uri);
  console.log('Images valides:', JSON.stringify(validImages, null, 2));
  if (validImages.length === 0) {
    console.warn('Aucune image valide à uploader');
    return { success: false, message: 'Aucune image valide' };
  }

  const results = [];

  for (let i = 0; i < validImages.length; i++) {
    const asset = validImages[i];

    // Normaliser l'URI pour iOS et Android
    let uri = asset.uri;
    if (Platform.OS === 'ios' && uri.startsWith('file://')) {
      uri = uri.replace('file://', '');
    }

    // Utiliser le fileName de l'asset si disponible, sinon générer un nom
    const filename = asset.fileName || `media_${i + 1}_${Date.now()}.jpg`;
    const mediaType = asset.mimeType || (asset.type && asset.type.startsWith('image') ? asset.type : 'image/jpeg');

    // Créer FormData
    const formData = new FormData();
    formData.append('code_annonce', codeAnnonce);
    formData.append('type', mediaType);
    formData.append('image', {
      uri,
      name: filename,
      type: mediaType,
    });

    try {
      // Timeout pour la requête
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Délai d’attente réseau dépassé')), 30000);
      });

      const fetchPromise = fetch('https://rouah.net/api/albums-upload.php', {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(`Réponse non-JSON : ${jsonError.message}`);
      }

      if (!data.success) {

        results.push({ index: i, success: false, message: data.message || 'Erreur serveur' });
      } else {

        results.push({ index: i, success: true, message: 'Upload réussi' });
      }
    } catch (error) {
      results.push({ index: i, success: false, message: error.message });
    }
  }

  return {
    success: results.every((result) => result.success),
    results,
  };
};



  const confirmPublication = () => {
    if (!titre.trim() || !description.trim() || !quantite || isNaN(quantite) || parseInt(quantite) < 5) {
      Alert.alert('Erreur', 'Veuillez remplir correctement tous les champs.');
      return;
    }
    setModalVisible(true);
  };

  const saveAnnonce = async () => {
    setModalVisible(false);
    setLoading(true);

    const codeAnnonce = Math.floor(100000000000 + Math.random() * 900000000000).toString();

    try {
      const formData = new FormData();
      formData.append('utilisateur_id', user.matricule);
      formData.append('code', codeAnnonce);
      formData.append('titre', titre);
      formData.append('description', description);
      formData.append('quantite', quantite);
      formData.append('categorie', categorie);
      formData.append('type', selectedMediaExtension);

      if (selectedMedia?.assets?.[0]) {
        const asset = selectedMedia.assets[0];
        formData.append('photo', {
          uri: asset.uri,
          type: selectedMediaExtension,
          name: `media.${selectedMediaExtension.split('/')[1]}`,
        });
      }

      const response = await fetch('https://rouah.net/api/edition-annonce.php', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Erreur serveur');

        saveAlbumImages(codeAnnonce);

        Alert.alert('Succès', result.message, [
          {
            text: 'OK',
            onPress: () => {
              setTitre('');
              setDescription('');
              setQuantite('');
              setCategorie('Publicité');
              setMedia(null);
              setType('');
              setSelectedMedia(null);
              setSelectedMediaExtension('');
              setAlbumImages([null, null, null]);
            },
          },
        ]);
     
    } catch (error) {
      Alert.alert('Message ok', error.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Publier une annonce</Text>
          <Text style={styles.headerSubtitle}>Partagez votre annonce avec la communauté</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Titre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Entrez le titre de votre annonce"
              value={titre}
              onChangeText={setTitre}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Entrez la description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Audience *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de personnes"
              value={quantite}
              onChangeText={setQuantite}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Catégorie *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={categorie}
                onValueChange={(itemValue) => setCategorie(itemValue)}
                style={styles.picker}
                dropdownIconColor="#414d63"
              >
                <Picker.Item label="Publicité" value="Publicité" />
                <Picker.Item label="Avis de recherche" value="Avis de recherche" />
              </Picker>
            </View>
          </View>

          {/* ✅ Boutons Photo 1,2,3 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            {albumImages.map((_, i) => (
              <TouchableOpacity key={i} style={styles.iconButton} onPress={() => pickAlbumImage(i)}>
                <MaterialCommunityIcons name="image-album" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Photo {i + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ✅ Mini-preview des 3 images avec remove */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            {albumImages.map((img, i) => (
              img ? (
                <View key={i} style={{ position: 'relative', marginRight: 5 }}>
                  <Image
                    source={{ uri: img.uri }}
                    style={{ width: 100, height: 100, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      backgroundColor: '#ff0000',
                      borderRadius: 12,
                      padding: 2,
                    }}
                    onPress={() => removeAlbumImage(i)}
                  >
                    <MaterialIcons name="cancel" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  key={i}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 8,
                    backgroundColor: '#e5e5ea',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 5,
                  }}
                >
                  <Text style={{ color: '#414d63' }}>Vide</Text>
                </View>
              )
            ))}
          </View>

          {/* ✅ Boutons Galerie / Photo / Vidéo */}
          <View style={styles.mediaButtons}>
            <TouchableOpacity style={styles.iconButton} onPress={pickMedia}>
              <MaterialCommunityIcons name="image-album" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={takePhoto}>
              <MaterialCommunityIcons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={takeVideo}>
              <MaterialCommunityIcons name="video" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Vidéo</Text>
            </TouchableOpacity>
          </View>

          {getMediaPreview() && (
            <View style={styles.previewContainer}>
              {getMediaPreview()}
              <TouchableOpacity style={styles.removeButton} onPress={removeMedia}>
                <MaterialIcons name="cancel" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.publishButton, { marginTop: 20 }]} onPress={confirmPublication} disabled={loading}>
            <MaterialCommunityIcons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>{loading ? 'Publication...' : 'Publier'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal récap */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Récapitulatif de l'annonce</Text>
            <ScrollView>
              <Text style={modalStyles.modalLabel}>Titre :</Text>
              <Text style={modalStyles.modalText}>{titre}</Text>

              <Text style={modalStyles.modalLabel}>Description :</Text>
              <Text style={modalStyles.modalText}>{description}</Text>

              <Text style={modalStyles.modalLabel}>Audience :</Text>
              <Text style={modalStyles.modalText}>{quantite}</Text>

              <Text style={modalStyles.modalLabel}>Catégorie :</Text>
              <Text style={modalStyles.modalText}>{categorie}</Text>

              {media && (
                <View style={{ marginTop: 10 }}>
                  {type.startsWith('image/') && <Image source={{ uri: media }} style={{ width: '100%', height: 200, borderRadius: 8 }} />}
                  {type.startsWith('video/') && (
                    <Video ref={videoRef} source={{ uri: media }} style={{ width: '100%', height: 200, borderRadius: 8 }} useNativeControls resizeMode="contain" isLooping />
                  )}
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity style={[modalStyles.modalButton, { backgroundColor: '#ff4d4d', marginRight: 5 }]} onPress={() => setModalVisible(false)}>
                <Text style={modalStyles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.modalButton, { backgroundColor: '#414d63', marginLeft: 5 }]} onPress={saveAnnonce}>
                <Text style={modalStyles.modalButtonText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles identiques à avant
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#414d63' },
  headerSubtitle: { fontSize: 14, color: '#414d63', marginTop: 4 },
  form: {},
  inputGroup: { marginBottom: 15 },
  label: { marginBottom: 6, color: '#414d63', fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#000',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: { height: 50, color: '#000', backgroundColor: 'white' },
  mediaButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '500' },
  previewContainer: { position: 'relative', marginTop: 10 },
  selectedMedia: { width: '100%', height: 200, borderRadius: 8 },
  videoPreview: { width: '100%', height: 200, borderRadius: 8, overflow: 'hidden' },
  removeButton: { position: 'absolute', top: 10, right: 10, backgroundColor: '#ff0000', borderRadius: 20, padding: 4 },
  iconButton: {
    backgroundColor: '#414d63',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishButton: {
    backgroundColor: '#414d63',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const modalStyles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', backgroundColor: '#fff', padding: 20, borderRadius: 12, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#414d63' },
  modalLabel: { fontWeight: '600', marginTop: 10, color: '#414d63' },
  modalText: { fontSize: 14, marginTop: 2, color: '#000' },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontWeight: '600' },
});

