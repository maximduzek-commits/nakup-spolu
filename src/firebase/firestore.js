import {
  doc, collection, onSnapshot, setDoc, updateDoc, getDoc,
  deleteDoc, addDoc, getDocs, serverTimestamp, query, orderBy, limit
} from 'firebase/firestore'
import { db } from './config'

const HOUSEHOLD_ID = 'default'
const currentListRef = () => doc(db, 'household', HOUSEHOLD_ID, 'meta', 'currentList')
const masterItemsRef = () => collection(db, 'household', HOUSEHOLD_ID, 'masterItems')
const historyRef = () => collection(db, 'household', HOUSEHOLD_ID, 'history')
const savedListsRef = () => collection(db, 'household', HOUSEHOLD_ID, 'savedLists')

// ── Current list ──
export function subscribeCurrentList(cb) {
  return onSnapshot(currentListRef(), snap => {
    cb(snap.exists() ? (snap.data().items ?? []) : [])
  })
}

export async function addItemToList(item) {
  const snap = await getDocs(query(masterItemsRef()))
  const existing = snap.docs.find(d => d.data().name === item.name)
  if (existing) {
    await updateDoc(existing.ref, { lastPurchased: null })
  }
  const listSnap = await getDoc(currentListRef())
  const items = listSnap.exists() ? (listSnap.data().items ?? []) : []
  if (items.find(i => i.id === item.id)) return
  await setDoc(currentListRef(), { items: [...items, { ...item, addedAt: Date.now() }] }, { merge: true })
}

export async function removeItemFromList(itemId) {
  const snap = await getDoc(currentListRef())
  const items = (snap.data()?.items ?? []).filter(i => i.id !== itemId)
  await setDoc(currentListRef(), { items })
}

export async function updateListItem(itemId, changes) {
  const snap = await getDoc(currentListRef())
  const items = (snap.data()?.items ?? []).map(i => i.id === itemId ? { ...i, ...changes } : i)
  await setDoc(currentListRef(), { items })
}

export async function completeShoppingList() {
  const snap = await getDoc(currentListRef())
  const items = snap.data()?.items ?? []
  // save to history
  await addDoc(historyRef(), {
    items,
    completedAt: serverTimestamp(),
    itemCount: items.length,
  })
  // update masterItems purchaseCount + lastPurchased
  for (const item of items) {
    const masterSnap = await getDocs(masterItemsRef())
    const masterDoc = masterSnap.docs.find(d => d.data().name === item.name)
    if (masterDoc) {
      const data = masterDoc.data()
      await updateDoc(masterDoc.ref, {
        purchaseCount: (data.purchaseCount ?? 0) + 1,
        lastPurchased: serverTimestamp(),
      })
    }
  }
  // clear current list
  await setDoc(currentListRef(), { items: [] })
}

// ── Master items ──
export function subscribeMasterItems(cb) {
  return onSnapshot(masterItemsRef(), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function addMasterItem(item) {
  await addDoc(masterItemsRef(), {
    name: item.name,
    category: item.category,
    purchaseCount: 0,
    lastPurchased: null,
    createdAt: serverTimestamp(),
  })
}

// ── History ──
export function subscribeHistory(cb) {
  const q = query(historyRef(), orderBy('completedAt', 'desc'), limit(5))
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

// ── Saved lists ──
export function subscribeSavedLists(cb) {
  return onSnapshot(savedListsRef(), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function createSavedList(name, emoji, itemNames) {
  await addDoc(savedListsRef(), { name, emoji, itemNames, createdAt: serverTimestamp() })
}

export async function deleteSavedList(id) {
  await deleteDoc(doc(db, 'household', HOUSEHOLD_ID, 'savedLists', id))
}

// ── Seed master items (run once) ──
export async function seedMasterItems(items) {
  const existing = await getDocs(masterItemsRef())
  if (existing.size > 0) return
  for (const item of items) {
    await addDoc(masterItemsRef(), {
      ...item,
      purchaseCount: 0,
      lastPurchased: null,
      createdAt: serverTimestamp(),
    })
  }
}

