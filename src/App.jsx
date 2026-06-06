import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import { seedMasterItems, createSavedList, subscribeSavedLists } from './firebase/firestore'
import { SEED_ITEMS, SEED_SAVED_LISTS } from './data/seedData'
import BottomNav from './components/BottomNav'
import LoginScreen from './screens/LoginScreen'
import NakupScreen from './screens/NakupScreen'
import PridatScreen from './screens/PridatScreen'
import SeznamyScreen from './screens/SeznamyScreen'
import HistorieScreen from './screens/HistorieScreen'
import './App.css'

export default function App() {
  const [user, setUser] = useState(undefined)
  const [tab, setTab] = useState('nakup')
  const [syncStatus, setSyncStatus] = useState('online')

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u ?? null))
  }, [])

  useEffect(() => {
    if (!user) return
    seedMasterItems(SEED_ITEMS).then(() => {
      const unsub = subscribeSavedLists(lists => {
        if (lists.length === 0) {
          SEED_SAVED_LISTS.forEach(l => createSavedList(l.name, l.emoji, l.itemNames))
        }
        unsub()
      })
    })
  }, [user])

  if (user === undefined) return <div className="app-loading">Načítám…</div>
  if (!user) return <LoginScreen />

  const screenProps = { syncStatus, setSyncStatus }

  return (
    <div className="app-shell">
      <div className="app-content">
        {tab === 'nakup'    && <NakupScreen    {...screenProps} />}
        {tab === 'pridat'   && <PridatScreen   {...screenProps} />}
        {tab === 'seznamy'  && <SeznamyScreen  {...screenProps} />}
        {tab === 'historie' && <HistorieScreen {...screenProps} />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
