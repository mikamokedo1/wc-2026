import { useState } from 'react'
import { getAvatarColor, getInitials, formatTime } from '../utils'
import ImageLightbox from './ImageLightbox'

export default function Message({ msg, isMe, showMeta, onRecall, onReply }) {
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const color = getAvatarColor(msg.userName)
  const isRecalled = msg.recalled === true

  const handleReply = () => {
    onReply({
      id: msg.id,
      userName: msg.userName,
      text: msg.text,
      type: msg.type,
      imageUrl: msg.imageUrl,
    })
  }

  return (
    <div className={`msg-group ${isMe ? 'me' : 'other'}`}>
      {showMeta && (
        <div className="msg-meta">
          <div className="avatar" style={{ background: color, width: 22, height: 22, fontSize: 9, borderRadius: 8 }}>
            {getInitials(msg.userName)}
          </div>
          <span className="msg-name">{isMe ? 'Bạn' : msg.userName}</span>
          <span className="msg-time">{formatTime(msg.createdAt)}</span>
        </div>
      )}

      <div className="msg-row">
        {/* Action bar — luôn render để không layout shift, CSS ẩn/hiện */}
        {!isRecalled && (
          <div className="msg-actions">
            <button className="msg-action-btn" onClick={handleReply} title="Trả lời">↩</button>
            {isMe && (
              <button className="msg-action-btn danger" onClick={() => onRecall(msg.id)} title="Thu hồi">🗑️</button>
            )}
          </div>
        )}

        {/* Bubble */}
        <div className="bubble-wrapper">
          {isRecalled ? (
            <div className="msg-bubble msg-bubble-recalled">🚫 Tin nhắn đã bị thu hồi</div>
          ) : msg.type === 'image' ? (
            <div className="msg-bubble msg-bubble-image">
              {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} />}
              <img
                src={msg.imageUrl}
                alt="Hình ảnh"
                className="msg-image"
                loading="lazy"
                onClick={() => setLightboxUrl(msg.imageUrl)}
              />
            </div>
          ) : (
            <div className="msg-bubble">
              {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} />}
              {msg.text}
            </div>
          )}
        </div>
      </div>

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  )
}

function ReplyQuote({ replyTo }) {
  return (
    <div className="reply-quote">
      <div className="reply-quote-bar" />
      <div className="reply-quote-content">
        <div className="reply-quote-name">{replyTo.userName}</div>
        <div className="reply-quote-text">
          {replyTo.type === 'image'
            ? '🖼️ Hình ảnh'
            : (replyTo.text?.slice(0, 80) ?? '') + (replyTo.text?.length > 80 ? '...' : '')}
        </div>
      </div>
    </div>
  )
}
