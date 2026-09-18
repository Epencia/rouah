import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Dimensions,
  StatusBar,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { offlineFetch } from '../services/offlineApi';


const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W = (SCREEN_W - 32 - CARD_GAP) / 2;

const API_URL = 'https://rouah.net/api/api-album.php';

const formatMoney = (val) =>
  Number(val || 0).toLocaleString('fr-FR') + ' F';

const getCatalogueUrl = (articleId) =>
  `https://rouah.net/app/catalogue/${articleId}`;

/**
 * CatalogueScreen — mode vitrine e-commerce
 * Props: societeId, boutiqueId, user, onChanged
 */
export default function CatalogueScreen({ societeId, societeNom, boutiqueId='', user, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [articles, setArticles] = useState([]);
  const [searchText, setSearchText] = useState('');

  // Détail
  const [showDetail, setShowDetail] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Form image
  const [showImageForm, setShowImageForm] = useState(false);
  const [imageFormMode, setImageFormMode] = useState('create');
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [imageTitre, setImageTitre] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [saving, setSaving] = useState(false);

  const galleryRef = useRef(null);

  // ==================== API ====================
  const apiCall = async (url, body = {}) => {
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

  // ==================== LOAD ====================
  const loadArticles = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({
        action: 'list_articles_albums',
        search: searchText || undefined,
      });
      setArticles(json.data || []);
    } catch (e) {
      console.warn('loadArticles:', e.message);
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

  // ==================== DETAIL ====================
  const openArticleDetail = async (article) => {
    setCurrentArticle(article);
    setAlbums([]);
    setGalleryIndex(0);
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

  // ==================== SHARE ====================
  const copyLink = (articleId) => {
    const url = getCatalogueUrl(articleId);
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        navigator.clipboard.writeText(url);
      } else {
        Clipboard.setString(url);
      }
      Alert.alert('Copié', 'Lien catalogue copié');
    } catch (_) {
      Alert.alert('Lien', url);
    }
  };

  const shareLink = async (articleId, nom) => {
    const url = getCatalogueUrl(articleId);
    try {
      await Share.share({
        message: `${nom || 'Article'}\n${url}`,
        url,
        title: nom || 'Catalogue',
      });
    } catch (_) {}
  };

  // ==================== IMAGE PICKER ====================
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
      Alert.alert('Permission', "Autorisez l'accès à la caméra.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      const mime = asset.mimeType || 'image/jpeg';
      setImageBase64(`data:${mime};base64,${asset.base64}`);
    }
  };

  const openAddImage = () => {
    if (albums.length >= 4) {
      Alert.alert('Limite', 'Maximum 4 images par article.');
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
    setImageBase64(null);
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
        if (imageBase64) payload.photo = imageBase64;
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
    Alert.alert('Supprimer', `Supprimer « ${album.titre || 'Image'} » ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiCall({ action: 'delete_album', album_id: album.album_id });
            await refreshDetail();
            loadArticles();
            onChanged?.();
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        },
      },
    ]);
  };

  // ==================== CARD PRODUIT (grille 2 colonnes) ====================
  const renderProductCard = ({ item }) => {
    const cover =
      item.cover_photo ||
      item.photo_base64 ||
      item.first_image ||
      (item.albums && item.albums[0]?.photo_base64) ||
      null;
    const nb = item.nb_images || 0;
    const stock = item.quantite ?? item.stock ?? null;
    const lowStock =
      stock != null &&
      item.stock_alerte != null &&
      stock <= item.stock_alerte;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => openArticleDetail(item)}
        activeOpacity={0.85}
      >
        <View style={styles.productImageWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={36} color="#ccc" />
            </View>
          )}
          {/* Badge images */}
          <View style={[styles.imgBadge, nb >= 4 && styles.imgBadgeFull]}>
            <Ionicons name="images" size={11} color={nb >= 4 ? '#fff' : '#075E54'} />
            <Text style={[styles.imgBadgeText, nb >= 4 && { color: '#fff' }]}>{nb}/4</Text>
          </View>
          {/* Badge stock */}
          {stock != null && (
            <View
              style={[
                styles.stockBadge,
                stock <= 0
                  ? styles.stockOut
                  : lowStock
                  ? styles.stockLow
                  : styles.stockOk,
              ]}
            >
              <Text style={styles.stockBadgeText}>
                {stock <= 0 ? 'Rupture' : lowStock ? 'Stock limité' : 'En stock'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.productBody}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.nom}
          </Text>
          {item.famille_nom ? (
            <Text style={styles.productCat} numberOfLines={1}>
              {item.famille_nom}
            </Text>
          ) : null}
          <Text style={styles.productPrice}>{formatMoney(item.prix_vente)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== LOADING ====================
  if (loading && !articles.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Chargement du catalogue...</Text>
      </View>
    );
  }

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      {/* Header catalogue */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Ionicons name="storefront" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>
             <Text style={{ color: '#075E54' }}> {societeNom} </Text>
            </Text>
            <Text style={styles.headerSub}>
              {articles.length} article{articles.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          placeholderTextColor="#999"
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
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Grille produits */}
      <FlatList
        data={articles}
        keyExtractor={(item) => String(item.article_id)}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
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
        renderItem={renderProductCard}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={56} color="#ccc" />
            <Text style={styles.emptyText}>Aucun produit trouvé</Text>
          </View>
        }
      />

      {/* ========== MODAL FICHE PRODUIT ========== */}
      <Modal visible={showDetail} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <View style={styles.detailRoot}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setShowDetail(false)} style={styles.detailClose}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.detailHeaderTitle} numberOfLines={1}>
              Fiche produit
            </Text>
            <TouchableOpacity
              onPress={() =>
                shareLink(currentArticle?.article_id, currentArticle?.nom)
              }
              style={styles.detailShare}
            >
              <Ionicons name="share-outline" size={22} color="#075E54" />
            </TouchableOpacity>
          </View>

          {detailLoading ? (
            <View style={styles.detailLoading}>
              <ActivityIndicator size="large" color="#075E54" />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Galerie images */}
              <View style={styles.galleryWrap}>
                {albums.length > 0 ? (
                  <>
                    <ScrollView
                      ref={galleryRef}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={(e) => {
                        const idx = Math.round(
                          e.nativeEvent.contentOffset.x / SCREEN_W
                        );
                        setGalleryIndex(idx);
                      }}
                    >
                      {albums.map((a) => (
                        <Image
                          key={a.album_id}
                          source={{ uri: a.photo_base64 }}
                          style={styles.galleryFullImage}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                    {/* Dots */}
                    {albums.length > 1 && (
                      <View style={styles.dots}>
                        {albums.map((_, i) => (
                          <View
                            key={i}
                            style={[styles.dot, i === galleryIndex && styles.dotActive]}
                          />
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.galleryEmpty}>
                    <Ionicons name="image-outline" size={64} color="#ddd" />
                    <Text style={styles.galleryEmptyText}>Aucune photo</Text>
                  </View>
                )}
              </View>

              {/* Infos produit */}
              <View style={styles.detailBody}>
                <Text style={styles.detailName}>{currentArticle?.nom}</Text>
                <Text style={styles.detailPrice}>
                  {formatMoney(currentArticle?.prix_vente)}
                </Text>

                <View style={styles.metaRow}>
                  {currentArticle?.code_barre ? (
                    <View style={styles.metaChip}>
                      <Ionicons name="barcode-outline" size={14} color="#666" />
                      <Text style={styles.metaChipText}>{currentArticle.code_barre}</Text>
                    </View>
                  ) : null}
                  {currentArticle?.famille_nom ? (
                    <View style={styles.metaChip}>
                      <Ionicons name="pricetag-outline" size={14} color="#666" />
                      <Text style={styles.metaChipText}>{currentArticle.famille_nom}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Lien public */}
                <View style={styles.linkCard}>
                  <Text style={styles.linkCardTitle}>Lien catalogue public</Text>
                  <Text style={styles.linkCardUrl} selectable numberOfLines={2}>
                    {getCatalogueUrl(currentArticle?.article_id)}
                  </Text>
                  <View style={styles.linkCardActions}>
                    <TouchableOpacity
                      style={styles.linkCardBtnOutline}
                      onPress={() => copyLink(currentArticle?.article_id)}
                    >
                      <Ionicons name="copy-outline" size={16} color="#075E54" />
                      <Text style={styles.linkCardBtnOutlineText}>Copier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.linkCardBtnPrimary}
                      onPress={() =>
                        shareLink(currentArticle?.article_id, currentArticle?.nom)
                      }
                    >
                      <Ionicons name="share-outline" size={16} color="#fff" />
                      <Text style={styles.linkCardBtnPrimaryText}>Partager</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Gestion images (max 4) */}
                <View style={styles.albumSection}>
                  <View style={styles.albumSectionHeader}>
                    <Text style={styles.albumSectionTitle}>
                      Photos ({albums.length}/4)
                    </Text>
                    {albums.length < 4 && (
                      <TouchableOpacity style={styles.addPhotoBtn} onPress={openAddImage}>
                        <Ionicons name="add-circle" size={20} color="#075E54" />
                        <Text style={styles.addPhotoBtnText}>Ajouter</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {albums.length === 0 ? (
                    <TouchableOpacity style={styles.addFirstPhoto} onPress={openAddImage}>
                      <Ionicons name="camera-outline" size={28} color="#075E54" />
                      <Text style={styles.addFirstPhotoText}>Ajouter une photo</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.thumbRow}>
                      {albums.map((album) => (
                        <View key={album.album_id} style={styles.thumbItem}>
                          <Image
                            source={{ uri: album.photo_base64 }}
                            style={styles.thumbImage}
                            resizeMode="cover"
                          />
                          <View style={styles.thumbActions}>
                            <TouchableOpacity onPress={() => openEditImage(album)}>
                              <Ionicons name="create-outline" size={18} color="#075E54" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteImage(album)}>
                              <Ionicons name="trash-outline" size={18} color="#DC3545" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ========== MODAL AJOUT / EDIT IMAGE ========== */}
      <Modal visible={showImageForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {imageFormMode === 'create' ? 'Nouvelle photo' : 'Modifier la photo'}
            </Text>
            <TouchableOpacity onPress={() => setShowImageForm(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.modalLabel}>Titre (optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              value={imageTitre}
              onChangeText={setImageTitre}
              placeholder="Ex: Vue de face..."
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>
              Image {imageFormMode === 'create' ? '*' : '(vide = garder)'}
            </Text>
            {(imageUri || (imageFormMode === 'edit' && editingAlbum?.photo_base64)) && (
              <Image
                source={{ uri: imageUri || editingAlbum?.photo_base64 }}
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
              style={[styles.saveBtn, saving && { opacity: 0.65 }]}
              onPress={saveImage}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {imageFormMode === 'create' ? 'Ajouter' : 'Enregistrer'}
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
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  loadingText: { color: '#075E54', marginTop: 12, fontSize: 15 },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 1 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 0 },

  gridContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  gridRow: { justifyContent: 'space-between', marginBottom: CARD_GAP },

  productCard: {
    width: CARD_W,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  productImageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  productImage: { width: '100%', height: '100%' },
  productImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232,245,233,0.95)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  imgBadgeFull: { backgroundColor: 'rgba(7,94,84,0.9)' },
  imgBadgeText: { fontSize: 10, fontWeight: '700', color: '#075E54' },
  stockBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockOk: { backgroundColor: 'rgba(46,204,113,0.9)' },
  stockLow: { backgroundColor: 'rgba(241,196,15,0.95)' },
  stockOut: { backgroundColor: 'rgba(231,76,60,0.9)' },
  stockBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  productBody: { padding: 10 },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 18,
    minHeight: 36,
  },
  productCat: { fontSize: 11, color: '#999', marginTop: 2 },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#075E54',
    marginTop: 6,
  },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', marginTop: 12, fontSize: 14 },

  // Detail
  detailRoot: { flex: 1, backgroundColor: '#fff' },
  detailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    backgroundColor:'#075E54'
  },
  detailClose: { padding: 4 },
  detailHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  detailShare: { padding: 4 },
  detailLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  galleryWrap: {
    width: SCREEN_W,
    height: SCREEN_W * 0.85,
    backgroundColor: '#f5f5f5',
  },
  galleryFullImage: { width: SCREEN_W, height: SCREEN_W * 0.85 },
  galleryEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryEmptyText: { color: '#bbb', marginTop: 8 },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#fff', width: 18 },

  detailBody: { padding: 16 },
  detailName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  detailPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#075E54',
    marginBottom: 12,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  metaChipText: { fontSize: 12, color: '#555' },

  linkCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  linkCardTitle: { fontSize: 13, fontWeight: '700', color: '#075E54', marginBottom: 6 },
  linkCardUrl: { fontSize: 12, color: '#333', marginBottom: 12 },
  linkCardActions: { flexDirection: 'row', gap: 10 },
  linkCardBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#075E54',
    backgroundColor: '#fff',
  },
  linkCardBtnOutlineText: { fontSize: 13, fontWeight: '600', color: '#075E54' },
  linkCardBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#075E54',
  },
  linkCardBtnPrimaryText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  albumSection: { marginTop: 4 },
  albumSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  albumSectionTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPhotoBtnText: { fontSize: 14, fontWeight: '600', color: '#075E54' },
  addFirstPhoto: {
    alignItems: 'center',
    paddingVertical: 28,
    borderWidth: 1.5,
    borderColor: '#c8e6c9',
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: '#f1f8f4',
  },
  addFirstPhotoText: { color: '#075E54', fontWeight: '600', marginTop: 8 },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbItem: {
    width: (SCREEN_W - 32 - 30) / 4,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  thumbImage: { width: '100%', aspectRatio: 1, backgroundColor: '#eee' },
  thumbActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    backgroundColor: '#fafafa',
  },

  // Form modal
  modalWrapper: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#eee',
    marginBottom: 12,
  },
  pickRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
  pickBtnText: { fontSize: 14, fontWeight: '600', color: '#075E54' },
  saveBtn: {
    backgroundColor: '#075E54',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});