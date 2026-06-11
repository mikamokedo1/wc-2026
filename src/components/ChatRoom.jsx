import { useState, useRef, useEffect, useCallback } from 'react'
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { uploadImage } from '../cloudinary'
import Message from './Message'
import { isSameDay, formatDate, getAvatarColor, getInitials } from '../utils'

const MESSAGES_LIMIT = 100

export default function ChatRoom({ userName, onChangeName }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const [firestoreError, setFirestoreError] = useState(null)

  // Subscribe to messages
  useEffect(() => {
    setLoading(true)
    setFirestoreError(null)

    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(MESSAGES_LIMIT)
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setMessages(msgs)
        setLoading(false)
        setFirestoreError(null)
      },
      (err) => {
        console.error('Firestore error:', err)
        setFirestoreError(err.code)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    try {
      await addDoc(collection(db, 'messages'), {
        type: 'text',
        text: trimmed,
        userName,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Send error:', err)
      setText(trimmed)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }, [text, userName, sending])

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
      alert('Chỉ hỗ trợ file ảnh!')
      return
    }
    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Ảnh không được vượt quá 10MB!')
      return
    }

    setUploading(true)
    setUploadProgress('Đang tải ảnh...')
    try {
      const imageUrl = await uploadImage(file)
      setUploadProgress('Đang gửi...')
      await addDoc(collection(db, 'messages'), {
        type: 'image',
        imageUrl,
        text: '',
        userName,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Upload error:', err)
      alert('Gửi ảnh thất bại. Kiểm tra lại Cloudinary config!')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const avatarColor = getAvatarColor(userName)
  const isBusy = sending || uploading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="logo-icon">💬</div>
          <span>Phòng chung</span>
        </div>
        <div className="topbar-right">
          <div className="online-count">
            <span className="online-dot" />
            <span>Live</span>
          </div>
          <div className="user-badge" onClick={onChangeName} title="Đổi tên">
            <div className="avatar" style={{ background: avatarColor }}>
              {getInitials(userName)}
            </div>
            <span>{userName}</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="messages-wrap">
        {loading && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div className="spinner" />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang kết nối Firestore...</span>
          </div>
        )}

        {!loading && firestoreError && (
          <div className="empty-state">
            <div className="emoji">⚠️</div>
            <h3>Không kết nối được Firestore</h3>
            <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
              Lỗi: <code>{firestoreError}</code>
            </p>
            <p style={{ marginTop: 8, lineHeight: 1.8 }}>
              Kiểm tra lại:<br />
              1. Đã tạo <b>Firestore Database</b> trong Firebase Console chưa?<br />
              2. Vào <b>Firestore → Rules</b> → đảm bảo <code>allow read, write: if true</code><br />
              3. Thử <b>reload lại trang</b>
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16, padding: '8px 20px', borderRadius: 10,
                background: 'var(--accent-gradient)', border: 'none',
                color: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit'
              }}
            >
              🔄 Thử lại
            </button>
          </div>
        )}

        {!loading && !firestoreError && messages.length === 0 && (
          <div className="empty-state">
            <div className="emoji">🎉</div>
            <h3>Phòng chat đang chờ bạn!</h3>
            <p>Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện.</p>
          </div>
        )}

        {!loading && messages.map((msg, i) => {
          const prev = messages[i - 1]
          const isMe = msg.userName === userName
          const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt)
          const showMeta = !prev || prev.userName !== msg.userName || showDate

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="date-sep">
                  <span>{formatDate(msg.createdAt)}</span>
                </div>
              )}
              <Message msg={msg} isMe={isMe} showMeta={showMeta} />
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      {/* Upload progress toast */}
      {uploadProgress && (
        <div className="upload-toast">
          <div className="upload-spinner" />
          <span>{uploadProgress}</span>
        </div>
      )}

      {/* Input bar */}
      <footer className="input-bar">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />

        {/* Image button */}
        <button
          className="img-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          title="Gửi ảnh"
          aria-label="Gửi ảnh"
        >
          🖼️
        </button>

        <textarea
          ref={textareaRef}
          className="input-field"
          placeholder="Nhập tin nhắn... (Enter để gửi)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          maxLength={1000}
          disabled={isBusy}
          autoFocus
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!text.trim() || isBusy}
          aria-label="Gửi tin nhắn"
        >
          ➤
        </button>
      </footer>
    </div>
  )
}
