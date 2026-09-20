// ia.js
// ============================================================
// Assistant IA Rouah — React Native
// ChatScreen avec gestion clavier + affichage complet
// ============================================================

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  StatusBar,
  Dimensions,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import * as Speech from 'expo-speech';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = 'https://rouah.net/api/api-ia.php';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 60;

// Reconnaissance vocale optionnelle
let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};
try {
  const sr = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = sr.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = sr.useSpeechRecognitionEvent;
} catch (e) {
  console.warn('🎤 Reconnaissance vocale non disponible');
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function ChatScreen({ societeId, societeNom, onBack }) {
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [recognizing, setRecognizing] = useState(false);

  const [statsVisible, setStatsVisible] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Clavier : hauteur détectée
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // ============================================================
  // GESTION DU CLAVIER
  // ============================================================
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 120);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ============================================================
  // RESTAURATION / SAUVEGARDE
  // ============================================================
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('rouah_ia_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.autoSpeak !== undefined) setAutoSpeak(parsed.autoSpeak);
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('rouah_ia_state', JSON.stringify({ autoSpeak }));
      } catch (e) {}
    })();
  }, [autoSpeak]);

  // ============================================================
  // AUTO-SCROLL
  // ============================================================
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  // ============================================================
  // VOIX
  // ============================================================
  const speak = useCallback(
    (text) => {
      if (!text || !autoSpeak) return;
      Speech.stop();
      const clean = text.replace(/[*#_`]/g, '').substring(0, 4000);
      setIsSpeaking(true);
      Speech.speak(clean, {
        language: 'fr-FR',
        rate: 1.0,
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [autoSpeak]
  );

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  const toggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    if (!next) stopSpeaking();
    else speak('Voix activée');
  };

  // ============================================================
  // RECONNAISSANCE VOCALE
  // ============================================================
  useSpeechRecognitionEvent('start', () => setRecognizing(true));
  useSpeechRecognitionEvent('end', () => setRecognizing(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    setInputText(text);
  });
  useSpeechRecognitionEvent('error', () => setRecognizing(false));

  const toggleVoiceRecognition = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Non disponible',
        'La reconnaissance vocale nécessite l\'application installée.'
      );
      return;
    }
    if (isSpeaking) stopSpeaking();
    if (recognizing) {
      try {
        await ExpoSpeechRecognitionModule.stop();
      } catch (e) {}
      return;
    }
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) return;
      await ExpoSpeechRecognitionModule.start({
        lang: 'fr-FR',
        interimResults: true,
        continuous: false,
      });
    } catch (e) {}
  };

  // ============================================================
  // ENVOI
  // ============================================================
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading || !societeId) return;

    stopSpeaking();

    let baseMessages = messages;
    if (editingIndex !== null && editingIndex >= 0) {
      baseMessages = messages.slice(0, editingIndex);
      setEditingIndex(null);
    }

    const newMessages = [...baseMessages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask_ia',
          societe_id: societeId,
          question: text,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            error: data.error,
            sql: data.sql || null,
            tentatives: data.tentatives || null,
          },
        ]);
        speak('Désolé, ' + data.error);
      } else if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            results: data.results || [],
            sql: data.sql,
            count: data.count || 0,
            tokenId: data.token_id,
          },
        ]);
        if (data.results?.length > 0) {
          const n = data.count || data.results.length;
          speak(`J'ai trouvé ${n} résultat${n > 1 ? 's' : ''}.`);
        } else {
          speak('Aucun résultat trouvé.');
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', error: 'Erreur de connexion au serveur.' },
      ]);
      speak('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // ÉDITION
  // ============================================================
  const handleEdit = (index) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'user') return;
    stopSpeaking();
    setInputText(msg.content);
    setEditingIndex(index);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setInputText('');
  };

  // ============================================================
  // STATS
  // ============================================================
  const openStats = async () => {
    setStatsVisible(true);
    setStatsLoading(true);
    setStatsData(null);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'societe_stats', societe_id: societeId }),
      });
      const data = await res.json();
      setStatsData(data);
    } catch (e) {
      setStatsData({ error: 'Erreur réseau' });
    } finally {
      setStatsLoading(false);
    }
  };

  // ============================================================
  // RENDU DES MESSAGES (mémorisé)
  // ============================================================
  const renderItem = useCallback(
    ({ item, index }) => (
      <MessageBubble
        item={item}
        index={index}
        onEdit={handleEdit}
        onSpeak={speak}
      />
    ),
    [handleEdit, speak]
  );

  const keyExtractor = useCallback((_, i) => i.toString(), []);

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#075E54" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleAutoSpeak}
            style={[styles.headerBtn, autoSpeak && styles.headerBtnActive]}
          >
            <Text style={styles.headerBtnIcon}>{autoSpeak ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
          {isSpeaking && (
            <TouchableOpacity
              onPress={stopSpeaking}
              style={[styles.headerBtn, styles.headerBtnDanger]}
            >
              <Text style={styles.headerBtnIcon}>⏹</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={openStats}
            style={[styles.headerBtn, styles.headerBtnInfo]}
          >
            <Text style={styles.headerBtnIcon}>📊</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CHAT + INPUT dans KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={styles.chatWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 + insets.top : 0}
      >
        <FlatList
          ref={scrollRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listContentEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={5}
          windowSize={7}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={<Welcome societeNom={societeNom} />}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.statusBar}>
                <View style={styles.statusIcon}>
                  <Text style={styles.statusIconText}>R</Text>
                </View>
                <ActivityIndicator size="small" color="#6c63ff" />
                <Text style={styles.statusText}>
                  L'IA analyse votre question...
                </Text>
              </View>
            ) : null
          }
        />

        {/* Barre de lecture vocale */}
        {isSpeaking && (
          <View style={[styles.statusBar, styles.statusBarSpeaking]}>
            <View style={styles.statusIcon}>
              <Text style={styles.statusIconText}>R</Text>
            </View>
            <Text style={[styles.statusText, styles.statusTextSpeaking]}>
              🔊 Lecture en cours...
            </Text>
            <TouchableOpacity onPress={stopSpeaking}>
              <Text style={styles.stopText}>Arrêter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INPUT */}
        <View
          style={[
            styles.inputArea,
            {
              paddingBottom:
                Platform.OS === 'ios'
                  ? Math.max(12, insets.bottom)
                  : Math.max(12, insets.bottom || 12),
            },
          ]}
        >
          {editingIndex !== null && (
            <View style={styles.editingBanner}>
              <Text style={styles.editingText}>
                ✏️ Modification de la question
              </Text>
              <TouchableOpacity onPress={cancelEdit}>
                <Text style={styles.cancelEditText}>✕ Annuler</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Posez votre question..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={1000}
              editable={!isLoading}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={toggleVoiceRecognition}
              style={[
                styles.voiceButton,
                recognizing && styles.voiceButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.voiceButtonText,
                  recognizing && { color: '#fff' },
                ]}
              >
                {recognizing ? '🎙️' : '🎤'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                inputText.trim() && !isLoading && styles.sendButtonActive,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <Text
                style={[
                  styles.sendButtonText,
                  inputText.trim() && !isLoading && { color: '#fff' },
                ]}
              >
                {editingIndex !== null ? '✓' : '➤'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>
            🔒 L'IA peut faire des erreurs. Vérifiez les informations importantes.
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL STATS */}
      <Modal
        visible={statsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStatsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📊 Statistiques de la base
              </Text>
              <TouchableOpacity onPress={() => setStatsVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {statsLoading ? (
              <ActivityIndicator
                size="large"
                color="#6c63ff"
                style={{ marginTop: 30 }}
              />
            ) : statsData?.error ? (
              <Text style={styles.errorText}>❌ {statsData.error}</Text>
            ) : statsData?.stats ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Vue d'ensemble */}
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>📋 Tables</Text>
                    <Text style={styles.statValue}>
                      {statsData.stats.total_tables}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>📊 Lignes</Text>
                    <Text style={styles.statValue}>
                      {statsData.stats.total_rows.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>💾 Taille totale</Text>
                    <Text
                      style={[
                        styles.statValue,
                        parseFloat(statsData.stats.total_size) > 100 &&
                          styles.statValueDanger,
                      ]}
                    >
                      {statsData.stats.total_size}
                    </Text>
                  </View>
                </View>

                {/* Détail des tables en cartes 2 par ligne */}
                <Text style={styles.sectionTitle}>📋 Détail des tables</Text>
                <View style={styles.tablesCardsGrid}>
                  {statsData.stats.tables.map((t, i) => {
                    const isLarge = parseFloat(t.size) > 100;
                    return (
                      <View key={i} style={styles.tableCard}>
                        <View style={styles.tableCardHeader}>
                          <Text style={styles.tableCardEmoji}>📊</Text>
                          <Text
                            style={styles.tableCardName}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {t.name}
                          </Text>
                        </View>
                        <View style={styles.tableCardDivider} />
                        <View style={styles.tableCardRow}>
                          <View style={styles.tableCardStat}>
                            <Text style={styles.tableCardStatLabel}>Lignes</Text>
                            <Text style={styles.tableCardStatValue}>
                              {t.rows.toLocaleString()}
                            </Text>
                          </View>
                          <View style={styles.tableCardStat}>
                            <Text style={styles.tableCardStatLabel}>Taille</Text>
                            <Text
                              style={[
                                styles.tableCardStatValue,
                                isLarge && styles.tableCardStatValueDanger,
                              ]}
                            >
                              {t.size}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// WELCOME
// ============================================================
const Welcome = React.memo(() => (
  <View style={styles.welcome}>
    <View style={styles.welcomeIcon}>
      <Text style={styles.welcomeIconText}>R</Text>
    </View>
    <Text style={styles.welcomeTitle}>Bonjour !</Text>
    <Text style={styles.welcomeText}>
      Je suis votre assistant IA connecté à votre base de données. Posez-moi vos questions.
    </Text>
  </View>
));

// ============================================================
// MESSAGE BUBBLE
// ============================================================
const MessageBubble = React.memo(({ item, index, onEdit, onSpeak }) => {
  const [viewMode, setViewMode] = useState('cards');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [showSql, setShowSql] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);

  useEffect(() => {
    setDisplayLimit(10);
  }, [item?.sql, item?.count]);

  // ----- Message utilisateur -----
  if (item.role === 'user') {
    return (
      <View style={styles.messageUser}>
        <View style={styles.bubbleUser}>
          <Text style={styles.bubbleUserText} selectable>
            {item.content}
          </Text>
          <TouchableOpacity
            onPress={() => onEdit(index)}
            style={styles.editBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.editBtnText}>✏️ Modifier</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ----- Erreur -----
  if (item.error) {
    return (
      <View style={styles.messageAssistant}>
        <View style={styles.avatarError}>
          <Text style={styles.avatarText}>!</Text>
        </View>
        <View style={styles.bubbleError}>
          <Text style={styles.errorText}>⚠️ {item.error}</Text>
          {item.tentatives &&
            item.tentatives.map((t, i) => (
              <Text key={i} style={styles.tentativesText}>
                Token {t.token_id} : {t.ok ? '✅' : `❌ ${t.code}`}
              </Text>
            ))}
          {item.sql ? (
            <View style={styles.sqlBoxError}>
              <Text style={styles.sqlTextError} selectable>
                {item.sql}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  // ----- Contenu simple -----
  if (item.content) {
    return (
      <View style={styles.messageAssistant}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
        <View style={styles.bubbleAssistant}>
          <Text style={styles.bubbleText} selectable>
            {item.content}
          </Text>
          <TouchableOpacity
            onPress={() => onSpeak(item.content)}
            style={styles.speakBtn}
          >
            <Text style={styles.speakBtnText}>🔊 Écouter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ----- Résultats -----
  if (item.results && item.results.length > 0) {
    const chartData = getChartData(item.results);
    const canChart =
      chartData && item.results.length > 0 && !chartData.isLikelyRawData;
    const keys = Object.keys(item.results[0] || {});
    const availableTabs = ['cards', 'table'];
    if (canChart) availableTabs.push('bar', 'line', 'pie');

    const tabLabels = {
      cards: '📋 Résultats',
      table: '📊 Tableau',
      bar: '📶 Barres',
      line: '📈 Lignes',
      pie: '🥧 Camembert',
    };

    return (
      <View style={styles.messageAssistant}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
        <View style={styles.resultsContainer}>
          {/* Header */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>📊 Résultats</Text>
            <Text style={styles.resultsCount}>
              {item.count || item.results.length} ligne(s)
            </Text>
          </View>

          {/* Onglets scrollables horizontalement */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chartTabsScroll}
            contentContainerStyle={styles.chartTabs}
          >
            {availableTabs.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.chartTab,
                  viewMode === mode && styles.chartTabActive,
                ]}
                onPress={() => setViewMode(mode)}
              >
                <Text
                  style={[
                    styles.chartTabText,
                    viewMode === mode && styles.chartTabTextActive,
                  ]}
                >
                  {tabLabels[mode]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Contenu */}
          <View style={styles.resultsContent}>
            {viewMode === 'cards' && (
              <ScrollView
                showsVerticalScrollIndicator
                nestedScrollEnabled
                style={{ maxHeight: 420 }}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {item.results.slice(0, displayLimit).map((row, idx) => (
                  <View key={idx} style={styles.resultCard}>
                    <Text style={styles.resultCardIndex}>#{idx + 1}</Text>
                    {Object.entries(row).map(([k, v], i) => (
                      <View key={i} style={styles.resultRow}>
                        <Text style={styles.resultLabel} numberOfLines={1}>
                          {k}
                        </Text>
                        <Text style={styles.resultValue} selectable>
                          {v === null || v === undefined ? 'NULL' : String(v)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
                {displayLimit < item.results.length && (
                  <TouchableOpacity
                    onPress={() => setDisplayLimit(displayLimit + 50)}
                    style={styles.seeMoreButton}
                  >
                    <Text style={styles.seeMoreText}>
                      Voir plus ({item.results.length - displayLimit} lignes
                      restantes)
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {viewMode === 'table' && (
              <ScrollView
                style={styles.tableWrapper}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ minWidth: '100%' }}>
                    <View style={styles.tableHeader}>
                      <View
                        style={[
                          styles.tableCell,
                          styles.tableCellHeader,
                          { width: 40 },
                        ]}
                      >
                        <Text style={styles.tableHeaderText}>#</Text>
                      </View>
                      {keys.map((k, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.tableCell,
                            styles.tableCellHeader,
                            { minWidth: 120 },
                          ]}
                        >
                          <Text
                            style={styles.tableHeaderText}
                            numberOfLines={1}
                          >
                            {k}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {item.results
                      .slice(0, displayLimit)
                      .map((row, rowIndex) => (
                        <View
                          key={rowIndex}
                          style={[
                            styles.tableRow,
                            rowIndex % 2 === 0
                              ? styles.tableRowEven
                              : styles.tableRowOdd,
                          ]}
                        >
                          <View
                            style={[
                              styles.tableCell,
                              { width: 40, justifyContent: 'center' },
                            ]}
                          >
                            <Text style={styles.tableCellText}>
                              {rowIndex + 1}
                            </Text>
                          </View>
                          {keys.map((k, colIndex) => (
                            <View
                              key={colIndex}
                              style={[
                                styles.tableCell,
                                { minWidth: 120, justifyContent: 'center' },
                              ]}
                            >
                              <Text
                                style={styles.tableCellText}
                                numberOfLines={2}
                              >
                                {row[k] === null || row[k] === undefined
                                  ? 'NULL'
                                  : String(row[k])}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))}

                    {displayLimit < item.results.length && (
                      <TouchableOpacity
                        onPress={() => setDisplayLimit(displayLimit + 50)}
                        style={styles.seeMoreButton}
                      >
                        <Text style={styles.seeMoreText}>
                          Voir plus ({item.results.length - displayLimit} lignes
                          restantes)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              </ScrollView>
            )}

            {canChart &&
              (viewMode === 'bar' ||
                viewMode === 'line' ||
                viewMode === 'pie') && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setChartExpanded(true)}
                  style={styles.chartContainer}
                >
                  {renderChart(chartData, viewMode, false)}
                  <View style={styles.zoomHint}>
                    <Text style={styles.zoomHintText}>
                      🔍 Cliquer pour agrandir
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
          </View>

          {/* SQL */}
          {item.sql && (
            <View style={styles.sqlSection}>
              <TouchableOpacity
                onPress={() => setShowSql(!showSql)}
                style={styles.sqlToggle}
              >
                <Text style={styles.sqlToggleText}>
                  🔎 {showSql ? 'Masquer le SQL' : 'Voir le SQL généré'}
                </Text>
              </TouchableOpacity>
              {showSql && (
                <View style={styles.sqlBox}>
                  <Text style={styles.sqlText} selectable>
                    {item.sql}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* MODAL GRAPHIQUE AGRANDI */}
        <Modal
          visible={chartExpanded}
          transparent
          animationType="fade"
          onRequestClose={() => setChartExpanded(false)}
        >
          <View style={styles.expandedChartOverlay}>
            <View style={styles.expandedChartContainer}>
              <View style={styles.expandedChartHeader}>
                <Text style={styles.expandedChartTitle}>
                  {viewMode === 'bar'
                    ? '📶 Graphique en Barres'
                    : viewMode === 'line'
                    ? '📈 Graphique en Lignes'
                    : '🥧 Camembert'}
                </Text>
                <TouchableOpacity
                  onPress={() => setChartExpanded(false)}
                  style={styles.closeExpandedButton}
                >
                  <Text style={styles.closeExpandedText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                contentContainerStyle={styles.expandedChartScroll}
                showsVerticalScrollIndicator
              >
                {renderChart(chartData, viewMode, true)}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ----- Aucun résultat -----
  return (
    <View style={styles.messageAssistant}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>R</Text>
      </View>
      <View style={styles.bubbleNoResult}>
        <Text style={styles.noResultText}>
          ✅ Requête exécutée, aucun résultat trouvé.
        </Text>
      </View>
    </View>
  );
});

// ============================================================
// HELPERS : DONNÉES GRAPHIQUE
// ============================================================
function getChartData(results) {
  if (!results || results.length === 0) return null;
  const keys = Object.keys(results[0]);
  if (keys.length < 2) return null;

  let labelKey = null;
  let valueKey = null;
  const datePatterns = ['annee', 'year', 'date', 'mois', 'month', 'jour', 'day'];
  const numericPatterns = ['nombre', 'count', 'total', 'sum', 'quantite', 'montant', 'prix', 'valeur'];

  for (const key of keys) {
    const keyLower = key.toLowerCase();
    const val = results[0][key];
    const isNumeric = !isNaN(parseFloat(val)) && isFinite(val);
    const isDateLike = datePatterns.some((p) => keyLower.includes(p));
    const isNumericLike = numericPatterns.some((p) => keyLower.includes(p));
    if (isDateLike && !labelKey) labelKey = key;
    else if (isNumeric && isNumericLike && !valueKey) valueKey = key;
    else if (isNumeric && !valueKey && !labelKey) valueKey = key;
    else if (!isNumeric && !labelKey) labelKey = key;
  }
  if (!labelKey) labelKey = keys.find((k) => isNaN(parseFloat(results[0][k]))) || keys[0];
  if (!valueKey) valueKey = keys.find((k) => !isNaN(parseFloat(results[0][k]))) || keys[1];
  if (!valueKey || !labelKey) return null;
  if (isNaN(parseFloat(results[0][valueKey]))) return null;

  const chartRows = results.length > 80 ? results.slice(0, 80) : results;
  const isLikelyRawData = keys.length > 2;
  const colors = ['#6c63ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  return {
    labelKey,
    valueKey,
    isLikelyRawData,
    data: chartRows.map((row, index) => {
      const numVal = parseFloat(row[valueKey]) || 0;
      const strLabel = String(row[labelKey] || 'N/A').substring(0, 20);
      return {
        value: numVal,
        label: strLabel,
        x: strLabel,
        frontColor: colors[index % colors.length],
        color: colors[index % colors.length],
        text: strLabel,
      };
    }),
  };
}

function renderChart(chartData, viewMode, isExpanded) {
  if (!chartData) return null;
  const width = isExpanded ? SCREEN_WIDTH - 60 : CHART_WIDTH;
  const height = isExpanded ? 400 : 220;

  if (viewMode === 'bar') {
    return (
      <BarChart
        data={chartData.data}
        width={width}
        height={height}
        barWidth={isExpanded ? 30 : 24}
        spacing={isExpanded ? 30 : 24}
        roundedTop
        roundedBottom
        rulesLength={width - 60}
        yAxisLabelWidth={isExpanded ? 60 : 45}
        yAxisTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]}
        xAxisLabelTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]}
        color="#6c63ff"
        noOfSections={5}
        showValuesAsTopLabel
        topLabelTextStyle={{
          fontSize: isExpanded ? 12 : 11,
          color: '#64748b',
          fontWeight: 'bold',
        }}
      />
    );
  }
  if (viewMode === 'line') {
    return (
      <LineChart
        data={chartData.data}
        width={width}
        height={height}
        color="#6c63ff"
        thickness={isExpanded ? 4 : 3}
        hideDataPoints={false}
        dataPointsColor="#fff"
        dataPointsRadius={isExpanded ? 6 : 5}
        spacing={isExpanded ? 30 : 24}
        rulesLength={width - 60}
        yAxisLabelWidth={isExpanded ? 60 : 45}
        yAxisTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]}
        xAxisLabelTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]}
        areaChart
        startFillColor="rgba(108, 99, 255, 0.2)"
        endFillColor="rgba(108, 99, 255, 0.0)"
        noOfSections={5}
        isAnimated
      />
    );
  }
  if (viewMode === 'pie') {
    return (
      <View style={{ alignItems: 'center' }}>
        <PieChart
          data={chartData.data}
          donut
          innerRadius={isExpanded ? 60 : 40}
          radius={isExpanded ? 140 : 90}
          showText
          textColor="#ffffff"
          textSize={isExpanded ? 14 : 12}
          showTextBackground
          textBackgroundColor="#000000"
          textBackgroundRadius={isExpanded ? 26 : 22}
          centerLabelComponent={() => (
            <View style={styles.pieCenterLabel}>
              <Text style={[styles.pieCenterText, isExpanded && { fontSize: 14 }]}>
                Total
              </Text>
              <Text
                style={[styles.pieCenterValue, isExpanded && { fontSize: 22 }]}
              >
                {chartData.data
                  .reduce((sum, item) => sum + item.value, 0)
                  .toLocaleString()}
              </Text>
            </View>
          )}
        />
        <View style={[styles.pieLegend, isExpanded && { marginTop: 24 }]}>
          {chartData.data.map((item, idx) => (
            <View
              key={idx}
              style={[styles.legendItem, isExpanded && { width: '33%' }]}
            >
              <View
                style={[styles.legendColor, { backgroundColor: item.color }]}
              />
              <Text
                style={[styles.legendText, isExpanded && { fontSize: 13 }]}
                numberOfLines={1}
              >
                {item.text}: {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return null;
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chatWrapper: { flex: 1 },

  // HEADER
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  backBtnText: { fontSize: 13, color: '#6c63ff', fontWeight: '600' },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#6c63ff' },
  headerSubtitle: { fontSize: 10, color: '#6b7280' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerBtnActive: { backgroundColor: '#ede9fe' },
  headerBtnDanger: { backgroundColor: '#fef2f2' },
  headerBtnInfo: { backgroundColor: '#f0f9ff' },
  headerBtnIcon: { fontSize: 16 },

  // LISTE
  listContent: { padding: 12, paddingBottom: 20, flexGrow: 1 },
  listContentEmpty: { justifyContent: 'center' },

  // WELCOME
  welcome: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeIconText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  welcomeBold: { fontWeight: '700', color: '#075E54' },

  // MESSAGES
  messageUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  messageAssistant: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c63ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  avatarError: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  bubbleUser: {
    maxWidth: '85%',
    backgroundColor: '#f0f4f9',
    padding: 12,
    borderRadius: 18,
    borderBottomRightRadius: 6,
  },
  bubbleUserText: { fontSize: 14, color: '#1a1a2e', lineHeight: 20 },
  editBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
  },
  editBtnText: { fontSize: 11, color: '#6c63ff', fontWeight: '600' },

  bubbleAssistant: {
    maxWidth: '85%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
  },
  bubbleText: { fontSize: 14, color: '#1e293b', lineHeight: 20 },
  speakBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
  },
  speakBtnText: { fontSize: 12, color: '#6c63ff', fontWeight: '600' },

  bubbleError: {
    maxWidth: '85%',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { fontSize: 14, color: '#b91c1c', lineHeight: 20 },
  tentativesText: { fontSize: 11, color: '#7f1d1d', marginTop: 6 },
  sqlBoxError: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  sqlTextError: {
    color: '#fca5a5',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  bubbleNoResult: {
    maxWidth: '85%',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  noResultText: { fontSize: 14, color: '#166534' },

  // RÉSULTATS
  resultsContainer: {
    flex: 1,
    maxWidth: '92%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  resultsCount: {
    fontSize: 11,
    color: '#6c63ff',
    fontWeight: '600',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  chartTabsScroll: { maxHeight: 50, marginTop: 8 },
  chartTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 8,
    gap: 4,
    marginHorizontal: 12,
  },
  chartTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  chartTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTabText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  chartTabTextActive: { color: '#6c63ff' },

  resultsContent: { maxHeight: 500 },
  resultCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultCardIndex: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 6,
  },
  resultRow: { flexDirection: 'row', marginBottom: 4 },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    width: 100,
    marginRight: 8,
  },
  resultValue: { fontSize: 13, color: '#1e293b', flex: 1 },

  // TABLEAU
  tableWrapper: {
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    margin: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#6c63ff',
    paddingVertical: 4,
  },
  tableRow: { flexDirection: 'row', minHeight: 36 },
  tableRowEven: { backgroundColor: '#f8fafc' },
  tableRowOdd: { backgroundColor: '#fff' },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 0.5,
    borderRightColor: '#e5e7eb',
  },
  tableCellHeader: { borderRightColor: 'rgba(255,255,255,0.2)' },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  tableCellText: { fontSize: 12, color: '#1e293b' },
  seeMoreButton: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  seeMoreText: { color: '#6c63ff', fontSize: 13, fontWeight: '600' },

  // GRAPHIQUES
  chartContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartAxisText: { fontSize: 10, color: '#94a3b8' },
  zoomHint: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  zoomHintText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  pieCenterLabel: { justifyContent: 'center', alignItems: 'center' },
  pieCenterText: { fontSize: 12, color: '#64748b' },
  pieCenterValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  pieLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  legendColor: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { fontSize: 12, color: '#475569', flex: 1 },

  // SQL
  sqlSection: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sqlToggle: { paddingVertical: 4 },
  sqlToggleText: { color: '#6c63ff', fontSize: 13, fontWeight: '600' },
  sqlBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  sqlText: {
    color: '#a5f3fc',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // STATUT
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  statusBarSpeaking: { backgroundColor: '#ede9fe' },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c63ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: { color: '#fff', fontWeight: 'bold' },
  statusText: { fontSize: 13, color: '#64748b', flex: 1 },
  statusTextSpeaking: { color: '#6c63ff', fontWeight: '600' },
  stopText: { fontSize: 13, color: '#ef4444', fontWeight: '700' },

  // INPUT
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  editingText: { fontSize: 13, color: '#6c63ff', fontWeight: '600' },
  cancelEditText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 8,
    maxHeight: 110,
    minHeight: 40,
    lineHeight: 21,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginBottom: 2,
  },
  voiceButtonActive: { backgroundColor: '#ef4444' },
  voiceButtonText: { fontSize: 18 },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginBottom: 2,
  },
  sendButtonActive: { backgroundColor: '#6c63ff' },
  sendButtonText: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold' },
  disclaimer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  modalClose: { fontSize: 22, color: '#94a3b8', fontWeight: 'bold' },

  // ===== STATS GRID (vue d'ensemble) =====
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  statValueDanger: { color: '#ef4444' },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ===== NOUVEAU : Cartes de tables 2 par ligne =====
  tablesCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 20,
  },
  tableCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tableCardEmoji: {
    fontSize: 14,
  },
  tableCardName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  tableCardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  tableCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tableCardStat: {
    flex: 1,
  },
  tableCardStatLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  tableCardStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  tableCardStatValueDanger: {
    color: '#ef4444',
  },

  // GRAPHIQUE AGRANDI
  expandedChartOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  expandedChartContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  expandedChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  expandedChartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  closeExpandedButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeExpandedText: { fontSize: 18, color: '#ef4444', fontWeight: 'bold' },
  expandedChartScroll: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
});