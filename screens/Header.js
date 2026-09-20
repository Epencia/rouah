import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen from './Dashboard';
import Profil from './Profil';
import FacturesScreen from './Factures';
import ChatScreen from './Chat';
import OnboardingModal from './Onboarding';

export const Header = ({ 
  title, 
  showLogo = true, // 👈 NOUVEAU : Affiche le logo par défaut, ou le texte si false
  onBack, 
  rightIcon, 
  onRightPress, 
  user, 
  onLoginPress, 
  onLogoutPress,
  societeId,
  boutiqueId,
  customRightIcons,
  colors = { 
    bg: '#ECE5DD', 
    surface: '#fff', 
    text: '#171717', 
    muted: '#8a8a8e', 
    border: 'rgba(0,0,0,0.08)', 
    primary: '#075E54', 
    secondary: '#25D366', 
    purple: '#7c3aed' 
  },
  onDashboardClose,
  onChatClose,
  onUserUpdated,
}) => {
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [facturesVisible, setFacturesVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [showProfilModal, setShowProfilModal] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  const openDashboard = () => {
    if (!user) {
      if (onLoginPress) onLoginPress();
      return;
    }
    if (!societeId) {
      Alert.alert('Erreur', 'Aucune société associée');
      return;
    }
    setDashboardVisible(true);
  };

  const closeDashboard = () => {
    setDashboardVisible(false);
    if (onDashboardClose) onDashboardClose();
  };

  const openFactures = () => {
    if (!user) {
      if (onLoginPress) onLoginPress();
      return;
    }
    if (!societeId) {
      Alert.alert('Erreur', 'Aucune société associée');
      return;
    }
    setFacturesVisible(true);
  };

  const closeFactures = () => {
    setFacturesVisible(false);
  };

  const openChat = () => {
    if (!user) {
      if (onLoginPress) onLoginPress();
      return;
    }
    if (!societeId) {
      Alert.alert('Erreur', 'Aucune société associée');
      return;
    }
    setChatVisible(true);
  };

  const closeChat = () => {
    setChatVisible(false);
    if (onChatClose) onChatClose();
  };

  return (
    <>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        
        {/* 👈 REMPLACEMENT DU TITRE PAR LE LOGO (avec fallback) */}
        {showLogo ? (
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>R</Text>
            </View>
            <Text style={styles.logoText}>{title}</Text>
          </View>
        ) : (
          <Text style={styles.headerTitle}>{title}</Text>
        )}
        
        <View style={styles.headerIcons}>
          {customRightIcons ? (
            customRightIcons.map((icon, index) => (
              <TouchableOpacity
                key={index}
                onPress={icon.onPress}
                style={styles.iconBtn}
              >
                <Ionicons name={icon.name} size={22} color="#fff" />
              </TouchableOpacity>
            ))
          ) : (
            <>
              {/* ========== BOUTON ONBOARDING (uniquement déconnecté) ========== */}
              {!user && (
                <TouchableOpacity 
                  onPress={() => setOnboardingVisible(true)} 
                  style={styles.iconBtn}
                >
                  <Ionicons name="rocket-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Boutons réservés aux utilisateurs connectés */}
              {user && (
                <>
                  <TouchableOpacity onPress={openDashboard} style={styles.iconBtn}>
                    <Ionicons name="speedometer-outline" size={22} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={openFactures} style={styles.iconBtn}>
                    <Ionicons name="document-text-outline" size={22} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={openChat} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="robot-outline" size={23} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowProfilModal(true)} style={styles.iconBtn}>
                    {user?.photo ? (
                      <Image 
                        source={{ uri: user.photo }} 
                        style={{ width: 24, height: 24, borderRadius: 12 }} 
                      />
                    ) : (
                      <Ionicons name="person-outline" size={22} color="#fff" />
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* Bouton connexion / déconnexion */}
              {user ? (
                <TouchableOpacity onPress={onLogoutPress} style={styles.userBtn}>
                  <Ionicons name="log-out-outline" size={22} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onLoginPress} style={styles.userBtn}>
                  <Ionicons name="person-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}

          {rightIcon && (
            <TouchableOpacity onPress={onRightPress} style={styles.iconSpacing}>
              <Ionicons name={rightIcon} size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ========== MODAL ONBOARDING ========== */}
      <OnboardingModal
        visible={onboardingVisible}
        onClose={() => setOnboardingVisible(false)}
        colors={colors}
      />

      {/* Modal Factures */}
      <Modal
        visible={facturesVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeFactures}
        statusBarTranslucent={true}
      >
        <FacturesScreen
          visible={facturesVisible}
          onClose={closeFactures}
          colors={colors}
          societeId={societeId}
          boutiqueId={boutiqueId}
          user={user}
        />
      </Modal>

      {/* Modal Dashboard */}
      <Modal
        visible={dashboardVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeDashboard}
        statusBarTranslucent={true}
      >
        <DashboardScreen
          societeId={societeId}
          boutiqueId={boutiqueId}
          colors={colors}
          onBack={closeDashboard}
        />
      </Modal>

      {/* Modal Profil */}
      <Profil
        visible={showProfilModal}
        onClose={() => setShowProfilModal(false)}
        societeId={societeId}
        user={user}
        onProfilUpdated={(updated) => {
          if (onUserUpdated) onUserUpdated(updated);
        }}
      />

      {/* Modal Chat IA */}
      <Modal
        visible={chatVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeChat}
        statusBarTranslucent={true}
      >
        <ChatScreen
          visible={chatVisible}
          onBack={closeChat}
          colors={colors}
          societeId={societeId}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#075E54',
    paddingTop: StatusBar.currentHeight || 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    zIndex: 10,
  },
  
  // 👇 NOUVEAUX STYLES POUR LE LOGO ROUAH
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
  // 👆 FIN DES NOUVEAUX STYLES

  headerTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold', 
    flex: 1, 
    marginLeft: 10 
  },
  headerIcons: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconSpacing: { 
    marginRight: 16 
  },
  backBtn: { 
    padding: 4 
  },
  userBtn: { 
    padding: 4, 
    marginRight: 8 
  },
  iconBtn: {
    padding: 4,
    marginRight: 12,
  },
});