import { useState } from 'react'
import { getAvatarColor, getInitials, formatTime } from '../utils'

export default function Message({ msg, isMe, showMeta, onRecall }) {
  const [hovered, setHovered] = useState(false)
  const color = getAvatarColor(msg.userName)
  const isRecalled = msg.recalled === true

  return (
    <div
      className={`msg-group ${isMe ? 'me' : 'other'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showMeta && (
        <div className="msg-meta">
          <div
            className="avatar"
            style={{ background: color, width: 22, height: 22, fontSize: 9, borderRadius: 8 }}
          >
            {getInitials(msg.userName)}
          </div>
          <span className="msg-name">{isMe ? 'Bạn' : msg.userName}</span>
          <span className="msg-time">{formatTime(msg.createdAt)}</span>
        </div>
      )}

      {/* Bubble wrapper — position relative để đặt nút X tuyệt đối */}
      <div style={{ position: 'relative', maxWidth: 'min(480px, 72%)' }}>
        {/* Nút thu hồi — absolute góc trên bên trái/phải */}
        {isMe && !isRecalled && hovered && (
          <button
            className="recall-btn"
            onClick={() => onRecall(msg.id)}
            title="Thu hồi tin nhắn"
          >
            ✕
          </button>
        )}

        {isRecalled ? (
          <div className="msg-bubble msg-bubble-recalled">
            🚫 Tin nhắn đã bị thu hồi
          </div>
        ) : msg.type === 'image' ? (
          <div className="msg-bubble msg-bubble-image">
            <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
              <img src={msg.imageUrl} alt="Hình ảnh" className="msg-image" loading="lazy" />
            </a>
          </div>
        ) : (
          <div className="msg-bubble">{msg.text}</div>
        )}
      </div>
    </div>
  )
}
