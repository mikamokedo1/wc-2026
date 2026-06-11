import { getAvatarColor, getInitials, formatTime } from '../utils'

export default function Message({ msg, isMe, showMeta }) {
  const color = getAvatarColor(msg.userName)

  return (
    <div className={`msg-group ${isMe ? 'me' : 'other'}`}>
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

      {msg.type === 'image' ? (
        <div className={`msg-bubble msg-bubble-image ${isMe ? 'me' : 'other'}`}>
          <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={msg.imageUrl}
              alt="Hình ảnh"
              className="msg-image"
              loading="lazy"
            />
          </a>
        </div>
      ) : (
        <div className="msg-bubble">{msg.text}</div>
      )}
    </div>
  )
}
