import React, { useState, useEffect } from 'react';
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
import ServicesScreen from './Services';
import FormationsScreen from './Formations';
import Parrainage from './Parrainages';
import Campagnes from './Campagnes'; // ⭐ Fil TikTok
import Outils from './Outils';

export const Header = ({
  title,
  showLogo = true,
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
    purple: '#7c3aed',
  },
  onDashboardClose,
  onChatClose,
  onUserUpdated,
  onChangedCampagne,
}) => {
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [facturesVisible, setFacturesVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [showProfilModal, setShowProfilModal] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [servicesVisible, setServicesVisible] = useState(false);
  const [formationsVisible, setFormationsVisible] = useState(false);
  const [parrainageVisible, setParrainageVisible] = useState(false);
  const [campagnesVisible, setCampagnesVisible] = useState(false); // ⭐
  const [outilsVisible, setOutilsVisible] = useState(false);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // ─── Navigation helpers ───
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

  const closeFactures = () => setFacturesVisible(false);

  const openChat = () => setChatVisible(true);

  const closeChat = () => {
    setChatVisible(false);
    if (onChatClose) onChatClose();
  };

  const openServices = () => setServicesVisible(true);
  const closeServices = () => setServicesVisible(false);

  const openFormations = () => setFormationsVisible(true);
  const closeFormations = () => setFormationsVisible(false);

  const openParrainage = () => setParrainageVisible(true);
  const closeParrainage = () => setParrainageVisible(false);

  // ⭐ Campagnes (fil TikTok) — accessible à tous
  const openCampagnes = () => setCampagnesVisible(true);
  const closeCampagnes = () => {
    setCampagnesVisible(false);
    if (onChangedCampagne) onChangedCampagne();
  };

  const handleRequireLogin = ({ pendingAction } = {}) => {
    setFormationsVisible(false);
    if (onLoginPress) {
      onLoginPress(pendingAction);
    }
  };

  return (
    <>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {showLogo ? (
          <TouchableOpacity onPress={openChat} style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>R</Text>
            </View>
            <Text style={styles.logoText}>{title}</Text>
          </TouchableOpacity>
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
              {/* ========== BOUTONS DÉCONNECTÉ ========== */}
              {!user && (
                <>
                 
                  <TouchableOpacity
                    onPress={() => setOnboardingVisible(true)}
                    style={styles.iconBtn}
                  >
                    <Ionicons name="rocket-outline" size={22} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setOutilsVisible(true)} style={styles.iconBtn}>
                     <Ionicons name="construct-outline" size={22} color="#fff" />
                  </TouchableOpacity>


                </>
              )}

              {/* ========== BOUTONS CONNECTÉ ========== */}
              {user && (
                <>
               

                  <TouchableOpacity onPress={openDashboard} style={styles.iconBtn}>
                    <Ionicons name="speedometer-outline" size={22} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={openFactures} style={styles.iconBtn}>
                    <Ionicons
                      name="document-text-outline"
                      size={22}
                      color="#fff"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={openServices} style={styles.iconBtn}>
                    <Ionicons name="wallet-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                </>
              )}

              {/* ========== ⭐ CAMPAGNES / FIL TIKTOK (accessible à tous) ========== */}
              <TouchableOpacity onPress={openCampagnes} style={styles.iconBtn}>
                <Ionicons name="film-outline" size={22} color="#fff" />
              </TouchableOpacity>

              {/* ========== FORMATIONS ========== */}
              <TouchableOpacity onPress={openFormations} style={styles.iconBtn}>
                <Ionicons name="school-outline" size={22} color="#fff" />
              </TouchableOpacity>

              {/* ========== PARRAINAGE (déconnecté) ========== */}
              {!user && (
                <TouchableOpacity onPress={openParrainage} style={styles.iconBtn}>
                  <Ionicons name="people-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}

              {/* ========== CONNEXION / PROFIL ========== */}
              {user ? (
                <TouchableOpacity
                  onPress={() => setShowProfilModal(true)}
                  style={styles.iconBtn}
                >
                  {user?.photo ? (
                    <Image
                      source={{ uri: user.photo }}
                      style={{ width: 24, height: 24, borderRadius: 12 }}
                    />
                  ) : (
                    <Ionicons name="person-outline" size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onLoginPress} style={styles.userBtn}>
                  <Ionicons name="log-in-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}

          {rightIcon && (
            <TouchableOpacity onPress={onRightPress} style={styles.iconSpacing}>
              <Ionicons name={rightIcon} size={22} color="#fff" />
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

        {/* ========== MODAL OUTILS ========== */}
      <Outils visible={outilsVisible} onClose={() => setOutilsVisible(false)} />

      {/* ========== MODAL FACTURES ========== */}
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

      {/* ========== MODAL DASHBOARD ========== */}
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

      {/* ========== MODAL SERVICES ========== */}
      <Modal
        visible={servicesVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeServices}
        statusBarTranslucent={true}
      >
        <ServicesScreen
          visible={servicesVisible}
          onClose={closeServices}
          colors={colors}
          societeId={societeId}
          boutiqueId={boutiqueId}
          user={user}
        />
      </Modal>

      {/* ========== MODAL FORMATIONS ========== */}
      <Modal
        visible={formationsVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeFormations}
        statusBarTranslucent={true}
      >
        <FormationsScreen
          visible={formationsVisible}
          onClose={closeFormations}
          societeId={societeId}
          user={user}
          onRequireLogin={handleRequireLogin}
        />
      </Modal>

      {/* ========== MODAL PARRAINAGE ========== */}
      <Modal
        visible={parrainageVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeParrainage}
        statusBarTranslucent={true}
      >
        <Parrainage onBack={closeParrainage} />
      </Modal>

      {/* ========== ⭐ MODAL CAMPAGNES (Fil TikTok) ========== */}
      <Modal
        visible={campagnesVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeCampagnes}
        statusBarTranslucent={true}
      >
        <Campagnes
          onBack={closeCampagnes}
          societeId={societeId}
          user={user}
        />
      </Modal>

      {/* ========== MODAL PROFIL ========== */}
      <Profil
        visible={showProfilModal}
        onClose={() => setShowProfilModal(false)}
        societeId={societeId}
        user={user}
        onProfilUpdated={(updated) => {
          if (onUserUpdated) onUserUpdated(updated);
        }}
        onLogout={onLogoutPress}
      />

      {/* ========== MODAL CHAT IA ========== */}
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

  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpacing: {
    marginRight: 16,
  },
  backBtn: {
    padding: 4,
  },
  userBtn: {
    padding: 4,
    marginRight: 8,
  },
  iconBtn: {
    padding: 4,
    marginRight: 8,
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#075E54',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});