// src/app/chat/page.jsx
"use client";

import SimpleBar from "simplebar-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import { Icon } from '@iconify/react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import apiConfig from "@/configs/apiConfig";

const Card = ({ children, className, bodyClass }) => {
  return (
    <div className={`rounded-md shadow-md ${className}`}>
      <div className={bodyClass}>{children}</div>
    </div>
  );
};

const Button = ({ text, icon: IconComponent, className, onClick, type = "button", disabled }) => {
  return (
    <button
      type={type}
      className={`flex items-center justify-center p-2 rounded-md transition-colors duration-200 ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {IconComponent && typeof IconComponent === 'object' ? IconComponent : (IconComponent && <Icon icon={IconComponent} />)}
      {text}
    </button>
  );
};

const Fileinput = ({ name, multiple, selectedFiles, onChange, disabled, preview, className, placeholder }) => {
  return (
    <input
      type="file"
      name={name}
      multiple={multiple}
      onChange={onChange}
      disabled={disabled}
      className={`block w-full text-sm text-slate-500
      file:mr-4 file:py-2 file:px-4
      file:rounded-full file:border-0
      file:text-sm file:font-semibold
      file:bg-violet-50 file:text-violet-700
      hover:file:bg-violet-100 ${className}`}
      placeholder={placeholder}
    />
  );
};

const API_BASE_URL = 'https://api.jsonbin.io/v3/b';
const JSONBIN_HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': apiConfig.jsonbin.masterKey,
  'X-Bin-Meta': false,
};

const fetchBinData = async (binId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${binId}`, { headers: JSONBIN_HEADERS });
    return response.data.record;
  } catch (error) {
    console.error(`Error fetching data from bin ${binId}:`, error);
    throw error;
  }
};

const updateBinData = async (binId, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${binId}`, data, { headers: JSONBIN_HEADERS });
    return response.data.record;
  } catch (error) {
    console.error(`Error updating data in bin ${binId}:`, error);
    throw error;
  }
};

const useChatData = () => {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { groupBinId, usersBinId, messagesBinId } = apiConfig.jsonbin;

  const DEFAULT_GUEST_PROFILE = {
    id: '',
    username: 'Guest',
    avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    status: 'online',
    lastActive: new Date().toISOString(),
  };

  const initializeUserData = useCallback(async () => {
    let storedUserId = localStorage.getItem('chatAppUserId');
    let allUsers = [];

    try {
      allUsers = await fetchBinData(usersBinId);
      if (!Array.isArray(allUsers)) {
        allUsers = [];
      }
    } catch (err) {
      console.error("Failed to fetch users, initializing empty array:", err);
      allUsers = [];
    }

    if (storedUserId) {
      const existingUser = allUsers.find(user => user.id === storedUserId);
      if (existingUser) {
        setCurrentUser(existingUser);
        return;
      }
    }

    const newUserId = uuidv4();
    const guestNumber = allUsers.filter(u => u.username.startsWith('Guest')).length + 1;
    const newGuestUser = {
      ...DEFAULT_GUEST_PROFILE,
      id: newUserId,
      username: `Guest_${guestNumber}`,
    };

    allUsers.push(newGuestUser);
    try {
      await updateBinData(usersBinId, allUsers);
      localStorage.setItem('chatAppUserId', newUserId);
      setCurrentUser(newGuestUser);
    } catch (err) {
      console.error("Failed to create new guest user:", err);
      setError("Failed to create guest profile. Please try again.");
    }
  }, [usersBinId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedGroups, fetchedUsers, fetchedMessages] = await Promise.all([
        fetchBinData(groupBinId),
        fetchBinData(usersBinId),
        fetchBinData(messagesBinId),
      ]);

      setGroups(Array.isArray(fetchedGroups) ? fetchedGroups : []);
      setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
      setMessages(Array.isArray(fetchedMessages) ? fetchedMessages : []);
    } catch (err) {
      console.error("Failed to fetch chat data:", err);
      setError("Gagal memuat data chat. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  }, [groupBinId, usersBinId, messagesBinId]);

  useEffect(() => {
    initializeUserData();
    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [initializeUserData, fetchData]);

  const addMessage = useCallback(async (groupId, content) => {
    if (!currentUser) {
      toast.error("Tidak bisa mengirim pesan: Pengguna belum masuk.");
      return;
    }
    const newMessage = {
      id: uuidv4(),
      groupId,
      userId: currentUser.id,
      username: currentUser.username,
      avatarUrl: currentUser.avatarUrl,
      content,
      timestamp: new Date().toISOString(),
      edited: false,
      replyTo: null,
      likes: [],
      dislikes: [],
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    try {
      await updateBinData(messagesBinId, updatedMessages);
    } catch (err) {
      console.error("Failed to add message:", err);
      setMessages(messages);
      toast.error("Gagal mengirim pesan.");
    }
  }, [messages, currentUser, messagesBinId]);

  const replyToMessage = useCallback(async (groupId, content, replyToMessageId) => {
    if (!currentUser) {
      toast.error("Tidak bisa membalas: Pengguna belum masuk.");
      return;
    }
    const newMessage = {
      id: uuidv4(),
      groupId,
      userId: currentUser.id,
      username: currentUser.username,
      avatarUrl: currentUser.avatarUrl,
      content,
      timestamp: new Date().toISOString(),
      edited: false,
      replyTo: replyToMessageId,
      likes: [],
      dislikes: [],
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    try {
      await updateBinData(messagesBinId, updatedMessages);
    } catch (err) {
      console.error("Failed to reply to message:", err);
      setMessages(messages);
      toast.error("Gagal membalas pesan.");
    }
  }, [messages, currentUser, messagesBinId]);

  const updateMessage = useCallback(async (messageId, newContent) => {
    if (!currentUser) {
      toast.error("Tidak bisa mengedit pesan: Pengguna belum masuk.");
      return;
    }
    const originalMessages = [...messages];
    const updatedMessages = messages.map(msg =>
      msg.id === messageId && msg.userId === currentUser.id
        ? { ...msg, content: newContent, edited: true, timestamp: new Date().toISOString() }
        : msg
    );

    if (JSON.stringify(originalMessages) === JSON.stringify(updatedMessages)) {
      toast.warn("Anda hanya dapat mengedit pesan Anda sendiri atau tidak ada perubahan.");
      return;
    }

    setMessages(updatedMessages);
    try {
      await updateBinData(messagesBinId, updatedMessages);
      toast.success("Pesan berhasil diedit!");
    } catch (err) {
      console.error("Failed to update message:", err);
      setMessages(originalMessages);
      toast.error("Gagal mengedit pesan.");
    }
  }, [messages, currentUser, messagesBinId]);

  const deleteMessage = useCallback(async (messageId) => {
    if (!currentUser) {
      toast.error("Tidak bisa menghapus pesan: Pengguna belum masuk.");
      return;
    }
    const originalMessages = [...messages];
    const messageToDelete = messages.find(msg => msg.id === messageId);

    if (!messageToDelete || messageToDelete.userId !== currentUser.id) {
      toast.warn("Anda hanya dapat menghapus pesan Anda sendiri.");
      return;
    }

    const updatedMessages = messages.filter(msg => msg.id !== messageId);
    setMessages(updatedMessages);
    try {
      await updateBinData(messagesBinId, updatedMessages);
      toast.success("Pesan berhasil dihapus!");
    } catch (err) {
      console.error("Failed to delete message:", err);
      setMessages(originalMessages);
      toast.error("Gagal menghapus pesan.");
    }
  }, [messages, currentUser, messagesBinId]);

  const toggleMessageReaction = useCallback(async (messageId, type) => {
    if (!currentUser) {
      toast.error("Tidak bisa bereaksi: Pengguna belum masuk.");
      return;
    }
    const userId = currentUser.id;
    const originalMessages = [...messages];

    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        let newLikes = [...msg.likes];
        let newDislikes = [...msg.dislikes];

        if (type === 'like') {
          if (newLikes.includes(userId)) {
            newLikes = newLikes.filter(id => id !== userId);
          } else {
            newLikes.push(userId);
            newDislikes = newDislikes.filter(id => id !== userId);
          }
        } else if (type === 'dislike') {
          if (newDislikes.includes(userId)) {
            newDislikes = newDislikes.filter(id => id !== userId);
          } else {
            newDislikes.push(userId);
            newLikes = newLikes.filter(id => id !== userId);
          }
        }
        return { ...msg, likes: newLikes, dislikes: newDislikes };
      }
      return msg;
    });

    setMessages(updatedMessages);
    try {
      await updateBinData(messagesBinId, updatedMessages);
    } catch (err) {
      console.error("Failed to update message reaction:", err);
      setMessages(originalMessages);
      toast.error("Gagal memberikan reaksi pada pesan.");
    }
  }, [messages, currentUser, messagesBinId]);

  const updateYouTubeVideo = useCallback(async (groupId, videoId) => {
    if (!currentUser) {
      toast.error("Tidak bisa mengontrol YouTube: Pengguna belum masuk.");
      return;
    }
    const originalGroups = [...groups];

    const updatedGroups = groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          currentYouTubeVideo: {
            videoId,
            lastUpdatedBy: currentUser.id,
            lastUpdatedTime: new Date().toISOString(),
          },
        };
      }
      return group;
    });
    setGroups(updatedGroups);
    try {
      await updateBinData(groupBinId, updatedGroups);
    } catch (err) {
      console.error("Failed to update YouTube video state:", err);
      setGroups(originalGroups);
      toast.error("Gagal sinkronisasi video YouTube.");
    }
  }, [groups, currentUser, groupBinId]);

  const updateUserProfile = useCallback(async (updatedProfile) => {
    if (!currentUser) {
      toast.error("Tidak bisa memperbarui profil: Pengguna belum masuk.");
      return;
    }
    const originalUsers = [...users];

    const updatedUsers = users.map(user =>
      user.id === currentUser.id ? { ...user, ...updatedProfile } : user
    );
    setUsers(updatedUsers);
    setCurrentUser(prev => ({ ...prev, ...updatedProfile }));
    try {
      await updateBinData(usersBinId, updatedUsers);
      toast.success("Profil berhasil diperbarui!");
    } catch (err) {
      console.error("Failed to update user profile:", err);
      setUsers(originalUsers);
      toast.error("Gagal memperbarui profil.");
    }
  }, [users, currentUser, usersBinId]);

  return {
    groups,
    users,
    messages,
    currentUser,
    loading,
    error,
    addMessage,
    replyToMessage,
    updateMessage,
    deleteMessage,
    toggleMessageReaction,
    updateYouTubeVideo,
    updateUserProfile,
    fetchData,
  };
};

const UserProfileModal = ({ isOpen, onClose, user, onSaveProfile }) => {
  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setAvatarUrl(user.avatarUrl);
      setNewAvatarFile(null);
    }
  }, [user, isOpen]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setNewAvatarFile(files[0]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result);
      };
      reader.readAsDataURL(files[0]);
    } else {
      setNewAvatarFile(null);
      setAvatarUrl(user?.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let finalAvatarUrl = avatarUrl;

    try {
      await onSaveProfile({
        username,
        avatarUrl: finalAvatarUrl,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Gagal memperbarui profil. " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card
        className="w-full max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
        bodyClass="p-0"
      >
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md mr-2">
              <Icon icon="ph:user-bold" className="text-xl sm:text-2xl" />
            </div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
              Edit Profil
            </h2>
          </div>
          <Button
            icon="ph:x-bold"
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={onClose}
            type="button"
          />
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Pengguna</label>
            <input
              type="text"
              className="w-full bg-slate-100 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm p-2.5"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avatar</label>
            <div className="flex items-center space-x-3 mb-2">
              <img
                src={avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                alt="Avatar Preview"
                className="w-20 h-20 rounded-full object-cover border border-slate-300 dark:border-slate-600"
              />
              <Fileinput
                name="avatarUpload"
                selectedFiles={newAvatarFile ? [newAvatarFile] : []}
                onChange={handleFileChange}
                disabled={loading}
                className="flex-1"
                placeholder="Pilih gambar baru..."
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Untuk saat ini, gambar avatar akan ditampilkan langsung dari URL atau sebagai Base64.
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700/60 flex justify-end space-x-2">
          <Button
            text="Batal"
            className="text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
            onClick={onClose}
            disabled={loading}
            type="button"
          />
          <Button
            text={loading ? "Menyimpan..." : "Simpan Perubahan"}
            className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold"
            onClick={handleSave}
            disabled={loading}
            type="button"
          />
        </div>
      </Card>
    </div>
  );
};

const YouTubePlayerComponent = ({ currentYouTubeVideo, updateYouTubeVideo, groupId }) => {
  const [inputVideoUrl, setInputVideoUrl] = useState("");

  const extractVideoId = (url) => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/g;
    const match = youtubeRegex.exec(url);
    return match ? match[1] : null;
  };

  const handleLoadVideo = () => {
    const videoId = extractVideoId(inputVideoUrl);
    if (videoId) {
      updateYouTubeVideo(groupId, videoId);
      toast.success("Video YouTube diubah!");
    } else {
      toast.error("URL YouTube tidak valid.");
    }
  };

  const embedUrl = currentYouTubeVideo?.videoId
    ? `https://www.youtube.com/embed/${currentYouTubeVideo.videoId}?autoplay=0&controls=1`
    : '';

  return (
    <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-inner">
      <h3 className="text-md font-semibold text-teal-700 dark:text-teal-300 mb-3 flex items-center">
        <Icon icon="ph:youtube-logo-bold" className="mr-2 text-xl" />
        YouTube Bersama
      </h3>
      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-slate-900 mb-3">
        {embedUrl ? (
          <iframe
            width="100%"
            height="100%"
            src={embedUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute top-0 left-0"
          ></iframe>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">
            <Icon icon="ph:play-circle-bold" className="text-4xl mb-2" />
            <p>Tidak ada video yang sedang diputar.</p>
            <p>Masukkan URL YouTube di bawah untuk memulai.</p>
          </div>
        )}
      </div>

      <div className="flex space-x-2 mt-3">
        <input
          type="text"
          className="flex-1 bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm p-2"
          placeholder="Masukkan URL YouTube..."
          value={inputVideoUrl}
          onChange={(e) => setInputVideoUrl(e.target.value)}
        />
        <Button
          text={<Icon icon="ph:paper-plane-tilt-bold" className="text-lg" />}
          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold p-2.5 rounded-md"
          onClick={handleLoadVideo}
          disabled={!inputVideoUrl}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
        Semua anggota grup dapat mengubah video YouTube.
      </p>
    </div>
  );
};

const MessageInput = ({ onSendMessage, currentReplyToMessage, onClearReply }) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
      onClearReply();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-3 p-4 border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 relative">
      {currentReplyToMessage && (
        <div className="absolute -top-10 left-0 right-0 mx-4 p-2 bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200 text-xs rounded-t-lg flex items-center justify-between shadow-sm">
          Membalas: <span className="font-semibold truncate max-w-[80%]">{currentReplyToMessage.content}</span>
          <Button
            icon="ph:x-bold"
            className="text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/50 rounded-full w-5 h-5 flex items-center justify-center"
            onClick={onClearReply}
            type="button"
          />
        </div>
      )}
      <textarea
        className="flex-1 bg-slate-100 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm p-2.5 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
        placeholder="Ketik pesan Anda..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={1}
      />
      <Button
        type="submit"
        text={<Icon icon="ph:paper-plane-tilt-bold" className="text-lg" />}
        className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold p-2.5 rounded-md flex-shrink-0"
        disabled={!message.trim()}
      />
    </form>
  );
};

const MessageCard = ({
  message,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  currentUser,
  repliedMessage
}) => {
  const isCurrentUser = currentUser && message.userId === currentUser.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const handleEditSave = () => {
    if (editedContent.trim() && editedContent !== message.content) {
      onEdit(message.id, editedContent);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };

  const hasLiked = currentUser && message.likes.includes(currentUser.id);
  const hasDisliked = currentUser && message.dislikes.includes(currentUser.id);

  return (
    <div className={`flex items-start p-3 rounded-lg shadow-sm mb-3 transition-all duration-200
      ${isCurrentUser
        ? 'bg-teal-100 dark:bg-teal-700/30 ml-auto flex-row-reverse space-x-reverse'
        : 'bg-slate-100 dark:bg-slate-800/30 mr-auto'
      }
    `}>
      <img
        src={message.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
        alt={message.username}
        className={`w-9 h-9 rounded-full object-cover flex-shrink-0 ${isCurrentUser ? 'ml-3' : 'mr-3'}`}
      />
      <div className={`flex-1 min-w-0 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`font-semibold text-sm ${isCurrentUser ? 'text-teal-700 dark:text-teal-300' : 'text-slate-800 dark:text-slate-200'}`}>
            {isCurrentUser ? "Anda" : message.username}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {message.edited && <span className="ml-1">(diedit)</span>}
          </span>
        </div>

        {repliedMessage && (
          <div className={`p-2 rounded-md border text-xs italic mb-2 ${
            isCurrentUser
              ? 'bg-teal-200/50 dark:bg-teal-800/50 border-teal-300 dark:border-teal-600/50'
              : 'bg-slate-200/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600/50'
          }`}>
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
              Membalas {repliedMessage.userId === currentUser?.id ? "Anda" : repliedMessage.username}:
            </p>
            <p className="text-slate-600 dark:text-slate-400 truncate">{repliedMessage.content}</p>
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-col space-y-2">
            <textarea
              className="w-full bg-white dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600/80 text-slate-900 dark:text-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm p-2 resize-none"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end space-x-2">
              <Button
                text="Batal"
                className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded"
                onClick={handleEditCancel}
              />
              <Button
                text="Simpan"
                className="text-xs px-2 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded"
                onClick={handleEditSave}
              />
            </div>
          </div>
        ) : (
          <p className="text-slate-700 dark:text-slate-100 break-words whitespace-pre-wrap">{message.content}</p>
        )}

        <div className={`flex items-center mt-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
          <div className="flex space-x-1 mr-3">
            <Button
              icon={`ph:thumbs-up-${hasLiked ? 'fill' : 'bold'}`}
              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={() => onToggleReaction(message.id, 'like')}
              type="button"
            />
            {message.likes.length > 0 && <span className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{message.likes.length}</span>}
          </div>
          <div className="flex space-x-1">
            <Button
              icon={`ph:thumbs-down-${hasDisliked ? 'fill' : 'bold'}`}
              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={() => onToggleReaction(message.id, 'dislike')}
              type="button"
            />
            {message.dislikes.length > 0 && <span className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{message.dislikes.length}</span>}
          </div>

          <div className={`flex space-x-1.5 ${isCurrentUser ? 'ml-auto' : 'ml-3'}`}>
            {!isEditing && (
              <>
                <Button
                  icon="ph:chat-circle-dots-bold"
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={() => onReply(message)}
                  type="button"
                />
                {isCurrentUser && (
                  <>
                    <Button
                      icon="ph:pencil-bold"
                      className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                      onClick={() => setIsEditing(true)}
                      type="button"
                    />
                    <Button
                      icon="ph:trash-bold"
                      className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800/30"
                      onClick={() => onDelete(message.id)}
                      type="button"
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatWindow = ({
  group,
  messages,
  users,
  currentUser,
  addMessage,
  replyToMessage,
  updateMessage,
  deleteMessage,
  toggleMessageReaction,
  updateYouTubeVideo,
}) => {
  const messagesEndRef = useRef(null);
  const [currentReplyTo, setCurrentReplyTo] = useState(null);

  const groupMessages = messages
    .filter(msg => msg.groupId === group.id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  const handleSendMessage = (content) => {
    if (currentReplyTo) {
      replyToMessage(group.id, content, currentReplyTo.id);
    } else {
      addMessage(group.id, content);
    }
    setCurrentReplyTo(null);
  };

  const handleReplyClick = (messageToReply) => {
    setCurrentReplyTo(messageToReply);
  };

  const getRepliedMessage = (messageId) => {
    return messages.find(msg => msg.id === messageId);
  };

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
        Pilih grup untuk memulai chat.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-800/50">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 flex items-center">
        <Icon icon="ph:chats-circle-bold" className="text-3xl text-teal-500 mr-3" />
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
          {group.name}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <SimpleBar className="h-full p-4">
          <div className="mb-6">
            <YouTubePlayerComponent
              currentYouTubeVideo={group.currentYouTubeVideo}
              updateYouTubeVideo={updateYouTubeVideo}
              groupId={group.id}
            />
          </div>

          <div className="space-y-4">
            {groupMessages.map((msg) => (
              <MessageCard
                key={msg.id}
                message={msg}
                onReply={handleReplyClick}
                onEdit={updateMessage}
                onDelete={deleteMessage}
                onToggleReaction={toggleMessageReaction}
                currentUser={currentUser}
                repliedMessage={msg.replyTo ? getRepliedMessage(msg.replyTo) : null}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </SimpleBar>
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        currentReplyToMessage={currentReplyTo}
        onClearReply={() => setCurrentReplyTo(null)}
      />
    </div>
  );
};

const GroupList = ({ groups, onSelectGroup, selectedGroupId, currentUser, onOpenProfileModal }) => {
  return (
    <div className="w-full sm:w-80 flex flex-col border-r border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/50 h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center">
          <Icon icon="ph:users-three-bold" className="text-2xl text-teal-500 mr-2" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Grup Chat</h2>
        </div>
        <Button
          icon="ph:user-circle-bold"
          className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
          onClick={onOpenProfileModal}
          type="button"
        />
      </div>
      <SimpleBar className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {groups.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada grup tersedia. Pastikan JSONBin.io Anda terisi dengan data grup.</p>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center transition-colors duration-200
                  ${selectedGroupId === group.id
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50'
                  }`}
              >
                <Icon icon="ph:hash-bold" className={`mr-2 text-xl ${selectedGroupId === group.id ? 'text-white' : 'text-teal-500'}`} />
                <span className="font-medium">{group.name}</span>
              </button>
            ))
          )}
        </div>
      </SimpleBar>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center">
          <img
            src={currentUser?.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
            alt="User Avatar"
            className="w-8 h-8 rounded-full object-cover mr-2"
          />
          <span>Masuk sebagai: <strong className="text-teal-600 dark:text-teal-300">{currentUser?.username}</strong></span>
        </div>
      </div>
    </div>
  );
};

const ChatGroupPage = () => {
  const {
    groups,
    users,
    messages,
    currentUser,
    loading,
    error,
    addMessage,
    replyToMessage,
    updateMessage,
    deleteMessage,
    toggleMessageReaction,
    updateYouTubeVideo,
    updateUserProfile,
    fetchData
  } = useChatData();

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const selectedGroup = groups.find(group => group.id === selectedGroupId);

  useEffect(() => {
    if (currentUser && selectedGroup && !selectedGroup.members.includes(currentUser.id)) {
      const updatedGroups = groups.map(group => {
        if (group.id === selectedGroup.id) {
          return { ...group, members: [...group.members, currentUser.id] };
        }
        return group;
      });
      updateBinData(apiConfig.jsonbin.groupBinId, updatedGroups)
        .then(() => {
          console.log("Current user added to group members.");
        })
        .catch(err => console.error("Failed to add current user to group members:", err));
    }
  }, [currentUser, selectedGroup, groups, apiConfig.jsonbin.groupBinId]);

  if (loading) {
    return (
      <div className="w-full px-2 sm:px-4 py-6 flex items-center justify-center h-screen">
        <Card className="w-full max-w-lg border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 p-6 flex flex-col items-center">
          <Icon icon="ph:spinner-gap-bold" className="text-5xl text-teal-500 animate-spin mb-4" />
          <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">Memuat data chat...</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Ini mungkin memakan waktu sebentar karena JSONBin.io.</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-2 sm:px-4 py-6 flex items-center justify-center h-screen">
        <Card className="w-full max-w-lg border border-red-500/50 dark:border-red-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 p-6 flex flex-col items-center">
          <Icon icon="ph:x-circle-bold" className="text-5xl text-red-500 mb-4" />
          <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">Error Memuat Data</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">{error}</p>
          <Button
            text="Coba Lagi"
            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold"
            onClick={fetchData}
          />
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="w-full px-2 sm:px-4 py-6 h-screen flex flex-col">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          theme="colored"
          toastClassName={(options) =>
            `relative flex p-1 min-h-10 rounded-md justify-between overflow-hidden cursor-pointer
            ${options?.type === 'success' ? 'bg-emerald-500 text-white' :
              options?.type === 'error' ? 'bg-red-500 text-white' :
              options?.type === 'warn' ? 'bg-yellow-500 text-white' :
              'bg-sky-500 text-white'} dark:text-slate-100 text-sm p-3 m-2 rounded-lg shadow-md`
          }
        />
        <Card
          bodyClass="relative p-0 h-full overflow-hidden flex"
          className="w-full border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 flex-1"
        >
          <GroupList
            groups={groups}
            onSelectGroup={setSelectedGroupId}
            selectedGroupId={selectedGroupId}
            currentUser={currentUser}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
          />
          <ChatWindow
            group={selectedGroup}
            messages={messages}
            users={users}
            currentUser={currentUser}
            addMessage={addMessage}
            replyToMessage={replyToMessage}
            updateMessage={updateMessage}
            deleteMessage={deleteMessage}
            toggleMessageReaction={toggleMessageReaction}
            updateYouTubeVideo={updateYouTubeVideo}
          />
        </Card>
      </div>
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={currentUser}
          onSaveProfile={updateUserProfile}
        />
      )}
    </>
  );
};

export default ChatGroupPage;