import {
  doc, collection, onSnapshot, setDoc, updateDoc, getDoc,
  deleteDoc, addDoc, getDocs, serverTimestamp, query, orderBy, limit, writeBatch
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
  const listSnap = await getDoc(currentListRef())
  const items = listSnap.exists() ? (listSnap.data().items ?? []) : []
  // prevent duplicate by name
  if (items.find(i => i.name === item.name)) return
  await setDoc(currentListRef(), {
    items: [...items, { ...item, id: item.id ?? crypto.randomUUID(), addedAt: Date.now() }]
  })
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
  if (items.length === 0) return

  // save to history
  await addDoc(historyRef(), {
    items,
    completedAt: serverTimestamp(),
    itemCount: items.length,
  })

  // update masterItems purchaseCount + lastPurchased (single getDocs call)
  const masterSnap = await getDocs(masterItemsRef())
  const masterMap = {}
  masterSnap.docs.forEach(d => { masterMap[d.data().name] = d })

  const batch = writeBatch(db)
  for (const item of items) {
    const masterDoc = masterMap[item.name]
    if (masterDoc) {
      batch.update(masterDoc.ref, {
        purchaseCount: (masterDoc.data().purchaseCount ?? 0) + 1,
        lastPurchased: serverTimestamp(),
      })
    }
  }
  await batch.commit()

  await setDoc(currentListRef(), { items: [] })
}

// ── Master items ──
export function subscribeMasterItems(cb) {
  return onSnapshot(masterItemsRef(), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function deleteMasterItem(id) {
  await deleteDoc(doc(db, 'household', HOUSEHOLD_ID, 'masterItems', id))
}

export async function renameMasterItem(id, oldName, newName) {
  await updateDoc(doc(db, 'household', HOUSEHOLD_ID, 'masterItems', id), { name: newName })
  // also rename in current list if present
  const listSnap = await getDoc(currentListRef())
  const items = listSnap.data()?.items ?? []
  const updated = items.map(i => i.name === oldName ? { ...i, name: newName } : i)
  if (items.some(i => i.name === oldName)) {
    await setDoc(currentListRef(), { items: updated })
  }
}

export async function addMasterItem(item) {
  return await addDoc(masterItemsRef(), {
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
  try {
    const existing = await getDocs(masterItemsRef())
    if (existing.size > 0) return
    const batch = writeBatch(db)
    items.forEach(item => {
      const ref = doc(masterItemsRef())
      batch.set(ref, { ...item, purchaseCount: 0, lastPurchased: null, createdAt: serverTimestamp() })
    })
    await batch.commit()
  } catch (e) {
    console.error('Seed failed:', e)
  }
}
