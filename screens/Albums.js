import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Share,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { offlineFetch } from '../services/offlineApi';

// ============ CONSTANTES API ============
const API_URL = 'https://rouah.net/api/api-album.php';

// ============ FONCTIONS UTILITAIRES ============
const formatMoney = (val) => {
  return Number(val || 0).toLocaleString('fr-FR') + ' F';
};

export default function AlbumsScreen({ societeId, boutiqueId, user, onChanged }) {
  // ==================== ÉTATS ====================
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [articles, setArticles] = useState([]);
  const [searchText, setSearchText] = useState('');

  // Détail article + albums
  const [showDetail, setShowDetail] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Formulaire ajout / modification image
  const [showImageForm, setShowImageForm] = useState(false);
  const [imageFormMode, setImageFormMode] = useState('create'); // create | edit
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [imageTitre, setImageTitre] = useState('');
  const [imageUri, setImageUri] = useState(null);       // local URI
  const [imageBase64, setImageBase64] = useState(null); // data URI or pure base64
  const [saving, setSaving] = useState(false);

  // ==================== APPELS API ====================
  const apiCall = async (url, body = {}) => {
  // Compatibilité si un jour on appelle apiCall({ action: '...' }) sans url
  if (typeof url === 'object' && url !== null) {
    body = url;
    url = API_URL;
  }

  const json = await offlineFetch(url, {
    societe_id: societeId,
    boutique_id: boutiqueId || undefined,
    utilisateur_id: user?.utilisateur_id,
    ...body,
  });

  if (!json.success) throw new Error(json.message || 'Erreur API');
  return json;
};
  // ==================== CHARGEMENT ====================
  const loadArticles = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({
        action: 'list_articles_albums',
        search: searchText || undefined,
      });
      setArticles(json.data || []);
    } catch (e) {
      console.warn('loadArticles error:', e.message);
    }
  }, [societeId, searchText]);

  const loadAll = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      await loadArticles();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societeId, loadArticles]);

  useEffect(() => {
    if (societeId) loadAll();
  }, [societeId, loadAll]);

  // ==================== DÉTAIL ARTICLE ====================
  const openArticleDetail = async (article) => {
    setCurrentArticle(article);
    setAlbums([]);
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const json = await apiCall({
        action: 'get_article_albums',
        article_id: article.article_id,
      });
      if (json.success) {
        setCurrentArticle(json.data.article);
        setAlbums(json.data.albums || []);
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!currentArticle?.article_id) return;
    setDetailLoading(true);
    try {
      const json = await apiCall({
        action: 'get_article_albums',
        article_id: currentArticle.article_id,
      });
      if (json.success) {
        setCurrentArticle(json.data.article);
        setAlbums(json.data.albums || []);
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // ==================== PARTAGE / COPIE LIEN ====================
  const getCatalogueUrl = (articleId) =>
    `https://rouah.net/app/catalogue/${articleId}`;

  const copyLink = (articleId) => {
    const url = getCatalogueUrl(articleId);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    } else {
      Clipboard.setString(url);
    }
    Alert.alert('Copié', 'Lien catalogue copié dans le presse-papiers');
  };

  const shareLink = async (articleId, nom) => {
    const url = getCatalogueUrl(articleId);
    try {
      await Share.share({
        message: `Catalogue – ${nom || 'Article'}\n${url}`,
        url, // iOS
        title: nom || 'Catalogue article',
      });
    } catch (e) {
      // utilisateur a annulé
    }
  };

  // ==================== SÉLECTION IMAGE ====================
 const pickImage = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];

      setImageUri(asset.uri);

      const mime = asset.mimeType || 'image/jpeg';

      if (asset.base64) {
        setImageBase64(`data:${mime};base64,${asset.base64}`);
      }
    }
  } catch (e) {
    console.error('Erreur sélection image:', e);
    Alert.alert('Erreur', 'Impossible de sélectionner cette image.');
  }
};

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Autorisez l’accès à la caméra.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      const mime = asset.mimeType || 'image/jpeg';
      setImageBase64(`data:${mime};base64,${asset.base64}`);
    }
  };

  // ==================== AJOUT / MODIFICATION IMAGE ====================
  const openAddImage = () => {
    if (albums.length >= 4) {
      Alert.alert('Limite atteinte', 'Maximum 4 images par article.');
      return;
    }
    setImageFormMode('create');
    setEditingAlbum(null);
    setImageTitre('');
    setImageUri(null);
    setImageBase64(null);
    setShowImageForm(true);
  };

  const openEditImage = (album) => {
    setImageFormMode('edit');
    setEditingAlbum(album);
    setImageTitre(album.titre || '');
    setImageUri(album.photo_base64 || null);
    setImageBase64(null); // null = pas de nouvelle photo, on garde l’existante
    setShowImageForm(true);
  };

  const saveImage = async () => {
    if (imageFormMode === 'create' && !imageBase64) {
      Alert.alert('Erreur', 'Sélectionnez une image');
      return;
    }

    setSaving(true);
    try {
      if (imageFormMode === 'create') {
        const json = await apiCall({
          action: 'add_album',
          article_id: currentArticle.article_id,
          titre: imageTitre || 'Image',
          photo: imageBase64,
        });
        Alert.alert('Succès', json.message || 'Image ajoutée');
      } else {
        const payload = {
          action: 'update_album',
          album_id: editingAlbum.album_id,
          titre: imageTitre || 'Image',
        };
        if (imageBase64) {
          payload.photo = imageBase64;
        }
        const json = await apiCall(payload);
        Alert.alert('Succès', json.message || 'Image mise à jour');
      }
      setShowImageForm(false);
      await refreshDetail();
      loadArticles();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteImage = (album) => {
    Alert.alert(
      'Supprimer l’image',
      `Supprimer « ${album.titre || 'Image'} » ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              const json = await apiCall({
                action: 'delete_album',
                album_id: album.album_id,
              });
              Alert.alert('Succès', json.message || 'Image supprimée');
              await refreshDetail();
              loadArticles();
              onChanged?.();
            } catch (e) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  // ==================== RENDU LISTE ARTICLES ====================
  const renderArticleItem = ({ item }) => {
    const nb = item.nb_images || 0;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openArticleDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.nom}
          </Text>
          <View style={[styles.badgeImages, nb >= 4 && styles.badgeImagesFull]}>
            <Ionicons name="images-outline" size={14} color={nb >= 4 ? '#fff' : '#075E54'} />
            <Text style={[styles.badgeImagesText, nb >= 4 && { color: '#fff' }]}>
              {nb}/4
            </Text>
          </View>
        </View>

        <Text style={styles.cardSub}>
          {item.code_barre ? `Code: ${item.code_barre}` : 'Sans code-barres'}
          {item.famille_nom ? ` · ${item.famille_nom}` : ''}
        </Text>

        <View style={styles.cardRow}>
          <Text style={styles.cardPrice}>{formatMoney(item.prix_vente)}</Text>
          <View style={styles.linkActions}>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => copyLink(item.article_id)}
            >
              <Ionicons name="copy-outline" size={16} color="#075E54" />
              <Text style={styles.linkBtnText}>Copier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => shareLink(item.article_id, item.nom)}
            >
              <Ionicons name="share-outline" size={16} color="#075E54" />
              <Text style={styles.linkBtnText}>Partager</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.catalogueHint} numberOfLines={1}>
          {getCatalogueUrl(item.article_id)}
        </Text>
      </TouchableOpacity>
    );
  };

  // ==================== RENDU PRINCIPAL ====================
  if (loading && !articles.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Chargement des albums...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un article..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={loadArticles}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              setTimeout(loadArticles, 50);
            }}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.article_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadArticles().finally(() => setRefreshing(false));
            }}
            colors={['#075E54']}
          />
        }
        renderItem={renderArticleItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun article trouvé</Text>
        }
      />

      {/* ========== MODAL DÉTAIL ARTICLE + ALBUMS ========== */}
      <Modal visible={showDetail} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {currentArticle?.nom || 'Article'}
            </Text>
            <TouchableOpacity onPress={() => setShowDetail(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {detailLoading ? (
            <View style={styles.detailLoading}>
              <ActivityIndicator size="large" color="#075E54" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Infos article (lecture seule) */}
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Code-barres</Text>
                <Text style={styles.infoValue}>
                  {currentArticle?.code_barre || '—'}
                </Text>
                <Text style={styles.infoLabel}>Prix de vente</Text>
                <Text style={styles.infoValue}>
                  {formatMoney(currentArticle?.prix_vente)}
                </Text>
                {currentArticle?.famille_nom ? (
                  <>
                    <Text style={styles.infoLabel}>Famille</Text>
                    <Text style={styles.infoValue}>{currentArticle.famille_nom}</Text>
                  </>
                ) : null}
              </View>

              {/* Lien catalogue */}
              <View style={styles.linkBox}>
                <Text style={styles.linkBoxTitle}>Lien catalogue public</Text>
                <Text style={styles.linkBoxUrl} selectable>
                  {getCatalogueUrl(currentArticle?.article_id)}
                </Text>
                <View style={styles.linkBoxActions}>
                  <TouchableOpacity
                    style={[styles.linkBoxBtn, { backgroundColor: '#E8F5E9',borderWidth:1,borderColor:'#075E54' }]}
                    onPress={() => copyLink(currentArticle?.article_id)}
                  >
                    <Ionicons name="copy-outline" size={18} color="#075E54" />
                    <Text style={[styles.linkBoxBtnText, { color: '#075E54' }]}>
                      Copier
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.linkBoxBtn, { backgroundColor: '#075E54' }]}
                    onPress={() =>
                      shareLink(currentArticle?.article_id, currentArticle?.nom)
                    }
                  >
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={[styles.linkBoxBtnText, { color: '#fff' }]}>
                      Partager
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Galerie images */}
              <View style={styles.galleryHeader}>
                <Text style={styles.galleryTitle}>
                  Images ({albums.length}/4)
                </Text>
                {albums.length < 4 && (
                  <TouchableOpacity style={styles.addImageBtn} onPress={openAddImage}>
                    <Ionicons name="add-circle" size={22} color="#075E54" />
                    <Text style={styles.addImageBtnText}>Ajouter</Text>
                  </TouchableOpacity>
                )}
              </View>

              {albums.length === 0 ? (
                <View style={styles.emptyGallery}>
                  <Ionicons name="images-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyGalleryText}>
                    Aucune image pour cet article
                  </Text>
                  <TouchableOpacity style={styles.addFirstBtn} onPress={openAddImage}>
                    <Text style={styles.addFirstBtnText}>Ajouter la 1ère image</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.galleryGrid}>
                  {albums.map((album) => (
                    <View key={album.album_id} style={styles.galleryItem}>
                      <Image
                        source={{ uri: album.photo_base64 }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.galleryTitre} numberOfLines={1}>
                        {album.titre || 'Image'}
                      </Text>
                      <View style={styles.galleryActions}>
                        <TouchableOpacity
                          style={styles.galleryActionBtn}
                          onPress={() => openEditImage(album)}
                        >
                          <Ionicons name="create-outline" size={18} color="#075E54" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.galleryActionBtn}
                          onPress={() => deleteImage(album)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#DC3545" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ========== MODAL AJOUT / MODIF IMAGE ========== */}
      <Modal visible={showImageForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {imageFormMode === 'create' ? 'Nouvelle image' : 'Modifier l’image'}
            </Text>
            <TouchableOpacity onPress={() => setShowImageForm(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.modalLabel}>Titre (optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              value={imageTitre}
              onChangeText={setImageTitre}
              placeholder="Ex: Vue de face, Détail..."
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>
              Image {imageFormMode === 'create' ? '*' : '(laisser vide pour garder)'}
            </Text>

            {(imageUri || (imageFormMode === 'edit' && editingAlbum?.photo_base64)) && (
              <Image
                source={{
                  uri: imageUri || editingAlbum?.photo_base64,
                }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={22} color="#075E54" />
                <Text style={styles.pickBtnText}>Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={22} color="#075E54" />
                <Text style={styles.pickBtnText}>Caméra</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]}
              onPress={saveImage}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSaveBtnText}>
                  {imageFormMode === 'create' ? 'Ajouter l’image' : 'Enregistrer'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: { color: '#075E54', marginTop: 12, fontSize: 16 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    paddingVertical: 4,
  },

  listContent: { padding: 10, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  badgeImages: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeImagesFull: {
    backgroundColor: '#075E54',
  },
  badgeImagesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#075E54',
  },
  cardSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#075E54',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 10,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#075E54',
  },
  catalogueHint: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 6,
  },

  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 40,
  },

  // Modal commun
  modalWrapper: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    backgroundColor:'#075E54'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  modalBody: { padding: 16, paddingBottom: 40 },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  modalSaveBtn: {
    backgroundColor: '#075E54',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  modalSaveBtnDisabled: { opacity: 0.65 },
  modalSaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  detailLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  linkBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  linkBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#075E54',
    marginBottom: 6,
  },
  linkBoxUrl: {
    fontSize: 12,
    color: '#333',
    marginBottom: 12,
  },
  linkBoxActions: {
    flexDirection: 'row',
    gap: 10,
  },
  linkBoxBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  linkBoxBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  galleryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  addImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addImageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
  },

  emptyGallery: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyGalleryText: {
    color: '#999',
    marginTop: 10,
    fontSize: 14,
  },
  addFirstBtn: {
    marginTop: 16,
    backgroundColor: '#075E54',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addFirstBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  galleryItem: {
    width: '47%',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  galleryImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#eee',
  },
  galleryTitre: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  galleryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    gap: 12,
  },
  galleryActionBtn: {
    padding: 4,
  },

  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#eee',
    marginBottom: 12,
  },
  pickRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  pickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
  },
});