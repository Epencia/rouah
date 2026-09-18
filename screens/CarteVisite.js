import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Share,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Format vertical (Portrait) comme dans le code précédent
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.6; 

// Palette de couleurs prédéfinies
const COLOR_PALETTE = [
  { id: 'teal', name: 'Teal', primary: '#075E54', secondary: '#128C7E', text: '#FFFFFF', accent: '#25D366' },
  { id: 'navy', name: 'Navy', primary: '#1A237E', secondary: '#283593', text: '#FFFFFF', accent: '#64B5F6' },
  { id: 'charcoal', name: 'Anthracite', primary: '#263238', secondary: '#37474F', text: '#FFFFFF', accent: '#90A4AE' },
  { id: 'burgundy', name: 'Bordeaux', primary: '#4A0E0E', secondary: '#6B1E1E', text: '#FFFFFF', accent: '#E57373' },
  { id: 'forest', name: 'Forêt', primary: '#1B5E20', secondary: '#2E7D32', text: '#FFFFFF', accent: '#81C784' },
  { id: 'purple', name: 'Violet', primary: '#4A148C', secondary: '#6A1B9A', text: '#FFFFFF', accent: '#CE93D8' },
  { id: 'orange', name: 'Orange', primary: '#E65100', secondary: '#EF6C00', text: '#FFFFFF', accent: '#FFB74D' },
  { id: 'gold', name: 'Or', primary: '#F9A825', secondary: '#FBC02D', text: '#1A1A1A', accent: '#FFF176' },
  { id: 'rose', name: 'Rose', primary: '#880E4F', secondary: '#AD1457', text: '#FFFFFF', accent: '#F48FB1' },
  { id: 'sky', name: 'Ciel', primary: '#01579B', secondary: '#0277BD', text: '#FFFFFF', accent: '#4FC3F7' },
  { id: 'mint', name: 'Menthe', primary: '#004D40', secondary: '#00695C', text: '#FFFFFF', accent: '#80CBC4' },
  { id: 'slate', name: 'Ardoise', primary: '#37474F', secondary: '#455A64', text: '#FFFFFF', accent: '#B0BEC5' },
];

/**
 * CarteVisite
 * Props :
 *  - societeNom   : string  (nom de la société)
 *  - catalogueUrl : string  (URL à encoder dans le QR)
 *  - sigle        : string  (optionnel)
 *  - onColorChange: (color) => void  (optionnel)
 */
export default function CarteVisite({
  societeNom = 'Ma Société',
  catalogueUrl = 'https://rouah.net',
  sigle = '',
  onColorChange,
}) {
  const [flipped, setFlipped] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [isPrinting, setIsPrinting] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const viewShotRef = useRef(null);

  const flipCard = () => {
    const toValue = flipped ? 0 : 1;
    Animated.spring(anim, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const frontInterpolate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };
  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  const selectColor = (color) => {
    setSelectedColor(color);
    onColorChange?.(color);
  };

  const shareCard = async () => {
    try {
      await Share.share({
        message: `${societeNom}\n${catalogueUrl}`,
        url: catalogueUrl,
        title: societeNom,
      });
    } catch (_) {}
  };

  // QR Code via API publique avec couleurs dynamiques
  const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    catalogueUrl
  )}&color=${selectedColor.text === '#FFFFFF' ? 'FFFFFF' : '1A1A1A'}&bgcolor=${selectedColor.primary.replace(
    '#',
    ''
  )}`;

  // Fonction pour sauvegarder et partager l'image avec la nouvelle API
  const saveAndShareImage = async (uri, side) => {
    try {
      const filename = `carte_${side}_${societeNom.replace(/\s/g, '_')}_${Date.now()}.png`;
      
      // Créer une instance de File pour le fichier source
      const sourceFile = new File(uri);
      
      // Vérifier que le répertoire cache existe (création automatique avec 'idempotent')
      const cacheDir = new Directory(Paths.cache);
      cacheDir.create({ idempotent: true });

      // Créer le fichier de destination
      const destinationFile = new File(Paths.cache, filename);
      
      // Copier le fichier (écrase si existe)
      sourceFile.copy(destinationFile);
      
      console.log(`Fichier sauvegardé : ${destinationFile.uri}`);

      // Partager l'image
      await Sharing.shareAsync(destinationFile.uri, {
        mimeType: 'image/png',
        dialogTitle: `Carte ${side}`,
        UTI: 'public.png',
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde ou du partage:', error);
      Alert.alert('Erreur', `Impossible de sauvegarder la carte : ${error.message}`);
      return false;
    }
  };

  // Fonction pour capturer et sauvegarder une face
  const captureAndSaveSide = async (side, shouldFlip = false) => {
    try {
      if (shouldFlip) {
        flipCard();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const uri = await viewShotRef.current.capture();
      const success = await saveAndShareImage(uri, side);
      
      if (!success) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      return true;
    } catch (error) {
      console.error('Erreur:', error);
      return false;
    }
  };

  // Fonction pour imprimer/télécharger la carte
  const printCard = async (side) => {
    try {
      setIsPrinting(true);
      
      let success = false;
      if (side === 'recto') {
        // Si on est sur le verso, retourner au recto
        success = await captureAndSaveSide('recto', flipped);
      } else if (side === 'verso') {
        // Si on est sur le recto, retourner au verso
        success = await captureAndSaveSide('verso', !flipped);
      }

      setIsPrinting(false);

      if (!success) {
        Alert.alert('Erreur', 'Impossible de sauvegarder la carte. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la carte. Veuillez réessayer.');
      setIsPrinting(false);
    }
  };

  // Fonction pour imprimer les deux faces
  const printBothSides = async () => {
    try {
      setIsPrinting(true);
      
      // Sauvegarder d'abord le recto
      const frontSuccess = await captureAndSaveSide('recto', flipped);
      
      if (!frontSuccess) {
        throw new Error('Erreur lors de la sauvegarde du recto');
      }

      // Attendre un peu avant de capturer le verso
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Sauvegarder le verso
      const backSuccess = await captureAndSaveSide('verso', !flipped);
      
      if (!backSuccess) {
        throw new Error('Erreur lors de la sauvegarde du verso');
      }

      setIsPrinting(false);
      
      Alert.alert(
        'Cartes sauvegardées !',
        'Le recto et le verso ont été sauvegardés. Vous pouvez les partager maintenant.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les cartes. Veuillez réessayer.');
      setIsPrinting(false);
    }
  };

  // Afficher les options d'impression
  const showPrintOptions = () => {
    Alert.alert(
      'Télécharger / Partager',
      'Choisissez ce que vous souhaitez sauvegarder :',
      [
        { 
          text: 'Recto seulement', 
          onPress: () => printCard('recto')
        },
        { 
          text: 'Verso seulement', 
          onPress: () => printCard('verso')
        },
        { 
          text: 'Recto + Verso', 
          onPress: printBothSides 
        },
        { 
          text: 'Annuler', 
          style: 'cancel',
          onPress: () => setIsPrinting(false)
        }
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.container}>
        {/* ===== CARTE ===== */}
        <ViewShot
          ref={viewShotRef}
          options={{
            format: 'png',
            quality: 1,
            width: CARD_WIDTH * 2,
            height: CARD_HEIGHT * 2,
          }}
          style={styles.cardWrapper}
        >
          <TouchableOpacity activeOpacity={0.95} onPress={flipCard} style={styles.cardWrapper}>
            
            {/* RECTO */}
            <Animated.View
              style={[
                styles.card,
                styles.cardFace,
                frontAnimatedStyle,
                {
                  backgroundColor: selectedColor.primary,
                  borderColor: selectedColor.secondary,
                },
              ]}
            >
              <View style={[styles.topBand, { backgroundColor: selectedColor.secondary }]} />

              <View style={styles.rectoHeader}>
                <Text
                  style={[styles.rectoCompanyName, { color: selectedColor.text }]}
                  numberOfLines={2}
                >
                  {societeNom}
                </Text>
              </View>

              <View style={styles.qrContainer}>
                <View style={[styles.qrFrame, { borderColor: selectedColor.accent }]}>
                  <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
                </View>
                <Text style={[styles.qrHint, { color: selectedColor.text }]}>
                  Scannez pour découvrir
                </Text>
              </View>

              <View style={styles.flipHint}>
                <Ionicons name="sync-outline" size={14} color={selectedColor.accent} />
                <Text style={[styles.flipHintText, { color: selectedColor.accent }]}>
                  Toucher pour retourner
                </Text>
              </View>
            </Animated.View>

            {/* VERSO */}
            <Animated.View
              style={[
                styles.card,
                styles.cardFace,
                styles.cardBack,
                backAnimatedStyle,
                {
                  backgroundColor: selectedColor.primary,
                  borderColor: selectedColor.secondary,
                },
              ]}
            >
              <View style={[styles.versoDecorTop, { backgroundColor: selectedColor.secondary }]} />
              <View style={[styles.versoDecorBottom, { backgroundColor: selectedColor.secondary }]} />

              <View style={styles.versoCenter}>
                <Text
                  style={[styles.versoCompanyName, { color: selectedColor.text }]}
                  numberOfLines={3}
                >
                  {societeNom}
                </Text>
                {!!sigle && (
                  <View style={[styles.versoSigleBadge, { backgroundColor: selectedColor.accent }]}>
                    <Text
                      style={[
                        styles.versoSigleText,
                        { color: selectedColor.text === '#FFFFFF' ? selectedColor.primary : '#FFF' },
                      ]}
                    >
                      {sigle}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.versoLine, { backgroundColor: selectedColor.accent }]} />
            </Animated.View>
          </TouchableOpacity>
        </ViewShot>

        {/* ===== PALETTE DE COULEURS ===== */}
        <Text style={styles.paletteTitle}>Couleur de la carte</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paletteScroll}
        >
          {COLOR_PALETTE.map((color) => {
            const isSelected = selectedColor.id === color.id;
            return (
              <TouchableOpacity
                key={color.id}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color.primary },
                  isSelected && styles.colorSwatchSelected,
                ]}
                onPress={() => selectColor(color)}
                activeOpacity={0.8}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={color.text} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.selectedColorName}>{selectedColor.name}</Text>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { borderWidth: 1, borderColor: '#075E54' }]} 
            onPress={flipCard}
          >
            <Ionicons name="sync-outline" size={20} color="#075E54" />
            <Text style={styles.actionBtnText}>Retourner</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={shareCard}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Partager</Text>
          </TouchableOpacity>
        </View>

        {/* Bouton Télécharger */}
        <TouchableOpacity
          style={[styles.printBtn, isPrinting && styles.printBtnDisabled]}
          onPress={showPrintOptions}
          disabled={isPrinting}
        >
          <Ionicons name="download-outline" size={24} color="#fff" />
          <Text style={styles.printBtnText}>
            {isPrinting ? 'Sauvegarde en cours...' : 'Télécharger / Partager'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: 24,
  },

  card: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },

  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
  },

  cardBack: {},

  // ---- RECTO ----
  topBand: {
    height: 8,
    width: '100%',
  },
  rectoHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    alignItems: 'center',
  },
  rectoCompanyName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  rectoSigle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  qrContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFrame: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  qrImage: {
    width: CARD_WIDTH * 0.45,
    height: CARD_WIDTH * 0.45,
    borderRadius: 8,
  },
  qrHint: {
    fontSize: 11,
    marginTop: 12,
    opacity: 0.85,
    letterSpacing: 0.5,
  },
  rectoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    gap: 6,
  },
  rectoUrl: {
    fontSize: 10,
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  flipHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.7,
  },
  flipHintText: {
    fontSize: 10,
  },

  // ---- VERSO ----
  versoDecorTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.35,
  },
  versoDecorBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.35,
  },
  versoCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  versoCompanyName: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.5,
    lineHeight: 32,
  },
  versoSigleBadge: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  versoSigleText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  versoLine: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    width: 60,
    height: 3,
    borderRadius: 2,
  },

  // ---- PALETTE ----
  paletteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    alignSelf: 'flex-start',
    marginLeft: 24,
  },
  paletteScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  colorSwatchSelected: {
    borderColor: '#333',
    transform: [{ scale: 1.15 }],
  },
  selectedColorName: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
    marginBottom: 16,
    fontWeight: '500',
  },

  // ---- ACTIONS ----
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 400,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  actionBtnPrimary: {
    backgroundColor: '#075E54',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#075E54',
  },

  // ---- BOUTON TÉLÉCHARGER ----
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1A237E',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  printBtnDisabled: {
    opacity: 0.6,
  },
  printBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});