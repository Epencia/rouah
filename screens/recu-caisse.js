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
  FlatList,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const RecuCaisse = () => {
  const receiptRef = useRef();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // État pour le magasin/commerce
  const [storeInfo, setStoreInfo] = useState({
    name: 'BOUTIQUE EXEMPLE',
    address: '123 Rue du Commerce\n75001 Paris',
    phone: '01 23 45 67 89',
    email: 'contact@boutique.com',
    siret: '123 456 789 00012',
    tva: 'FR12345678901',
    website: 'www.boutique-exemple.com',
    logo: null,
  });

  // État pour les paramètres du reçu
  const [receiptSettings, setReceiptSettings] = useState({
    type: 'vente', // vente, avoir, remboursement, acompte
    number: 'RC-' + new Date().getFullYear() + '-' + (Math.floor(Math.random() * 1000)).toString().padStart(4, '0'),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    cashier: 'CAISSE 01',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: 'Merci de votre visite !\nPériode de retour : 30 jours\nTicket requis pour tout échange',
    footerText: 'Ce ticket est votre justificatif de paiement\nConservez-le pour tout échange ou garantie',
  });

  // État pour les articles du reçu
  const [items, setItems] = useState([
    { 
      id: '1', 
      code: 'PROD001', 
      description: 'Produit Exemple', 
      quantity: 1, 
      unitPrice: 49.99, 
      discount: 0,
      taxRate: 20 
    },
  ]);

  // État pour les modes de paiement
  const [payments, setPayments] = useState([
    { method: 'espèces', amount: 0 },
    { method: 'carte', amount: 0 },
    { method: 'chèque', amount: 0 },
    { method: 'virement', amount: 0 },
  ]);

  // État pour les options d'impression
  const [printOptions, setPrintOptions] = useState({
    showLogo: true,
    showCustomerInfo: false,
    showBarcode: true,
    detailedItems: true,
    thermalStyle: false,
    paperWidth: 58, // mm
  });

  // État pour le design
  const [selectedDesign, setSelectedDesign] = useState('thermal');
  const [showDesignModal, setShowDesignModal] = useState(false);

  // Mise à jour de l'heure en temps réel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
      setReceiptSettings(prev => ({
        ...prev,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }));
    }, 60000); // Mise à jour toutes les minutes
    
    return () => clearInterval(timer);
  }, []);

  // Designs disponibles pour reçus
  const designs = [
    { id: 'thermal', name: 'Thermique', color: '#000', icon: 'printer', description: 'Style ticket de caisse classique' },
    { id: 'modern', name: 'Moderne', color: '#2c3e50', icon: 'receipt', description: 'Design épuré professionnel' },
    { id: 'colorful', name: 'Coloré', color: '#e74c3c', icon: 'palette', description: 'Reçu coloré pour boutique' },
    { id: 'minimal', name: 'Minimaliste', color: '#7f8c8d', icon: 'format-clear', description: 'Simple et efficace' },
    { id: 'premium', name: 'Premium', color: '#d4af37', icon: 'diamond', description: 'Reçu haut de gamme' },
  ];

  // Calcul des totaux
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = itemTotal * (item.discount / 100);
      const itemSubtotal = itemTotal - itemDiscount;
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemSubtotal * (item.taxRate / 100);
    });

    const total = subtotal + totalTax;
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const change = totalPaid - total;

    return {
      subtotal: subtotal.toFixed(0),
      totalDiscount: totalDiscount.toFixed(0),
      totalTax: totalTax.toFixed(0),
      total: total.toFixed(0),
      totalPaid: totalPaid.toFixed(0),
      change: change > 0 ? change.toFixed(0) : '0',
    };
  };

  // Gestion des articles
  const addItem = () => {
    const newId = (items.length + 1).toString();
    setItems([...items, {
      id: newId,
      code: 'PROD' + (items.length + 1).toString().padStart(3, '0'),
      description: 'Nouveau produit',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 20,
    }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Gestion des paiements
  const updatePayment = (index, field, value) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setPayments(newPayments);
  };

  // Générer code barre (simulation)
  const generateBarcode = () => {
    const chars = '0123456789';
    let barcode = '';
    for (let i = 0; i < 13; i++) {
      barcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return barcode;
  };

  // Génération du PDF
  const generateReceiptPDF = async () => {
    try {
      const totals = calculateTotals();
      if (parseFloat(totals.totalPaid) < parseFloat(totals.total)) {
        Alert.alert('Attention', 'Le montant payé est inférieur au total');
        return;
      }

      const design = designs.find(d => d.id === selectedDesign);
      const barcode = generateBarcode();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=${printOptions.paperWidth}mm, initial-scale=1">
          <style>
            @page { margin: 0; padding: 0; }
            body { 
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: ${selectedDesign === 'thermal' ? '4mm' : '8mm'};
              font-size: ${selectedDesign === 'thermal' ? '9pt' : '10pt'};
              line-height: 1.3;
              color: #000;
              width: ${printOptions.paperWidth}mm;
            }
            
            .thermal-mode { 
              text-align: center; 
              font-weight: normal;
            }
            
            .header {
              text-align: center;
              margin-bottom: 15px;
              ${selectedDesign === 'premium' ? 'border-bottom: 2px solid #d4af37; padding-bottom: 10px;' : ''}
            }
            
            .store-name {
              font-weight: bold;
              font-size: ${selectedDesign === 'thermal' ? '12pt' : '14pt'};
              margin: 5px 0;
              ${selectedDesign === 'colorful' ? 'color: #e74c3c;' : ''}
            }
            
            .receipt-title {
              font-weight: bold;
              font-size: ${selectedDesign === 'thermal' ? '11pt' : '12pt'};
              margin: 10px 0;
              text-transform: uppercase;
            }
            
            .receipt-info {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              font-size: 9pt;
            }
            
            .items-table {
              width: 100%;
              margin: 15px 0;
              border-collapse: collapse;
            }
            
            .items-table td {
              padding: 4px 0;
              vertical-align: top;
              border-bottom: 1px dotted #ccc;
            }
            
            .item-desc {
              width: 60%;
            }
            
            .item-qty, .item-price, .item-total {
              width: 13.33%;
              text-align: right;
            }
            
            .totals {
              margin-top: 15px;
              border-top: 2px solid #000;
              padding-top: 10px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
            }
            
            .grand-total {
              font-weight: bold;
              font-size: 11pt;
              border-top: 1px solid #000;
              padding-top: 8px;
              margin-top: 8px;
            }
            
            .payment-section {
              margin: 15px 0;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
            
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            
            .change {
              font-weight: bold;
              color: #27ae60;
            }
            
            .barcode {
              text-align: center;
              margin: 15px 0;
              font-family: 'Libre Barcode 128', monospace;
              font-size: 36pt;
              letter-spacing: 2px;
            }
            
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 8pt;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
            
            .thank-you {
              text-align: center;
              margin: 15px 0;
              font-weight: bold;
              ${selectedDesign === 'colorful' ? 'color: #e74c3c;' : ''}
            }
            
            .customer-info {
              background: #f5f5f5;
              padding: 8px;
              margin: 10px 0;
              border-radius: 4px;
              font-size: 9pt;
            }
          </style>
        </head>
        <body class="${selectedDesign === 'thermal' ? 'thermal-mode' : ''}">
          <div class="header">
            <div class="store-name">${storeInfo.name}</div>
            <div>${storeInfo.address.replace(/\n/g, '<br>')}</div>
            <div>Tél: ${storeInfo.phone}</div>
            <div>SIRET: ${storeInfo.siret}</div>
          </div>
          
          <div class="receipt-title">${receiptSettings.type === 'avoir' ? 'AVOIR' : 'TICKET DE CAISSE'}</div>
          
          <div class="receipt-info">
            <div>N°: ${receiptSettings.number}</div>
            <div>${receiptSettings.date} ${receiptSettings.time}</div>
          </div>
          
          <div class="receipt-info">
            <div>Caisse: ${receiptSettings.cashier}</div>
            <div>Client: ${receiptSettings.customerName || 'Non renseigné'}</div>
          </div>
          
          ${receiptSettings.customerName && printOptions.showCustomerInfo ? `
            <div class="customer-info">
              <strong>Informations client:</strong><br>
              ${receiptSettings.customerName}<br>
              ${receiptSettings.customerPhone ? 'Tél: ' + receiptSettings.customerPhone + '<br>' : ''}
              ${receiptSettings.customerEmail ? 'Email: ' + receiptSettings.customerEmail : ''}
            </div>
          ` : ''}
          
          <table class="items-table">
            <tbody>
              ${items.map(item => {
                const itemTotal = item.quantity * item.unitPrice;
                const discountAmount = itemTotal * (item.discount / 100);
                const finalAmount = itemTotal - discountAmount;
                return `
                  <tr>
                    <td class="item-desc">
                      ${item.description}<br>
                      <small>${item.code} ${item.discount > 0 ? `(-${item.discount}%)` : ''}</small>
                    </td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-price">${item.unitPrice.toFixed(2)} F</td>
                    <td class="item-total">${finalAmount.toFixed(2)} F</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>Sous-total:</span>
              <span>${totals.subtotal} F</span>
            </div>
            ${parseFloat(totals.totalDiscount) > 0 ? `
              <div class="total-row">
                <span>Remise:</span>
                <span>-${totals.totalDiscount} F</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span>TVA:</span>
              <span>${totals.totalTax} F</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${totals.total} F</span>
            </div>
          </div>
          
          <div class="payment-section">
            ${payments.filter(p => p.amount > 0).map(payment => `
              <div class="payment-row">
                <span>${payment.method}:</span>
                <span>${parseFloat(payment.amount).toFixed(0)} F</span>
              </div>
            `).join('')}
            <div class="payment-row">
              <span>Total payé:</span>
              <span>${totals.totalPaid} F</span>
            </div>
            ${parseFloat(totals.change) > 0 ? `
              <div class="payment-row change">
                <span>Monnaie:</span>
                <span>${totals.change} F</span>
              </div>
            ` : ''}
          </div>
          
          ${printOptions.showBarcode ? `
            <div class="barcode">
              *${barcode}*
            </div>
          ` : ''}
          
          <div class="thank-you">
            MERCI POUR VOTRE ACHAT !
          </div>
          
          <div class="footer">
            ${receiptSettings.notes.replace(/\n/g, '<br>')}<br><br>
            ${receiptSettings.footerText.replace(/\n/g, '<br>')}<br>
            ${storeInfo.website}<br>
            ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: printOptions.paperWidth,
        height: null,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Reçu de caisse généré',
        });
      } else {
        Alert.alert('Succès', 'Reçu généré avec succès !');
      }

    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer le reçu');
    }
  };

  // Générer un reçu rapide
  const generateQuickReceipt = () => {
    const totals = calculateTotals();
    
    // Remplir automatiquement les paiements
    const total = parseFloat(totals.total);
    const newPayments = payments.map(payment => {
      if (payment.method === 'espèces') {
        // Arrondir à 5F supérieur pour les espèces
        const roundedAmount = Math.ceil(total / 5) * 5;
        return { ...payment, amount: roundedAmount };
      } else if (payment.method === 'carte') {
        return { ...payment, amount: total };
      }
      return payment;
    });
    
    setPayments(newPayments);
    Alert.alert('Reçu préparé', 'Les paiements ont été remplis automatiquement');
  };

  // Changer le type de reçu
  const changeReceiptType = (type) => {
    setReceiptSettings({ ...receiptSettings, type });
    
    // Ajuster le titre selon le type
    const prefixes = {
      'vente': 'RC',
      'avoir': 'AV',
      'remboursement': 'REM',
      'acompte': 'AC'
    };
    
    const prefix = prefixes[type] || 'RC';
    setReceiptSettings(prev => ({
      ...prev,
      number: `${prefix}-${new Date().getFullYear()}-${(Math.floor(Math.random() * 1000)).toString().padStart(4, '0')}`
    }));
  };

  const getDesignStyle = () => {
    const design = designs.find(d => d.id === selectedDesign);
    const styles = {
      thermal: { primary: '#000', bg: '#fff', border: '#ccc', text: '#000' },
      modern: { primary: '#2c3e50', bg: '#f8f9fa', border: '#dee2e6', text: '#333' },
      colorful: { primary: '#e74c3c', bg: '#fff5f5', border: '#ffccd5', text: '#333' },
      minimal: { primary: '#7f8c8d', bg: '#fff', border: '#ecf0f1', text: '#333' },
      premium: { primary: '#d4af37', bg: '#fffdf6', border: '#f5e6b3', text: '#333' },
    };
    return { ...styles[selectedDesign], color: design?.color };
  };

  const designStyle = getDesignStyle();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: designStyle.bg }]} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          {/* Header avec titre et date */}
          <View style={[styles.header, { backgroundColor: designStyle.primary }]}>
            <View>
              <Text style={styles.headerTitle}>RECU DE CAISSE</Text>
              <Text style={styles.headerSubtitle}>
                {currentDateTime.toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.designButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => setShowDesignModal(true)}
            >
              <Icon name="palette" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Modal choix design */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showDesignModal}
            onRequestClose={() => setShowDesignModal(false)}
          >
            <BlurView intensity={90} style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Style du reçu</Text>
                <FlatList
                  data={designs}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.designOption,
                        selectedDesign === item.id && { borderColor: item.color, borderWidth: 2 }
                      ]}
                      onPress={() => {
                        setSelectedDesign(item.id);
                        setShowDesignModal(false);
                      }}
                    >
                      <Icon name={item.icon} size={30} color={item.color} />
                      <View style={styles.designInfo}>
                        <Text style={[styles.designName, { color: item.color }]}>{item.name}</Text>
                        <Text style={styles.designDescription}>{item.description}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: designStyle.primary }]}
                  onPress={() => setShowDesignModal(false)}
                >
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Modal>

          {/* Aperçu du reçu */}
          <View style={styles.previewContainer}>
            <View ref={receiptRef} style={[styles.receiptPreview, { 
              borderColor: designStyle.border,
              backgroundColor: selectedDesign === 'thermal' ? '#fff' : designStyle.bg
            }]}>
              
              {/* En-tête du reçu */}
              <View style={[styles.previewHeader, { borderBottomColor: designStyle.primary }]}>
                <Text style={[styles.storeNamePreview, { color: designStyle.primary }]}>
                  {storeInfo.name}
                </Text>
                <Text style={styles.storeAddressPreview}>{storeInfo.address}</Text>
              </View>

              {/* Info reçu */}
              <View style={styles.receiptInfoPreview}>
                <Text style={[styles.receiptType, { color: designStyle.primary }]}>
                  {receiptSettings.type.toUpperCase()}
                </Text>
                <View style={styles.receiptDetails}>
                  <Text style={styles.receiptDetail}>N°: {receiptSettings.number}</Text>
                  <Text style={styles.receiptDetail}>{receiptSettings.date} {receiptSettings.time}</Text>
                  <Text style={styles.receiptDetail}>Caisse: {receiptSettings.cashier}</Text>
                </View>
              </View>

              {/* Articles */}
              <View style={styles.itemsPreview}>
                {items.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.itemPreview}>
                    <Text style={styles.itemDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemQty}>{item.quantity} x</Text>
                      <Text style={styles.itemPrice}>{item.unitPrice.toFixed(0)} F</Text>
                      <Text style={styles.itemTotal}>
                        {(item.quantity * item.unitPrice).toFixed(0)} F
                      </Text>
                    </View>
                  </View>
                ))}
                {items.length > 3 && (
                  <Text style={styles.moreItemsText}>... et {items.length - 3} autres articles</Text>
                )}
              </View>

              {/* Totaux */}
              <View style={[styles.totalsPreview, { borderTopColor: designStyle.border }]}>
                <View style={styles.totalRowPreview}>
                  <Text style={styles.totalLabelPreview}>TOTAL:</Text>
                  <Text style={[styles.totalValuePreview, { color: designStyle.primary }]}>
                    {calculateTotals().total} F
                  </Text>
                </View>
              </View>

              {/* Paiements */}
              <View style={styles.paymentsPreview}>
                {payments.filter(p => p.amount > 0).slice(0, 2).map((payment, index) => (
                  <View key={index} style={styles.paymentPreview}>
                    <Text style={styles.paymentMethod}>{payment.method}:</Text>
                    <Text style={styles.paymentAmount}>{payment.amount.toFixed(0)} F</Text>
                  </View>
                ))}
              </View>

              {/* Code barre */}
              {printOptions.showBarcode && (
                <View style={styles.barcodePreview}>
                  <Text style={styles.barcodeText}>⎸⎸▌⎹⎹ ▐⎸⎸⎹⎹ ⎸▌⎸⎹⎹▌</Text>
                  <Text style={styles.barcodeNumber}>{receiptSettings.number}</Text>
                </View>
              )}

              <Text style={styles.previewNote}>Aperçu du reçu</Text>
            </View>
          </View>

          {/* Boutons rapides */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.quickButton, { backgroundColor: designStyle.primary }]}
              onPress={() => changeReceiptType('vente')}
            >
              <Icon name="cart" size={18} color="#fff" />
              <Text style={styles.quickButtonText}>Vente</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickButton, { backgroundColor: '#27ae60' }]}
              onPress={() => changeReceiptType('avoir')}
            >
              <Icon name="cash-refund" size={18} color="#fff" />
              <Text style={styles.quickButtonText}>Avoir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickButton, { backgroundColor: '#e74c3c' }]}
              onPress={() => changeReceiptType('remboursement')}
            >
              <Icon name="cash-remove" size={18} color="#fff" />
              <Text style={styles.quickButtonText}>Rembours.</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickButton, { backgroundColor: '#f39c12' }]}
              onPress={generateQuickReceipt}
            >
              <Icon name="lightning-bolt" size={18} color="#fff" />
              <Text style={styles.quickButtonText}>Rapide</Text>
            </TouchableOpacity>
          </View>

          {/* Formulaire */}
          <View style={styles.formContainer}>
            
            {/* Configuration reçu */}
            <View style={[styles.formSection, { borderLeftColor: designStyle.primary }]}>
              <Text style={[styles.sectionTitle, { color: designStyle.primary }]}>
                Configuration
              </Text>
              
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Type de reçu:</Text>
                <View style={styles.typeButtons}>
                  {['vente', 'avoir', 'remboursement', 'acompte'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        receiptSettings.type === type && { backgroundColor: designStyle.primary }
                      ]}
                      onPress={() => changeReceiptType(type)}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        receiptSettings.type === type && { color: '#fff' }
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.rowInputs}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>N° reçu</Text>
                  <TextInput
                    style={styles.input}
                    value={receiptSettings.number}
                    onChangeText={(text) => setReceiptSettings({...receiptSettings, number: text})}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Caisse</Text>
                  <TextInput
                    style={styles.input}
                    value={receiptSettings.cashier}
                    onChangeText={(text) => setReceiptSettings({...receiptSettings, cashier: text})}
                  />
                </View>
              </View>
            </View>

            {/* Client */}
            <View style={[styles.formSection, { borderLeftColor: designStyle.primary }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: designStyle.primary }]}>
                  Client
                </Text>
                <Switch
                  value={printOptions.showCustomerInfo}
                  onValueChange={(value) => setPrintOptions({...printOptions, showCustomerInfo: value})}
                  trackColor={{ false: '#767577', true: designStyle.primary }}
                />
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Nom du client"
                value={receiptSettings.customerName}
                onChangeText={(text) => setReceiptSettings({...receiptSettings, customerName: text})}
              />
              
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Téléphone"
                  value={receiptSettings.customerPhone}
                  onChangeText={(text) => setReceiptSettings({...receiptSettings, customerPhone: text})}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Email"
                  value={receiptSettings.customerEmail}
                  onChangeText={(text) => setReceiptSettings({...receiptSettings, customerEmail: text})}
                />
              </View>
            </View>

            {/* Articles */}
            <View style={[styles.formSection, { borderLeftColor: designStyle.primary }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: designStyle.primary }]}>
                  Articles ({items.length})
                </Text>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: designStyle.primary }]}
                  onPress={addItem}
                >
                  <Icon name="plus" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {items.map((item, index) => (
                <View key={item.id} style={styles.itemForm}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemNumber}>#{index + 1}</Text>
                    <TextInput
                      style={[styles.input, styles.itemCode]}
                      placeholder="Code"
                      value={item.code}
                      onChangeText={(text) => updateItem(item.id, 'code', text)}
                    />
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(item.id)}>
                        <Icon name="delete" size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Description du produit"
                    value={item.description}
                    onChangeText={(text) => updateItem(item.id, 'description', text)}
                  />
                  
                  <View style={styles.rowInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Qté</Text>
                      <TextInput
                        style={[styles.input, styles.numberInput]}
                        keyboardType="numeric"
                        value={item.quantity.toString()}
                        onChangeText={(text) => updateItem(item.id, 'quantity', parseInt(text) || 1)}
                      />
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Prix unitaire</Text>
                      <TextInput
                        style={[styles.input, styles.numberInput]}
                        keyboardType="numeric"
                        value={item.unitPrice.toString()}
                        onChangeText={(text) => updateItem(item.id, 'unitPrice', parseFloat(text) || 0)}
                      />
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Remise %</Text>
                      <TextInput
                        style={[styles.input, styles.numberInput]}
                        keyboardType="numeric"
                        value={item.discount.toString()}
                        onChangeText={(text) => updateItem(item.id, 'discount', parseFloat(text) || 0)}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Paiements */}
            <View style={[styles.formSection, { borderLeftColor: designStyle.primary }]}>
              <Text style={[styles.sectionTitle, { color: designStyle.primary }]}>
                Paiements
              </Text>
              
              {payments.map((payment, index) => (
                <View key={index} style={styles.paymentForm}>
                  <View style={styles.paymentMethodRow}>
                    <Icon 
                      name={
                        payment.method === 'espèces' ? 'cash' :
                        payment.method === 'carte' ? 'credit-card' :
                        payment.method === 'chèque' ? 'bank-check' :
                        'bank-transfer'
                      } 
                      size={20} 
                      color={designStyle.primary} 
                    />
                    <Text style={styles.paymentMethodLabel}>{payment.method}</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.paymentInput]}
                    placeholder="Montant"
                    keyboardType="numeric"
                    value={payment.amount.toString()}
                    onChangeText={(text) => updatePayment(index, 'amount', parseFloat(text) || 0)}
                  />
                </View>
              ))}
              
              <View style={styles.paymentSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>À payer:</Text>
                  <Text style={styles.summaryValue}>{calculateTotals().total} F</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Payé:</Text>
                  <Text style={styles.summaryValue}>{calculateTotals().totalPaid} F</Text>
                </View>
                {parseFloat(calculateTotals().change) > 0 && (
                  <View style={[styles.summaryRow, styles.changeRow]}>
                    <Text style={styles.changeLabel}>Monnaie à rendre:</Text>
                    <Text style={styles.changeValue}>{calculateTotals().change} F</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Options impression */}
            <View style={[styles.formSection, { borderLeftColor: designStyle.primary }]}>
              <Text style={[styles.sectionTitle, { color: designStyle.primary }]}>
                Options d'impression
              </Text>
              
              <View style={styles.optionsGrid}>
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={() => setPrintOptions({...printOptions, showBarcode: !printOptions.showBarcode})}
                >
                  <Icon 
                    name={printOptions.showBarcode ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={24} 
                    color={designStyle.primary} 
                  />
                  <Text style={styles.optionText}>Code barre</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={() => setPrintOptions({...printOptions, showCustomerInfo: !printOptions.showCustomerInfo})}
                >
                  <Icon 
                    name={printOptions.showCustomerInfo ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={24} 
                    color={designStyle.primary} 
                  />
                  <Text style={styles.optionText}>Info client</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={() => setPrintOptions({...printOptions, detailedItems: !printOptions.detailedItems})}
                >
                  <Icon 
                    name={printOptions.detailedItems ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={24} 
                    color={designStyle.primary} 
                  />
                  <Text style={styles.optionText}>Articles détaillés</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={() => setPrintOptions({...printOptions, thermalStyle: !printOptions.thermalStyle})}
                >
                  <Icon 
                    name={printOptions.thermalStyle ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={24} 
                    color={designStyle.primary} 
                  />
                  <Text style={styles.optionText}>Style thermique</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.paperWidthSelector}>
                <Text style={styles.paperWidthLabel}>Largeur du reçu:</Text>
                <View style={styles.widthButtons}>
                  {[58, 80, 110].map(width => (
                    <TouchableOpacity
                      key={width}
                      style={[
                        styles.widthButton,
                        printOptions.paperWidth === width && { backgroundColor: designStyle.primary }
                      ]}
                      onPress={() => setPrintOptions({...printOptions, paperWidth: width})}
                    >
                      <Text style={[
                        styles.widthButtonText,
                        printOptions.paperWidth === width && { color: '#fff' }
                      ]}>
                        {width}mm
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

          </View>

          {/* Bouton génération */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.generateButton, { backgroundColor: designStyle.primary }]}
              onPress={generateReceiptPDF}
            >
              <Icon name="printer" size={26} color="#fff" />
              <View style={styles.generateButtonContent}>
                <Text style={styles.generateButtonText}>IMPRIMER LE RECU</Text>
                <Text style={styles.generateButtonSubtext}>
                  Total: {calculateTotals().total} F • {items.length} article(s)
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.finalNote}>
              Ce reçu sera généré au format standard {printOptions.paperWidth}mm
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  designButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  designOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  designInfo: {
    flex: 1,
    marginLeft: 15,
  },
  designName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  designDescription: {
    fontSize: 12,
    color: '#666',
  },
  closeButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  previewContainer: {
    padding: 15,
  },
  receiptPreview: {
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 300,
    alignSelf: 'center',
  },
  previewHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: 10,
    marginBottom: 10,
  },
  storeNamePreview: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  storeAddressPreview: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
  },
  receiptInfoPreview: {
    marginBottom: 10,
  },
  receiptType: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  receiptDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  receiptDetail: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  itemsPreview: {
    marginBottom: 10,
  },
  itemPreview: {
    marginBottom: 5,
  },
  itemDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQty: {
    fontSize: 9,
    color: '#666',
  },
  itemPrice: {
    fontSize: 9,
    color: '#666',
  },
  itemTotal: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
  },
  moreItemsText: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 5,
  },
  totalsPreview: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  totalRowPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabelPreview: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValuePreview: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  paymentsPreview: {
    marginTop: 8,
  },
  paymentPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  paymentMethod: {
    fontSize: 9,
    color: '#666',
  },
  paymentAmount: {
    fontSize: 9,
    fontWeight: '600',
    color: '#333',
  },
  barcodePreview: {
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  barcodeText: {
    fontSize: 24,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  barcodeNumber: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  previewNote: {
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  quickButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 15,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  configRow: {
    marginBottom: 15,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
    marginBottom: 10,
  },
  halfInput: {
    flex: 1,
  },
  numberInput: {
    textAlign: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
  itemForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  itemCode: {
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  paymentInput: {
    flex: 1,
    textAlign: 'right',
  },
  paymentSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#333',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  changeRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  changeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48%',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  paperWidthSelector: {
    marginTop: 10,
  },
  paperWidthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  widthButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  widthButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  widthButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  actionContainer: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  generateButtonContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  generateButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  finalNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default RecuCaisse;