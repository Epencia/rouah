import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Vibration } from 'react-native';

export const CallScreen = ({ 
  visible, 
  number, 
  onAccept, 
  onReject,
  isActive = true
}) => {
  React.useEffect(() => {
    if (visible && isActive) {
      Vibration.vibrate([500, 500], true);
      return () => Vibration.cancel();
    }
  }, [visible, isActive]);

  if (!visible || !number) return null;

  return (
    <Modal transparent={true} animationType="fade">
      <View style={styles.container}>
        <View style={styles.callBox}>
          <Text style={styles.numberText} numberOfLines={1}>
            {formatPhoneNumber(number)}
          </Text>
          <Text style={styles.callText}>
            {isActive ? 'Appel entrant' : 'Appel terminé'}
          </Text>
          
          <View style={styles.buttonContainer}>
            {isActive && (
              <TouchableOpacity 
                style={[styles.button, styles.acceptButton]}
                onPress={onAccept}
              >
                <Text style={styles.buttonText}>Décrocher</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.button, isActive ? styles.rejectButton : styles.endButton]}
              onPress={onReject}
            >
              <Text style={styles.buttonText}>
                {isActive ? 'Rejeter' : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const formatPhoneNumber = (number) => {
  // Formattage personnalisé du numéro
  return number.replace(/(\d{2})(?=\d)/g, '$1 ');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)'
  },
  callBox: {
    width: '85%',
    padding: 25,
    backgroundColor: 'white',
    borderRadius: 15,
    alignItems: 'center',
    elevation: 5
  },
  numberText: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  callText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 25
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%'
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 30,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center'
  },
  acceptButton: {
    backgroundColor: '#2ecc71'
  },
  rejectButton: {
    backgroundColor: '#e74c3c'
  },
  endButton: {
    backgroundColor: '#3498db',
    width: '100%'
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  }
});