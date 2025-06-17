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
  Switch,
  SectionList
} from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const FamilyPage = () => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);

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
    },
  ];

  const trips = [
    { date: "Aujourd'hui 14:30", from: "Maison", to: "Bureau", distance: "12.5 km", score: 92 },
    { date: "Aujourd'hui 08:15", from: "Bureau", to: "École", distance: "8.2 km", score: 88 },
    { date: "Hier 18:45", from: "École", to: "Maison", distance: "15.1 km", score: 95 },
    { date: "Hier 12:00", from: "Maison", to: "Centre commercial", distance: "6.8 km", score: 90 },
  ];

  const emergencyContacts = [
    { name: "Police/Pompiers/SAMU", number: "112" },
    { name: "Police", number: "17" },
    { name: "Pompiers", number: "18" },
    { name: "SAMU", number: "15" },
    { name: "Dr. Martin", number: "01 42 34 56 78" },
    { name: "Assurance", number: "01 23 45 67 89" },
    { name: "Dépanneuse", number: "01 98 76 54 32" },
  ];

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

  const renderMemberCard = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={styles.avatarContainer}>
          <Image source={item.avatar} style={styles.avatar} />
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            <TouchableOpacity>
              <MaterialIcons name="settings" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text style={styles.memberEmail}>{item.email}</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.statusBadge, getStatusColor(item.status)]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
            <View style={[styles.roleBadge, getRoleColor(item.role)]}>
              <Text style={styles.badgeText}>{item.role}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.memberDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="battery-charging" size={16} style={getBatteryColor(item.battery)} />
          <Text style={styles.detailText}>Batterie: {item.battery}%</Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="clock" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{item.lastSeen}</Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="smartphone" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{item.device}</Text>
        </View>

        <Text style={styles.sectionTitle}>Permissions:</Text>
        <View style={styles.permissionsContainer}>
          {item.permissions.map((permission, index) => (
            <View key={index} style={styles.permissionBadge}>
              <Text style={styles.permissionText}>{permission}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]}>
            <Text style={styles.buttonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.locateButton]}>
            <Text style={styles.buttonText}>Localiser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPermissionItem = ({ item }) => (
    <View style={styles.permissionItem}>
      <View style={styles.permissionHeader}>
        <Image source={item.avatar} style={styles.smallAvatar} />
        <View>
          <Text style={styles.permissionName}>{item.name}</Text>
          <View style={[styles.roleBadge, getRoleColor(item.role)]}>
            <Text style={styles.badgeText}>{item.role}</Text>
          </View>
        </View>
      </View>

      <View style={styles.permissionOptions}>
        <View style={styles.permissionOption}>
          <Text style={styles.permissionLabel}>Localisation</Text>
          <View style={styles.permissionToggle}>
            <Text style={styles.permissionToggleText}>Partager position</Text>
            <Switch value={true} />
          </View>
        </View>
        <View style={styles.permissionOption}>
          <Text style={styles.permissionLabel}>Alertes</Text>
          <View style={styles.permissionToggle}>
            <Text style={styles.permissionToggleText}>Recevoir alertes</Text>
            <Switch value={true} />
          </View>
        </View>
        <View style={styles.permissionOption}>
          <Text style={styles.permissionLabel}>Zones</Text>
          <View style={styles.permissionToggle}>
            <Text style={styles.permissionToggleText}>Gérer zones</Text>
            <Switch value={item.role === "Administrateur"} />
          </View>
        </View>
        <View style={styles.permissionOption}>
          <Text style={styles.permissionLabel}>Urgence</Text>
          <View style={styles.permissionToggle}>
            <Text style={styles.permissionToggleText}>Bouton SOS</Text>
            <Switch value={true} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmergencyContact = ({ item }) => (
    <View style={styles.contactItem}>
      <Text style={styles.contactName}>{item.name}</Text>
      <Text style={styles.contactNumber}>{item.number}</Text>
    </View>
  );

  const renderTripItem = ({ item }) => (
    <View style={styles.tripItem}>
      <View style={styles.tripInfo}>
        <View style={styles.tripRoute}>
          <Text style={styles.tripLocation}>{item.from}</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#6b7280" />
          <Text style={styles.tripLocation}>{item.to}</Text>
        </View>
        <Text style={styles.tripDetails}>
          {item.date} • {item.distance}
        </Text>
      </View>
      <View style={styles.tripScore}>
        <Text style={[styles.scoreText, getScoreColor(item.score)]}>{item.score}/100</Text>
        <Text style={styles.scoreLabel}>Score</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gestion de la famille</Text>
          <Text style={styles.subtitle}>Gérez les membres et leurs permissions</Text>
        </View>
        <TouchableOpacity style={styles.inviteButton}>
          <MaterialIcons name="person-add" size={18} color="white" />
          <Text style={styles.inviteButtonText}>Inviter un membre</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.activeTab]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Membres</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'permissions' && styles.activeTab]}
            onPress={() => setActiveTab('permissions')}
          >
            <Text style={[styles.tabText, activeTab === 'permissions' && styles.activeTabText]}>Permissions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'emergency' && styles.activeTab]}
            onPress={() => setActiveTab('emergency')}
          >
            <Text style={[styles.tabText, activeTab === 'emergency' && styles.activeTabText]}>Urgence</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'driving' && styles.activeTab]}
            onPress={() => setActiveTab('driving')}
          >
            <Text style={[styles.tabText, activeTab === 'driving' && styles.activeTabText]}>Conduite</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'members' && (
          <>
            <View style={styles.inviteCard}>
              <Text style={styles.cardTitle}>Inviter un nouveau membre</Text>
              <View style={styles.inviteInputContainer}>
                <TextInput
                  style={styles.inviteInput}
                  placeholder="Adresse email"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleInvite}>
                  <Text style={styles.sendButtonText}>Envoyer l'invitation</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={familyMembers}
              renderItem={renderMemberCard}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.memberList}
            />
          </>
        )}

        {activeTab === 'permissions' && (
          <View style={styles.permissionsCard}>
            <Text style={styles.cardTitle}>Gestion des permissions</Text>
            <FlatList
              data={familyMembers}
              renderItem={renderPermissionItem}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.permissionList}
            />
          </View>
        )}

        {activeTab === 'emergency' && (
          <>
            <View style={[styles.emergencyCard, emergencyMode && styles.emergencyActive]}>
              <Text style={styles.emergencyTitle}>Mode Urgence</Text>
              <Text style={styles.emergencyDescription}>
                Activez le mode urgence pour partager votre position en temps réel avec tous les membres de la famille.
              </Text>
              <TouchableOpacity
                style={[styles.emergencyButton, emergencyMode && styles.emergencyButtonActive]}
                onPress={() => setEmergencyMode(!emergencyMode)}
              >
                <Text style={[styles.emergencyButtonText, emergencyMode && styles.emergencyButtonTextActive]}>
                  {emergencyMode ? 'Désactiver' : 'Activer'} le mode urgence
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contactsCard}>
              <Text style={styles.cardTitle}>Contacts d'urgence</Text>
              <View style={styles.contactsGrid}>
                <View style={styles.contactsColumn}>
                  <Text style={styles.contactsSubtitle}>Services d'urgence</Text>
                  <FlatList
                    data={emergencyContacts.slice(0, 4)}
                    renderItem={renderEmergencyContact}
                    keyExtractor={(item, index) => index.toString()}
                    scrollEnabled={false}
                  />
                </View>
                <View style={styles.contactsColumn}>
                  <Text style={styles.contactsSubtitle}>Contacts personnels</Text>
                  <FlatList
                    data={emergencyContacts.slice(4)}
                    renderItem={renderEmergencyContact}
                    keyExtractor={(item, index) => index.toString()}
                    scrollEnabled={false}
                  />
                  <TouchableOpacity style={styles.addContactButton}>
                    <Text style={styles.addContactText}>Ajouter contact</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'driving' && (
          <>
            <View style={[styles.drivingCard, drivingMode && styles.drivingActive]}>
              <View style={styles.drivingHeader}>
                <MaterialCommunityIcons name="car" size={24} color={drivingMode ? '#3b82f6' : '#6b7280'} />
                <Text style={styles.drivingTitle}>Mode Conduite</Text>
              </View>
              <Text style={styles.drivingDescription}>
                Activez le mode conduite pour suivre vos trajets et analyser votre comportement au volant.
              </Text>
              <TouchableOpacity
                style={[styles.drivingButton, drivingMode && styles.drivingButtonActive]}
                onPress={() => setDrivingMode(!drivingMode)}
              >
                <Text style={[styles.drivingButtonText, drivingMode && styles.drivingButtonTextActive]}>
                  {drivingMode ? 'Arrêter' : 'Démarrer'} le mode conduite
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tripsCard}>
              <View style={styles.tripsHeader}>
                <MaterialCommunityIcons name="car" size={20} color="#6b7280" />
                <Text style={styles.cardTitle}>Historique des trajets</Text>
              </View>
              <FlatList
                data={trips}
                renderItem={renderTripItem}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  tabContainer: {
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
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
  content: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  inviteCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inviteInputContainer: {
    flexDirection: 'row',
  },
  inviteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 10,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  memberList: {
    paddingBottom: 16,
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
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
  onlineStatus: {
    backgroundColor: '#dcfce7',
  },
  offlineStatus: {
    backgroundColor: '#f3f4f6',
  },
  adminRole: {
    backgroundColor: '#dbeafe',
  },
  memberRole: {
    backgroundColor: '#f3f4f6',
  },
  memberDetails: {},
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    color: '#374151',
  },
  sectionTitle: {
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  permissionBadge: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 12,
    color: '#374151',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  locateButton: {
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  buttonText: {
    fontWeight: '500',
  },
  highBattery: {
    color: '#16a34a',
  },
  mediumBattery: {
    color: '#ca8a04',
  },
  lowBattery: {
    color: '#dc2626',
  },
  permissionsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  permissionList: {
    paddingBottom: 16,
  },
  permissionItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  permissionOptions: {},
  permissionOption: {
    marginBottom: 16,
  },
  permissionLabel: {
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  permissionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionToggleText: {
    color: '#6b7280',
  },
  emergencyCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emergencyActive: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emergencyDescription: {
    color: '#6b7280',
    marginBottom: 16,
  },
  emergencyButton: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  emergencyButtonActive: {
    backgroundColor: '#ef4444',
  },
  emergencyButtonText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  emergencyButtonTextActive: {
    color: 'white',
  },
  contactsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactsGrid: {
    flexDirection: 'row',
  },
  contactsColumn: {
    flex: 1,
    paddingRight: 8,
  },
  contactsSubtitle: {
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contactName: {
    color: '#6b7280',
  },
  contactNumber: {
    fontWeight: '500',
    color: '#111827',
  },
  addContactButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addContactText: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  drivingCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  drivingActive: {
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
  drivingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  drivingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  drivingDescription: {
    color: '#6b7280',
    marginBottom: 16,
  },
  drivingButton: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  drivingButtonActive: {
    backgroundColor: '#3b82f6',
  },
  drivingButtonText: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  drivingButtonTextActive: {
    color: 'white',
  },
  tripsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
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
    fontWeight: '500',
    color: '#111827',
  },
  tripDetails: {
    color: '#6b7280',
    fontSize: 12,
  },
  tripScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
  highScore: {
    color: '#16a34a',
  },
  mediumScore: {
    color: '#ca8a04',
  },
  lowScore: {
    color: '#dc2626',
  },
});

export default FamilyPage;