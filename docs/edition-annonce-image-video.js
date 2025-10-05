import { useState, useContext, useRef } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av'; // Ajout pour la lecture vidéo
import * as FileSystem from 'expo-file-system';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';

export default function EditionAnnonce({navigation}) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [quantite, setQuantite] = useState('');
  const [media, setMedia] = useState(null);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedMediaExtension, setSelectedMediaExtension] = useState('');
  const [user] = useContext(GlobalContext);
  const videoRef = useRef(null); // Référence pour le lecteur vidéo

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Mo en octets

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Réduire la qualité pour limiter la taille
      videoMaxDuration: 90, // Limiter à 1 minute 30 secondes
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const uriParts = asset.uri.split('.');
      const extension = uriParts[uriParts.length - 1].toLowerCase();

      // Vérification de la taille du fichier
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Alert.alert('Erreur', 'La taille du fichier ne doit pas dépasser 15 Mo.');
        return;
      }

      // Déterminer le type MIME pour les vidéos
      let mediaType = asset.mimeType || '';
      if (asset.type === 'video' && !mediaType) {
        const videoTypes = {
          mp4: 'video/mp4',
          mov: 'video/quicktime',
          avi: 'video/x-msvideo',
          mkv: 'video/x-matroska',
          webm: 'video/webm',
          // Ajoutez d'autres extensions vidéo si nécessaire
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

    if (permissionResult.granted === false) {
      Alert.alert(
        'Permission requise',
        "L'accès à la caméra est nécessaire pour prendre une photo."
      );
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
    Alert.alert('Info', 'La capture vidéo n\'est pas supportée sur le web');
    return;
  }

  try {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        'Permissions requises',
        "L'accès à la caméra et au microphone est nécessaire pour enregistrer une vidéo."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'videos', // Correction ici
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      videoMaxDuration: 90, // ImagePicker va limiter automatiquement à 90s
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // Vérifier la taille du fichier
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      const fileSizeMB = fileInfo.size / (1024 * 1024);
      const MAX_FILE_SIZE = 15; // 15 MB 

      if (fileInfo.exists && fileSizeMB > MAX_FILE_SIZE) {
        Alert.alert(
          'Fichier trop volumineux',
          `La vidéo (${fileSizeMB.toFixed(1)} MB) dépasse la limite de ${MAX_FILE_SIZE} MB.`
        );
        return;
      }

      // Ne pas faire confiance à asset.duration qui peut être erroné
      // Faire confiance à videoMaxDuration qui limite déjà à 90s
      let videoDuration = asset.duration;
      
      // Si la durée semble incorrecte (problème connu avec ImagePicker)
      if (videoDuration && videoDuration > 90) {
        console.warn('Durée rapportée incorrecte:', videoDuration, 's - Ignorer cette vérification');
        // Ne pas bloquer l'utilisateur à cause d'un bug d'ImagePicker
      }

      // Déterminer le type MIME
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
    

      Alert.alert(
        'Succès', 
        `Vidéo enregistrée! (${Math.round(videoDuration || 0)}s, ${fileSizeMB.toFixed(1)} MB)`,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    Alert.alert(
      'Erreur',
      'Une erreur est survenue lors de l\'enregistrement de la vidéo. Veuillez réessayer.'
    );
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
      return (
        <Image
          source={{ uri: media }}
          style={styles.selectedMedia}
          resizeMode="cover"
        />
      );
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
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded && status.error) {
                Alert.alert('Erreur', 'Impossible de lire la vidéo sélectionnée.');
              }
            }}
          />
        </View>
      );
    } 

    return null;
  };

  const saveAnnonce = async () => {
    if (!titre.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour votre annonce.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une description pour votre annonce.');
      return;
    }

    if (!quantite || isNaN(quantite) || parseInt(quantite) < 5) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide (minimum 5).');
      return;
    }

    setLoading(true);

    try {

      // Utilisation de FormData pour envoyer le fichier
      const formData = new FormData();
      formData.append('utilisateur_id', user.matricule);
      formData.append('titre', titre);
      formData.append('description', description);
      formData.append('quantite', quantite);
      formData.append('type', selectedMediaExtension);

      if (selectedMedia && selectedMedia.assets && selectedMedia.assets[0]) {
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
        headers: {
          'Accept': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la communication avec le serveur');
      }

      if (result.success) {
        // Sauvegarde locale
        const nouvelleAnnonce = {
          titre: titre,
          description: description,
          quantite: quantite,
          photo: selectedMedia ? selectedMedia.assets[0].uri : null,
          type: selectedMediaExtension,
        };

        const existingAnnonces = await AsyncStorage.getItem('annonces');
        const annonces = existingAnnonces ? JSON.parse(existingAnnonces) : [];
        annonces.unshift(nouvelleAnnonce);
        await AsyncStorage.setItem('annonces', JSON.stringify(annonces));

        Alert.alert(
          'Succès',
          'Votre annonce a été publiée avec succès !',
          [
            {
              text: 'OK',
              onPress: () => {
                setTitre('');
                setDescription('');
                setQuantite('');
                setMedia(null);
                setType('');
                setSelectedMedia(null);
                setSelectedMediaExtension('');
              },
            },
          ]
        );
      } else {
        throw new Error(result.message || 'Erreur lors de la publication');
      }
    } catch (error) {
      Alert.alert('Message', error.message || 'Une erreur est survenue lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  return (
     <View style={styles.container}>
    <ScrollView
      
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
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
            maxLength={100}
          />
          <Text style={styles.charCount}>{titre.length}/100</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez votre annonce en détail"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Audiences *</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez le nombre de personnes (min: 5)"
            value={quantite}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num)) {
                setQuantite(Math.max(5, num).toString());
              } else if (text === '') {
                setQuantite('');
              }
            }}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        <View style={styles.inputGroup2}>
          <Text style={styles.label}>Média (Image, Vidéo)</Text>

          {media ? (
            <View style={styles.mediaContainer}>
              {getMediaPreview()}
              <TouchableOpacity style={styles.removeMediaButton} onPress={removeMedia}>
                <MaterialIcons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mediaOptions}>
              <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
                <MaterialIcons name="photo-camera" size={24} color="#414d63" />
                <Text style={styles.mediaButtonText}>
                  {Platform.OS === 'web' ? 'Choisir un média' : 'Prendre une photo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.mediaButton} onPress={takeVideo}>
                <MaterialIcons name="videocam" size={24} color="#414d63" />
                <Text style={styles.mediaButtonText}>Enregistrer vidéo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
                <MaterialIcons name="folder" size={24} color="#414d63" />
                <Text style={styles.mediaButtonText}>Galerie</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          onPress={saveAnnonce}
          disabled={loading}
        >
          <MaterialIcons name="save" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.publishButtonText}>
            {loading ? 'Publication...' : "Publier l'annonce"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

    <TouchableOpacity
        style={styles.floatingButtonRight}
        onPress={() => navigation.navigate("Edition d'avis")}>
                <Feather name="plus" size={24} color="white" />
    </TouchableOpacity>
        </View>       
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroup2: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#000',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  mediaContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    width: '100%',
  },
  selectedMedia: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  videoPreview: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  audioPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  videoText: {
    marginTop: 10,
    fontSize: 16,
    color: '#414d63',
    fontWeight: '500',
  },
  audioText: {
    marginTop: 10,
    fontSize: 16,
    color: '#414d63',
    fontWeight: '500',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  mediaButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  mediaButtonText: {
    fontSize: 12,
    color: '#414d63',
    fontWeight: '500',
    marginLeft: 8,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa4447',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  publishButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  buttonIcon: {
    marginRight: 8,
  },
  publishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  },
});