// Profil.js — Modal Profil Utilisateur (appelé depuis Header.js)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://rouah.net/api/api-profil.php';

// ============================================================
// COULEURS
// ============================================================
const COLORS = {
  primary: '#075E54',
  primaryDark: '#064239',
  primaryLight: '#E8F5E9',
  background: '#f7f8fa',
  surface: '#ffffff',
  border: '#eef0f2',
  text: '#111b21',
  muted: '#667781',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
};

export default function Profil({
  visible,
  onClose,
  societeId,
  user,
  onProfilUpdated,
}) {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [profil, setProfil]       = useState(null);
  const [photo, setPhoto]         = useState(null);
  const [photoType, setPhotoType] = useState(null);
  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState({
    nom_prenom: '',
    telephone: '',
    email: '',
    matricule: '',
  });

  // Modal mot de passe
  const [pwdModal, setPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ nouveau_mdp: '', confirm_mdp: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  const load = useCallback(async () => {
    if (!user?.utilisateur_id) return;
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_profil',
          utilisateur_id: user.utilisateur_id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setProfil(json.data);
        setPhoto(json.data.photo || null);
        setPhotoType(json.data.type || null);
        setForm({
          nom_prenom: json.data.nom_prenom || '',
          telephone:  json.data.telephone  || '',
          email:      json.data.email      || '',
          matricule:  json.data.matricule  || '',
        });
      } else {
        Alert.alert('Erreur', json.message || 'Impossible de charger le profil');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Erreur réseau : ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Recharge à chaque ouverture du modal
  useEffect(() => {
    if (visible) {
      setEditMode(false);
      load();
    }
  }, [visible, load]);

  // ============================================================
  // PHOTO
  // ============================================================
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Autorisez l\'accès à la galerie pour changer la photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Erreur', 'Impossible de lire l\'image');
        return;
      }

      const ext = (asset.uri.split('.').pop() || 'jpeg').toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      const dataUri = `data:${mime};base64,${asset.base64}`;

      await uploadPhoto(dataUri);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  const uploadPhoto = async (base64DataUri) => {
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_photo',
          utilisateur_id: user.utilisateur_id,
          photo: base64DataUri,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPhoto(json.photo);
        setPhotoType(json.type || null);
        if (onProfilUpdated) onProfilUpdated({ photo: json.photo, type: json.type || null });
      } else {
        Alert.alert('Erreur', json.message || 'Échec de l\'upload');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const deletePhoto = () => {
    Alert.alert('Supprimer la photo', 'Voulez-vous vraiment supprimer votre photo de profil ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'delete_photo',
                utilisateur_id: user.utilisateur_id,
              }),
            });
            const json = await res.json();
            if (json.success) {
              setPhoto(null);
              setPhotoType(null);
              if (onProfilUpdated) onProfilUpdated({ photo: null,type: null });
            } else {
              Alert.alert('Erreur', json.message);
            }
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        },
      },
    ]);
  };

  // ============================================================
  // SAUVEGARDE PROFIL
  // ============================================================
  const saveProfil = async () => {
    if (!form.nom_prenom.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      Alert.alert('Erreur', 'Email invalide');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profil',
          utilisateur_id: user.utilisateur_id,
          ...form,
        }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('Succès', json.message);
        setEditMode(false);
        await load();
        if (onProfilUpdated) onProfilUpdated(form);
      } else {
        Alert.alert('Erreur', json.message || 'Échec de la mise à jour');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setForm({
      nom_prenom: profil?.nom_prenom || '',
      telephone:  profil?.telephone  || '',
      email:      profil?.email      || '',
      matricule:  profil?.matricule  || '',
    });
    setEditMode(false);
  };

  // ============================================================
  // MOT DE PASSE
  // ============================================================
 const savePassword = async () => {
  if (!pwdForm.nouveau_mdp) {
    Alert.alert('Erreur', 'Le nouveau mot de passe est obligatoire');
    return;
  }
  if (pwdForm.nouveau_mdp.length < 6) {
    Alert.alert('Erreur', 'Le mot de passe doit faire au moins 6 caractères');
    return;
  }
  if (pwdForm.nouveau_mdp !== pwdForm.confirm_mdp) {
    Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
    return;
  }

  setPwdSaving(true);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'change_password',
        utilisateur_id: user.utilisateur_id,
        nouveau_mdp: pwdForm.nouveau_mdp,
      }),
    });
    const json = await res.json();
    if (json.success) {
      Alert.alert('Succès', json.message);
      setPwdModal(false);
      setPwdForm({ nouveau_mdp: '', confirm_mdp: '' });
    } else {
      Alert.alert('Erreur', json.message);
    }
  } catch (e) {
    Alert.alert('Erreur', e.message);
  } finally {
    setPwdSaving(false);
  }
};

  // ============================================================
  // RENDU
  // ============================================================
  const initiale = (profil?.nom_prenom || '?').charAt(0).toUpperCase();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalWrapper}>

        {/* ===== HEADER ===== */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Mon profil</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {!loading && (
              editMode ? (
                <TouchableOpacity onPress={cancelEdit}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setEditMode(true)}>
                  <Ionicons name="create-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Chargement du profil...</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >

              {/* ===== AVATAR ===== */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarWrapper}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{initiale}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.cameraBtn} onPress={pickImage} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="camera" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                  {photo && (
                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={deletePhoto}>
                      <Ionicons name="trash" size={14} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.avatarName}>{profil?.nom_prenom || '—'}</Text>
                <View style={styles.roleBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
                  <Text style={styles.roleBadgeText}>{profil?.role || 'Utilisateur'}</Text>
                </View>
                <Text style={styles.loginText}>@{profil?.login || ''}</Text>
              </View>

              {/* ===== INFOS ===== */}
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Informations personnelles</Text>
                </View>

                {editMode ? (
                  <>
                    <Field label="Nom complet *" value={form.nom_prenom}
                           onChange={(v) => setForm({ ...form, nom_prenom: v })} />
                    <Field label="Téléphone" value={form.telephone}
                           onChange={(v) => setForm({ ...form, telephone: v })}
                           keyboardType="phone-pad" />
                    <Field label="Email" value={form.email}
                           onChange={(v) => setForm({ ...form, email: v })}
                           keyboardType="email-address" autoCapitalize="none" />
                    <Field label="Matricule" value={form.matricule}
                           onChange={(v) => setForm({ ...form, matricule: v })} />

                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={saving}>
                        <Text style={styles.cancelBtnText}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveBtn} onPress={saveProfil} disabled={saving}>
                        {saving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={18} color="#fff" />
                            <Text style={styles.saveBtnText}>Enregistrer</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <InfoRow label="Nom complet" value={profil?.nom_prenom} />
                    <InfoRow label="Téléphone"   value={profil?.telephone} />
                    <InfoRow label="Email"       value={profil?.email} />
                    <InfoRow label="Matricule"   value={profil?.matricule} />
                    <InfoRow label="Login"       value={profil?.login} locked />
                    <InfoRow label="Rôle"        value={profil?.role} locked />
                    <InfoRow label="Statut"      value={profil?.statut} locked
                             valueColor={profil?.statut === 'actif' ? COLORS.success : COLORS.danger} />
                    <InfoRow label="Date d'inscription"
                             value={profil?.date_saisie ? new Date(profil.date_saisie).toLocaleDateString('fr-FR') : ''}
                             locked />
                  </>
                )}
              </View>

              {/* ===== SÉCURITÉ ===== */}
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Sécurité</Text>
                </View>

                <TouchableOpacity style={styles.securityRow} onPress={() => setPwdModal(true)}>
                  <View style={styles.securityRowLeft}>
                    <Ionicons name="key-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.securityText}>Changer le mot de passe</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
                </TouchableOpacity>
              </View>

              <View style={{ height: 30 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ===== MODAL MOT DE PASSE ===== */}
        <Modal visible={pwdModal} animationType="slide" transparent onRequestClose={() => setPwdModal(false)}>
  <View style={styles.pwdOverlay}>
    <View style={styles.pwdContent}>
      <View style={styles.pwdHeader}>
        <Text style={styles.pwdTitle}>Changer le mot de passe</Text>
        <TouchableOpacity onPress={() => setPwdModal(false)}>
          <Ionicons name="close-circle" size={28} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* ❌ Plus de champ "Ancien mot de passe" */}

      <Field label="Nouveau mot de passe" value={pwdForm.nouveau_mdp}
             onChange={(v) => setPwdForm({ ...pwdForm, nouveau_mdp: v })}
             secureTextEntry />
      <Field label="Confirmer le nouveau mot de passe" value={pwdForm.confirm_mdp}
             onChange={(v) => setPwdForm({ ...pwdForm, confirm_mdp: v })}
             secureTextEntry />

      <TouchableOpacity
        style={[styles.saveBtn, { marginTop: 16, width: '100%', justifyContent: 'center' }]}
        onPress={savePassword}
        disabled={pwdSaving}
      >
        {pwdSaving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Valider</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  </View>
</Modal>
      </View>
    </Modal>
  );
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================
function Field({ label, value, onChange, secureTextEntry, keyboardType, autoCapitalize }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor="#999"
      />
    </View>
  );
}

function InfoRow({ label, value, valueColor, locked }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueRow}>
        <Text style={[styles.infoValue, valueColor && { color: valueColor }]} numberOfLines={1}>
          {value || '—'}
        </Text>
        {locked && <Ionicons name="lock-closed" size={12} color={COLORS.muted} style={{ marginLeft: 6 }} />}
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  modalWrapper: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.primary, marginTop: 12, fontSize: 14 },

  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    backgroundColor: COLORS.primary,
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  scrollContent: { padding: 14, paddingBottom: 40 },

  // ===== AVATAR =====
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarImage: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, borderColor: COLORS.primary,
  },
  avatarFallback: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: COLORS.primaryLight,
  },
  avatarFallbackText: { color: '#fff', fontSize: 42, fontWeight: '800' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  deletePhotoBtn: {
    position: 'absolute', top: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.danger,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarName: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  roleBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  loginText: { fontSize: 12, color: COLORS.muted, marginTop: 6 },

  // ===== CARTES =====
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, flex: 1 },

  // ===== INFO ROWS =====
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  infoLabel: { fontSize: 13, color: COLORS.muted },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  infoValue: { fontSize: 13, color: COLORS.text, fontWeight: '600', maxWidth: '70%' },

  // ===== FIELDS =====
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4 },
  fieldInput: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: COLORS.text, backgroundColor: '#fafafa',
  },

  // ===== BOUTONS =====
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 11,
    backgroundColor: '#f1f5f9', alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.muted, fontWeight: '700', fontSize: 14 },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 11,
    backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ===== SÉCURITÉ =====
  securityRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12,
  },
  securityRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },

  // ===== MODAL MOT DE PASSE =====
  pwdOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  pwdContent: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 420,
  },
  pwdHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  pwdTitle: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
});