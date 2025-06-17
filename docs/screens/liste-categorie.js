import React , {useEffect, useState, useContext , useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, TextInput,ActivityIndicator } from 'react-native';
import { GlobalContext } from '../global/GlobalState';
import { MaterialCommunityIcons, Feather,FontAwesome5 } from '@expo/vector-icons';



export default function Categories({navigation,item}) {

 
    // liste des categories
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [user, setUser] = useContext(GlobalContext);
  
    const [refreshing, setRefreshing] = useState(false);
    const handleRefresh = () => {
      setRefreshing(true); // Indiquer que le rafraîchissement est en cours
      getFormations(); // Appeler la fonction de récupération des données
      setRefreshing(false); // Indiquer que le rafraîchissement est terminé
    };

  
  
  
  useEffect(()=>{
    // Exécuter la fonction avec cache
    const delay = 10000; // Définir le délai à 1 minute
    getFormations(); 
    // Définir un intervalle pour exécuter la fonction sans cache toutes les 1 minute
    const intervalId = setInterval(getFormations2, delay);
    // Nettoyer l'intervalle lorsque le composant est démonté ou lorsque l'effet se réexécute
    return () => clearInterval(intervalId);
  },[])
  
  

  const getFormations = async () => {
    setIsLoading(true);
   try {
    const response = await fetch(`https://adores.cloud/api/liste-categorie.php`, {
      headers: {
        //'Cache-Control': 'no-cache',
      },
    });
    const newData = await response.json();
    setData(newData);
   setIsLoading(false);
  } catch (error) {
    setIsLoading(false);
    setError(error);
  }
  }
  
  // liste 2
  const getFormations2 = async () => {
   try {
    const response = await fetch(`https://adores.cloud/api/liste-categorie.php`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    const newData = await response.json();
    setData(newData);
  } catch (error) {
    setError(error);
  }
  }
  // In des mobile money
  // api recherche
    
  const searchItems = useMemo(() => {
    return () => {
      const filteredData = data.filter(item =>
        item.titre.toLowerCase().includes(searchTerm.toLowerCase())||
        item.nombre.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
      return filteredData;
    };
  }, [data, searchTerm]);
  // api recherche
  
  
   // Erreur et Chargement --debut--
   if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5500dc" />
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center',backgroundColor:'white' }}>
        <MaterialCommunityIcons color="#266EF1" name="access-point-off" size={150}/>
        <Text style={{ fontSize: 18,marginRight:10,marginLeft:10,marginBottom:10}}>
        Pas de connexion internet !
        </Text>
        <TouchableOpacity onPress={handleRefresh} style={{ backgroundColor: '#0099cc',paddingVertical: 10,paddingHorizontal: 20,borderRadius: 5,}}>
          <Text style={{ color: 'white',fontSize: 16,fontWeight: 'bold',textAlign: 'center', }}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // Erreur et Chargement --fin--

  return (
    <View style={styles.container}>


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
    <View style={{marginTop: 25, marginRight:15,marginLeft:15,
        elevation:5,backgroundColor:'white',borderRadius:6,marginBottom:5,
      }}>
      <Text style={{marginTop: 10, marginRight:15,marginLeft:15,
        marginBottom:15,color:'#888',textAlign:'center'
      }}>Aucune donnée disponible</Text>
      </View>
    )}

      <FlatList
        data={searchTerm ? searchItems() : data}
        keyExtractor={(item) => item.code}
        renderItem={({item}) => (

        <TouchableOpacity style={styles.videoContainer} onPress={() => navigation.navigate('Formations',{item})}>
                       {item.photo64 ? (
            <Image
alt=""
resizeMode="cover"
source={{ uri: `data:${item.type};base64,${item.photo64.toString('base64')}` }}
style={styles.videoThumbnail}
/>
) : (
<Image
alt=""
resizeMode="cover"
source={require("../assets/user.jpg")}
style={styles.videoThumbnail}
/>
  )}
      

      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{item.titre}</Text>
        <Text style={styles.videoChannel}>{item.nombre} formations</Text>
      </View>
    </TouchableOpacity>

      )}/>

      <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Liste des diplomes')}>
        <FontAwesome5 name="graduation-cap" size={24} color="white" />
      </TouchableOpacity>

    </View>
  );
};

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
    backgroundColor: 'white', // Fond blanc pour la barre de recherche
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
  videoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 8, // Bordures arrondies
    borderWidth: 1,
    borderColor: '#ccc',
    padding:10,
    marginRight:10
  },
  videoThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoChannel: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 4,
  },
  videoViews: {
    fontSize: 14,
    color: 'gray',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#007bff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
