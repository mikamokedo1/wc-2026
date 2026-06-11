import { useState, useEffect } from 'react'
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

const HEARTBEAT_INTERVAL = 30_000 // 30s
const ONLINE_THRESHOLD = 90_000   // coi là online nếu lastSeen < 90s trước

export function usePresence(userName) {
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!userName) return

    const docRef = doc(db, 'presence', userName)

    const register = () =>
      setDoc(docRef, { userName, lastSeen: serverTimestamp() })

    // Đăng ký lần đầu
    register()

    // Heartbeat mỗi 30s
    const heartbeat = setInterval(register, HEARTBEAT_INTERVAL)

    // Xóa khi đóng tab
    const cleanup = () => deleteDoc(docRef)
    window.addEventListener('beforeunload', cleanup)

    // Subscribe toàn bộ presence
    const unsub = onSnapshot(collection(db, 'presence'), (snap) => {
      const now = Date.now()
      const users = snap.docs
        .map((d) => d.data())
        .filter((u) => {
          if (!u.lastSeen) return true // vừa join, chưa có server time
          const ms = u.lastSeen.toDate?.().getTime() ?? 0
          return now - ms < ONLINE_THRESHOLD
        })
        .sort((a, b) => a.userName.localeCompare(b.userName))
      setOnlineUsers(users)
    })

    return () => {
      clearInterval(heartbeat)
      window.removeEventListener('beforeunload', cleanup)
      cleanup()
      unsub()
    }
  }, [userName])

  return onlineUsers
}
