
import React, { useState, useEffect } from 'react';
import { CloseIcon, MessageIcon, PollIcon, ArrowRightIcon, BackIcon, BellIcon } from './Icons';
import { translations, Language } from '../utils/translations';
import { getStoredSupabaseConfig } from '../utils/supabaseClient';

export interface NotificationData {
    id: number;
    text: string;
    link?: string;
    isPoll?: boolean;
    createdAt: string;
    expiresAt: string;
}

interface NotificationBannerProps {
    language: Language;
    notification: NotificationData | null;
    onClose: () => void;
    onDataLoaded: (data: NotificationData[]) => void;
}

const NOTIFICATION_FILE_PATH = 'notifications/notifications.json';

// --- WEB WORKER CODE (Inline String) ---
const workerCode = `
self.onmessage = (e) => {
    const { config, filePath } = e.data;
    if (!config || !config.url || !config.key) return;

    const check = async () => {
        try {
            const response = await fetch(\`\${config.url}/storage/v1/object/public/shares/\${filePath}?t=\${Date.now()}\`, {
                headers: { 'Authorization': \`Bearer \${config.key}\` }
            });
            
            if (response.ok) {
                const data = await response.json();
                self.postMessage({ type: 'DATA', payload: data });
            }
        } catch (err) {
            // Silent fail
        }
    };

    check(); // Initial check
    setInterval(check, 30000); // Check every 30 seconds
};
`;

const NotificationBanner: React.FC<NotificationBannerProps> = ({ language, notification, onClose, onDataLoaded }) => {
    const t = translations[language];
    
    // Only keeping Worker logic here to bubble data up to parent
    useEffect(() => {
        // Safe access to environment or localStorage config
        const config = getStoredSupabaseConfig();
        if (!config.url || !config.key) return;

        const blob = new Blob([workerCode], { type: "application/javascript" });
        const worker = new Worker(URL.createObjectURL(blob));

        worker.postMessage({ 
            config, 
            filePath: NOTIFICATION_FILE_PATH 
        });

        worker.onmessage = (e) => {
            if (e.data.type === 'DATA') {
                onDataLoaded(e.data.payload);
            }
        };

        return () => worker.terminate();
    }, [onDataLoaded]);

    if (!notification) return null;

    const isPoll = notification.isPoll;

    return (
        <div className="fixed z-50 animate-fade-in-up 
                        bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 
                        sm:bottom-8 w-auto sm:max-w-lg">
            
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
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 leading-relaxed break-words">
                            {notification.text}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                            {notification.link && (
                                <a 
                                    href={notification.link} 
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
                        </div>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="p-1 -mt-1 -mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        aria-label={t.close}
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationBanner;
