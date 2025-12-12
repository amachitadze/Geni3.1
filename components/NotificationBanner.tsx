
import React, { useState, useEffect } from 'react';
import { getStoredSupabaseConfig, getSupabaseClient } from '../utils/supabaseClient';
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

const NotificationBanner: React.FC<NotificationBannerProps> = ({ language }) => {
    const t = translations[language];
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [lastSeenIds, setLastSeenIds] = useState<number[]>([]);
    const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

    // Load last seen IDs from local storage on mount
    useEffect(() => {
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
            alert("თქვენს ბრაუზერს არ აქვს შეტყობინებების მხარდაჭერა.");
            return;
        }
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            // Test notification
            sendSystemNotification("შეტყობინებები ჩართულია", "ახლა თქვენ მიიღებთ სიახლეებს.");
        }
    };

    const sendSystemNotification = (title: string, body: string) => {
        if (Notification.permission === 'granted') {
            // Try to use Service Worker for better mobile support
            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: 'https://i.postimg.cc/XNfDXTjn/Geni-Icon.png',
                        vibrate: [200, 100, 200],
                        tag: 'geni-notification'
                    } as any);
                });
            } else {
                // Fallback to basic Notification API
                new Notification(title, {
                    body: body,
                    icon: 'https://i.postimg.cc/XNfDXTjn/Geni-Icon.png'
                });
            }
        }
    };

    const checkForNotifications = async () => {
        const config = getStoredSupabaseConfig();
        if (!config.url || !config.key) return;

        try {
            const supabase = getSupabaseClient(config.url, config.key);
            
            const { data, error } = await supabase
                .storage
                .from('shares')
                .download(`${NOTIFICATION_FILE_PATH}?t=${Date.now()}`);

            if (error) return;

            if (data) {
                const text = await data.text();
                let json: NotificationData | NotificationData[] = JSON.parse(text);
                
                const now = new Date();
                let activeList: NotificationData[] = [];

                if (Array.isArray(json)) {
                    activeList = json
                        .filter(n => new Date(n.expiresAt) > now)
                        .sort((a, b) => b.id - a.id);
                } else {
                    if (new Date(json.expiresAt) > now) {
                        activeList = [json];
                    }
                }

                if (activeList.length > 0) {
                    setNotifications(activeList);
                    
                    const newIds = activeList.map(n => n.id);
                    // Find genuinely new notifications that user hasn't closed/seen
                    const latestNotification = activeList[0];
                    const isNew = !lastSeenIds.includes(latestNotification.id);
                    
                    if (isNew) {
                        setIsVisible(true);
                        setLastSeenIds(prev => {
                            const updated = Array.from(new Set([...prev, latestNotification.id]));
                            return updated.slice(-50); // Keep only last 50 IDs to prevent storage bloat
                        });
                        
                        // Trigger System Notification
                        if (document.hidden || !document.hasFocus()) {
                            const title = latestNotification.isPoll ? t.banner_new_poll : t.banner_new_msg;
                            sendSystemNotification(title, latestNotification.text);
                        }
                    }
                } else {
                    setIsVisible(false);
                }
            }
        } catch (err) {
            console.error("Error polling notifications:", err);
        }
    };

    useEffect(() => {
        checkForNotifications(); 
        const interval = setInterval(checkForNotifications, 5 * 60 * 1000); // 5 Minutes
        return () => clearInterval(interval);
    }, []);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % notifications.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + notifications.length) % notifications.length);
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    // Render "Enable Notifications" button if permitted is default (not asked yet) or denied, 
    // but only show it discreetly or if there are actual notifications but permission is missing.
    
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
