import React , {useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, TextInput } from 'react-native';
import { MaterialCommunityIcons ,Feather} from '@expo/vector-icons';

const data = [
  {
    id: '1',
    image: 'credit-card-outline',
    titre: 'MON COMPTE',
    libelle: "Suivre l'activité de son compte",
    src : 'Accueil'
  },
  {
    id: '2',
    image: 'account-outline',
    titre: 'MON PROFIL',
    libelle: 'Voir votre profil utilisateur',
    src : 'Profil'
  },
  {
    id: '6',
    image: 'bag-personal-outline',
    titre: "FORMATIONS",
    libelle: "Découvrir nos formations",
    src : 'Categories'
  },
  {
    id: '7',
    image: 'school',
    titre: "DIPLOMES",
    libelle: "Accéder à nos certificats",
    src : 'Diplomes'
  },
  {
    id: '8',
    image: 'map-marker-radius-outline',
    titre: "LOCALISATION",
    libelle: "Localiser mes appareils",
    src : 'Geolocalisation'
  },
  {
    id: '10',
    image: 'credit-card-minus-outline',
    titre: "FACTURES",
    libelle: "Voir la liste des factures",
    src : 'Factures'
  },
  {
    id: '11',
    image: 'diamond-stone',
    titre: 'REGISTRE DE CONTROLE',
    libelle: "Voir le registre de controle",
    src : 'Registre de controle'
  },
    {
    id: '12',
    image: 'group',
    titre: "FAMILLES",
    libelle: "Voir la liste de la famille",
    src : 'Familles'
  },
  {
    id: '13',
    image: 'laptop',
    titre: "APPAREILS",
    libelle: "Voir la liste des appareils",
    src : "Appareils"
  },
  {
    id: '14',
    image: 'contacts-outline',
    titre: "CONTACTS",
    libelle: "Retrouvez vos contacts",
    src : "Contacts"
  },
   {
    id: '15',
    image: 'diamond-stone',
    titre: "TEST 2",
    libelle: "Gemini",
    src : "Gemini"
  },
];

export default function Menu({navigation}) {

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
    //marginBottom:20
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
