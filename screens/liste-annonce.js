import {StyleSheet, View, FlatList, Image, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Linking} from 'react-native';
import React, {useEffect, useState, useContext, useMemo} from 'react';
import {MaterialCommunityIcons, Feather, MaterialIcons} from '@expo/vector-icons';
import {GlobalContext} from '../global/GlobalState';
import {SafeAreaView} from 'react-native-safe-area-context';

export default function ListeAppareil({navigation}) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useContext(GlobalContext);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  const handleRefresh = () => {
    setRefreshing(true);
    getAnnonces();
    setRefreshing(false);
  };

  const toggleDescription = (id) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  useEffect(() => {
    const delay = 10000;
    getAnnonces();
    const intervalId = setInterval(getAnnonces2, delay);
    return () => clearInterval(intervalId);
  }, []);

  const getAnnonces = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://rouah.net/api/liste-annonce.php?matricule=${user.matricule}`);
      const newData = await response.json();
      setData(newData);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setError(error);
    }
  };

  const getAnnonces2 = async () => {
    try {
      const response = await fetch(`https://rouah.net/api/liste-annonce.php?matricule=${user.matricule}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const newData = await response.json();
      setData(newData);
    } catch (error) {
      setError(error);
    }
  };

  const searchItems = useMemo(() => {
    return () => {
      const filteredData = data.filter(
        item =>
          item.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return filteredData;
    };
  }, [data, searchTerm]);

  const formatDate = (dateString) => {
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };


  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#5500dc" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'}}>
        <MaterialCommunityIcons color="#266EF1" name="access-point-off" size={150} />
        <Text style={{fontSize: 18, marginRight: 10, marginLeft: 10, marginBottom: 10}}>
          Pas de connexion internet !
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={{backgroundColor: '#0099cc', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5}}>
          <Text style={{color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center'}}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {data.length > 0 ? (
        <View style={styles.searchBar}>
          <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher..."
            onChangeText={text => setSearchTerm(text)}
            value={searchTerm}
          />
        </View>
      ) : (
        <View style={{marginTop: 25, marginRight: 15, marginLeft: 15, elevation: 5, backgroundColor: 'white', borderRadius: 6, marginBottom: 5}}>
          <Text style={{marginTop: 10, marginRight: 15, marginLeft: 15, marginBottom: 15, color: '#888', textAlign: 'center'}}>
            Aucune donnée disponible
          </Text>
        </View>
      )}

      <FlatList
        data={searchTerm ? searchItems() : data}
        keyExtractor={(item) => item.code}
        renderItem={({item}) => (
          <View style={styles.annonceCard}>
            {/* En-tête avec photo et nom de l'auteur */}
            <View style={styles.authorContainer}>
              <View style={styles.authorInfo}>
                {item.photo64 ? (
                  <Image
                    source={{uri: `data:${item.type};base64,${item.photo64}`}}
                    style={styles.authorImage}
                  />
                ) : (
                  <Image source={require('../assets/user.jpg')} style={styles.authorImage} />
                )}
                <View>
                  <Text style={styles.authorName}>{item.nom_prenom}</Text>
                  <Text style={styles.sponsoredTag}>{item.categorie || "Sponsorisé"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.annonceHeader}>
              <View style={styles.annonceTitleContainer}>
                <Text style={styles.annonceTitle}>{item.titre}</Text>
                <View style={styles.dateContainer}>
                  <MaterialIcons name="access-time" size={12} color="#8E8E93" />
                  <Text style={styles.annonceDate}>{formatDate(item.date + 'T' + item.heure)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={() => navigation.navigate("Details d'annonce",{code: item.code })}>
                                <MaterialCommunityIcons name="eye" size={18} color="#FF3B30" />
              </TouchableOpacity>
            </View>

            {item.photo64_annonce ? (
              <Image
                source={{uri: `data:${item.type_annonce};base64,${item.photo64_annonce}`}}
                style={styles.annonceImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <MaterialIcons name="image" size={40} color="#E5E5EA" />
                <Text style={styles.noImageText}>Aucune image</Text>
              </View>
            )}

            <View style={styles.annonceContent}>
              <Text 
                style={styles.annonceDescription} 
                numberOfLines={expandedDescriptions[item.code] ? undefined : 2}
              >
                {item.description}
              </Text>
              {item.description.length > 100 && (
                <TouchableOpacity onPress={() => toggleDescription(item.code)}>
                  <Text style={styles.seeMoreText}>
                    {expandedDescriptions[item.code] ? 'Voir moins' : 'Voir plus'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.annonceFooter}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="eye" size={16} color="#007AFF"/>
                <Text style={styles.infoText}>{item.vues} vues</Text>
              </View>
              <View style={styles.infoItem}>
                <MaterialIcons name="people" size={16} color="#007AFF" />
                <Text style={styles.infoText}>Audience : {item.quantite}</Text>
              </View>
            </View>

          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16, 
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'gray',
  },
  searchIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: 40,
  },
  authorContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  sponsoredTag: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginTop: 2,
  },
  annonceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  annonceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  annonceTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  annonceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  annonceDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  annonceImage: {
    width: '100%',
    height: 200,
  },
  noImageContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  noImageText: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
  },
  annonceContent: {
    padding: 16,
  },
  annonceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'justify'
  },
  seeMoreText: {
    color: '#fa4447',
    fontSize: 14,
    marginTop: 5,
    fontWeight: '500',
  },
  annonceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  callButton: {
    backgroundColor: '#34C759', // Vert pour appel
  },
  smsButton: {
    backgroundColor: '#007AFF', // Bleu pour SMS
  },
  whatsappButton: {
    backgroundColor: '#25D366', // Vert WhatsApp
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
});