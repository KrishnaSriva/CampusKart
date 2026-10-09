import React, { useState, useEffect, useContext, useRef } from 'react';
import api, { SOCKET_URL } from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { 
  Search, MoreHorizontal, Send, Paperclip, Smile, Bell, Mail, Mic, X
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Chat = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [socket, setSocket] = useState(null);
  
  const [chats, setChats] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  
  // States for Attachment and Mic
  const [attachment, setAttachment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [chatsRes, notifRes] = await Promise.all([
          api.get('/messages/chats'),
          api.get('/messages/notifications')
        ]);
        setChats(chatsRes.data.data);
        setNotifications(notifRes.data.data);
        const queryParams = new URLSearchParams(location.search);
        const chatIdFromUrl = queryParams.get('id');
        if (chatIdFromUrl) {
          const found = chatsRes.data.data.find(c => c._id === chatIdFromUrl);
          if (found) setSelectedChat(found);
        }
      } catch (err) { console.error(err); }
    };
    fetchData();
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    newSocket.emit('user_online', user._id);
    return () => newSocket.disconnect();
  }, [user, location.search]);

  useEffect(() => {
    if (!selectedChat || !socket) return;
    const fetchHistory = async () => {
      try {
        const { data } = await api.get(`/messages/${selectedChat._id}/messages`);
        setMessages(data.data);
      } catch (err) { console.error(err); }
    };
    fetchHistory();
    socket.emit('join_room', { roomId: selectedChat._id, userId: user._id, type: 'chat' });
    
    // Check if other user is online
    const otherUser = selectedChat.participants.find(p => p._id !== user._id);
    if (otherUser) {
      socket.emit('check_online', { userId: otherUser._id });
    }

    socket.on('user_status_change', (data) => {
      if (otherUser && data.userId === otherUser._id) {
        setIsOtherUserOnline(data.status === 'online');
      }
    });

    socket.on('receive_message', (newMsg) => {
      const msgChatId = newMsg.chat?._id || newMsg.chat;
      if (msgChatId === selectedChat._id) { setMessages((prev) => [...prev, newMsg]); }
      else { api.get('/messages/notifications').then(res => setNotifications(res.data.data)); }
      setChats(prev => prev.map(c => c._id === msgChatId ? { ...c, lastMessage: newMsg.content || 'Sent an attachment', updatedAt: new Date().toISOString() } : c).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    });
    return () => {
      socket.off('receive_message');
      socket.off('user_status_change');
    };
  }, [selectedChat, socket]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachment && !isRecording) return;

    let attachmentUrl = '';
    let isImage = false;

    // Handle File Attachment via ImageKit
    if (attachment) {
      const formData = new FormData();
      formData.append('file', attachment);
      try {
        const { data } = await api.post('/messages/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        attachmentUrl = data.url;
        isImage = attachment.type.startsWith('image/');
      } catch (err) {
        alert('File upload failed');
        return;
      }
    }

    socket.emit('send_message', {
      chatId: selectedChat._id,
      senderId: user._id,
      text: inputText,
      attachmentUrl,
      isImage,
      isAudio: false // Future enhancement for Mic
    });

    setInputText('');
    setAttachment(null);
  };

  // Mic Toggle Placeholder — Recording in browser usually requires 'MediaRecorder' API
  const toggleMic = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      alert("Mic activated! (Recording requires MediaRecorder API — implement recording logic next)");
    }
  };

  if (!user) return <div className="text-center mt-20 text-slate-900 font-bold">Please Login.</div>;

  return (
    <div className="flex h-[92vh] w-full bg-[#f8f9fe] font-sans text-slate-800 overflow-hidden">
      
      {/* 1. Nav Sidebar */}
      <div className="w-20 bg-white border-r border-slate-100 flex flex-col items-center py-8 gap-10 select-none">
        <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-100 uppercase font-black text-xl cursor-default">
          {user.name?.[0] || 'U'}
        </div>
        <div className="flex flex-col items-center gap-8 text-slate-300">
           <Mail size={24} className="cursor-pointer text-teal-600" />
           <div className="relative">
             <Bell size={24} className="cursor-pointer hover:text-teal-600 transition" />
             {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">{notifications.length}</span>}
           </div>
        </div>
      </div>

      {/* 2. Chats List */}
      <div className="w-[320px] bg-white border-r border-slate-100 flex flex-col">
        <div className="p-6 pb-2">
          <h2 className="text-2xl font-black text-slate-900 mb-6">Messages</h2>
          <div className="relative group mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition" size={16} />
            <input type="text" placeholder="Search..." className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-teal-100 outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
          {chats.map((chat) => {
            const otherUser = chat.participants.find(p => p._id !== user._id);
            const isSelected = selectedChat?._id === chat._id;
            return (
              <div key={chat._id} onClick={() => setSelectedChat(chat)} className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all ${isSelected ? 'bg-slate-900 text-white shadow-xl px-5' : 'hover:bg-slate-50 text-slate-700'}`}>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 flex-shrink-0 uppercase font-bold">{otherUser?.name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-bold text-sm truncate">{otherUser?.name}</h4>
                  </div>
                  <p className={`text-[11px] truncate opacity-60 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{chat.lastMessage || 'Sent an attachment'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Main Chat View */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border-2 border-white shadow-sm flex items-center justify-center font-bold text-teal-600 uppercase">{selectedChat.participants.find(p => p._id !== user._id)?.name?.[0]}</div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedChat.participants.find(p => p._id !== user._id)?.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isOtherUserOnline ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isOtherUserOnline ? 'text-green-500' : 'text-slate-400'}`}>
                      {isOtherUserOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <MoreHorizontal size={20} className="text-slate-300 cursor-pointer" />
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-[#fafbfd] custom-scrollbar">
              {messages.map((msg, idx) => {
                const isMe = msg.sender?._id === user._id || msg.sender === user._id;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-fade-in`}>
                     <div className={`text-[12px] p-4 rounded-3xl max-w-[65%] leading-relaxed font-medium transition-all ${isMe ? 'bg-gradient-to-tr from-teal-700 to-teal-500 text-white rounded-tr-sm shadow-lg shadow-teal-100' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                       
                       {/* Render text content */}
                       {msg.content && <p className="mb-2">{msg.content}</p>}

                       {/* Render media content */}
                       {msg.attachmentUrl && (
                         <div className="rounded-xl overflow-hidden mt-2 border border-black/5">
                           {msg.isImage ? (
                             <img src={msg.attachmentUrl} className="max-w-full h-auto cursor-pointer" onClick={() => window.open(msg.attachmentUrl, '_blank')} />
                           ) : (
                             <a href={msg.attachmentUrl} target="_blank" className="bg-black/10 p-2 rounded-lg flex items-center gap-2 text-[10px] font-bold">
                               <Paperclip size={14} /> View File
                             </a>
                           )}
                         </div>
                       )}

                       <div className={`text-[8px] mt-1 font-black uppercase opacity-40 ${isMe ? 'text-right' : 'text-left'}`}>
                         {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </div>
                     </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar with Profile Attachments and Mic */}
            <div className="p-10 pt-4 bg-[#fafbfd]">
               {attachment && (
                 <div className="mb-4 bg-teal-50 border border-teal-100 p-2 rounded-2xl flex items-center gap-3 animate-fade-in">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-teal-600 shadow-sm overflow-hidden">
                       {attachment.type.startsWith('image/') ? <img src={URL.createObjectURL(attachment)} className="w-full h-full object-cover" /> : <Paperclip size={18} />}
                    </div>
                    <span className="text-xs font-bold text-teal-900 truncate flex-1">{attachment.name}</span>
                    <button onClick={() => setAttachment(null)} className="p-1 hover:text-rose-500"><X size={16} /></button>
                 </div>
               )}

               <div className="bg-white p-2.5 rounded-[2rem] flex items-center gap-2 shadow-sm border border-slate-100">
                  <button onClick={() => fileInputRef.current.click()} className="p-3 text-slate-300 hover:text-teal-600 transition"><Paperclip size={20} /></button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setAttachment(e.target.files[0])} />
                  
                  <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                    <input value={inputText} onChange={e => setInputText(e.target.value)} type="text" placeholder="Type a message here.." className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 outline-none placeholder:text-slate-300 px-2" />
                    
                    <button type="button" onClick={toggleMic} className={`p-3 transition ${isRecording ? 'text-rose-500 animate-pulse' : 'text-slate-300 hover:text-teal-600'}`}>
                      <Mic size={20} />
                    </button>

                    <button type="submit" disabled={!inputText.trim() && !attachment} className="bg-teal-600 text-white p-3.5 rounded-full hover:bg-teal-700 shadow-lg shadow-teal-100 disabled:opacity-50 transition-all">
                      <Send size={18} fill="currentColor" />
                    </button>
                  </form>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 bg-[#fafbfd] text-center">
             <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center text-teal-200 mb-6"><Mail size={40} /></div>
             <h3 className="text-xl font-black text-slate-900 mb-1">Select a conversation</h3>
             <p className="text-slate-400 text-sm">Pick a seller to start business</p>
          </div>
        )}
      </div>

      {/* 4. Notifications Bar */}
      <div className="w-[300px] bg-white border-l border-slate-100 p-8 flex flex-col gap-10">
        <h3 className="text-lg font-black text-slate-900 mb-6">Recent Activity</h3>
        <div className="space-y-6">
           {notifications.map((n, i) => (
             <div key={i} className="flex gap-4 cursor-pointer" onClick={() => setSelectedChat({_id: n.chat})}>
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-xs uppercase shadow-inner border border-white">{n.sender?.name?.[0]}</div>
                <div className="min-w-0">
                   <p className="text-[11px] leading-tight text-slate-600"><span className="font-bold text-slate-900">@{n.sender?.name}</span> sent a message about <span className="font-bold text-slate-900">{n.product?.title}</span></p>
                   <span className="text-[8px] text-slate-300 font-black uppercase mt-1 block">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Chat;
