import { useState, useRef, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  startAfter,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { uploadImage } from "../cloudinary";
import { usePresence } from "../hooks/usePresence";
import { useTyping, useTypingUsers } from "../hooks/useTyping";
import Message from "./Message";
import EmojiPicker from "./EmojiPicker";
import { isSameDay, formatDate, getAvatarColor, getInitials } from "../utils";

const PAGE_SIZE = 30;

// Web Audio API notification ping
function playNotification() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (_) {}
}

export default function ChatRoom({ userName }) {
  const [messages, setMessages] = useState([]);
  const [olderMessages, setOlderMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showOnline, setShowOnline] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyToRaw] = useState(null);
  const replyToRef = useRef(null); // luôn có giá trị mới nhất, tránh stale closure

  // Helper: cập nhật cả state lẫn ref
  const setReplyTo = useCallback((val) => {
    replyToRef.current = val;
    setReplyToRaw(val);
  }, []);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [firestoreError, setFirestoreError] = useState(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const msgsWrapRef = useRef(null);
  const dragCounter = useRef(0);
  const oldestDocRef = useRef(null);
  const isFirstLoad = useRef(true);
  const prevMsgCount = useRef(0);

  const onlineUsers = usePresence(userName);
  const { setTyping, clearTyping } = useTyping(userName);
  const typingUsers = useTypingUsers(userName);

  const avatarColor = getAvatarColor(userName);

  // ── Real-time listener (latest PAGE_SIZE messages) ──────────────────
  useEffect(() => {
    setLoading(true);
    setFirestoreError(null);

    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();

        // Play notification for new incoming messages
        if (!isFirstLoad.current && msgs.length > prevMsgCount.current) {
          const newest = msgs[msgs.length - 1];
          if (newest?.userName !== userName) playNotification();
        }
        prevMsgCount.current = msgs.length;

        setMessages(msgs);
        if (snap.docs.length > 0) {
          oldestDocRef.current = snap.docs[snap.docs.length - 1];
          setHasMore(snap.docs.length === PAGE_SIZE);
        }
        setLoading(false);
        setFirestoreError(null);
      },
      (err) => {
        console.error("Firestore error:", err);
        setFirestoreError(err.code);
        setLoading(false);
      },
    );
    return unsub;
  }, [userName]);

  // ── Load older messages ──────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!oldestDocRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "messages"),
        orderBy("createdAt", "desc"),
        startAfter(oldestDocRef.current),
        limit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMore(false);
        return;
      }
      const older = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
      setOlderMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !ids.has(m.id)), ...prev];
      });
      oldestDocRef.current = snap.docs[snap.docs.length - 1];
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore]);

  // ── Auto-scroll (only for new real-time messages) ────────────────────
  useEffect(() => {
    const wrap = msgsWrapRef.current;
    if (isFirstLoad.current) {
      // Chờ đến khi load xong mới scroll (loading=false và đã có tin nhắn)
      if (!loading) {
        isFirstLoad.current = false;
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
      }
      return;
    }
    if (wrap) {
      const distFromBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight;
      if (distFromBottom < 180) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, loading]);

  const handleScroll = () => {
    const wrap = msgsWrapRef.current;
    if (!wrap) return;
    const distFromBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight;
    setShowScrollBtn(distFromBottom > 220);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
  };

  // ── Send message ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const capturedReply = replyToRef.current; // đọc từ ref → luôn mới nhất
    setText("");
    clearTyping();
    setReplyTo(null);
    try {
      // Lọc undefined để Firestore không báo lỗi
      const replyPayload = capturedReply
        ? {
            replyTo: Object.fromEntries(Object.entries(capturedReply).filter(([, v]) => v !== undefined)),
          }
        : {};
      await addDoc(collection(db, "messages"), {
        type: "text",
        text: trimmed,
        userName,
        createdAt: serverTimestamp(),
        ...replyPayload,
      });
    } catch (err) {
      console.error("Send error:", err);
      setText(trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [text, userName, sending, clearTyping, setReplyTo]);

  // ── Image upload ─────────────────────────────────────────────────────
  const processImageFile = async (file) => {
    setUploading(true);
    setUploadProgress("Đang tải ảnh...");
    const capturedReply = replyTo;
    try {
      const imageUrl = await uploadImage(file);
      setUploadProgress("Đang gửi...");
      await addDoc(collection(db, "messages"), {
        type: "image",
        imageUrl,
        text: "",
        userName,
        createdAt: serverTimestamp(),
        ...(capturedReply ? { replyTo: capturedReply } : {}),
      });
      setReplyTo(null);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Gửi ảnh thất bại. Kiểm tra lại Cloudinary config!");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Chỉ hỗ trợ file ảnh!");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Ảnh không được vượt quá 10MB!");
      return;
    }
    await processImageFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Recall ───────────────────────────────────────────────────────────
  const handleRecall = useCallback(async (msgId) => {
    if (!window.confirm("Thu hồi tin nhắn này?")) return;
    try {
      await updateDoc(doc(db, "messages", msgId), { recalled: true });
    } catch (err) {
      console.error("Recall error:", err);
    }
  }, []);

  // ── Input handlers ───────────────────────────────────────────────────
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (e.target.value) setTyping();
    else clearTyping();
  };

  // ── Paste image from clipboard ────────────────────────────────────────
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await processImageFile(file);
        return;
      }
    }
  };

  // ── Emoji picker ─────────────────────────────────────────────────────
  const handleEmojiSelect = (emoji) => {
    const ta = textareaRef.current;
    if (!ta) {
      setText((t) => t + emoji);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
      ta.focus();
    }, 0);
    setShowEmojiPicker(false);
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────
  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Chỉ hỗ trợ file ảnh!");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Ảnh không được vượt quá 10MB!");
      return;
    }
    await processImageFile(file);
  };

  const isBusy = sending || uploading;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", position: "relative" }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <div className="drag-overlay-icon">🖼️</div>
            <p>Thả ảnh vào đây để gửi</p>
          </div>
        </div>
      )}

      {/* ── Topbar ── */}
      <header className="topbar">
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}
        >
          <div className="topbar-brand">
            <div className="logo-icon">⚽</div>
            <span>90% con bạc dừng lại trước khi thắng lớn</span>
          </div>
          <div className="topbar-right">
            <button
              className={`online-count ${showOnline ? "active" : ""}`}
              onClick={() => setShowOnline((v) => !v)}
              title="Xem ai đang online"
            >
              <span className="online-dot" />
              <span>{onlineUsers.length} online</span>
            </button>
            <div className="user-badge">
              <div className="avatar" style={{ background: avatarColor }}>
                {getInitials(userName)}
              </div>
              <span>{userName}</span>
            </div>
          </div>

          {showOnline && (
            <>
              <div className="online-backdrop" onClick={() => setShowOnline(false)} />
              <div className="online-panel">
                <div className="online-panel-title">
                  <span className="online-dot" style={{ width: 8, height: 8 }} />
                  {onlineUsers.length} người đang online
                </div>
                <div className="online-panel-list">
                  {onlineUsers.map((u) => (
                    <div key={u.userName} className="online-user-item">
                      <div
                        className="avatar"
                        style={{
                          background: getAvatarColor(u.userName),
                          width: 30,
                          height: 30,
                          fontSize: 12,
                          borderRadius: 10,
                        }}
                      >
                        {getInitials(u.userName)}
                      </div>
                      <span className="online-user-name">
                        {u.userName}
                        {u.userName === userName ? " (bạn)" : ""}
                      </span>
                      <span className="online-user-dot" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <main
        className="messages-wrap"
        ref={msgsWrapRef}
        onScroll={handleScroll}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <div className="container" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {loading && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <div className="spinner" />
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Đang kết nối Firestore...</span>
            </div>
          )}

          {!loading && firestoreError && (
            <div className="empty-state">
              <div className="emoji">⚠️</div>
              <h3>Không kết nối được Firestore</h3>
              <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
                Lỗi: <code>{firestoreError}</code>
              </p>
              <p style={{ marginTop: 8, lineHeight: 1.8 }}>
                1. Đã tạo <b>Firestore Database</b> chưa?
                <br />
                2. Rules: <code>allow read, write: if true</code>
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginTop: 16,
                  padding: "8px 20px",
                  borderRadius: 10,
                  background: "var(--accent-gradient)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                🔄 Thử lại
              </button>
            </div>
          )}

          {!loading && !firestoreError && messages.length === 0 && olderMessages.length === 0 && (
            <div className="empty-state">
              <div className="emoji">🎉</div>
              <h3>Phòng chat đang chờ bạn!</h3>
              <p>Hãy gửi tin nhắn đầu tiên.</p>
            </div>
          )}

          {/* Load more */}
          {!loading && hasMore && (
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
              <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <span className="upload-spinner" style={{ width: 12, height: 12 }} /> Đang tải...
                  </>
                ) : (
                  "⬆ Tải tin nhắn cũ hơn"
                )}
              </button>
            </div>
          )}

          {/* Message list */}
          {!loading &&
            (() => {
              const allMsgs = [...olderMessages, ...messages];
              return allMsgs.map((msg, i) => {
                const prev = allMsgs[i - 1];
                const isMe = msg.userName === userName;
                const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt);
                const showMeta = !prev || prev.userName !== msg.userName || showDate;
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="date-sep">
                        <span>{formatDate(msg.createdAt)}</span>
                      </div>
                    )}
                    <Message msg={msg} isMe={isMe} showMeta={showMeta} onRecall={handleRecall} onReply={setReplyTo} />
                  </div>
                );
              });
            })()}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Scroll to bottom button ── */}
      {showScrollBtn && (
        <button className="scroll-btn" onClick={scrollToBottom} title="Xuống cuối">
          ↓
        </button>
      )}

      {/* ── Typing indicator ── */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
          <span className="typing-text">
            {typingUsers.length === 1
              ? `${typingUsers[0]} đang nhập...`
              : `${typingUsers.slice(0, 2).join(", ")} đang nhập...`}
          </span>
        </div>
      )}

      {/* ── Upload toast ── */}
      {uploadProgress && (
        <div className="upload-toast">
          <div className="upload-spinner" />
          <span>{uploadProgress}</span>
        </div>
      )}

      {/* ── Reply preview ── */}
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-preview-bar" />
          <div className="reply-preview-content">
            <span className="reply-preview-name">{replyTo.userName}</span>
            <span className="reply-preview-text">{replyTo.type === "image" ? "🖼️ Hình ảnh" : replyTo.text}</span>
          </div>
          <button className="reply-preview-close" onClick={() => setReplyTo(null)}>
            ✕
          </button>
        </div>
      )}

      {/* ── Emoji picker ── */}
      {showEmojiPicker && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}

      {/* ── Input bar ── */}
      <footer className="input-bar">
        <div className="container" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageSelect}
          />

          <button
            className="img-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            title="Gửi ảnh"
            aria-label="Gửi ảnh"
          >
            🖼️
          </button>

          <button
            className={`emoji-toggle-btn ${showEmojiPicker ? "active" : ""}`}
            onClick={() => setShowEmojiPicker((v) => !v)}
            disabled={isBusy}
            title="Emoji"
            aria-label="Chọn emoji"
          >
            😊
          </button>

          <textarea
            ref={textareaRef}
            className="input-field"
            placeholder="Nhập tin nhắn... (Enter để gửi, Ctrl+V để dán ảnh)"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKey}
            onPaste={handlePaste}
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
        </div>
      </footer>
    </div>
  );
}
