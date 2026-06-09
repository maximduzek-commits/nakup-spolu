import { useState, useEffect } from 'react'
import {
  subscribeCurrentList, subscribeMasterItems,
  subscribeHistory, subscribeSavedLists, subscribeMealPlan,
} from '../firebase/firestore'

export function useCurrentList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const unsub = subscribeCurrentList(data => { setItems(data); setLoading(false) })
    return unsub
  }, [])
  return { items, loading }
}

export function useMasterItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const unsub = subscribeMasterItems(data => { setItems(data); setLoading(false) })
    return unsub
  }, [])
  return { items, loading }
}

export function useHistory() {
  const [entries, setEntries] = useState([])
  useEffect(() => {
    const unsub = subscribeHistory(setEntries)
    return unsub
  }, [])
  return entries
}

export function useSavedLists() {
  const [lists, setLists] = useState([])
  useEffect(() => {
    const unsub = subscribeSavedLists(setLists)
    return unsub
  }, [])
  return lists
}

export function useMealPlan(weekKey) {
  const [plan, setPlan] = useState(null)
  useEffect(() => {
    const unsub = subscribeMealPlan(weekKey, setPlan)
    return unsub
  }, [weekKey])
  return { plan }
}
