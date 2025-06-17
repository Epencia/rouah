import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'

export default function EmergencyButton() {
  const [isEmergency, setIsEmergency] = useState(false)
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    let timer
    if (countdown !== null) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setIsEmergency(true)
            Alert.alert('Alerte envoyée', 'Les secours et vos contacts ont été notifiés.')
            return null
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [countdown])

  const handleEmergencyPress = () => {
    if (!isEmergency) {
      setCountdown(5)
    }
  }

  const cancelEmergency = () => {
    setCountdown(null)
    setIsEmergency(false)
  }

  if (isEmergency) {
    return (
      <View style={[styles.card, styles.alertCard]}>
        <Text style={styles.alertTitle}>🚨 ALERTE D'URGENCE ACTIVÉE</Text>
        <Text style={styles.alertText}>
          Votre alerte d'urgence a été envoyée à tous les membres de votre famille et aux services d'urgence.
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.dangerButton} onPress={() => Alert.alert('Appel 112')}>
            <Text style={styles.dangerButtonText}>📞 Appeler le 112</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={cancelEmergency}>
            <Text style={styles.cancelButtonText}>Annuler l'alerte</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (countdown !== null) {
    return (
      <View style={[styles.card, styles.countdownCard]}>
        <Text style={styles.countdownNumber}>{countdown}</Text>
        <Text style={styles.countdownText}>
          Alerte d'urgence dans {countdown} seconde{countdown > 1 ? 's' : ''}
        </Text>
        <TouchableOpacity style={styles.cancelButton} onPress={cancelEmergency}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🚨 Bouton d'urgence</Text>
      <Text style={styles.description}>
        En cas d'urgence, appuyez sur le bouton ci-dessous pour alerter votre famille et les services d'urgence.
      </Text>
      <TouchableOpacity style={styles.dangerButton} onPress={handleEmergencyPress}>
        <Text style={styles.dangerButtonText}>🚨 URGENCE - APPUYER ICI</Text>
      </TouchableOpacity>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>📍 Envoyer ma position</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>📡 Partager localisation</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    elevation: 3,
  },
  alertCard: {
    backgroundColor: '#ffe5e5',
    borderColor: '#f44336',
    borderWidth: 2,
  },
  countdownCard: {
    backgroundColor: '#fff3e0',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d32f2f',
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b71c1c',
    marginBottom: 10,
    textAlign: 'center',
  },
  alertText: {
    color: '#b71c1c',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
  },
  dangerButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#eeeeee',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  secondaryButtonText: {
    color: '#444',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  countdownNumber: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#fb8c00',
  },
  countdownText: {
    fontSize: 16,
    color: '#e65100',
    marginVertical: 10,
  },
})
