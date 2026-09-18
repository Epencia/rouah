import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
  Platform,
  Dimensions,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { offlineFetch } from '../services/offlineApi';

// ============ CONSTANTES API ============
const API_URL = 'https://rouah.net/api/api-comptoir.php';

// ============ FONCTIONS UTILITAIRES ============
function formatMoney(val) {
  return Number(val || 0).toLocaleString('fr-FR') + ' F';
}

const MODES = [
  { key: 'especes', label: 'Espèces' },
  { key: 'mobile_money', label: 'Mobile Money' },
  { key: 'cheque', label: 'Chèque' },
  { key: 'virement', label: 'Virement' },
  { key: 'carte', label: 'Carte' },
];

export default function VenteScreen({ societeId, boutiqueId, user, onChanged }) {
  // ==================== ÉTATS ====================
  const [articles, setArticles] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [cart, setCart] = useState([]);
  const [cartExpanded, setCartExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Scanner avec expo-camera uniquement
  const [hasPermission, setHasPermission] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const cameraRef = useRef(null);

  // États client
  const [acteurId, setActeurId] = useState('');
  const [acteurs, setActeurs] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [passageId, setPassageId] = useState(null);

  // États caisse
  const [caisses, setCaisses] = useState([]);
  const [caisseId, setCaisseId] = useState('');
  const [journeeId, setJourneeId] = useState(null);

  // États paiement
  const [payer, setPayer] = useState(true);
  const [modeReglement, setModeReglement] = useState('especes');

  // ==================== PERMISSIONS CAMERA ====================
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // ==================== APPELS API ====================
const apiCall = async (url, body = {}) => {
  // Compatibilité si un jour on appelle apiCall({ action: '...' }) sans url
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
  // ==================== CHARGEMENT DES DONNÉES ====================
  const loadArticles = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({
        action: 'list_articles',
        search: searchText || undefined,
      });
      const articlesWithStock = (json.data || []).map(a => ({
        ...a,
        stock_dispo: Number(a.stock_dispo) || 0,
        prix_vente: Number(a.prix_vente) || 0,
      }));
      setArticles(articlesWithStock);
    } catch (e) {
      console.warn('loadArticles error:', e.message);
    }
  }, [societeId, searchText]);

  const loadClients = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({
        action: 'list_clients',
        ensure_passage: true,
        search: clientSearch || undefined,
      });
      setActeurs(json.data || []);
      if (json.passage_id) {
        setPassageId(json.passage_id);
        setActeurId(json.passage_id);
      } else if (json.data?.[0]) {
        setActeurId(json.data[0].acteur_id);
      }
    } catch (e) {
      console.warn('loadClients error:', e.message);
    }
  }, [societeId, clientSearch]);

  const loadCaisses = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({ action: 'list_caisses' });
      setCaisses(json.data || []);
      if (json.data?.length) {
        setCaisseId(prev => prev || json.data[0].caisse_id);
        setJourneeId(json.data[0].journee_ouverte_id || null);
      }
    } catch (e) {
      console.warn('loadCaisses error:', e.message);
    }
  }, [societeId]);

  const loadAllData = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      await Promise.all([
        loadArticles(),
        loadClients(),
        loadCaisses(),
      ]);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }, [societeId, loadArticles, loadClients, loadCaisses]);

  useEffect(() => {
    if (societeId) {
      loadAllData();
    }
  }, [societeId, loadAllData]);

  // Recharger lors de la recherche
  useEffect(() => {
    if (societeId) {
      const timeout = setTimeout(() => {
        loadArticles();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [searchText, societeId, loadArticles]);

  // Recharger les clients lors de la recherche
  useEffect(() => {
    if (societeId && showClientModal) {
      const timeout = setTimeout(() => {
        loadClients();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [clientSearch, societeId, showClientModal, loadClients]);

  // ==================== FONCTIONS SCANNER ====================
  const openScanner = async () => {
    if (hasPermission === null) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la caméra pour scanner des codes.');
        return;
      }
    }
    if (hasPermission === false) {
      Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la caméra dans les paramètres de l\'application.');
      return;
    }
    setScanned(false);
    setScanning(false);
    setTorchOn(false);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async (result) => {
    if (scanned || scanning) return;

    const { data } = result;
    Vibration.vibrate(200);
    setScanned(true);
    setScanning(true);

    try {
      const json = await apiCall({
        action: 'get_article_by_code',
        code: data,
      });

      if (json.success && json.data) {
        const article = json.data;
        addToCart({
          article_id: article.article_id,
          nom: article.nom,
          prix_vente: Number(article.prix_vente) || 0,
          stock_dispo: Number(article.stock_dispo) || 0,
          code_barre: article.code_barre,
          code_interne: article.code_interne,
        });
        Alert.alert('✅ Article trouvé', `${article.nom} ajouté au panier`);
        setTimeout(() => {
          closeScanner();
        }, 1000);
      } else {
        Alert.alert('❌ Article introuvable', `Aucun article trouvé avec le code: ${data}`);
        setTimeout(() => {
          setScanned(false);
          setScanning(false);
        }, 2000);
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setTimeout(() => {
        setScanned(false);
        setScanning(false);
      }, 2000);
    }
  };

  const closeScanner = () => {
    setScannerVisible(false);
    setScanned(false);
    setScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = () => {
    setTorchOn(prev => !prev);
  };

  // ==================== FONCTIONS MÉTIER ====================
  const stockOf = (articleId) => {
    const a = articles.find((x) => x.article_id === articleId);
    if (!a) return 0;
    return Number(a.stock_dispo) || 0;
  };

  const addToCart = (article) => {
    const dispo = stockOf(article.article_id);
    setCart((prev) => {
      const ex = prev.find((x) => x.article_id === article.article_id);
      const nextQty = (ex?.quantite || 0) + 1;
      if (dispo !== null && nextQty > dispo) {
        Alert.alert(
          'Stock insuffisant',
          `${article.nom}\nDisponible : ${dispo}\nDemandé : ${nextQty}`
        );
        return prev;
      }
      if (ex) {
        return prev.map((x) =>
          x.article_id === article.article_id ? { ...x, quantite: x.quantite + 1 } : x
        );
      }
      return [
        ...prev,
        {
          article_id: article.article_id,
          nom: article.nom,
          quantite: 1,
          prix_unitaire: Number(article.prix_vente) || 0,
          prix_achat: Number(article.prix_achat) || 0,
          prix_vente: Number(article.prix_vente) || 0,
          code_barre: article.code_barre,
          code_interne: article.code_interne,
        },
      ];
    });
    setCartExpanded(true);
  };

  const decCart = (id) => {
    setCart((prev) =>
      prev
        .map((x) => (x.article_id === id ? { ...x, quantite: x.quantite - 1 } : x))
        .filter((x) => x.quantite > 0)
    );
  };

  const total = cart.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
  const cartCount = cart.reduce((s, l) => s + l.quantite, 0);

  const checkStockBeforePay = () => {
    const problems = [];
    for (const l of cart) {
      const dispo = stockOf(l.article_id);
      if (dispo !== null && l.quantite > dispo) {
        problems.push(`${l.nom} : demandé ${l.quantite}, dispo ${dispo}`);
      }
    }
    return problems;
  };

  // ==================== GESTION CLIENTS ====================
  const openClientModal = () => {
    setClientSearch('');
    setShowClientModal(true);
    loadClients();
  };

  const selectClient = (client) => {
    setActeurId(client.acteur_id);
    setShowClientModal(false);
  };

  // ==================== GESTION CAISSE ====================
  const selectCaisse = (c) => {
    setCaisseId(c.caisse_id);
    setJourneeId(c.journee_ouverte_id || null);
  };

  // ==================== ENCAISSER ====================
  const encaisser = async () => {
    if (!cart.length) {
      Alert.alert('Panier vide');
      return;
    }
    if (!boutiqueId) {
      Alert.alert('Erreur', 'Boutique active manquante');
      return;
    }
    if (!acteurId) {
      Alert.alert('Erreur', 'Aucun client sélectionné');
      return;
    }
    if (payer && !caisseId) {
      Alert.alert('Erreur', 'Aucune caisse sélectionnée');
      return;
    }

    const problems = checkStockBeforePay();
    if (problems.length) {
      Alert.alert(
        'Stock insuffisant',
        problems.join('\n') + '\n\nCorrige le panier avant d\'encaisser.'
      );
      return;
    }

    setSaving(true);
    try {
      const lignes = cart.map((l) => ({
        article_id: l.article_id,
        nom: l.nom,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
        prix_achat: l.prix_achat,
        prix_vente: l.prix_vente,
        montant: l.quantite * l.prix_unitaire,
        code_barre: l.code_barre,
        code_interne: l.code_interne,
      }));

      const json = await apiCall({
        action: 'vente_comptoir',
        acteur_id: acteurId,
        lignes,
        caisse_id: payer ? caisseId : null,
        journee_caisse_id: payer ? journeeId : null,
        mode_reglement: modeReglement,
        montant_paye: payer ? total : 0,
        montant_toutetaxe: total,
        payer,
      });

      Alert.alert(
        'Vente enregistrée',
        `${json.numero || ''}\n${formatMoney(json.montant_toutetaxe || total)}\n` +
        (payer
          ? MODES.find((m) => m.key === modeReglement)?.label || modeReglement
          : 'Non encaissé') +
        (json.reste > 0 ? `\nReste: ${formatMoney(json.reste)}` : '')
      );

      setCart([]);
      loadArticles();
      loadCaisses();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDU ====================
  if (loading && !articles.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Chargement des articles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContent}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Vente au comptoir</Text>
          <Text style={styles.headerSubtitle}>
            {cartCount > 0 ? `${cartCount} article(s) · ${formatMoney(total)}` : 'Panier vide'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={openScanner}
          style={styles.scannerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="scan-outline" size={28} color="#075E54" />
          <Text style={styles.scannerBtnText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Barre de recherche avec bouton scan */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIconLeft} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un article..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity onPress={openScanner} style={styles.searchScanBtn}>
          <Ionicons name="barcode-outline" size={24} color="#075E54" />
        </TouchableOpacity>
      </View>

      {/* Liste des articles */}
      <FlatList
        data={articles}
        keyExtractor={(item) => item.article_id}
        numColumns={2}
        style={{ flex: 1 }}
        contentContainerStyle={styles.articlesList}
        columnWrapperStyle={styles.articlesRow}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucun article trouvé</Text>
            <Text style={styles.emptySubText}>Scannez un code-barres ou recherchez un article</Text>
          </View>
        }
        renderItem={({ item }) => {
          const dispo = Number(item.stock_dispo) || 0;
          const rupture = dispo <= 0;
          const hasCode = item.code_barre || item.code_interne;
          return (
            <TouchableOpacity
              onPress={() => !rupture && addToCart(item)}
              activeOpacity={0.85}
              style={[
                styles.articleCard,
                rupture && styles.articleCardRupture,
              ]}
            >
              <View style={styles.articleHeader}>
                <Text style={styles.articleName} numberOfLines={2}>
                  {item.nom}
                </Text>
                {hasCode && (
                  <View style={styles.codeBadge}>
                    <Ionicons name="barcode-outline" size={12} color="#999" />
                  </View>
                )}
              </View>
              <Text style={styles.articlePrice}>{formatMoney(item.prix_vente)}</Text>
              <Text style={[styles.articleStock, rupture && styles.articleStockRupture]}>
                {rupture ? 'Rupture' : `Dispo : ${dispo}`}
              </Text>
              {item.code_barre && (
                <Text style={styles.articleCode} numberOfLines={1}>
                  📷 {item.code_barre}
                </Text>
              )}
              <View style={[styles.addChip, rupture && styles.addChipRupture]}>
                <Text style={styles.addChipText}>
                  {rupture ? 'Indisponible' : '+ Ajouter'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Panier */}
      <View style={styles.cartPanel}>
        <TouchableOpacity
          onPress={() => setCartExpanded(!cartExpanded)}
          style={styles.cartHandle}
          activeOpacity={0.8}
        >
          <View style={styles.handleBar} />
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>
              Panier {cartCount > 0 ? `(${cartCount})` : ''}
            </Text>
            <Text style={styles.cartTotal}>{formatMoney(total)}</Text>
          </View>
        </TouchableOpacity>

        {cartExpanded && (
          <>
            <ScrollView
              style={styles.cartItems}
              contentContainerStyle={styles.cartItemsContent}
              showsVerticalScrollIndicator={false}
            >
              {cart.length === 0 ? (
                <Text style={styles.cartEmpty}>
                  Touche un article ou scanne un code-barres pour l'ajouter
                </Text>
              ) : (
                cart.map((item, idx) => (
                  <View key={`c-${item.article_id}-${idx}`} style={styles.cartLine}>
                    <View style={styles.cartLineInfo}>
                      <Text style={styles.cartLineName} numberOfLines={1}>{item.nom}</Text>
                      <Text style={styles.cartLinePrice}>
                        {formatMoney(item.prix_unitaire)} × {item.quantite}
                      </Text>
                    </View>
                    <View style={styles.cartLineQty}>
                      <TouchableOpacity
                        onPress={() => decCart(item.article_id)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{item.quantite}</Text>
                      <TouchableOpacity
                        onPress={() => addToCart({
                          article_id: item.article_id,
                          nom: item.nom,
                          prix_vente: item.prix_vente,
                          stock_dispo: stockOf(item.article_id),
                          code_barre: item.code_barre,
                          code_interne: item.code_interne,
                        })}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartLineTotal}>
                      {formatMoney(item.quantite * item.prix_unitaire)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Section Client */}
            <View style={styles.clientSection}>
              <View style={styles.clientHeader}>
                <Text style={styles.clientLabel}>Client</Text>
                <TouchableOpacity
                  onPress={openClientModal}
                  style={styles.clientSelectBtn}
                >
                  <Text style={styles.clientSelectBtnText}>
                    {acteurId ? 'Changer' : 'Sélectionner'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {acteurs.map((a) => (
                  <TouchableOpacity
                    key={a.acteur_id}
                    onPress={() => setActeurId(a.acteur_id)}
                    style={[
                      styles.clientChip,
                      acteurId === a.acteur_id && styles.clientChipActive,
                    ]}
                  >
                    <Text style={[
                      styles.clientChipText,
                      acteurId === a.acteur_id && styles.clientChipTextActive,
                    ]}>
                      {a.nom_prenom || a.nom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Section Paiement */}
            <View style={styles.paymentSection}>
              <TouchableOpacity
                onPress={() => setPayer(!payer)}
                style={styles.payerToggle}
              >
                <View style={[styles.checkbox, payer && styles.checkboxActive]}>
                  {payer && <Text style={styles.checkboxText}>✓</Text>}
                </View>
                <Text style={styles.payerLabel}>Encaisser tout de suite</Text>
              </TouchableOpacity>

              {payer && (
                <>
                  <Text style={styles.sectionLabel}>Mode de règlement</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modesScroll}>
                    {MODES.map((m) => (
                      <TouchableOpacity
                        key={m.key}
                        onPress={() => setModeReglement(m.key)}
                        style={[
                          styles.modeChip,
                          modeReglement === m.key && styles.modeChipActive,
                        ]}
                      >
                        <Text style={[
                          styles.modeChipText,
                          modeReglement === m.key && styles.modeChipTextActive,
                        ]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.sectionLabel}>Caisse</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {caisses.map((c) => (
                      <TouchableOpacity
                        key={c.caisse_id}
                        onPress={() => selectCaisse(c)}
                        style={[
                          styles.caisseChip,
                          caisseId === c.caisse_id && styles.caisseChipActive,
                        ]}
                      >
                        <Text style={[
                          styles.caisseChipText,
                          caisseId === c.caisse_id && styles.caisseChipTextActive,
                        ]}>
                          {c.nom}{c.journee_ouverte_id ? ' ●' : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>

            {/* Bouton Valider */}
            <View style={styles.payButtonContainer}>
              <TouchableOpacity
                style={[styles.payBtn, (!cart.length || saving) && styles.payBtnDisabled]}
                onPress={encaisser}
                disabled={!cart.length || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.payBtnText}>
                    {payer ? `Encaisser · ${formatMoney(total)}` : `Valider · ${formatMoney(total)}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Modal de sélection des clients */}
      <Modal visible={showClientModal} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un client</Text>
            <TouchableOpacity onPress={() => setShowClientModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchWrapper}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Rechercher un client..."
              placeholderTextColor="#999"
              value={clientSearch}
              onChangeText={setClientSearch}
            />
            <Ionicons name="search" size={20} color="#999" style={styles.modalSearchIcon} />
            {loadingClients && <ActivityIndicator size="small" color="#075E54" />}
          </View>

          <FlatList
            data={filteredClients.length ? filteredClients : acteurs}
            keyExtractor={(item) => item.acteur_id}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => selectClient(item)}
                style={[
                  styles.modalClientItem,
                  acteurId === item.acteur_id && styles.modalClientItemActive,
                ]}
              >
                <View style={styles.modalClientInfo}>
                  <Text style={styles.modalClientName}>{item.nom_prenom || item.nom}</Text>
                  {item.telephone && (
                    <Text style={styles.modalClientPhone}>📞 {item.telephone}</Text>
                  )}
                </View>
                {acteurId === item.acteur_id && (
                  <View style={styles.modalClientSelected}>
                    <Text style={styles.modalClientSelectedText}>Sélectionné</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>Aucun client trouvé</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Modal Scanner - Version corrigée */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeScanner}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scanner un code</Text>
            <TouchableOpacity onPress={closeScanner} style={styles.scannerCloseBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.scannerWrapper}>
            {hasPermission === true ? (
              <>
                <CameraView
                  ref={cameraRef}
                  style={styles.cameraView}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScanned}
                  enableTorch={torchOn}
                  barcodeScannerSettings={{
                    barcodeTypes: [
                      'qr',
                      'ean13',
                      'ean8',
                      'code128',
                      'code39',
                      'code93',
                      'codabar',
                      'itf14',
                      'upc_a',
                      'upc_e',
                    ],
                    interval: 500,
                  }}
                />
                <View style={styles.scannerOverlay}>
                  <View style={styles.scannerFrame}>
                    <View style={styles.scannerCornerTL} />
                    <View style={styles.scannerCornerTR} />
                    <View style={styles.scannerCornerBL} />
                    <View style={styles.scannerCornerBR} />
                  </View>
                  <View style={styles.scannerInstructions}>
                    <Ionicons name="scan" size={24} color="#fff" />
                    <Text style={styles.scannerInstructionsText}>
                      Positionnez le code dans le cadre
                    </Text>
                    {scanning && (
                      <View style={styles.scanningIndicator}>
                        <ActivityIndicator size="small" color="#22c55e" />
                        <Text style={styles.scanningText}>Recherche en cours...</Text>
                      </View>
                    )}
                  </View>
                </View>
              </>
            ) : hasPermission === false ? (
              <View style={styles.scannerErrorContainer}>
                <Ionicons name="camera-off-outline" size={60} color="#ff6b6b" />
                <Text style={styles.scannerErrorText}>Accès à la caméra refusé</Text>
                <Text style={styles.scannerErrorSubText}>
                  Veuillez autoriser l'accès à la caméra dans les paramètres
                </Text>
                <TouchableOpacity
                  style={styles.scannerErrorBtn}
                  onPress={async () => {
                    const { status } = await Camera.requestCameraPermissionsAsync();
                    setHasPermission(status === 'granted');
                  }}
                >
                  <Text style={styles.scannerErrorBtnText}>Demander l'autorisation</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.scannerLoadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scannerLoadingText}>Initialisation de la caméra...</Text>
              </View>
            )}
          </View>

          <View style={styles.scannerFooter}>
           
            <TouchableOpacity
              style={[styles.scannerFlashBtn, torchOn && styles.scannerFlashBtnActive]}
              onPress={toggleTorch}
            >
              <Ionicons
                name={torchOn ? 'flash' : 'flash-outline'}
                size={24}
                color={torchOn ? '#22c55e' : '#fff'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================== STYLES ====================
const { width } = Dimensions.get('window');
const SCANNER_SIZE = Math.min(width * 0.7, 280);

const styles = StyleSheet.create({
  screenContent: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { color: '#075E54', marginTop: 12, fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#075E54',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  scannerBtn: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scannerBtnText: {
    fontSize: 10,
    color: '#075E54',
    fontWeight: '600',
    marginTop: 2,
  },

  // Search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 44,
  },
  searchIconLeft: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  searchScanBtn: {
    padding: 6,
    marginLeft: 4,
  },

  // Articles
  articlesList: {
    paddingHorizontal: 10,
    paddingBottom: 16,
  },
  articlesRow: {
    gap: 10,
  },
  articleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  articleCardRupture: {
    opacity: 0.7,
    borderColor: '#ef4444',
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  articleName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  codeBadge: {
    padding: 2,
    marginLeft: 4,
  },
  articlePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7c3aed',
    marginTop: 6,
  },
  articleStock: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  articleStockRupture: {
    color: '#ef4444',
  },
  articleCode: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  addChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },
  addChipRupture: {
    backgroundColor: '#ef4444',
  },
  addChipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 8,
  },
  emptySubText: {
    color: '#bbb',
    fontSize: 13,
    marginTop: 4,
  },

  // Cart Panel
  cartPanel: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
    maxHeight: '60%',
  },
  cartHandle: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(127,127,127,0.35)',
    marginBottom: 10,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  cartTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7c3aed',
  },
  cartItems: {
    maxHeight: 120,
  },
  cartItemsContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cartEmpty: {
    color: '#999',
    fontSize: 13,
    paddingVertical: 8,
  },
  cartLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  cartLineInfo: {
    flex: 1,
    paddingRight: 8,
  },
  cartLineName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  cartLinePrice: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  cartLineQty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  qtyValue: {
    color: '#333',
    fontWeight: '700',
    minWidth: 22,
    textAlign: 'center',
  },
  cartLineTotal: {
    color: '#333',
    fontWeight: '700',
    fontSize: 12,
    minWidth: 72,
    textAlign: 'right',
  },

  // Client Section
  clientSection: {
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  clientLabel: {
    fontSize: 11,
    color: '#999',
  },
  clientSelectBtn: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clientSelectBtnText: {
    color: '#7c3aed',
    fontSize: 11,
    fontWeight: '600',
  },
  clientChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(127,127,127,0.1)',
  },
  clientChipActive: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: '#7c3aed',
  },
  clientChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  clientChipTextActive: {
    color: '#7c3aed',
  },

  // Payment Section
  paymentSection: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  payerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#7c3aed',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7c3aed',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  payerLabel: {
    fontSize: 13,
    color: '#333',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
  },
  modesScroll: {
    marginBottom: 8,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(127,127,127,0.1)',
  },
  modeChipActive: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: '#22c55e',
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  modeChipTextActive: {
    color: '#16a34a',
  },
  caisseChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(127,127,127,0.1)',
  },
  caisseChipActive: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: '#7c3aed',
  },
  caisseChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  caisseChipTextActive: {
    color: '#7c3aed',
  },

  // Pay Button
  payButtonContainer: {
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  payBtn: {
    backgroundColor: '#075E54',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  payBtnDisabled: {
    opacity: 0.55,
  },
  payBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  // Client Modal
  modalWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    backgroundColor:'#075E54'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 44,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  modalSearchIcon: {
    marginLeft: 8,
  },
  modalList: {
    padding: 16,
    paddingBottom: 40,
  },
  modalClientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalClientItemActive: {
    borderColor: '#7c3aed',
    borderWidth: 2,
    backgroundColor: 'rgba(124,58,237,0.05)',
  },
  modalClientInfo: {
    flex: 1,
  },
  modalClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  modalClientPhone: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  modalClientSelected: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalClientSelectedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    color: '#999',
  },

  // Scanner Modal - Styles corrigés
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scannerCloseBtn: {
    padding: 8,
  },
  scannerWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  cameraView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
  },
  scannerCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#22c55e',
  },
  scannerCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#22c55e',
  },
  scannerCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#22c55e',
  },
  scannerCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#22c55e',
  },
  scannerInstructions: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    gap: 8,
  },
  scannerInstructionsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scanningText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '500',
  },
  scannerErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scannerErrorText: {
    color: '#ff6b6b',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  scannerErrorSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  scannerErrorBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  scannerErrorBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  scannerLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerLoadingText: {
    color: '#fff',
    marginTop: 12,
  },
  scannerFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    gap: 20,
  },
  scannerInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  scannerInputBtnText: {
    color: '#075E54',
    fontWeight: '600',
  },
  scannerFlashBtn: {
    padding: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scannerFlashBtnActive: {
    backgroundColor: 'rgba(34,197,94,0.3)',
  },
});