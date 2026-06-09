import {
  doc, collection, onSnapshot, setDoc, updateDoc, getDoc,
  deleteDoc, addDoc, getDocs, serverTimestamp, query, orderBy, limit,
  writeBatch, runTransaction
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

// BUG #1 FIX: transakce zabraňuje race condition při souběžných zápisech
export async function addItemToList(item) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(currentListRef())
    const items = snap.exists() ? (snap.data().items ?? []) : []
    if (items.find(i => i.name === item.name)) return
    tx.set(currentListRef(), {
      items: [...items, { ...item, id: item.id ?? crypto.randomUUID(), addedAt: Date.now() }]
    })
  })
}

export async function removeItemFromList(itemId) {
  if (!itemId) return
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(currentListRef())
    const items = (snap.data()?.items ?? []).filter(i => i.id !== itemId)
    tx.set(currentListRef(), { items })
  })
}

export async function updateListItem(itemId, changes) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(currentListRef())
    const items = (snap.data()?.items ?? []).map(i => i.id === itemId ? { ...i, ...changes } : i)
    tx.set(currentListRef(), { items })
  })
}

export async function completeShoppingList() {
  const snap = await getDoc(currentListRef())
  const items = snap.data()?.items ?? []
  if (items.length === 0) return

  await addDoc(historyRef(), {
    items,
    completedAt: serverTimestamp(),
    itemCount: items.length,
  })

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

// BUG #5 FIX: rename aktualizuje i savedLists reference
export async function renameMasterItem(id, oldName, newName) {
  await updateDoc(doc(db, 'household', HOUSEHOLD_ID, 'masterItems', id), { name: newName })

  // aktualizuj current list
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(currentListRef())
    const items = snap.data()?.items ?? []
    if (items.some(i => i.name === oldName)) {
      tx.set(currentListRef(), {
        items: items.map(i => i.name === oldName ? { ...i, name: newName } : i)
      })
    }
  })

  // aktualizuj savedLists
  const savedSnap = await getDocs(savedListsRef())
  const batch = writeBatch(db)
  savedSnap.docs.forEach(d => {
    const itemNames = d.data().itemNames ?? []
    const hasRef = itemNames.some(i => (typeof i === 'string' ? i : i.name) === oldName)
    if (hasRef) {
      batch.update(d.ref, {
        itemNames: itemNames.map(i => {
          if (typeof i === 'string') return i === oldName ? newName : i
          return i.name === oldName ? { ...i, name: newName } : i
        })
      })
    }
  })
  await batch.commit()
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

// ── Seed master items (adds missing items, safe to run repeatedly) ──
export async function seedMasterItems(items) {
  try {
    const existing = await getDocs(masterItemsRef())
    const existingNames = new Set(existing.docs.map(d => d.data().name))
    const missing = items.filter(item => !existingNames.has(item.name))
    if (missing.length === 0) return
    const batch = writeBatch(db)
    missing.forEach(item => {
      const ref = doc(masterItemsRef())
      batch.set(ref, { ...item, purchaseCount: 0, lastPurchased: null, createdAt: serverTimestamp() })
    })
    await batch.commit()
  } catch (e) {
    console.error('Seed failed:', e)
  }
}
