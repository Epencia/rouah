// Accueil.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Keyboard,
  Pressable,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from './Header';
import { offlineFetch } from '../services/offlineApi';

// ============ CONSTANTES API ============
const API_URL = 'https://rouah.net/api/api-acteur.php';
const FACTURE_API_URL = 'https://rouah.net/api/api-facture.php';
const VENTE_API_URL = 'https://rouah.net/api/api-vente.php';
const ACHAT_API_URL = 'https://rouah.net/api/api-achat.php';

// ============ MATRICE DE TRANSFORMATIONS POSSIBLES ============
// Définit les transitions autorisées entre types de documents
const TRANSFORMATIONS = {
  // Documents de VENTE (client)
  vente: {
    'Devis': ['Bon de commande', 'Facture'],
    'Bon de commande': ['Bon de livraison', 'Facture'],
    'Bon de livraison': ['Facture'],
    'Facture': [], // Une facture ne se transforme plus
    'Avoir': [],   // Un avoir ne se transforme plus
  },
  // Documents d'ACHAT (fournisseur)
  achat: {
    'Devis': ['Bon de commande', 'Facture'],
    'Bon de commande': ['Bon de livraison', 'Facture'],
    'Bon de livraison': ['Facture'],
    'Facture': [],
    'Avoir': [],
  }
};

// Normalise le type pour comparaison (facture vs Facture)
const normalizeType = (t) => {
  if (!t) return '';
  const s = String(t).trim();
  if (s.toLowerCase() === 'Facture') return 'Facture';
  return s;
};

// Retourne les transformations possibles pour un type donné
// Accepte : 'Devis', 'devis', 'bon_de_commande', 'Bon de commande', 'facture', etc.
const getPossibleTransformations = (currentType, isFournisseur) => {
  if (!currentType) return [];

  const key = isFournisseur ? 'achat' : 'vente';
  const map = TRANSFORMATIONS[key];

  // 1. Normaliser : minuscules + remplacer _ et - par des espaces
  const normalized = String(currentType)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Table de correspondance → clé canonique de la matrice
  const canonicalMap = {
    'devis':            'Devis',
    'bon de commande':  'Bon de commande',
    'bon de livraison': 'Bon de livraison',
    'facture':          'Facture',
    'avoir':            'Avoir',
  };

  const canonicalType = canonicalMap[normalized];
  if (!canonicalType) {
    console.warn('⚠️ Type de document non reconnu:', currentType);
    return [];
  }

  return map[canonicalType] || [];
};

// Détermine si un document peut être annulé
// (tous sauf ceux déjà annulés)
const canCancelDocument = (doc) => {
  const statut = (doc?.statut || '').toLowerCase();
  return statut !== 'annule' && statut !== 'annulé';
};

// ============ COMPOSANT MODAL D'AJOUT D'ACTEUR ============
const AddActeurModal = ({ visible, onClose, onSuccess, type, societeId, user }) => {
  const [form, setForm] = useState({
    nom_prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    categorie: 'physique',
    registre_commerce: '',
    compte_contribuable: '',
    regime_imposition: '',
    plafond_credit: '0',
    statut: 'actif',
  });
  const [loading, setLoading] = useState(false);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nom_prenom.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        action: 'create_acteur',
        nom_prenom: form.nom_prenom.trim(),
        telephone: form.telephone.trim() || undefined,
        email: form.email.trim() || undefined,
        adresse: form.adresse.trim() || undefined,
        type: type,
        categorie: form.categorie,
        registre_commerce: form.registre_commerce.trim() || undefined,
        compte_contribuable: form.compte_contribuable.trim() || undefined,
        regime_imposition: form.regime_imposition.trim() || undefined,
        plafond_credit: parseFloat(form.plafond_credit) || 0,
        statut: form.statut,
      };
      
      const json = await offlineFetch(API_URL, {
        societe_id: societeId,
        utilisateur_id: user?.utilisateur_id,
        ...payload,
      });
      
      if (json.success) {
        Alert.alert('Succès', `${type === 'client' ? 'Client' : 'Fournisseur'} créé avec succès`);
        setForm({
          nom_prenom: '',
          telephone: '',
          email: '',
          adresse: '',
          categorie: 'physique',
          registre_commerce: '',
          compte_contribuable: '',
          regime_imposition: '',
          plafond_credit: '0',
          statut: 'actif',
        });
        onSuccess();
        onClose();
      } else {
        Alert.alert('Erreur', json.message || 'Erreur lors de la création');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message || "Impossible de créer l'acteur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Nouveau {type === 'client' ? 'Client' : 'Fournisseur'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom / Raison sociale *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Entrez le nom..."
                placeholderTextColor="#999"
                value={form.nom_prenom}
                onChangeText={(v) => setF('nom_prenom', v)}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeChips}>
                <View style={[styles.chip, styles.chipActive]}>
                  <Text style={[styles.chipText, styles.chipTextActive]}>
                    {type === 'client' ? 'Client' : 'Fournisseur'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Catégorie</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: 'physique', label: 'Personne physique' },
                  { key: 'morale', label: 'Personne morale' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.chip, form.categorie === c.key && styles.chipActive]}
                    onPress={() => setF('categorie', c.key)}
                  >
                    <Text style={[styles.chipText, form.categorie === c.key && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Entrez le téléphone..."
                placeholderTextColor="#999"
                value={form.telephone}
                onChangeText={(v) => setF('telephone', v)}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Entrez l'email..."
                placeholderTextColor="#999"
                value={form.email}
                onChangeText={(v) => setF('email', v)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adresse</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Entrez l'adresse..."
                placeholderTextColor="#999"
                value={form.adresse}
                onChangeText={(v) => setF('adresse', v)}
                multiline
                numberOfLines={2}
              />
            </View>
            {form.categorie === 'morale' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Registre de commerce (RC)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ex: RC-2026-001"
                    placeholderTextColor="#999"
                    value={form.registre_commerce}
                    onChangeText={(v) => setF('registre_commerce', v)}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Compte contribuable (NIF)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ex: 1234567890"
                    placeholderTextColor="#999"
                    value={form.compte_contribuable}
                    onChangeText={(v) => setF('compte_contribuable', v)}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Régime d'imposition</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ex: Réel, Simplifié..."
                    placeholderTextColor="#999"
                    value={form.regime_imposition}
                    onChangeText={(v) => setF('regime_imposition', v)}
                  />
                </View>
              </>
            )}
            {type === 'client' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Plafond de crédit</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="0"
                  placeholderTextColor="#999"
                  value={form.plafond_credit}
                  onChangeText={(v) => setF('plafond_credit', v)}
                  keyboardType="numeric"
                />
              </View>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Statut</Text>
              <View style={styles.chipsRow}>
                {[
                  { key: 'actif', label: 'Actif' },
                  { key: 'inactif', label: 'Inactif' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.chip, form.statut === s.key && styles.chipActive]}
                    onPress={() => setF('statut', s.key)}
                  >
                    <Text style={[styles.chipText, form.statut === s.key && styles.chipTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Créer</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============ COMPOSANT MODAL DE DÉTAIL DOCUMENT ============
const DocumentDetailModal = ({ visible, onClose, document }) => {
  if (!document) return null;

  const montantTTC =
    document.totaux?.total_ttc ??
    document.montant_toutetaxe ??
    document.montant ??
    0;

  const lignes = document.lignes || [];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: '85%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {(document.type || 'Document').toUpperCase()}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.docDetailCard}>
              <View style={styles.docDetailRow}>
                <Text style={styles.docDetailLabel}>Numéro</Text>
                <Text style={styles.docDetailValue}>{document.numero || '—'}</Text>
              </View>

              <View style={styles.docDetailRow}>
                <Text style={styles.docDetailLabel}>Type</Text>
                <Text style={styles.docDetailValue}>{document.type || 'Document'}</Text>
              </View>

              <View style={styles.docDetailRow}>
                <Text style={styles.docDetailLabel}>Date</Text>
                <Text style={styles.docDetailValue}>{document.date || '—'}</Text>
              </View>

              <View style={styles.docDetailRow}>
                <Text style={styles.docDetailLabel}>Montant TTC</Text>
                <Text style={[styles.docDetailValue, styles.docDetailAmount]}>
                  {Number(montantTTC).toLocaleString('fr-FR')} F
                </Text>
              </View>

              <View style={styles.docDetailRow}>
                <Text style={styles.docDetailLabel}>Statut</Text>
                <View
                  style={[
                    styles.docStatusBadge,
                    {
                      backgroundColor:
                        document.statut === 'valide' ? '#dcfce7' : '#fef3c7',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: document.statut === 'valide' ? '#16a34a' : '#d97706',
                      fontWeight: '600',
                      fontSize: 12,
                    }}
                  >
                    {document.statut || 'En cours'}
                  </Text>
                </View>
              </View>

              {(document.acteur_nom || document.client?.nom) && (
                <View style={styles.docDetailRow}>
                  <Text style={styles.docDetailLabel}>Client / Fournisseur</Text>
                  <Text style={styles.docDetailValue}>
                    {document.acteur_nom || document.client?.nom}
                  </Text>
                </View>
              )}

              {lignes.length > 0 && (
                <>
                  <Text style={styles.docDetailSection}>Articles ({lignes.length})</Text>
                  {lignes.slice(0, 8).map((ligne, idx) => (
                    <View key={idx} style={styles.docLigneItem}>
                      <Text style={styles.docLigneName} numberOfLines={1}>
                        {ligne.designation || ligne.article_nom || ligne.nom || 'Article'}
                      </Text>
                      <Text style={styles.docLigneQty}>
                        {ligne.quantite} ×{' '}
                        {Number(ligne.pu_ht ?? ligne.prix_unitaire ?? 0).toLocaleString('fr-FR')} F
                      </Text>
                    </View>
                  ))}
                  {lignes.length > 8 && (
                    <Text style={styles.docLigneMore}>
                      ... et {lignes.length - 8} autres
                    </Text>
                  )}
                </>
              )}

              {document.paiement && (
                <>
                  <Text style={styles.docDetailSection}>Paiement</Text>
                  <View style={styles.docDetailRow}>
                    <Text style={styles.docDetailLabel}>Statut</Text>
                    <Text style={styles.docDetailValue}>
                      {document.paiement.statut || '—'}
                    </Text>
                  </View>
                  {document.paiement.mode && (
                    <View style={styles.docDetailRow}>
                      <Text style={styles.docDetailLabel}>Mode</Text>
                      <Text style={styles.docDetailValue}>{document.paiement.mode}</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={onClose}>
              <Text style={styles.submitBtnText}>Fermer</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============ COMPOSANT MODAL D'ACTIONS DOCUMENT ============
// S'affiche quand on clique sur une bulle : permet de voir, transformer ou annuler
const DocumentActionsModal = ({
  visible,
  onClose,
  document,
  isFournisseur,
  onViewDetail,
  onTransform,
  onCancel,
  onValidate, 
}) => {
  if (!document) return null;

  const docType = document.type || document.raw?.type || 'Document';
  const possibleTransforms = getPossibleTransformations(docType, isFournisseur);
  const cancellable = canCancelDocument(document);
  const isAlreadyCancelled = !cancellable;
  // 🔑 Statut du document (pour conditionner l'affichage du bouton Valider)
  const statut = (document.statut || document.raw?.statut || '').toLowerCase();
  const isAlreadyValidated = statut === 'valide';
  const canValidate = !isAlreadyCancelled && !isAlreadyValidated;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContainer, { maxWidth: 420 }]} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Actions</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Récap du document */}
            <View style={styles.actionDocHeader}>
              <View style={styles.actionDocIconWrapper}>
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color={isFournisseur ? '#c2410c' : '#075E54'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionDocTitle} numberOfLines={1}>
                  {docType}
                </Text>
                <Text style={styles.actionDocSubtitle} numberOfLines={1}>
                  {document.numero || document.raw?.numero || '—'}
                </Text>
                {isAlreadyCancelled && (
                  <Text style={styles.actionDocCancelledBadge}>ANNULÉ</Text>
                )}
              </View>
            </View>

            {/* Bouton Voir détail */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                onClose();
                setTimeout(() => onViewDetail?.(document), 200);
              }}
            >
              <Ionicons name="eye-outline" size={20} color="#075E54" />
              <Text style={styles.actionBtnText}>Voir le détail</Text>
            </TouchableOpacity>

             {/* ✅ NOUVEAU : Bouton Valider (si applicable) */}
        {canValidate && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#16A34A', backgroundColor: '#F0FDF4' }]}
            onPress={() => {
              onClose();
              setTimeout(() => onValidate?.(document), 200);
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#16A34A" />
            <Text style={[styles.actionBtnText, { color: '#16A34A' }]}>
              Valider le document
            </Text>
          </TouchableOpacity>
        )}

            {/* Bouton Transformer */}
            {possibleTransforms.length > 0 && !isAlreadyCancelled && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: '#8B5CF6' }]}
                onPress={() => {
                  onClose();
                  setTimeout(() => onTransform?.(document, possibleTransforms), 200);
                }}
              >
                <Ionicons name="git-compare-outline" size={20} color="#8B5CF6" />
                <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>
                  Transformer ({possibleTransforms.length})
                </Text>
              </TouchableOpacity>
            )}

            {/* Bouton Annuler */}
            {cancellable && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: '#DC2626' }]}
                onPress={() => {
                  onClose();
                  setTimeout(() => onCancel?.(document), 200);
                }}
              >
                <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>
                  Annuler le document
                </Text>
              </TouchableOpacity>
            )}

            {possibleTransforms.length === 0 && isAlreadyCancelled && (
              <View style={styles.actionInfoBox}>
                <Ionicons name="information-circle-outline" size={18} color="#666" />
                <Text style={styles.actionInfoText}>
                  Ce document ne peut plus être transformé ni annulé.
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============ MODAL DE TRANSFORMATION ============
const TransformDocumentModal = ({ visible, onClose, document, possibleTypes, onConfirm, saving }) => {
  if (!document) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: '70%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Transformer le document</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.transformHint}>
              Choisissez le nouveau type pour{' '}
              <Text style={{ fontWeight: '700' }}>
                {document.type || document.raw?.type}
              </Text>{' '}
              {document.numero || document.raw?.numero || ''}
            </Text>

            {possibleTypes.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.transformOption,
                  saving && { opacity: 0.5 },
                ]}
                onPress={() => !saving && onConfirm(t)}
                disabled={saving}
              >
                <Ionicons name="arrow-forward-circle-outline" size={24} color="#8B5CF6" />
                <Text style={styles.transformOptionText}>{t}</Text>
                {saving ? <ActivityIndicator size="small" color="#8B5CF6" /> : null}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#999', marginTop: 20 }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.submitBtnText}>Annuler</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============ COMPOSANTS LISTE ============
const ClientItem = ({ client, onPress }) => (
  <TouchableOpacity style={styles.chatItem} onPress={onPress}>
    <View style={[styles.avatar, { backgroundColor: client.color || '#075E54' }]}>
      <Text style={styles.avatarText}>
       {client.nom_prenom ? client.nom_prenom.charAt(0).toUpperCase() : '?'}
      </Text>
    </View>
    <View style={styles.chatContent}>
      <View style={styles.chatTop}>
        <Text style={styles.chatName}>{client.nom_prenom}</Text>
        <Text style={styles.chatTime}>Client</Text>
      </View>
      <View style={styles.chatBottom}>
        <Text style={styles.chatMessage} numberOfLines={1}>
          {client.telephone || 'Pas de téléphone'} • {client.email || "Pas d'email"}
        </Text>
        {client.statut === 'actif' ? (
          <View style={[styles.statusBadge, { backgroundColor: '#25D366' }]}>
            <Text style={styles.statusText}>Actif</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: '#DC3545' }]}>
            <Text style={styles.statusText}>Inactif</Text>
          </View>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

const FournisseurItem = ({ fournisseur, onPress }) => (
  <TouchableOpacity style={styles.chatItem} onPress={onPress}>
    <View style={[styles.avatar, { backgroundColor: fournisseur.color || '#E74C3C' }]}>
      <Text style={styles.avatarText}>
        {fournisseur.nom_prenom ? fournisseur.nom_prenom.charAt(0).toUpperCase() : '?'}
      </Text>
    </View>
    <View style={styles.chatContent}>
      <View style={styles.chatTop}>
        <Text style={styles.chatName}>{fournisseur.nom_prenom}</Text>
        <Text style={[styles.chatTime, { color: '#E74C3C' }]}>Fournisseur</Text>
      </View>
      <View style={styles.chatBottom}>
        <Text style={styles.chatMessage} numberOfLines={1}>
          {fournisseur.telephone || 'Pas de téléphone'} • {fournisseur.email || "Pas d'email"}
        </Text>
        {fournisseur.statut === 'actif' ? (
          <View style={[styles.statusBadge, { backgroundColor: '#25D366' }]}>
            <Text style={styles.statusText}>Actif</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: '#DC3545' }]}>
            <Text style={styles.statusText}>Inactif</Text>
          </View>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

// ============ BARRE D'ACTIONS VERTICALE FLOTTANTE ============
const DocumentActionsBar = ({ onDocumentPress, isFournisseur = false }) => {
  const documents = isFournisseur
    ? [
        { id: 'Devis', icon: 'document-text-outline', label: 'Devis', color: '#E74C3C' },
        { id: 'Bon de commande', icon: 'cart-outline', label: 'Bon commande', color: '#F39C12' },
        { id: 'Bon de livraison', icon: 'car-outline', label: 'Réception', color: '#34B7F1' },
        { id: 'Facture', icon: 'receipt-outline', label: 'Facture', color: '#FF9500' },
        { id: 'Avoir', icon: 'return-down-back-outline', label: 'Avoir', color: '#8B5CF6' },
      ]
    : [
        { id: 'Devis', icon: 'document-text-outline', label: 'Devis', color: '#075E54' },
        { id: 'Bon de commande', icon: 'cart-outline', label: 'Bon commande', color: '#25D366' },
        { id: 'Bon de livraison', icon: 'car-outline', label: 'Bon livraison', color: '#34B7F1' },
        { id: 'Facture', icon: 'receipt-outline', label: 'Facture', color: '#FF9500' },
        { id: 'Avoir', icon: 'return-down-back-outline', label: 'Avoir', color: '#8B5CF6' },
      ];

  return (
    <View style={styles.floatingActionsContainer}>
      {documents.map((doc) => (
        <TouchableOpacity
          key={doc.id}
          style={styles.floatingActionBtn}
          onPress={() => onDocumentPress(doc.id)}
          activeOpacity={0.75}
        >
          <View style={[styles.floatingActionIcon, { backgroundColor: doc.color }]}>
            <Ionicons name={doc.icon} size={22} color="#fff" />
          </View>
          <Text style={styles.floatingActionLabel} numberOfLines={1}>
            {doc.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============ BULLE DE MESSAGE ============
const MessageBubble = ({ message, onPress }) => {
  const getIcon = () => {
    switch (normalizeType(message.type)) {
      case 'Devis':
      case 'devis':
        return 'document-text-outline';
      case 'Bon de commande':
      case 'bon_commande':
        return 'cart-outline';
      case 'Bon de livraison':
      case 'bon_livraison':
        return 'car-outline';
      case 'Facture':
        return 'receipt-outline';
      case 'Avoir':
      case 'avoir':
        return 'return-down-back-outline';
      default:
        return 'chatbubble-outline';
    }
  };
  const getColor = () => {
    switch (normalizeType(message.type)) {
      case 'Devis':
      case 'devis':
        return '#075E54';
      case 'Bon de commande':
      case 'bon_commande':
        return '#25D366';
      case 'Bon de livraison':
      case 'bon_livraison':
        return '#34B7F1';
      case 'facture':
        return '#FF9500';
      case 'Avoir':
      case 'avoir':
        return '#8B5CF6';
      default:
        return '#666';
    }
  };

  const isCancelled = (message.statut || '').toLowerCase() === 'annule' ||
                     (message.statut || '').toLowerCase() === 'annulé';

  return (
    <TouchableOpacity
      style={[
        styles.bubble,
        message.sent ? styles.bubbleSent : styles.bubbleReceived,
        isCancelled && { opacity: 0.55 },
      ]}
      onPress={() => onPress && onPress(message)}
      activeOpacity={0.7}
    >
      {message.type !== 'reponse' && (
        <View style={styles.bubbleHeader}>
          <Ionicons name={getIcon()} size={16} color={getColor()} />
          <Text style={[styles.bubbleType, { color: getColor() }]}>
            {(message.type || '').replace('_', ' ').toUpperCase()}
          </Text>
          {message.statut && (
            <View
              style={[
                styles.docMiniBadge,
                {
                  backgroundColor: isCancelled
                    ? '#fee2e2'
                    : message.statut === 'valide'
                    ? '#dcfce7'
                    : '#fef3c7',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: '600',
                  color: isCancelled
                    ? '#dc2626'
                    : message.statut === 'valide'
                    ? '#16a34a'
                    : '#d97706',
                }}
              >
                {isCancelled
                  ? '✕ Annulé'
                  : message.statut === 'valide'
                  ? '✓ Validé'
                  : 'En cours'}
              </Text>
            </View>
          )}
        </View>
      )}
      <Text style={[styles.bubbleText, isCancelled && { textDecorationLine: 'line-through' }]}>
        {message.text}
      </Text>
      {message.montant && <Text style={styles.bubbleMontant}>Montant: {message.montant}</Text>}
      <Text style={styles.bubbleTime}>{message.time}</Text>
      <Text style={styles.bubbleTap}>👆 Appuyer pour voir le détail</Text>
    </TouchableOpacity>
  );
};

// ============ FORMULAIRE DE CRÉATION DE DOCUMENT ============
const CreateDocumentForm = ({
  visible,
  onClose,
  onSuccess,
  societeId,
  boutiqueId,
  user,
  acteur,
  docType,
  isFournisseur = false,
}) => {
  const API = isFournisseur ? ACHAT_API_URL : VENTE_API_URL;

  const [articles, setArticles] = useState([]);
  const [lignes, setLignes] = useState([]);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [modalArticleSearch, setModalArticleSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [createAsValide, setCreateAsValide] = useState(false);

  const loadArticles = async (search = '') => {
    try {
      const json = await offlineFetch(API, {
        action: 'list_articles',
        societe_id: societeId,
        boutique_id: boutiqueId,
        utilisateur_id: user?.utilisateur_id,
        search,
      });
      if (json.success) setArticles(json.data || []);
    } catch (e) {
      console.warn('loadArticles error:', e.message);
    }
  };

  const addLigne = (article) => {
    const exist = lignes.find((l) => l.article_id === article.article_id);
    if (exist) {
      setLignes(
        lignes.map((l) =>
          l.article_id === article.article_id
            ? {
                ...l,
                quantite: l.quantite + 1,
                montant: (l.quantite + 1) * l.prix_unitaire,
              }
            : l
        )
      );
    } else {
      const prix = isFournisseur
        ? Number(article.prix_achat || 0)
        : Number(article.prix_vente || 0);
      setLignes([
        ...lignes,
        {
          article_id: article.article_id,
          nom: article.nom,
          prix_unitaire: prix,
          prix_vente: Number(article.prix_vente || 0),
          prix_achat: Number(article.prix_achat || 0),
          quantite: 1,
          montant: prix,
          stock_dispo: article.stock_dispo,
        },
      ]);
    }
    setShowArticleModal(false);
    setModalArticleSearch('');
  };

  const changeQty = (articleId, delta) => {
    setLignes(
      lignes
        .map((l) => {
          if (l.article_id !== articleId) return l;
          const qte = Math.max(0, l.quantite + delta);
          return { ...l, quantite: qte, montant: qte * l.prix_unitaire };
        })
        .filter((l) => l.quantite > 0)
    );
  };

  const totalTTC = lignes.reduce((sum, l) => sum + l.montant, 0);

  const saveDocument = async () => {
    if (!acteur?.acteur_id) {
      Alert.alert('Erreur', 'Acteur manquant');
      return;
    }
    if (lignes.length === 0) {
      Alert.alert('Erreur', 'Ajoutez au moins un article');
      return;
    }
    if (!boutiqueId) {
      Alert.alert(
        'Boutique requise',
        'Aucune boutique active sélectionnée. Veuillez patienter le chargement ou contacter l\'administrateur.',
      );
      return;
    }
    setSaving(true);
    try {
      const json = await offlineFetch(API, {
        action: 'create_document',
        societe_id: societeId,
        boutique_id: boutiqueId,
        utilisateur_id: user?.utilisateur_id,
        type: docType,
        acteur_id: acteur.acteur_id,
        montant_horstaxe: totalTTC,
        montant_toutetaxe: totalTTC,
        avance: 0,
        statut: createAsValide ? 'valide' : 'en attente',
        lignes,
      });
      
      if (json.success) {
        Alert.alert(
          'Succès',
          `${json.type || docType} ${json.numero || ''} créé (${json.statut || 'en attente'})`
        );
        setLignes([]);
        setCreateAsValide(false);
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('Erreur', json.message || 'Échec de la création');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setLignes([]);
      setCreateAsValide(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Ajouter {docType}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.formLabel}>{isFournisseur ? 'Fournisseur' : 'Client'}</Text>
          <View
            style={[
              styles.selectedBox,
              {
                backgroundColor: isFournisseur ? '#fff7ed' : '#f0fdf4',
                borderColor: isFournisseur ? '#fed7aa' : '#bbf7d0',
              },
            ]}
          >
            <Text
              style={{
                fontWeight: '600',
                color: isFournisseur ? '#c2410c' : '#16a34a',
                flex: 1,
              }}
            >
              {acteur?.nom_prenom || '—'}
            </Text>
          </View>

          <Text style={[styles.formLabel, { marginTop: 20 }]}>Articles</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => {
              setModalArticleSearch('');
              loadArticles('');
              setShowArticleModal(true);
            }}
          >
            <Text style={{ color: isFournisseur ? '#c2410c' : '#075E54', fontWeight: '600' }}>
              ＋ Ajouter un article
            </Text>
          </TouchableOpacity>

          {lignes.length > 0 && (
            <>
              <Text style={[styles.formLabel, { marginTop: 16 }]}>Lignes du document</Text>
              {lignes.map((l) => (
                <View key={l.article_id} style={styles.panierItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#333' }}>{l.nom}</Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                      {Number(l.prix_unitaire).toLocaleString('fr-FR')} F × {l.quantite}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => changeQty(l.article_id, -1)}>
                      <Text style={{ fontSize: 22, color: '#999', fontWeight: '600' }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ fontWeight: '700', minWidth: 20, textAlign: 'center' }}>
                      {l.quantite}
                    </Text>
                    <TouchableOpacity onPress={() => changeQty(l.article_id, 1)}>
                      <Text style={{ fontSize: 22, color: '#075E54', fontWeight: '600' }}>＋</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.totalBox}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>Total TTC</Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: isFournisseur ? '#f59e0b' : '#16a34a',
                  }}
                >
                  {totalTTC.toLocaleString('fr-FR')} F
                </Text>
              </View>

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 }}
                onPress={() => setCreateAsValide((v) => !v)}
              >
                <View
                  style={[
                    styles.checkbox,
                    createAsValide && { backgroundColor: '#075E54', borderColor: '#075E54' },
                  ]}
                >
                  {createAsValide && (
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                  )}
                </View>
                <Text style={{ fontSize: 14, color: '#333' }}>
                  Valider immédiatement
                  {docType === 'Bon de livraison' || docType === 'Facture' || docType === 'Avoir'
                    ? ' (impacte le stock)'
                    : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: isFournisseur ? '#c2410c' : '#075E54',
                    opacity: saving ? 0.7 : 1,
                  },
                ]}
                onPress={saveDocument}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer {docType}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      <Modal visible={showArticleModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.formHeader}>
            <TouchableOpacity
              onPress={() => setShowArticleModal(false)}
              style={{ padding: 8 }}
            >
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Ajouter un article</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flex: 1, padding: 16 }}>
            <TextInput
              style={styles.searchInputForm}
              placeholder="Rechercher par nom ou code-barre..."
              placeholderTextColor="#999"
              value={modalArticleSearch}
              onChangeText={(text) => {
                setModalArticleSearch(text);
                loadArticles(text);
              }}
              autoFocus
            />
            <FlatList
              data={articles}
              keyExtractor={(item) => String(item.article_id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItemModal}
                  onPress={() => addLigne(item)}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                      {item.nom}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                      Stock: {item.stock_dispo ?? '—'}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: isFournisseur ? '#f59e0b' : '#16a34a',
                      fontWeight: '700',
                      fontSize: 14,
                    }}
                  >
                    {Number(isFournisseur ? item.prix_achat : item.prix_vente).toLocaleString(
                      'fr-FR'
                    )}{' '}
                    F
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#999' }}>Aucun article trouvé</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

// ============ HOOK : GESTION DES ACTIONS DOCUMENT ============
const useDocumentActions = ({ societeId, user, isFournisseur, onRefresh, boutiqueId }) => {
  const [showDocDetail, setShowDocDetail] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [actionDocument, setActionDocument] = useState(null);
  const [showTransform, setShowTransform] = useState(false);
  const [transformDocument_, setTransformDocument] = useState(null);
  const [transformTypes, setTransformTypes] = useState([]);
  const [transforming, setTransforming] = useState(false);

  // 🔑 API cible : api-vente.php pour client, api-achat.php pour fournisseur
  const DOC_API_URL = isFournisseur ? ACHAT_API_URL : VENTE_API_URL;

  // Ouvre le modal d'actions quand on clique sur une bulle
  const handleDocumentClick = (message) => {
    setActionDocument(message);
    setShowActions(true);
  };

  // Voir le détail complet
  const openDetail = async (message) => {
    const documentId = message.raw?.document_id || message.id;
    if (!documentId) return;
    try {
      const json = await offlineFetch(FACTURE_API_URL, {
        action: 'get_facture',
        societe_id: societeId,
        utilisateur_id: user?.utilisateur_id,
        document_id: documentId,
      });
      if (json.success && json.data) {
        setSelectedDocument(json.data);
        setShowDocDetail(true);
      } else {
        Alert.alert('Erreur', json.message || 'Impossible de charger le détail');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  // Ouvre le modal de transformation
  const openTransform = (message, types) => {
    setTransformDocument(message);
    setTransformTypes(types);
    setShowTransform(true);
  };

  // Effectue la transformation via api-vente/api-achat
  const confirmTransform = async (newType) => {
    const sourceDocument = transformDocument_;
    const documentId = sourceDocument?.raw?.document_id || sourceDocument?.id;
    const sourceType = sourceDocument?.raw?.type || sourceDocument?.type;

    if (!documentId) {
      Alert.alert('Erreur', 'Document introuvable');
      return;
    }
    if (!boutiqueId) {
      Alert.alert('Erreur', 'Aucune boutique active');
      return;
    }

    setTransforming(true);
    try {
      // Étape 1 : demander à l'API les données du parent + nouvelles lignes
      const prep = await offlineFetch(DOC_API_URL, {
        action: 'transformer',
        societe_id: societeId,
        utilisateur_id: user?.utilisateur_id,
        document_parent_id: documentId,
        type: newType,
      });

      if (!prep.success || !prep.data) {
        Alert.alert('Erreur', prep.message || 'Préparation de la transformation impossible');
        setTransforming(false);
        return;
      }

      // Étape 2 : créer le nouveau document avec les données préparées
      const payload = {
        action: 'create_document',
        societe_id: societeId,
        boutique_id: boutiqueId,
        utilisateur_id: user?.utilisateur_id,
        type: prep.data.type,
        acteur_id: prep.data.acteur_id,
        document_parent_id: prep.data.document_parent_id,
        montant_horstaxe: prep.data.montant_horstaxe,
        montant_toutetaxe: prep.data.montant_toutetaxe,
        taxe: prep.data.taxe,
        remise: prep.data.remise,
        avance: 0,
        statut: 'en attente',
        lignes: prep.data.lignes,
      };

      const created = await offlineFetch(DOC_API_URL, payload);

      if (created.success) {
        Alert.alert(
          'Succès',
          `${newType} créé : ${created.numero || ''}${prep.data.parent_numero ? ` (depuis ${prep.data.parent_numero})` : ''}`
        );
        setShowTransform(false);
        setTransformDocument(null);
        onRefresh?.();
      } else {
        Alert.alert('Erreur', created.message || 'Création impossible');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setTransforming(false);
    }
  };

  // Demande confirmation puis annule via api-vente/api-achat
  const confirmCancel = (message) => {
    const documentId = message.raw?.document_id || message.id;
    const docType = message.type || message.raw?.type;
    const docNumero = message.raw?.numero || '';

    Alert.alert(
      'Annuler le document',
      `Voulez-vous vraiment annuler ${docType} ${docNumero} ?\n\n` +
        `${
          docType === 'Bon de livraison' || docType === 'Facture'
            ? 'Le stock sera restauré.'
            : 'Cette action est irréversible.'
        }`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const json = await offlineFetch(DOC_API_URL, {
                action: 'update_status',
                societe_id: societeId,
                utilisateur_id: user?.utilisateur_id,
                document_id: documentId,
                statut: 'annule',
              });

              if (json.success) {
                Alert.alert('Succès', 'Document annulé');
                onRefresh?.();
              } else {
                Alert.alert('Erreur', json.message || 'Annulation impossible');
              }
            } catch (e) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  // Demande confirmation puis valide via api-vente/api-achat
const confirmValidate = (message) => {
  const documentId = message.raw?.document_id || message.id;
  const docType = message.type || message.raw?.type;
  const docNumero = message.raw?.numero || '';
  const statut = (message.statut || message.raw?.statut || '').toLowerCase();

  // Sécurité : ne pas valider un doc déjà validé ou annulé
  if (statut === 'valide') {
    Alert.alert('Information', 'Ce document est déjà validé.');
    return;
  }
  if (statut === 'annule' || statut === 'annulé') {
    Alert.alert('Erreur', 'Impossible de valider un document annulé.');
    return;
  }

  const impactStock =
    docType === 'Bon de livraison' ||
    docType === 'Facture' ||
    docType === 'Avoir';

  Alert.alert(
    'Valider le document',
    `Voulez-vous vraiment valider ${docType} ${docNumero} ?\n\n` +
      (impactStock
        ? '⚠️ Cette validation va impacter le stock.'
        : 'Cette action est irréversible.'),
    [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, valider',
        style: 'default',
        onPress: async () => {
          try {
            const json = await offlineFetch(DOC_API_URL, {
              action: 'update_status',
              societe_id: societeId,
              utilisateur_id: user?.utilisateur_id,
              document_id: documentId,
              statut: 'valide',
            });

            if (json.success) {
              Alert.alert('Succès', `Document validé${impactStock ? ' (stock mis à jour)' : ''}`);
              onRefresh?.();
            } else {
              Alert.alert('Erreur', json.message || 'Validation impossible');
            }
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        },
      },
    ]
  );
};

  return {
    showDocDetail,
    selectedDocument,
    showActions,
    actionDocument,
    showTransform,
    transformDocument: transformDocument_,
    transformTypes,
    transforming,
    setShowDocDetail,
    setShowActions,
    setShowTransform,
    handleDocumentClick,
    openDetail,
    openTransform,
    confirmTransform,
    confirmCancel,
    confirmValidate,
  };
};

// ============ COMPOSANT MODALS PARTAGÉS ============
// Regroupe les modals de détail, actions, transformation pour éviter la duplication
const DocumentModals = ({
  isFournisseur,
  docActions,
  societeId,
  user,
}) => {
  return (
    <>
      <DocumentDetailModal
        visible={docActions.showDocDetail}
        onClose={() => docActions.setShowDocDetail(false)}
        document={docActions.selectedDocument}
      />

      <DocumentActionsModal
        visible={docActions.showActions}
        onClose={() => docActions.setShowActions(false)}
        document={docActions.actionDocument}
        isFournisseur={isFournisseur}
        onViewDetail={(doc) => docActions.openDetail(doc)}
        onTransform={(doc, types) => docActions.openTransform(doc, types)}
        onCancel={(doc) => docActions.confirmCancel(doc)}
        onValidate={(doc) => docActions.confirmValidate(doc)}
      />

      <TransformDocumentModal
        visible={docActions.showTransform}
        onClose={() => docActions.setShowTransform(false)}
        document={docActions.transformDocument}
        possibleTypes={docActions.transformTypes}
        onConfirm={docActions.confirmTransform}
        saving={docActions.transforming}
      />
    </>
  );
};

// ============ CLIENT DETAIL ============
export const ClientDetail = ({ client, onBack, societeId, boutiqueId, user }) => {
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchConversation, setSearchConversation] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDocType, setCreateDocType] = useState('Facture');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);

  const loadHistorique = useCallback(async () => {
    if (!societeId || !client?.acteur_id) return;
    setLoading(true);
    try {
      const json = await offlineFetch(FACTURE_API_URL, {
        action: 'list_by_acteur',
        societe_id: societeId,
        utilisateur_id: user?.utilisateur_id,
        acteur_id: client.acteur_id,
        categorie: 'Vente',
        limit: 50,
      });
      
      if (json.success) {
        const docs = (json.data || []).map((item) => ({
          id: item.id || item.raw?.document_id,
          type: item.type || item.raw?.type?.toLowerCase().replace(/ /g, '_') || 'document',
          text: item.text || `${item.raw?.numero || ''} - ${item.raw?.type || 'Document'}`,
          time: item.time || item.raw?.date,
          sent: item.sent ?? item.raw?.statut === 'valide',
          montant:
            item.montant ||
            (item.raw?.montant_toutetaxe
              ? `${Number(item.raw.montant_toutetaxe).toLocaleString('fr-FR')} F`
              : null),
          statut: item.statut || item.raw?.statut,
          raw: item.raw || item,
        }));
        setHistorique(docs);
      }
    } catch (e) {
      console.warn('Erreur chargement historique:', e.message);
    } finally {
      setLoading(false);
    }
  }, [societeId, client, user]);

  // 🔑 Hook des actions document
  const docActions = useDocumentActions({
    societeId,
    user,
    isFournisseur: false,
    onRefresh: loadHistorique,
     boutiqueId,
  });

  useEffect(() => {
    loadHistorique();
  }, [loadHistorique]);

  // 🔑 Écoute de la hauteur du clavier
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleDocumentPress = (docType) => {
    setCreateDocType(docType);
    setShowCreateForm(true);
  };

  // Appel, SMS et email
  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch(() => {
        Alert.alert('Erreur', 'Impossible de passer l\'appel');
      });
    } else {
      Alert.alert('Information', 'Numéro de téléphone non disponible');
    }
  };

  const handleSMS = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`sms:${phoneNumber}`).catch(() => {
        Alert.alert('Erreur', 'Impossible d\'envoyer le SMS');
      });
    } else {
      Alert.alert('Information', 'Numéro de téléphone non disponible');
    }
  };

  const handleEmail = (email) => {
    if (email) {
      Linking.openURL(`mailto:${email}`).catch(() => {
        Alert.alert('Erreur', 'Impossible d\'envoyer l\'email');
      });
    } else {
      Alert.alert('Information', 'Adresse email non disponible');
    }
  };

  const customIcons = [
    { name: 'call-outline', onPress: () => handleCall(client?.telephone) },
    { name: 'chatbubble-outline', onPress: () => handleSMS(client?.telephone) },
    { name: 'mail-outline', onPress: () => handleEmail(client?.email) },
  ];

  const truncateName = (name, maxLength = 20) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const filteredHistorique = historique.filter((msg) => {
    if (!searchConversation.trim()) return true;
    const q = searchConversation.toLowerCase();
    return (
      (msg.text && msg.text.toLowerCase().includes(q)) ||
      (msg.type && msg.type.toLowerCase().includes(q)) ||
      (msg.montant && String(msg.montant).toLowerCase().includes(q)) ||
      (msg.statut && msg.statut.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      <Header 
        title={client.nom_prenom ? truncateName(client.nom_prenom, 20) : 'Client'}  
        onBack={onBack} 
        showLogo={false}
        customRightIcons={customIcons} 
      />

      <View style={styles.clientInfoCompact}>
        <View style={styles.clientInfoRow}>
          <View style={[styles.avatarSmall, { backgroundColor: client.color || '#075E54' }]}>
            <Text style={styles.avatarTextSmall}>
              {client.nom_prenom ? client.nom_prenom.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.clientInfoText}>
            <Text style={styles.clientNameCompact}>{client.nom_prenom}</Text>
            <Text style={styles.clientSubCompact}>{client.telephone || 'Pas de téléphone'}</Text>
            <Text style={styles.clientSubCompact}>{client.email || "Pas d'email"}</Text>
          </View>
          <View style={styles.clientStatsCompact}>
            <View style={styles.statItemCompact}>
              <Text style={styles.statValueCompact}>{historique.length}</Text>
              <Text style={styles.statLabelCompact}>Docs</Text>
            </View>
            <View style={styles.statDividerCompact} />
            <View style={styles.statItemCompact}>
              <Text style={[styles.statValueCompact, { color: '#25D366' }]}>
                {historique.filter((d) => d.statut === 'valide').length}
              </Text>
              <Text style={styles.statLabelCompact}>Validés</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.detailBody}>
        <ScrollView
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ref={scrollViewRef}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#075E54" style={{ marginTop: 24 }} />
          ) : filteredHistorique.length > 0 ? (
            filteredHistorique.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onPress={docActions.handleDocumentClick}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>
              {searchConversation ? 'Aucun résultat pour cette recherche' : 'Aucun document'}
            </Text>
          )}
        </ScrollView>

        <DocumentActionsBar onDocumentPress={handleDocumentPress} isFournisseur={false} />
      </View>

      <View
        style={[
          styles.whatsappInputBar,
          { marginBottom: keyboardHeight > 0 ? keyboardHeight : 0 },
        ]}
      >
        <View style={styles.whatsappInputContainer}>
          <Ionicons name="search" size={20} color="#667781" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.whatsappInput}
            placeholder="Rechercher dans la conversation..."
            placeholderTextColor="#667781"
            value={searchConversation}
            onChangeText={setSearchConversation}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            blurOnSubmit
          />
          {searchConversation.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchConversation('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#667781" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modals partagés (détail, actions, transformation) */}
      <DocumentModals
        isFournisseur={false}
        docActions={docActions}
        societeId={societeId}
        user={user}
      />

      <CreateDocumentForm
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={loadHistorique}
        societeId={societeId}
        boutiqueId={boutiqueId}
        user={user}
        acteur={client}
        docType={createDocType}
        isFournisseur={false}
      />
    </View>
  );
};

// ============ FOURNISSEUR DETAIL ============
export const FournisseurDetail = ({ fournisseur, onBack, societeId, boutiqueId, user }) => {
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchConversation, setSearchConversation] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDocType, setCreateDocType] = useState('Bon de commande');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);

  const loadHistorique = useCallback(async () => {
    if (!societeId || !fournisseur?.acteur_id) return;
    setLoading(true);
    try {
      const json = await offlineFetch(FACTURE_API_URL, {
        action: 'list_by_acteur',
        societe_id: societeId,
        utilisateur_id: user?.utilisateur_id,
        acteur_id: fournisseur.acteur_id,
        categorie: 'Achat',
        limit: 50,
      });
      
      if (json.success) {
        const docs = (json.data || []).map((item) => ({
          id: item.id || item.raw?.document_id,
          type: item.type || item.raw?.type?.toLowerCase().replace(/ /g, '_') || 'document',
          text: item.text || `${item.raw?.numero || ''} - ${item.raw?.type || 'Document'}`,
          time: item.time || item.raw?.date,
          sent: item.sent ?? item.raw?.statut === 'valide',
          montant:
            item.montant ||
            (item.raw?.montant_toutetaxe
              ? `${Number(item.raw.montant_toutetaxe).toLocaleString('fr-FR')} F`
              : null),
          statut: item.statut || item.raw?.statut,
          raw: item.raw || item,
        }));
        setHistorique(docs);
      }
    } catch (e) {
      console.warn('Erreur chargement historique:', e.message);
    } finally {
      setLoading(false);
    }
  }, [societeId, fournisseur, user]);

  const docActions = useDocumentActions({
    societeId,
    user,
    isFournisseur: true,
    onRefresh: loadHistorique,
     boutiqueId,
  });

  useEffect(() => {
    loadHistorique();
  }, [loadHistorique]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleDocumentPress = (docType) => {
    setCreateDocType(docType);
    setShowCreateForm(true);
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch(() => {
        Alert.alert('Erreur', 'Impossible de passer l\'appel');
      });
    } else {
      Alert.alert('Information', 'Numéro de téléphone non disponible');
    }
  };

  const handleSMS = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`sms:${phoneNumber}`).catch(() => {
        Alert.alert('Erreur', 'Impossible d\'envoyer le SMS');
      });
    } else {
      Alert.alert('Information', 'Numéro de téléphone non disponible');
    }
  };

  const handleEmail = (email) => {
    if (email) {
      Linking.openURL(`mailto:${email}`).catch(() => {
        Alert.alert('Erreur', 'Impossible d\'envoyer l\'email');
      });
    } else {
      Alert.alert('Information', 'Adresse email non disponible');
    }
  };

  const customIcons = [
    { name: 'call-outline', onPress: () => handleCall(fournisseur?.telephone) },
    { name: 'chatbubble-outline', onPress: () => handleSMS(fournisseur?.telephone) },
    { name: 'mail-outline', onPress: () => handleEmail(fournisseur?.email) },
  ];

  const truncateName = (name, maxLength = 20) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const filteredHistorique = historique.filter((msg) => {
    if (!searchConversation.trim()) return true;
    const q = searchConversation.toLowerCase();
    return (
      (msg.text && msg.text.toLowerCase().includes(q)) ||
      (msg.type && msg.type.toLowerCase().includes(q)) ||
      (msg.montant && String(msg.montant).toLowerCase().includes(q)) ||
      (msg.statut && msg.statut.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      <Header
        title={fournisseur.nom_prenom ? truncateName(fournisseur.nom_prenom, 20) : 'Fournisseur'}
        onBack={onBack}
        showLogo={false}
        customRightIcons={customIcons}
      />

      <View style={styles.clientInfoCompact}>
        <View style={styles.clientInfoRow}>
          <View style={[styles.avatarSmall, { backgroundColor: fournisseur.color || '#E74C3C' }]}>
            <Text style={styles.avatarTextSmall}>
              {fournisseur.nom_prenom ? fournisseur.nom_prenom.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.clientInfoText}>
            <Text style={styles.clientNameCompact}>{fournisseur.nom_prenom}</Text>
            <Text style={styles.clientSubCompact}>
              {fournisseur.telephone || 'Pas de téléphone'}
            </Text>
            <Text style={styles.clientSubCompact}>{fournisseur.email || "Pas d'email"}</Text>
          </View>
          <View style={styles.clientStatsCompact}>
            <View style={styles.statItemCompact}>
              <Text style={styles.statValueCompact}>{historique.length}</Text>
              <Text style={styles.statLabelCompact}>Docs</Text>
            </View>
            <View style={styles.statDividerCompact} />
            <View style={styles.statItemCompact}>
              <Text style={[styles.statValueCompact, { color: '#25D366' }]}>
                {historique.filter((d) => d.statut === 'valide').length}
              </Text>
              <Text style={styles.statLabelCompact}>Validés</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.detailBody}>
        <ScrollView
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ref={scrollViewRef}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#E74C3C" style={{ marginTop: 24 }} />
          ) : filteredHistorique.length > 0 ? (
            filteredHistorique.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onPress={docActions.handleDocumentClick}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>
              {searchConversation ? 'Aucun résultat pour cette recherche' : 'Aucun document'}
            </Text>
          )}
        </ScrollView>

        <DocumentActionsBar onDocumentPress={handleDocumentPress} isFournisseur={true} />
      </View>

      <View
        style={[
          styles.whatsappInputBar,
          { marginBottom: keyboardHeight > 0 ? keyboardHeight : 0 },
        ]}
      >
        <View style={styles.whatsappInputContainer}>
          <Ionicons name="search" size={20} color="#667781" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.whatsappInput}
            placeholder="Rechercher dans la conversation..."
            placeholderTextColor="#667781"
            value={searchConversation}
            onChangeText={setSearchConversation}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            blurOnSubmit
          />
          {searchConversation.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchConversation('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#667781" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DocumentModals
        isFournisseur={true}
        docActions={docActions}
        societeId={societeId}
        user={user}
      />

      <CreateDocumentForm
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={loadHistorique}
        societeId={societeId}
        boutiqueId={boutiqueId}
        user={user}
        acteur={fournisseur}
        docType={createDocType}
        isFournisseur={true}
      />
    </View>
  );
};

// ============ ÉCRAN ACCUEIL ============
export default function AccueilScreen({ onSelectClient, onSelectFournisseur, societeId, user, boutiqueId }) {
  const [activeSubTab, setActiveSubTab] = useState('clients');
  const [searchText, setSearchText] = useState('');
  const [clients, setClients] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('client');

  const loadActeurs = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      const [clientsJson, fournisseursJson] = await Promise.all([
        offlineFetch(API_URL, {
          action: 'list_acteurs',
          societe_id: societeId,
          utilisateur_id: user?.utilisateur_id,
          type: 'client',
          search: searchText || undefined,
          limit: 100,
        }),
        offlineFetch(API_URL, {
          action: 'list_acteurs',
          societe_id: societeId,
          utilisateur_id: user?.utilisateur_id,
          type: 'fournisseur',
          search: searchText || undefined,
          limit: 100,
        }),
      ]);
      
      if (clientsJson.success) setClients(clientsJson.data || []);
      if (fournisseursJson.success) setFournisseurs(fournisseursJson.data || []);
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Impossible de charger les acteurs');
    } finally {
      setLoading(false);
    }
  }, [societeId, searchText, user]);

  useEffect(() => {
    if (societeId) loadActeurs();
  }, [societeId, loadActeurs]);

  const getData = () => {
    if (activeSubTab === 'clients') return clients;
    if (activeSubTab === 'fournisseurs') return fournisseurs;
    return [...clients, ...fournisseurs];
  };

  const renderItem = ({ item }) => {
    if (
      item.type === 'client' ||
      activeSubTab === 'clients' ||
      (activeSubTab === 'tous' && item.type === 'client')
    ) {
      return <ClientItem client={item} onPress={() => onSelectClient(item)} />;
    }
    return <FournisseurItem fournisseur={item} onPress={() => onSelectFournisseur(item)} />;
  };

  const openAddModal = (type) => {
    setModalType(type);
    setModalVisible(true);
  };

  return (
    <View style={styles.screenContent}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un client ou fournisseur..."
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.subTabBar}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subTabScrollContent}
        >
          {['clients', 'fournisseurs'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.subTab, activeSubTab === tab && styles.subTabActive]}
              onPress={() => setActiveSubTab(tab)}
            >
              <Ionicons
                name={tab === 'clients' ? 'people' : 'business'}
                size={20}
                color={activeSubTab === tab ? '#075E54' : '#666'}
              />
              <Text style={[styles.subTabText, activeSubTab === tab && styles.subTabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#075E54" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={getData()}
          keyExtractor={(item) => item.acteur_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun acteur trouvé</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Alert.alert("Ajouter", "Choisissez le type d'acteur à ajouter", [
            { text: 'Client', onPress: () => openAddModal('client') },
            { text: 'Fournisseur', onPress: () => openAddModal('fournisseur') },
            { text: 'Annuler', style: 'cancel' },
          ]);
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddActeurModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={loadActeurs}
        type={modalType}
        societeId={societeId}
        user={user}
      />
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  screenContent: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#075E54', marginTop: 12, fontSize: 16 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
    margin: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },

  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  subTabActive: { backgroundColor: '#E8F5E9' },
  subTabText: { fontSize: 14, color: '#666', marginLeft: 6 },
  subTabTextActive: { color: '#075E54', fontWeight: '600' },

  chatItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  chatContent: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '600', color: '#075E54' },
  chatTime: { fontSize: 12, color: '#999' },
  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatMessage: { fontSize: 14, color: '#666', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  clientInfoCompact: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  clientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTextSmall: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clientInfoText: {
    flex: 1,
  },
  clientNameCompact: {
    fontSize: 15,
    fontWeight: '600',
    color: '#075E54',
  },
  clientSubCompact: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  clientStatsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItemCompact: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statValueCompact: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabelCompact: {
    fontSize: 8,
    color: '#999',
    marginTop: 1,
  },
  statDividerCompact: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },

  detailBody: {
    flex: 1,
    position: 'relative',
  },
  messagesArea: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  messagesContent: {
    padding: 12,
    paddingRight: 78,
    paddingBottom: 20,
  },

  floatingActionsContainer: {
    position: 'absolute',
    right: 10,
    bottom: 16,
    alignItems: 'center',
    zIndex: 20,
  },
  floatingActionBtn: { alignItems: 'center', marginBottom: 14 },
  floatingActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingActionLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },

  whatsappInputBar: {
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d1d7db',
  },
  whatsappInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 44,
  },
  whatsappInput: {
    flex: 1,
    fontSize: 16,
    color: '#111b21',
    paddingVertical: 4,
    maxHeight: 100,
  },

  bubble: {
    maxWidth: '82%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  bubbleSent: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  bubbleReceived: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
    gap: 4,
  },
  bubbleType: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
  bubbleText: { fontSize: 14, color: '#333' },
  bubbleMontant: { fontSize: 12, color: '#075E54', fontWeight: '500', marginTop: 2 },
  bubbleTime: { fontSize: 10, color: '#999', alignSelf: 'flex-end', marginTop: 2 },
  bubbleTap: { fontSize: 9, color: '#999', marginTop: 4, fontStyle: 'italic' },
  docMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#25D366',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },

  listContainer: { paddingBottom: 80 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#075E54' },
  modalCloseBtn: { padding: 4 },
  modalBody: { padding: 20, paddingBottom: 30 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  chipActive: { backgroundColor: '#075E54' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#fff' },
  typeChips: { flexDirection: 'row' },
  submitBtn: {
    backgroundColor: '#075E54',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  docDetailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  docDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  docDetailLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  docDetailValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  docDetailAmount: { color: '#075E54', fontSize: 16 },
  docStatusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  docDetailSection: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  docLigneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  docLigneName: { fontSize: 13, color: '#333', flex: 1 },
  docLigneQty: { fontSize: 13, color: '#666', fontWeight: '500' },
  docLigneMore: { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 4 },

  // ===== ACTIONS MODAL =====
  actionDocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  actionDocIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDocTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  actionDocSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  actionDocCancelledBadge: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#075E54',
    marginBottom: 10,
    gap: 12,
    backgroundColor: '#fff',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#075E54',
  },
  actionInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  actionInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },

  // ===== TRANSFORM MODAL =====
  transformHint: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
    lineHeight: 20,
  },
  transformOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
    backgroundColor: '#faf5ff',
    marginBottom: 10,
    gap: 12,
  },
  transformOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#6d28d9',
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  formTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#333' },
  selectedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  selectBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderColor: '#d1d5db',
  },
  panierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginTop: 12,
    backgroundColor: '#f9fafb',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  searchInputForm: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
  },
  listItemModal: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subTabScrollContent: {
    paddingHorizontal: 8,
  },
});