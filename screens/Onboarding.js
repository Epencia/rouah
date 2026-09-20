// screens/Onboarding.js
// Onboarding premium Rouah – Style épuré + contenu riche

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ROUAH = {
  primary: '#075E54',
  primaryDark: '#054640',
  accent: '#25D366',
  cream: '#ECE5DD',
  text: '#171717',
  muted: '#6b7280',
  white: '#ffffff',
  border: '#e5e7eb',
};

const STEPS = [
  {
    id: 'welcome',
    badge: 'BIENVENUE',
    icon: 'hand-wave',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Bienvenue sur Rouah',
    tagline: 'Votre commerce, simplifié',
    description:
      'Gérez vos ventes, stocks, clients et finances depuis une seule application simple et puissante.',
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
      { icon: 'phone-portrait', text: 'Accessible sur mobile et tablette' },
    ],
    tip: 'Explorez chaque fonctionnalité en swipant pour découvrir tout le potentiel de Rouah.',
  },
  {
    id: 'dashboard',
    badge: 'PILOTAGE',
    icon: 'view-dashboard',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Tableau de bord',
    tagline: 'Votre commerce en un coup d\'œil',
    description:
      'Visualisez tous vos indicateurs clés en temps réel et prenez de meilleures décisions chaque jour.',
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
    tip: 'Consultez le tableau de bord chaque matin pour planifier votre journée.',
  },
  {
    id: 'stock',
    badge: 'INVENTAIRE',
    icon: 'package-variant-closed',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Gestion des stocks',
    tagline: 'Ne tombez plus jamais en rupture',
    description:
      'Suivez vos quantités, recevez des alertes automatiques et transférez facilement entre boutiques.',
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
    tip: 'Configurez des seuils d\'alerte pour chaque article stratégique.',
  },
  {
    id: 'sales',
    badge: 'VENTES',
    icon: 'cash-register',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Ventes & Caisses',
    tagline: 'Encaissez en quelques secondes',
    description:
      'Facturation ultra-rapide, multi-paiements et suivi des créances clients en temps réel.',
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
    tip: 'Activez le mode hors ligne pour vendre même sans internet.',
  },
  {
    id: 'facture',
    badge: 'CONFORMITÉ',
    icon: 'file-document-check',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Facture normalisée',
    tagline: 'Conforme à la réglementation',
    description:
      'Émettez des factures normalisées conformes aux exigences fiscales et légales de votre pays.',
    color: '#0d9488',
    stats: [
      { value: '100%', label: 'Conforme' },
      { value: '1 clic', label: 'Génération' },
      { value: 'PDF', label: 'Export' },
    ],
    features: [
      { icon: 'shield-checkmark', text: 'Respect des normes fiscales en vigueur' },
      { icon: 'document-text', text: 'Numérotation automatique et séquentielle' },
      { icon: 'qr-code', text: 'QR code et mentions légales inclus' },
      { icon: 'share-social', text: 'Partage et impression instantanés' },
    ],
    tip: 'Activez la facture normalisée dans les paramètres pour être en règle dès la première vente.',
  },
  {
    id: 'catalogue',
    badge: 'VITRINE',
    icon: 'storefront',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Catalogue',
    tagline: 'Présentez vos produits avec style',
    description:
      'Créez un catalogue attractif de vos articles pour vos clients, avec photos, prix et disponibilités.',
    color: '#d97706',
    stats: [
      { value: '∞', label: 'Produits' },
      { value: 'Photos', label: 'Inclus' },
      { value: 'Partage', label: 'Facile' },
    ],
    features: [
      { icon: 'images', text: 'Photos et descriptions détaillées' },
      { icon: 'pricetag', text: 'Prix et promotions mis en avant' },
      { icon: 'share', text: 'Partagez votre catalogue en un clic' },
      { icon: 'search', text: 'Recherche et filtres par catégorie' },
    ],
    tip: 'Ajoutez de belles photos à vos articles pour rendre votre catalogue plus attractif.',
  },
  {
    id: 'chat',
    badge: 'ASSISTANT',
    icon: 'robot',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Chat IA',
    tagline: 'Votre assistant commercial intelligent',
    description:
      'Posez vos questions, obtenez des analyses et des conseils pour mieux piloter votre activité.',
    color: '#7c3aed',
    stats: [
      { value: '24/7', label: 'Disponible' },
      { value: 'IA', label: 'Intelligente' },
      { value: 'Rapide', label: 'Réponses' },
    ],
    features: [
      { icon: 'chatbubbles', text: 'Posez vos questions en langage naturel' },
      { icon: 'analytics', text: 'Analyses et insights sur vos ventes' },
      { icon: 'bulb', text: 'Conseils pour améliorer votre rentabilité' },
      { icon: 'help-circle', text: 'Aide sur l\'utilisation de Rouah' },
    ],
    tip: 'Demandez par exemple : « Quel a été mon meilleur produit ce mois-ci ? »',
  },
  {
    id: 'reports',
    badge: 'ANALYSE',
    icon: 'chart-box',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Rapports détaillés',
    tagline: 'Décidez avec des données fiables',
    description:
      'Rapports PDF professionnels, performance des vendeurs, top clients et articles.',
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
    tip: 'Générez un rapport PDF hebdomadaire pour suivre votre progression.',
  },
  {
    id: 'ready',
    badge: 'PRÊT',
    icon: 'rocket-launch',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Vous êtes prêt !',
    tagline: 'Commencez à gérer votre commerce',
    description:
      'Créez votre compte ou connectez-vous pour démarrer et faire grandir votre activité.',
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
    tip: 'Utilisez gratuitement notre solution pour la gestion de votre commerce.',
    isLast: true,
  },
];

// Contenu interne (utilise useSafeAreaInsets)
function OnboardingContent({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setCurrentStep(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, []);

  const goTo = (index) => {
    setCurrentStep(index);
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      goTo(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleScroll = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== currentStep && index >= 0 && index < STEPS.length) {
      setCurrentStep(index);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ROUAH.primary} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>R</Text>
          </View>
          <Text style={styles.logoText}>Rouah</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
          <Text style={styles.skipText}>Fermer</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slider}
      >
        {STEPS.map((step) => (
          <StepSlide key={step.id} step={step} />
        ))}
      </ScrollView>

      {/* Bottom – safe area respectée */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goTo(i)}
              style={[styles.dot, i === currentStep && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.mainBtn,
            currentStep === STEPS.length - 1 && styles.mainBtnFinal,
          ]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.mainBtnText}>
            {currentStep === STEPS.length - 1 ? 'Commencer' : 'Suivant'}
          </Text>
          <Ionicons
            name={currentStep === STEPS.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Wrapper exporté : fournit toujours un SafeAreaProvider
export default function OnboardingModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaProvider>
        <OnboardingContent onClose={onClose} />
      </SafeAreaProvider>
    </Modal>
  );
}

function StepSlide({ step }) {
  const IconComp =
    step.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

  return (
    <View style={styles.slide}>
      <ScrollView
        contentContainerStyle={styles.slideContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconOuter, { backgroundColor: step.color + '18' }]}>
          <View style={[styles.iconInner, { backgroundColor: step.color }]}>
            <IconComp name={step.icon} size={48} color="#fff" />
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: step.color + '15' }]}>
          <Text style={[styles.badgeText, { color: step.color }]}>{step.badge}</Text>
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={[styles.tagline, { color: step.color }]}>{step.tagline}</Text>
        <Text style={styles.description}>{step.description}</Text>

        <View style={styles.statsRow}>
          {step.stats.map((stat, i) => (
            <View key={i} style={styles.statBox}>
              <Text style={[styles.statValue, { color: step.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.featuresBox}>
          {step.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: step.color + '15' }]}>
                <Ionicons name={f.icon} size={16} color={step.color} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {step.tip && (
          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={18} color={ROUAH.primary} />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Astuce : </Text>
              {step.tip}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ROUAH.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: ROUAH.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },

  slider: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
  },
  slideContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
  },

  iconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: ROUAH.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: ROUAH.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
    paddingHorizontal: 8,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ROUAH.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: ROUAH.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  featuresBox: {
    width: '100%',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: ROUAH.text,
    lineHeight: 20,
  },

  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ROUAH.cream,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: ROUAH.primary,
    width: '100%',
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: ROUAH.text,
    lineHeight: 19,
  },
  tipBold: {
    fontWeight: '700',
    color: ROUAH.primary,
  },

  bottom: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: ROUAH.primary,
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ROUAH.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  mainBtnFinal: {
    backgroundColor: ROUAH.accent,
  },
  mainBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});