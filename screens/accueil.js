import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,Linking,
  Dimensions,Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';

const { width } = Dimensions.get('window');

export default function Accueil({ navigation }) {

  const [activeTab, setActiveTab] = useState('members');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState({
    membres: false,
    menaces: false,
    alertes: false,
    zones: false,
  });
  const [errors, setErrors] = useState({
    membres: null,
    menaces: null,
    alertes: null,
    zones: null,
  });

  const [user] = useContext(GlobalContext);
  const [membres, setMembres] = useState([]);
  const [zones, setZones] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [menaces, setMenaces] = useState([]);

  useEffect(() => {
    if (!user || (typeof user === 'object' && Object.keys(user).length === 0)) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Bienvenue' }],
      });
      return;
    }

    getMembres();
    getMenaces();
    getAlertes();
    getZones();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user]);

  const getMembres = async () => {
    setIsLoading(prev => ({ ...prev, membres: true }));
    setErrors(prev => ({ ...prev, membres: null }));
    try {
      const response = await fetch(`https://adores.cloud/api/membres.php?matricule=${user.matricule}`);
      const newData = await response.json();
      setMembres(newData);
    } catch (error) {
      setErrors(prev => ({ ...prev, membres: error.message }));
    } finally {
      setIsLoading(prev => ({ ...prev, membres: false }));
    }
  };


  const getAlertes = async () => {
    setIsLoading(prev => ({ ...prev, alertes: true }));
    setErrors(prev => ({ ...prev, alertes: null }));
    try {
      const response = await fetch(`https://adores.cloud/api/alertes.php?matricule=${user.matricule}`);
      const newData = await response.json();
      setAlertes(newData);
    } catch (error) {
      setErrors(prev => ({ ...prev, alertes: error.message }));
    } finally {
      setIsLoading(prev => ({ ...prev, alertes: false }));
    }
  };

  const getZones = async () => {
    setIsLoading(prev => ({ ...prev, zones: true }));
    setErrors(prev => ({ ...prev, zones: null }));
    try {
      const response = await fetch(`https://adores.cloud/api/zone-dangereuse.php`);
      const newData = await response.json();
      setZones(newData);
    } catch (error) {
      setErrors(prev => ({ ...prev, zones: error.message }));
    } finally {
      setIsLoading(prev => ({ ...prev, zones: false }));
    }
  };

    const getMenaces = async () => {
    setIsLoading(prev => ({ ...prev, menaces: true }));
    setErrors(prev => ({ ...prev, menaces: null }));
    try {
      const response = await fetch(`https://adores.cloud/api/liste-menace.php?matricule=${user.matricule}`);
      const newData = await response.json();
      setMenaces(newData);
    } catch (error) {
      setErrors(prev => ({ ...prev, menaces: error.message }));
    } finally {
      setIsLoading(prev => ({ ...prev, menaces: false }));
    }
  };


  const getSuppressionMembre = async (param1) => {
    try {
      const response = await fetch(`https://adores.cloud/api/suppression-famille.php?code=${param1}`);
      const newData = await response.json();
      Alert.alert("Message",newData);
    } catch (error) {
      Alert.alert("Erreur",error);
    }
  };


// Ouvrir les maps
const openGoogleMaps = (latitude, longitude) => {
  // Vérifier que les coordonnées sont valides
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    Alert.alert("Erreur", "Coordonnées GPS invalides");
    return;
  }
  try {
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    });
    Linking.openURL(url).catch(() => {
      // Si l'ouverture directe échoue, essayer avec l'URL web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`)
        .catch(() => Alert.alert("Erreur", "Impossible d'ouvrir l'application de cartes"));
    });
  } catch (error) {
    Alert.alert("Erreur", "Une erreur s'est produite lors de l'ouverture de la carte");
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


  const renderMemberCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          {item.photo64 ? (
            <Image 
              source={{ uri: `data:${item.type};base64,${item.photo64}` }} 
              style={styles.avatar}
            />
          ) : (
            <Image source={require("../assets/logo.png")} style={styles.avatar}/>
          )}
          <View style={[styles.statusDot, getStatusColor(item.etat_connexion)]} />
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberTitleRow}>
            <Text style={styles.memberName}>{item.nom_prenom}</Text>
          </View>
          <Text style={styles.memberEmail}>{item.role}</Text>
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
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={()=>getSuppressionMembre(item.code_famille)}>
          <Text style={[styles.buttonText, styles.dangerButtonText]}>Supprimer</Text>
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
          <MaterialCommunityIcons name="shield" size={24} color="#DC2626" />
        </View>
        <View style={styles.cardHeaderContent}>
          <Text style={styles.cardTitle}>{item.nom_zone || item.pays_zone+" , "+item.ville_zone}</Text>
          <Text style={styles.cardSubtitle}>{item.adresse_zone}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="ruler" size={18} color="#6B7280" />
          <Text style={styles.infoLabel}>Rayon: {item.rayon_zone} m</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={()=>openGoogleMaps(item.latitude_zone,item.longitude_zone)}>
          <Text style={styles.buttonText}>Localisation</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={()=>Alert.alert("Description",item.observation_zone)}>
          <Text style={[styles.buttonText, styles.dangerButtonText]}>Observations</Text>
        </TouchableOpacity>
      </View>
    </View>
  );



  const renderAlertItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.zoneIcon}>
          <MaterialCommunityIcons name="account-cancel" size={24} color="#DC2626" />
        </View>
        <View style={styles.cardHeaderContent}>
          <Text style={styles.cardTitle}>{item.nom_prenom} 🚨</Text>
          <Text style={styles.cardSubtitle}>{item.date || ""} {item.heure || ""}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="comma" size={18} color="#6B7280" />
          <Text style={styles.infoLabel}>Lieu : {item.adresse || item.pays+" , "+item.ville}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => { Linking.openURL(`tel:${item.telephone}`); }}>
          <Text style={styles.buttonText}>📞 Appeler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={()=>openGoogleMaps(item.latitude,item.longitude)}>
          <Text style={[styles.buttonText, styles.dangerButtonText]}>📡 Localiser</Text>
        </TouchableOpacity>
      </View>
    </View>
  );


   const renderMenaceCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.zoneIcon}>
          <MaterialCommunityIcons name="account-cancel" size={24} color="#DC2626" />
        </View>
        <View style={styles.cardHeaderContent}>
          <Text style={styles.cardTitle}>{item.identite}</Text>
          <Text style={styles.cardSubtitle}>{item.telephone || 'Téléphone non défini'}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="comma" size={18} color="#6B7280" />
          <Text style={styles.infoLabel}>Détails : {item.details}</Text>
        </View>
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

  // Vérifier si toutes les requêtes sont en cours de chargement
  const isAnyLoading = Object.values(isLoading).some(loading => loading);

  // Vérifier si toutes les données sont vides et aucune requête n'est en cours
  const isEmpty = (!membres.length && !zones.length && !alertes.length && !menaces.length) && !isAnyLoading;

  if (isAnyLoading && isEmpty) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
  <View style={styles.headerLeft}>
    {/* Conteneur des 6 cases de code OTP fixe */}
    <View style={styles.codeContainer}>
      {user?.matricule.split('').slice(0, 6).map((digit, index) => (
        <View key={index} style={styles.codeDigit}>
          <Text style={styles.codeText}>{digit}</Text>
        </View>
      ))}
    </View>
    <View style={styles.headerActions}>
    <Text style={styles.headerSubtitle}>
      {membres.filter(m => m.etat_connexion === "Oui").length} membres connectés
    </Text>
    <Text style={styles.timeText}>{currentTime.toLocaleTimeString()}</Text>
    </View>
  </View>
  
</View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingVertical: 0 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsContainer}
        >
          {['members', 'zones', 'alertes', 'menaces'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'members' && 'Membres'}
                {tab === 'zones' && 'Zones'}
                {tab === 'alertes' && 'Alertes'}
                {tab === 'menaces' && 'Menaces'}
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
              <View style={styles.inputGroup}>
                <TouchableOpacity style={styles.inviteButton} onPress={()=>navigation.navigate("Contacts")}>
                  <Feather name="send" size={18} color="white" />
                  <Text style={styles.inviteButtonText}>Intégrer un membre</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isLoading.membres ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : errors.membres ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Erreur lors du chargement des membres : {errors.membres}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={getMembres}>
                  <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={membres}
                renderItem={renderMemberCard}
                keyExtractor={item => item.matricule}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="shield-off" size={48} color="#E5E7EB" />
                    <Text style={styles.emptyText}>Aucun membre</Text>
                  </View>
                }
              />
            )}
          </>
        )}

        {activeTab === 'alertes' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Alertes récentes</Text>
                <TouchableOpacity>
                  <Text style={styles.sectionAction}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              {isLoading.alertes ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : errors.alertes ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Erreur lors du chargement des alertes : {errors.alertes}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={getAlertes}>
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={alertes}
                  renderItem={renderAlertItem}
                  keyExtractor={item => item.id_geoip}
                  scrollEnabled={false}
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons name="shield-off" size={48} color="#E5E7EB" />
                      <Text style={styles.emptyText}>Aucune alerte</Text>
                    </View>
                  }
                />
              )}
            </View>
          </>
        )}

        {activeTab === 'zones' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Zones dangereuses</Text>
                <TouchableOpacity style={styles.addButton} onPress={()=> navigation.navigate("Edition de zone")}>
                  <Feather name="plus" size={18} color="white" />
                  <Text style={styles.addButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
              {isLoading.zones ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : errors.zones ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Erreur lors du chargement des zones : {errors.zones}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={getZones}>
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
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
              )}
            </View>
          </>
        )}

        {activeTab === 'menaces' && (
          <>

            <View style={styles.section}>
               <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Menaces</Text>
                <TouchableOpacity style={styles.addButton} onPress={()=> navigation.navigate("Edition de zone")}>
                  <Feather name="plus" size={18} color="white" />
                  <Text style={styles.addButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
              {isLoading.menaces ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : errors.menaces ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Erreur lors du chargement : {errors.menaces}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={getLocalisation}>
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={menaces}
                  renderItem={renderMenaceCard}
                  keyExtractor={(item) => item.code}
                  scrollEnabled={false}
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons name="shield-off" size={48} color="#E5E7EB" />
                      <Text style={styles.emptyText}>Aucune menace</Text>
                    </View>
                  }
                />
              )}
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
    justifyContent: 'space-between',
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
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#FEE2E2',
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
  },
  codeContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
  alignItems: 'center',         // Centre verticalement les digits dans la ligne
  alignSelf: 'center',          // Centre horizontalement le container lui-même (si largeur automatique)
},
codeDigit: {
  width: 47,
  height: 50,
  borderWidth: 1,
  borderColor: '#3B82F6', // Couleur bleue pour les bordures
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#EFF6FF', // Fond bleu très clair
  marginHorizontal:6
},
codeText: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#1E40AF', // Couleur bleu foncé pour les chiffres
},
});