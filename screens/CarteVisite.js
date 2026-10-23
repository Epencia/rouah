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
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.6;

// ============================================================
// PALETTE DE COULEURS (anciennes couleurs restaurées)
// Chaque thème définit :
//   - primary    : couleur principale (bandeau haut, texte fort)
//   - secondary  : variante foncée (accent secondaire)
//   - text       : couleur du texte principal sur fond clair
//   - accent     : couleur dorée / claire (ligne, badge)
// ============================================================
const COLOR_PALETTE = [
  { id: 'teal',     name: 'Teal',       primary: '#075E54', secondary: '#128C7E', text: '#075E54', accent: '#25D366' },
  { id: 'navy',     name: 'Navy',       primary: '#1A237E', secondary: '#283593', text: '#1A237E', accent: '#64B5F6' },
  { id: 'charcoal', name: 'Anthracite', primary: '#263238', secondary: '#37474F', text: '#263238', accent: '#90A4AE' },
  { id: 'burgundy', name: 'Bordeaux',   primary: '#4A0E0E', secondary: '#6B1E1E', text: '#4A0E0E', accent: '#E57373' },
  { id: 'forest',   name: 'Forêt',      primary: '#1B5E20', secondary: '#2E7D32', text: '#1B5E20', accent: '#81C784' },
  { id: 'purple',   name: 'Violet',     primary: '#4A148C', secondary: '#6A1B9A', text: '#4A148C', accent: '#CE93D8' },
  { id: 'orange',   name: 'Orange',     primary: '#E65100', secondary: '#EF6C00', text: '#B34700', accent: '#FFB74D' },
  { id: 'gold',     name: 'Or',         primary: '#F9A825', secondary: '#FBC02D', text: '#7A5A00', accent: '#FFF176' },
  { id: 'rose',     name: 'Rose',       primary: '#880E4F', secondary: '#AD1457', text: '#880E4F', accent: '#F48FB1' },
  { id: 'sky',      name: 'Ciel',       primary: '#01579B', secondary: '#0277BD', text: '#01579B', accent: '#4FC3F7' },
  { id: 'mint',     name: 'Menthe',     primary: '#004D40', secondary: '#00695C', text: '#004D40', accent: '#80CBC4' },
  { id: 'slate',    name: 'Ardoise',    primary: '#37474F', secondary: '#455A64', text: '#37474F', accent: '#B0BEC5' },
];

/**
 * CarteVisite
 * Props :
 *  - societeNom    : string
 *  - catalogueUrl  : string
 *  - sigle         : string  (optionnel — ex: "BK_MARKET")
 *  - sousTitre     : string  (optionnel)
 *  - texteBas      : string  (optionnel)
 *  - logoUri       : string  (optionnel — URL du logo)
 *  - onColorChange : (color) => void
 *  - onBack        : () => void
 */
export default function CarteVisite({
  societeNom = 'Ma Société',
  catalogueUrl = 'https://rouah.net',
  sigle = '',
  sousTitre = 'Scannez pour découvrir ma boutique',
  texteBas = 'Retrouvez-nous',
  logoUri = null,
  onColorChange,
  onBack,
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

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle  = { transform: [{ rotateY: backInterpolate }] };

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

  // QR code noir sur fond blanc (comme dans l'image)
  const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    catalogueUrl
  )}&color=1A1A1A&bgcolor=FFFFFF&margin=0`;

  const displayUrl = catalogueUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // ===== Sauvegarde / partage =====
  const saveAndShareImage = async (uri, side) => {
    try {
      const filename = `carte_${side}_${societeNom.replace(/\s/g, '_')}_${Date.now()}.png`;
      const sourceFile = new File(uri);
      const cacheDir = new Directory(Paths.cache);
      cacheDir.create({ idempotent: true });
      const destinationFile = new File(Paths.cache, filename);
      sourceFile.copy(destinationFile);

      await Sharing.shareAsync(destinationFile.uri, {
        mimeType: 'image/png',
        dialogTitle: `Carte ${side}`,
        UTI: 'public.png',
      });
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde/partage:', error);
      Alert.alert('Erreur', `Impossible de sauvegarder la carte : ${error.message}`);
      return false;
    }
  };

  const captureAndSaveSide = async (side, shouldFlip = false) => {
    try {
      if (shouldFlip) {
        flipCard();
        await new Promise((r) => setTimeout(r, 500));
      }
      const uri = await viewShotRef.current.capture();
      return await saveAndShareImage(uri, side);
    } catch (error) {
      console.error('Erreur:', error);
      return false;
    }
  };

  const printCard = async (side) => {
    try {
      setIsPrinting(true);
      let success = false;
      if (side === 'recto')      success = await captureAndSaveSide('recto', flipped);
      else if (side === 'verso') success = await captureAndSaveSide('verso', !flipped);
      setIsPrinting(false);
      if (!success) Alert.alert('Erreur', 'Impossible de sauvegarder la carte.');
    } catch (error) {
      setIsPrinting(false);
      Alert.alert('Erreur', 'Impossible de sauvegarder la carte.');
    }
  };

  const printBothSides = async () => {
    try {
      setIsPrinting(true);
      const frontSuccess = await captureAndSaveSide('recto', flipped);
      if (!frontSuccess) throw new Error('Erreur recto');
      await new Promise((r) => setTimeout(r, 1000));
      const backSuccess = await captureAndSaveSide('verso', !flipped);
      if (!backSuccess) throw new Error('Erreur verso');
      setIsPrinting(false);
      Alert.alert('Cartes sauvegardées !', 'Le recto et le verso ont été sauvegardés.');
    } catch (error) {
      setIsPrinting(false);
      Alert.alert('Erreur', 'Impossible de sauvegarder les cartes.');
    }
  };

  const showPrintOptions = () => {
    Alert.alert('Télécharger / Partager', 'Choisissez ce que vous souhaitez sauvegarder :', [
      { text: 'Recto seulement', onPress: () => printCard('recto') },
      { text: 'Verso seulement', onPress: () => printCard('verso') },
      { text: 'Recto + Verso',   onPress: printBothSides },
      { text: 'Annuler', style: 'cancel', onPress: () => setIsPrinting(false) },
    ]);
  };

  const C = selectedColor;

  return (
    <View style={[styles.safeContainer, { backgroundColor: '#f3f4f6' }]}>
      {/* Header */}
      <View style={[styles.rapportHeader, { backgroundColor: '#075E54' }]}>
        <View style={styles.rapportHeaderLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.rapportHeaderTitle}>Carte de visite</Text>
        </View>
      </View>

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
              {/* ============ RECTO ============ */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardFace,
                  frontAnimatedStyle,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: C.primary,
                  },
                ]}
              >
                {/* Bande colorée en haut (couleur principale) */}
                <View style={[styles.topBand, { backgroundColor: C.primary }]} />

                {/* Logo */}
                <View style={styles.logoBlock}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={styles.logoImage} resizeMode="contain" />
                  ) : (
                    <View style={[styles.logoPlaceholder, { borderColor: C.primary }]}>
                      <Ionicons name="storefront" size={34} color={C.primary} />
                    </View>
                  )}
                </View>

                {/* Sigle en petites majuscules espacées */}
                {!!sigle && (
                  <Text style={[styles.sigle, { color: C.primary }]} numberOfLines={1}>
                    {sigle}
                  </Text>
                )}

                {/* Nom principal en serif */}
                <Text style={[styles.companyName, { color: C.primary }]} numberOfLines={2}>
                  {societeNom}
                </Text>

                {/* Ligne dorée */}
                <View style={[styles.goldLine, { backgroundColor: C.accent }]} />

                {/* Sous-titre */}
                <Text style={styles.sousTitre} numberOfLines={2}>
                  {sousTitre}
                </Text>

                {/* QR Code dans un cadre blanc avec ombre */}
                <View style={styles.qrWrap}>
                  <View style={styles.qrCard}>
                    <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
                  </View>
                </View>

                {/* URL sous le QR */}
                <Text style={styles.urlText} numberOfLines={1}>
                  {displayUrl}
                </Text>

                {/* Footer : double ligne (primaire + accent) + texte */}
                <View style={styles.footerBlock}>
                  <View style={styles.footerLines}>
                    <View style={[styles.footerLineHalf, { backgroundColor: C.primary }]} />
                    <View style={[styles.footerLineHalf, { backgroundColor: C.accent }]} />
                  </View>
                  <Text style={[styles.footerText, { color: C.primary }]} numberOfLines={1}>
                    {texteBas} {sigle ? `sur ${sigle}` : ''}
                  </Text>
                </View>

                {/* Hint flip */}
                <View style={styles.flipHint}>
                  <Ionicons name="sync-outline" size={12} color="#999" />
                </View>
              </Animated.View>

              {/* ============ VERSO ============ */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardFace,
                  styles.cardBack,
                  backAnimatedStyle,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: C.primary,
                  },
                ]}
              >
                <View style={[styles.topBand, { backgroundColor: C.primary }]} />

                <View style={styles.versoCenter}>
                  {/* Logo verson */}
                  <View style={styles.logoBlock}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.logoImage} resizeMode="contain" />
                    ) : (
                      <View style={[styles.logoPlaceholder, { borderColor: C.primary }]}>
                        <Ionicons name="storefront" size={34} color={C.primary} />
                      </View>
                    )}
                  </View>

                  {!!sigle && (
                    <Text style={[styles.sigle, { color: C.primary, marginTop: 12 }]} numberOfLines={1}>
                      {sigle}
                    </Text>
                  )}

                  <Text style={[styles.versoCompanyName, { color: C.primary }]} numberOfLines={3}>
                    {societeNom}
                  </Text>

                  <View style={[styles.goldLine, { backgroundColor: C.accent, marginTop: 14 }]} />

                  <Text style={styles.versoUrl} numberOfLines={1}>
                    {displayUrl}
                  </Text>

                  <View style={[styles.versoCircle, { borderColor: C.primary }]}>
                    <Ionicons name="qr-code-outline" size={28} color={C.primary} />
                  </View>

                  <Text style={styles.versoSousTitre}>
                    {sousTitre}
                  </Text>
                </View>

                <View style={styles.footerBlock}>
                  <View style={styles.footerLines}>
                    <View style={[styles.footerLineHalf, { backgroundColor: C.primary }]} />
                    <View style={[styles.footerLineHalf, { backgroundColor: C.accent }]} />
                  </View>
                  <Text style={[styles.footerText, { color: C.primary }]} numberOfLines={1}>
                    {texteBas} {sigle ? `sur ${sigle}` : ''}
                  </Text>
                </View>
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
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
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
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  safeContainer: { flex: 1 },

  rapportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 46,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#075E54',
  },
  rapportHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  rapportHeaderTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginLeft: 10 },
  backBtn: { padding: 4 },

  scrollView: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { flexGrow: 1, paddingVertical: 20 },
  container: { alignItems: 'center', paddingVertical: 20 },

  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: 24,
  },

  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
  },
  cardBack: {},

  // Bande colorée en haut (couleur principale)
  topBand: {
    height: 5,
    width: '100%',
  },

  // ===== LOGO =====
  logoBlock: {
    alignItems: 'center',
    marginTop: 18,
  },
  logoPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },

  // ===== SIGLE =====
  sigle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.9,
  },

  // ===== NOM =====
  companyName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 14,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 0.3,
  },

  // ===== LIGNE DORÉE =====
  goldLine: {
    width: 42,
    height: 2.5,
    borderRadius: 2,
    marginTop: 10,
    alignSelf: 'center',
  },

  // ===== SOUS-TITRE =====
  sousTitre: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 24,
    letterSpacing: 0.3,
    lineHeight: 16,
    color: '#8A8A8A',
  },

  // ===== QR CODE =====
  qrWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  qrImage: {
    width: CARD_WIDTH * 0.55,
    height: CARD_WIDTH * 0.55,
  },

  // ===== URL =====
  urlText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 10,
    letterSpacing: 0.5,
    color: '#8A8A8A',
  },

  // ===== FOOTER =====
  footerBlock: {
    alignItems: 'center',
    paddingBottom: 14,
    marginTop: 8,
  },
  footerLines: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  footerLineHalf: {
    width: 22,
    height: 2.5,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  // ===== HINT FLIP =====
  flipHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.5,
  },

  // ===== VERSO =====
  versoCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  versoCompanyName: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 0.5,
    lineHeight: 32,
  },
  versoUrl: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.5,
    color: '#8A8A8A',
  },
  versoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  versoSousTitre: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
    letterSpacing: 0.3,
    lineHeight: 16,
    color: '#8A8A8A',
  },

  // ===== PALETTE =====
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

  // ===== ACTIONS =====
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
  actionBtnPrimary: { backgroundColor: '#075E54' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#075E54' },

  // ===== BOUTON TÉLÉCHARGER =====
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
    marginBottom:20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  printBtnDisabled: { opacity: 0.6 },
  printBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});