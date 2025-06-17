import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';

// Composant pour une carte de tâche individuelle
const TaskCard = ({ task, onEdit, onDelete }) => (
  <View style={styles.taskCard}>
    <Text style={styles.taskText}>{task.title}</Text>
    <View style={styles.taskActions}>
      <TouchableOpacity onPress={() => onEdit(task.id, task.title)}>
        <Text style={styles.actionButton}>Modifier</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(task.id)}>
        <Text style={[styles.actionButton, styles.deleteButton]}>Supprimer</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Composant pour une colonne (liste) de tâches
const TaskList = ({
  list,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDeleteList,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false); // Pour afficher/masquer le champ d'ajout

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(list.id, newTaskTitle.trim());
      setNewTaskTitle('');
      setIsAddingTask(false); // Cacher le champ après ajout
    } else {
      Alert.alert('Erreur', 'Le titre de la tâche ne peut pas être vide.');
    }
  };

  return (
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{list.title}</Text>
        <TouchableOpacity onPress={() => onDeleteList(list.id)}>
          <Text style={styles.deleteListButton}>X</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list.tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>Aucune tâche ici.</Text>
        }
      />

      {isAddingTask ? (
        <View style={styles.addTaskForm}>
          <TextInput
            style={styles.taskInput}
            placeholder="Titre de la tâche"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            onSubmitEditing={handleAddTask} // Ajoute la tâche en appuyant sur Entrée
          />
          <View style={styles.addTaskActions}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
              <Text style={styles.buttonText}>Ajouter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsAddingTask(false)}>
              <Text style={styles.buttonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addTaskButton}
          onPress={() => setIsAddingTask(true)}>
          <Text style={styles.buttonText}>+ Ajouter une tâche</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Composant principal de l'application
export default function TrelloClone() {
  const [lists, setLists] = useState([
    {
      id: 'list-1',
      title: 'À Faire',
      tasks: [
        { id: 'task-1', title: 'Préparer la réunion client' },
        { id: 'task-2', title: 'Envoyer le rapport mensuel' },
      ],
    },
    {
      id: 'list-2',
      title: 'En Cours',
      tasks: [{ id: 'task-3', title: 'Développer la nouvelle fonctionnalité' }],
    },
    {
      id: 'list-3',
      title: 'Terminé',
      tasks: [{ id: 'task-4', title: 'Corriger le bug sur la page de connexion' }],
    },
  ]);
  const [newListName, setNewListName] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);

  // États pour la modal de modification de tâche
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // { taskId, listId, currentTitle }
  const [editedTaskTitle, setEditedTaskTitle] = useState('');

  // --- Fonctions de gestion des listes ---

  const handleAddList = () => {
    if (newListName.trim()) {
      const newList = {
        id: `list-${Date.now()}`, // ID unique
        title: newListName.trim(),
        tasks: [],
      };
      setLists((prevLists) => [...prevLists, newList]);
      setNewListName('');
      setIsAddingList(false);
    } else {
      Alert.alert('Erreur', 'Le titre de la liste ne peut pas être vide.');
    }
  };

  const handleDeleteList = (listId) => {
    Alert.alert(
      'Supprimer la liste',
      'Êtes-vous sûr de vouloir supprimer cette liste et toutes ses tâches ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: () =>
            setLists((prevLists) =>
              prevLists.filter((list) => list.id !== listId)
            ),
          style: 'destructive',
        },
      ]
    );
  };

  // --- Fonctions de gestion des tâches ---

  const handleAddTask = (listId, taskTitle) => {
    setLists((prevLists) =>
      prevLists.map((list) =>
        list.id === listId
          ? {
              ...list,
              tasks: [...list.tasks, { id: `task-${Date.now()}`, title: taskTitle }],
            }
          : list
      )
    );
  };

  const handleEditTask = (taskId, currentTitle) => {
    // Trouver la listId de la tâche en cours d'édition
    const listContainingTask = lists.find((list) =>
      list.tasks.some((task) => task.id === taskId)
    );

    if (listContainingTask) {
      setEditingTask({ taskId, listId: listContainingTask.id });
      setEditedTaskTitle(currentTitle);
      setIsEditModalVisible(true);
    }
  };

  const handleSaveEditedTask = () => {
    if (!editedTaskTitle.trim()) {
      Alert.alert('Erreur', 'Le titre de la tâche ne peut pas être vide.');
      return;
    }

    setLists((prevLists) =>
      prevLists.map((list) =>
        list.id === editingTask.listId
          ? {
              ...list,
              tasks: list.tasks.map((task) =>
                task.id === editingTask.taskId
                  ? { ...task, title: editedTaskTitle.trim() }
                  : task
              ),
            }
          : list
      )
    );
    setIsEditModalVisible(false);
    setEditingTask(null);
    setEditedTaskTitle('');
  };

  const handleDeleteTask = (taskIdToDelete) => {
    Alert.alert(
      'Supprimer la tâche',
      'Êtes-vous sûr de vouloir supprimer cette tâche ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: () =>
            setLists((prevLists) =>
              prevLists.map((list) => ({
                ...list,
                tasks: list.tasks.filter((task) => task.id !== taskIdToDelete),
              }))
            ),
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      <Text style={styles.headerTitle}>Mon Trello Maison</Text>

      {/* FlatList pour les colonnes (listes) */}
      <FlatList
        horizontal
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskList
            list={item}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onDeleteList={handleDeleteList}
          />
        )}
        ListFooterComponent={() => (
          <View style={styles.addListContainer}>
            {isAddingList ? (
              <View style={styles.addListForm}>
                <TextInput
                  style={styles.listInput}
                  placeholder="Nom de la nouvelle liste"
                  value={newListName}
                  onChangeText={setNewListName}
                  onSubmitEditing={handleAddList}
                />
                <View style={styles.addListActions}>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddList}>
                    <Text style={styles.buttonText}>Ajouter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setIsAddingList(false)}>
                    <Text style={styles.buttonText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addListButton}
                onPress={() => setIsAddingList(true)}>
                <Text style={styles.buttonText}>+ Ajouter une autre liste</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={styles.listsContainer}
      />

      {/* Modal pour modifier une tâche */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Modifier la tâche</Text>
            <TextInput
              style={styles.taskInput}
              value={editedTaskTitle}
              onChangeText={setEditedTaskTitle}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonClose]}
                onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSave]}
                onPress={handleSaveEditedTask}>
                <Text style={styles.buttonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0079BF', // Couleur de fond Trello
    paddingTop: Platform.OS === 'android' ? 25 : 50, // Ajustement pour la barre de statut
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  listsContainer: {
    paddingHorizontal: 10,
    alignItems: 'flex-start', // Important pour que les listes ne s'étirent pas verticalement
  },
  listContainer: {
    backgroundColor: '#EBECF0', // Couleur de fond d'une liste Trello
    borderRadius: 8,
    width: 280, // Largeur fixe pour chaque liste
    marginRight: 10,
    padding: 10,
    height: 'auto', // La hauteur s'adapte au contenu
    maxHeight: '90%', // Limite la hauteur de la liste
    flexGrow: 0, // Ne pas étirer la liste en largeur
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteListButton: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    paddingHorizontal: 5,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  taskText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    fontSize: 14,
    color: '#0079BF',
    marginLeft: 15,
    fontWeight: 'bold',
  },
  deleteButton: {
    color: '#D14747',
  },
  emptyListText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  addTaskButton: {
    backgroundColor: '#A0A0A0',
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  taskInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    width: '100%',
  },
  addTaskForm: {
    marginTop: 10,
  },
  addTaskActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  addButton: {
    backgroundColor: '#5AAC44',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#888',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  addListContainer: {
    width: 280,
    marginRight: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Légèrement transparent
    borderRadius: 8,
    padding: 10,
    height: 'auto',
    maxHeight: '90%',
    justifyContent: 'center', // Centrer le bouton/formulaire d'ajout
  },
  addListButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Bouton plus clair
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  listInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    width: '100%',
  },
  addListForm: {
    width: '100%',
  },
  addListActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Fond semi-transparent
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 15,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginHorizontal: 10,
  },
  buttonClose: {
    backgroundColor: '#888',
  },
  buttonSave: {
    backgroundColor: '#0079BF',
  },
});