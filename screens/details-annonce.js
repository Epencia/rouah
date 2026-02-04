// AnnonceDetails.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Dimensions,
  FlatList,
  PanResponder,
  Animated,
} from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper';

// Image locale pour les placeholders
const LOCAL_IMAGE_PLACEHOLDER = require('../assets/logo.png');

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;
const MEDIA_HEIGHT = 250;
const THUMBNAIL_SIZE = 60;

// ---------------- SkeletonCard (remplacement) ----------------
function SkeletonCard() {
  return (
    <View style={{ backgroundColor: '#fff', marginVertical: 8, marginHorizontal: 10, borderRadius: 8, overflow: 'hidden', elevation: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <View style={{ width: '50%', height: 10, backgroundColor: '#e0e0e0', marginBottom: 5 }} />
          <View style={{ width: '30%', height: 10, backgroundColor: '#e0e0e0' }} />
        </View>
      </View>
      <View style={{ padding: 10 }}>
        <View style={{ width: '80%', height: 15, backgroundColor: '#e0e0e0', marginBottom: 10 }} />
        <View style={{ width: '100%', height: MEDIA_HEIGHT, backgroundColor: '#ddd', borderRadius: 8 }} />
      </View>
    </View>
  );
}

// Composant personnalisé pour le zoom d'image
const ZoomableImage = ({ source, style, onClose }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Reset position when starting new gesture
        translateX.setOffset(lastTranslate.current.x);
        translateY.setOffset(lastTranslate.current.y);
        translateX.setValue(0);
        translateY.setValue(0);
      },
      onPanResponderMove: Animated.event(
        [
          null,
          {
            dx: translateX,
            dy: translateY,
          },
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        translateX.flattenOffset();
        translateY.flattenOffset();
        lastTranslate.current = {
          x: translateX._value,
          y: translateY._value,
        };
      },
    })
  ).current;

  const handleDoubleTap = () => {
    const newScale = lastScale.current === 1 ? 2 : 1;
    
    Animated.spring(scale, {
      toValue: newScale,
      useNativeDriver: false,
    }).start();

    lastScale.current = newScale;

    // Reset position when zooming out
    if (newScale === 1) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
      lastTranslate.current = { x: 0, y: 0 };
    }
  };

  return (
    <View style={style}>
      <Animated.Image
        source={source}
        style={[
          styles.zoomableImage,
          {
            transform: [
              { scale },
              { translateX },
              { translateY },
            ],
          },
        ]}
        resizeMode="contain"
        {...panResponder.panHandlers}
        onError={(e) => console.error('Erreur chargement image zoom:', e.nativeEvent.error)}
      />
      
      {/* Bouton de fermeture */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <MaterialIcons name="close" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const AnnonceDetails = ({ navigation, route }) => {
  const [annonce, setAnnonce] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matricule, setMatricule] = useState(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef(null);

  const { code } = route.params;

  const handleJaiLu = async () => {
    if (!matricule || !annonce.code) return;

    try {
      const res = await fetch(`https://rouah.net/api/annonces-lu.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: annonce.code,
          matricule: matricule,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setAnnonce((prev) => ({
          ...prev,
          vues: data.vues,
          etat: data.etat,
          reception_json: data.propriete_json,
        }));
        Alert.alert('Message', '✅ Vous avez lu cette annonce');
      } else {
        Alert.alert('Erreur', data.message || 'Impossible de marquer comme lu');
      }
    } catch (err) {
      console.error('Erreur handleJaiLu:', err);
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const storedMatricule = await AsyncStorage.getItem('matricule');
        if (isMounted) setMatricule(storedMatricule);

        const response = await fetch(`https://rouah.net/api/details-annonce.php?code=${code}`);
        const data = await response.json();

        if (!isMounted) return;

        if (!data || data.length === 0) {
          Alert.alert('Erreur', 'Aucune donnée disponible pour cette annonce.');
          setLoading(false);
          return;
        }

        const a = data[0];

        if (!a.albums) a.albums = [];
        else {
          // Filtrer uniquement les images (pas de vidéos)
          a.albums = a.albums
            .map((alb, idx) => {
              if (typeof alb === 'string') {
                const match = alb.match(/^data:([^;]+);base64,/);
                const type = match ? match[1] : 'image/*';
                // Vérifier si c'est une image, pas une vidéo
                if (type && type.startsWith('image')) {
                  return {
                    uri: typeof alb === 'string' ? alb : null,
                    type,
                    thumbnail: typeof alb === 'string' ? alb : LOCAL_IMAGE_PLACEHOLDER,
                  };
                }
                return null; // Ignorer les vidéos
              }
              const uri = alb.uri || alb.image || alb;
              const type = alb.type || (uri && typeof uri === 'string' && uri.startsWith('data:image') ? 'image/*' : 'image/*');
              // Vérifier si c'est une image
              if (type && type.startsWith('image')) {
                return {
                  uri: typeof uri === 'string' ? uri : null,
                  type,
                  thumbnail: typeof uri === 'string' ? uri : LOCAL_IMAGE_PLACEHOLDER,
                };
              }
              return null; // Ignorer les vidéos
            })
            .filter((alb) => alb !== null && alb.uri !== null); // Filtrer les null
        }

        if (a.photo64_annonce && typeof a.photo64_annonce === 'string') {
          // Vérifier si c'est une image, pas une vidéo
          if (a.type_annonce && a.type_annonce.startsWith('image')) {
            const mainUri = `data:${a.type_annonce};base64,${a.photo64_annonce}`;
            a.primaryMedia = { 
              uri: mainUri, 
              type: a.type_annonce || 'image/*', 
              thumbnail: mainUri 
            };
          } else {
            a.primaryMedia = null;
          }
        } else {
          a.primaryMedia = null;
        }

        setAnnonce(a);
      } catch (err) {
        console.error('Erreur fetchInitialData:', err);
        Alert.alert('Erreur', 'Impossible de charger les détails de l\'annonce.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [code]);

  useEffect(() => {
    navigation.setOptions({ title: 'Détails de l\'annonce' });
  }, [navigation]);

  const handleCall = () => annonce?.telephone && Linking.openURL(`tel:${annonce.telephone}`);
  const handleSMS = () => annonce?.telephone && Linking.openURL(`sms:${annonce.telephone}`);
  const handleWhatsApp = () => annonce?.telephone && Linking.openURL(`https://wa.me/${annonce.telephone}`);

  const openMediaModal = (index) => {
    setSelectedMediaIndex(index);
    setMediaModalVisible(true);
  };

  const closeMediaModal = () => {
    setMediaModalVisible(false);
    setSelectedMediaIndex(0);
  };

  const goToMedia = (index) => {
    if (swiperRef.current) {
      swiperRef.current.scrollTo(index, true);
      setActiveIndex(index);
    }
  };

  if (loading) {
    return <SkeletonCard />;
  }

  if (!annonce) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Aucune donnée disponible pour cette annonce</Text>
      </View>
    );
  }

  // Construire le tableau des médias (uniquement des images)
  const medias = [];
  if (annonce.primaryMedia && typeof annonce.primaryMedia.uri === 'string') {
    medias.push(annonce.primaryMedia);
  }
  if (Array.isArray(annonce.albums) && annonce.albums.length) {
    annonce.albums.forEach((alb) => {
      if (typeof alb.uri === 'string' && alb.type && alb.type.startsWith('image')) {
        medias.push({
          uri: alb.uri,
          type: 'image/*',
          thumbnail: alb.thumbnail || alb.uri,
        });
      }
    });
  }

  const renderThumbnail = ({ item, index }) => {
    const thumbnailSource = item.thumbnail
      ? (typeof item.thumbnail === 'string' ? { uri: item.thumbnail } : item.thumbnail)
      : LOCAL_IMAGE_PLACEHOLDER;
    return (
      <TouchableOpacity
        style={[styles.thumbnail, activeIndex === index && styles.activeThumbnail]}
        onPress={() => goToMedia(index)}
      >
        <Image
          source={thumbnailSource}
          style={styles.thumbnailImage}
          resizeMode="cover"
          onError={(e) => console.error('Erreur chargement miniature:', e.nativeEvent.error)}
        />
      </TouchableOpacity>
    );
  };

  const selectedMedia = medias[selectedMediaIndex];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* MEDIA SWIPER */}
        {medias.length > 0 && (
          <View style={styles.swiperWrap}>
            <Swiper
              style={{}}
              height={MEDIA_HEIGHT}
              loop={false}
              autoplay={false}
              showsPagination
              showsButtons
              nextButton={<View style={styles.navButton}><MaterialIcons name="chevron-right" size={30} color="#fff" /></View>}
              prevButton={<View style={styles.navButton}><MaterialIcons name="chevron-left" size={30} color="#fff" /></View>}
              onIndexChanged={(idx) => setActiveIndex(idx)}
              ref={swiperRef}
              dotStyle={styles.dot}
              activeDotStyle={styles.activeDot}
            >
              {medias.map((m, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  activeOpacity={0.95} 
                  onPress={() => openMediaModal(idx)}
                >
                  <Image
                    source={typeof m.uri === 'string' ? { uri: m.uri } : LOCAL_IMAGE_PLACEHOLDER}
                    style={styles.media}
                    resizeMode="cover"
                    onError={(e) => console.error('Erreur chargement image:', e.nativeEvent.error, 'URI:', m.uri)}
                  />
                </TouchableOpacity>
              ))}
            </Swiper>
            {/* Barre de miniatures */}
            {medias.length > 1 && (
              <FlatList
                data={medias}
                renderItem={renderThumbnail}
                keyExtractor={(item, index) => `thumb-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailContainer}
                contentContainerStyle={styles.thumbnailContent}
              />
            )}
          </View>
        )}

        <View style={styles.publisherContainer}>
          {annonce.photo64 && typeof annonce.photo64 === 'string' && (
            <TouchableOpacity onPress={() => openMediaModal(0)}>
              <Image
                source={{ uri: `data:${annonce.type};base64,${annonce.photo64}` }}
                style={styles.publisherImage}
                resizeMode="cover"
                onError={(e) => console.error('Erreur chargement image éditeur:', e.nativeEvent.error)}
              />
            </TouchableOpacity>
          )}
          <View style={styles.publisherInfo}>
            <Text style={styles.publisherName}>{annonce.nom_prenom}</Text>
            {annonce.vues !== annonce.audience && (
              <Text style={styles.publisherRating}>
                <MaterialCommunityIcons name="star" size={16} color="#f39c12" /> {annonce.categorie || 'Sponsorisé'}
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.title}>{annonce.titre}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.quantity}>Vues : {annonce.vues}</Text>
          <Text style={styles.quantity}>Audience : {annonce.quantite}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{annonce.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <Text>Publiée le : {annonce.date} à {annonce.heure}</Text>
        </View>

        {matricule !== annonce.matricule && annonce.telephone ? (
          <View style={styles.contactContainer}>
            <Text style={styles.contactTitle}>Contacter l'annonceur</Text>
            <View style={styles.contactButtons}>
              <TouchableOpacity style={[styles.contactButton, styles.callButton]} onPress={handleCall}>
                <MaterialIcons name="call" size={20} color="#fff" />
                <Text style={styles.buttonText}>Appel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactButton, styles.smsButton]} onPress={handleSMS}>
                <MaterialIcons name="sms" size={20} color="#fff" />
                <Text style={styles.buttonText}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactButton, styles.whatsappButton]} onPress={handleWhatsApp}>
                <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" />
                <Text style={styles.buttonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ paddingVertical: 20 }}>
            <Text style={styles.contactTitle2}>Vous êtes le propriétaire de cette annonce</Text>
          </View>
        )}

        {matricule && matricule !== annonce.matricule && annonce.etat === 'Actif' && (
          <TouchableOpacity style={styles.jaiLuButton} onPress={handleJaiLu}>
            <Text style={styles.jaiLuButtonText}>J'ai lu</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Fullscreen modal - Version simplifiée */}
      <Modal
        isVisible={mediaModalVisible}
        onBackdropPress={closeMediaModal}
        onBackButtonPress={closeMediaModal}
        style={{ margin: 0 }}
        useNativeDriver
        hideModalContentWhileAnimating
      >
        <View style={styles.modalContainer}>
          {selectedMedia && selectedMedia.uri ? (
            <>
              {/* Indicateur */}
              {medias.length > 1 && (
                <View style={styles.indicatorContainer}>
                  <Text style={styles.indicatorText}>
                    {selectedMediaIndex + 1} / {medias.length}
                  </Text>
                </View>
              )}
              
              {/* Image avec zoom */}
              <ZoomableImage
                source={{ uri: selectedMedia.uri }}
                style={styles.zoomContainer}
                onClose={closeMediaModal}
              />
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>Aucune image à afficher</Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeMediaModal}>
                <MaterialIcons name="close" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  swiperWrap: { marginBottom: 12 },
  media: { width: '100%', height: MEDIA_HEIGHT, borderRadius: 8, backgroundColor: '#000' },
  publisherContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 8 },
  publisherImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  publisherInfo: { flex: 1 },
  publisherName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  publisherRating: { fontSize: 14, color: '#f39c12', flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 23, fontWeight: 'bold', marginBottom: 8 },
  priceContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  quantity: { fontSize: 16, color: '#7f8c8d' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#2c3e50' },
  description: { fontSize: 16, lineHeight: 24, color: '#34495e' },
  contactContainer: { marginTop: 20, marginBottom: 40 },
  contactTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#2c3e50' },
  contactTitle2: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#2c3e50', textAlign: 'center' },
  contactButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  contactButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8, marginHorizontal: 5 },
  callButton: { backgroundColor: '#2ecc71' },
  smsButton: { backgroundColor: '#3498db' },
  whatsappButton: { backgroundColor: '#25D366' },
  buttonText: { color: '#fff', marginLeft: 8, fontWeight: 'bold' },
  modalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.95)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  zoomContainer: {
    width: windowWidth,
    height: windowHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomableImage: {
    width: windowWidth,
    height: windowHeight * 0.8,
  },
  fullScreenMedia: { 
    width: windowWidth, 
    height: windowHeight * 0.8 
  },
  closeButton: { 
    position: 'absolute', 
    top: 40, 
    right: 20, 
    zIndex: 10, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    borderRadius: 20, 
    padding: 5 
  },
  indicatorContainer: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 16,
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#fff',
    fontSize: 18,
  },
  jaiLuButton: {
    backgroundColor: '#fa4447',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    marginHorizontal: 16,
  },
  jaiLuButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    marginTop: 8,
  },
  thumbnailContent: {
    paddingHorizontal: 5,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    marginHorizontal: 5,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  activeThumbnail: {
    borderColor: '#3498db',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#3498db',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 3,
  },
});

export default AnnonceDetails;