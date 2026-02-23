import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// Composant SkeletonCard
const SkeletonCard = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
   
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonItem = ({ width, height, marginBottom = 12 }) => (
    <Animated.View
      style={[
        styles.skeletonItem,
        {
          width,
          height,
          marginBottom,
          opacity,
        },
      ]}
    />
  );

  return (
    <View style={styles.skeletonContainer}>
      {/* Header skeleton */}
      <View style={styles.skeletonHeader}>
        <SkeletonItem width={40} height={40} />
        <SkeletonItem width={150} height={24} />
        <SkeletonItem width={40} height={40} />
      </View>

      {/* Content skeleton */}
      <View style={styles.skeletonContent}>
        <SkeletonItem width="100%" height={30} marginBottom={20} />
        <SkeletonItem width="90%" height={20} />
        <SkeletonItem width="95%" height={20} />
        <SkeletonItem width="85%" height={20} />
        <SkeletonItem width="70%" height={20} marginBottom={30} />

        <SkeletonItem width="100%" height={120} marginBottom={20} />
        
        <SkeletonItem width="80%" height={20} />
        <SkeletonItem width="75%" height={20} />
        <SkeletonItem width="90%" height={20} />
        <SkeletonItem width="60%" height={20} />
      </View>
    </View>
  );
};

const Clauses = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  
  const webViewRef = useRef(null);

  // Gestionnaire de chargement
  const handleLoadStart = () => {
    setLoading(true);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    Alert.alert(
      'Erreur de chargement',
      'Impossible de charger la page. Vérifiez votre connexion internet.',
      [
        { text: 'Réessayer', onPress: () => webViewRef.current?.reload() },
        { text: 'Retour', onPress: () => navigation.goBack() }
      ]
    );
  };

   
    useEffect(() => {
       navigation.setOptions({ title: 'CGU & Confidentialité' });
     }, []);


  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://rouah.net/docs/confidentialite.html' }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        pullToRefreshEnabled={true}
      />

      {/* Skeleton Card pendant le chargement */}
      {loading && <SkeletonCard />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#414d63',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop:-40
  },
  // Styles du Skeleton
  skeletonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    padding: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 8,
  },
  skeletonContent: {
    flex: 1,
    paddingHorizontal: 8,
  },
  skeletonItem: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
});

export default Clauses;