import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

// Configuration de l'API
const API_BASE_URL = 'http://rouah.net/api';

// Fonction utilitaire pour extraire l'ID YouTube d'une URL
const extraireIdYouTube = (url) => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/,
    /youtube\.com\/watch\?.*v=([^&?#]+)/,
    /youtu\.be\/([^&?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return url;
};

// Fonction pour détecter le type de vidéo
const detecterTypeVideo = (idVideo) => {
  if (!idVideo) return 'inconnu';
  
  if (idVideo.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(idVideo)) {
    return 'youtube';
  }
  
  if (idVideo.includes('tiktok.com') || idVideo.includes('vm.tiktok.com')) {
    return 'tiktok';
  }
  
  if (idVideo.includes('youtube.com') || idVideo.includes('youtu.be')) {
    const idExtrait = extraireIdYouTube(idVideo);
    return idExtrait ? 'youtube' : 'inconnu';
  }
  
  return 'inconnu';
};

// Composant Image avec fallback
const ImageAvecFallback = ({ source, style, fallbackSource, ...props }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const imageSource = hasError || !source?.uri ? fallbackSource : source;

  return (
    <View style={[style, { position: 'relative' }]}>
      <Image
        source={imageSource}
        style={style}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
      {isLoading && !hasError && source?.uri && (
        <View style={[style, styles.loadingOverlay]}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
    </View>
  );
};

const Videos = () => {
  const [categorieSelectionnee, setCategorieSelectionnee] = useState('tous');
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [videoSelectionnee, setVideoSelectionnee] = useState(null);
  const [lectureEnCours, setLectureEnCours] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [typeVideo, setTypeVideo] = useState('youtube');

  // Charger les catégories
  useEffect(() => {
    chargerCategories();
  }, []);

  // Charger les vidéos quand la catégorie ou la recherche change
  useEffect(() => {
    chargerVideos();
  }, [categorieSelectionnee, recherche]);

  const chargerCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/liste-categorie.php`);
      const result = await response.json();
      
      if (result.success) {
        // Vérifier si "Tous" existe déjà dans les données de l'API
        const categorieTousExiste = result.data.some(cat => cat.categorie_id === 'tous');
        
        let toutesCategories;
        
        if (categorieTousExiste) {
          // Si "Tous" existe déjà, utiliser les données de l'API telles quelles
          toutesCategories = result.data;
        } else {
          // Sinon, ajouter "Tous" manuellement
          toutesCategories = [
            { categorie_id: 'tous', nom: 'Tous', icone: 'apps' },
            ...result.data
          ];
        }
        
        setCategories(toutesCategories);
      }
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const chargerVideos = async () => {
    setChargement(true);
    try {
      let url = `${API_BASE_URL}/liste-video.php`;
      const params = new URLSearchParams();
      
      if (categorieSelectionnee !== 'tous') {
        params.append('categorie_id', categorieSelectionnee);
      }
      
      if (recherche) {
        params.append('search', recherche);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setVideos(result.data);
      } else {
        console.error('Erreur API:', result.message);
        setVideos([]);
      }
    } catch (error) {
      console.error('Erreur chargement vidéos:', error);
      setVideos([]);
    } finally {
      setChargement(false);
    }
  };

  const gererClicCategorie = (idCategorie) => {
    setCategorieSelectionnee(idCategorie);
    setRecherche('');
  };

  const gererClicVideo = (video) => {
    setVideoSelectionnee(video);
    const typeDetecte = detecterTypeVideo(video.film); // Utiliser 'film' au lieu de 'idVideo'
    setTypeVideo(typeDetecte);
    setLectureEnCours(true);
  };

  const fermerLecteurVideo = () => {
    setVideoSelectionnee(null);
    setLectureEnCours(false);
    setTypeVideo('youtube');
  };

  const obtenirIdYouTube = (idVideo) => {
    return extraireIdYouTube(idVideo) || idVideo;
  };

  const afficherLecteurVideo = () => {
    if (!videoSelectionnee) return null;

    if (typeVideo === 'youtube') {
      const idYouTube = obtenirIdYouTube(videoSelectionnee.film); // Utiliser 'film' au lieu de 'idVideo'
      return (
        <YoutubePlayer
          height={300}
          play={lectureEnCours}
          videoId={idYouTube}
          onChangeState={(evenement) => {
            if (evenement === 'ended') {
              setLectureEnCours(false);
            }
          }}
        />
      );
    } else if (typeVideo === 'tiktok') {
      return (
        <View style={styles.conteneurWebview}>
          <WebView
            source={{ uri: videoSelectionnee.film }} // Utiliser 'film' au lieu de 'idVideo'
            style={styles.webview}
            allowsFullscreenVideo={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.chargementWebview}>
                <ActivityIndicator size="large" color="#FF0050" />
                <Text style={styles.texteChargementWebview}>Chargement TikTok...</Text>
              </View>
            )}
          />
        </View>
      );
    } else {
      return (
        <View style={styles.conteneurNonSupporte}>
          <Ionicons name="warning" size={64} color="#FF6B6B" />
          <Text style={styles.texteNonSupporte}>
            Type de vidéo non supporté
          </Text>
        </View>
      );
    }
  };

  const afficherElementCategorie = (categorie) => (
    <TouchableOpacity
      key={categorie.categorie_id}
      style={[
        styles.categorie,
        categorieSelectionnee === categorie.categorie_id && styles.categorieActive
      ]}
      onPress={() => gererClicCategorie(categorie.categorie_id)}
    >
      <Ionicons 
        name={categorie.icone} 
        size={16} 
        color={categorieSelectionnee === categorie.categorie_id ? '#fff' : '#666'} 
        style={styles.iconeCategorie}
      />
      <Text style={[
        styles.texteCategorie,
        categorieSelectionnee === categorie.categorie_id && styles.texteCategorieActive
      ]}>
        {categorie.nom}
      </Text>
    </TouchableOpacity>
  );

  const afficherElementVideo = ({ item }) => {
    const typeDetecte = detecterTypeVideo(item.film); // Utiliser 'film' au lieu de 'idVideo'
    
    // Sources d'images avec fallback
    const sourceMiniature = item.miniature ? { uri: item.miniature } : null;
    const sourceAvatar = item.avatar ? { uri: item.avatar } : null;
    
    // Fallback images
    const fallbackMiniature = { uri: `https://picsum.photos/400/225?random=${item.id}` };
    const fallbackAvatar = { uri: `https://picsum.photos/50/50?random=${item.id}` };

    return (
      <TouchableOpacity 
        style={styles.carteVideo}
        onPress={() => gererClicVideo(item)}
      >
        <View style={styles.conteneurMiniature}>
          {sourceMiniature ? (
            <ImageAvecFallback
              source={sourceMiniature}
              fallbackSource={fallbackMiniature}
              style={styles.miniature}
            />
          ) : (
            <View style={[styles.miniature, styles.miniatureVide]}>
              <Ionicons name="videocam-outline" size={50} color="#ccc" />
              <Text style={styles.texteMiniatureVide}>Aucune miniature</Text>
            </View>
          )}
          
          <View style={[
            styles.badgePlateforme,
            typeDetecte === 'tiktok' ? styles.badgeTiktok : styles.badgeYoutube
          ]}>
            <Ionicons 
              name={typeDetecte === 'tiktok' ? 'logo-tiktok' : 'logo-youtube'} 
              size={12} 
              color="#fff" 
            />
            <Text style={styles.textePlateforme}>
              {typeDetecte === 'tiktok' ? 'TikTok' : 'YouTube'}
            </Text>
          </View>
          
          <View style={[
            styles.badgeDuree,
            item.duree === 'LIVE' && styles.badgeLive
          ]}>
            <Text style={styles.texteDuree}>
              {item.duree === 'LIVE' ? '🔴 EN DIRECT' : item.duree}
            </Text>
          </View>
        </View>

        <View style={styles.infoVideo}>
          {sourceAvatar ? (
            <ImageAvecFallback
              source={sourceAvatar}
              fallbackSource={fallbackAvatar}
              style={styles.avatarChaine}
            />
          ) : (
            <View style={[styles.avatarChaine, styles.avatarVide]}>
              <Ionicons name="person-outline" size={20} color="#ccc" />
            </View>
          )}
          <View style={styles.detailsVideo}>
            <Text style={styles.titreVideo} numberOfLines={2}>
              {item.titre}
            </Text>
            <Text style={styles.nomChaine}>{item.chaine}</Text>
            <Text style={styles.statistiquesVideo}>
              {item.vues} • {item.date}
            </Text>
          </View>
          <TouchableOpacity style={styles.boutonMenu}>
            <Ionicons name="ellipsis-vertical" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Source d'avatar pour le modal
  const sourceAvatarModal = videoSelectionnee?.avatar ? { uri: videoSelectionnee.avatar } : null;
  const fallbackAvatarModal = videoSelectionnee ? { 
    uri: `https://picsum.photos/50/50?random=${videoSelectionnee.id}`
  } : null;

  return (
    <SafeAreaView style={styles.conteneur}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.conteneurRecherche}>
        <View style={styles.conteneurInputRecherche}>
          <Ionicons name="search" size={20} color="#666" style={styles.iconeRecherche} />
          <TextInput
            style={styles.inputRecherche}
            placeholder="Rechercher des vidéos..."
            placeholderTextColor="#999"
            value={recherche}
            onChangeText={setRecherche}
          />
          {recherche.length > 0 && (
            <TouchableOpacity onPress={() => setRecherche('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.conteneurCategories}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contenuScrollCategories}
        >
          {categories.map(afficherElementCategorie)}
        </ScrollView>
      </View>

      {chargement ? (
        <View style={styles.conteneurChargement}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.texteChargement}>Chargement des vidéos...</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={afficherElementVideo}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listeVideos}
          ListEmptyComponent={
            <View style={styles.conteneurVide}>
              <Ionicons name="videocam-off" size={64} color="#ccc" />
              <Text style={styles.texteVide}>Aucune vidéo trouvée</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={!!videoSelectionnee}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={fermerLecteurVideo}
      >
        <SafeAreaView style={styles.conteneurLecteurVideo}>
          <View style={styles.enTeteLecteurVideo}>
            <TouchableOpacity 
              style={styles.boutonFermer}
              onPress={fermerLecteurVideo}
            >
              <Ionicons name="chevron-down" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.titreLecteurVideo}>
              {typeVideo === 'youtube' ? 'YouTube' : 'TikTok'}
            </Text>
          </View>
          
          {videoSelectionnee && (
            <View style={styles.contenuLecteurVideo}>
              {afficherLecteurVideo()}
              
              <ScrollView style={styles.infoVideoModal}>
                <Text style={styles.titreVideoModal}>{videoSelectionnee.titre}</Text>
                <View style={styles.statistiquesVideoModal}>
                  <Text style={styles.texteStatistiquesVideo}>
                    {videoSelectionnee.vues} • {videoSelectionnee.date}
                  </Text>
                </View>
                
                <View style={styles.infoChaineModal}>
                  {sourceAvatarModal ? (
                    <ImageAvecFallback
                      source={sourceAvatarModal}
                      fallbackSource={fallbackAvatarModal}
                      style={styles.avatarChaineModal}
                    />
                  ) : (
                    <View style={[styles.avatarChaineModal, styles.avatarVide]}>
                      <Ionicons name="person-outline" size={24} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.detailsChaine}>
                    <Text style={styles.nomChaineModal}>{videoSelectionnee.chaine}</Text>
                    <Text style={styles.texteAbonnes}>
                      {typeVideo === 'tiktok' ? '2.4M followers' : '1.2M abonnés'}
                    </Text>
                  </View>
                  <TouchableOpacity style={[
                    styles.boutonAbonnement,
                    typeVideo === 'tiktok' && styles.boutonAbonnementTiktok
                  ]}>
                    <Text style={styles.texteBoutonAbonnement}>
                      {typeVideo === 'tiktok' ? 'Suivre' : 'S\'abonner'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  conteneurRecherche: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  conteneurInputRecherche: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 45,
  },
  iconeRecherche: {
    marginRight: 8,
  },
  inputRecherche: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  conteneurCategories: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  contenuScrollCategories: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categorie: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  categorieActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  iconeCategorie: {
    marginRight: 6,
  },
  texteCategorie: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  texteCategorieActive: {
    color: '#fff',
  },
  listeVideos: {
    paddingBottom: 20,
  },
  carteVideo: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  conteneurMiniature: {
    position: 'relative',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  miniature: {
    width: width - 24,
    height: (width - 24) * 0.5625,
  },
  miniatureVide: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  texteMiniatureVide: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  badgePlateforme: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeYoutube: {
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
  },
  badgeTiktok: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  textePlateforme: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  badgeDuree: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeLive: {
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
  },
  texteDuree: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  infoVideo: {
    flexDirection: 'row',
    padding: 12,
  },
  avatarChaine: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarVide: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  detailsVideo: {
    flex: 1,
    marginRight: 8,
  },
  titreVideo: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
    color: '#0f0f0f',
  },
  nomChaine: {
    fontSize: 14,
    color: '#606060',
    marginBottom: 2,
  },
  statistiquesVideo: {
    fontSize: 14,
    color: '#606060',
  },
  boutonMenu: {
    padding: 4,
  },
  conteneurChargement: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  texteChargement: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  conteneurVide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  texteVide: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  conteneurLecteurVideo: {
    flex: 1,
    backgroundColor: '#fff',
  },
  enTeteLecteurVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  boutonFermer: {
    padding: 4,
  },
  titreLecteurVideo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 24,
  },
  contenuLecteurVideo: {
    flex: 1,
  },
  conteneurWebview: {
    height: 400,
  },
  webview: {
    flex: 1,
  },
  chargementWebview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  texteChargementWebview: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  conteneurNonSupporte: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  texteNonSupporte: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  infoVideoModal: {
    flex: 1,
    padding: 16,
  },
  titreVideoModal: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  statistiquesVideoModal: {
    marginBottom: 16,
  },
  texteStatistiquesVideo: {
    fontSize: 14,
    color: '#606060',
  },
  infoChaineModal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
  },
  avatarChaineModal: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  detailsChaine: {
    flex: 1,
  },
  nomChaineModal: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  texteAbonnes: {
    fontSize: 14,
    color: '#606060',
  },
  boutonAbonnement: {
    backgroundColor: '#cc0000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  boutonAbonnementTiktok: {
    backgroundColor: '#000',
  },
  texteBoutonAbonnement: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Videos;