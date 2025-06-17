import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions
} from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function FamilyPage() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const [currentTime] = useState(new Date());

  // Données de l'application
   const familyMembers = [
    {
      id: 1,
      name: "Papa",
      email: "papa@famille.com",
      role: "Administrateur",
      avatar: require("../assets/logo.png"),
      status: "En ligne",
      location: "Bureau - Paris 8ème",
      battery: 85,
      lastSeen: "Il y a 2 min",
      device: "iPhone 14 Pro",
      permissions: ["Localisation", "Alertes", "Zones de sécurité"],
      safeZones: ["Maison", "Bureau"],
    },
    {
      id: 2,
      name: "Maman",
      email: "maman@famille.com",
      role: "Administrateur",
      avatar: require("../assets/logo.png"),
      status: "En ligne",
      location: "Maison - Neuilly",
      battery: 92,
      lastSeen: "Il y a 1 min",
      device: "Samsung Galaxy S23",
      permissions: ["Localisation", "Alertes", "Zones de sécurité"],
      safeZones: ["Maison"],
    },
    {
      id: 3,
      name: "Emma",
      email: "emma@famille.com",
      role: "Membre",
      avatar: require("../assets/logo.png"),
      status: "En ligne",
      location: "Lycée Saint-Louis",
      battery: 45,
      lastSeen: "Il y a 5 min",
      device: "iPhone 13",
      permissions: ["Localisation", "Alertes"],
      safeZones: ["École", "Maison"],
    },
    {
      id: 4,
      name: "Lucas",
      email: "lucas@famille.com",
      role: "Membre",
      avatar: require("../assets/logo.png"),
      status: "En ligne",
      location: "Avenue des Champs-Élysées",
      battery: 23,
      lastSeen: "Il y a 30 sec",
      device: "Google Pixel 7",
      permissions: ["Localisation"],
      safeZones: [],
    },
  ];

  const trips = [
    { date: "Aujourd'hui 14:30", from: "Maison", to: "Bureau", distance: "12.5 km", score: 92 },
    { date: "Aujourd'hui 08:15", from: "Bureau", to: "École", distance: "8.2 km", score: 88 },
    { date: "Hier 18:45", from: "École", to: "Maison", distance: "15.1 km", score: 95 },
    { date: "Hier 12:00", from: "Maison", to: "Centre commercial", distance: "6.8 km", score: 90 },
  ];

    // Alertes
    const alerts = [
      {
        id: 1, type: "arrival", member: "Emma",
        message: "Emma est arrivée à l'École", time: "Il y a 15 min",
        icon: "map-marker", color: "#16a34a",
      },
      {
        id: 2, type: "battery", member: "Lucas",
        message: "Batterie faible de Lucas (23%)", time: "Il y a 5 min",
        icon: "battery", color: "#ea580c",
      },
      {
        id: 3, type: "speed", member: "Lucas",
        message: "Lucas roule à 35 km/h", time: "Il y a 1 min",
        icon: "navigation", color: "#2563eb",
      },
    ];

     // Zones de sécurité
      const safeZones = [
        { id: 1, name: "Maison", address: "123 Rue de la Paix, Neuilly", radius: 100 },
        { id: 2, name: "École", address: "Lycée Saint-Louis, Paris", radius: 50 },
        { id: 3, name: "Bureau", address: "Tour Eiffel, Paris 8ème", radius: 200 },
      ];

  // Fonctions utilitaires
   const handleInvite = () => {
    if (inviteEmail) {
      console.log("Invitation envoyée à:", inviteEmail);
      setInviteEmail('');
    }
  };

  const getStatusColor = (status) => {
    return status === "En ligne" ? styles.onlineStatus : styles.offlineStatus;
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
    if (score >= 90) return styles.highScore;
    if (score >= 70) return styles.mediumScore;
    return styles.lowScore;
  };

  // Composants de rendu
  const renderMemberCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Image source={item.avatar} style={styles.avatar} />
          <View style={[styles.statusDot, getStatusColor(item.status)]} />
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberTitleRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            <View style={[styles.roleBadge, getRoleColor(item.role)]}>
              <Text style={styles.badgeText}>{item.role}</Text>
            </View>
          </View>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker" size={18} color="#6B7280" />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="battery-charging" size={18} style={getBatteryColor(item.battery)} />
            <Text style={styles.infoLabel}>{item.battery}%</Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="clock" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>{item.lastSeen}</Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="smartphone" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>{item.device}</Text>
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
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>{item.address}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="ruler" size={18} color="#6B7280" />
          <Text style={styles.infoLabel}>Rayon: {item.radius}m</Text>
        </View>

        <Text style={styles.infoLabel}>Membres dans cette zone</Text>
        {familyMembers.filter(m => m.safeZones.includes(item.name)).length > 0 ? (
          <View style={styles.avatarGroup}>
            {familyMembers.filter(m => m.safeZones.includes(item.name)).map(member => (
              <Image key={member.id} source={member.avatar} style={styles.smallAvatar} />
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
        <Text style={styles.alertTitle}>{item.message}</Text>
        <View style={styles.alertMeta}>
          <Text style={styles.alertMember}>{item.member}</Text>
          <Text style={styles.alertTime}>{item.time}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ma Famille</Text>
          <Text style={styles.headerSubtitle}>{familyMembers.length} membres connectés</Text>
        </View>
        <View style={styles.headerActions}>
          <Text style={styles.timeText}>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="settings" size={22} color="#6B7280" />
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
        {['members', 'zones', 'alerts', 'driving'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'members' && 'Membres'}
              {tab === 'zones' && 'Zones'}
              {tab === 'alerts' && 'Alertes'}
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
              data={familyMembers}
              renderItem={renderMemberCard}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          </>
        )}

        {activeTab === 'alerts' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Alertes récentes</Text>
              <TouchableOpacity>
                <Text style={styles.sectionAction}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={alerts}
              renderItem={renderAlertItem}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          </View>
        )}

        {activeTab === 'zones' && (
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
                <Text style={styles.sectionTitle}>Zones de sécurité</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Feather name="plus" size={18} color="white" />
                  <Text style={styles.addButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={safeZones}
                renderItem={renderZoneCard}
                keyExtractor={item => item.id.toString()}
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
                data={trips}
                renderItem={({ item }) => (
                  <View style={styles.tripCard}>
                    <View style={styles.tripInfo}>
                      <View style={styles.tripRoute}>
                        <Text style={styles.tripLocation}>{item.from}</Text>
                        <Feather name="arrow-right" size={16} color="#9CA3AF" />
                        <Text style={styles.tripLocation}>{item.to}</Text>
                      </View>
                      <Text style={styles.tripDetails}>{item.date} • {item.distance}</Text>
                    </View>
                    <View style={styles.tripScore}>
                      <Text style={[styles.scoreText, getScoreColor(item.score)]}>{item.score}</Text>
                      <Text style={styles.scoreLabel}>/100</Text>
                    </View>
                  </View>
                )}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout
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

  // Header
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
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tabs
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

  // Cards
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

  // Member Card
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
    color: '#1E40AF',
  },
  memberRole: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
  },
  onlineStatus: {
    backgroundColor: '#10B981',
  },
  offlineStatus: {
    backgroundColor: '#9CA3AF',
  },

  // Info display
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

  // Chips
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
  },

  // Buttons
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

  // Forms
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

  // Alerts
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

  // Emergency
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

  // Driving
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
    textAlign:"justify"
  },

  // Trips
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
  tripScore: {
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

  // Zones
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

  // Sections
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

  // Empty states
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
  // batterie
  highBattery:{
    color:"green"
  },
  mediumBattery:{
    color:"red"
  }
});