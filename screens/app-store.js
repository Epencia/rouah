import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

export default function AppStore () {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('https://adores.cloud/api/store.php');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les fichiers');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (fileId, fileName, fileType, fileUrl) => {
    try {
      setDownloading(prev => ({ ...prev, [fileId]: true }));
      
      // Si fileUrl est disponible, l'utiliser directement
      const downloadUrl = fileUrl || `https://adores.cloud/uploads/${fileId}`;
      
      const fileExtension = fileType.split('/')[1] || fileType.split('.')[1] || 'file';
      const safeFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const downloadPath = `${FileSystem.documentDirectory}${safeFileName}.${fileExtension}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        downloadPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Progression: ${Math.round(progress * 100)}%`);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      
      Alert.alert('Succès', `Fichier téléchargé: ${uri.split('/').pop()}`);
      
    } catch (error) {
      Alert.alert('Erreur', 'Échec du téléchargement');
      console.error('Download error:', error);
    } finally {
      setDownloading(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const renderFileItem = ({ item }) => (
    <View style={styles.itemContainer}>
      {item.photo64 ? (
        <Image 
          source={{ uri: `data:${item.type};base64,${item.photo64}` }} 
          style={styles.fileImage} 
        />
      ) : (
        <View style={styles.fileIcon}>
          <Ionicons name="document-outline" size={32} color="#007AFF" />
        </View>
      )}
      
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
          {item.nom}
        </Text>
        <Text style={styles.fileType}>{item.categorie}</Text>
        <Text style={styles.fileSize}>{item.taille ? formatFileSize(item.taille) : ''}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.downloadButton}
        onPress={() => downloadFile(item.id, item.nom, item.type, item.url)}
        disabled={downloading[item.id]}
      >
        {downloading[item.id] ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="cloud-download-outline" size={24} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Outils</Text>
        <TouchableOpacity onPress={fetchFiles} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement des fichiers...</Text>
        </View>
      ) : files.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color="#cccccc" />
          <Text style={styles.emptyText}>Aucun fichier disponible</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: '#666666',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  fileIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
  },
  fileInfo: {
    flex: 1,
    marginRight: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
    maxWidth: '90%',
  },
  fileType: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#999999',
  },
  downloadButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});