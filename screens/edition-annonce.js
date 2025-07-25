import { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';

export default function EditionAnnonce() {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [quantite, setQuantite] = useState('');
  const [photo, setPhoto] = useState(null);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageExtension, setSelectedImageExtension] = useState('');

  const [user] = useContext(GlobalContext);


  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.Images,
      allowsEditing: true,
      base64: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
          setSelectedImage(result);
          const uriParts = result.assets[0].uri.split('.');
            const extension = uriParts[uriParts.length - 1];
            setSelectedImageExtension(`image/${extension}`);
            setPhoto(result.assets[0].uri);
            setType(`image/${extension}`);
        }
  };



  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      pickImage();
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission requise",
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
      setPhoto(result.assets[0].uri);
      setType('photo'); // Définir le type comme 'photo' pour les photos prises
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setType(''); // Réinitialiser le type
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

      const photo = selectedImage ? selectedImage.assets[0].base64 : null;

      const matricule = user?.matricule || await AsyncStorage.getItem('matricule');
if (!matricule) {
  throw new Error('⚠️ Veuillez vous connecter pour publier une annonce');
}

      const response = await fetch('https://rouah.net/api/edition-annonce.php', {
        method: 'POST',
        body:JSON.stringify({
				     utilisateur_id: matricule,
				     titre: titre,
             description : description,
             quantite : quantite,
             photo : photo,
             type : selectedImageExtension,
			}),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Sauvegarde locale
        const nouvelleAnnonce = {
          titre: titre,
          description: description,
          quantite: quantite,
          photo: photo,
          type: type,
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
                setPhoto(null);
                setType('');
              }
            }
          ]
        );
      } 
      Alert.alert("Message",result.message);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
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
          <Text style={styles.label}>Nombre de clients *</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez le nombre de clients (min: 1)"
            value={quantite}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num)) {
                setQuantite(Math.max(1, num).toString());
              } else if (text === '') {
                setQuantite('');
              }
            }}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        <View style={styles.inputGroup2}>
          <Text style={styles.label}>Photo</Text>
          
          {photo ? (
            <View style={styles.photoContainer}>
              <Image 
                source={{ uri: photo }} 
                style={styles.selectedPhoto} 
                resizeMode="cover"
              />
              <TouchableOpacity style={styles.removePhotoButton} onPress={removePhoto}>
                <MaterialIcons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoOptions}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <MaterialIcons name="photo-camera" size={24} color="#414d63" />
                <Text style={styles.photoButtonText}>
                  {Platform.OS === 'web' ? 'Choisir une image' : 'Prendre une photo'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <MaterialIcons name="photo-library" size={24} color="#414d63" />
                <Text style={styles.photoButtonText}>Galerie</Text>
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
            {loading ? 'Publication...' : 'Publier l\'annonce'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingBottom: 40, // Pour éviter que le bouton ne soit collé en bas
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
    //marginBottom: 20,
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
  photoContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    width: '100%',
  },
  selectedPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  removePhotoButton: {
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
  photoOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  photoButtonText: {
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
});