// AlertDetailsScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AlertDetailsScreen({ route }) {
  const { alertId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Détails de l'alerte</Text>
      <Text style={styles.content}>ID de l'alerte: {alertId}</Text>
      {/* Ajoutez ici le contenu spécifique à votre notification */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  content: {
    fontSize: 16,
  },
});