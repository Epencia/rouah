// App.js
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';

// Note: Pour expo-view-shot, installez : expo install expo-view-shot expo-media-library expo-sharing

const Qrcode = () => {
  const [text, setText] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [size, setSize] = useState(200);
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [color, setColor] = useState('#000000');
  const [modalVisible, setModalVisible] = useState(false);
  const [logoSize, setLogoSize] = useState(40);
  const [includeLogo, setIncludeLogo] = useState(false);
  const qrRef = React.useRef();

  const generateQRCode = () => {
    if (text.trim() === '') {
      Alert.alert('Erreur', 'Veuillez entrer un texte ou une URL');
      return;
    }
    setQrValue(text);
  };

  const resetQRCode = () => {
    setText('');
    setQrValue('');
    setSize(200);
    setBackgroundColor('#FFFFFF');
    setColor('#000000');
  };

  const saveQRCode = async () => {
    if (!qrValue) {
      Alert.alert('Erreur', 'Générez d\'abord un QR Code');
      return;
    }

    try {
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
      });

      const permission = await MediaLibrary.requestPermissionsAsync();
      
      if (permission.granted) {
        const asset = await MediaLibrary.createAssetAsync(uri);
        Alert.alert('Succès', 'QR Code enregistré dans la galerie!');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le QR Code');
    }
  };

  const shareQRCode = async () => {
    if (!qrValue) {
      Alert.alert('Erreur', 'Générez d\'abord un QR Code');
      return;
    }

    try {
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de partager le QR Code');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Générateur de QR Code</Text>
          <Text style={styles.subtitle}>
            Entrez du texte, une URL ou d'autres données
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Entrez le texte ou l'URL..."
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={3}
          />
          
          <TouchableOpacity
            style={[styles.button, styles.generateButton]}
            onPress={generateQRCode}
          >
            <Text style={styles.buttonText}>Générer QR Code</Text>
          </TouchableOpacity>
        </View>

        {qrValue ? (
          <View style={styles.qrContainer}>
            <View ref={qrRef} collapsable={false}>
              <QRCode
                value={qrValue}
                size={size}
                color={color}
                backgroundColor={backgroundColor}
                logo={includeLogo ? require('../assets/logo-original.png') : null}
                logoSize={logoSize}
                logoBackgroundColor="transparent"
              />
            </View>

            <Text style={styles.qrText} numberOfLines={2}>
              {qrValue}
            </Text>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={saveQRCode}
              >
                <Text style={styles.buttonText}>Enregistrer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.shareButton]}
                onPress={shareQRCode}
              >
                <Text style={styles.buttonText}>Partager</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.settingsButton]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.buttonText}>Paramètres</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>
              Votre QR Code apparaîtra ici
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={resetQRCode}
        >
          <Text style={styles.buttonText}>Réinitialiser</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal pour les paramètres */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Paramètres du QR Code</Text>

            <View style={styles.option}>
              <Text>Taille : {size}</Text>
              <View style={styles.sliderContainer}>
                <Text>100</Text>
                <TextInput
                  style={styles.sliderInput}
                  value={size.toString()}
                  onChangeText={(value) => setSize(parseInt(value) || 200)}
                  keyboardType="numeric"
                />
                <Text>300</Text>
              </View>
            </View>

            <View style={styles.option}>
              <Text>Couleur du QR Code</Text>
              <View style={styles.colorOptions}>
                {['#000000', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0'].map(
                  (colorOption) => (
                    <TouchableOpacity
                      key={colorOption}
                      style={[
                        styles.colorOption,
                        { backgroundColor: colorOption },
                        color === colorOption && styles.selectedColor,
                      ]}
                      onPress={() => setColor(colorOption)}
                    />
                  )
                )}
              </View>
            </View>

            <View style={styles.option}>
              <Text>Couleur de fond</Text>
              <View style={styles.colorOptions}>
                {['#FFFFFF', '#F5F5F5', '#E3F2FD', '#FFF3E0', '#FCE4EC'].map(
                  (bgColor) => (
                    <TouchableOpacity
                      key={bgColor}
                      style={[
                        styles.colorOption,
                        { backgroundColor: bgColor, borderWidth: 1 },
                        backgroundColor === bgColor && styles.selectedColor,
                      ]}
                      onPress={() => setBackgroundColor(bgColor)}
                    />
                  )
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  generateButton: {
    backgroundColor: '#2196F3',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginHorizontal: 5,
  },
  shareButton: {
    backgroundColor: '#FF9800',
    flex: 1,
    marginHorizontal: 5,
  },
  settingsButton: {
    backgroundColor: '#9C27B0',
    flex: 1,
    marginHorizontal: 5,
  },
  resetButton: {
    backgroundColor: '#f44336',
    width: '100%',
    marginTop: 20,
  },
  closeButton: {
    backgroundColor: '#666',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  qrText: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  placeholderContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    marginBottom: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    minHeight: '50%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
  },
  option: {
    marginBottom: 25,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sliderInput: {
    flex: 1,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    textAlign: 'center',
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
  },
});

export default Qrcode;