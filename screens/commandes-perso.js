import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  RefreshControl, 
  Animated,
  TextInput,
  Alert 
} from 'react-native';
import { GlobalContext } from '../global/GlobalState';
import { Ionicons, Feather } from '@expo/vector-icons';

const TABS = [
  { key: 'all', label: 'Toutes' },
  { key: 'encours', label: 'En cours' },
  { key: 'validees', label: 'Validées' },
  { key: 'rejetees', label: 'Rejetées' },
  { key: 'litiges', label: 'Litiges' },
];

export default function MesCommandes({ apiBaseUrl = 'https://rouah.net/api' }) {
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [commandes, setCommandes] = useState([]);
  const [filteredCommandes, setFilteredCommandes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [user] = useContext(GlobalContext);

  useEffect(() => {
    fetchCommandes();
  }, [tab]);

  useEffect(() => {
    filterCommandes();
  }, [searchText, commandes]);

  async function fetchCommandes() {
    setLoading(true);
    setError(null);

    try {
      const etat = mapTabToEtat(tab);
      const params = new URLSearchParams();
      params.append('boutique', user?.matricule);
      if (etat) params.append('etat', etat);

      const res = await fetch(`${apiBaseUrl}/commandes-perso.php?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setCommandes(json.data);
      } else {
        setError(json.message || 'Erreur serveur');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function mapTabToEtat(t) {
    switch (t) {
      case 'encours': return 'En cours';
      case 'validees': return 'Validée';
      case 'rejetees': return 'Rejetée';
      case 'litiges': return 'Litige';
      default: return '';
    }
  }

  async function updateCommandeStatus(commandeId, newStatus) {
    setProcessingId(commandeId);
    
    try {
      // Utiliser l'API commande-update.php avec les paramètres GET
      const params = new URLSearchParams();
      params.append('numero_commande', commandeId);
      params.append('etat', newStatus);

      const response = await fetch(`${apiBaseUrl}/commande-update.php?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        Alert.alert('Succès', result.message || `Commande ${newStatus.toLowerCase()} avec succès`);
        // Rafraîchir la liste
        fetchCommandes();
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la commande');
      console.error('Erreur update status:', error);
    } finally {
      setProcessingId(null);
    }
  }

  function handleValider(commande) {
    Alert.alert(
      'Confirmer la validation',
      `Voulez-vous valider la commande #${commande.numero_commande} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Valider', 
          style: 'default',
          onPress: () => updateCommandeStatus(commande.numero_commande, 'Validée')
        }
      ]
    );
  }

   function handleRejeter(commande) {
    Alert.alert(
      'Confirmer le rejet',
      `Voulez-vous rejeter la commande #${commande.numero_commande} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Rejeter', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Étape 1 : Rejet de la commande dans la base de données
              await updateCommandeStatus(commande.numero_commande, 'Rejetée');
  
              // Étape 2 : Envoi d’une notification à l’utilisateur concerné
              await sendNotificationToUser(
                commande.utilisateur_id, 
                "Commande rejetée ❌",
                `La commande #${commande.numero_commande} a été rejetée par le client.`
              );
  
              Alert.alert("Commande rejetée", "La commande a été rejetée et le vendeur a été notifié.");
            } catch (error) {
              Alert.alert("❌ Erreur", "Impossible de rejeter la commande ou d’envoyer la notification.");
            }
          }
        }
      ]
    );
  }

  // Notification commande
      const sendNotificationToUser = async (utilisateur_id, titre, description) => {
    
      try {
        const formData = new FormData();
    
        // Remplacer par l'utilisateur cible
    formData.append('utilisateur_id', utilisateur_id);
    formData.append('titre', titre);
    formData.append('description', description);
    
    
        const response = await fetch("https://rouah.net/api/validation-commande.php", {
          method: "POST",
          headers: {
            'Accept': 'application/json',
          },
          body: formData,
        });
    
        const result = await response.json();
    
        if (result.status === "success") {
          Alert.alert("Message","✅ Notification envoyée avec succès !");
        } else {
          Alert.alert("❌","Erreur: " + result.message);
        }
    
      } catch (error) {
        Alert.alert("❌","Erreur côté client");
      }
    };

  function filterCommandes() {
    if (!searchText.trim()) {
      setFilteredCommandes(commandes);
      return;
    }

    const searchLower = searchText.toLowerCase().trim();
    const filtered = commandes.filter(commande => 
      (commande.titre && commande.titre.toLowerCase().includes(searchLower)) ||
      (commande.nom_prenom && commande.nom_prenom.toLowerCase().includes(searchLower)) ||
      (commande.numero_commande && commande.numero_commande.toLowerCase().includes(searchLower)) ||
      (commande.etat_commande && commande.etat_commande.toLowerCase().includes(searchLower)) ||
      (commande.adresse_livraison && commande.adresse_livraison.toLowerCase().includes(searchLower))
    );
    
    setFilteredCommandes(filtered);
  }

  function handleSearch(text) {
    setSearchText(text);
  }

  function clearSearch() {
    setSearchText('');
  }

  function onRefresh() {
    setRefreshing(true);
    fetchCommandes();
  }

  // Formatage des montants
  const formatAmount = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
  };

  function renderItem({ item }) {
    const isEnCours = item.etat_commande?.toLowerCase().includes('en cours');
    const isProcessing = processingId === item.numero_commande;

    return (
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          {item.photo_base64 ? (
            <Image
              source={{ uri: `data:${item.type_photo || 'image/jpeg'};base64,${item.photo_base64}` }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
        </View>

        <View style={styles.infoWrap}>
          <Text style={styles.title}>{item.titre || 'Article inconnu'}</Text>
          <Text style={styles.price}>
            {item.montant_commande ? `${formatAmount(item.montant_commande)} ${item.devise || ''}` : 'Prix indisponible'}
          </Text>

          <View style={styles.rowBetween}>
            <Text style={styles.quantity}>Prix : {formatAmount(item.prix_commande) || 1}</Text>
            <Text style={styles.quantity}>Qté : {formatAmount(item.quantite_commande) || 1}</Text>
            <Text style={[styles.status, statusStyle(item.etat_commande)]}>
              {item.etat_commande || '—'}
            </Text>
          </View>

          <Text style={styles.client}>
            👤 {item.nom_prenom || item.utilisateur_id || 'Client inconnu'}
          </Text>
          <Text style={styles.date}>
            📅 {item.date_commande} • {item.heure_commande}
          </Text>

          {item.adresse_livraison && (
            <Text style={styles.address}>📍 {item.adresse_livraison}</Text>
          )}

          {item.numero_commande && (
            <Text style={styles.orderNumber}>Commande #: {item.numero_commande}</Text>
          )}

          {/* Boutons d'action pour les commandes en cours */}
          {isEnCours && (
            <View style={styles.actionButtons}>
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color="#fa4447" />
                  <Text style={styles.processingText}>Traitement...</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.validateButton]}
                    onPress={() => handleValider(item)}
                    disabled={isProcessing}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Valider</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleRejeter(item)}
                    disabled={isProcessing}
                  >
                    <Ionicons name="close-circle" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Rejeter</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Indicateur pour les commandes traitées (Validées, Rejetées, Litiges) */}
          {!isEnCours && (
            <View style={styles.processedInfo}>
              <Ionicons 
                name={
                  item.etat_commande?.toLowerCase().includes('validée') ? "checkmark-done-circle" : 
                  item.etat_commande?.toLowerCase().includes('rejetée') ? "close-circle" :
                  "alert-circle"
                } 
                size={16} 
                color={
                  item.etat_commande?.toLowerCase().includes('validée') ? "#28a745" : 
                  item.etat_commande?.toLowerCase().includes('rejetée') ? "#dc3545" :
                  "#ffc107"
                } 
              />
              <Text style={[
                styles.processedText,
                { 
                  color: 
                    item.etat_commande?.toLowerCase().includes('validée') ? "#28a745" : 
                    item.etat_commande?.toLowerCase().includes('rejetée') ? "#dc3545" :
                    "#e17055"
                }
              ]}>
                {item.etat_commande || '—'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Skeleton d'attente pendant le chargement
  function SkeletonCard() {
    return (
      <View style={[styles.card, { opacity: 0.6 }]}>
        <View style={[styles.imageWrap, styles.skeletonBlock]} />
        <View style={styles.infoWrap}>
          <View style={[styles.skeletonBlock, { width: '70%', height: 14, marginBottom: 8 }]} />
          <View style={[styles.skeletonBlock, { width: '40%', height: 14, marginBottom: 8 }]} />
          <View style={[styles.skeletonBlock, { width: '90%', height: 12, marginBottom: 4 }]} />
          <View style={[styles.skeletonBlock, { width: '50%', height: 12, marginBottom: 4 }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Feather name="search" size={20} color="gray" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Rechercher une commande..."
          value={searchText}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="gray" />
          </TouchableOpacity>
        )}
      </View>

      {/* Onglets scrollables horizontalement */}
      <View style={styles.tabContainer}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setTab(item.key)}
              style={[styles.tabButton, tab === item.key && styles.tabButtonActive]}
            >
              <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Indicateur de recherche */}
      {searchText.length > 0 && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoText}>
            {filteredCommandes.length} commande(s) trouvée(s) pour "{searchText}"
          </Text>
        </View>
      )}

      {/* Corps */}
      {loading && !refreshing ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(i) => i.toString()}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={{ padding: 12 }}
        />
      ) : error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCommandes}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCommandes}
          keyExtractor={(item) => item.numero_commande || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons 
                name={tab === 'litiges' ? "alert-circle-outline" : "search-outline"} 
                size={50} 
                color="#ccc" 
              />
              <Text style={styles.emptyText}>
                {searchText 
                  ? 'Aucune commande trouvée pour votre recherche' 
                  : tab === 'litiges' 
                    ? 'Aucun litige trouvé' 
                    : 'Aucune commande trouvée'
                }
              </Text>
              {searchText && (
                <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
                  <Text style={styles.clearSearchButtonText}>Effacer la recherche</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const statusStyle = (etat) => {
  if (!etat) return { backgroundColor: '#e5e7eb', color: '#111827' };
  const lower = etat.toLowerCase();
  if (lower.includes('en cours')) return { backgroundColor: '#fff3cd', color: '#856404' };
  if (lower.includes('validée')) return { backgroundColor: '#d4edda', color: '#155724' };
  if (lower.includes('rejetée')) return { backgroundColor: '#f8d7da', color: '#721c24' };
  if (lower.includes('litige')) return { backgroundColor: '#ffeaa7', color: '#e17055' };
  return { backgroundColor: '#e2e3e5', color: '#6c757d' };
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  
  // Barre de recherche
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 10, 
    margin: 10, 
    paddingHorizontal: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: { marginRight: 8 },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#333', 
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  clearButton: {
    padding: 4,
  },
  
  // Indicateur de recherche
  searchInfo: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  searchInfoText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
  },
  
  // Container pour les onglets scrollables
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabBar: {
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tabButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabButtonActive: { 
    backgroundColor: '#fa4447' 
  },
  tabLabel: { 
    color: '#374151', 
    fontWeight: '600',
    fontSize: 14,
  },
  tabLabelActive: { 
    color: '#fff' 
  },
  
  // Carte de commande
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    flexDirection: 'row',
  },
  imageWrap: {
    width: 110,
    height: 110,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  image: { 
    width: '90%', 
    height: '90%', 
    borderRadius: 8 
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  infoWrap: { 
    flex: 1, 
    padding: 10, 
    justifyContent: 'space-between' 
  },
  title: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#111827' 
  },
  price: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#fa4447', 
    marginVertical: 4 
  },
  rowBetween: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 4 
  },
  quantity: { 
    fontSize: 13, 
    color: '#6b7280' 
  },
  status: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6, 
    fontWeight: '600', 
    overflow: 'hidden', 
    fontSize: 12 
  },
  client: { 
    fontSize: 13, 
    color: '#374151', 
    marginTop: 4 
  },
  date: { 
    fontSize: 12, 
    color: '#9ca3af', 
    marginTop: 2 
  },
  address: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginTop: 4 
  },
  orderNumber: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    fontStyle: 'italic',
  },
  
  // Boutons d'action
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  validateButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Indicateur de traitement
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  processingText: {
    color: '#6c757d',
    fontSize: 14,
  },
  
  // Information pour commandes traitées
  processedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    gap: 6,
  },
  processedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // États
  errorWrap: { 
    padding: 20, 
    alignItems: 'center' 
  },
  errorText: { 
    color: '#dc2626',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#fa4447',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  empty: { 
    padding: 40, 
    alignItems: 'center' 
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  skeletonBlock: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
});