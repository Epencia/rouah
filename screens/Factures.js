// screens/FacturesScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Alert, Modal, ScrollView, RefreshControl, Platform, Share,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { offlineFetch } from '../services/offlineApi';

// ⭐ UN SEUL endpoint : api-accueil.php (couvre Vente + Achat + Facture)
const API_URL = 'https://rouah.net/api/api-accueil.php';
const IMPRESSION_API_URL = 'https://rouah.net/api/api-impression.php';

// ============ HELPERS API ============
// api-accueil.php utilise des noms d'action suffixés "_achat" pour la catégorie Achat
function mapActionForCategory(action, categorie) {
  const isAchat = (categorie || '').toLowerCase() === 'achat';
  if (!isAchat) return action;
  switch (action) {
    case 'transformer':     return 'transformer_achat';
    case 'update_status':   return 'update_status_achat';
    case 'create_document': return 'create_document_achat';
    case 'get_document':    return 'get_document_achat';
    default:                return action;
  }
}

// ============ TRANSITIONS ============
const TRANSITIONS = {
  'Devis': ['Bon de commande', 'Facture'],
  'Bon de commande': ['Bon de livraison', 'Facture'],
  'Bon de livraison': ['Facture'],
  'Facture': ['Avoir'],
};

function money(v) {
  return Number(v || 0).toLocaleString('fr-FR');
}

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getBadgeLabel = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'facture') return 'FACTURE';
  if (t === 'devis') return 'DEVIS';
  if (t === 'bon de commande') return 'BON DE COMMANDE';
  if (t === 'bon de livraison') return 'BON DE LIVRAISON';
  if (t === 'avoir') return 'AVOIR';
  return 'DOCUMENT COMMERCIAL';
};

const normalizeListItem = (item) => {
  const id = item.document_id || item.id || item.raw?.document_id;
  const type = item.type || item.raw?.type || '';
  const montant =
    item.montant_toutetaxe ??
    item.montant ??
    item.totaux?.total_ttc ??
    item.raw?.montant_toutetaxe ??
    0;
  const clientNom =
    item.client_nom ||
    item.acteur_nom ||
    item.client?.nom ||
    item.raw?.client_nom ||
    item.raw?.acteur_nom ||
    '—';
  const date = item.date || item.raw?.date || '';
  const statut = item.statut || item.raw?.statut || 'en attente';
  const reste = item.reste ?? item.totaux?.total_a_payer ?? 0;
  const numero = item.numero || item.raw?.numero || '—';

  return {
    ...item,
    document_id: id,
    type,
    montant_toutetaxe: montant,
    client_nom: clientNom,
    date,
    statut,
    reste,
    numero,
  };
};

const DOC_TYPES = [
  { key: '', label: 'Tous' },
  { key: 'Facture', label: 'Factures' },
  { key: 'Devis', label: 'Devis' },
  { key: 'Bon de commande', label: 'Bon de commande' },
  { key: 'Bon de livraison', label: 'Bon de livraison' },
  { key: 'Avoir', label: 'Avoirs' },
];

export default function FacturesScreen({
  visible,
  onClose,
  colors = {},
  societeId,
  boutiqueId,
  user,
}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('Vente');
  const [docType, setDocType] = useState('');

  const [dateDebut, setDateDebut] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dateFin, setDateFin] = useState(() => new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('debut');

  const [facture, setFacture] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [transforming, setTransforming] = useState(false);

  const [showPrintChoice, setShowPrintChoice] = useState(false);

  const primary = colors.primary || '#075E54';
  const surface = colors.surface || '#fff';
  const border = colors.border || '#e5e7eb';
  const text = colors.text || '#111';
  const muted = colors.muted || '#6b7280';

  // ⭐ apiCall avec compat : url (objet) OU (url, body)
  const apiCall = async (url, body = {}) => {
    if (typeof url === 'object' && url !== null) {
      body = url;
      url = API_URL;
    }
    const json = await offlineFetch(url, {
      societe_id: societeId,
      boutique_id: boutiqueId || undefined,
      utilisateur_id: user?.utilisateur_id,
      ...body,
    });
    if (!json.success) throw new Error(json.message || 'Erreur API');
    return json;
  };

  const load = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({
        action: 'list_factures',
        categorie,
        type: docType || undefined,
        search: search || undefined,
        date_debut: formatDate(dateDebut),
        date_fin: formatDate(dateFin),
        limit: 80,
      });
      const rows = (json.data || []).map(normalizeListItem);
      setList(rows);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societeId, boutiqueId, categorie, docType, search, dateDebut, dateFin]);

  useEffect(() => {
    if (visible === false) return;
    if (!societeId) return;
    setLoading(true);
    load();
  }, [visible, load, societeId]);

  const onDateChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (pickerTarget === 'debut') {
        setDateDebut(selectedDate);
        if (selectedDate > dateFin) setDateFin(selectedDate);
      } else {
        setDateFin(selectedDate);
        if (selectedDate < dateDebut) setDateDebut(selectedDate);
      }
    }
  };

  const openPicker = (target) => {
    setPickerTarget(target);
    setShowPicker(true);
  };

  const openFacture = async (documentId) => {
    if (!documentId) {
      Alert.alert('Erreur', 'Identifiant document manquant');
      return;
    }
    setLoadingDetail(true);
    setShowPrint(true);
    setFacture(null);
    try {
      const json = await apiCall({ action: 'get_facture', document_id: documentId });
      const data = json.data || {};
      setFacture({
        ...data,
        document_id: data.document_id || documentId,
        client: data.client || {
          nom: data.client_nom || data.acteur_nom || 'CLIENT DE PASSAGE',
          contact: data.client_contact || data.acteur_telephone || '',
          ncc: data.client_ncc || '',
          regime: data.client_regime || 'N/A',
        },
        totaux: data.totaux || {
          total_ht: data.montant_horstaxe ?? 0,
          tva: data.tva ?? 0,
          total_ttc: data.montant_toutetaxe ?? data.montant ?? 0,
          montant_paye: data.avance ?? data.montant_paye ?? 0,
          total_a_payer: data.reste ?? 0,
          remise: data.remise ?? 0,
        },
        lignes: data.lignes || [],
      });
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setShowPrint(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ⭐ TRANSFORMATION via api-accueil.php uniquement
   // ⭐ TRANSFORMATION : 2 étapes (transformer + create_document)
  const handleTransform = async (newType) => {
    if (!facture) return;

    const labelMap = {
      'Bon de livraison': 'Bon de livraison',
      facture: 'Facture',
      Facture: 'Facture',
      Devis: 'Devis',
      'Bon de commande': 'Bon de commande',
      Avoir: 'Avoir',
    };

    Alert.alert(
      'Confirmation',
      `Transformer ${facture.numero} en ${labelMap[newType] || newType} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setTransforming(true);
            try {
              // -------------------------------------------------
              // ÉTAPE 1 : préparation des données
              // -------------------------------------------------
              const prepAction = mapActionForCategory('transformer', categorie);

              const prep = await apiCall({
                action: prepAction,
                document_parent_id: facture.document_id,
                type: newType,
              });

              // ⚠️ On vérifie prep.data (pas seulement prep.success)
              if (!prep.success || !prep.data) {
                throw new Error(prep.message || 'Préparation de la transformation échouée');
              }

              const d = prep.data;

              // -------------------------------------------------
              // ÉTAPE 2 : création réelle du document
              // -------------------------------------------------
              const createAction = mapActionForCategory('create_document', categorie);

              // api-accueil.php attend 'facture' (minuscule) dans l'enum
              const createdType = String(d.type || newType).toLowerCase() === 'facture'
                ? 'facture'
                : d.type;

              const createPayload = {
                action: createAction,
                type: createdType,
                acteur_id: d.acteur_id,
                document_parent_id: facture.document_id,
                montant_horstaxe: d.montant_horstaxe,
                taxe: d.taxe,
                remise: d.remise,
                montant_toutetaxe: d.montant_toutetaxe,
                lignes: (d.lignes || []).map((l) => ({
                  article_id: l.article_id,
                  prix_achat: l.prix_achat,
                  prix_vente: l.prix_vente,
                  prix_unitaire: l.prix_unitaire,
                  quantite: l.quantite,
                  montant: l.montant,
                  taxe_id: l.taxe_id,
                  remise_ligne: l.remise_ligne,
                  lot_id: l.lot_id,
                })),
                statut: 'valide',
              };

              const created = await apiCall(createPayload);

              if (created.success) {
                Alert.alert(
                  'Succès',
                  `${newType} ${created.numero || ''} créé à partir de ${facture.numero}`
                );
                setShowPrint(false);
                load();
              } else {
                Alert.alert('Erreur', created.message || 'Échec de la création');
              }

            } catch (e) {
              Alert.alert('Erreur', e.message);
            } finally {
              setTransforming(false);
            }
          },
        },
      ]
    );
  };

  // mode = 'facture' | 'recu'
  const imprimerPDF = async (mode = 'facture') => {
    if (!facture) return;
    setPrinting(true);
    setShowPrintChoice(false);

    try {
      const action = mode === 'recu' ? 'generate_recu' : 'generate_pdf';
      const url =
        `${IMPRESSION_API_URL}?action=${action}` +
        `&societe_id=${encodeURIComponent(societeId)}` +
        `&document_id=${encodeURIComponent(facture.document_id)}`;

      const safeNumero = String(facture.numero || 'document').replace(/[^A-Za-z0-9_-]/g, '_');
      const suffix = mode === 'recu' ? '_Recu' : '';
      const localUri = `${FileSystem.cacheDirectory}${safeNumero}${suffix}.pdf`;

      const download = await FileSystem.downloadAsync(url, localUri);

      if (download.status !== 200) {
        throw new Error(`HTTP ${download.status}`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${mode === 'recu' ? 'Reçu' : facture.type || 'Document'} N° ${facture.numero}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Succès', `Le PDF a été téléchargé :\n${download.uri}`);
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible de télécharger le PDF : " + e.message);
    } finally {
      setPrinting(false);
    }
  };

  const shareText = async () => {
    if (!facture) return;
    const f = facture;
    let t = `${(f.type || 'DOCUMENT').toUpperCase()} N° ${f.numero}\n`;
    t += `${f.societe?.nom || ''}\n`;
    t += `Date: ${f.date}\n`;
    t += `Client: ${f.client?.nom || ''}\n\n`;
    (f.lignes || []).forEach((l) => {
      t += `${l.designation || l.article_nom || 'Article'} x${l.quantite} = ${money(
        l.montant_ht ?? l.montant
      )} F\n`;
    });
    t += `\nTOTAL HT: ${money(f.totaux?.total_ht)} F\n`;
    t += `TVA: ${money(f.totaux?.tva)} F\n`;
    t += `TOTAL TTC: ${money(f.totaux?.total_ttc)} F\n`;
    if (f.type === 'Facture' || f.type === 'Avoir') {
      t += `Payé: ${money(f.totaux?.montant_paye)} F\n`;
    }
    t += `${f.montant_en_lettres || ''}\n`;
    try {
      await Share.share({ message: t, title: `${f.type || 'Document'} ${f.numero}` });
    } catch (e) {}
  };

  const getTypeLabel = (type) => {
    const found = DOC_TYPES.find((t) => t.key === type);
    return found ? found.label : type || 'Document';
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
      onPress={() => openFacture(item.document_id)}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: text }} numberOfLines={1}>
            {item.numero}
          </Text>
          <Text style={{ color: muted, fontSize: 11, marginTop: 1 }}>
            {getTypeLabel(item.type)}
          </Text>
        </View>
        <Text style={{ fontWeight: '800', color: '#16a34a' }}>
          {money(item.montant_toutetaxe)} F
        </Text>
      </View>
      <Text style={{ color: muted, fontSize: 13, marginTop: 4 }}>
        {item.client_nom} · {item.date}
      </Text>
      <View style={[styles.row, { marginTop: 6 }]}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: item.statut === 'valide' ? '#dcfce7' : '#fef3c7',
            },
          ]}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: item.statut === 'valide' ? '#16a34a' : '#d97706',
            }}
          >
            {item.statut}
          </Text>
        </View>
        {(item.type || '').toLowerCase() === 'facture' && Number(item.reste) > 0 ? (
          <Text style={{ color: '#d97706', fontSize: 12, fontWeight: '600' }}>
            Reste {money(item.reste)} F
          </Text>
        ) : (item.type || '').toLowerCase() === 'facture' ? (
          <Text style={{ color: '#16a34a', fontSize: 12, fontWeight: '600' }}>Soldée</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (visible === false) return null;

  return (
    <View style={[styles.safeContainer, { backgroundColor: '#f5f5f5' }]}>
      {/* Header */}
      <View style={[styles.factureHeader, { backgroundColor: primary }]}>
        <View style={styles.factureHeaderLeft}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.factureHeaderTitle}>Documents</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            load();
          }}
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filtres Catégories */}
      <View style={[styles.tabs, { backgroundColor: surface, borderBottomColor: border }]}>
        {[
          { key: 'Vente', label: 'Ventes' },
          { key: 'Achat', label: 'Achats' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tab,
              categorie === t.key && {
                borderBottomColor: primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => {
              setCategorie(t.key);
              setLoading(true);
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: categorie === t.key ? primary : muted,
              }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtres Type */}
      <View
        style={[styles.docTypeFilters, { backgroundColor: surface, borderBottomColor: border }]}
      >
        <FlatList
          horizontal
          data={DOC_TYPES}
          keyExtractor={(t) => t.key || 'all'}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, docType === item.key && { backgroundColor: primary }]}
              onPress={() => {
                setDocType(item.key);
                setLoading(true);
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: docType === item.key ? '#fff' : muted,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Période */}
      <View style={[styles.periodContainer, { backgroundColor: surface }]}>
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}
          onPress={() => openPicker('debut')}
        >
          <Text style={[styles.dateLabel, { color: muted }]}>Du</Text>
          <Text style={[styles.dateValue, { color: text }]}>{formatDate(dateDebut)}</Text>
        </TouchableOpacity>

        <Text style={{ color: muted, fontWeight: '600' }}>au</Text>

        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}
          onPress={() => openPicker('fin')}
        >
          <Text style={[styles.dateLabel, { color: muted }]}>Au</Text>
          <Text style={[styles.dateValue, { color: text }]}>{formatDate(dateFin)}</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={pickerTarget === 'debut' ? dateDebut : dateFin}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={onDateChange}
          maximumDate={new Date()}
          textColor={text}
        />
      )}
      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setShowPicker(false)}>
          <Text style={{ color: primary, fontWeight: 'bold' }}>Terminé</Text>
        </TouchableOpacity>
      )}

      {/* Recherche */}
      <View style={[styles.searchContainer, { backgroundColor: surface }]}>
        <TextInput
          style={[
            styles.search,
            { flex: 1, backgroundColor: '#f3f4f6', color: text, borderColor: border },
          ]}
          placeholder="Rechercher..."
          placeholderTextColor={muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => {
            setLoading(true);
            load();
          }}
        />
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: primary }]}
          onPress={() => {
            setLoading(true);
            load();
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>OK</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => String(i.document_id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: muted, marginTop: 40 }}>
              Aucun document pour cette période
            </Text>
          }
        />
      )}

      {/* ========== APERÇU / IMPRESSION ========== */}
      <Modal
        visible={showPrint}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPrint(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#e5e7eb',
            paddingTop: Platform.OS === 'ios' ? 48 : 20,
          }}
        >
          <View style={styles.printBar}>
            <TouchableOpacity
              onPress={() => setShowPrint(false)}
              style={[styles.printBarBtn, { backgroundColor: '#fee2e2', borderRadius: 8 }]}
            >
              <Text style={{ fontWeight: '700', color: 'red' }}>Fermer</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: '800', color: '#111', fontSize: 15 }}>
              {facture?.type || 'Document'} N° {facture?.numero || ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
  onPress={() => setShowPrintChoice(true)}
  style={[styles.printBarBtn, { backgroundColor: '#7c3aed', borderRadius: 8 }]}
  disabled={printing}
>
                {printing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontWeight: '700', color: '#fff' }}>🖨️ Imprimer</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={shareText}
                style={[styles.printBarBtn, { backgroundColor: 'gray', borderRadius: 8 }]}
              >
                <Text style={{ color: 'white' }}>Partager</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loadingDetail || !facture ? (
            <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 60 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
              <View style={styles.sheet}>
                <View style={styles.headerRow}>
                  <View style={styles.globalBox}>
                    <View style={styles.companyBox}>
                      <Text style={styles.companyName}>{facture.societe?.nom || ''}</Text>
                      <Text style={styles.smallText}>NCC : {facture.societe?.ncc || ''}</Text>
                      <Text style={styles.smallText}>
                        Régime d'imposition : {facture.societe?.regime_imposition || ''}
                      </Text>
                      <Text style={styles.smallText}>
                        Centre des impôts : {facture.societe?.centre_impot || ''}
                      </Text>
                    </View>
                    <View style={styles.bankDetails}>
                      <Text style={styles.smallText}>
                        RCCM : {facture.societe?.registre_commerce || ''}
                      </Text>
                      <Text style={styles.smallText}>
                        Réf. bancaire : {facture.societe?.reference_bancaire || 'N/A'}
                      </Text>
                      <Text style={styles.smallText}>
                        Adresse : {facture.etablissement?.adresse || ''}
                      </Text>
                      <Text style={styles.smallText}>
                        N° Tél : {facture.etablissement?.telephone || ''}
                      </Text>
                      <Text style={styles.smallText}>
                        Mail : {facture.etablissement?.email || ''}
                      </Text>
                      <Text style={styles.smallText}>Vendeur : {facture.vendeur || ''}</Text>
                      <Text style={styles.smallText}>
                        PDV : {facture.etablissement?.nom || ''}
                      </Text>
                      <Text style={styles.smallText}>Date : {facture.date}</Text>
                      <Text style={styles.smallText}>
                        Paiement : {facture.paiement?.mode || 'Non spécifié'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rightColumn}>
                    <View style={styles.logoContainer}>
                      <Text style={styles.brandLogo}>{facture.societe?.nom || ''}</Text>
                    </View>

                    <View style={styles.fneHeaderBox}>
                      <Text style={styles.fneHeaderTitle}>
                        {getBadgeLabel(facture.type)} N° {facture.numero}
                      </Text>
                      <View style={styles.fneContentRow}>
                        <View style={styles.qrCodeBox}>
                          <View style={styles.qrPlaceholder}>
                            <Text style={{ fontSize: 8, color: '#000', textAlign: 'center' }}>
                              QR CODE
                            </Text>
                          </View>
                        </View>
                        <View style={styles.fneBadgeContainer}>
                          <View style={styles.fneBadgeCircle}>
                            <Text style={styles.fneBadgeText}>FNE</Text>
                          </View>
                          <Text style={styles.fneBadgeLabel}>
                            {getBadgeLabel(facture.type)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.clientSection}>
                      <Text style={styles.clientTitle}>Client</Text>
                      <Text style={styles.bodyText}>
                        Nom : {facture.client?.nom || 'CLIENT DE PASSAGE'}
                      </Text>
                      <Text style={styles.bodyText}>
                        Contact : {facture.client?.contact || ''}
                      </Text>
                      <Text style={styles.bodyText}>NCC : {facture.client?.ncc || ''}</Text>
                      <Text style={styles.bodyText}>
                        Régime : {facture.client?.regime || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>MESSAGE COMMERCIAL</Text>
                <View style={styles.divider} />

                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.colRef]}>Réf</Text>
                    <Text style={[styles.th, styles.colDesignation]}>Désignation</Text>
                    <Text style={[styles.th, styles.colPrice]}>P.U HT</Text>
                    <Text style={[styles.th, styles.colQty]}>Qte</Text>
                    <Text style={[styles.th, styles.colUnit]}>Unité</Text>
                    <Text style={[styles.th, styles.colTax]}>Taxes (%)</Text>
                    <Text style={[styles.th, styles.colDiscount]}>Rem. (%)</Text>
                    <Text style={[styles.th, styles.colAmount]}>Montant HT</Text>
                  </View>
                  {(facture.lignes || []).map((l, idx) => (
                    <View
                      key={idx}
                      style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#f9fafb' }]}
                    >
                      <Text style={[styles.td, styles.colRef]}>{l.ref || '-'}</Text>
                      <Text style={[styles.td, styles.colDesignation]} numberOfLines={2}>
                        {l.designation || l.article_nom || l.nom || '—'}
                      </Text>
                      <Text style={[styles.td, styles.colPrice]}>
                        {money(l.pu_ht ?? l.prix_unitaire)}
                      </Text>
                      <Text style={[styles.td, styles.colQty]}>{l.quantite}</Text>
                      <Text style={[styles.td, styles.colUnit]}>{l.unite || 'U'}</Text>
                      <Text style={[styles.td, styles.colRate]}>{l.taux || 0}</Text>
                      <Text style={[styles.td, styles.colDiscount]}>
                        {money(l.remise || 0)}
                      </Text>
                      <Text style={[styles.td, styles.colAmount, { fontWeight: '700' }]}>
                        {money(l.montant_ht ?? l.montant)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalsTable}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL HT</Text>
                    <Text style={styles.totalValue}>{money(facture.totaux?.total_ht)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Remise</Text>
                    <Text style={styles.totalValue}>
                      {money(facture.totaux?.remise || 0)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TVA</Text>
                    <Text style={styles.totalValue}>{money(facture.totaux?.tva)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL TTC</Text>
                    <Text style={styles.totalValue}>{money(facture.totaux?.total_ttc)}</Text>
                  </View>
                  {(facture.type === 'Facture' ||
                    (facture.type || '').toLowerCase() === 'facture') && (
                    <>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Montant payé</Text>
                        <Text style={styles.totalValue}>
                          {money(facture.totaux?.montant_paye)}
                        </Text>
                      </View>
                      <View style={styles.totalRowGreen}>
                        <Text style={styles.totalLabelGreen}>TOTAL A PAYER</Text>
                        <Text style={styles.totalValueGreen}>
                          {money(facture.totaux?.total_a_payer)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.twoColumns}>
                  <View style={styles.leftBox}>
                    <Text style={styles.boxTitle}>RÉCAPITULATIF</Text>
                    <Text style={styles.smallText}>
                      CATÉGORIE : {facture.categorie_libelle || 'Marchandises'}
                    </Text>
                    <Text style={styles.smallText}>TYPE : {facture.type || 'Document'}</Text>
                  </View>
                  <View style={styles.rightBox}>
                    <View style={styles.taxTable}>
                      <View style={styles.taxTableRow}>
                        <Text style={styles.taxTableHeader}>SOUS-TOTAL</Text>
                        <Text style={styles.taxTableHeader}>TAUX</Text>
                        <Text style={styles.taxTableHeader}>TOTAL TAXES</Text>
                      </View>
                      <View style={styles.taxTableRow}>
                        <Text style={styles.taxTableCell}>
                          {money(facture.totaux?.total_ht)}
                        </Text>
                        <Text style={styles.taxTableCell}>{facture.totaux?.tva}</Text>
                        <Text style={styles.taxTableCell}>{money(facture.totaux?.tva)}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.lettersBox}>
                  <Text style={styles.smallText}>
                    MONTANT EN LETTRES : {facture.montant_en_lettres || 'ZÉRO FRANC CFA'}
                  </Text>
                </View>

                {/* Transitions */}
                {facture.statut === 'valide' && TRANSITIONS[facture.type] && (
                  <View style={styles.transitionSection}>
                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Transformer en</Text>
                    <View style={styles.transitionButtons}>
                      {TRANSITIONS[facture.type].map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[
                            styles.transitionBtn,
                            {
                              backgroundColor:
                                categorie === 'Achat' ? '#ffedd5' : '#ede9fe',
                            },
                          ]}
                          onPress={() => handleTransform(t)}
                          disabled={transforming}
                        >
                          <Ionicons
                            name="arrow-forward-circle"
                            size={20}
                            color={categorie === 'Achat' ? '#c2410c' : '#7c3aed'}
                          />
                          <Text
                            style={[
                              styles.transitionBtnText,
                              {
                                color: categorie === 'Achat' ? '#c2410c' : '#7c3aed',
                              },
                            ]}
                          >
                            →{' '}
                            {t === 'Bon de livraison'
                              ? categorie === 'Achat'
                                ? 'Réception'
                                : t
                              : t}
                          </Text>
                          {transforming && (
                            <ActivityIndicator
                              size="small"
                              color={categorie === 'Achat' ? '#c2410c' : '#7c3aed'}
                              style={{ marginLeft: 4 }}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {facture.enfants && facture.enfants.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                      Documents dérivés
                    </Text>
                    {facture.enfants.map((e) => (
                      <View
                        key={e.document_id}
                        style={[
                          styles.panierItem,
                          { backgroundColor: surface, borderColor: border },
                        ]}
                      >
                        <Text style={{ color: text, fontWeight: '600' }}>{e.numero}</Text>
                        <Text style={{ color: muted, fontSize: 12 }}>
                          {e.type} · {e.statut}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

            {/* ========== CHOIX FACTURE / RECU ========== */}
      <Modal
        visible={showPrintChoice}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrintChoice(false)}
      >
        <View style={styles.choiceOverlay}>
          <View style={styles.choiceContainer}>
            <Text style={styles.choiceTitle}>Choisir le format</Text>
            <Text style={styles.choiceSubtitle}>
              {facture?.type || 'Document'} N° {facture?.numero || ''}
            </Text>

            <TouchableOpacity
              style={[styles.choiceBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => imprimerPDF('facture')}
              disabled={printing}
            >
              <Ionicons name="document-text" size={26} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceBtnTitle}>Facture normalisée</Text>
                <Text style={styles.choiceBtnSub}>Document officiel avec QR code FNE</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.choiceBtn, { backgroundColor: '#075E54' }]}
              onPress={() => imprimerPDF('recu')}  // ⚠️ attention : appeler imprimerPDF('recu')
              disabled={printing}
            >
              <Ionicons name="receipt" size={26} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceBtnTitle}>Reçu</Text>
                <Text style={styles.choiceBtnSub}>Ticket de caisse compact 80mm</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.choiceCancel}
              onPress={() => setShowPrintChoice(false)}
            >
              <Text style={styles.choiceCancelText}>Annuler</Text>
            </TouchableOpacity>

            {printing && (
              <View style={{ marginTop: 12, alignItems: 'center' }}>
                <ActivityIndicator color="#7c3aed" />
                <Text style={{ marginTop: 6, color: '#6b7280', fontSize: 12 }}>
                  Génération du PDF...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },

  factureHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#075E54'
  },
  factureHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factureHeaderTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },

  docTypeFilters: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 2,
  },

  searchContainer: {
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },

  periodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  pickerDoneButton: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  printBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexWrap: 'wrap',
    gap: 8,
  },
  printBarBtn: {
    padding: 8,
    paddingHorizontal: 12,
  },

  sheet: {
    backgroundColor: '#fff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  globalBox: { padding: 10, width: '45%' },
  companyBox: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 4,
    padding: 10,
    width: '100%',
  },
  companyName: { fontWeight: '800', fontSize: 13, color: '#111', marginBottom: 4 },
  rightColumn: { width: '52%', flexDirection: 'column', gap: 8 },
  logoContainer: { alignItems: 'flex-end', paddingBottom: 4 },
  brandLogo: { fontWeight: '900', fontSize: 18, color: '#16a34a' },
  fneHeaderBox: {
    borderWidth: 2,
    borderColor: '#f97316',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fff7ed',
  },
  fneHeaderTitle: {
    fontWeight: '800',
    fontSize: 12,
    color: '#111',
    textAlign: 'center',
    marginBottom: 6,
  },
  fneContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrCodeBox: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    width: 72,
    height: 72,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fneBadgeContainer: { flex: 1, alignItems: 'center', marginLeft: 8 },
  fneBadgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  fneBadgeText: { fontSize: 24, fontWeight: '800', color: '#16a34a' },
  fneBadgeLabel: {
    fontSize: 8,
    color: '#16a34a',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  clientSection: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#fafafa',
  },
  clientTitle: { fontWeight: '800', fontSize: 12, color: '#16a34a', marginBottom: 4 },
  bankDetails: { marginTop: 12, marginBottom: 12 },
  sectionTitle: { fontWeight: '700', fontSize: 11, color: '#374151', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#000', marginBottom: 12 },
  tableContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
  },
  th: {
    padding: 8,
    fontSize: 9,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  td: {
    padding: 8,
    fontSize: 10,
    color: '#111',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  colRef: { flex: 0.8 },
  colDesignation: { flex: 2, textAlign: 'left' },
  colPrice: { flex: 1 },
  colQty: { flex: 0.8 },
  colUnit: { flex: 0.8 },
  colRate: { flex: 0.8 },
  colTax: { flex: 1 },
  colDiscount: { flex: 0.8 },
  colAmount: { flex: 1.2 },
  totalsTable: {
    alignSelf: 'flex-end',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    minWidth: '49%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalRowGreen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#dcfce7',
    borderBottomWidth: 0,
  },
  totalLabel: { fontSize: 11, color: '#374151', fontWeight: '600' },
  totalLabelGreen: { fontSize: 12, color: '#166534', fontWeight: '800' },
  totalValue: { fontSize: 12, fontWeight: '600', color: '#111' },
  totalValueGreen: { fontSize: 13, fontWeight: '800', color: '#166534' },
  twoColumns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  leftBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 6,
    padding: 10,
  },
  rightBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 0,
    overflow: 'hidden',
  },
  boxTitle: { fontWeight: '800', fontSize: 10, color: '#1e40af', marginBottom: 6 },
  taxTable: { width: '100%' },
  taxTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  taxTableHeader: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taxTableCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lettersBox: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
  },
  smallText: { fontSize: 10, color: '#374151', marginTop: 2 },
  bodyText: { fontSize: 11, color: '#111', marginTop: 3 },

  transitionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  transitionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  transitionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  transitionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  panierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
    choiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  choiceContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 4,
  },
  choiceSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  choiceBtnTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  choiceBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  choiceCancel: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  choiceCancelText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
});