import { useRef, useEffect } from 'react'

const EMOJIS = [
  // Smileys
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘',
  '😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐',
  '😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','😤','😠','😡','🤬','😈',
  '😭','😱','😨','🤯','🥳','😎','🤓','😷','🤒','🥵','🥶','💀','☠️','💩','🤡',
  // Gestures & People
  '👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','👋','✋','🤚',
  '🖐️','🤝','🙏','💪','👏','🫶','🤲','✍️','🫁','🫀',
  // Hearts & Symbols
  '❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔','❣️','💕','💞','💓','💗',
  '💖','💘','💝','🔥','⚡','✨','🌟','💫','⭐','🌈','🎉','🎊','🏆','💯','🎯',
  '💰','💵','💸','💎','🪙','🤑',
  // Sports & Games
  '⚽','🏀','🏈','🎾','🎱','🎲','🃏','🎰','🎮','🕹️','🏆','🥇','🥈','🥉',
  // Food & Celebration
  '🍺','🍻','🥂','🍾','🎂','🎁','🎈','🎀','🎗️','🥳','🎆','🎇',
]

export default function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    // Delay để tránh đóng ngay khi vừa mở
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  return (
    <div className="emoji-picker" ref={ref}>
      <div className="emoji-grid">
        {EMOJIS.map((e, i) => (
          <button key={i} className="emoji-btn" onClick={() => onSelect(e)} tabIndex={-1}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
