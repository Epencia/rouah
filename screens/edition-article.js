import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Linking, Dimensions, RefreshControl, TextInput, Modal, ScrollView, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';
import * as ImagePicker from 'expo-image-picker';
import Swiper from 'react-native-swiper';
import { Picker } from '@react-native-picker/picker';
const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 45) / 2;

export default function MonCatalogueArticle({ navigation }) {
  const [user] = useContext(GlobalContext);
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newArticle, setNewArticle] = useState({
    article_id:'',
    titre: '',
    description: '',
    prix: '',
    devise:'',
    statut: '',
    photo_base64: '',
    type_photo: 'image/jpeg',
    youtube_url: '',
    utilisateur_id: user?.matricule || '',
    etat: 'Actif',
    albumImages: [null, null, null],
  });
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Mo

  // Formatage des montants
  const formatAmount = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
  };

  // Demander la permission d'accéder à la galerie
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "L'application a besoin de l'accès à la galerie pour sélectionner des images.");
      }
    })();
  }, []);

  const fetchArticles = useCallback(async () => {
    if (!user?.matricule) {
      setError('Utilisateur non connecté');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`https://rouah.net/api/mon-catalogue-article.php?matricule=${user.matricule}`);
      const result = await response.json();
      if (result.success) {
        setArticles(result.data);
        setFilteredArticles(result.data);
        setError(null);
      } else {
        setError(result.message || 'Erreur lors de la récupération des articles');
      }
    } catch (err) {
      setError('Erreur réseau ou serveur indisponible');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.matricule]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    const filtered = articles.filter(
      (item) =>
        item.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredArticles(filtered);
  }, [searchTerm, articles]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSearchTerm('');
    fetchArticles();
  }, [fetchArticles]);

  const pickImage = async (isMainPhoto = true, index = null) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets) {
        const { base64, uri, fileSize } = result.assets[0];
        if (fileSize && fileSize > MAX_FILE_SIZE) {
          Alert.alert('Erreur', 'La taille de l’image ne doit pas dépasser 15 Mo.');
          return;
        }
        const type = uri.split('.').pop().toLowerCase();
        const mimeType = type === 'jpg' || type === 'jpeg' ? 'image/jpeg' : 'image/png';
        if (isMainPhoto) {
          setNewArticle({
            ...newArticle,
            photo_base64: base64,
            type_photo: mimeType,
          });
        } else {
          const newAlbumImages = [...newArticle.albumImages];
          newAlbumImages[index] = { uri, base64, type: mimeType };
          setNewArticle({ ...newArticle, albumImages: newAlbumImages });
        }
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const removeAlbumImage = (index) => {
    const newAlbumImages = [...newArticle.albumImages];
    newAlbumImages[index] = null;
    setNewArticle({ ...newArticle, albumImages: newAlbumImages });
  };

const saveAlbumImages = async (codeAnnonce) => {
  // 1️⃣ Vérification des entrées
  if (!codeAnnonce) {
    console.error('Erreur : codeAnnonce est requis');
    return { success: false, message: 'codeAnnonce est requis' };
  }

  const albumImages = newArticle?.albumImages || [];
  if (!Array.isArray(albumImages) || albumImages.length === 0) {
    console.warn('Aucune image à uploader');
    return { success: true, message: 'Aucune image fournie' };
  }

  // 2️⃣ Filtrer les images valides
  const validImages = albumImages.filter((img) => img && img.uri);
  if (validImages.length === 0) {
    console.warn('Aucune image valide à uploader');
    return { success: true, message: 'Aucune image valide' };
  }

  // 3️⃣ Fonction utilitaire pour récupérer le MIME type
  const getMimeType = (uri) => {
    const extension = uri.split('.').pop().toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'heic':
        return 'image/heic';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      default:
        return 'image/jpeg'; // Par défaut, utiliser JPEG
    }
  };

  const results = [];

  // 4️⃣ Boucle d'envoi des images
  for (let i = 0; i < validImages.length; i++) {
    const asset = validImages[i];

    // Normalisation de l'URI
    let uri = asset.uri;
    if (Platform.OS === 'ios' && uri.startsWith('file://')) {
      uri = uri.replace('file://', '');
    }

    // Détermination du type MIME
    const mimeType = asset.type || getMimeType(asset.uri);
    const filename = `media_${i + 1}_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;

    // Log pour débogage
    //console.log(`Envoi de l'image ${i + 1}:`, { uri, mimeType, filename });

    // Construction de FormData
    const formData = new FormData();
    formData.append('code_annonce', codeAnnonce);
    formData.append('type', mimeType);
    formData.append('image', {
      uri: uri,
      name: filename,
      type: mimeType,
    });

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Délai d’attente réseau dépassé')), 30000);
      });

      const fetchPromise = fetch('https://rouah.net/api/albums-upload.php', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur HTTP pour image ${i + 1}:`, errorText);
        throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
      }

      let data;
      try {
        data = await response.json();
        //console.log(`Réponse du serveur pour image ${i + 1}:`, data);
      } catch (jsonError) {
        //console.error(`Erreur de parsing JSON pour image ${i + 1}:`, jsonError);
        throw new Error(`Réponse non-JSON : ${jsonError.message}`);
      }

      if (!data.success) {
        results.push({
          index: i,
          success: false,
          message: data.message || 'Erreur serveur',
        });
      } else {
        results.push({
          index: i,
          success: true,
          message: 'Upload réussi',
        });
      }
    } catch (error) {
      console.error(`Erreur lors de l'upload de l'image ${i + 1}:`, error);
      results.push({
        index: i,
        success: false,
        message: error.message,
      });
    }
  }

  // 5️⃣ Retour global
  return {
    success: results.every((r) => r.success),
    results,
  };
};

  const openModal = (article) => {
    setSelectedArticle(article);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedArticle(null);
  };

  const openAddModal = (article = null) => {
    if (article) {
      setIsEditMode(true);
      setSelectedArticle(article);
      const albumImages = Array(3).fill(null);
      if (article.albums) {
        article.albums.slice(0, 3).forEach((img, idx) => {
          if (img.type && img.type.startsWith('image/')) {
            albumImages[idx] = { 
            uri: img.uri, // Utiliser l'URI existant
            base64: img.uri.split(',')[1], // Extraire la partie base64 si nécessaire
            type: img.type 
          };
          }
        });
      }
      setNewArticle({
        titre: article.titre || '',
        description: article.description || '',
        prix: article.prix ? article.prix.toString() : '',
        devise: article.devise ? article.devise : '',
        statut: article.statut ? article.statut : '', // Correction ici
        photo_base64: article.photo_base64 || '',
        type_photo: article.type_photo || 'image/jpeg',
        youtube_url: article.youtube_url || '',
        utilisateur_id: user?.matricule || '',
        etat: article.etat || 'Actif',
        albumImages,
      });
    } else {
      setIsEditMode(false);
      setSelectedArticle(null);
      setNewArticle({
        titre: '',
        description: '',
        prix: '',
        devise:'',
        statut: '',
        photo_base64: '',
        type_photo: 'image/jpeg',
        youtube_url: '',
        utilisateur_id: user?.matricule || '',
        etat: 'Actif',
        albumImages: [null, null, null],
      });
    }
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setNewArticle({
      titre: '',
      description: '',
      prix: '',
      devise:'',
      statut: '',
      photo_base64: '',
      type_photo: 'image/jpeg',
      youtube_url: '',
      utilisateur_id: user?.matricule || '',
      etat: 'Actif',
      albumImages: [null, null, null],
    });
    setIsEditMode(false);
  };

  const addArticle = async () => {
    if (!user?.matricule) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }
    if (!newArticle.titre || !newArticle.description || !newArticle.prix || !newArticle.statut || !newArticle.devise) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (Titre, Description, Prix, Dévise, Catégorie).');
      return;
    }
    if (isNaN(newArticle.prix)) {
      Alert.alert('Erreur', 'Le prix doit être un nombre valide.');
      return;
    }
    try {
      const codeAnnonce = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      const response = await fetch('https://rouah.net/api/articles-add.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newArticle, utilisateur_id: user.matricule, article_id: codeAnnonce }),
      });
      const result = await response.json();
      if (result.success) {
        const albumResult = await saveAlbumImages(codeAnnonce);
        if (!albumResult.success) {
          Alert.alert('Erreur', albumResult.message);
          return;
        }
        await fetchArticles();
        closeAddModal();
        Alert.alert('Succès', 'Article ajouté avec succès');
      } else {
        Alert.alert('Erreur', result.message || "Impossible d'ajouter l'article");
      }
    } catch (err) {
      Alert.alert('Erreur', err.message || 'Erreur réseau ou serveur indisponible');
    }
  };

  const updateArticle = async () => {
    if (!user?.matricule) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }
    if (!selectedArticle?.article_id) {
      Alert.alert('Erreur', 'Aucun article sélectionné pour la mise à jour');
      return;
    }
    if (!newArticle.titre || !newArticle.description || !newArticle.prix || !newArticle.statut || !newArticle.devise) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (Titre, Description, Prix, Dévise, Catégorie).');
      return;
    }
    if (isNaN(newArticle.prix)) {
      Alert.alert('Erreur', 'Le prix doit être un nombre valide.');
      return;
    }
    try {
    // 1. Update article principal
    const url = `https://rouah.net/api/articles-update.php?id=${selectedArticle.article_id}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newArticle, utilisateur_id: user.matricule, code_annonce: selectedArticle.article_id }),
    });
    const result = await response.json();
    if (!result.success) {
      Alert.alert('Erreur', result.message || 'Impossible de mettre à jour l\'article');
      return;
    }

    // 2. ❌ FIX : Supprimer ANCIENS albums
    try {
      const deleteRes = await fetch('https://rouah.net/api/albums-delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code_annonce: selectedArticle.article_id }),
      });
      const deleteResult = await deleteRes.json();
    } catch (deleteErr) {
    }

    // 3. Uploader NOUVEAUX albums (seulement les présents)
    const albumResult = await saveAlbumImages(selectedArticle.article_id);
    //console.log('🖼️ Upload albums:', albumResult);

    await fetchArticles();
    closeAddModal();
    Alert.alert('✅ Succès', 'Article mis à jour avec succès !');
  } catch (err) {
    Alert.alert('Erreur', err.message || 'Erreur réseau');
  }
};

  const deleteArticle = async (articleId) => {
    try {
      const response = await fetch(`https://rouah.net/api/articles-delete.php?id=${articleId}`);
      const result = await response.json();
      if (result.success) {
        await fetchArticles();
        Alert.alert('Succès', 'Article supprimé avec succès');
      } else {
        Alert.alert('Erreur', result.message || 'Impossible de supprimer l\'article');
      }
    } catch (err) {
      Alert.alert('Erreur', err.message || 'Erreur réseau ou serveur indisponible');
    }
  };

  const handleDeleteArticle = (articleId) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cet article ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', onPress: () => deleteArticle(articleId), style: 'destructive' },
      ]
    );
  };

  const handleAddOrUpdateArticle = () => {
    if (isEditMode) {
      updateArticle();
    } else {
      addArticle();
    }
  };

  const renderArticle = ({ item }) => {
    const albumImages = item.albums?.filter((media) => media.type.startsWith('image/')) || [];
    const sliderImages = item.photo_base64
      ? [
          {
            uri: `data:${item.type_photo || 'image/jpeg'};base64,${item.photo_base64}`,
            type: item.type_photo || 'image/jpeg',
          },
          ...albumImages,
        ]
      : albumImages;
    const hasSlider = sliderImages.length > 0;
    const youtubeId = item.youtube_url?.includes('youtube.com')
      ? item.youtube_url.split('v=')[1]?.split('&')[0]
      : item.youtube_url;
    return (
      <TouchableOpacity
        style={styles.articleContainer}
        activeOpacity={0.8}
        onPress={() => openModal(item)}
      >
        <View style={styles.imageContainer}>
          {hasSlider ? (
            <Swiper
              style={styles.sliderWrapper}
              showsButtons={sliderImages.length > 1}
              loop={sliderImages.length > 1}
              autoplay={true}
              autoplayTimeout={4}
              showsPagination={sliderImages.length > 1}
              paginationStyle={styles.swiperPagination}
              dotStyle={styles.swiperDot}
              activeDotStyle={styles.swiperActiveDot}
            >
              {sliderImages.map((media, index) => (
                <View key={index} style={styles.swiperSlide}>
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.articleImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </Swiper>
          ) : (
            <Image
              source={require('../assets/logo.png')}
              style={styles.articleImage}
              resizeMode="cover"
            />
          )}
          {youtubeId && (
            <TouchableOpacity
              style={styles.youtubeButton}
              onPress={() => Linking.openURL(item.youtube_url)}
            >
              <MaterialCommunityIcons name="youtube" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.articleTitle} numberOfLines={2}>{item.titre}</Text>
        <Text style={styles.articlePrice}>
          {item.prix ? `${formatAmount(item.prix)} ${item.devise}` : 'Prix non spécifié'}
        </Text>
        <Text style={styles.articleQuantity}>
          Catégorie : {item.statut || 'N/A'}
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => openModal(item)}
          >
            <Text style={styles.viewDetailsButtonText}>Voir détails</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openAddModal(item)}
          >
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteArticle(item.article_id)}
          >
            <Text style={styles.deleteButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderModalContent = () => {
    if (!selectedArticle) return null;
    const albumImages = selectedArticle.albums?.filter((media) => media.type.startsWith('image/')) || [];
    const sliderImages = selectedArticle.photo_base64
      ? [
          {
            uri: `data:${selectedArticle.type_photo || 'image/jpeg'};base64,${selectedArticle.photo_base64}`,
            type: selectedArticle.type_photo || 'image/jpeg',
          },
          ...albumImages,
        ]
      : albumImages;
    const hasSlider = sliderImages.length > 0;
    const youtubeId = selectedArticle.youtube_url?.includes('youtube.com')
      ? selectedArticle.youtube_url.split('v=')[1]?.split('&')[0]
      : selectedArticle.youtube_url;
    return (
      <View style={styles.modalContent}>
        <ScrollView contentContainerStyle={styles.modalScrollContainer}>
          {hasSlider ? (
            <Swiper
              style={styles.swiperContainer}
              showsButtons={sliderImages.length > 1}
              loop={sliderImages.length > 1}
              autoplay={true}
              autoplayTimeout={4}
              showsPagination={sliderImages.length > 1}
              paginationStyle={styles.swiperPagination}
              dotStyle={styles.swiperDot}
              activeDotStyle={styles.swiperActiveDot}
            >
              {sliderImages.map((media, index) => (
                <View key={index} style={styles.swiperSlide}>
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </Swiper>
          ) : (
            <Image
              source={require('../assets/logo.png')}
              style={styles.modalImage}
              resizeMode="cover"
            />
          )}
          <Text style={styles.modalTitle}>{selectedArticle.titre}</Text>
          <Text style={styles.modalDescription}>{selectedArticle.description}</Text>
          <Text style={styles.modalPrice}>
            Prix : {selectedArticle.prix ? `${formatAmount(selectedArticle.prix)} f.cfa` : 'Non spécifié'}
          </Text>
          <Text style={styles.modalDevise}>
            Dévise : {selectedArticle.devise || 'Non spécifié'}
          </Text>
          <Text style={styles.modalQuantity}>
            Catégorie : {selectedArticle.statut || 'Non spécifié'}
          </Text>
          <Text style={styles.modalStatus}>
            Statut : {selectedArticle.etat || 'Non spécifié'}
          </Text>
          {youtubeId && (
            <TouchableOpacity
              style={styles.modalYoutubeButton}
              onPress={() => Linking.openURL(selectedArticle.youtube_url)}
            >
              <MaterialCommunityIcons name="youtube" size={24} color="white" />
              <Text style={styles.modalYoutubeButtonText}>Voir la vidéo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
          <Text style={styles.closeButtonText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAddModalContent = () => {
    return (
      <View style={styles.modalContent}>
        <ScrollView contentContainerStyle={styles.modalScrollContainer}>
          <Text style={styles.modalTitle}>{isEditMode ? 'Modifier l\'article' : 'Ajouter un article'}</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage(true)}>
            <Text style={styles.imagePickerButtonText}>
              {newArticle.photo_base64 ? 'Changer l\'image principale' : 'Sélectionner l\'image principale'}
            </Text>
          </TouchableOpacity>
          {newArticle.photo_base64 && (
            <Image
              source={{ uri: `data:${newArticle.type_photo};base64,${newArticle.photo_base64}` }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            {newArticle.albumImages.map((_, i) => (
              <TouchableOpacity
                key={i}
                style={styles.imagePickerButton}
                onPress={() => pickImage(false, i)}
              >
                <Text style={styles.imagePickerButtonText}>Photo {i + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            {newArticle.albumImages.map((img, i) => (
              img ? (
                <View key={i} style={{ position: 'relative', marginRight: 5 }}>
                  <Image
                    source={{ uri: `data:${img.type};base64,${img.base64}` }}
                    style={{ width: 95, height: 95, borderRadius: 8 }}
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
                    width: 95,
                    height: 95,
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
          <TextInput
            style={styles.input}
            placeholder="Titre *"
            value={newArticle.titre}
            onChangeText={(text) => setNewArticle({ ...newArticle, titre: text })}
          />
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Description *"
            value={newArticle.description}
            onChangeText={(text) => setNewArticle({ ...newArticle, description: text })}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Prix *"
            value={newArticle.prix}
            onChangeText={(text) => setNewArticle({ ...newArticle, prix: text })}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Dévise *"
            value={newArticle.devise}
            onChangeText={(text) => setNewArticle({ ...newArticle, devise: text })}
          />
          <Picker
                          selectedValue={newArticle.statut}
                          onValueChange={(text) => setNewArticle({ ...newArticle, statut: text })}
                          style={styles.picker}
                          dropdownIconColor="#414d63"
                        >
                          <Picker.Item label="Public" value="Public" />
                          <Picker.Item label="Privé" value="Privé" />
                        </Picker>
          <TextInput
            style={styles.input}
            placeholder="URL YouTube"
            value={newArticle.youtube_url}
            onChangeText={(text) => setNewArticle({ ...newArticle, youtube_url: text })}
          />
                    <Picker
                          selectedValue={newArticle.etat}
                          onValueChange={(text) => setNewArticle({ ...newArticle, etat: text })}
                          style={styles.picker}
                          dropdownIconColor="#414d63"
                        >
                          <Picker.Item label="Actif" value="Actif" />
                          <Picker.Item label="Inactif" value="Inactif" />
                        </Picker>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAddOrUpdateArticle}
          >
            <Text style={styles.submitButtonText}>{isEditMode ? 'Mettre à jour' : 'Ajouter'}</Text>
          </TouchableOpacity>
        </ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={closeAddModal}>
          <Text style={styles.closeButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading && !isRefreshing) {
    const skeletonData = Array.from({ length: 6 });
    const SkeletonCard = () => (
      <View style={styles.articleContainer}>
        <View style={[styles.articleImage, { backgroundColor: '#e0e0e0' }]} />
        <View style={{ height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginVertical: 6 }} />
        <View style={{ height: 14, width: '60%', backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 6 }} />
        <View style={{ height: 12, width: '40%', backgroundColor: '#e0e0e0', borderRadius: 4 }} />
        <View style={[styles.viewDetailsButton, { backgroundColor: '#e0e0e0', marginTop: 10 }]} />
        <View style={[styles.editButton, { backgroundColor: '#e0e0e0', marginTop: 5 }]} />
      </View>
    );
    return (
      <FlatList
        data={skeletonData}
        renderItem={() => <SkeletonCard />}
        keyExtractor={(item, index) => index.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContainer}
      />
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            fetchArticles();
          }}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {articles.length > 0 ? (
        <View style={styles.searchBar}>
          <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher un article..."
            onChangeText={setSearchTerm}
            value={searchTerm}
            placeholderTextColor="#888"
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Aucune donnée disponible</Text>
        </View>
      )}
      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.article_id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          articles.length > 0 ? (
            <Text style={styles.emptyText}>Aucun article trouvé pour "{searchTerm}"</Text>
          ) : (
            <Text style={styles.emptyText}>Aucun article disponible</Text>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#1E90FF']}
            tintColor="#1E90FF"
          />
        }
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: ITEM_WIDTH + 15,
          offset: (ITEM_WIDTH + 15) * Math.floor(index / 2),
          index,
        })}
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {renderModalContent()}
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalContainer}>
          {renderAddModalContent()}
        </View>
      </Modal>
      <TouchableOpacity
        style={styles.floatingButtonRight}
        onPress={() => openAddModal()}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>
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
    paddingTop: 0,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  articleContainer: {
    width: ITEM_WIDTH,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  articleImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    lineHeight: 18,
  },
  articlePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 5,
  },
  articleQuantity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  articleStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  viewDetailsButton: {
    backgroundColor: '#fa4447',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
  },
  viewDetailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  youtubeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF0000',
    padding: 5,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 6,
    margin: 15,
    paddingHorizontal: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 10,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: '#414d63',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  noDataContainer: {
    marginTop: 25,
    marginHorizontal: 15,
    backgroundColor: 'white',
    borderRadius: 6,
    paddingVertical: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noDataText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    padding: 20,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  retryButton: {
    backgroundColor: '#fa4447',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: width * 0.6,
    alignSelf: 'center',
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
    width: width * 0.9,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalScrollContainer: {
    padding: 15,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
    textAlign: 'justify',
  },
  modalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 10,
  },
  modalQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  modalStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  modalYoutubeButton: {
    flexDirection: 'row',
    backgroundColor: '#FF0000',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  modalYoutubeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    margin: 15,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#fa4447',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  sliderWrapper: {
    height: 150,
    marginBottom: 8,
  },
  swiperContainer: {
    height: 200,
    marginBottom: 15,
  },
  swiperSlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperPagination: {
    bottom: 10,
  },
  swiperDot: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 3,
  },
  swiperActiveDot: {
    backgroundColor: '#1E90FF',
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 3,
  },
});