import { useState, useRef, useEffect } from 'react'
import { getAvatarColor, getInitials } from '../utils'

export default function NamePopup({ onConfirm }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const previewColor = name.trim() ? getAvatarColor(name.trim()) : '#7c6af7'
  const previewInitials = name.trim() ? getInitials(name.trim()) : '?'

  return (
    <div className="overlay">
      <div className="popup-card">
        <div className="popup-icon">💬</div>
        <h1 className="popup-title">Chào mừng!</h1>
        <p className="popup-sub">
          Nhập tên của bạn để bắt đầu trò chuyện.<br />
          Mọi người trong phòng sẽ thấy tên này.
        </p>

        {/* Avatar preview */}
        {name.trim() && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <div
              className="avatar"
              style={{
                background: previewColor,
                width: 48,
                height: 48,
                fontSize: 16,
                borderRadius: 16,
                boxShadow: `0 4px 14px ${previewColor}55`,
              }}
            >
              {previewInitials}
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          className="popup-input"
          type="text"
          placeholder="Tên của bạn..."
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKey}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className="popup-btn"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          Vào phòng chat →
        </button>
      </div>
    </div>
  )
}
