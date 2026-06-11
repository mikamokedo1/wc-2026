import { useState, useEffect } from 'react'
import NamePopup from './components/NamePopup'
import ChatRoom from './components/ChatRoom'

const LS_KEY = 'groupchat_username'

export default function App() {
  const [userName, setUserName] = useState(null)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved && saved.trim()) {
      setUserName(saved.trim())
    } else {
      setShowPopup(true)
    }
  }, [])

  const handleConfirmName = (name) => {
    localStorage.setItem(LS_KEY, name)
    setUserName(name)
    setShowPopup(false)
  }

  const handleChangeName = () => {
    setShowPopup(true)
  }

  return (
    <div className="chat-layout" style={{ flexDirection: 'column' }}>
      {userName && (
        <ChatRoom userName={userName} onChangeName={handleChangeName} />
      )}
      {showPopup && (
        <NamePopup onConfirm={handleConfirmName} />
      )}
    </div>
  )
}
