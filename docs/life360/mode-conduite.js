import React, { useState, useEffect } from 'react'
import { View, Text, Button, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Entypo } from '@expo/vector-icons'

export default function DrivingMode() {
  const [isDriving, setIsDriving] = useState(false)
  const [tripData, setTripData] = useState({
    startTime: null,
    distance: 0,
    maxSpeed: 0,
    currentSpeed: 0,
    destination: null,
  })

  const [drivingStats, setDrivingStats] = useState({
    hardBraking: 0,
    rapidAcceleration: 0,
    phoneUsage: 0,
    safetyScore: 95,
  })

  useEffect(() => {
    let interval
    if (isDriving) {
      interval = setInterval(() => {
        setTripData((prev) => {
          const newSpeed = Math.floor(Math.random() * 60) + 20
          return {
            ...prev,
            distance: prev.distance + Math.random() * 0.1,
            currentSpeed: newSpeed,
            maxSpeed: Math.max(prev.maxSpeed, newSpeed),
          }
        })
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [isDriving])

  const startDriving = () => {
    setIsDriving(true)
    setTripData({
      startTime: new Date(),
      distance: 0,
      maxSpeed: 0,
      currentSpeed: 0,
      destination: 'Bureau - Paris 8ème',
    })
  }

  const stopDriving = () => {
    setIsDriving(false)
  }

  const getSpeedColor = (speed) => {
    if (speed > 80) return styles.redText
    if (speed > 50) return styles.yellowText
    return styles.greenText
  }

  const getScoreColor = (score) => {
    if (score >= 90) return styles.greenText
    if (score >= 70) return styles.yellowText
    return styles.redText
  }

  if (!isDriving) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}><FontAwesome5 name="car" size={16} /> Mode conduite</Text>
        <Text style={styles.text}>Activez le mode conduite pour suivre votre trajet et analyser votre conduite.</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#e0f2fe' }]}>
            <Text style={[styles.statValue, styles.blueText]}>127</Text>
            <Text style={styles.statLabel}>Trajets ce mois</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.statValue, getScoreColor(drivingStats.safetyScore)]}>
              {drivingStats.safetyScore}
            </Text>
            <Text style={styles.statLabel}>Score sécurité</Text>
          </View>
        </View>

        <Button title="Démarrer un trajet" onPress={startDriving} />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.card, { borderColor: '#3b82f6' }]}>
        <View style={styles.header}>
          <Text style={styles.title}><FontAwesome5 name="car" size={16} color="#3b82f6" /> Mode conduite actif</Text>
          <Text style={styles.badge}>En cours</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.speedText, getSpeedColor(tripData.currentSpeed)]}>
              {tripData.currentSpeed} km/h
            </Text>
            <Text style={styles.statLabel}>Vitesse actuelle</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.speedText}>{tripData.distance.toFixed(1)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="navigate" size={16} />
          <Text style={styles.infoText}>Destination: {tripData.destination}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time" size={16} />
          <Text style={styles.infoText}>Démarré à {tripData.startTime?.toLocaleTimeString()}</Text>
        </View>

        <TouchableOpacity onPress={stopDriving} style={styles.stopButton}>
          <Text style={styles.stopButtonText}>Terminer le trajet</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Analyse de conduite</Text>
        <View style={styles.statLine}><Text>Freinages brusques:</Text><Text>{drivingStats.hardBraking}</Text></View>
        <View style={styles.statLine}><Text>Accélérations rapides:</Text><Text>{drivingStats.rapidAcceleration}</Text></View>
        <View style={styles.statLine}><Text>Usage téléphone:</Text><Text>{drivingStats.phoneUsage}</Text></View>
        <View style={styles.statLine}><Text>Vitesse max:</Text><Text>{tripData.maxSpeed} km/h</Text></View>

        <View style={styles.scoreBox}>
          <Text>Score sécurité:</Text>
          <Text style={[styles.scoreValue, getScoreColor(drivingStats.safetyScore)]}>
            {drivingStats.safetyScore}/100
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.outlineButton}>
            <Entypo name="phone" size={16} />
            <Text style={styles.buttonText}> Appel mains libres</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerButton}>
            <MaterialCommunityIcons name="alert" size={16} color="#fff" />
            <Text style={styles.dangerText}> Urgence</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    marginVertical: 8,
    color: '#4b5563',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  statBox: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  speedText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  redText: { color: '#dc2626' },
  yellowText: { color: '#ca8a04' },
  greenText: { color: '#16a34a' },
  blueText: { color: '#3b82f6' },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1e3a8a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#4b5563',
  },
  stopButton: {
    marginTop: 12,
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 6,
  },
  stopButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#6b7280',
    borderRadius: 6,
    flex: 1,
    marginRight: 4,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginLeft: 4,
  },
  dangerText: {
    color: '#fff',
  },
  buttonText: {
    color: '#1f2937',
  },
})
