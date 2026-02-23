import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';

const API_URL = 'https://rouah.net/api/registre-controle.php';

// Fonction pour formater une date
const formatDate = (dateString) => {
  if (!dateString || dateString === '—' || dateString === '0000-00-00') return '—';
  // Si la date est déjà formatée, on la retourne telle quelle
  if (dateString.includes('-') && dateString.length === 10) {
    // Vérifier si c'est du YYYY-MM-DD ou DD-MM-YYYY
    const parts = dateString.split('-');
    if (parts[0].length === 4) {
      // Format YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateString;
};

export default function Registres({ navigation }) {
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('message');

  useEffect(() => {
    navigation.setOptions({ title: 'Registre de contrôle' });
  }, []);

  const fetchRegistre = async () => {
    if (!searchValue.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir un code ou un matricule');
      return;
    }

    setLoading(true);
    setData(null);
    setActiveTab('message');

    try {
      // Déterminer le paramètre à utiliser

      const url = `${API_URL}?matricule=${encodeURIComponent(searchValue.trim())}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        Alert.alert('Non trouvé', result.error);
        setData(null);
      } else {
        setData(result);
      }
    } catch (error) {
      Alert.alert('Erreur réseau', 'Impossible de contacter le serveur.\n' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchValue('');
    setData(null);
    setActiveTab('message');
  };

  // Fonction pour obtenir la couleur en fonction de l'état
  const getEtatColor = (etat) => {
    switch (etat?.toLowerCase()) {
      case 'actif':
        return '#4CAF50';
      case 'en cours':
        return '#FF9800';
      case 'en attente':
        return '#FFC107';
      case 'inactif':
        return '#F44336';
      default:
        return '#666';
    }
  };

  // Fonction pour obtenir le libellé de l'état en français
  const getEtatLabel = (etat) => {
    switch (etat?.toLowerCase()) {
      case 'actif':
        return 'Actif';
      case 'en cours':
        return 'En cours';
      case 'en attente':
        return 'En attente';
      case 'inactif':
        return 'Inactif';
      default:
        return etat || '—';
    }
  };

  // Contenu de l'onglet Personnel
  const renderPersonnel = () => (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Feather name="user" size={28} color="#4c669f" />
        <Text style={styles.resultTitle}>Informations personnelles</Text>
      </View>

      {/* Badge de statut */}
      {data.etat && (
        <View style={[styles.etatBadge, { backgroundColor: getEtatColor(data.etat) }]}>
          <Text style={styles.etatBadgeText}>{getEtatLabel(data.etat)}</Text>
        </View>
      )}


      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Matricule</Text>
        <Text style={styles.infoValue}>{data.matricule || '—'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Nom complet</Text>
        <Text style={styles.infoValue}>{data.nom_prenom || '—'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Date de naissance</Text>
        <Text style={styles.infoValue}>{formatDate(data.date_naissance_formatted || data.date_naissance)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Lieu de naissance</Text>
        <Text style={styles.infoValue}>{data.lieu_naissance || '—'}</Text>
      </View>

       <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Sexe</Text>
        <Text style={styles.infoValue}>{data.sexe|| '—'}</Text>
      </View>


    </View>
  );

  // Contenu de l'onglet Professionnel
  const renderProfessionnel = () => (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Feather name="briefcase" size={28} color="#4c669f" />
        <Text style={styles.resultTitle}>Informations professionnelles</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Catégorie</Text>
        <Text style={[styles.infoValue, styles.categorieBadge]}>
          {data.categorie || '—'}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Diplôme</Text>
        <Text style={styles.infoValue}>{data.diplome || '—'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Spécialité</Text>
        <Text style={styles.infoValue}>{data.specialite || '—'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Période</Text>
        <Text style={styles.infoValue}>
          {formatDate(data.date_debut_formatted || data.date_debut)} → {formatDate(data.date_fin_formatted || data.date_fin)}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Organisme</Text>
        <Text style={styles.infoValue}>{data.organisme || '—'}</Text>
      </View>

      {data.contrat && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type de contrat</Text>
          <Text style={styles.infoValue}>{data.contrat}</Text>
        </View>
      )}


   
    </View>
  );

  // Contenu de l'onglet Message (pour afficher le message formaté de l'API)
  const renderMessage = () => (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Feather name="message-circle" size={28} color="#4c669f" />
        <Text style={styles.resultTitle}>Informations</Text>
      </View>
      
      {data.formatted_message && (
        <RenderHtml
          contentWidth={300}
          source={{ html: data.formatted_message }}
          tagsStyles={{
            p: { fontSize: 16, lineHeight: 24, marginBottom: 10 },
            strong: { fontWeight: 'bold' },
          }}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.whiteBackground}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Titre */}
            <View style={styles.icon}>
              <MaterialCommunityIcons name="file-search-outline" size={80} color="#4c669f" />
            </View>
            
            <Text style={styles.title}>Registre de contrôle</Text>
            <Text style={styles.subtitle}>
              Entrez un code ou un matricule pour consulter les informations
            </Text>



            {/* Zone de recherche */}
            <View style={styles.searchContainer}>
              <View style={styles.inputWrapper}>
                <Feather name="search" size={22} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={"Matricule..."}
                  placeholderTextColor="#aaa"
                  value={searchValue}
                  onChangeText={setSearchValue}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={fetchRegistre}
                />
                {searchValue.length > 0 && (
                  <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                    <Feather name="x" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.searchButton, loading && styles.searchButtonDisabled]}
                onPress={fetchRegistre}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="search" size={20} color="#fff" />
                    <Text style={styles.searchButtonText}>Rechercher</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Résultat avec onglets */}
            {data ? (
              <View style={styles.tabsContainer}>
                {/* Onglets */}
                <View style={styles.tabs}>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'message' && styles.tabActive]}
                    onPress={() => setActiveTab('message')}
                  >
                    <Text style={[styles.tabText, activeTab === 'message' && styles.tabTextActive]}>
                      Général
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'personnel' && styles.tabActive]}
                    onPress={() => setActiveTab('personnel')}
                  >
                    <Text style={[styles.tabText, activeTab === 'personnel' && styles.tabTextActive]}>
                      Personnel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'professionnel' && styles.tabActive]}
                    onPress={() => setActiveTab('professionnel')}
                  >
                    <Text style={[styles.tabText, activeTab === 'professionnel' && styles.tabTextActive]}>
                      Professionnel
                    </Text>
                  </TouchableOpacity>

                  
                </View>

                {/* Contenu selon l'onglet actif */}
                {activeTab === 'message' && renderMessage()}
                {activeTab === 'personnel' && renderPersonnel()}
                {activeTab === 'professionnel' && renderProfessionnel()}
                
              </View>
            ) : (
              !loading && searchValue && (
                <View style={styles.noResult}>
                  <Feather name="file" size={60} color="#999" />
                  <Text style={styles.noResultText}>Aucun résultat trouvé</Text>
                  <Text style={styles.noResultSubtext}>
                    Vérifiez le  matricule saisi
                  </Text>
                </View>
              )
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  whiteBackground: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  searchTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    padding: 4,
    alignSelf: 'center',
  },
  searchTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  searchTypeActive: {
    backgroundColor: '#4c669f',
  },
  searchTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  searchTypeTextActive: {
    color: '#fff',
  },
  searchContainer: {
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4c669f',
    borderRadius: 16,
    height: 56,
    shadowColor: '#4c669f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  searchButtonDisabled: {
    backgroundColor: '#95a5a6',
    shadowColor: '#95a5a6',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 12,
  },
  tabsContainer: {
    marginTop: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4c669f',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 12,
  },
  etatBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  etatBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#7f8c8d',
    fontWeight: '500',
    flex: 0.4,
  },
  infoValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
    textAlign: 'right',
    flex: 0.6,
  },
  categorieBadge: {
    color: '#4c669f',
    fontWeight: 'bold',
  },
  observationContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  observationText: {
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noResult: {
    alignItems: 'center',
    marginTop: 80,
  },
  noResultText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
  },
  noResultSubtext: {
    fontSize: 15,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
  icon: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});