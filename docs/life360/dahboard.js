import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  StatusBar
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

const Life360Dashboard = () => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('map');

  // Données des membres de la famille
  const [familyMembers] = useState([
    {
      id: 1, name: "Papa", avatar: require("../assets/logo.png"),
      status: "En déplacement", location: "Bureau - Paris 8ème",
      battery: 85, speed: 0, lastUpdate: "Il y a 2 min",
      isOnline: true, safeZones: ["Maison", "Bureau"],
    },
    {
      id: 2, name: "Maman", avatar: require("../assets/logo.png"),
      status: "À la maison", location: "Maison - Neuilly",
      battery: 92, speed: 0, lastUpdate: "Il y a 1 min",
      isOnline: true, safeZones: ["Maison"],
    },
    {
      id: 3, name: "Emma", avatar: require("../assets/logo.png"),
      status: "À l'école", location: "Lycée Saint-Louis",
      battery: 45, speed: 0, lastUpdate: "Il y a 5 min",
      isOnline: true, safeZones: ["École", "Maison"],
    },
    {
      id: 4, name: "Lucas", avatar: require("../assets/logo.png"),
      status: "En route", location: "Avenue des Champs-Élysées",
      battery: 23, speed: 35, lastUpdate: "Il y a 30 sec",
      isOnline: true, safeZones: [],
    },
  ]);

  // Zones de sécurité
  const [safeZones] = useState([
    { id: 1, name: "Maison", address: "123 Rue de la Paix, Neuilly", radius: 100 },
    { id: 2, name: "École", address: "Lycée Saint-Louis, Paris", radius: 50 },
    { id: 3, name: "Bureau", address: "Tour Eiffel, Paris 8ème", radius: 200 },
  ]);

  // Alertes
  const [alerts] = useState([
    {
      id: 1, type: "arrival", member: "Emma",
      message: "Emma est arrivée à l'École", time: "Il y a 15 min",
      icon: "map-pin", color: "#16a34a",
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
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status) => {
    const statusColors = {
      "À la maison": { backgroundColor: '#dcfce7', color: '#166534' },
      "À l'école": { backgroundColor: '#dbeafe', color: '#1e40af' },
      "En déplacement": { backgroundColor: '#fef9c3', color: '#854d0e' },
      "En route": { backgroundColor: '#f3e8ff', color: '#6b21a8' }
    };
    return statusColors[status] || { backgroundColor: '#f3f4f6', color: '#374151' };
  };

  const getBatteryColor = (battery) => 
    battery > 50 ? '#16a34a' : battery > 20 ? '#ea580c' : '#dc2626';

  // Composant pour l'onglet Carte
  const MapTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.mapCard}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="map-marker" size={20} color="#3b82f6" />
          <Text style={styles.cardTitle}>Localisation en temps réel</Text>
        </View>
        <View style={styles.mapView}>
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map-marker" size={48} color="#3b82f6" />
            <Text style={styles.mapPlaceholderTitle}>Carte interactive</Text>
            <Text style={styles.mapPlaceholderText}>Localisation des membres en temps réel</Text>
          </View>
          
          {familyMembers.map((member, index) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberMarker,
                { 
                  backgroundColor: member.isOnline ? '#16a34a' : '#9ca3af',
                  top: `${20 + index * 15}%`,
                  left: `${30 + index * 10}%`,
                }
              ]}
              onPress={() => setSelectedMember(member)}
            >
              <Text style={styles.markerInitial}>{member.name[0]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {selectedMember && <MemberInfoCard member={selectedMember} />}
      
      <View style={styles.alertsCard}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="alert" size={20} color="#dc2626" />
          <Text style={styles.cardTitle}>Alertes récentes</Text>
        </View>
        <View>
          {alerts.slice(0, 2).map(alert => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </View>
      </View>
    </View>
  );

  // Composant pour les informations du membre
  const MemberInfoCard = ({ member }) => (
    <View style={styles.memberInfoCard}>
      <View style={styles.memberHeader}>
        <Image source={member.avatar} style={styles.avatar} />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <View style={[styles.statusBadge, getStatusColor(member.status)]}>
            <Text style={styles.statusBadgeText}>{member.status}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.memberDetails}>
        <DetailRow icon="map-marker" text={member.location} />
        <DetailRow icon="battery" text={`${member.battery}%`} color={getBatteryColor(member.battery)} />
        <DetailRow icon="speedometer" text={`${member.speed} km/h`} />
        <DetailRow icon="clock" text={member.lastUpdate} />
      </View>
    </View>
  );

  // Composant pour une ligne de détail
  const DetailRow = ({ icon, text, color = "#6b7280" }) => (
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );

  // Composant pour un élément d'alerte
  const AlertItem = ({ alert }) => (
    <View style={styles.alertItem}>
      <MaterialCommunityIcons name={alert.icon} size={18} color={alert.color} />
      <View style={styles.alertContent}>
        <Text style={styles.alertMessage} numberOfLines={1}>{alert.message}</Text>
        <Text style={styles.alertTime}>{alert.time}</Text>
      </View>
    </View>
  );

  // Composant pour l'onglet Membres
  const MembersTab = () => (
    <FlatList
      data={familyMembers}
      renderItem={({ item }) => <MemberCard member={item} />}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={styles.membersList}
    />
  );

  // Composant pour une carte de membre
  const MemberCard = ({ member }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <Image source={member.avatar} style={styles.avatar} />
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{member.name}</Text>
            <View style={[
              styles.onlineIndicator,
              { backgroundColor: member.isOnline ? '#16a34a' : '#9ca3af' }
            ]} />
          </View>
          <View style={[styles.statusBadge, getStatusColor(member.status)]}>
            <Text style={styles.statusBadgeText}>{member.status}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.memberDetails}>
        <DetailRow icon="map-marker" text={member.location} />
        <DetailRow icon="battery" text={`Batterie: ${member.battery}%`} color={getBatteryColor(member.battery)} />
        <DetailRow icon="speedometer" text={`${member.speed} km/h`} />
        <DetailRow icon="clock" text={member.lastUpdate} />
        
        {member.safeZones.length > 0 && (
          <View style={styles.safeZonesSection}>
            <Text style={styles.sectionTitle}>Zones de sécurité:</Text>
            <View style={styles.safeZonesList}>
              {member.safeZones.map((zone, index) => (
                <View key={index} style={styles.safeZoneBadge}>
                  <Text style={styles.safeZoneText}>{zone}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
            <Text style={[styles.actionButtonText, {color: '#fff'}]}>Localiser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Historique</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Composant pour l'onglet Zones
  const ZonesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.zonesHeader}>
        <View>
          <Text style={styles.sectionHeader}>Zones de sécurité</Text>
          <Text style={styles.sectionSubheader}>Gérez les zones où vos proches sont en sécurité</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <MaterialIcons name="add" size={20} color="white" />
          {!isSmallScreen && <Text style={styles.addButtonText}>Ajouter</Text>}
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={safeZones}
        renderItem={({ item }) => <ZoneCard zone={item} />}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.zonesList}
      />
    </View>
  );

  // Composant pour une carte de zone
  const ZoneCard = ({ zone }) => (
    <View style={styles.zoneCard}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="shield" size={20} color="#16a34a" />
        <Text style={styles.cardTitle}>{zone.name}</Text>
      </View>
      
      <View style={styles.zoneDetails}>
        <DetailRow icon="map-marker" text={zone.address} />
        <View style={styles.detailRow}>
          <View style={styles.zoneRadiusIndicator}>
            <View style={[styles.zoneRadiusDot, { borderColor: '#16a34a' }]} />
          </View>
          <Text style={styles.detailText}>Rayon: {zone.radius}m</Text>
        </View>
      </View>
      
      <View style={styles.membersInZone}>
        <Text style={styles.sectionTitle}>Membres dans cette zone:</Text>
        <View style={styles.memberAvatars}>
          {familyMembers
            .filter(member => member.safeZones.includes(zone.name))
            .map(member => (
              <Image 
                key={member.id} 
                source={member.avatar} 
                style={styles.memberAvatar} 
              />
            ))}
        </View>
      </View>
      
      <View style={styles.zoneActions}>
        <TouchableOpacity style={styles.zoneActionButton}>
          <Text style={styles.zoneActionText}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.zoneActionButton, styles.deleteButton]}>
          <Text style={[styles.zoneActionText, styles.deleteButtonText]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Composant pour l'onglet Alertes
  const AlertsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.alertsHeader}>
        <Text style={styles.sectionHeader}>Centre d'alertes</Text>
        <Text style={styles.sectionSubheader}>Toutes les notifications et alertes de sécurité</Text>
      </View>
      
      <FlatList
        data={alerts}
        renderItem={({ item }) => (
          <View style={styles.alertCard}>
            <View style={[styles.alertIconContainer, {backgroundColor: `${item.color}20`}]}>
              <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.alertContent}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertMessage} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.alertTime}>{item.time}</Text>
              </View>
              <Text style={styles.alertMember}>Membre: {item.member}</Text>
            </View>
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.alertsListContainer}
      />
    </View>
  );

  // Rendu principal
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Famille Martin</Text>
            <Text style={styles.subtitle}>4 membres connectés</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.timeContainer}>
              <Text style={styles.time}>{currentTime.toLocaleTimeString()}</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton}>
              <MaterialIcons name="settings" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Onglets */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          <TabButton 
            icon="map" 
            label="Carte" 
            isActive={activeTab === 'map'} 
            onPress={() => setActiveTab('map')} 
          />
          <TabButton 
            icon="account-group" 
            label="Membres" 
            isActive={activeTab === 'members'} 
            onPress={() => setActiveTab('members')} 
          />
          <TabButton 
            icon="shield-home" 
            label="Zones" 
            isActive={activeTab === 'zones'} 
            onPress={() => setActiveTab('zones')} 
          />
          <TabButton 
            icon="bell" 
            label="Alertes" 
            isActive={activeTab === 'alerts'} 
            onPress={() => setActiveTab('alerts')} 
          />
        </ScrollView>
        
        {/* Contenu des onglets */}
        <View style={styles.content}>
          {activeTab === 'map' && <MapTab />}
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'zones' && <ZonesTab />}
          {activeTab === 'alerts' && <AlertsTab />}
        </View>
      </View>
    </SafeAreaView>
  );
};

// Composant pour un bouton d'onglet
const TabButton = ({ icon, label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tab, isActive && styles.activeTab]}
    onPress={onPress}
  >
    <MaterialCommunityIcons 
      name={icon} 
      size={20} 
      color={isActive ? '#3b82f6' : '#9ca3af'} 
    />
    <Text style={[styles.tabText, isActive && styles.activeTabText]}>{label}</Text>
  </TouchableOpacity>
);

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    marginRight: 12,
  },
  time: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBar: {
    marginBottom: 16,
    maxHeight: 60,
  },
  tabBarContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingBottom: 16,
  },
  
  // Styles pour l'onglet Carte
  mapCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#111827',
  },
  mapView: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapPlaceholder: {
    alignItems: 'center',
    padding: 16,
  },
  mapPlaceholderTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    color: '#111827',
  },
  mapPlaceholderText: {
    color: '#6b7280',
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
  },
  memberMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  markerInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  memberInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  memberDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    color: '#374151',
    fontSize: 14,
    flex: 1,
  },
  alertsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  alertsList: {
    marginTop: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  alertContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertMessage: {
    fontWeight: '500',
    color: '#111827',
    fontSize: 14,
  },
  alertTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  
  // Styles pour l'onglet Membres
  membersList: {
    paddingBottom: 16,
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  safeZonesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    fontSize: 14,
  },
  safeZonesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  safeZoneBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  safeZoneText: {
    fontSize: 12,
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  actionButtonText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#374151',
  },
  
  // Styles pour l'onglet Zones
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionSubheader: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  zonesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
    fontSize: 14,
  },
  zonesList: {
    paddingBottom: 16,
  },
  zoneCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  zoneDetails: {
    marginTop: 12,
  },
  zoneRadiusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneRadiusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#16a34a',
  },
  membersInZone: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginTop: 12,
  },
  memberAvatars: {
    flexDirection: 'row',
    marginTop: 8,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    marginLeft: -8,
  },
  zoneActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  zoneActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  zoneActionText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#374151',
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  
  // Styles pour l'onglet Alertes
  alertsHeader: {
    marginBottom: 16,
  },
  alertsListContainer: {
    paddingBottom: 16,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alertMessage: {
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    fontSize: 14,
  },
  alertTime: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  alertMember: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default Life360Dashboard;