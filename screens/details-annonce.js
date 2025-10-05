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
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper';
import { Video } from 'expo-av';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;
const MEDIA_HEIGHT = 250;

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


const AnnonceDetails = ({ navigation, route }) => {
  const [annonce, setAnnonce] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matricule, setMatricule] = useState(null);

  // modal for fullscreen media
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedIsVideo, setSelectedIsVideo] = useState(false);

  // Swiper active index
  const [activeIndex, setActiveIndex] = useState(0);

  // video refs (one per media that is video)
  const videoRefs = useRef([]);

  const { code } = route.params;

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

        // API returns an array with single object
        const a = data[0];

        // Normalize: ensure albums is array of {uri, type}
        if (!a.albums) a.albums = [];
        else {
          a.albums = a.albums.map((alb) => {
            // alb may be {uri: 'data:...'} or {uri:..., type:...}
            if (typeof alb === 'string') {
              // try to guess type from data URI
              const match = alb.match(/^data:([^;]+);base64,/);
              const type = match ? match[1] : 'image/*';
              return { uri: alb, type };
            }
            // if it already has uri/type:
            return { uri: alb.uri || alb.image || alb, type: alb.type || 'image/*' };
          });
        }

        // Primary annonce photo: server gave photo64_annonce + type_annonce
        if (a.photo64_annonce) {
          const mainUri = `data:${a.type_annonce};base64,${a.photo64_annonce}`;
          // put it first
          a.primaryMedia = { uri: mainUri, type: a.type_annonce || 'image/*' };
        } else {
          a.primaryMedia = null;
        }

        setAnnonce(a);
      } catch (err) {
        console.error(err);
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

  // Pause/play videos based on activeIndex
  useEffect(() => {
    // iterate over refs, play the one at activeIndex (if video), pause others
    videoRefs.current.forEach((r, idx) => {
      if (!r) return;
      // r is an object ref from Video component
      try {
        if (idx === activeIndex) {
          // play if available
          r.getStatusAsync && r.getStatusAsync().then(status => {
            // only start if not already playing
            if (!status.isPlaying) {
              r.playAsync && r.playAsync().catch(() => {});
            }
          }).catch(()=>{});
        } else {
          r.pauseAsync && r.pauseAsync().catch(()=>{});
        }
      } catch (e) {
        // ignore
      }
    });
  }, [activeIndex]);

  // safety: on unmount pause all
  useEffect(() => {
    return () => {
      videoRefs.current.forEach((r) => {
        try { r && r.pauseAsync && r.pauseAsync(); } catch (e) {}
      });
    };
  }, []);

  const handleCall = () => annonce?.telephone && Linking.openURL(`tel:${annonce.telephone}`);
  const handleSMS = () => annonce?.telephone && Linking.openURL(`sms:${annonce.telephone}`);
  const handleWhatsApp = () => annonce?.telephone && Linking.openURL(`https://wa.me/${annonce.telephone}`);

  const openMediaModal = (uri, isVideo) => {
    setSelectedMedia(uri);
    setSelectedIsVideo(Boolean(isVideo));
    setMediaModalVisible(true);
  };

  const closeMediaModal = () => {
    setMediaModalVisible(false);
    setSelectedMedia(null);
    setSelectedIsVideo(false);
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

  // Build medias array: primaryMedia first, then albums
  const medias = [];
  if (annonce.primaryMedia) medias.push(annonce.primaryMedia);
  if (Array.isArray(annonce.albums) && annonce.albums.length) {
    annonce.albums.forEach((alb) => {
      // alb = {uri, type}
      medias.push({ uri: alb.uri, type: alb.type || (alb.uri && alb.uri.startsWith('data:video') ? 'video/*' : 'image/*') });
    });
  }

  // prepare videoRefs array length = medias.length (only for video entries we will store ref, but index must match swiper index)
  videoRefs.current = new Array(medias.length);

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
              onIndexChanged={(idx) => setActiveIndex(idx)}
            >
              {medias.map((m, idx) => {
                const isVideo = typeof m.type === 'string' && m.type.startsWith('video');
                if (isVideo) {
                  // Video slide
                  return (
                    <TouchableOpacity key={idx} activeOpacity={0.95} onPress={() => openMediaModal(m.uri, true)}>
                      <Video
                        ref={(ref) => { videoRefs.current[idx] = ref; }}
                        source={{ uri: m.uri }}
                        style={styles.media}
                        useNativeControls
                        resizeMode="cover"
                        isLooping
                        // don't auto-play here; playback controlled by activeIndex effect
                        shouldPlay={false}
                      />
                    </TouchableOpacity>
                  );
                } else {
                  // Image slide
                  return (
                    <TouchableOpacity key={idx} activeOpacity={0.95} onPress={() => openMediaModal(m.uri, false)}>
                      <Image source={{ uri: m.uri }} style={styles.media} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                }
              })}
            </Swiper>
          </View>
        )}

        {/* PUBLISHER */}
        <View style={styles.publisherContainer}>
          {annonce.photo64 && (
            <TouchableOpacity onPress={() => openMediaModal(`data:${annonce.type};base64,${annonce.photo64}`, false)}>
              <Image source={{ uri: `data:${annonce.type};base64,${annonce.photo64}` }} style={styles.publisherImage} resizeMode="cover" />
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

        {/* CONTENT */}
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
      </ScrollView>

      {/* Fullscreen modal */}
      <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={closeMediaModal}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={closeMediaModal}>
            <MaterialIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          {selectedMedia && !selectedIsVideo && (
            <Image source={{ uri: selectedMedia }} style={styles.fullScreenMedia} resizeMode="contain" />
          )}

          {selectedMedia && selectedIsVideo && (
            <Video
              source={{ uri: selectedMedia }}
              style={styles.fullScreenMedia}
              useNativeControls
              resizeMode="contain"
              isLooping
              shouldPlay
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // skeleton
  skeletonContainer: { flex: 1, padding: 16, backgroundColor: '#fff' },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  skeletonAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0e0e0', marginRight: 12 },
  skeletonLineShort: { width: '50%', height: 10, backgroundColor: '#e8e8e8', marginBottom: 6 },
  skeletonLineTiny: { width: '30%', height: 10, backgroundColor: '#e8e8e8' },
  skeletonMedia: { width: '100%', height: MEDIA_HEIGHT, backgroundColor: '#ddd', borderRadius: 8, marginBottom: 12 },
  skeletonBody: { paddingVertical: 8 },
  skeletonLineLong: { width: '80%', height: 12, backgroundColor: '#e8e8e8', marginBottom: 8 },
  skeletonLineMedium: { width: '60%', height: 12, backgroundColor: '#e8e8e8' },

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

  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullScreenMedia: { width: windowWidth, height: windowHeight * 0.8 },
  closeButton: { position: 'absolute', top: 40, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 },
});

export default AnnonceDetails;
