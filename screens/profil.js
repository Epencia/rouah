import React, { useState, useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Image, 
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlobalContext } from '../global/GlobalState';
import { useHeaderHeight } from '@react-navigation/elements';
import * as ImagePicker from 'expo-image-picker';

const screenHeight = Dimensions.get("window").height;

export default function Profil({ navigation }) {
  const headerHeight = useHeaderHeight();
  const remainingHeight = screenHeight - headerHeight;
  
  const [user] = useContext(GlobalContext);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageExtension, setSelectedImageExtension] = useState('');
  
  // Form states
  const [login, setLogin] = useState(user?.login || '');
  const [mdp, setMdp] = useState(user?.mdp || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telephone, setTelephone] = useState(user?.telephone || '');

  const selectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.Images,
      quality: 1,
      base64: true,
      allowsEditing: false,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setSelectedImage(result);
      const uriParts = result.assets[0].uri.split('.');
      const extension = uriParts[uriParts.length - 1];
      setSelectedImageExtension(`image/${extension}`);
    }
  };

  const ValidationProfil = () => {
    const photo = selectedImage ? selectedImage.assets[0].base64 : null;

    fetch('https://rouah.net/api/modification-profil.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: JSON.stringify({
        matricule: user.matricule,
        login: login,
        mdp: mdp,
        email: email,
        telephone: telephone,
        photo: photo,
        TypePhoto: selectedImageExtension,
      })
    })
    .then((response) => response.json())
    .then((responseJson) => {
      Alert.alert("Message", responseJson);
    })
    .catch((error) => {
      Alert.alert("Erreur", error.message);
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Image Section */}
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImageWrapper}>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.assets[0].uri }}
                style={styles.profileImage}
              />
            ) : user?.photo64 ? (
              <Image
                source={{ uri: `data:${user.type};base64,${user.photo64}` }}
                style={styles.profileImage}
              />
            ) : (
              <Image 
                source={require("../assets/user.jpg")} 
                style={styles.profileImage} 
              />
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.addPhotoButton}
            onPress={selectImage}
          >
            <Ionicons name="add" size={24} color="#DFD8C8" />
          </TouchableOpacity>
        </View>

        {/* User Info Section */}
        <View style={styles.userInfoContainer}>
          <Text style={styles.userName}>
            {user.nom_prenom || ''}
          </Text>
          <Text style={styles.userRole}>
            {user.role || ''}
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
            <TextInput 
              value={login}
              style={styles.input}
              onChangeText={setLogin}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe</Text>
            <TextInput 
              value={mdp}
              style={styles.input}
              onChangeText={setMdp}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput 
              value={email}
              style={styles.input}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Téléphone</Text>
            <TextInput 
              value={telephone}
              style={styles.input}
              onChangeText={setTelephone}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={ValidationProfil}
          >
            <Text style={styles.submitButtonText}>Modifier</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  profileImageWrapper: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: '#0099cc',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: '30%',
    backgroundColor: "#41444B",
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center"
  },
  userInfoContainer: {
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: "black",
    textAlign: "center",
    marginBottom: 5,
  },
  userRole: {
    fontSize: 16,
    color: "black",
    textAlign: "center",
  },
  formContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: '#222',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#fa4447',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});