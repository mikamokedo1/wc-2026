import { useState, useEffect, useRef, useCallback } from 'react'
import {
  doc, setDoc, deleteDoc, collection, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

const TYPING_TIMEOUT  = 3000  // xóa sau 3s không gõ
const STALE_THRESHOLD = 5000  // coi stale nếu > 5s

export function useTyping(userName) {
  const timeoutRef = useRef(null)

  const setTyping = useCallback(() => {
    if (!userName) return
    setDoc(doc(db, 'typing', userName), {
      userName,
      typingAt: serverTimestamp(),
    }).catch(() => {})
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      deleteDoc(doc(db, 'typing', userName)).catch(() => {})
    }, TYPING_TIMEOUT)
  }, [userName])

  const clearTyping = useCallback(() => {
    clearTimeout(timeoutRef.current)
    if (userName) deleteDoc(doc(db, 'typing', userName)).catch(() => {})
  }, [userName])

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current)
      if (userName) deleteDoc(doc(db, 'typing', userName)).catch(() => {})
    }
  }, [userName])

  return { setTyping, clearTyping }
}

export function useTypingUsers(userName) {
  const [typingUsers, setTypingUsers] = useState([])

  useEffect(() => {
    if (!userName) return
    const unsub = onSnapshot(collection(db, 'typing'), (snap) => {
      const now = Date.now()
      const users = snap.docs
        .map((d) => d.data())
        .filter((u) => {
          if (u.userName === userName) return false
          if (!u.typingAt) return true
          const ms = u.typingAt.toDate?.().getTime() ?? 0
          return now - ms < STALE_THRESHOLD
        })
        .map((u) => u.userName)
      setTypingUsers(users)
    })
    return unsub
  }, [userName])

  return typingUsers
}
