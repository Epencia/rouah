// screens/Inscription.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_REGISTER_URL = 'https://rouah.net/api/api-inscription.php';

// ================================================================
// ⭐ LISTE COMPLÈTE DES PAYS DU MONDE
// ================================================================
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan',                dial: '+93',  flag: '🇦🇫' },
  { code: 'ZA', name: 'Afrique du Sud',             dial: '+27',  flag: '🇿🇦' },
  { code: 'AL', name: 'Albanie',                    dial: '+355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algérie',                    dial: '+213', flag: '🇩🇿' },
  { code: 'DE', name: 'Allemagne',                  dial: '+49',  flag: '🇩🇪' },
  { code: 'AD', name: 'Andorre',                    dial: '+376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola',                     dial: '+244', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua-et-Barbuda',         dial: '+1268',flag: '🇦🇬' },
  { code: 'SA', name: 'Arabie saoudite',            dial: '+966', flag: '🇸🇦' },
  { code: 'AR', name: 'Argentine',                  dial: '+54',  flag: '🇦🇷' },
  { code: 'AM', name: 'Arménie',                    dial: '+374', flag: '🇦🇲' },
  { code: 'AU', name: 'Australie',                  dial: '+61',  flag: '🇦🇺' },
  { code: 'AT', name: 'Autriche',                   dial: '+43',  flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaïdjan',                dial: '+994', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas',                    dial: '+1242',flag: '🇧🇸' },
  { code: 'BH', name: 'Bahreïn',                    dial: '+973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh',                 dial: '+880', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbade',                    dial: '+1246',flag: '🇧🇧' },
  { code: 'BE', name: 'Belgique',                   dial: '+32',  flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize',                     dial: '+501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Bénin',                      dial: '+229', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhoutan',                    dial: '+975', flag: '🇧🇹' },
  { code: 'BY', name: 'Biélorussie',                dial: '+375', flag: '🇧🇾' },
  { code: 'MM', name: 'Birmanie (Myanmar)',         dial: '+95',  flag: '🇲🇲' },
  { code: 'BO', name: 'Bolivie',                    dial: '+591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnie-Herzégovine',         dial: '+387', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana',                   dial: '+267', flag: '🇧🇼' },
  { code: 'BR', name: 'Brésil',                     dial: '+55',  flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei',                     dial: '+673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgarie',                   dial: '+359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso',               dial: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi',                    dial: '+257', flag: '🇧🇮' },
  { code: 'KH', name: 'Cambodge',                   dial: '+855', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroun',                   dial: '+237', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada',                     dial: '+1',   flag: '🇨🇦' },
  { code: 'CV', name: 'Cap-Vert',                   dial: '+238', flag: '🇨🇻' },
  { code: 'CF', name: 'Centrafrique',               dial: '+236', flag: '🇨🇫' },
  { code: 'CL', name: 'Chili',                      dial: '+56',  flag: '🇨🇱' },
  { code: 'CN', name: 'Chine',                      dial: '+86',  flag: '🇨🇳' },
  { code: 'CY', name: 'Chypre',                     dial: '+357', flag: '🇨🇾' },
  { code: 'CO', name: 'Colombie',                   dial: '+57',  flag: '🇨🇴' },
  { code: 'KM', name: 'Comores',                    dial: '+269', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo-Brazzaville',          dial: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'Congo (RDC)',                dial: '+243', flag: '🇨🇩' },
  { code: 'KP', name: 'Corée du Nord',              dial: '+850', flag: '🇰🇵' },
  { code: 'KR', name: 'Corée du Sud',               dial: '+82',  flag: '🇰🇷' },
  { code: 'CR', name: 'Costa Rica',                 dial: '+506', flag: '🇨🇷' },
  { code: 'CI', name: "Côte d'Ivoire",              dial: '+225', flag: '🇨🇮' },
  { code: 'HR', name: 'Croatie',                    dial: '+385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba',                       dial: '+53',  flag: '🇨🇺' },
  { code: 'DK', name: 'Danemark',                   dial: '+45',  flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti',                   dial: '+253', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominique',                  dial: '+1767',flag: '🇩🇲' },
  { code: 'EG', name: 'Égypte',                     dial: '+20',  flag: '🇪🇬' },
  { code: 'AE', name: 'Émirats arabes unis',        dial: '+971', flag: '🇦🇪' },
  { code: 'EC', name: 'Équateur',                   dial: '+593', flag: '🇪🇨' },
  { code: 'ER', name: 'Érythrée',                   dial: '+291', flag: '🇪🇷' },
  { code: 'ES', name: 'Espagne',                    dial: '+34',  flag: '🇪🇸' },
  { code: 'EE', name: 'Estonie',                    dial: '+372', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini',                   dial: '+268', flag: '🇸🇿' },
  { code: 'US', name: 'États-Unis',                 dial: '+1',   flag: '🇺🇸' },
  { code: 'ET', name: 'Éthiopie',                   dial: '+251', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fidji',                      dial: '+679', flag: '🇫🇯' },
  { code: 'FI', name: 'Finlande',                   dial: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'France',                     dial: '+33',  flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon',                      dial: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambie',                     dial: '+220', flag: '🇬🇲' },
  { code: 'GE', name: 'Géorgie',                    dial: '+995', flag: '🇬🇪' },
  { code: 'GH', name: 'Ghana',                      dial: '+233', flag: '🇬🇭' },
  { code: 'GR', name: 'Grèce',                      dial: '+30',  flag: '🇬🇷' },
  { code: 'GD', name: 'Grenade',                    dial: '+1473',flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala',                  dial: '+502', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinée',                     dial: '+224', flag: '🇬🇳' },
  { code: 'GQ', name: 'Guinée équatoriale',         dial: '+240', flag: '🇬🇶' },
  { code: 'GW', name: 'Guinée-Bissau',              dial: '+245', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana',                     dial: '+592', flag: '🇬🇾' },
  { code: 'HT', name: 'Haïti',                      dial: '+509', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras',                   dial: '+504', flag: '🇭🇳' },
  { code: 'HU', name: 'Hongrie',                    dial: '+36',  flag: '🇭🇺' },
  { code: 'IN', name: 'Inde',                       dial: '+91',  flag: '🇮🇳' },
  { code: 'ID', name: 'Indonésie',                  dial: '+62',  flag: '🇮🇩' },
  { code: 'IQ', name: 'Irak',                       dial: '+964', flag: '🇮🇶' },
  { code: 'IR', name: 'Iran',                       dial: '+98',  flag: '🇮🇷' },
  { code: 'IE', name: 'Irlande',                    dial: '+353', flag: '🇮🇪' },
  { code: 'IS', name: 'Islande',                    dial: '+354', flag: '🇮🇸' },
  { code: 'IL', name: 'Israël',                     dial: '+972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italie',                     dial: '+39',  flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaïque',                   dial: '+1876',flag: '🇯🇲' },
  { code: 'JP', name: 'Japon',                      dial: '+81',  flag: '🇯🇵' },
  { code: 'JO', name: 'Jordanie',                   dial: '+962', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan',                 dial: '+7',   flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya',                      dial: '+254', flag: '🇰🇪' },
  { code: 'KG', name: 'Kirghizistan',               dial: '+996', flag: '🇰🇬' },
  { code: 'KI', name: 'Kiribati',                   dial: '+686', flag: '🇰🇮' },
  { code: 'XK', name: 'Kosovo',                     dial: '+383', flag: '🇽🇰' },
  { code: 'KW', name: 'Koweït',                     dial: '+965', flag: '🇰🇼' },
  { code: 'LA', name: 'Laos',                       dial: '+856', flag: '🇱🇦' },
  { code: 'LS', name: 'Lesotho',                    dial: '+266', flag: '🇱🇸' },
  { code: 'LV', name: 'Lettonie',                   dial: '+371', flag: '🇱🇻' },
  { code: 'LB', name: 'Liban',                      dial: '+961', flag: '🇱🇧' },
  { code: 'LR', name: 'Liberia',                    dial: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libye',                      dial: '+218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein',              dial: '+423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lituanie',                   dial: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg',                 dial: '+352', flag: '🇱🇺' },
  { code: 'MK', name: 'Macédoine du Nord',          dial: '+389', flag: '🇲🇰' },
  { code: 'MG', name: 'Madagascar',                 dial: '+261', flag: '🇲🇬' },
  { code: 'MY', name: 'Malaisie',                   dial: '+60',  flag: '🇲🇾' },
  { code: 'MW', name: 'Malawi',                     dial: '+265', flag: '🇲🇼' },
  { code: 'MV', name: 'Maldives',                   dial: '+960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali',                       dial: '+223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malte',                      dial: '+356', flag: '🇲🇹' },
  { code: 'MA', name: 'Maroc',                      dial: '+212', flag: '🇲🇦' },
  { code: 'MH', name: 'Marshall',                   dial: '+692', flag: '🇲🇭' },
  { code: 'MU', name: 'Maurice',                    dial: '+230', flag: '🇲🇺' },
  { code: 'MR', name: 'Mauritanie',                 dial: '+222', flag: '🇲🇷' },
  { code: 'MX', name: 'Mexique',                    dial: '+52',  flag: '🇲🇽' },
  { code: 'FM', name: 'Micronésie',                 dial: '+691', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldavie',                   dial: '+373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco',                     dial: '+377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolie',                   dial: '+976', flag: '🇲🇳' },
  { code: 'ME', name: 'Monténégro',                 dial: '+382', flag: '🇲🇪' },
  { code: 'MZ', name: 'Mozambique',                 dial: '+258', flag: '🇲🇿' },
  { code: 'NA', name: 'Namibie',                    dial: '+264', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru',                      dial: '+674', flag: '🇳🇷' },
  { code: 'NP', name: 'Népal',                      dial: '+977', flag: '🇳🇵' },
  { code: 'NI', name: 'Nicaragua',                  dial: '+505', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger',                      dial: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria',                    dial: '+234', flag: '🇳🇬' },
  { code: 'NO', name: 'Norvège',                    dial: '+47',  flag: '🇳🇴' },
  { code: 'NZ', name: 'Nouvelle-Zélande',           dial: '+64',  flag: '🇳🇿' },
  { code: 'OM', name: 'Oman',                       dial: '+968', flag: '🇴🇲' },
  { code: 'UG', name: 'Ouganda',                    dial: '+256', flag: '🇺🇬' },
  { code: 'UZ', name: 'Ouzbékistan',                dial: '+998', flag: '🇺🇿' },
  { code: 'PK', name: 'Pakistan',                   dial: '+92',  flag: '🇵🇰' },
  { code: 'PW', name: 'Palaos',                     dial: '+680', flag: '🇵🇼' },
  { code: 'PS', name: 'Palestine',                  dial: '+970', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama',                     dial: '+507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papouasie-Nouvelle-Guinée',  dial: '+675', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay',                   dial: '+595', flag: '🇵🇾' },
  { code: 'NL', name: 'Pays-Bas',                   dial: '+31',  flag: '🇳🇱' },
  { code: 'PE', name: 'Pérou',                      dial: '+51',  flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines',                dial: '+63',  flag: '🇵🇭' },
  { code: 'PL', name: 'Pologne',                    dial: '+48',  flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal',                   dial: '+351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar',                      dial: '+974', flag: '🇶🇦' },
  { code: 'RO', name: 'Roumanie',                   dial: '+40',  flag: '🇷🇴' },
  { code: 'GB', name: 'Royaume-Uni',                dial: '+44',  flag: '🇬🇧' },
  { code: 'RU', name: 'Russie',                     dial: '+7',   flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda',                     dial: '+250', flag: '🇷🇼' },
  { code: 'KN', name: 'Saint-Kitts-et-Nevis',       dial: '+1869',flag: '🇰🇳' },
  { code: 'SM', name: 'Saint-Marin',                dial: '+378', flag: '🇸🇲' },
  { code: 'VC', name: 'Saint-Vincent-et-les-Grenadines', dial: '+1784', flag: '🇻🇨' },
  { code: 'LC', name: 'Sainte-Lucie',               dial: '+1758',flag: '🇱🇨' },
  { code: 'SB', name: 'Salomon',                    dial: '+677', flag: '🇸🇧' },
  { code: 'SV', name: 'Salvador',                   dial: '+503', flag: '🇸🇻' },
  { code: 'WS', name: 'Samoa',                      dial: '+685', flag: '🇼🇸' },
  { code: 'ST', name: 'Sao Tomé-et-Principe',       dial: '+239', flag: '🇸🇹' },
  { code: 'SN', name: 'Sénégal',                    dial: '+221', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbie',                     dial: '+381', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles',                 dial: '+248', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone',               dial: '+232', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapour',                  dial: '+65',  flag: '🇸🇬' },
  { code: 'SK', name: 'Slovaquie',                  dial: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovénie',                   dial: '+386', flag: '🇸🇮' },
  { code: 'SO', name: 'Somalie',                    dial: '+252', flag: '🇸🇴' },
  { code: 'SD', name: 'Soudan',                     dial: '+249', flag: '🇸🇩' },
  { code: 'SS', name: 'Soudan du Sud',              dial: '+211', flag: '🇸🇸' },
  { code: 'LK', name: 'Sri Lanka',                  dial: '+94',  flag: '🇱🇰' },
  { code: 'SE', name: 'Suède',                      dial: '+46',  flag: '🇸🇪' },
  { code: 'CH', name: 'Suisse',                     dial: '+41',  flag: '🇨🇭' },
  { code: 'SR', name: 'Suriname',                   dial: '+597', flag: '🇸🇷' },
  { code: 'SY', name: 'Syrie',                      dial: '+963', flag: '🇸🇾' },
  { code: 'TJ', name: 'Tadjikistan',                dial: '+992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzanie',                   dial: '+255', flag: '🇹🇿' },
  { code: 'TD', name: 'Tchad',                      dial: '+235', flag: '🇹🇩' },
  { code: 'CZ', name: 'Tchéquie',                   dial: '+420', flag: '🇨🇿' },
  { code: 'TH', name: 'Thaïlande',                  dial: '+66',  flag: '🇹🇭' },
  { code: 'TL', name: 'Timor oriental',             dial: '+670', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo',                       dial: '+228', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga',                      dial: '+676', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinité-et-Tobago',          dial: '+1868',flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisie',                    dial: '+216', flag: '🇹🇳' },
  { code: 'TM', name: 'Turkménistan',               dial: '+993', flag: '🇹🇲' },
  { code: 'TR', name: 'Turquie',                    dial: '+90',  flag: '🇹🇷' },
  { code: 'TV', name: 'Tuvalu',                     dial: '+688', flag: '🇹🇻' },
  { code: 'UA', name: 'Ukraine',                    dial: '+380', flag: '🇺🇦' },
  { code: 'UY', name: 'Uruguay',                    dial: '+598', flag: '🇺🇾' },
  { code: 'VU', name: 'Vanuatu',                    dial: '+678', flag: '🇻🇺' },
  { code: 'VA', name: 'Vatican',                    dial: '+379', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela',                  dial: '+58',  flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam',                    dial: '+84',  flag: '🇻🇳' },
  { code: 'YE', name: 'Yémen',                      dial: '+967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambie',                     dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe',                   dial: '+263', flag: '🇿🇼' },
];

// ⭐ Par défaut : Côte d'Ivoire
const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.code === 'CI') || COUNTRIES[0];

// Tri alphabétique pour l'affichage
const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) =>
  a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
);

// ⭐ Fonction pour retirer les accents (pour la recherche)
const normalize = (str) =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// ================================================================
// ⭐ MODAL : Sélection de pays avec recherche
// ================================================================
function CountryPickerModal({ visible, onClose, onSelect, selected }) {
  const [search, setSearch] = useState('');

  // Filtre les pays selon la recherche (nom ou indicatif)
  const filteredCountries = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return SORTED_COUNTRIES;
    return SORTED_COUNTRIES.filter((c) => {
      const nameNorm = normalize(c.name);
      const dialNorm = normalize(c.dial);
      const codeNorm = normalize(c.code);
      return (
        nameNorm.includes(q) ||
        dialNorm.includes(q) ||
        codeNorm.includes(q)
      );
    });
  }, [search]);

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          {/* Header */}
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choisir un pays</Text>
            <TouchableOpacity onPress={handleClose} style={styles.pickerClose}>
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          {/* ⭐ Barre de recherche */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un pays ou un indicatif…"
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Liste */}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={30}
            windowSize={10}
            renderItem={({ item }) => {
              const isActive = selected?.code === item.code;
              return (
                <TouchableOpacity
                  style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                  onPress={() => {
                    onSelect(item);
                    handleClose();
                  }}
                >
                  <Text style={styles.pickerFlag}>{item.flag}</Text>
                  <Text
                    style={[styles.pickerName, isActive && styles.pickerNameActive]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.pickerDial, isActive && styles.pickerDialActive]}
                  >
                    {item.dial}
                  </Text>
                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#075E54"
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="search" size={40} color="#ccc" />
                <Text style={styles.emptyText}>
                  Aucun pays trouvé pour « {search} »
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

// ================================================================
// ⭐ COMPOSANT : Champ téléphone avec indicatif
// ================================================================
function PhoneInput({ value, onChangeText, country, onOpenPicker, placeholder }) {
  return (
    <View style={styles.phoneRow}>
      <TouchableOpacity
        style={styles.phoneCountryBtn}
        onPress={onOpenPicker}
        activeOpacity={0.7}
      >
        <Text style={styles.phoneFlag}>{country.flag}</Text>
        <Text style={styles.phoneDial}>{country.dial}</Text>
        <Ionicons name="chevron-down" size={14} color="#666" />
      </TouchableOpacity>

      <TextInput
        style={styles.phoneInput}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        keyboardType="phone-pad"
      />
    </View>
  );
}

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================
export default function InscriptionModal({
  visible,
  onClose,
  onLoginPress,
  onRegisterSuccess,
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ⭐ Pays sélectionnés
  const [societeCountry, setSocieteCountry] = useState(DEFAULT_COUNTRY);
  const [userCountry, setUserCountry] = useState(DEFAULT_COUNTRY);

  // Picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('societe');

  // Société
  const [societe, setSociete] = useState({
    nom: '',
    sigle: '',
    telephone: '',
    email: '',
  });

  // Utilisateur
  const [utilisateur, setUtilisateur] = useState({
    nom_prenom: '',
    login: '',
    mdp: '',
    telephone: '',
    email: '',
  });

  const setS = (key, value) => setSociete({ ...societe, [key]: value });
  const setU = (key, value) => setUtilisateur({ ...utilisateur, [key]: value });

  const openCountryPicker = (target) => {
    setPickerTarget(target);
    setPickerVisible(true);
  };

  const handleSelectCountry = (country) => {
    if (pickerTarget === 'societe') setSocieteCountry(country);
    else setUserCountry(country);
  };

  // ⭐ Formate un numéro complet : "+225 0707070707"
  const buildFullPhone = (dial, localNumber) => {
    const cleaned = String(localNumber || '').replace(/[^0-9]/g, '');
    if (!cleaned) return '';
    return `${dial} ${cleaned}`;
  };

  const validateSociete = () => {
    if (!societe.nom.trim()) {
      setError('Le nom de la société est obligatoire');
      return false;
    }
    if (!societe.email.trim()) {
      setError("L'email de la société est obligatoire");
      return false;
    }
    return true;
  };

  const validateUtilisateur = () => {
    if (!utilisateur.nom_prenom.trim()) {
      setError("Le nom de l'utilisateur est obligatoire");
      return false;
    }
    if (!utilisateur.login.trim()) {
      setError('Le login est obligatoire');
      return false;
    }
    if (!utilisateur.mdp.trim() || utilisateur.mdp.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    if (!utilisateur.email.trim()) {
      setError("L'email de l'utilisateur est obligatoire");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (step === 1) {
      if (validateSociete()) {
        setError('');
        setStep(2);
      }
      return;
    }

    if (step === 2) {
      if (!validateUtilisateur()) return;

      setLoading(true);
      setError('');

      try {
        const payload = {
          societe: {
            ...societe,
            telephone: buildFullPhone(societeCountry.dial, societe.telephone),
          },
          utilisateur: {
            ...utilisateur,
            telephone: buildFullPhone(userCountry.dial, utilisateur.telephone),
          },
        };

        const response = await fetch(API_REGISTER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          Alert.alert(
            '🎉 Inscription réussie',
            'Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.',
            [
              {
                text: 'Se connecter',
                onPress: () => {
                  onClose();
                  onRegisterSuccess();
                  if (onLoginPress) onLoginPress();
                },
              },
            ]
          );
          resetForm();
        } else {
          setError(data.error || "Erreur lors de l'inscription");
        }
      } catch (e) {
        setError('Erreur réseau: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setStep(1);
    setError('');
    setSociete({ nom: '', sigle: '', telephone: '', email: '' });
    setUtilisateur({
      nom_prenom: '',
      login: '',
      mdp: '',
      telephone: '',
      email: '',
    });
    setSocieteCountry(DEFAULT_COUNTRY);
    setUserCountry(DEFAULT_COUNTRY);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: '#fff', maxHeight: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 1 ? '📝 Créer une société' : '👤 Créer un compte'}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Progression */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
                <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
                <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
              </View>
              <Text style={styles.progressText}>
                {step === 1
                  ? 'Étape 1/2 : Informations société'
                  : 'Étape 2/2 : Informations utilisateur'}
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {step === 1 ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nom de la société *</Text>
                    <TextInput
                      style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                      placeholder="Nom de votre entreprise"
                      placeholderTextColor="#999"
                      value={societe.nom}
                      onChangeText={(text) => setS('nom', text)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Sigle</Text>
                    <TextInput
                      style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                      placeholder="Sigle de la société"
                      placeholderTextColor="#999"
                      value={societe.sigle}
                      onChangeText={(text) => setS('sigle', text)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Téléphone</Text>
                    <PhoneInput
                      value={societe.telephone}
                      onChangeText={(text) => setS('telephone', text)}
                      country={societeCountry}
                      onOpenPicker={() => openCountryPicker('societe')}
                      placeholder="07 07 07 07 07"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email *</Text>
                    <TextInput
                      style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                      placeholder="Email de la société"
                      placeholderTextColor="#999"
                      value={societe.email}
                      onChangeText={(text) => setS('email', text)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nom complet *</Text>
                    <TextInput
                      style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                      placeholder="Votre nom complet"
                      placeholderTextColor="#999"
                      value={utilisateur.nom_prenom}
                      onChangeText={(text) => setU('nom_prenom', text)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Login *</Text>
                    <TextInput
                      style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                      placeholder="Votre identifiant de connexion"
                      placeholderTextColor="#999"
                      value={utilisateur.login}
                      onChangeText={(text) => setU('login', text)}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mot de passe *</Text>
                    <View style={[styles.passwordWrapper, { backgroundColor: '#f8f9fa' }]}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Minimum 6 caractères"
                        placeholderTextColor="#999"
                        value={utilisateur.mdp}
                        onChangeText={(text) => setU('mdp', text)}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                          size={20}
                          color="#999"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email *</Text>
                    <TextInput
                      style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                      placeholder="Votre email"
                      placeholderTextColor="#999"
                      value={utilisateur.email}
                      onChangeText={(text) => setU('email', text)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Téléphone</Text>
                    <PhoneInput
                      value={utilisateur.telephone}
                      onChangeText={(text) => setU('telephone', text)}
                      country={userCountry}
                      onOpenPicker={() => openCountryPicker('user')}
                      placeholder="07 07 07 07 07"
                    />
                  </View>
                </>
              )}

              <View style={styles.registerActions}>
                {step === 2 && (
                  <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: '#f0f0f0' }]}
                    onPress={() => {
                      setStep(1);
                      setError('');
                    }}
                    disabled={loading}
                  >
                    <Text style={[styles.backBtnText, { color: '#666' }]}>Retour</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.registerBtnText}>
                      {step === 1 ? 'Suivant →' : 'Créer mon compte'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                  Vous avez déjà un compte ?{' '}
                  <Text
                    style={styles.footerLink}
                    onPress={() => {
                      resetForm();
                      onClose();
                      if (onLoginPress) onLoginPress();
                    }}
                  >
                    Se connecter
                  </Text>
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ⭐ Modal de sélection de pays */}
      <CountryPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectCountry}
        selected={pickerTarget === 'societe' ? societeCountry : userCountry}
      />
    </>
  );
}

// ================================================================
// STYLES
// ================================================================
const styles = StyleSheet.create({
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
    maxHeight: '95%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#075E54',
  },
  modalCloseBtn: { padding: 4 },
  modalBody: { padding: 20, paddingBottom: 30 },

  // Progression
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  progressDotActive: { backgroundColor: '#075E54' },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  progressLineActive: { backgroundColor: '#075E54' },
  progressText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginBottom: 16,
  },

  // Erreur
  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#ef4444' },

  // Inputs
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#171717',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#171717',
    paddingVertical: 6,
  },
  eyeBtn: { padding: 4 },

  // Phone row
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 11,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  phoneCountryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 4,
  },
  phoneFlag: { fontSize: 18 },
  phoneDial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#171717',
  },

  // Actions
  registerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 11,
    alignItems: 'center',
  },
  backBtnText: { fontSize: 14, fontWeight: '600' },
  registerBtn: {
    flex: 2,
    backgroundColor: '#075E54',
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
  },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Footer
  footerContainer: { alignItems: 'center', marginTop: 16 },
  footerText: { fontSize: 14, color: '#666' },
  footerLink: { color: '#075E54', fontWeight: '600' },

  // Picker pays
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    height: '85%',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#075E54',
  },
  pickerClose: { padding: 4 },

  // ⭐ Barre de recherche
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7f8',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#171717',
    paddingVertical: 2,
  },

  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  pickerItemActive: {
    backgroundColor: '#E8F5E9',
  },
  pickerFlag: { fontSize: 22 },
  pickerName: {
    flex: 1,
    fontSize: 14,
    color: '#171717',
    fontWeight: '500',
  },
  pickerNameActive: {
    color: '#075E54',
    fontWeight: '700',
  },
  pickerDial: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  pickerDialActive: {
    color: '#075E54',
  },

  // Empty state
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});