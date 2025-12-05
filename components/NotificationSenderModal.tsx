import React, { useState, useEffect } from 'react';
import { CloseIcon, MessageIcon, CheckIcon, PollIcon, LockClosedIcon, DeleteIcon, BackIcon } from './Icons';
import { getStoredSupabaseConfig, getSupabaseClient, getAdminPassword } from '../utils/supabaseClient';
import { translations, Language } from '../utils/translations';

interface NotificationSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

interface NotificationItem {
    id: number;
    text: string;
    link?: string | null;
    isPoll?: boolean;
    createdAt: string;
    expiresAt: string;
}

const NotificationSenderModal: React.FC<NotificationSenderModalProps> = ({ isOpen, onClose, language }) => {
  const t = translations[language];
  // View State: 'send', 'auth', 'list'
  const [view, setView] = useState<'send' | 'auth' | 'list'>('send');
  
  // Send Form State
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [isPoll, setIsPoll] = useState(false);
  const [expiryDate, setExpiryDate] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Admin/List State
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [notificationHistory, setNotificationHistory] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (isOpen) {
        setView('send');
        setMessage('');
        setLink('');
        setIsPoll(false);
        setError('');
        setSuccess(false);
        setAdminPasswordInput('');
        
        // Default expiry: Tomorrow same time
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
        setExpiryDate(tomorrow.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const getSupabase = () => {
    const config = getStoredSupabaseConfig();
    if (!config.url || !config.key) {
        throw new Error("Supabase Keys missing.");
    }
    return getSupabaseClient(config.url, config.key);
  };

  const fetchNotifications = async (): Promise<NotificationItem[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .storage
        .from('shares')
        .download(`notifications.json?t=${Date.now()}`);
      
      if (error) return [];
      
      const text = await data.text();
      try {
          const json = JSON.parse(text);
          if (Array.isArray(json)) return json;
          if (json && typeof json === 'object') return [json];
          return [];
      } catch {
          return [];
      }
  };

  const saveNotifications = async (items: NotificationItem[]) => {
      const supabase = getSupabase();
      const blob = new Blob([JSON.stringify(items)], { type: 'application/json' });
      
      const { error: uploadError } = await supabase
        .storage
        .from('shares')
        .upload('notifications.json', blob, {
            contentType: 'application/json',
            upsert: true
        });
      
      if (uploadError) throw uploadError;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    setError('');

    try {
        const currentList = await fetchNotifications();

        const newItem: NotificationItem = {
            id: Date.now(),
            text: message,
            link: link.trim() || null,
            isPoll: isPoll,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(expiryDate).toISOString()
        };

        const updatedList = [...currentList, newItem].slice(-50);
        
        await saveNotifications(updatedList);

        setSuccess(true);
        setTimeout(() => {
            onClose();
        }, 2000);

    } catch (err: any) {
        console.error("Failed to send notification:", err);
        setError(err.message || "Failed to send.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
      e.preventDefault();
      const correct = getAdminPassword();
      if (!correct) {
          setError(t.fm_admin_pass + " missing configuration");
          return;
      }
      if (adminPasswordInput === correct) {
          setError('');
          setView('list');
          loadHistory();
      } else {
          setError('Incorrect password.');
      }
  };

  const loadHistory = async () => {
      setIsLoading(true);
      try {
          const list = await fetchNotifications();
          setNotificationHistory(list.sort((a, b) => b.id - a.id));
      } catch (err: any) {
          setError("Failed to load history.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleDeleteItem = async (id: number) => {
      if(!window.confirm(t.delete + "?")) return;
      
      setIsLoading(true);
      try {
          const newList = notificationHistory.filter(item => item.id !== id);
          await saveNotifications(newList.sort((a,b) => a.id - b.id)); 
          setNotificationHistory(newList.sort((a, b) => b.id - a.id)); 
      } catch (err: any) {
          alert("Delete failed: " + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const formatDate = (iso: string) => {
      return new Date(iso).toLocaleString(language === 'es' ? 'es-ES' : 'ka-GE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isExpired = (iso: string) => new Date(iso) < new Date();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <header className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <MessageIcon className="w-6 h-6 text-purple-600" />
            {view === 'send' ? t.msg_title_send : t.msg_title_manage}
          </h2>
          <div className="flex gap-2">
              {view === 'send' && (
                  <button onClick={() => setView('auth')} className="p-2 -mt-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <LockClosedIcon className="w-5 h-5" />
                  </button>
              )}
              {view !== 'send' && (
                  <button onClick={() => setView('send')} className="p-2 -mt-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <BackIcon className="w-5 h-5" />
                  </button>
              )}
              <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <CloseIcon className="w-6 h-6" />
              </button>
          </div>
        </header>

        {/* --- VIEW: SEND MESSAGE --- */}
        {view === 'send' && (
            success ? (
                <div className="flex flex-col items-center justify-center py-8 text-green-600 dark:text-green-400 animate-fade-in-up">
                    <CheckIcon className="w-12 h-12 mb-3" />
                    <p className="text-lg font-medium text-center">{t.msg_success}</p>
                </div>
            ) : (
                <form onSubmit={handleSend} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t.msg_desc}
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lbl_text}</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lbl_link}</label>
                        <input 
                            type="url" 
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                            placeholder="https://..."
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lbl_expiry}</label>
                        <input 
                            type="datetime-local" 
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                        <input 
                            type="checkbox" 
                            id="isPoll"
                            checked={isPoll}
                            onChange={(e) => setIsPoll(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="isPoll" className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2 cursor-pointer select-none">
                            <PollIcon className="w-4 h-4 text-purple-500" />
                            <div>
                                <span className="font-semibold block">{t.lbl_poll}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{t.lbl_poll_desc}</span>
                            </div>
                        </label>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={isLoading || !message.trim()}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 text-white rounded-md transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        {isLoading ? t.loading : t.btn_send}
                    </button>
                </form>
            )
        )}

        {/* --- VIEW: AUTH --- */}
        {view === 'auth' && (
            <form onSubmit={handleAdminAuth} className="space-y-4 py-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">{t.fm_admin_pass}</p>
                <div className="relative">
                    <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input 
                        type="password" 
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 outline-none dark:text-white"
                        autoFocus
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md">{t.fm_login}</button>
            </form>
        )}

        {/* --- VIEW: LIST --- */}
        {view === 'list' && (
            <div className="space-y-4">
                {isLoading ? (
                    <p className="text-center text-gray-500">{t.loading}</p>
                ) : notificationHistory.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">{t.msg_history_empty}</p>
                ) : (
                    <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                        {notificationHistory.map((item) => {
                            const expired = isExpired(item.expiresAt);
                            return (
                                <li key={item.id} className={`p-3 rounded-lg border flex justify-between items-start gap-3 ${expired ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70' : 'bg-white dark:bg-gray-700 border-purple-200 dark:border-purple-800'}`}>
                                    <div className="min-w-0 flex-grow">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            {item.isPoll && <PollIcon className="w-3 h-3 text-blue-500"/>}
                                            <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                                            {expired ? (
                                                 <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300">{t.status_expired}</span>
                                            ) : (
                                                 <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">{t.status_active}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium break-words">{item.text}</p>
                                        <p className="text-xs text-gray-500 mt-1">Exp: {formatDate(item.expiresAt)}</p>
                                        {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline truncate block max-w-xs mt-1">{item.link}</a>}
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded flex-shrink-0"
                                        title={t.delete}
                                    >
                                        <DeleteIcon className="w-4 h-4" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default NotificationSenderModal;