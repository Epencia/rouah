// screens/Onboarding.js
// Guide interactif Rouah - Onboarding premium
// Design : Stepper horizontal + Visuel central + Statistiques
// Correction : SafeAreaView + useSafeAreaInsets pour éviter que le footer soit caché

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============ COULEURS ROUAH ============
const ROUAH = {
  primary: '#075E54',      // Vert foncé Rouah
  primaryDark: '#054640',
  primaryLight: '#0d7a6c',
  accent: '#25D366',       // Vert clair WhatsApp/Rouah
  accentLight: '#e8f9f0',
  cream: '#ECE5DD',        // Fond crème Rouah
  text: '#171717',
  textMuted: '#6b7280',
  white: '#ffffff',
  border: '#e5e7eb',
};

// ============ ÉTAPES DU GUIDE ============
const STEPS = [
  {
    id: 'welcome',
    step: '1',
    icon: 'hand-wave',
    iconFamily: 'MaterialCommunityIcons',
    category: 'Bienvenue',
    title: 'Bienvenue sur Rouah',
    tagline: 'Votre commerce, simplifié',
    color: ROUAH.primary,
    stats: [
      { value: '100%', label: 'Mobile' },
      { value: '0', label: 'Installation' },
      { value: '24/7', label: 'Disponible' },
    ],
    features: [
      { icon: 'flash', text: 'Démarrez en moins de 2 minutes' },
      { icon: 'cloud-offline', text: 'Fonctionne même hors ligne' },
      { icon: 'shield-checkmark', text: 'Données sécurisées' },
    ],
    cta: 'Suivant',
  },
  {
    id: 'dashboard',
    step: '2',
    icon: 'view-dashboard',
    iconFamily: 'MaterialCommunityIcons',
    category: 'Pilotage',
    title: 'Tableau de bord',
    tagline: 'Votre commerce en un coup d\'œil',
    color: ROUAH.primary,
    stats: [
      { value: '1', label: 'Écran' },
      { value: '∞', label: 'Indicateurs' },
      { value: 'Temps', label: 'Réel' },
    ],
    features: [
      { icon: 'trending-up', text: 'CA du jour, semaine, mois en direct' },
      { icon: 'cart', text: 'Nombre de ventes et panier moyen' },
      { icon: 'alert-circle', text: 'Alertes de stock immédiates' },
      { icon: 'cash', text: 'Solde de toutes vos caisses' },
    ],
    cta: 'Suivant',
  },
  {
    id: 'stock',
    step: '3',
    icon: 'package-variant-closed',
    iconFamily: 'MaterialCommunityIcons',
    category: 'Inventaire',
    title: 'Gestion des stocks',
    tagline: 'Ne tombez plus jamais en rupture',
    color: '#2563eb',
    stats: [
      { value: '0', label: 'Rupture' },
      { value: '100%', label: 'Précision' },
      { value: 'Auto', label: 'Alertes' },
    ],
    features: [
      { icon: 'add-circle', text: 'Articles et catégories illimités' },
      { icon: 'notifications', text: 'Alertes automatiques de stock bas' },
      { icon: 'swap-horizontal', text: 'Transferts entre boutiques' },
      { icon: 'calculator', text: 'Valeur du stock en temps réel' },
    ],
    cta: 'Suivant',
  },
  {
    id: 'sales',
    step: '4',
    icon: 'cash-register',
    iconFamily: 'MaterialCommunityIcons',
    category: 'Ventes',
    title: 'Ventes & Caisses',
    tagline: 'Encaissez en quelques secondes',
    color: ROUAH.accent,
    stats: [
      { value: '5s', label: 'Par vente' },
      { value: '4', label: 'Modes paiement' },
      { value: '100%', label: 'Sécurisé' },
    ],
    features: [
      { icon: 'flash', text: 'Facturation ultra-rapide au comptoir' },
      { icon: 'card', text: 'Espèces, mobile money, carte, chèque' },
      { icon: 'document-text', text: 'Devis, factures, avoirs en 1 clic' },
      { icon: 'lock-closed', text: 'Ouverture/fermeture de caisse' },
    ],
    cta: 'Suivant',
  },
  {
    id: 'reports',
    step: '5',
    icon: 'chart-box',
    iconFamily: 'MaterialCommunityIcons',
    category: 'Analyse',
    title: 'Rapports détaillés',
    tagline: 'Décidez avec des données fiables',
    color: '#7c3aed',
    stats: [
      { value: '10+', label: 'Types rapports' },
      { value: '1 clic', label: 'Export PDF' },
      { value: 'Temps', label: 'Réel' },
    ],
    features: [
      { icon: 'stats-chart', text: 'CA par jour, semaine, mois' },
      { icon: 'analytics', text: 'Marge par produit' },
      { icon: 'trophy', text: 'Performance des vendeurs' },
      { icon: 'download', text: 'Export PDF professionnel' },
    ],
    cta: 'Suivant',
  },
  {
    id: 'ready',
    step: '6',
    icon: 'rocket-launch',
    iconFamily: 'MaterialCommunityIcons',
    category: 'Prêt',
    title: 'Vous êtes prêt !',
    tagline: 'Commencez à gérer votre commerce',
    color: ROUAH.primary,
    stats: [
      { value: '🚀', label: 'Go !' },
      { value: '2 min', label: 'Pour démarrer' },
      { value: '∞', label: 'Possibilités' },
    ],
    features: [
      { icon: 'person-add', text: 'Créez votre compte en 2 minutes' },
      { icon: 'business', text: 'Ajoutez votre première boutique' },
      { icon: 'add-circle', text: 'Importez vos articles' },
      { icon: 'cart', text: 'Enregistrez votre première vente' },
    ],
    cta: 'Commencer maintenant',
  },
];

// ============ COMPOSANT PRINCIPAL ============
export default function OnboardingModal({ visible, onClose, colors = {} }) {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Récupère les marges de sécurité du téléphone (encoche, gestes, etc.)
  const insets = useSafeAreaInsets();

  // Animation de la barre de progression
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / STEPS.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Reset au premier step à l'ouverture
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);

  // Navigation
  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      scrollRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      handleFinish();
    }
  };

  const goPrevious = () => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      setCurrentStep(prevIndex);
      scrollRef.current?.scrollTo({
        x: prevIndex * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentStep && index >= 0 && index < STEPS.length) {
      setCurrentStep(index);
    }
  };

  const handleFinish = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={ROUAH.primary} />

        {/* ====== HEADER FIXE ====== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>R</Text>
            </View>
            <View>
              <Text style={styles.headerBrand}>Rouah</Text>
              <Text style={styles.headerBrandSub}>Guide de démarrage</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={ROUAH.white} />
          </TouchableOpacity>
        </View>

        {/* ====== STEPPER HORIZONTAL ====== */}
        <View style={styles.stepperContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stepperScroll}
          >
            {STEPS.map((s, index) => {
              const isActive = index === currentStep;
              const isPast = index < currentStep;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.stepperItem}
                  onPress={() => {
                    setCurrentStep(index);
                    scrollRef.current?.scrollTo({
                      x: index * SCREEN_WIDTH,
                      animated: true,
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.stepperCircle,
                      isActive && {
                        backgroundColor: ROUAH.white,
                        transform: [{ scale: 1.1 }],
                      },
                      isPast && { backgroundColor: ROUAH.accent },
                      !isActive &&
                        !isPast && {
                          backgroundColor: 'rgba(255,255,255,0.25)',
                        },
                    ]}
                  >
                    {isPast ? (
                      <Ionicons name="checkmark" size={16} color={ROUAH.white} />
                    ) : (
                      <Text
                        style={[
                          styles.stepperCircleText,
                          isActive && { color: ROUAH.primary, fontWeight: '800' },
                        ]}
                      >
                        {s.step}
                      </Text>
                    )}
                  </View>
                  {isActive && (
                    <Text style={styles.stepperLabelActive}>{s.category}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Barre de progression */}
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* ====== CONTENU DES ÉTAPES (swipe horizontal) ====== */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={styles.stepsScroll}
        >
          {STEPS.map((step, index) => (
            <StepView
              key={step.id}
              step={step}
              isActive={index === currentStep}
            />
          ))}
        </ScrollView>

        {/* ====== FOOTER FIXE AVEC BOUTONS (padding bottom adaptatif) ====== */}
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          {/* Bouton Retour / Passer */}
          {currentStep > 0 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={goPrevious}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={ROUAH.primary} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>Passer</Text>
            </TouchableOpacity>
          )}

          {/* Indicateur de progression textuelle */}
          <Text style={styles.stepCounter}>
            {currentStep + 1} / {STEPS.length}
          </Text>

          {/* Bouton Suivant / Terminer */}
          <TouchableOpacity
            style={[
              styles.nextButton,
              currentStep === STEPS.length - 1 && styles.nextButtonFinal,
            ]}
            onPress={goNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>
              {STEPS[currentStep].cta}
            </Text>
            <Ionicons
              name={
                currentStep === STEPS.length - 1
                  ? 'checkmark-circle'
                  : 'arrow-forward'
              }
              size={20}
              color={ROUAH.white}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ============ COMPOSANT : UNE ÉTAPE ============
function StepView({ step, isActive }) {
  // Animation d'apparition
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isActive) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      iconScale.setValue(0.5);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  const IconComponent =
    step.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

  return (
    <View style={[styles.stepContainer, { width: SCREEN_WIDTH }]}>
      <ScrollView
        contentContainerStyle={styles.stepScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ====== ZONE ILLUSTRÉE (grande icône + stats) ====== */}
        <Animated.View
          style={[
            styles.illustrationCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Fond décoratif */}
          <View style={styles.illustrationBg}>
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />
            <View style={styles.bgCircle3} />
          </View>

          {/* Catégorie badge */}
          <View style={styles.categoryBadge}>
            <View style={styles.categoryDot} />
            <Text style={styles.categoryText}>{step.category}</Text>
          </View>

          {/* Grande icône colorée */}
          <Animated.View
            style={[
              styles.iconBigWrapper,
              {
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <View
              style={[
                styles.iconBigCircleOuter,
                { backgroundColor: step.color + '25' },
              ]}
            >
              <View
                style={[
                  styles.iconBigCircleInner,
                  { backgroundColor: step.color },
                ]}
              >
                <IconComponent name={step.icon} size={52} color={ROUAH.white} />
              </View>
            </View>
          </Animated.View>

          {/* Titre + tagline */}
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={[styles.stepTagline, { color: step.color }]}>
            {step.tagline}
          </Text>
        </Animated.View>

        {/* ====== STATISTIQUES ====== */}
        <Animated.View
          style={[
            styles.statsRow,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {step.stats.map((stat, i) => (
            <View key={i} style={styles.statBox}>
              <Text style={[styles.statValue, { color: step.color }]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ====== LISTE DES FONCTIONNALITÉS ====== */}
        <Animated.View
          style={[
            styles.featuresBox,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.featuresTitle}>Ce que vous pouvez faire :</Text>
          {step.features.map((feature, i) => (
            <View key={i} style={styles.featureItem}>
              <View
                style={[
                  styles.featureIconBox,
                  { backgroundColor: step.color + '15' },
                ]}
              >
                <Ionicons name={feature.icon} size={18} color={step.color} />
              </View>
              <Text style={styles.featureItemText}>{feature.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ====== ASTUCE (uniquement pour les étapes métier) ===== */}
        {step.id !== 'welcome' && step.id !== 'ready' && (
          <Animated.View
            style={[
              styles.tipBox,
              {
                backgroundColor: ROUAH.cream,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.tipIconBox}>
              <Ionicons
                name="bulb-outline"
                size={20}
                color={ROUAH.primary}
              />
            </View>
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Astuce Rouah : </Text>
              {step.id === 'dashboard' &&
                'Consultez le tableau de bord chaque matin pour planifier votre journée.'}
              {step.id === 'stock' &&
                'Configurez des seuils d\'alerte pour chaque article stratégique.'}
              {step.id === 'sales' &&
                'Activez le mode hors ligne pour vendre même sans internet.'}
              {step.id === 'reports' &&
                'Générez un rapport PDF hebdomadaire pour suivre votre progression.'}
            </Text>
          </Animated.View>
        )}

        {/* Espace en bas */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  // ===== CONTENEUR =====
  container: {
    flex: 1,
    backgroundColor: ROUAH.white,
  },

  // ===== HEADER (SafeAreaView gère déjà le padding top) =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: ROUAH.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ROUAH.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    color: ROUAH.white,
    fontSize: 22,
    fontWeight: '900',
  },
  headerBrand: {
    color: ROUAH.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerBrandSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== STEPPER =====
  stepperContainer: {
    backgroundColor: ROUAH.primary,
    paddingBottom: 16,
  },
  stepperScroll: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  stepperItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  stepperCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCircleText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },
  stepperLabelActive: {
    color: ROUAH.white,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ===== BARRE DE PROGRESSION =====
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ROUAH.accent,
    borderRadius: 2,
  },

  // ===== ZONE DES ÉTAPES =====
  stepsScroll: {
    flex: 1,
    backgroundColor: ROUAH.white,
  },
  stepContainer: {
    flex: 1,
    backgroundColor: ROUAH.white,
  },
  stepScroll: {
    padding: 20,
    paddingBottom: 30,
  },

  // ===== CARTE ILLUSTRÉE =====
  illustrationCard: {
    backgroundColor: ROUAH.cream,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 300,
  },
  illustrationBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  bgCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: ROUAH.white,
    opacity: 0.5,
    top: -80,
    right: -60,
  },
  bgCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ROUAH.accent,
    opacity: 0.15,
    bottom: -30,
    left: -20,
  },
  bgCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ROUAH.primary,
    opacity: 0.08,
    top: 60,
    left: 20,
  },

  // Badge catégorie
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROUAH.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ROUAH.accent,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: ROUAH.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Grande icône
  iconBigWrapper: {
    marginBottom: 18,
  },
  iconBigCircleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBigCircleInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },

  // Titre et tagline
  stepTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: ROUAH.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  stepTagline: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ===== STATISTIQUES =====
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: ROUAH.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: ROUAH.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: ROUAH.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ===== LISTE DES FONCTIONNALITÉS =====
  featuresBox: {
    backgroundColor: ROUAH.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: ROUAH.border,
    marginBottom: 14,
  },
  featuresTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: ROUAH.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureItemText: {
    flex: 1,
    fontSize: 14,
    color: ROUAH.text,
    fontWeight: '500',
    lineHeight: 19,
  },

  // ===== ASTUCE =====
  tipBox: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: ROUAH.primary,
  },
  tipIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ROUAH.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: ROUAH.text,
    lineHeight: 19,
  },
  tipBold: {
    fontWeight: '800',
    color: ROUAH.primary,
  },

  // ===== FOOTER (padding bottom dynamique via insets.bottom) =====
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    // paddingBottom : défini dynamiquement dans le JSX via Math.max(insets.bottom, 16) + 8
    backgroundColor: ROUAH.white,
    borderTopWidth: 1,
    borderTopColor: ROUAH.border,
    gap: 10,
    // Ombre pour bien détacher le footer du contenu
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  backButtonText: {
    color: ROUAH.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  stepCounter: {
    fontSize: 13,
    color: ROUAH.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ROUAH.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    shadowColor: ROUAH.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
    maxWidth: 200,
  },
  nextButtonFinal: {
    backgroundColor: ROUAH.accent,
    shadowColor: ROUAH.accent,
  },
  nextButtonText: {
    color: ROUAH.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});