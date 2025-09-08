import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Task, Column as ColumnType, Rule } from '@/types/kanban'

// Collections
const TASKS_COLLECTION = 'tasks'
const COLUMNS_COLLECTION = 'columns'
const RULES_COLLECTION = 'rules'

// Task operations
export const taskService = {
  // Create a new task
  async createTask(userId: string, task: Omit<Task, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
      ...task,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  // Update an existing task
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(db, TASKS_COLLECTION, taskId)
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  // Delete a task
  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(db, TASKS_COLLECTION, taskId)
    await deleteDoc(taskRef)
  },

  // Get all tasks for a user
  async getTasks(userId: string): Promise<Task[]> {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[]
  },

  // Listen to real-time updates for tasks
  subscribeToTasks(userId: string, callback: (tasks: Task[]) => void) {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    return onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[]
      callback(tasks)
    })
  },
}

// Column operations
export const columnService = {
  // Create a new column
  async createColumn(userId: string, column: Omit<ColumnType, 'id' | 'tasks'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLUMNS_COLLECTION), {
      ...column,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  // Update an existing column
  async updateColumn(columnId: string, updates: Partial<ColumnType>): Promise<void> {
    const columnRef = doc(db, COLUMNS_COLLECTION, columnId)
    await updateDoc(columnRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  // Delete a column
  async deleteColumn(columnId: string): Promise<void> {
    const columnRef = doc(db, COLUMNS_COLLECTION, columnId)
    await deleteDoc(columnRef)
  },

  // Get all columns for a user
  async getColumns(userId: string): Promise<ColumnType[]> {
    const q = query(
      collection(db, COLUMNS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      tasks: [], // Tasks will be loaded separately
    })) as ColumnType[]
  },

  // Listen to real-time updates for columns
  subscribeToColumns(userId: string, callback: (columns: ColumnType[]) => void) {
    const q = query(
      collection(db, COLUMNS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, (querySnapshot) => {
      const columns = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        tasks: [], // Tasks will be loaded separately
      })) as ColumnType[]
      callback(columns)
    })
  },
}

// Rule operations
export const ruleService = {
  // Create a new rule
  async createRule(userId: string, rule: Omit<Rule, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, RULES_COLLECTION), {
      ...rule,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  // Update an existing rule
  async updateRule(ruleId: string, updates: Partial<Rule>): Promise<void> {
    const ruleRef = doc(db, RULES_COLLECTION, ruleId)
    await updateDoc(ruleRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  // Delete a rule
  async deleteRule(ruleId: string): Promise<void> {
    const ruleRef = doc(db, RULES_COLLECTION, ruleId)
    await deleteDoc(ruleRef)
  },

  // Get all rules for a user
  async getRules(userId: string): Promise<Rule[]> {
    const q = query(
      collection(db, RULES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Rule[]
  },

  // Listen to real-time updates for rules
  subscribeToRules(userId: string, callback: (rules: Rule[]) => void) {
    const q = query(
      collection(db, RULES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, (querySnapshot) => {
      const rules = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Rule[]
      callback(rules)
    })
  },
}
