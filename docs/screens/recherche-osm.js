import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  const osmUrl = `
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
        <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([5.3599517, -4.0082563], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);
          L.marker([5.3599517, -4.0082563]).addTo(map)
            .bindPopup('Abidjan')
            .openPopup();
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView originWhitelist={['*']} source={{ html: osmUrl }} style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
