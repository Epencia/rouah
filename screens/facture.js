import React, { useState, useRef } from 'react';
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
  Image,
  Dimensions,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const Factures = () => {
  // Référence pour capturer la facture
  const invoiceRef = useRef();

  // État pour les informations de l'entreprise
  const [companyInfo, setCompanyInfo] = useState({
    name: 'VOTRE ENTREPRISE',
    address: '123 Rue de l\'Exemple\n75000 Abidjan',
    phone: '+225 08 12 45 67 89',
    email: 'contact@entreprise.com',
    rccm: 'CI-ABJ-XXXX-B-XXXXX',
    logo: null,
  });

  // État pour les informations du client
  const [clientInfo, setClientInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  // État pour les articles de la facture
  const [items, setItems] = useState([
    { id: '1', description: 'Produit ou service', quantity: 1, unitPrice: 100, taxRate: 20 },
  ]);

  // État pour les informations de la facture
  const [invoiceInfo, setInvoiceInfo] = useState({
    number: 'FAC-2023-001',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: '30 jours nets',
    notes: 'Merci pour votre confiance !',
  });

  // État pour le design sélectionné
  const [selectedDesign, setSelectedDesign] = useState('moderne');
  const [isDesignModalVisible, setIsDesignModalVisible] = useState(false);

  // Designs disponibles
  const designs = [
    { id: 'classique', name: 'Classique', color: '#2c3e50', icon: 'office-building' },
    { id: 'moderne', name: 'Moderne', color: '#3498db', icon: 'desktop-mac' },
    { id: 'minimaliste', name: 'Minimaliste', color: '#7f8c8d', icon: 'format-clear' },
    { id: 'professionnel', name: 'Professionnel', color: '#27ae60', icon: 'briefcase' },
    { id: 'creatif', name: 'Créatif', color: '#9b59b6', icon: 'palette' },
    { id: 'artistique', name: 'Artistique', color: '#e67e22', icon: 'brush' },
  ];

  // Calcul des totaux
  const calculateTotals = () => {
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.quantity * item.unitPrice;
    });

    let totalTax = 0;
    items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      totalTax += itemTotal * (item.taxRate / 100);
    });

    const total = subtotal + totalTax;

    return {
      subtotal: subtotal.toFixed(0),
      totalTax: totalTax.toFixed(0),
      total: total.toFixed(0),
    };
  };

  // Ajouter un article
  const addItem = () => {
    const newId = (items.length + 1).toString();
    setItems([...items, {
      id: newId,
      description: 'Nouvel article',
      quantity: 1,
      unitPrice: 0,
      taxRate: 20,
    }]);
  };

  // Supprimer un article
  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Mettre à jour un article
  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Générer et imprimer la facture
  const generateAndPrintInvoice = async () => {
    try {
      // Validation basique
      if (!clientInfo.name || !clientInfo.address) {
        Alert.alert('Attention', 'Veuillez remplir les informations du client');
        return;
      }

      // Capturer la facture en image
      const uri = await captureRef(invoiceRef, {
        format: 'png',
        quality: 1,
      });

      // Créer le HTML pour l'impression
      const totals = calculateTotals();
      
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #333;
              }
              .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                border: 2px solid ${designs.find(d => d.id === selectedDesign)?.color || '#3498db'};
                padding: 30px;
                border-radius: 10px;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                border-bottom: 3px solid ${designs.find(d => d.id === selectedDesign)?.color || '#3498db'};
                padding-bottom: 20px;
              }
              .company-info {
                flex: 1;
              }
              .invoice-title {
                text-align: right;
                flex: 1;
              }
              h1 {
                color: ${designs.find(d => d.id === selectedDesign)?.color || '#3498db'};
                margin: 0;
              }
              .info-sections {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
              }
              .section {
                flex: 1;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
                margin: 0 10px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
              }
              th {
                background: ${designs.find(d => d.id === selectedDesign)?.color || '#3498db'};
                color: white;
                padding: 12px;
                text-align: left;
              }
              td {
                padding: 12px;
                border-bottom: 1px solid #ddd;
              }
              .totals {
                text-align: right;
                margin-top: 30px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                max-width: 300px;
                margin-left: auto;
                margin-bottom: 10px;
              }
              .grand-total {
                font-size: 1.2em;
                font-weight: bold;
                color: ${designs.find(d => d.id === selectedDesign)?.color || '#3498db'};
                border-top: 2px solid #333;
                padding-top: 10px;
              }
              .footer {
                text-align: center;
                margin-top: 50px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="header">
                <div class="company-info">
                  <h2>${companyInfo.name}</h2>
                  <p>${companyInfo.address.replace(/\n/g, '<br>')}</p>
                  <p>Tél: ${companyInfo.phone}</p>
                  <p>Email: ${companyInfo.email}</p>
                  <p>RCCM: ${companyInfo.rccm}</p>
                </div>
                <div class="invoice-title">
                  <h1>FACTURE</h1>
                  <p><strong>N°:</strong> ${invoiceInfo.number}</p>
                  <p><strong>Date:</strong> ${invoiceInfo.date}</p>
                  <p><strong>Échéance:</strong> ${invoiceInfo.dueDate}</p>
                </div>
              </div>
              
              <div class="info-sections">
                <div class="section">
                  <h3>Émetteur</h3>
                  <p><strong>${companyInfo.name}</strong></p>
                  <p>${companyInfo.address.replace(/\n/g, '<br>')}</p>
                  <p>Tél: ${companyInfo.phone}</p>
                  <p>Email: ${companyInfo.email}</p>
                </div>
                <div class="section">
                  <h3>Client</h3>
                  <p><strong>${clientInfo.name}</strong></p>
                  <p>${clientInfo.address.replace(/\n/g, '<br>')}</p>
                  <p>Tél: ${clientInfo.phone}</p>
                  <p>Email: ${clientInfo.email}</p>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qté</th>
                    <th>Prix unitaire</th>
                    <th>TVA %</th>
                    <th>Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => {
                    const itemTotal = item.quantity * item.unitPrice;
                    return `
                      <tr>
                        <td>${item.description}</td>
                        <td>${item.quantity}</td>
                        <td>${item.unitPrice.toFixed(0)} F</td>
                        <td>${item.taxRate}%</td>
                        <td>${itemTotal.toFixed(0)} F</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
              
              <div class="totals">
                <div class="total-row">
                  <span>Sous-total HT:</span>
                  <span>${totals.subtotal} F</span>
                </div>
                <div class="total-row">
                  <span>TVA:</span>
                  <span>${totals.totalTax} F</span>
                </div>
                <div class="total-row grand-total">
                  <span>TOTAL TTC:</span>
                  <span>${totals.total} F</span>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>Conditions de paiement:</strong> ${invoiceInfo.paymentTerms}</p>
                <p><strong>Notes:</strong> ${invoiceInfo.notes}</p>
                <p>Cette facture est électronique et ne nécessite pas de signature</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Options d'impression
      const printOptions = {
        html: htmlContent,
        width: 612,
        height: 792,
      };

      // Imprimer
      const { uri: printUri } = await Print.printToFileAsync(printOptions);
      
      // Partager/ouvrir le PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(printUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Facture générée',
        });
      } else {
        Alert.alert('Succès', 'Facture générée avec succès !');
      }

    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la génération');
    }
  };

  // Obtenir le style en fonction du design
  const getDesignStyle = () => {
    const design = designs.find(d => d.id === selectedDesign);
    const designColor = design?.color || '#3498db';
    
    const styles = {
      classique: {
        primaryColor: '#2c3e50',
        secondaryColor: '#34495e',
        backgroundColor: '#f8f9fa',
        borderColor: '#bdc3c7',
        headerBg: '#ecf0f1',
      },
      moderne: {
        primaryColor: '#3498db',
        secondaryColor: '#2980b9',
        backgroundColor: '#ffffff',
        borderColor: '#e0e0e0',
        headerBg: '#f8fafc',
      },
      minimaliste: {
        primaryColor: '#7f8c8d',
        secondaryColor: '#95a5a6',
        backgroundColor: '#ffffff',
        borderColor: '#ecf0f1',
        headerBg: '#ffffff',
      },
      professionnel: {
        primaryColor: '#27ae60',
        secondaryColor: '#219653',
        backgroundColor: '#f8fff9',
        borderColor: '#d5f5e3',
        headerBg: '#eafaf1',
      },
      creatif: {
        primaryColor: '#9b59b6',
        secondaryColor: '#8e44ad',
        backgroundColor: '#f9f7fc',
        borderColor: '#e8daef',
        headerBg: '#f4ecf7',
      },
      artistique: {
  primaryColor: '#e67e22',       // Orange artistique
  secondaryColor: '#d35400',     // Orange foncé pour contraste
  backgroundColor: '#fff7f0',    // Beige très doux type papier artisanal
  borderColor: '#f5cba7',        // Ton pastel pour les bordures
  headerBg: '#fdebd0',           // Bandeau en ton clair et chaleureux
},

    };

    return styles[selectedDesign] || styles.moderne;
  };

  const designStyle = getDesignStyle();

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: designStyle.primaryColor }]}>
            Générateur de Facture
          </Text>
          <TouchableOpacity 
            style={[styles.designButton, { backgroundColor: designStyle.primaryColor }]}
            onPress={() => setIsDesignModalVisible(true)}
          >
            <Icon name="palette" size={20} color="#fff" />
            <Text style={styles.designButtonText}>Design</Text>
          </TouchableOpacity>
        </View>

        {/* Section des designs */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isDesignModalVisible}
          onRequestClose={() => setIsDesignModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choisissez un design</Text>
              <FlatList
                data={designs}
                keyExtractor={(item) => item.id}
                numColumns={2}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.designOption,
                      selectedDesign === item.id && { borderColor: item.color, borderWidth: 3 }
                    ]}
                    onPress={() => {
                      setSelectedDesign(item.id);
                      setIsDesignModalVisible(false);
                    }}
                  >
                    <Icon name={item.icon} size={40} color={item.color} />
                    <Text style={[styles.designOptionText, { color: item.color }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setIsDesignModalVisible(false)}
              >
                <Text style={styles.closeModalButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Facture Preview */}
        <View style={styles.invoiceContainer}>
          <View 
            ref={invoiceRef}
            style={[
              styles.invoicePreview,
              { 
                borderColor: designStyle.primaryColor,
                backgroundColor: designStyle.backgroundColor 
              }
            ]}
          >
            {/* En-tête de la facture */}
            <View style={[styles.invoiceHeader, { borderBottomColor: designStyle.primaryColor }]}>
              <View style={styles.companyHeader}>
                <Text style={[styles.companyName, { color: designStyle.primaryColor }]}>
                  {companyInfo.name}
                </Text>
                <Text style={styles.companyDetails}>{companyInfo.address}</Text>
                <Text style={styles.companyDetails}>Tél: {companyInfo.phone}</Text>
                <Text style={styles.companyDetails}>Email: {companyInfo.email}</Text>
                <Text style={styles.companyDetails}>RCCM: {companyInfo.rccm}</Text>
              </View>
              <View style={styles.invoiceTitle}>
                <Text style={[styles.invoiceTitleText, { color: designStyle.primaryColor }]}>
                  FACTURE
                </Text>
                <Text style={styles.invoiceNumber}>N°: {invoiceInfo.number}</Text>
                <Text style={styles.invoiceDate}>Date: {invoiceInfo.date}</Text>
                <Text style={styles.invoiceDate}>Échéance: {invoiceInfo.dueDate}</Text>
              </View>
            </View>

            {/* Informations client */}
            <View style={[styles.infoSections, { backgroundColor: designStyle.headerBg }]}>
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, { color: designStyle.primaryColor }]}>
                  Émetteur
                </Text>
                <Text style={styles.infoText}>{companyInfo.name}</Text>
                <Text style={styles.infoText}>{companyInfo.address}</Text>
                <Text style={styles.infoText}>Tél: {companyInfo.phone}</Text>
                <Text style={styles.infoText}>Email: {companyInfo.email}</Text>
              </View>
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, { color: designStyle.primaryColor }]}>
                  Client
                </Text>
                <Text style={styles.infoText}>{clientInfo.name || 'Nom du client'}</Text>
                <Text style={styles.infoText}>{clientInfo.address || 'Adresse'}</Text>
                <Text style={styles.infoText}>Tél: {clientInfo.phone || 'Téléphone'}</Text>
                <Text style={styles.infoText}>Email: {clientInfo.email || 'Email'}</Text>
              </View>
            </View>

            {/* Tableau des articles */}
            <View style={styles.itemsTable}>
              <View style={[styles.tableHeader, { backgroundColor: designStyle.primaryColor }]}>
                <Text style={styles.tableHeaderText}>Description</Text>
                <Text style={styles.tableHeaderText}>Qté</Text>
                <Text style={styles.tableHeaderText}>Prix U.</Text>
                <Text style={styles.tableHeaderText}>TVA %</Text>
                <Text style={styles.tableHeaderText}>Total HT</Text>
              </View>
              {items.map((item, index) => (
                <View key={item.id} style={[
                  styles.tableRow,
                  index % 2 === 0 && { backgroundColor: 'rgba(0,0,0,0.02)' }
                ]}>
                  <Text style={styles.tableCell}>{item.description}</Text>
                  <Text style={styles.tableCell}>{item.quantity}</Text>
                  <Text style={styles.tableCell}>{item.unitPrice.toFixed(0)} F</Text>
                  <Text style={styles.tableCell}>{item.taxRate}%</Text>
                  <Text style={styles.tableCell}>
                    {(item.quantity * item.unitPrice).toFixed(0)} F
                  </Text>
                </View>
              ))}
            </View>

            {/* Totaux */}
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Sous-total HT:</Text>
                <Text style={styles.totalValue}>{calculateTotals().subtotal} F</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TVA:</Text>
                <Text style={styles.totalValue}>{calculateTotals().totalTax} F</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotal, { borderTopColor: designStyle.primaryColor }]}>
                <Text style={[styles.totalLabel, { color: designStyle.primaryColor }]}>TOTAL TTC:</Text>
                <Text style={[styles.totalValue, { color: designStyle.primaryColor }]}>
                  {calculateTotals().total} F
                </Text>
              </View>
            </View>

            {/* Notes et conditions */}
            <View style={styles.footer}>
              <Text style={styles.footerTitle}>Conditions de paiement</Text>
              <Text style={styles.footerText}>{invoiceInfo.paymentTerms}</Text>
              <Text style={styles.footerTitle}>Notes</Text>
              <Text style={styles.footerText}>{invoiceInfo.notes}</Text>
            </View>
          </View>
        </View>

        {/* Formulaire de saisie */}
        <View style={styles.formContainer}>
          
          {/* Informations entreprise */}
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: designStyle.primaryColor }]}>
              Votre Entreprise
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de l'entreprise"
              value={companyInfo.name}
              onChangeText={(text) => setCompanyInfo({...companyInfo, name: text})}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Adresse"
              multiline
              numberOfLines={2}
              value={companyInfo.address}
              onChangeText={(text) => setCompanyInfo({...companyInfo, address: text})}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Téléphone"
                value={companyInfo.phone}
                onChangeText={(text) => setCompanyInfo({...companyInfo, phone: text})}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                placeholder="RCCM"
                value={companyInfo.rccm}
                onChangeText={(text) => setCompanyInfo({...companyInfo, rccm: text})}
              />
            </View>
          </View>

          {/* Informations client */}
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: designStyle.primaryColor }]}>
              Informations Client
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du client"
              value={clientInfo.name}
              onChangeText={(text) => setClientInfo({...clientInfo, name: text})}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Adresse du client"
              multiline
              numberOfLines={2}
              value={clientInfo.address}
              onChangeText={(text) => setClientInfo({...clientInfo, address: text})}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Téléphone"
                value={clientInfo.phone}
                onChangeText={(text) => setClientInfo({...clientInfo, phone: text})}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                placeholder="Email"
                value={clientInfo.email}
                onChangeText={(text) => setClientInfo({...clientInfo, email: text})}
              />
            </View>
          </View>

          {/* Articles */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.formSectionTitle, { color: designStyle.primaryColor }]}>
                Articles de la Facture
              </Text>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: designStyle.primaryColor }]}
                onPress={addItem}
              >
                <Icon name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>Article #{item.id}</Text>
                  <TouchableOpacity 
                    onPress={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                  >
                    <Icon name="delete" size={20} color={items.length <= 1 ? "#ccc" : "#e74c3c"} />
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={styles.input}
                  placeholder="Description"
                  value={item.description}
                  onChangeText={(text) => updateItem(item.id, 'description', text)}
                />
                
                <View style={styles.rowInputs}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Quantité</Text>
                    <TextInput
                      style={[styles.input, styles.numberInput]}
                      keyboardType="numeric"
                      value={item.quantity.toString()}
                      onChangeText={(text) => updateItem(item.id, 'quantity', parseInt(text) || 0)}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Prix unitaire (F)</Text>
                    <TextInput
                      style={[styles.input, styles.numberInput]}
                      keyboardType="numeric"
                      value={item.unitPrice.toString()}
                      onChangeText={(text) => updateItem(item.id, 'unitPrice', parseFloat(text) || 0)}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>TVA (%)</Text>
                    <TextInput
                      style={[styles.input, styles.numberInput]}
                      keyboardType="numeric"
                      value={item.taxRate.toString()}
                      onChangeText={(text) => updateItem(item.id, 'taxRate', parseFloat(text) || 0)}
                    />
                  </View>
                </View>
                
                <View style={styles.itemTotal}>
                  <Text style={styles.totalLabel}>Total HT: </Text>
                  <Text style={[styles.totalValue, { color: designStyle.primaryColor }]}>
                    {(item.quantity * item.unitPrice).toFixed(0)} F
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Informations facture */}
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: designStyle.primaryColor }]}>
              Informations Facture
            </Text>
            <View style={styles.rowInputs}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro de facture</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceInfo.number}
                  onChangeText={(text) => setInvoiceInfo({...invoiceInfo, number: text})}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date d'échéance</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceInfo.dueDate}
                  onChangeText={(text) => setInvoiceInfo({...invoiceInfo, dueDate: text})}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Conditions de paiement</Text>
              <TextInput
                style={styles.input}
                value={invoiceInfo.paymentTerms}
                onChangeText={(text) => setInvoiceInfo({...invoiceInfo, paymentTerms: text})}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                value={invoiceInfo.notes}
                onChangeText={(text) => setInvoiceInfo({...invoiceInfo, notes: text})}
              />
            </View>
          </View>
        </View>

        {/* Bouton d'action */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.generateButton, { backgroundColor: designStyle.primaryColor }]}
            onPress={generateAndPrintInvoice}
          >
            <Icon name="file-pdf-box" size={24} color="#fff" />
            <Text style={styles.generateButtonText}>Générer & Imprimer la Facture</Text>
          </TouchableOpacity>
          
          <Text style={styles.infoNote}>
            La facture sera générée au format PDF et pourra être imprimée ou partagée
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  designButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  designButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  designOption: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  designOptionText: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  closeModalButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#3498db',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  invoiceContainer: {
    padding: 15,
  },
  invoicePreview: {
    borderRadius: 10,
    borderWidth: 2,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 3,
    paddingBottom: 15,
    marginBottom: 20,
  },
  companyHeader: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  invoiceTitle: {
    alignItems: 'flex-end',
  },
  invoiceTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  invoiceDate: {
    fontSize: 11,
    color: '#666',
  },
  infoSections: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  infoSection: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  itemsTable: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableHeaderText: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    flex: 1,
    fontSize: 11,
    textAlign: 'center',
    color: '#333',
  },
  totalsContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 250,
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 14,
    color: '#333',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  grandTotal: {
    borderTopWidth: 2,
    paddingTop: 10,
    marginTop: 10,
  },
  footer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  footerText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 10,
  },
  formContainer: {
    paddingHorizontal: 15,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  formSectionTitle: {
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
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  numberInput: {
    textAlign: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    flex: 1,
    marginRight: 10,
  },
  inputGroup: {
    flex: 1,
    marginRight: 10,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  itemTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default Factures;