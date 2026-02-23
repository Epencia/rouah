import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
  RefreshControl,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

const API_BASE_URL = 'https://rouah.net/api/notification.php';

export default function Notifications({ route, navigation }) {
  const { notificationId, notificationType, title, body, data } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNotificationDetails();
  }, []);

  const loadNotificationDetails = async () => {
    try {
      setError(null);
      const response = await fetch(
        `${API_BASE_URL}?id=${notificationId}&type=${notificationType}`
      );
      const result = await response.json();

      if (result.success) {
        setDetails(result.data);
      } else {
        setError(result.error || 'Erreur de chargement');
      }
    } catch (error) {
      console.error('Erreur chargement détails:', error);
      setError('Impossible de charger les détails');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotificationDetails();
  };

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Succès', 'Copié dans le presse-papier');
  };

  const shareNotification = async () => {
    try {
      await Share.share({
        message: `${title}\n\n${body}\n\nDétails: ${JSON.stringify(details, null, 2)}`,
        title: 'Partager notification'
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const openLink = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return `${amount} FCFA`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'actif': '#27ae60',
      'inactif': '#e74c3c',
      'expire': '#95a5a6',
      'suspendu': '#f39c12',
      'en cours': '#3498db',
      'publié': '#27ae60',
      'brouillon': '#7f8c8d',
      'archivé': '#95a5a6',
      'Succes': '#27ae60',
      'Echec': '#e74c3c',
      'En attente': '#f39c12'
    };
    return colors[status] || '#3498db';
  };

  const getStatusLabel = (status) => {
    return status || 'N/A';
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#2c3e50', '#3498db']}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la notification</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={shareNotification}
        >
          <Text style={styles.shareButtonText}>📤</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.notificationInfo}>
        <Text style={styles.notificationTitle}>{title}</Text>
        <Text style={styles.notificationBody}>{body}</Text>
        {notificationType && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{notificationType}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#3498db" />
      <Text style={styles.loadingText}>Chargement des détails...</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorIcon}>❌</Text>
      <Text style={styles.errorTitle}>Erreur</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={loadNotificationDetails}
      >
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSection = (title, icon, children) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderInfoRow = (label, value, copyable = false, linkable = false) => {
    if (!value && value !== 0) return null;
    
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <TouchableOpacity 
          style={styles.infoValueContainer}
          onPress={() => copyable && copyToClipboard(value.toString())}
          disabled={!copyable}
        >
          <Text style={[styles.infoValue, linkable && styles.linkValue]}>
            {value}
          </Text>
          {copyable && <Text style={styles.copyIcon}>📋</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderStatusBadge = (status) => (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
      <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
    </View>
  );

  const renderDetails = () => {
    if (!details) return null;

    switch (notificationType) {
      case 'abonnement':
        return (
          <>
            {renderSection(' Informations générales', '📋', 
              <>
                {renderInfoRow('Code', details.code, true)}
                {renderInfoRow('Nom & Prénom', details.nom_prenom)}
                {renderInfoRow('Téléphone', details.telephone, true)}
                {renderInfoRow('Email', details.email, true)}
              </>
            )}

            {renderSection(' Détails abonnement', '📦',
              <>
                {renderInfoRow('Type', details.type)}
                {renderInfoRow('Niveau', details.niveau)}
                {renderInfoRow('Montant', formatCurrency(details.montant))}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Statut</Text>
                  {renderStatusBadge(details.statut)}
                </View>
                {renderInfoRow('Date début', formatDate(details.date_debut))}
                {renderInfoRow('Date expiration', formatDate(details.date_expiration))}
                {renderInfoRow('État', details.etat)}
              </>
            )}
          </>
        );

      case 'cours':
        return (
          <>
            {renderSection(' Informations cours', '📚',
              <>
                {renderInfoRow('Code', details.code, true)}
                {renderInfoRow('Titre', details.titre)}
                {renderInfoRow('Type', details.type)}
                {renderInfoRow('Matière', details.matiere_nom)}
                {renderInfoRow('Enseignant', details.enseignant)}
                {renderInfoRow('Difficulté', details.difficulte)}
                {renderInfoRow('Durée', details.duree_minutes ? `${details.duree_minutes} min` : 'N/A')}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Statut</Text>
                  {renderStatusBadge(details.statut)}
                </View>
              </>
            )}

            {details.description && renderSection(' Description', '📝',
              <Text style={styles.descriptionText}>{details.description}</Text>
            )}

            {details.contenu && renderSection(' Contenu', '📄',
              <Text style={styles.descriptionText}>{details.contenu}</Text>
            )}

            {renderSection(' Statistiques', '📊',
              <>
                {renderInfoRow('Vues', details.vues)}
                {renderInfoRow('Téléchargements', details.telechargements)}
                {renderInfoRow('Date publication', formatDate(details.date_publication))}
              </>
            )}

            {(details.url_video || details.url_pdf) && renderSection(' Ressources', '🔗',
              <View style={styles.resourcesContainer}>
                {details.url_video && (
                  <TouchableOpacity 
                    style={styles.resourceButton}
                    onPress={() => openLink(details.url_video)}
                  >
                    <Text style={styles.resourceIcon}>🎥</Text>
                    <Text style={styles.resourceText}>Voir la vidéo</Text>
                  </TouchableOpacity>
                )}
                {details.url_pdf && (
                  <TouchableOpacity 
                    style={styles.resourceButton}
                    onPress={() => openLink(details.url_pdf)}
                  >
                    <Text style={styles.resourceIcon}>📄</Text>
                    <Text style={styles.resourceText}>Télécharger PDF</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        );

      case 'transaction':
        return (
          <>
            {renderSection(' Informations transaction', '💰',
              <>
                {renderInfoRow('Numéro', details.numero_transaction, true)}
                {renderInfoRow('Type', details.type_transaction)}
                {renderInfoRow('Montant', formatCurrency(details.montant_transaction))}
                {renderInfoRow('Frais', formatCurrency(details.frais_transaction))}
                {renderInfoRow('Montant total', formatCurrency(details.montant_total))}
                {renderInfoRow('Motif', details.motif_transaction)}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>État</Text>
                  {renderStatusBadge(details.etat_transaction)}
                </View>
              </>
            )}

            {renderSection(' Mode de paiement', '💳',
              <>
                {renderInfoRow('Mode', details.mode_reglement)}
                {renderInfoRow('Numéro', details.numero_reglement, true)}
                {renderInfoRow('Référence', details.reference_reglement, true)}
              </>
            )}

            {renderSection(' Dates', '📅',
              <>
                {renderInfoRow('Date', formatDate(details.date_transaction))}
                {renderInfoRow('Heure', details.heure_transaction)}
              </>
            )}
          </>
        );

      case 'utilisateur':
        return (
          <>
            {renderSection(' Informations utilisateur', '👤',
              <>
                {renderInfoRow('ID', details.utilisateur_id, true)}
                {renderInfoRow('Matricule', details.matricule, true)}
                {renderInfoRow('Nom & Prénom', details.nom_prenom)}
                {renderInfoRow('Login', details.login)}
                {renderInfoRow('Téléphone', details.telephone, true)}
                {renderInfoRow('Email', details.email, true)}
                {renderInfoRow('Rôle', details.role)}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>État</Text>
                  {renderStatusBadge(details.etat)}
                </View>
                {renderInfoRow('Date saisie', formatDate(details.date_saisie))}
              </>
            )}
          </>
        );

      case 'evaluation':
        return (
          <>
            {renderSection(' Question', '📝',
              <Text style={styles.questionText}>{details.question}</Text>
            )}

            {renderSection(' Propositions', '📋',
              <>
                {details.proposition && details.proposition.split('|').map((prop, index) => (
                  <View key={index} style={styles.propositionItem}>
                    <Text style={styles.propositionLetter}>
                      {String.fromCharCode(65 + index)}.
                    </Text>
                    <Text style={styles.propositionText}>{prop}</Text>
                  </View>
                ))}
              </>
            )}

            {renderSection(' Réponse correcte', '✅',
              <View style={styles.correctAnswerContainer}>
                <Text style={styles.correctAnswerLetter}>
                  {details.bonne_reponse}
                </Text>
                {details.proposition && (
                  <Text style={styles.correctAnswerText}>
                    {details.proposition.split('|')[
                      details.bonne_reponse?.charCodeAt(0) - 65
                    ]}
                  </Text>
                )}
              </View>
            )}

            {renderSection(' Informations', '⚙️',
              <>
                {renderInfoRow('Points', details.points)}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Statut</Text>
                  {renderStatusBadge(details.statut)}
                </View>
              </>
            )}
          </>
        );

      case 'verset':
        return (
          <>
            {renderSection(' Verset', '📖',
              <>
                {renderInfoRow('Référence', details.reference, true)}
                <View style={styles.verseContainer}>
                  <Text style={styles.verseText}>"{details.texte}"</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>État</Text>
                  {renderStatusBadge(details.etat)}
                </View>
              </>
            )}
          </>
        );

      case 'registre':
        return (
          <>
            {renderSection(' Informations personnelles', '📋',
              <>
                {renderInfoRow('Code', details.code, true)}
                {renderInfoRow('Matricule', details.matricule, true)}
                {renderInfoRow('Nom & Prénom', details.nom_prenom)}
                {renderInfoRow('Catégorie', details.categorie)}
                {renderInfoRow('Nationalité', details.nationalite)}
                {renderInfoRow('Date naissance', formatDate(details.date_naissance))}
                {renderInfoRow('Lieu naissance', details.lieu_naissance)}
                {renderInfoRow('Sexe', details.sexe)}
              </>
            )}

            {renderSection(' Contact', '📞',
              <>
                {renderInfoRow('Téléphone', details.telephone, true)}
                {renderInfoRow('Email', details.email, true)}
              </>
            )}

            {renderSection(' Formation', '🎓',
              <>
                {renderInfoRow('Diplôme', details.diplome)}
                {renderInfoRow('Spécialité', details.specialite)}
                {renderInfoRow('Contrat', details.contrat)}
                {renderInfoRow('Date début', formatDate(details.date_debut))}
                {renderInfoRow('Date fin', formatDate(details.date_fin))}
                {renderInfoRow('Durée', details.duree)}
              </>
            )}

            {renderSection(' Encadrement', '👥',
              <>
                {renderInfoRow('Signataire', details.signataire)}
                {renderInfoRow('Encadreur', details.encadreur)}
              </>
            )}

            {details.memoire && renderSection('📚 Mémoire', '📚',
              <TouchableOpacity 
                style={styles.memoireButton}
                onPress={() => openLink(details.memoire)}
              >
                <Text style={styles.memoireButtonText}>Télécharger le mémoire</Text>
              </TouchableOpacity>
            )}

            {renderSection(' Appréciation', '⭐',
              <>
                {renderInfoRow('Appréciation', details.appreciation)}
                {renderInfoRow('Organisme', details.organisme)}
                {details.observation && (
                  <Text style={styles.observationText}>{details.observation}</Text>
                )}
                {renderInfoRow('Date délivrance', formatDate(details.date_delivrance))}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>État</Text>
                  {renderStatusBadge(details.etat)}
                </View>
              </>
            )}
          </>
        );

      default:
        return (
          <View style={styles.section}>
            <Text style={styles.defaultText}>
              Aucun détail spécifique disponible pour ce type de notification
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','left', 'right', 'bottom']}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? renderLoading() : error ? renderError() : renderDetails()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    //paddingHorizontal: 20,
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  notificationInfo: {
    paddingHorizontal: 20,
  },
  notificationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  notificationBody: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    lineHeight: 22,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 15,
    color: '#e74c3c',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  sectionContent: {
    marginLeft: 28,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 0.4,
  },
  infoValueContainer: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    textAlign: 'right',
  },
  linkValue: {
    color: '#3498db',
    textDecorationLine: 'underline',
  },
  copyIcon: {
    fontSize: 14,
    marginLeft: 8,
    color: '#7f8c8d',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  questionText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    lineHeight: 22,
  },
  propositionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  propositionLetter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498db',
    width: 30,
  },
  propositionText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  correctAnswerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
  },
  correctAnswerLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
    marginRight: 10,
  },
  correctAnswerText: {
    flex: 1,
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
  },
  verseContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  verseText: {
    fontSize: 16,
    color: '#2c3e50',
    fontStyle: 'italic',
    lineHeight: 24,
    textAlign: 'center',
  },
  resourcesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  resourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  resourceIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  resourceText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  memoireButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  memoireButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  observationText: {
    fontSize: 14,
    color: '#2c3e50',
    fontStyle: 'italic',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});