
import React, { useState, useEffect, useRef } from 'react';
import { getStoredSupabaseConfig } from '../utils/supabaseClient';
import { CloseIcon, MessageIcon, PollIcon, ArrowRightIcon, BackIcon, BellIcon } from './Icons';
import { translations, Language } from '../utils/translations';

interface NotificationData {
    id: number;
    text: string;
    link?: string;
    isPoll?: boolean;
    createdAt: string;
    expiresAt: string;
}

interface NotificationBannerProps {
    language: Language;
}

const NOTIFICATION_FILE_PATH = 'notifications/notifications.json';

// --- WEB WORKER CODE (Inline String) ---
// This runs in a separate thread, unaffected by UI freezing or background tab throttling.
const workerCode = `
self.onmessage = (e) => {
    const { config, filePath } = e.data;
    if (!config || !config.url || !config.key) return;

    const check = async () => {
        try {
            // Direct fetch to bypass Supabase JS client overhead in worker
            const response = await fetch(\`\${config.url}/storage/v1/object/public/shares/\${filePath}?t=\${Date.now()}\`, {
                headers: { 'Authorization': \`Bearer \${config.key}\` }
            });
            
            if (response.ok) {
                const data = await response.json();
                self.postMessage({ type: 'DATA', payload: data });
            }
        } catch (err) {
            // Silent fail in worker
        }
    };

    check(); // Initial check
    setInterval(check, 30000); // Check every 30 seconds
};
`;

const NotificationBanner: React.FC<NotificationBannerProps> = ({ language }) => {
    const t = translations[language];
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [lastSeenIds, setLastSeenIds] = useState<number[]>([]);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
        
        const storedSeen = localStorage.getItem('seenNotificationIds');
        if (storedSeen) {
            try {
                setLastSeenIds(JSON.parse(storedSeen));
            } catch (e) { console.error(e); }
        }
    }, []);

    // Save seen IDs when updated
    useEffect(() => {
        localStorage.setItem('seenNotificationIds', JSON.stringify(lastSeenIds));
    }, [lastSeenIds]);

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            alert("This browser does not support desktop notification");
            return;
        }
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            new Notification("შეტყობინებები ჩაირთო", {
                body: "ახლა თქვენ მიიღებთ სიახლეებს მაშინაც კი, თუ სხვა ტაბზე ხართ.",
                icon: 'https://i.postimg.cc/XNfDXTjn/Geni-Icon.png'
            });
        }
    };

    const sendSystemNotification = (title: string, body: string) => {
        if (Notification.permission === 'granted') {
            // Standard Notification API
            const notif = new Notification(title, {
                body: body,
                icon: 'https://i.postimg.cc/XNfDXTjn/Geni-Icon.png',
                tag: 'geni-notification', // Replace existing to avoid spam
                requireInteraction: true // Keeps it visible until user clicks
            });
            
            notif.onclick = function() {
                window.focus();
                this.close();
            };
        }
    };

    // --- WORKER SETUP ---
    useEffect(() => {
        const config = getStoredSupabaseConfig();
        if (!config.url || !config.key) return;

        // Create Worker from Blob
        const blob = new Blob([workerCode], { type: "application/javascript" });
        workerRef.current = new Worker(URL.createObjectURL(blob));

        // Start Worker
        workerRef.current.postMessage({ 
            config, 
            filePath: NOTIFICATION_FILE_PATH 
        });

        // Listen to Worker
        workerRef.current.onmessage = (e) => {
            if (e.data.type === 'DATA') {
                handleNewData(e.data.payload);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const handleNewData = (json: any) => {
        const now = new Date();
        let activeList: NotificationData[] = [];

        if (Array.isArray(json)) {
            activeList = json
                .filter(n => new Date(n.expiresAt) > now)
                .sort((a, b) => b.id - a.id);
        } else if (json && json.expiresAt) {
            if (new Date(json.expiresAt) > now) {
                activeList = [json];
            }
        }

        if (activeList.length > 0) {
            setNotifications(activeList);
            
            // Check for NEW notifications
            const latest = activeList[0];
            
            // Using functional state update to ensure we have the latest 'lastSeenIds'
            setLastSeenIds(prevIds => {
                if (!prevIds.includes(latest.id)) {
                    // It's new!
                    setIsVisible(true);
                    
                    // Show System Notification if tab is hidden/inactive
                    if (document.hidden || !document.hasFocus()) {
                        const title = latest.isPoll ? t.banner_new_poll : t.banner_new_msg;
                        sendSystemNotification(title, latest.text);
                    }

                    const updated = Array.from(new Set([...prevIds, latest.id]));
                    return updated.slice(-50);
                }
                return prevIds;
            });
        } else {
            // No active notifications
            if (activeList.length === 0 && isVisible) {
                setIsVisible(false);
            }
        }
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % notifications.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + notifications.length) % notifications.length);
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    if (notifications.length === 0 || !isVisible) return null;

    const safeIndex = currentIndex >= notifications.length ? 0 : currentIndex;
    const currentNotif = notifications[safeIndex];
    const isPoll = currentNotif.isPoll;

    return (
        <div className="fixed z-50 animate-fade-in-up 
                        bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 
                        sm:bottom-8 w-auto sm:max-w-lg">
            
            {/* Main Banner */}
            <div className={`rounded-xl shadow-2xl border p-4 flex flex-col gap-3 ring-1 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 transition-colors
                             ${isPoll 
                                ? 'bg-blue-50 dark:bg-gray-800 border-blue-500/30 ring-blue-500/20' 
                                : 'bg-white dark:bg-gray-800 border-purple-500/30 ring-purple-500/20'}`}>
                
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full flex-shrink-0 ${isPoll ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400'}`}>
                        {isPoll ? <PollIcon className="w-6 h-6" /> : <MessageIcon className="w-6 h-6" />}
                    </div>

                    <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center justify-between">
                            <span>{isPoll ? t.banner_poll : t.banner_msg}</span>
                            {notifications.length > 1 && (
                                <span className="text-xs font-normal text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                    {safeIndex + 1} / {notifications.length}
                                </span>
                            )}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 leading-relaxed break-words">
                            {currentNotif.text}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                            {currentNotif.link && (
                                <a 
                                    href={currentNotif.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-lg transition-colors
                                                ${isPoll 
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                                    : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                                >
                                    {isPoll ? t.btn_vote : t.btn_view}
                                    <ArrowRightIcon className="w-4 h-4" />
                                </a>
                            )}
                            
                            {/* Permission Button inside the card if needed */}
                            {permission === 'default' && (
                                <button 
                                    onClick={requestNotificationPermission}
                                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-lg transition-colors border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                                >
                                    <BellIcon className="w-4 h-4" />
                                    Enable Push
                                </button>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={handleClose} 
                        className="p-1 -mt-1 -mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        aria-label={t.close}
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {notifications.length > 1 && (
                    <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                        <button 
                            onClick={handlePrev}
                            className="p-1 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1 text-xs"
                        >
                            <BackIcon className="w-4 h-4" /> {t.prev}
                        </button>
                        <button 
                            onClick={handleNext}
                            className="p-1 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1 text-xs"
                        >
                            {t.next} <div className="transform rotate-180"><BackIcon className="w-4 h-4" /></div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationBanner;
