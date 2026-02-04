import React, { useEffect, useState, useRef, useContext } from 'react';
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
  FlatList,
  PanResponder,
  Animated,TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper';
import { Video } from 'expo-av';
import { GlobalContext } from '../global/GlobalState'; // Chemin à vérifier

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;
const MEDIA_HEIGHT = 250;
const THUMBNAIL_SIZE = 60;

// SkeletonCard component
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
  const lastTap = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: (evt) => {
        // Gestion du double tap
        const now = Date.now();
        if (lastTap.current && now - lastTap.current < 300) {
          handleDoubleTap();
        }
        lastTap.current = now;

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

      onPanResponderTerminate: () => {
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
    
    Animated.parallel([
      Animated.spring(scale, {
        toValue: newScale,
        friction: 3,
        useNativeDriver: false,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        friction: 3,
        useNativeDriver: false,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 3,
        useNativeDriver: false,
      })
    ]).start();

    lastScale.current = newScale;
    lastTranslate.current = { x: 0, y: 0 };
  };

  const handleReset = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: false,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        friction: 3,
        useNativeDriver: false,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 3,
        useNativeDriver: false,
      })
    ]).start();

    lastScale.current = 1;
    lastTranslate.current = { x: 0, y: 0 };
  };

  return (
    <View style={style}>
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={handleDoubleTap}>
          <MaterialIcons name="zoom-in" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={handleReset}>
          <MaterialIcons name="zoom-out" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

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

const ArticleDetails = ({ navigation, route }) => {
  const [annonce, setAnnonce] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matricule, setMatricule] = useState(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef([]);
  const swiperRef = useRef(null);

  // Modal Commande
  const [commandeModalVisible, setCommandeModalVisible] = useState(false);
  const [quantite, setQuantite] = useState('1');
  const [montantCommande, setMontantCommande] = useState('');
  const [login, setLogin] = useState('');
  const [mdp, setMdp] = useState('');

  const { code } = route.params;
  const [user] = useContext(GlobalContext);

   // Formatage des montants
  const formatAmount = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
  };

   // Valider commande
   const sendNotificationToUser = async (utilisateur_id, titre, description) => {
 
   try {
     const formData = new FormData();
 
     // Remplacer par l'utilisateur cible
 formData.append('utilisateur_id', utilisateur_id);
 formData.append('titre', titre);
 formData.append('description', description);
 
 
     const response = await fetch("https://rouah.net/api/validation-commande.php", {
       method: "POST",
       headers: {
         'Accept': 'application/json',
       },
       body: formData,
     });
 
     const result = await response.json();
 
     if (result.status === "success") {
       Alert.alert("Message","✅ Notification envoyée avec succès !");
     } else {
       Alert.alert("❌","Erreur: " + result.message);
     }
 
   } catch (error) {
     Alert.alert("❌","Erreur côté client");
   }
 }

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const storedMatricule = await AsyncStorage.getItem('matricule');
        if (isMounted) setMatricule(storedMatricule);

        const response = await fetch(`https://rouah.net/api/details-article.php?code=${code}`);
        const data = await response.json();

        if (!isMounted) return;

        if (!data || data.length === 0) {
          Alert.alert('Erreur', 'Aucune donnée disponible pour cet article.');
          setLoading(false);
          return;
        }

        // API returns an array with single object
        const a = data[0];

        // Normalize: ensure albums is array of {uri, type}
        if (!a.albums) a.albums = [];
        else {
          a.albums = a.albums.map((alb) => {
            if (typeof alb === 'string') {
              const match = alb.match(/^data:([^;]+);base64,/);
              const type = match ? match[1] : 'image/*';
              return { 
                uri: alb, 
                type,
                thumbnail: type.startsWith('video') ? null : alb
              };
            }
            return { 
              uri: alb.uri || alb.image || alb, 
              type: alb.type || 'image/*',
              thumbnail: (alb.type && alb.type.startsWith('video')) ? null : (alb.uri || alb.image || alb)
            };
          });
        }

        // Primary article photo: server gave photo64_article + type_article
        if (a.photo64_article) {
          const mainUri = `data:${a.type_article};base64,${a.photo64_article}`;
          a.primaryMedia = { 
            uri: mainUri, 
            type: a.type_article || 'image/*',
            thumbnail: mainUri
          };
        } else {
          a.primaryMedia = null;
        }

        setAnnonce(a);
      } catch (err) {
        console.error(err);
        Alert.alert('Erreur', 'Impossible de charger les détails de l\'article.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [code]);

    // === MONTANT AUTO ===
  useEffect(() => {
    if (annonce && quantite) {
      const prix = parseFloat(annonce.prix) || 0;
      const qty = parseFloat(quantite) || 0;
      setMontantCommande((prix * qty).toString());
    }
  }, [quantite, annonce]);

  // === OUVRIR COMMANDE ===
  const openCommandeModal = () => {
    setQuantite('1');
    setMontantCommande(annonce.prix || '0');
    setLogin('');
    setMdp('');
    setCommandeModalVisible(true);
  };

  // === VALIDER COMMANDE ===
  const handleCommander = async () => {
    if (!quantite || parseInt(quantite) <= 0) return Alert.alert('Erreur', 'Quantité invalide');
    if (!user?.matricule && (!login || !mdp)) return Alert.alert('Erreur', 'Connexion requise');

    const commande = {
      numero_commande: `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      article_id: annonce.article_id,
      boutique_id: annonce.utilisateur_id,
      utilisateur_id: user?.matricule || null,
      prix_vente: annonce.prix,
      quantite_commande: quantite,
      montant_commande: montantCommande,
      date_commande: new Date().toISOString().split('T')[0],
      heure_commande: new Date().toTimeString().slice(0, 5),
      delai_validation: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      etat_commande: 'En attente',
      login: !user?.matricule ? login : null,
      mdp: !user?.matricule ? mdp : null,
    };

    try {
      const response = await fetch('https://rouah.net/api/commande-add.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commande),
      });
      const result = await response.json();

      if (result.success) {
        Alert.alert('Succès', 'Commande envoyée !');
        sendNotificationToUser(annonce.utilisateur_id, "Nouvelle commande", `Article: ${annonce.titre}`);
        setCommandeModalVisible(false);
      } else {
        Alert.alert('Erreur', result.message || 'Échec');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Connexion perdue');
    }
  };

  useEffect(() => {
    navigation.setOptions({ title: 'Détails de l\'article' });
  }, [navigation]);

  // Pause/play videos based on activeIndex
  useEffect(() => {
    videoRefs.current.forEach((r, idx) => {
      if (!r) return;
      try {
        if (idx === activeIndex) {
          r.getStatusAsync && r.getStatusAsync().then(status => {
            if (!status.isPlaying) {
              r.playAsync && r.playAsync().catch(() => {});
            }
          }).catch(()=>{});
        } else {
          r.pauseAsync && r.pauseAsync().catch(()=>{});
        }
      } catch (e) {}
    });
  }, [activeIndex]);

  // Pause all videos on unmount
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

  // Vérifier si le média sélectionné est une vidéo
  const isSelectedMediaVideo = () => {
    const selectedMedia = medias[selectedMediaIndex];
    return selectedMedia && typeof selectedMedia.type === 'string' && selectedMedia.type.startsWith('video');
  };

  // Obtenir les images seulement (pour l'indicateur)
  const getImagesOnly = () => {
    return medias.filter(media => 
      media && typeof media.type === 'string' && !media.type.startsWith('video')
    );
  };

  // Obtenir l'index de l'image actuelle parmi les images seulement
  const getCurrentImageIndex = () => {
    const imagesOnly = getImagesOnly();
    const currentMedia = medias[selectedMediaIndex];
    
    if (!currentMedia || imagesOnly.length === 0) return 0;
    
    const foundIndex = imagesOnly.findIndex(img => img.uri === currentMedia.uri);
    return foundIndex >= 0 ? foundIndex : 0;
  };

  if (loading) {
    return <SkeletonCard />;
  }

  if (!annonce) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Aucune donnée disponible pour cet article</Text>
      </View>
    );
  }

  // Build medias array: primaryMedia first, then albums
  const medias = [];
  if (annonce.primaryMedia) medias.push(annonce.primaryMedia);
  if (Array.isArray(annonce.albums) && annonce.albums.length) {
    annonce.albums.forEach((alb) => {
      medias.push({ 
        uri: alb.uri, 
        type: alb.type || (alb.uri && alb.uri.startsWith('data:video') ? 'video/*' : 'image/*'),
        thumbnail: alb.thumbnail || alb.uri
      });
    });
  }

  videoRefs.current = new Array(medias.length);

  // Rendu d'une miniature
  const renderThumbnail = ({ item, index }) => {
    const isVideo = typeof item.type === 'string' && item.type.startsWith('video');
    const thumbnailSource = item.thumbnail ? { uri: item.thumbnail } : null;
    
    return (
      <TouchableOpacity
        style={[styles.thumbnail, activeIndex === index && styles.activeThumbnail]}
        onPress={() => goToMedia(index)}
      >
        {thumbnailSource ? (
          <Image
            source={thumbnailSource}
            style={styles.thumbnailImage}
            resizeMode="cover"
            onError={(e) => console.error('Erreur chargement miniature:', e.nativeEvent.error)}
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <MaterialIcons name="play-circle-outline" size={24} color="#666" />
          </View>
        )}
        {isVideo && (
          <View style={styles.videoIndicator}>
            <MaterialIcons name="play-circle-outline" size={16} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const isVideo = isSelectedMediaVideo();
  const imagesOnly = getImagesOnly();
  const currentImageIndex = getCurrentImageIndex();
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
              autoplay={true}
              autoplayTimeout={4}
              showsPagination
              showsButtons
              nextButton={<View style={styles.navButton}><MaterialIcons name="chevron-right" size={30} color="#fff" /></View>}
              prevButton={<View style={styles.navButton}><MaterialIcons name="chevron-left" size={30} color="#fff" /></View>}
              onIndexChanged={(idx) => setActiveIndex(idx)}
              ref={swiperRef}
              dotStyle={styles.dot}
              activeDotStyle={styles.activeDot}
            >
              {medias.map((m, idx) => {
                const isVideo = typeof m.type === 'string' && m.type?.startsWith('video');
                if (isVideo) {
                  return (
                    <TouchableOpacity key={idx} activeOpacity={0.95} onPress={() => openMediaModal(idx)}>
                      <Video
                        ref={(ref) => { videoRefs.current[idx] = ref; }}
                        source={{ uri: m?.uri }}
                        style={styles.media}
                        useNativeControls
                        resizeMode="cover"
                        isLooping
                        shouldPlay={false}
                      />
                    </TouchableOpacity>
                  );
                } else {
                  return (
                    <TouchableOpacity key={idx} activeOpacity={0.95} onPress={() => openMediaModal(idx)}>
                      <Image source={{ uri: m.uri }} style={styles.media} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                }
              })}
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

        {/* PUBLISHER */}
        <View style={styles.publisherContainer}>
          {annonce.photo64 && (
            <TouchableOpacity onPress={() => openMediaModal(0)}>
              <Image source={{ uri: `data:${annonce.type};base64,${annonce.photo64}` }} style={styles.publisherImage} resizeMode="cover" />
            </TouchableOpacity>
          )}
          <View style={styles.publisherInfo}>
            <Text style={styles.publisherName}>{annonce.nom_prenom}</Text>
            <Text style={styles.publisherRating}>
              <MaterialCommunityIcons name="star" size={16} color="#f39c12" /> {annonce.type || 'Utilisateur'}
            </Text>
          </View>
        </View>

        {/* CONTENT */}
        <Text style={styles.title}>{annonce.titre}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.quantity}>Prix : {formatAmount(annonce.prix)} {annonce.devise}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{annonce.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <Text>Catégorie : {annonce.statut}</Text>
          <Text>Statut : {annonce.etat}</Text>
        </View>

        {matricule !== annonce.matricule && annonce.telephone ? (
          <View style={styles.contactContainer}>
            <Text style={styles.contactTitle}>Contacter le vendeur</Text>
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
            <Text style={styles.contactTitle2}>Vous êtes le propriétaire de cet article</Text>
          </View>
        )}

        {matricule && matricule !== annonce.matricule && annonce.etat === "Actif" && (
          <TouchableOpacity style={styles.jaiLuButton} onPress={openCommandeModal}>
            <Text style={styles.jaiLuButtonText}>Je commande</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Fullscreen modal avec zoom */}
      <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={closeMediaModal}>
        <View style={styles.modalContainer}>
          {isVideo ? (
            // Modal pour vidéo
            <>
              <TouchableOpacity style={styles.closeButton} onPress={closeMediaModal}>
                <MaterialIcons name="close" size={30} color="#fff" />
              </TouchableOpacity>
              <Video
                source={{ uri: selectedMedia?.uri }}
                style={styles.fullScreenMedia}
                useNativeControls
                resizeMode="contain"
                isLooping
                shouldPlay
              />
            </>
          ) : (
            // Modal pour image avec zoom personnalisé
            <>
              {/* Indicateur */}
              {imagesOnly.length > 1 && (
                <View style={styles.indicatorContainer}>
                  <Text style={styles.indicatorText}>
                    {currentImageIndex + 1} / {imagesOnly.length}
                  </Text>
                </View>
              )}
              
              {/* Image avec zoom */}
              {selectedMedia && selectedMedia.uri ? (
                <ZoomableImage
                  source={{ uri: selectedMedia.uri }}
                  style={styles.zoomContainer}
                  onClose={closeMediaModal}
                />
              ) : (
                <View style={styles.noImageContainer}>
                  <Text style={styles.noImageText}>Aucune image à afficher</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={closeMediaModal}>
                    <MaterialIcons name="close" size={30} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

       {/* MODAL COMMANDE */}
      <Modal visible={commandeModalVisible} transparent animationType="slide" onRequestClose={() => setCommandeModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.commandeModalContent}>
            <Text style={styles.commandeModalTitle}>Passer une commande</Text>

            <View style={styles.commandeRow}>
              <Text style={styles.commandeLabel}>Article :</Text>
              <Text style={styles.commandeValue}>{annonce?.titre}</Text>
            </View>

            <View style={styles.commandeRow}>
              <Text style={styles.commandeLabel}>Prix unitaire :</Text>
              <Text style={styles.commandeValue}>{formatAmount(annonce?.prix)} {annonce?.devise}</Text>
            </View>

            <View style={styles.commandeRow}>
              <Text style={styles.commandeLabel}>Quantité :</Text>
              <TextInput
                style={styles.quantiteInput}
                keyboardType="numeric"
                value={quantite}
                onChangeText={t => setQuantite(t.replace(/[^0-9]/g, ''))}
              />
            </View>

            <View style={styles.commandeRow}>
              <Text style={styles.commandeLabel}>Montant total :</Text>
              <Text style={styles.montantTotal}>{formatAmount(montantCommande)} {annonce?.devise}</Text>
            </View>

            {!user?.matricule && (
              <>
                <View style={styles.commandeRow}>
                  <Text style={styles.commandeLabel}>Login :</Text>
                  <TextInput style={styles.loginInput} value={login} onChangeText={setLogin} placeholder="Nom utilisateur" />
                </View>
                <View style={styles.commandeRow}>
                  <Text style={styles.commandeLabel}>Mot de passe :</Text>
                  <TextInput style={styles.loginInput} value={mdp} onChangeText={setMdp} placeholder="••••••••" secureTextEntry />
                </View>
              </>
            )}

            <View style={styles.commandeActions}>
              <TouchableOpacity style={styles.validerBtn} onPress={handleCommander}>
                <Text style={styles.commandeBtnText}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.annulerBtn} onPress={() => setCommandeModalVisible(false)}>
                <Text style={styles.commandeBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  zoomControls: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    flexDirection: 'row',
  },
  zoomButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    marginHorizontal: 5,
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
  // Styles pour les miniatures
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
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 2,
  },
  // Styles pour les flèches et les points
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
   // MODAL COMMANDE
  commandeModalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: windowWidth * 0.85, elevation: 5 },
  commandeModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  commandeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  commandeLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  commandeValue: { fontSize: 14, color: '#333', flex: 1, textAlign: 'right', marginLeft: 10 },
  quantiteInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, width: 80, textAlign: 'center', fontSize: 16 },
  montantTotal: { fontSize: 16, fontWeight: 'bold', color: '#1E90FF', flex: 1, textAlign: 'right', marginLeft: 10 },
  loginInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, flex: 1, marginLeft: 10, fontSize: 14 },
  commandeActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  validerBtn: { backgroundColor: '#2ecc71', padding: 12, borderRadius: 8, flex: 1, marginRight: 5, alignItems: 'center' },
  annulerBtn: { backgroundColor: '#e74c3c', padding: 12, borderRadius: 8, flex: 1, marginLeft: 5, alignItems: 'center' },
  commandeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default ArticleDetails;