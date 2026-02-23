import React , {useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, TextInput } from 'react-native';
import { MaterialCommunityIcons ,Feather} from '@expo/vector-icons';

const data = [
{
  id: '1',
  image: 'file-document-edit-outline',
  titre: "DEMANDE DE STAGE",
  libelle: "Soumettre et suivre votre demande de stage en ligne",
  src: "Ma demande de stage"
},
{
  id: '2',
  image: 'book-open-variant-outline',
  titre: "GUIDE PRATIQUE",
  libelle: "Consulter les instructions et conseils pour vos démarches",
  src: "Informations"
},
{
  id: '3',
  image: 'file-search-outline',
  titre: "REGISTRE DE CONTRÔLE",
  libelle: "Vérifier les informations relatives aux formations et stages",
  src: "Registre de controle",
},
{
  id: '5',
  image: 'key-outline',
  titre: "RETROUVER MON CODE",
  libelle: "Récupérer votre code personnel d'abonnement",
  src: "Retrouver mon code",
},
{
  id: '6',
  image: 'book-outline',
  titre: "CGU & CONFIDENTIALITÉ",
  libelle: "Consulter les conditions d'utilisation et la politique de confidentialité",
  src: 'Clauses',
},
{
  id: '7',
  image: 'lock-outline',
  titre: "CONNEXION",
  libelle: "Accéder à votre espace personnel sécurisé",
  src: 'Connexion',
},
];




export default function Manuel({navigation}) {

  const [searchText, setSearchText] = useState('');

  const filteredData = data.filter((item) =>
    item.titre.toLowerCase().includes(searchText.toLowerCase())||
    item.libelle.toLowerCase().includes(searchText.toLowerCase())   
  );


  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Rechercher..."
          onChangeText={(text) => setSearchText(text)}
          value={searchText}
        />
      </View>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <TouchableOpacity style={styles.listItem} onPress={() => navigation.navigate(item.src)}>
          <View style={styles.cardIcon}>
            <MaterialCommunityIcons color="#000" name={item.image} size={24}/>
                    </View>
          <View style={styles.textContainer}>
            <Text style={styles.text}>{item.titre}</Text>
            <View style={styles.dataContainer}>
              <Text style={styles.dataText}>{item.libelle}</Text>
            </View>
          </View>
        </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white', // Fond blanc
    padding: 16,
    marginBottom:20
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 8, // Bordures arrondies
    backgroundColor: 'white', // Fond gris clair
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 16,
  },
  dataText: {
    fontSize: 14,
    color: 'gray',
  },
  dataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff1f5',
    marginRight: 16,
  },
});
