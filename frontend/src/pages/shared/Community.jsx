import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import '../../components/community/community.css';

const EDIT_WINDOW_MS = 15 * 60 * 1000; // WhatsApp-style: editable for 15 minutes after sending
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function canStillEdit(createdAt) {
  return Date.now() - new Date(createdAt).getTime() <= EDIT_WINDOW_MS;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function uploadCommunityImage(file) {
  const body = new FormData();
  body.append('image', file);
  const { data } = await api.post('/community/upload-image', body);
  return data.url;
}

export default function Community() {
  const { user } = useAuth();
  const [tab, setTab] = useState('feed');

  if (user?.is_active === false) {
    return (
      <div className="community-page">
        <div className="dash-feature-locked">
          <strong>Community unavailable</strong>
          Your account isn't active yet. If you just signed up, an admin needs to approve your account first —
          otherwise please contact the gym front desk.
        </div>
      </div>
    );
  }

  return (
    <div className="community-page">
      <div className="community-tabs">
        <button className={tab === 'feed' ? 'active' : ''} onClick={() => setTab('feed')}>Feed</button>
        <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>Gym chat</button>
      </div>

      {tab === 'feed' ? <Feed user={user} /> : <Chat user={user} />}
    </div>
  );
}

// --- Shared reaction bar, used by both feed posts and chat messages ------

function formatReactors(reaction, userId) {
  const ids = reaction.userIds || [];
  const names = reaction.userNames || [];
  const labeled = names.map((name, i) => (ids[i] === userId ? 'You' : name));
  if (labeled.length === 0) return '';
  if (labeled.length <= 3) return labeled.join(', ');
  return `${labeled.slice(0, 2).join(', ')} and ${labeled.length - 2} others`;
}

function ReactionBar({ reactions, userId, onReact }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const list = reactions || [];

  return (
    <div className="community-reaction-bar">
      {list.map((r) => {
        const mine = (r.userIds || []).includes(userId);
        return (
          <button
            key={r.emoji}
            type="button"
            className={`community-reaction-chip ${mine ? 'mine' : ''}`}
            onClick={() => onReact(r.emoji)}
          >
            <span>{r.emoji}</span>
            <span className="community-reaction-count">{r.count}</span>
            <span className="community-reaction-tooltip">
              {formatReactors(r, userId)} reacted with {r.emoji}
            </span>
          </button>
        );
      })}

      <div className="community-reaction-picker-wrap">
        <button
          type="button"
          className="community-react-btn"
          onClick={() => setPickerOpen((v) => !v)}
          title="Add a reaction"
        >
          😊+
        </button>
        {pickerOpen && (
          <div className="community-reaction-picker">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setPickerOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const canPostNotice = user?.role === 'admin' || user?.role === 'receptionist';

  async function loadFeed() {
    try {
      const { data } = await api.get('/community/feed');
      setPosts(data);
    } catch (err) {
      setError('Could not load the feed. Try refreshing.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();
  }, []);

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('That image is larger than 5MB — please choose a smaller one.');
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview('');
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;
    setPosting(true);
    setError('');
    try {
      let imageUrl;
      if (imageFile) {
        imageUrl = await uploadCommunityImage(imageFile);
      }
      await api.post('/community/posts', {
        content: content.trim() || (imageUrl ? '📷 Shared a photo' : ''),
        type,
        imageUrl,
      });
      setContent('');
      setType('general');
      clearImage();
      await loadFeed();
    } catch (err) {
      setError('Could not share your post. Please try again.');
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(postId) {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/community/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setError('Could not delete that post.');
    }
  }

  async function handleEdit(postId, newContent) {
    const { data } = await api.put(`/community/posts/${postId}`, { content: newContent });
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...data } : p)));
  }

  async function handleReact(postId, emoji) {
    const { data: reactions } = await api.post(`/community/posts/${postId}/react`, { emoji });
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reactions } : p)));
  }

  return (
    <div className="community-feed">
      <form className="community-composer" onSubmit={handlePost}>
        <textarea
          placeholder={`Share something with the gym, ${user?.name?.split(' ')[0] || 'friend'}…`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />

        {imagePreview && (
          <div className="community-image-preview">
            <img src={imagePreview} alt="" />
            <button type="button" onClick={clearImage}>Remove</button>
          </div>
        )}

        <div className="community-composer-row">
          <label className="community-photo-btn">
            📷 Photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImagePick} hidden />
          </label>

          <label className="community-share-toggle">
            <input
              type="checkbox"
              checked={type === 'progress'}
              onChange={(e) => setType(e.target.checked ? 'progress' : 'general')}
              disabled={type === 'notice'}
            />
            Share as a progress update
          </label>

          {canPostNotice && (
            <label className="community-share-toggle">
              <input
                type="checkbox"
                checked={type === 'notice'}
                onChange={(e) => setType(e.target.checked ? 'notice' : 'general')}
              />
              Post as a staff notice 📌
            </label>
          )}

          <button type="submit" disabled={posting || (!content.trim() && !imageFile)}>
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {error && <p className="community-error">{error}</p>}

      {loading ? (
        <div className="community-empty"><LoadingSpinner label="Loading feed…" /></div>
      ) : posts.length === 0 ? (
        <p className="community-empty">No posts yet — be the first to share something!</p>
      ) : (
        <ul className="community-post-list">
          {posts.map((p) => (
            <Post key={p.id} post={p} user={user} onDelete={handleDelete} onEdit={handleEdit} onReact={handleReact} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Post({ post, user, onDelete, onEdit, onReact }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [count, setCount] = useState(post.comment_count || 0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const isAuthor = user?.id === post.user_id;
  const canDelete = isAuthor || user?.role === 'admin';
  const canEdit = isAuthor && canStillEdit(post.created_at);

  async function loadComments() {
    try {
      const { data } = await api.get(`/community/posts/${post.id}/comments`);
      setComments(data);
      setLoaded(true);
    } catch (err) {
      // ignore — comments are non-critical
    }
  }

  function toggle() {
    const next = !showComments;
    setShowComments(next);
    if (next && !loaded) loadComments();
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/community/posts/${post.id}/comments`, { content: text.trim() });
      setText('');
      await loadComments();
      setCount((c) => c + 1);
    } catch (err) {
      // ignore — could add inline error state if needed
    } finally {
      setSending(false);
    }
  }

  function startEdit() {
    setEditText(post.content);
    setEditError('');
    setEditing(true);
  }

  async function saveEdit() {
    if (!editText.trim()) return;
    setEditSaving(true);
    setEditError('');
    try {
      await onEdit(post.id, editText.trim());
      setEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Could not save your edit.');
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <li className={`community-post ${post.type}`}>
      <div className="community-post-avatar">
        <span>{initials(post.user_name)}</span>
      </div>
      <div className="community-post-body">
        <div className="community-post-head">
          <span className="community-post-name">{post.user_name}</span>
          {post.type === 'birthday' && <span className="community-post-badge birthday">🎂 Birthday</span>}
          {post.type === 'progress' && <span className="community-post-badge progress">💪 Progress</span>}
          {post.type === 'notice' && <span className="community-post-badge notice">📌 Notice</span>}
          <span className="community-post-time">
            {timeAgo(post.created_at)}
            {post.edited_at && <span className="community-edited-tag"> · edited</span>}
          </span>
          {canEdit && !editing && (
            <button type="button" className="community-edit-btn" onClick={startEdit} title="Edit post">
              ✎
            </button>
          )}
          {canDelete && (
            <button type="button" className="community-delete-btn" onClick={() => onDelete(post.id)} title="Delete post">
              🗑
            </button>
          )}
        </div>

        {editing ? (
          <div className="community-edit-box">
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
            {editError && <p className="community-error">{editError}</p>}
            <div className="community-edit-actions">
              <button type="button" onClick={saveEdit} disabled={editSaving || !editText.trim()}>
                {editSaving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <p className="community-post-content">{post.content}</p>
        )}

        {post.image_url && <img className="community-post-image" src={post.image_url} alt="" />}

        <ReactionBar reactions={post.reactions} userId={user?.id} onReact={(emoji) => onReact(post.id, emoji)} />

        <button type="button" className="community-comment-toggle" onClick={toggle}>
          💬 {count > 0 ? `${count} comment${count === 1 ? '' : 's'}` : 'Comment'}
        </button>

        {showComments && (
          <div className="community-comments">
            {comments.map((c) => (
              <div key={c.id} className="community-comment">
                <span className="community-comment-name">{c.user_name}</span>
                <span>{c.content}</span>
                <span className="community-comment-time">{timeAgo(c.created_at)}</span>
              </div>
            ))}
            <form className="community-comment-form" onSubmit={handleComment}>
              <input
                type="text"
                placeholder="Write a comment…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button type="submit" disabled={sending || !text.trim()}>Send</button>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}

function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  async function loadMessages() {
    try {
      const { data } = await api.get('/community/messages');
      setMessages(data);
    } catch (err) {
      setError('Could not load the chat.');
    }
  }

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('That image is larger than 5MB — please choose a smaller one.');
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview('');
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() && !imageFile) return;
    const draft = text.trim();
    setSending(true);
    setError('');
    try {
      let imageUrl;
      if (imageFile) {
        imageUrl = await uploadCommunityImage(imageFile);
      }
      await api.post('/community/messages', { content: draft || undefined, imageUrl });
      setText('');
      clearImage();
      await loadMessages();
    } catch (err) {
      setError('Message failed to send.');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/community/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      setError('Could not delete that message.');
    }
  }

  function startEdit(message) {
    setEditingId(message.id);
    setEditText(message.content || '');
    setError('');
  }

  async function saveEdit(messageId) {
    if (!editText.trim()) return;
    try {
      const { data } = await api.put(`/community/messages/${messageId}`, { content: editText.trim() });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...data } : m)));
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your edit.');
    }
  }

  async function handleReact(messageId, emoji) {
    const { data: reactions } = await api.post(`/community/messages/${messageId}/react`, { emoji });
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
  }

  return (
    <div className="community-chat">
      <div className="community-chat-window">
        {messages.map((m) => {
          const isAuthor = user?.id === m.user_id;
          const canDelete = isAuthor || user?.role === 'admin';
          const canEdit = isAuthor && canStillEdit(m.created_at);
          const isEditing = editingId === m.id;
          return (
            <div key={m.id} className={`community-chat-msg ${m.user_id === user?.id ? 'own' : ''}`}>
              <span className="community-chat-author">{m.user_name}</span>

              {isEditing ? (
                <div className="community-edit-box">
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} />
                  <div className="community-edit-actions">
                    <button type="button" onClick={() => saveEdit(m.id)} disabled={!editText.trim()}>Save</button>
                    <button type="button" className="ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {m.content && <p>{m.content}</p>}
                  {m.image_url && <img className="community-chat-image" src={m.image_url} alt="" />}
                </>
              )}

              <ReactionBar reactions={m.reactions} userId={user?.id} onReact={(emoji) => handleReact(m.id, emoji)} />

              <span className="community-chat-time">
                {timeAgo(m.created_at)}
                {m.edited_at && <span className="community-edited-tag"> · edited</span>}
              </span>

              {!isEditing && canEdit && (
                <button type="button" className="community-chat-edit" onClick={() => startEdit(m)} title="Edit message">
                  ✎
                </button>
              )}
              {!isEditing && canDelete && (
                <button type="button" className="community-chat-delete" onClick={() => handleDelete(m.id)} title="Delete message">
                  🗑
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="community-error">{error}</p>}

      {imagePreview && (
        <div className="community-image-preview chat">
          <img src={imagePreview} alt="" />
          <button type="button" onClick={clearImage}>Remove</button>
        </div>
      )}

      <form className="community-chat-form" onSubmit={handleSend}>
        <label className="community-photo-btn chat">
          📷
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImagePick} hidden />
        </label>
        <input
          type="text"
          placeholder="Say something to the gym…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={sending || (!text.trim() && !imageFile)}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
