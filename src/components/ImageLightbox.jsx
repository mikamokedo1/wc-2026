import { useEffect } from 'react'

export default function ImageLightbox({ url, onClose }) {
  // Đóng bằng phím Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Đóng">✕</button>
      <img
        className="lightbox-img"
        src={url}
        alt="Ảnh phóng to"
        onClick={(e) => e.stopPropagation()} // click ảnh không đóng
      />
    </div>
  )
}
