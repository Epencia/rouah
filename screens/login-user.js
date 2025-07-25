import React, {useEffect, useState, useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Linking,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { GlobalContext } from '../global/GlobalState';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginUser({navigation}) {
  const [login, setLogin] = useState('');
  const [mdp, setMdp] = useState('');
  const [user, setUser] = useContext(GlobalContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showmdp, setShowmdp] = useState(false);

  useEffect(() => {
    if (navigation && user) {
      navigation.navigate('BottomTabs');
    }
  }, [user]);

  const handleLogin = async () => {
    if (!login || !mdp) {
      setErrors({
        login: !login ? 'Le champ Utilisateur est obligatoire' : '',
        mdp: !mdp ? 'Le champ Mot de passe est obligatoire' : '',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://rouah.net/api/connexion.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: login,
          mdp: mdp,
        }),
      });
      const data = await response.json();

      if (data[0].login) {
        if (data[0].matricule) {
          await AsyncStorage.setItem('matricule', data[0].matricule);
        }
        setUser(data[0]);
        navigation.navigate("BottomTabs");
      } else {
        Alert.alert('Erreur', data || 'Identifiants incorrects');
      }
    } catch (error) {
      Alert.alert("Erreur", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>
            <Text style={styles.title}>Rouah</Text>

            <Image
              source={require('../assets/logo-original.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.message}>Espace de connexion</Text>

            {/* Champ Utilisateur */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: errors.login ? 'red' : '#555' }]}>
                Utilisateur
              </Text>
              <TextInput
                style={[styles.input, { borderColor: errors.login ? 'red' : '#ccc' }]}
                value={login}
                onChangeText={setLogin}
                autoCapitalize="none"
                returnKeyType="next"
              />
              {errors.login && (
                <Text style={styles.errorText}>{errors.login}</Text>
              )}
            </View>

            {/* Champ Mot de passe */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: errors.mdp ? 'red' : '#555' }]}>
                Mot de passe
              </Text>
              <TextInput
                style={[styles.input, { borderColor: errors.mdp ? 'red' : '#ccc' }]}
                secureTextEntry={!showmdp}
                value={mdp}
                onChangeText={setMdp}
                maxLength={6}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.mdpIconContainer}
                onPress={() => setShowmdp(!showmdp)}
              >
                <MaterialIcons
                  name={showmdp ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#A5A5AE"
                />
              </TouchableOpacity>
              {errors.mdp && (
                <Text style={styles.errorText}>{errors.mdp}</Text>
              )}
            </View>

            {isSubmitting && (
              <ActivityIndicator size="large" color="#fa4447" />
            )}

            <TouchableOpacity 
              style={styles.btn} 
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Se connecter</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Linking.openURL('#')}>
              <Text style={styles.link}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Inscription')}>
              <Text style={styles.link}>Créer un compte ?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Bienvenue')}>
              <Text style={styles.link}>Retour</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  logo: {
    width: 150,
    height: 125,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  message: {
    marginBottom: 20,
    fontSize: 16,
    color: '#403b3b',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 12,
    top: -8,
    backgroundColor: 'white',
    paddingHorizontal: 4,
    fontSize: 12,
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    zIndex: 0,
  },
  errorText: {
    color: 'red',
    marginTop: 4,
    fontSize: 12,
  },
  btn: {
    width: '100%',
    padding: 14,
    backgroundColor: '#fa4447',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  link: {
    color: '#403b3b',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  mdpIconContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
});