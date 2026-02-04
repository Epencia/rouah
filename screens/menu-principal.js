import React , {useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, TextInput } from 'react-native';
import { MaterialCommunityIcons ,Feather} from '@expo/vector-icons';

const data = [
    {
    id: '1',
    image: 'wallet-outline', // RECHARGEMENT SOLDE
    titre: "RECHARGEMENT SOLDE",
    libelle: "Recharger votre solde",
    src : 'Paiement UVE'
  },
  {
    id: '2',
    image: 'account-outline', // MON PROFIL
    titre: 'MON PROFIL',
    libelle: 'Voir votre profil utilisateur',
    src : 'Profil'
  },
  {
    id: '4',
    image: 'file-document-outline', // MES ANNONCES
    titre: "MES ANNONCES",
    libelle: "Voir mes annonces",
    src : "Mes annonces"
  },
  {
    id: '7',
    image: 'shopping-outline', // MES ARTICLES
    titre: "MES ARTICLES",
    libelle: "Voir mon catalogue d'articles",
    src : 'Mes articles'
  },
  {
    id: '8',
    image: 'key-outline', // CODE MARCHAND
    titre: "CODE MARCHAND",
    libelle: "Voir votre code unique",
    src : 'Code marchand'
  },
  {
    id: '9',
    image: 'cash-multiple', // CAISSE & ARGENT
    titre: "CAISSE & ARGENT",
    libelle: "Gestion de la caisse",
    src : 'Caisses'
  },
  {
    id: '11',
    image: 'folder-outline', // TEST
    titre: "MES CONTACTS",
    libelle: "Voir mon repertoire téléphonique",
    src : "Contacts"
  },
   {
    id: '12',
    image: 'notebook-outline', // TEST
    titre: "MES LICENCES",
    libelle: "Voir mes abonnements",
    src : "Licences"
  },
   {
    id: '13',
    image: 'access-point-network', // TEST
    titre: "CATALOGUES",
    libelle: "Voir les boutiques officiels",
    src : "Chaines"
  },
   {
    id: '14',
    image: 'clipboard-list-outline', // TEST
    titre: "COMMANDES CLIENTS",
    libelle: "Voir les commandes des clients",
    src : "Commandes clients"
  },
   {
    id: '15',
    image: 'package-variant-closed', // TEST
    titre: "MES COMMANDES",
    libelle: "Voir mes commandes",
    src : "Mes commandes"
  },
   {
    id: '16',
    image: 'credit-card-outline', // TEST
    titre: "MA CARTE",
    libelle: "Voir ma carte",
    src : "Cartes"
  },
];


export default function MenuPrincipal({navigation}) {

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
