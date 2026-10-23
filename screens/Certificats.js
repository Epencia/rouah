// CertificatModal.js — Design conservé, données depuis l'API
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import ViewShot from 'react-native-view-shot';

// ═══════════════════════════════════════════════════════════
//  PALETTE ROUAH (identique)
// ═══════════════════════════════════════════════════════════
const ROUAH = {
  primary: '#075E54',
  secondary: '#128C7E',
  accent: '#25D366',
  accentDark: '#0A7A6C',
  bg: '#ECE5DD',
  surface: '#FFFFFF',
  text: '#111B21',
  muted: '#667781',
  border: '#E9EDEF',
  danger: '#E53935',
};

const API_URL = 'https://rouah.net/api/api-certificat.php';

// ═══════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════
const CertificatModal = ({ certificat, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const viewShotRef = useRef(null);

  // ⭐ Récupération des données depuis l'API
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        params.append('action', 'data');

        if (certificat?.certificat_id) {
          params.append('certificat_id', certificat.certificat_id);
        } else if (certificat?.code_certificat) {
          params.append('code_certificat', certificat.code_certificat);
        } else if (certificat?.formation_id && certificat?.utilisateur_id) {
          params.append('formation_id', certificat.formation_id);
          params.append('utilisateur_id', certificat.utilisateur_id);
        } else {
          throw new Error('Identifiants du certificat manquants');
        }

        const res = await fetch(`${API_URL}?${params.toString()}`);
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.message || 'Certificat introuvable');
        }

        if (!cancelled) {
          setData(json.data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Impossible de charger le certificat');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [certificat]);

  if (!certificat) return null;

  // ⭐ Valeurs par défaut tant que l'API n'a pas répondu
  const nomApprenant   = data?.nom_prenom       || 'Apprenant';
  const formationNom   = data?.formation_nom    || 'Formation';
  const codeCertificat = data?.code_certificat  || 'CERT-XXXX-XXXX';
  const annee          = data?.annee_obtention  || new Date().getFullYear();
  const categorie      = data?.categorie        || 'Gestion commerciale';
  const diplome        = data?.diplome          || '';
  const signataire     = data?.signataire       || 'La Direction Générale';
  const qrCodeUrl      = data?.qr_code_url      || '';

  // ─── Capture la vue en image ───
  const captureImage = async () => {
    if (!viewShotRef.current) throw new Error('Vue introuvable');
    return await viewShotRef.current.capture();
  };

  // ─── Télécharge en Image ───
  const downloadImage = async () => {
    setDownloading(true);
    try {
      const uri = await captureImage();
      const safeName = codeCertificat.replace(/[^A-Za-z0-9_-]/g, '_');
      const newUri = `${FileSystem.cacheDirectory}Certificat_${safeName}.png`;

      await FileSystem.moveAsync({ from: uri, to: newUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'image/png',
          dialogTitle: `Certificat ${codeCertificat}`,
        });
      } else {
        Alert.alert('Succès', `Image enregistrée :\n${newUri}`);
      }
    } catch (e) {
      console.error('Image error:', e);
      Alert.alert('Erreur', "Impossible de générer l'image : " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  // ─── Rendu ───
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={ROUAH.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Certificat
        </Text>
        <TouchableOpacity
          onPress={downloadImage}
          style={styles.headerBtn}
          disabled={downloading || loading || !!error}
        >
          {downloading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="download-outline" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={ROUAH.primary} size="large" />
            <Text style={styles.loadingText}>Chargement du certificat...</Text>
          </View>
        )}

        {/* Erreur */}
        {!!error && !loading && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={40} color={ROUAH.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ⭐ Carte certificat (design identique) */}
        {!loading && !error && data && (
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}
            style={styles.viewShot}
          >
            <View style={styles.certificatCard}>
              {/* Bande latérale décorative */}
              <View style={styles.sideBand} />

              <View style={styles.certContent}>
                {/* Header */}
                <View style={styles.certHeader}>
                  <View style={styles.brandBox}>
                    <Text style={styles.brandLogo}>Rouah</Text>
                    <Text style={styles.brandSub}>Solution digitale</Text>
                  </View>

                  <View style={styles.schoolBox}>
                    <MaterialCommunityIcons
                      name="school"
                      size={22}
                      color={ROUAH.primary}
                    />
                    <View>
                      <Text style={styles.schoolName}>École des Champions</Text>
                      <Text style={styles.schoolTag}>Se former et réussir</Text>
                    </View>
                  </View>

                  <View style={[styles.brandBox, { alignItems: 'flex-end' }]}>
                    <Text
                      style={[
                        styles.brandLogo,
                        { color: ROUAH.secondary, fontSize: 16 },
                      ]}
                    >
                      MANDIGO
                    </Text>
                    <Text style={styles.brandSub}>Société informatique</Text>
                  </View>
                </View>

                {/* Titre */}
                <Text style={styles.mainTitle}>CERTIFICAT DE FORMATION</Text>

                <View style={styles.certNumberWrapper}>
                  <Text style={styles.certNumber}>N° {codeCertificat}</Text>
                </View>

                {/* Destinataire */}
                <Text style={styles.presentedTo}>
                  Le présent certificat est délivré à
                </Text>
                <Text style={styles.studentName}>{nomApprenant}</Text>
                <Text style={styles.followed}>
                  pour avoir suivi avec succès la formation intitulée
                </Text>

                {/* Formation */}
                <View style={styles.formationBox}>
                  <Text style={styles.formationTitle}>{formationNom}</Text>
                  {diplome ? (
                    <Text style={styles.formationSub}>{categorie}</Text>
                  ) : null}
                </View>

                {/* Infos */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={ROUAH.primary}
                    />
                    <Text style={styles.infoLabel}>Année de formation</Text>
                    <Text style={styles.infoValue}>{annee}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={ROUAH.primary}
                    />
                    <Text style={styles.infoLabel}>Organisée</Text>
                    <Text style={styles.infoValue}>En ligne</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Ionicons
                      name="people-outline"
                      size={16}
                      color={ROUAH.primary}
                    />
                    <Text style={styles.infoLabel}>Domaine</Text>
                    <Text style={styles.infoValue}>{categorie}</Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.description}>
                  Cette formation lui a permis d'acquérir des connaissances
                  théoriques et des compétences pratiques.{'\n\n'}
                  En foi de quoi, le présent certificat lui est délivré pour
                  servir et valoir ce que de droit.
                </Text>

                {/* Footer */}
                <View style={styles.certFooter}>
                  <View style={styles.qrBox}>
                    {qrCodeUrl ? (
                      <Image
                        source={{ uri: qrCodeUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.qrImage} />
                    )}
                    <Text style={styles.qrLabel}>
                      Vérifiez l'authenticité{'\n'}sur rouah.net
                    </Text>
                  </View>

                  <View style={styles.signatureBox}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signatureName}>{signataire}</Text>
                    <Text style={styles.signatureRole}>
                      Direction Générale
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ViewShot>
        )}

        {/* Actions */}
        {!loading && !error && data && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnImage]}
              onPress={downloadImage}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Télécharger en Image</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════
//  STYLES (identiques à ton fichier actuel)
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ROUAH.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ROUAH.primary,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 46 : 16,
    paddingBottom: 14,
  },
  headerBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },

  scrollContent: { padding: 16, paddingBottom: 40 },

  loadingBox: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: ROUAH.muted,
    fontSize: 13,
  },

  errorBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    marginTop: 20,
  },
  errorText: {
    color: ROUAH.danger,
    fontSize: 13,
    textAlign: 'center',
  },

  viewShot: { backgroundColor: 'transparent' },

  // Carte certificat (même design que ton fichier)
  certificatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  sideBand: {
    width: 30,
    backgroundColor: ROUAH.primary,
  },

  certContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },

  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: ROUAH.primary,
    paddingBottom: 8,
    marginBottom: 12,
  },
  brandBox: {},
  brandLogo: {
    fontSize: 18,
    fontWeight: '900',
    color: ROUAH.primary,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 8,
    color: ROUAH.muted,
    lineHeight: 11,
    marginTop: 2,
  },
  schoolBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  schoolName: {
    fontSize: 12,
    fontWeight: '800',
    color: ROUAH.primary,
  },
  schoolTag: {
    fontSize: 8,
    color: ROUAH.secondary,
    lineHeight: 10,
  },

  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: ROUAH.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  certNumberWrapper: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  certNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: ROUAH.secondary,
    borderBottomWidth: 1,
    borderBottomColor: ROUAH.secondary,
    paddingBottom: 4,
    paddingHorizontal: 12,
  },

  presentedTo: {
    fontSize: 11,
    color: ROUAH.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  studentName: {
    fontSize: 30,
    fontWeight: '700',
    fontStyle: 'italic',
    color: ROUAH.primary,
    textAlign: 'center',
    marginVertical: 6,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  followed: {
    fontSize: 10,
    color: ROUAH.muted,
    textAlign: 'center',
    marginBottom: 10,
  },

  formationBox: {
    backgroundColor: ROUAH.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginVertical: 8,
  },
  formationTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  formationSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },

  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ROUAH.border,
    marginVertical: 10,
    gap: 8,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 9,
    color: ROUAH.muted,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 10,
    color: ROUAH.text,
    fontWeight: '700',
    textAlign: 'center',
  },

  description: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 15,
    textAlign: 'center',
    marginVertical: 8,
  },

  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
  },
  qrBox: {
    alignItems: 'center',
    gap: 4,
  },
  qrImage: {
    width: 60,
    height: 60,
  },
  qrLabel: {
    fontSize: 7,
    color: ROUAH.muted,
    textAlign: 'center',
    lineHeight: 10,
  },
  signatureBox: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 12,
  },
  signatureLine: {
    width: 100,
    borderTopWidth: 1,
    borderTopColor: ROUAH.primary,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: '700',
    color: ROUAH.primary,
  },
  signatureRole: {
    fontSize: 8,
    color: ROUAH.muted,
  },

  actionsContainer: {
    marginTop: 20,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnImage: {
    backgroundColor: ROUAH.secondary,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CertificatModal;