import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  Platform,
  Image,
  Switch,
  Share,
  Clipboard,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = 200;
const STANDARD_CARD_RATIO = 1.75; // 85mm x 55mm standard

const CarteVisite = () => {
  const cardRef = useRef();
  const [activeTab, setActiveTab] = useState('design');
  const [isLoading, setIsLoading] = useState(false);

  // Informations de la carte
  const [cardInfo, setCardInfo] = useState({
    firstName: 'Jean',
    lastName: 'DUPONT',
    title: 'Directeur Commercial',
    company: 'ENTREPRISE INNOVANTE',
    phone: '+33 1 23 45 67 89',
    mobile: '+33 6 12 34 56 78',
    email: 'jean.dupont@entreprise.com',
    website: 'www.entreprise-innovante.com',
    address: '123 Avenue des Champs, 75008 Paris',
    linkedin: 'linkedin.com/in/jeandupont',
    twitter: '@jdupont',
  });

  // Design et style
  const [cardDesign, setCardDesign] = useState({
    template: 'modern',
    orientation: 'landscape', // portrait ou landscape
    colorScheme: {
      primary: '#2c3e50',
      secondary: '#3498db',
      background: '#ffffff',
      text: '#333333',
    },
    fontFamily: 'Roboto',
    fontSize: 'normal',
    cornerStyle: 'rounded', // rounded, square, cut
    hasLogo: false,
    logoUrl: null,
    hasQRCode: true,
    qrData: 'https://www.entreprise-innovante.com',
    hasPhoto: false,
    photoUrl: null,
    texture: 'none', // none, dots, lines, grid
    gradient: false,
    shadow: true,
    border: true,
  });

  // Templates prédéfinis
  const templates = [
    { id: 'classic', name: 'Classique', colors: ['#2c3e50', '#34495e'], icon: 'office-building' },
    { id: 'modern', name: 'Moderne', colors: ['#3498db', '#2980b9'], icon: 'home' },
    { id: 'creative', name: 'Créatif', colors: ['#9b59b6', '#8e44ad'], icon: 'palette' },
    { id: 'professional', name: 'Professionnel', colors: ['#27ae60', '#219653'], icon: 'briefcase' },
    { id: 'elegant', name: 'Élégant', colors: ['#7f8c8d', '#95a5a6'], icon: 'diamond' },
    { id: 'bold', name: 'Audacieux', colors: ['#e74c3c', '#c0392b'], icon: 'fire' },
    { id: 'minimal', name: 'Minimaliste', colors: ['#ecf0f1', '#bdc3c7'], icon: 'format-clear' },
  ];

  // Modèles de mise en page
  const layouts = [
    { id: 'layout1', name: 'Standard', icon: 'view-grid', orientation: 'landscape', description: 'Logo + Nom + Contact' },
    { id: 'layout2', name: 'Centré', icon: 'view-grid-outline', orientation: 'landscape', description: 'Tout centré' },
    { id: 'layout3', name: 'Double face', icon: 'card-bulleted', orientation: 'landscape', description: 'Recto-verso' },
    { id: 'layout4', name: 'Vertical', icon: 'view-day', orientation: 'portrait', description: 'Portrait' },
    { id: 'layout5', name: 'Asymétrique', icon: 'view-array', orientation: 'landscape', description: 'Design moderne' },
  ];

  // État pour les polices
  const [fonts] = useState([
    { id: 'roboto', name: 'Roboto', value: 'Roboto' },
    { id: 'helvetica', name: 'Helvetica', value: 'Helvetica' },
    { id: 'arial', name: 'Arial', value: 'Arial' },
    { id: 'times', name: 'Times New Roman', value: 'Times New Roman' },
    { id: 'georgia', name: 'Georgia', value: 'Georgia' },
    { id: 'cursive', name: 'Cursive', value: 'cursive' },
  ]);

  // État pour le sélecteur de couleurs
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [editingColor, setEditingColor] = useState('');

  // Couleurs prédéfinies
  const predefinedColors = [
    '#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', // Gris
    '#3498db', '#2980b9', '#1abc9c', '#16a085', // Bleu/Turquoise
    '#27ae60', '#219653', '#f1c40f', '#f39c12', // Vert/Jaune
    '#e74c3c', '#c0392b', '#9b59b6', '#8e44ad', // Rouge/Violet
    '#1a1a1a', '#ffffff', '#ecf0f1', '#bdc3c7', // Noir/Blanc
  ];

  // Choisir une image pour le logo
  const pickLogoImage = async () => {
    try {
      setIsLoading(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission requise', 'Nous avons besoin de la permission pour accéder à vos photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 2],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].uri) {
        setCardDesign({
          ...cardDesign, 
          hasLogo: true, 
          logoUrl: result.assets[0].uri
        });
        Alert.alert('Succès', 'Logo ajouté avec succès !');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner le logo');
    } finally {
      setIsLoading(false);
    }
  };

  // Choisir une photo de profil
  const pickProfilePhoto = async () => {
    try {
      setIsLoading(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission requise', 'Nous avons besoin de la permission pour accéder à vos photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].uri) {
        setCardDesign({
          ...cardDesign, 
          hasPhoto: true, 
          photoUrl: result.assets[0].uri
        });
        Alert.alert('Succès', 'Photo ajoutée avec succès !');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer le logo
  const removeLogo = () => {
  Alert.alert(
    "Supprimer le logo",
    "Êtes-vous sûr de vouloir supprimer le logo de la carte ?",
    [
      {
        text: "Annuler",
        style: "cancel"
      },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          setCardDesign({
            ...cardDesign,
            hasLogo: false,
            logoUrl: null
          });
        }
      }
    ],
    { cancelable: true }
  );
};

  // Supprimer la photo
  const removePhoto = () => {
  Alert.alert(
    "Supprimer le logo",
    "Êtes-vous sûr de vouloir supprimer le logo de la carte ?",
    [
      {
        text: "Annuler",
        style: "cancel"
      },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          setCardDesign({
            ...cardDesign,
            hasPhoto: false,
            photoUrl: null
          });
        }
      }
    ],
    { cancelable: true }
  );
};

  // Générer QR Code data automatiquement
  const generateQRData = () => {
    const qrContent = `BEGIN:VCARD
VERSION:3.0
N:${cardInfo.lastName};${cardInfo.firstName}
FN:${cardInfo.firstName} ${cardInfo.lastName}
ORG:${cardInfo.company}
TITLE:${cardInfo.title}
TEL;TYPE=WORK,VOICE:${cardInfo.phone}
TEL;TYPE=CELL:${cardInfo.mobile}
EMAIL:${cardInfo.email}
URL:${cardInfo.website}
ADR;TYPE=WORK:;;${cardInfo.address}
END:VCARD`;
    
    setCardDesign({...cardDesign, qrData: qrContent});
    Alert.alert('QR Code', 'QR Code généré avec succès !');
  };

  // Appliquer un template
  const applyTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setCardDesign({
        ...cardDesign,
        template: templateId,
        colorScheme: {
          ...cardDesign.colorScheme,
          primary: template.colors[0],
          secondary: template.colors[1],
        }
      });
    }
  };

  // Appliquer une mise en page
  const applyLayout = (layoutId) => {
    const layout = layouts.find(l => l.id === layoutId);
    if (layout) {
      setCardDesign({
        ...cardDesign,
        orientation: layout.orientation
      });
    }
  };

  // Changer la couleur
  const updateColor = (colorField, colorValue) => {
    setCardDesign({
      ...cardDesign,
      colorScheme: {
        ...cardDesign.colorScheme,
        [colorField]: colorValue,
      }
    });
  };

  // Générer PDF haute qualité
  const generateCardPDF = async (format = 'standard') => {
    try {
      setIsLoading(true);
      // Dimensions standards (en mm)
      const dimensions = {
        standard: { width: 85, height: 55 }, // Standard EU
        us: { width: 88.9, height: 50.8 },   // Standard US
        square: { width: 70, height: 70 },    // Carré
        mini: { width: 70, height: 42 },      // Mini
      };

      const dim = dimensions[format] || dimensions.standard;
      
      // Préparer les images en base64
      let logoBase64 = '';
      let photoBase64 = '';
      
      if (cardDesign.hasLogo && cardDesign.logoUrl) {
        try {
          const logoData = await FileSystem.readAsStringAsync(cardDesign.logoUrl, {
            encoding: FileSystem.EncodingType.Base64,
          });
          logoBase64 = `data:image/jpeg;base64,${logoData}`;
        } catch (error) {
          console.log('Erreur logo base64:', error);
        }
      }

      if (cardDesign.hasPhoto && cardDesign.photoUrl) {
        try {
          const photoData = await FileSystem.readAsStringAsync(cardDesign.photoUrl, {
            encoding: FileSystem.EncodingType.Base64,
          });
          photoBase64 = `data:image/jpeg;base64,${photoData}`;
        } catch (error) {
          console.log('Erreur photo base64:', error);
        }
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { margin: 0; size: ${dim.width}mm ${dim.height}mm; }
            body {
              margin: 0;
              padding: 3mm;
              width: ${dim.width}mm;
              height: ${dim.height}mm;
              font-family: 'Helvetica', Arial, sans-serif;
              background-color: ${cardDesign.colorScheme.background};
              ${cardDesign.gradient ? `
                background: linear-gradient(135deg, 
                  ${cardDesign.colorScheme.primary}, 
                  ${cardDesign.colorScheme.secondary});
              ` : ''}
              ${cardDesign.border ? `border: 0.5mm solid ${cardDesign.colorScheme.primary};` : ''}
              ${cardDesign.cornerStyle === 'rounded' ? 'border-radius: 2mm;' : ''}
              box-sizing: border-box;
              display: flex;
              flex-direction: ${cardDesign.orientation === 'portrait' ? 'column' : 'row'};
              align-items: center;
              justify-content: space-between;
              position: relative;
              overflow: hidden;
            }
            
            .card-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: ${cardDesign.orientation === 'portrait' ? 'column' : 'row'};
              align-items: center;
              justify-content: space-between;
              padding: 2mm;
              box-sizing: border-box;
            }
            
            .left-section {
              flex: 1;
              ${cardDesign.orientation === 'portrait' ? 'text-align: center; margin-bottom: 2mm;' : ''}
              max-width: ${cardDesign.orientation === 'portrait' ? '100%' : '60%'};
              padding: 1mm;
            }
            
            .right-section {
              ${cardDesign.orientation === 'portrait' ? 'text-align: center;' : 'text-align: right;'}
              ${cardDesign.orientation === 'portrait' ? 'width: 100%;' : 'width: 35%;'}
              display: flex;
              flex-direction: ${cardDesign.orientation === 'portrait' ? 'row' : 'column'};
              justify-content: center;
              align-items: ${cardDesign.orientation === 'portrait' ? 'center' : 'flex-end'};
              gap: 2mm;
            }
            
            .name {
              font-size: ${cardDesign.fontSize === 'large' ? '4mm' : '3.5mm'};
              font-weight: bold;
              color: ${cardDesign.colorScheme.text};
              margin: 1mm 0;
              line-height: 1.2;
              word-wrap: break-word;
              max-width: 100%;
            }
            
            .title {
              font-size: ${cardDesign.fontSize === 'large' ? '2.5mm' : '2mm'};
              color: ${cardDesign.colorScheme.secondary};
              margin: 0.5mm 0 1.5mm 0;
              font-weight: 500;
              word-wrap: break-word;
              max-width: 100%;
            }
            
            .company {
              font-size: ${cardDesign.fontSize === 'large' ? '3mm' : '2.5mm'};
              color: ${cardDesign.colorScheme.primary};
              margin: 0.5mm 0 2mm 0;
              font-weight: bold;
              word-wrap: break-word;
              max-width: 100%;
            }
            
            .contact-info {
              font-size: ${cardDesign.fontSize === 'large' ? '2mm' : '1.8mm'};
              color: ${cardDesign.colorScheme.text};
              line-height: 1.4;
              margin: 1mm 0;
              word-wrap: break-word;
              max-width: 100%;
            }
            
            .contact-item {
              margin: 0.5mm 0;
            }
            
            .logo-container {
              margin-bottom: 2mm;
              display: flex;
              justify-content: ${cardDesign.orientation === 'portrait' ? 'center' : 'flex-start'};
              align-items: center;
            }
            
            .logo {
              max-width: 15mm;
              max-height: 8mm;
              object-fit: contain;
            }
            
            .photo-container {
              ${cardDesign.orientation === 'portrait' ? 'margin-right: 3mm;' : 'margin-bottom: 2mm;'}
            }
            
            .photo {
              width: ${cardDesign.orientation === 'portrait' ? '15mm' : '20mm'};
              height: ${cardDesign.orientation === 'portrait' ? '20mm' : '25mm'};
              object-fit: cover;
              ${cardDesign.cornerStyle === 'rounded' ? 'border-radius: 1mm;' : ''}
              border: 0.3mm solid ${cardDesign.colorScheme.primary};
            }
            
            .qrcode-container {
              text-align: center;
            }
            
            .qrcode {
              width: 20mm;
              height: 20mm;
            }
            
            .qr-hint {
              font-size: 1.5mm;
              color: #666;
              margin-top: 0.5mm;
            }
            
            .texture-overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              opacity: 0.05;
              pointer-events: none;
            }
            
            .dots {
              background-image: radial-gradient(${cardDesign.colorScheme.primary} 0.2mm, transparent 0.2mm);
              background-size: 2mm 2mm;
            }
            
            .lines {
              background-image: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 1mm,
                ${cardDesign.colorScheme.primary} 1mm,
                ${cardDesign.colorScheme.primary} 1.5mm
              );
            }
            
            .grid {
              background-image: 
                linear-gradient(${cardDesign.colorScheme.primary} 0.2mm, transparent 0.2mm),
                linear-gradient(90deg, ${cardDesign.colorScheme.primary} 0.2mm, transparent 0.2mm);
              background-size: 3mm 3mm;
            }
          </style>
        </head>
        <body>
          ${cardDesign.texture !== 'none' ? `
            <div class="texture-overlay ${cardDesign.texture}"></div>
          ` : ''}
          
          <div class="card-container">
            <div class="left-section">
              ${cardDesign.hasLogo && logoBase64 ? `
                <div class="logo-container">
                  <img src="${logoBase64}" 
                       class="logo" 
                       alt="${cardInfo.company}" />
                </div>
              ` : ''}
              
              <h1 class="name">${cardInfo.firstName} ${cardInfo.lastName}</h1>
              <div class="title">${cardInfo.title}</div>
              <div class="company">${cardInfo.company}</div>
              
              <div class="contact-info">
                ${cardInfo.phone ? `<div class="contact-item">📞 ${cardInfo.phone}</div>` : ''}
                ${cardInfo.mobile ? `<div class="contact-item">📱 ${cardInfo.mobile}</div>` : ''}
                ${cardInfo.email ? `<div class="contact-item">✉️ ${cardInfo.email}</div>` : ''}
                ${cardInfo.website ? `<div class="contact-item">🌐 ${cardInfo.website}</div>` : ''}
                ${cardInfo.address ? `<div class="contact-item">📍 ${cardInfo.address}</div>` : ''}
              </div>
            </div>
            
            <div class="right-section">
              ${cardDesign.hasPhoto && photoBase64 ? `
                <div class="photo-container">
                  <img src="${photoBase64}" 
                       class="photo" 
                       alt="${cardInfo.firstName} ${cardInfo.lastName}" />
                </div>
              ` : ''}
              
              ${cardDesign.hasQRCode ? `
                <div class="qrcode-container">
                  <div class="qrcode">
                    <!-- QR Code sera généré par vCard -->
                  </div>
                  <div class="qr-hint">
                    Scannez pour me contacter
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: dim.width,
        height: dim.height,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Carte de visite',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Succès', 'PDF généré avec succès !');
      }

    } catch (error) {
      console.error('Erreur PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setIsLoading(false);
    }
  };

  // Exporter en image
  const exportAsImage = async () => {
    try {
      setIsLoading(true);
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: CARD_WIDTH * 3,
        height: CARD_HEIGHT * 3,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Carte de visite',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'exporter l\'image');
    } finally {
      setIsLoading(false);
    }
  };

  // Copier les informations
  const copyContactInfo = () => {
    const contactText = `${cardInfo.firstName} ${cardInfo.lastName}
${cardInfo.title} @ ${cardInfo.company}

📞 ${cardInfo.phone}
📱 ${cardInfo.mobile}
✉️ ${cardInfo.email}
🌐 ${cardInfo.website}
📍 ${cardInfo.address}

${cardInfo.linkedin ? `LinkedIn: ${cardInfo.linkedin}\n` : ''}${cardInfo.twitter ? `Twitter: ${cardInfo.twitter}` : ''}`;
    
    Clipboard.setString(contactText);
    Alert.alert('Copié !', 'Les informations ont été copiées dans le presse-papier');
  };

  // Rendu de la carte
  const renderCardPreview = () => {
    return (
      <View 
        ref={cardRef}
        style={[
          styles.cardPreview,
          {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            backgroundColor: cardDesign.colorScheme.background,
            flexDirection: cardDesign.orientation === 'portrait' ? 'column' : 'row',
            borderRadius: cardDesign.cornerStyle === 'rounded' ? 12 : 0,
            borderWidth: cardDesign.border ? 1 : 0,
            borderColor: cardDesign.colorScheme.primary,
            shadowColor: '#000',
            shadowOffset: cardDesign.shadow ? { width: 0, height: 4 } : { width: 0, height: 0 },
            shadowOpacity: cardDesign.shadow ? 0.1 : 0,
            shadowRadius: cardDesign.shadow ? 8 : 0,
            elevation: cardDesign.shadow ? 4 : 0,
            overflow: 'hidden',
          }
        ]}
      >
        {cardDesign.gradient && (
          <LinearGradient
            colors={[cardDesign.colorScheme.primary, cardDesign.colorScheme.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.1 }]}
          />
        )}

        {/* Texture de fond */}
        {cardDesign.texture !== 'none' && (
          <View style={[
            StyleSheet.absoluteFill,
            cardDesign.texture === 'dots' && styles.textureDots,
            cardDesign.texture === 'lines' && styles.textureLines,
            cardDesign.texture === 'grid' && styles.textureGrid,
          ]} />
        )}

        <View style={[
          styles.cardContent,
          { 
            flexDirection: cardDesign.orientation === 'portrait' ? 'column' : 'row',
            padding: cardDesign.orientation === 'portrait' ? 12 : 16,
          }
        ]}>
          {/* Section gauche */}
          <View style={[
            styles.leftSection,
            cardDesign.orientation === 'portrait' && styles.portraitLeftSection,
            { 
              maxWidth: cardDesign.orientation === 'portrait' ? '100%' : '65%',
              paddingRight: cardDesign.orientation === 'portrait' ? 0 : 10,
            }
          ]}>
            {cardDesign.hasLogo && cardDesign.logoUrl ? (
              <TouchableOpacity style={styles.logoContainer} onPress={removeLogo}>
                <Image 
                  source={{ uri: cardDesign.logoUrl }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : cardDesign.hasLogo ? (
              <View style={styles.logoContainer}>
                <View style={[styles.logoPlaceholder, { backgroundColor: cardDesign.colorScheme.primary }]}>
                  <Text style={styles.logoText}>{cardInfo.company.charAt(0)}</Text>
                </View>
              </View>
            ) : null}

            <Text 
              style={[
                styles.nameText,
                { 
                  color: cardDesign.colorScheme.text, 
                  fontSize: cardDesign.fontSize === 'large' ? 20 : 18,
                  marginBottom: 4,
                }
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {cardInfo.firstName} {cardInfo.lastName}
            </Text>

            <Text 
              style={[
                styles.titleText,
                { 
                  color: cardDesign.colorScheme.secondary, 
                  fontSize: cardDesign.fontSize === 'large' ? 12 : 11,
                  marginBottom: 6,
                }
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {cardInfo.title}
            </Text>

            <Text 
              style={[
                styles.companyText,
                { 
                  color: cardDesign.colorScheme.primary, 
                  fontSize: cardDesign.fontSize === 'large' ? 14 : 13,
                  marginBottom: 10,
                }
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {cardInfo.company}
            </Text>

            <View style={styles.contactInfo}>
              {cardInfo.phone && (
                <View style={styles.contactRow}>
                  <Icon name="phone" size={10} color={cardDesign.colorScheme.text} />
                  <Text 
                    style={[styles.contactText, { color: cardDesign.colorScheme.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {cardInfo.phone}
                  </Text>
                </View>
              )}

              {cardInfo.email && (
                <View style={styles.contactRow}>
                  <Icon name="email" size={10} color={cardDesign.colorScheme.text} />
                  <Text 
                    style={[styles.contactText, { color: cardDesign.colorScheme.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {cardInfo.email}
                  </Text>
                </View>
              )}

              {cardInfo.website && (
                <View style={styles.contactRow}>
                  <Icon name="web" size={10} color={cardDesign.colorScheme.text} />
                  <Text 
                    style={[styles.contactText, { color: cardDesign.colorScheme.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {cardInfo.website}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Section droite */}
          <View style={[
            styles.rightSection,
            cardDesign.orientation === 'portrait' && styles.portraitRightSection,
            { 
              justifyContent: 'space-between',
              alignItems: cardDesign.orientation === 'portrait' ? 'center' : 'flex-end',
            }
          ]}>
            {cardDesign.hasPhoto && cardDesign.photoUrl ? (
              <TouchableOpacity style={styles.photoContainer} onPress={removePhoto}>
                <Image 
                  source={{ uri: cardDesign.photoUrl }}
                  style={[
                    styles.photoImage,
                    { borderColor: cardDesign.colorScheme.primary }
                  ]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : cardDesign.hasPhoto ? (
              <View style={styles.photoContainer}>
                <View style={[styles.photoPlaceholder, { borderColor: cardDesign.colorScheme.primary }]}>
                  <Icon name="account" size={30} color={cardDesign.colorScheme.secondary} />
                </View>
              </View>
            ) : null}

            {cardDesign.hasQRCode && (
              <View style={styles.qrContainer}>
                <QRCode
                  value={cardDesign.qrData}
                  size={cardDesign.orientation === 'portrait' ? 60 : 70}
                  color={cardDesign.colorScheme.primary}
                  backgroundColor="transparent"
                />
                <Text style={[styles.qrHint, { color: cardDesign.colorScheme.text }]}>
                  Scanne moi
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Interface de sélection de couleur
  const renderColorPicker = () => {
    if (!colorPickerVisible) return null;

    return (
      <Modal
        transparent
        animationType="slide"
        visible={colorPickerVisible}
        onRequestClose={() => setColorPickerVisible(false)}
      >
        <View style={styles.colorPickerOverlay}>
          <View style={styles.colorPickerModal}>
            <Text style={styles.colorPickerTitle}>
              Choisir une couleur pour {editingColor}
            </Text>
            
            <View style={styles.colorGrid}>
              {predefinedColors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.colorOption, { backgroundColor: color }]}
                  onPress={() => {
                    updateColor(editingColor, color);
                    setColorPickerVisible(false);
                  }}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.colorPickerClose}
              onPress={() => setColorPickerVisible(false)}
            >
              <Text style={styles.colorPickerCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CARTE DE VISITE</Text>
        <Text style={styles.headerSubtitle}>Professionnelle • Personnalisable • Moderne</Text>
      </View>

      {/* Navigation par onglets */}
      <View style={styles.tabContainer}>
        {['design', 'info', 'export','apercu'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Icon
              name={
                tab === 'design' ? 'palette' :
                tab === 'info' ? 'account-edit' :
                tab === 'apercu' ? 'eye' : 'export'
              }
              size={20}
              color={activeTab === tab ? '#fff' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'design' ? 'Design' : tab === 'info' ? 'Infos' : tab==='apercu' ? 'Apercu' : 'Exporter'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

     

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'apercu' && (
          <>
             {/* Aperçu de la carte */}
      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Aperçu</Text>
        <View style={styles.previewContainer}>
          {renderCardPreview()}
          <Text style={styles.previewHint}>
            Taille standard: 85mm × 55mm
          </Text>
        </View>
      </View>

          </>
        )}


        {activeTab === 'design' && (
          <>
            {/* Templates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Modèles prédéfinis</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[styles.templateCard, cardDesign.template === template.id && styles.selectedTemplate]}
                    onPress={() => applyTemplate(template.id)}
                  >
                    <LinearGradient
                      colors={template.colors}
                      style={styles.templateGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Icon name={template.icon} size={30} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.templateName}>{template.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Mises en page */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mise en page</Text>
              <View style={styles.layoutGrid}>
                {layouts.map((layout) => (
                  <TouchableOpacity
                    key={layout.id}
                    style={[
                      styles.layoutOption,
                      cardDesign.orientation === layout.orientation && styles.selectedLayout
                    ]}
                    onPress={() => applyLayout(layout.id)}
                  >
                    <Icon 
                      name={layout.icon} 
                      size={30} 
                      color={cardDesign.orientation === layout.orientation ? '#fff' : cardDesign.colorScheme.primary} 
                    />
                    <Text style={[
                      styles.layoutName,
                      cardDesign.orientation === layout.orientation && styles.selectedLayoutText
                    ]}>
                      {layout.name}
                    </Text>
                    <Text style={[
                      styles.layoutDescription,
                      cardDesign.orientation === layout.orientation && styles.selectedLayoutText
                    ]}>
                      {layout.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Couleurs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Couleurs</Text>
              <View style={styles.colorOptions}>
                {['primary', 'secondary', 'background', 'text'].map((colorType) => (
                  <TouchableOpacity
                    key={colorType}
                    style={styles.colorPickerButton}
                    onPress={() => {
                      setEditingColor(colorType);
                      setColorPickerVisible(true);
                    }}
                  >
                    <View style={[styles.colorPreview, { backgroundColor: cardDesign.colorScheme[colorType] }]} />
                    <Text style={styles.colorLabel}>
                      {colorType === 'primary' ? 'Couleur principale' :
                       colorType === 'secondary' ? 'Couleur secondaire' :
                       colorType === 'background' ? 'Arrière-plan' : 'Texte'}
                    </Text>
                    <Icon name="chevron-right" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Options de style */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Options de style</Text>
              
              <View style={styles.styleOptions}>
                {[
                  { label: 'Coins arrondis', value: 'cornerStyle', options: ['rounded', 'square'] },
                  { label: 'Police grande', value: 'fontSize', options: ['large', 'normal'] },
                  { label: 'Dégradé', value: 'gradient' },
                  { label: 'Ombre portée', value: 'shadow' },
                  { label: 'Bordure', value: 'border' },
                  { label: 'QR Code', value: 'hasQRCode' },
                  { label: 'Logo', value: 'hasLogo' },
                  { label: 'Photo', value: 'hasPhoto' },
                ].map((option) => (
                  <View key={option.label} style={styles.styleOptionRow}>
                    <Text style={styles.styleOptionLabel}>{option.label}</Text>
                    
                    {option.options ? (
                      <View style={styles.styleToggleGroup}>
                        {option.options.map((opt) => (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.styleToggle,
                              cardDesign[option.value] === opt && styles.styleToggleActive
                            ]}
                            onPress={() => setCardDesign({...cardDesign, [option.value]: opt})}
                          >
                            <Text style={[
                              styles.styleToggleText,
                              cardDesign[option.value] === opt && styles.styleToggleTextActive
                            ]}>
                              {opt === 'rounded' ? 'Oui' : opt === 'square' ? 'Non' :
                               opt === 'large' ? 'Grande' : 'Normale'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Switch
                        value={cardDesign[option.value]}
                        onValueChange={(value) => setCardDesign({...cardDesign, [option.value]: value})}
                        trackColor={{ false: '#767577', true: cardDesign.colorScheme.primary }}
                      />
                    )}
                  </View>
                ))}
              </View>

              {/* Boutons pour logo et photo */}
              <View style={styles.imageButtons}>
                <TouchableOpacity
                  style={[styles.imageButton, { backgroundColor: cardDesign.colorScheme.primary }]}
                  onPress={pickLogoImage}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="image" size={20} color="#fff" />
                      <Text style={styles.imageButtonText}>
                        {cardDesign.hasLogo ? 'Changer logo' : 'Ajouter logo'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageButton, { backgroundColor: cardDesign.colorScheme.secondary }]}
                  onPress={pickProfilePhoto}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="camera" size={20} color="#fff" />
                      <Text style={styles.imageButtonText}>
                        {cardDesign.hasPhoto ? 'Changer photo' : 'Ajouter photo'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Textures */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Texture de fond</Text>
              <View style={styles.textureOptions}>
                {['none', 'dots', 'lines', 'grid'].map((texture) => (
                  <TouchableOpacity
                    key={texture}
                    style={[
                      styles.textureOption,
                      cardDesign.texture === texture && { borderColor: cardDesign.colorScheme.primary, borderWidth: 2 }
                    ]}
                    onPress={() => setCardDesign({...cardDesign, texture})}
                  >
                    <View style={[
                      styles.texturePreview,
                      texture === 'dots' && styles.textureDotsSmall,
                      texture === 'lines' && styles.textureLinesSmall,
                      texture === 'grid' && styles.textureGridSmall,
                    ]}>
                      <Text style={styles.textureLabel}>
                        {texture === 'none' ? 'Aucune' :
                         texture === 'dots' ? 'Points' :
                         texture === 'lines' ? 'Lignes' : 'Grille'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {activeTab === 'info' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            {[
              { label: 'Prénom', field: 'firstName', icon: 'account' },
              { label: 'Nom', field: 'lastName', icon: 'account' },
              { label: 'Poste', field: 'title', icon: 'briefcase' },
              { label: 'Entreprise', field: 'company', icon: 'office-building' },
              { label: 'Téléphone fixe', field: 'phone', icon: 'phone', keyboardType: 'phone-pad' },
              { label: 'Téléphone mobile', field: 'mobile', icon: 'cellphone', keyboardType: 'phone-pad' },
              { label: 'Email', field: 'email', icon: 'email', keyboardType: 'email-address' },
              { label: 'Site web', field: 'website', icon: 'web', autoCapitalize: 'none' },
              { label: 'Adresse', field: 'address', icon: 'map-marker', multiline: true },
              { label: 'LinkedIn', field: 'linkedin', icon: 'linkedin', autoCapitalize: 'none' },
              { label: 'Twitter', field: 'twitter', icon: 'twitter', autoCapitalize: 'none' },
            ].map(({ label, field, icon, keyboardType, multiline, autoCapitalize }) => (
              <View key={field} style={styles.inputRow}>
                <Icon name={icon} size={20} color={cardDesign.colorScheme.primary} />
                <TextInput
                  style={[styles.input, multiline && styles.textArea]}
                  placeholder={label}
                  placeholderTextColor="#999"
                  value={cardInfo[field]}
                  onChangeText={(text) => setCardInfo({...cardInfo, [field]: text})}
                  keyboardType={keyboardType}
                  multiline={multiline}
                  numberOfLines={multiline ? 2 : 1}
                  autoCapitalize={autoCapitalize || 'sentences'}
                  maxLength={field === 'address' ? 100 : 50}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: cardDesign.colorScheme.primary }]}
              onPress={generateQRData}
            >
              <Icon name="qrcode" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Générer QR Code automatique</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.copyButton, { borderColor: cardDesign.colorScheme.secondary }]}
              onPress={copyContactInfo}
            >
              <Icon name="content-copy" size={20} color={cardDesign.colorScheme.secondary} />
              <Text style={[styles.copyButtonText, { color: cardDesign.colorScheme.secondary }]}>
                Copier les informations
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'export' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exporter la carte</Text>
            
            <View style={styles.exportOptions}>
              <Text style={styles.exportSubtitle}>Format d'impression</Text>
              <View style={styles.formatButtons}>
                {[
                  { id: 'standard', name: 'Standard EU', size: '85×55mm', icon: 'card-account-details' },
                  { id: 'us', name: 'Standard US', size: '89×51mm', icon: 'card-account-details-outline' },
                  { id: 'square', name: 'Carré', size: '70×70mm', icon: 'square' },
                  { id: 'mini', name: 'Mini', size: '70×42mm', icon: 'card-bulleted-outline' },
                ].map((format) => (
                  <TouchableOpacity
                    key={format.id}
                    style={styles.formatButton}
                    onPress={() => generateCardPDF(format.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={cardDesign.colorScheme.primary} />
                    ) : (
                      <>
                        <Icon name={format.icon} size={30} color={cardDesign.colorScheme.primary} />
                        <Text style={styles.formatName}>{format.name}</Text>
                        <Text style={styles.formatSize}>{format.size}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.exportSubtitle}>Autres options</Text>
              <View style={styles.otherOptions}>
                <TouchableOpacity
                  style={[styles.exportOption, { borderColor: cardDesign.colorScheme.primary }]}
                  onPress={exportAsImage}
                  disabled={isLoading}
                >
                  <Icon name="image" size={24} color={cardDesign.colorScheme.primary} />
                  <View style={styles.exportOptionInfo}>
                    <Text style={styles.exportOptionTitle}>Exporter en image</Text>
                    <Text style={styles.exportOptionDesc}>PNG haute résolution</Text>
                  </View>
                  <Icon name="download" size={24} color={cardDesign.colorScheme.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportOption, { borderColor: cardDesign.colorScheme.secondary }]}
                  onPress={() => generateCardPDF('standard')}
                  disabled={isLoading}
                >
                  <Icon name="file-pdf-box" size={24} color={cardDesign.colorScheme.secondary} />
                  <View style={styles.exportOptionInfo}>
                    <Text style={styles.exportOptionTitle}>Générer PDF print-ready</Text>
                    <Text style={styles.exportOptionDesc}>Pour impression professionnelle</Text>
                  </View>
                  <Icon name="printer" size={24} color={cardDesign.colorScheme.secondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.exportTips}>
                <Text style={styles.tipsTitle}>💡 Conseils d'impression :</Text>
                <Text style={styles.tip}>• Utilisez du papier épais (300g/m²)</Text>
                <Text style={styles.tip}>• Choisissez une finition brillante ou mate</Text>
                <Text style={styles.tip}>• Vérifiez les marges de sécurité (3mm)</Text>
                <Text style={styles.tip}>• Exportez en CMYK pour impression offset</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {renderColorPicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  previewSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  // Styles pour la carte
  cardPreview: {
    alignSelf: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    width: '100%',
  },
  leftSection: {
    flex: 1,
    justifyContent: 'center',
  },
  portraitLeftSection: {
    alignItems: 'center',
    textAlign: 'center',
  },
  logoContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  logoImage: {
    width: 60,
    height: 30,
    borderRadius: 4,
  },
  logoPlaceholder: {
    width: 60,
    height: 30,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nameText: {
    fontWeight: 'bold',
  },
  titleText: {
    fontWeight: '500',
  },
  companyText: {
    fontWeight: 'bold',
  },
  contactInfo: {
    gap: 4,
    marginTop: 5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 10,
    flex: 1,
  },
  rightSection: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  portraitRightSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  photoContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom:8
  },
  photoImage: {
    width: 70,
    height: 80,
    borderRadius: 6,
    borderWidth: 1,
  },
  photoPlaceholder: {
    width: 70,
    height: 90,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrHint: {
    fontSize: 9,
    marginTop: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'transparent',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Textures
  textureDots: {
    backgroundColor: 'transparent',
    backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
    backgroundSize: '8px 8px',
  },
  textureLines: {
    backgroundColor: 'transparent',
    backgroundImage: 'repeating-linear-gradient(0deg, #000, #000 1px, transparent 1px, transparent 8px)',
  },
  textureGrid: {
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
    backgroundSize: '8px 8px',
  },
  // Templates
  templatesScroll: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  templateCard: {
    alignItems: 'center',
    marginRight: 15,
    width: 80,
  },
  selectedTemplate: {
    transform: [{ scale: 1.05 }],
  },
  templateGradient: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  // Layouts
  layoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  layoutOption: {
    width: (width - 60) / 3,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedLayout: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  layoutName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  selectedLayoutText: {
    color: '#fff',
  },
  layoutDescription: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  // Couleurs
  colorOptions: {
    gap: 8,
  },
  colorPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 6,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  colorLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  // Color Picker Modal
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  colorPickerClose: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#3498db',
    borderRadius: 10,
    alignItems: 'center',
  },
  colorPickerCloseText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Options de style
  styleOptions: {
    gap: 12,
  },
  styleOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  styleOptionLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  styleToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  styleToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  styleToggleActive: {
    backgroundColor: '#3498db',
  },
  styleToggleText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  styleToggleTextActive: {
    color: '#fff',
  },
  // Boutons images
  imageButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Textures
  textureOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textureOption: {
    width: (width - 60) / 4,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  texturePreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  textureDotsSmall: {
    backgroundColor: '#fff',
    backgroundImage: 'radial-gradient(#666 1px, transparent 1px)',
    backgroundSize: '4px 4px',
  },
  textureLinesSmall: {
    backgroundColor: '#fff',
    backgroundImage: 'repeating-linear-gradient(0deg, #666, #666 1px, transparent 1px, transparent 4px)',
  },
  textureGridSmall: {
    backgroundColor: '#fff',
    backgroundImage: 'linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)',
    backgroundSize: '4px 4px',
  },
  textureLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Formulaire infos
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
    minHeight: 44,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    gap: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 15,
    gap: 10,
  },
  copyButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Export
  exportOptions: {
    gap: 20,
  },
  exportSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  formatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  formatButton: {
    width: (width - 60) / 2,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 100,
    justifyContent: 'center',
  },
  formatName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  formatSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  otherOptions: {
    gap: 15,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderRadius: 12,
    gap: 15,
  },
  exportOptionInfo: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  exportOptionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  exportTips: {
    backgroundColor: '#e8f4fc',
    padding: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  tip: {
    fontSize: 12,
    color: '#333',
    marginBottom: 5,
    lineHeight: 18,
  },
});

export default CarteVisite;