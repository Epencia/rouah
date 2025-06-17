import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';

const { width } = Dimensions.get('window');

export default function Accueil({ navigation }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [user] = useContext(GlobalContext);
  const [membres, setMembres] = useState([]);
  const [zones, setZones] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [localisation, setLocalisation] = useState([]);

  useEffect(() => {
    if (!user || (typeof user === 'object' && Object.keys(user).length === 0)) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Bienvenue' }],
      });
      return;
    }

    getMembres();
    getLocalisation();
    getAlertes();
    getZones();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user]);

  const getMembres = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://adores.cloud/api/membres.php?matricule=${user[0].matricule}`);
      const newData = await response.json();
      setMembres(newData);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocalisation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://adores.cloud/api/history-family.php?matricule=${user[0].matricule}`);
      const newData = await response.json();
      setLocalisation(newData);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://adores.cloud/api/alertes.php?matricule=${user[0].matricule}`);
      const newData = await response.json();
      setAlertes(newData);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getZones = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://adores.cloud/api/zones.php?matricule=${user[0].matricule}`);
      const newData = await response.json();
      setZones(newData);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = () => {
    if (inviteEmail) {
      console.log("Invitation envoyée à:", inviteEmail);
      setInviteEmail('');
    }
  };

  const getStatusColor = (status) => {
    return status === "Oui" ? styles.onlineStatus : styles.offlineStatus;
  };

  const getBatteryColor = (battery) => {
    if (battery > 50) return styles.highBattery;
    if (battery > 20) return styles.mediumBattery;
    return styles.lowBattery;
  };

  const getRoleColor = (role) => {
    return role === "Administrateur" ? styles.adminRole : styles.memberRole;
  };

  const getScoreColor = (score) => {
    if (score < 100) return styles.highScore;
    if (score >= 100) return styles.mediumScore;
    return styles.lowScore;
  };

  const renderMemberCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          {item.photo64 ? (
            <Image 
              alt="" 
              source={{ uri: `data:${item.type};base64,${item.photo64}` }} 
              style={styles.avatar}
            />
          ) : (
            <Image alt="" source={require("../assets/logo.png")} style={styles.avatar}/>
          )}
          <View style={[styles.statusDot, getStatusColor(item.etat_connexion)]} />
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberTitleRow}>
            <Text style={styles.memberName}>{item.nom_prenom}</Text>
            <View style={[styles.roleBadge, getRoleColor(item.role)]}>
              <Text style={styles.badgeText}>{item.role}</Text>
            </View>
          </View>
          <Text style={styles.memberEmail}>Tél : {item.telephone}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker" size={18} color="#6B7280" />
          <Text style={styles.infoText}>{item.pays || "Adresse inconnue"} {item.ville}</Text>
        </View>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="battery-charging" size={18} style={getBatteryColor(item.batterie)} />
            <Text style={styles.infoLabel}>{item.batterie || 0}%</Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="calendar" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>{item.date_geolocalisation}</Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="clock" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>{item.heure_geolocalisation}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.buttonText}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.primaryButton]}>
          <Text style={[styles.buttonText, styles.primaryButtonText]}>Localiser</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderZoneCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.zoneIcon}>
          <MaterialCommunityIcons name="shield" size={24} color="#10B981" />
        </View>
        <View style={styles.cardHeaderContent}>
          <Text style={styles.cardTitle}>{item.nom_zone}</Text>
          <Text style={styles.cardSubtitle}>{item.adresse_zone}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="ruler" size={18} color="#6B7280" />
          <Text style={styles.infoLabel}>Rayon: {item.rayon_zone} m</Text>
        </View>

        <Text style={styles.infoLabel}>Membres dans cette zone</Text>
        {membres.filter(m => m.zones?.includes(item.code_zone)).length > 0 ? (
          <View style={styles.avatarGroup}>
            {membres
              .filter(m => m.zones?.includes(item.code_zone))
              .map(member => (
                <Image 
                  key={member.matricule} 
                  source={member.photo64 ? 
                    { uri: `data:${member.type};base64,${member.photo64}` } : 
                    require("../assets/logo.png")} 
                  style={styles.smallAvatar} 
                />
              ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Aucun membre dans cette zone</Text>
        )}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.buttonText}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.dangerButton]}>
          <Text style={[styles.buttonText, styles.dangerButtonText]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAlertItem = ({ item }) => (
    <View style={styles.alertCard}>
      <View style={[styles.alertIcon, { backgroundColor: `${item.color}20` }]}>
        <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{item.message_alerte}</Text>
        <View style={styles.alertMeta}>
          <Text style={styles.alertMember}>{item.nom_prenom}</Text>
          <Text style={styles.alertTime}>{item.date_alerte} {item.heure_alerte}</Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Une erreur est survenue: {error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
          getMembres();
          getLocalisation();
          getAlertes();
          getZones();
        }}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ma Famille</Text>
          <Text style={styles.headerSubtitle}>
            {membres.filter(m => m.etat_connexion === "Oui").length} membres connectés
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Text style={styles.timeText}>{currentTime.toLocaleTimeString()}</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="clock" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingVertical: 0 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsContainer}
        >
          {['members', 'zones', 'alertes', 'driving'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'members' && 'Membres'}
                {tab === 'zones' && 'Zones'}
                {tab === 'alertes' && 'Alertes'}
                {tab === 'driving' && 'Géolocalisation'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'members' && (
          <>
            <View style={styles.inviteCard}>
              <Text style={styles.sectionTitle}>Inviter un membre</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Email du membre"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                />
                <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
                  <Feather name="send" size={18} color="white" />
                  <Text style={styles.inviteButtonText}>Envoyer</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={membres}
              renderItem={renderMemberCard}
              keyExtractor={item => item.matricule}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="users-off" size={48} color="#E5E7EB" />
                    <Text style={styles.emptyText}>Aucun membre</Text>
                  </View>
                }
            />
          </>
        )}

        {activeTab === 'alertes' && (
          <>
           <View style={[styles.card, styles.emergencyCard, emergencyMode && styles.emergencyActive]}>
              <View style={styles.emergencyHeader}>
                <MaterialCommunityIcons 
                  name="alert-octagon" 
                  size={24} 
                  color={emergencyMode ? "#EF4444" : "#6B7280"} 
                />
                <Text style={styles.emergencyTitle}>Mode Urgence</Text>
              </View>
              <Text style={styles.emergencyDescription}>
                Activez pour partager votre position en temps réel avec votre famille
              </Text>
              <TouchableOpacity
                style={[styles.button, emergencyMode ? styles.dangerButton : styles.secondaryButton]}
                onPress={() => setEmergencyMode(!emergencyMode)}
              >
                <Text style={[styles.buttonText, emergencyMode && styles.dangerButtonText]}>
                  {emergencyMode ? 'Désactiver' : 'Activer'}
                </Text>
              </TouchableOpacity>
            </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Alertes récentes</Text>
              <TouchableOpacity>
                <Text style={styles.sectionAction}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={alertes}
              renderItem={renderAlertItem}
              keyExtractor={item => item.code_alerte}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="shield-off" size={48} color="#E5E7EB" />
                    <Text style={styles.emptyText}>Aucune alerte</Text>
                  </View>
                }
            />
          </View>
          </>
        )}

        {activeTab === 'zones' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Zones de sécurité</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Feather name="plus" size={18} color="white" />
                  <Text style={styles.addButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={zones}
                renderItem={renderZoneCard}
                keyExtractor={item => item.code_zone}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="shield-off" size={48} color="#E5E7EB" />
                    <Text style={styles.emptyText}>Aucune zone définie</Text>
                  </View>
                }
              />
            </View>
          </>
        )}

        {activeTab === 'driving' && (
          <>
            <View style={[styles.card, styles.drivingCard, drivingMode && styles.drivingActive]}>
              <View style={styles.drivingHeader}>
                <MaterialCommunityIcons 
                  name="map-marker-radius-outline" 
                  size={24} 
                  color={drivingMode ? "#3B82F6" : "#6B7280"} 
                />
                <Text style={styles.drivingTitle}>Suivi de localisation</Text>
              </View>
              <Text style={styles.drivingDescription}>
                💡 Conseil: Pour une meilleure précision, autorisez l'accès à votre localisation et activez le GPS sur votre appareil.
              </Text>
              <TouchableOpacity
                style={[styles.button, drivingMode ? styles.primaryButton : styles.secondaryButton]}
                onPress={() => setDrivingMode(!drivingMode)}
              >
                <Text style={[styles.buttonText, drivingMode && styles.primaryButtonText]}>
                  {drivingMode ? 'Arrêter le suivi' : 'Commencer le suivi'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Historique des positions</Text>
                <TouchableOpacity>
                  <Text style={styles.sectionAction}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={localisation}
                renderItem={({ item }) => (
                  <View style={styles.tripCard}>
                    <View style={styles.tripInfo}>
                      <View style={styles.tripRoute}>
                        <Feather name="user" size={16} color="#9CA3AF" />
                        <Text style={styles.tripLocation}>{item.nom_prenom}</Text>
                      </View>
                      <Text style={styles.tripDetails}>{item.derniere_date_localisation} • {item.derniere_heure_localisation}</Text>
                    </View>
                    <View style={styles.localisationcore}>
                      <Text style={[styles.scoreText, getScoreColor(item.nombre_geolocalisations)]}>{item.nombre_geolocalisations}</Text>
                      <Text style={styles.scoreLabel}>/100</Text>
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item.matricule}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="shield-off" size={48} color="#E5E7EB" />
                    <Text style={styles.emptyText}>Aucune localisation</Text>
                  </View>
                }
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 16,
    fontWeight: "bold"
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  activeTab: {
    backgroundColor: '#e5e7eb',
  },
  tabText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#111827',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  cardBody: {
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'white',
    marginLeft: -8,
  },
  statusDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  adminRole: {
    backgroundColor: '#DBEAFE',
  },
  memberRole: {
    backgroundColor: '#E5E7EB',
  },
  onlineStatus: {
    backgroundColor: '#10B981',
  },
  offlineStatus: {
    backgroundColor: '#9CA3AF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 8,
    color: '#374151',
    fontSize: 14,
  },
  infoLabel: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  buttonText: {
    fontWeight: '500',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  primaryButtonText: {
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
  },
  dangerButtonText: {
    color: '#DC2626',
  },
  inviteCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  inputGroup: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    fontSize: 14,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  alertMeta: {
    flexDirection: 'row',
  },
  alertMember: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  alertTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  emergencyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F3F4F6',
  },
  emergencyActive: {
    borderLeftColor: '#EF4444',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  emergencyDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  drivingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F3F4F6',
  },
  drivingActive: {
    borderLeftColor: '#3B82F6',
  },
  drivingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  drivingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  drivingDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
    textAlign: "justify"
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tripInfo: {
    flex: 1,
  },
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tripLocation: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tripDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  localisationcore: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  highScore: {
    color: '#10B981',
  },
  mediumScore: {
    color: '#F59E0B',
  },
  lowScore: {
    color: '#EF4444',
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGroup: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionAction: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  highBattery: {
    color: "green"
  },
  mediumBattery: {
    color: "orange"
  },
  lowBattery: {
    color: "red"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 5
  },
  retryButtonText: {
    color: 'white'
  }
});