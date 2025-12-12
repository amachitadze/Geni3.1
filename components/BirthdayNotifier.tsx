
import React, { useState, useEffect, useRef } from 'react';
import { Person } from '../types';
import { BellIcon, CloseIcon, CakeIcon, MessageIcon, PollIcon, ArrowRightIcon, ChevronDownIcon } from './Icons';
import { NotificationData } from './NotificationBanner';
import { translations, Language } from '../utils/translations';

interface BirthdayNotifierProps {
  peopleWithBirthdays: Person[];
  notifications: NotificationData[];
  onNavigate: (personId: string) => void;
  onSelectMessage: (msg: NotificationData) => void;
  isOpen: boolean;
  onClose: () => void;
  isFloatingButtonVisible: boolean;
  language: Language;
}

const BirthdayNotifier: React.FC<BirthdayNotifierProps> = ({ 
    peopleWithBirthdays, 
    notifications,
    onNavigate, 
    onSelectMessage,
    isOpen, 
    onClose, 
    isFloatingButtonVisible,
    language 
}) => {
    const t = translations[language];
    const notifierRef = useRef<HTMLDivElement>(null);
    const [openSection, setOpenSection] = useState<'birthdays' | 'messages' | null>('birthdays');
    const [seenIds, setSeenIds] = useState<number[]>([]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && notifierRef.current && !notifierRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        const stored = localStorage.getItem('seenNotificationIds');
        if (stored) {
            try { setSeenIds(JSON.parse(stored)); } catch (e) {}
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Auto-select based on content priority
    useEffect(() => {
        if (isOpen) {
            if (peopleWithBirthdays.length === 0 && notifications.length > 0) {
                setOpenSection('messages');
            } else if (peopleWithBirthdays.length > 0) {
                setOpenSection('birthdays');
            }
        }
    }, [isOpen]);

    const getDay = (dateStr?: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return parts.length > 2 ? parts[2] : '';
    };

    const handleMessageClick = (msg: NotificationData) => {
        onSelectMessage(msg);
        if (!seenIds.includes(msg.id)) {
            const newSeen = [...seenIds, msg.id];
            setSeenIds(newSeen);
            localStorage.setItem('seenNotificationIds', JSON.stringify(newSeen));
        }
    };

    const toggleSection = (section: 'birthdays' | 'messages') => {
        setOpenSection(openSection === section ? null : section);
    };

    const unseenMessagesCount = notifications.filter(n => !seenIds.includes(n.id)).length;
    const totalCount = peopleWithBirthdays.length + unseenMessagesCount;

    if (totalCount === 0 && notifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-4 z-20 pointer-events-none" ref={notifierRef}>
            <div className="pointer-events-auto">
                {isOpen && (
                    <div className="absolute bottom-full mb-3 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up flex flex-col max-h-[500px]">
                        
                        {/* Header with Close */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{t.notification_center}</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <CloseIcon className="w-5 h-5"/>
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
                            
                            {/* BIRTHDAYS ACCORDION ITEM */}
                            <div className="border-b border-gray-100 dark:border-gray-700/50">
                                <button 
                                    onClick={() => toggleSection('birthdays')}
                                    className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${openSection === 'birthdays' ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <CakeIcon className={`w-5 h-5 ${openSection === 'birthdays' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-medium ${openSection === 'birthdays' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {t.tab_birthdays}
                                        </span>
                                        {peopleWithBirthdays.length > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                {peopleWithBirthdays.length}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSection === 'birthdays' ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {openSection === 'birthdays' && (
                                    <ul className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-gray-50 dark:bg-gray-900/30">
                                        {peopleWithBirthdays.length === 0 ? (
                                            <li className="p-4 text-center text-gray-400 text-xs italic">No upcoming birthdays</li>
                                        ) : (
                                            peopleWithBirthdays
                                                .sort((a, b) => parseInt(getDay(a.birthDate)) - parseInt(getDay(b.birthDate)))
                                                .map(person => (
                                                <li key={person.id}>
                                                    <button onClick={() => { onNavigate(person.id); onClose(); }} className="w-full text-left px-4 py-3 hover:bg-white dark:hover:bg-gray-800 transition-colors flex items-center justify-between group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs shadow-sm">
                                                                {getDay(person.birthDate)}
                                                            </div>
                                                            <span className="font-medium text-gray-700 dark:text-gray-200 text-sm group-hover:text-purple-600 transition-colors">{person.firstName} {person.lastName}</span>
                                                        </div>
                                                        <ArrowRightIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400" />
                                                    </button>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                )}
                            </div>

                            {/* MESSAGES ACCORDION ITEM */}
                            <div>
                                <button 
                                    onClick={() => toggleSection('messages')}
                                    className={`w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${openSection === 'messages' ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <MessageIcon className={`w-5 h-5 ${openSection === 'messages' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                                        <span className={`text-sm font-medium ${openSection === 'messages' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {t.tab_messages}
                                        </span>
                                        {unseenMessagesCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                {unseenMessagesCount}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSection === 'messages' ? 'rotate-180' : ''}`} />
                                </button>

                                {openSection === 'messages' && (
                                    <ul className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-gray-50 dark:bg-gray-900/30">
                                        {notifications.length === 0 ? (
                                            <li className="p-4 text-center text-gray-400 text-xs italic">{t.no_messages_list}</li>
                                        ) : (
                                            notifications.map(msg => {
                                                const isUnread = !seenIds.includes(msg.id);
                                                return (
                                                    <li key={msg.id}>
                                                        <button 
                                                            onClick={() => handleMessageClick(msg)} 
                                                            className={`w-full text-left px-4 py-3 hover:bg-white dark:hover:bg-gray-800 transition-colors flex items-start gap-3 group relative ${isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                                        >
                                                            {isUnread && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                                            <div className={`mt-0.5 flex-shrink-0 ${msg.isPoll ? 'text-blue-500' : 'text-purple-500'}`}>
                                                                {msg.isPoll ? <PollIcon className="w-4 h-4"/> : <MessageIcon className="w-4 h-4"/>}
                                                            </div>
                                                            <div className="flex-grow min-w-0">
                                                                <p className={`text-xs leading-snug line-clamp-2 ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                    {msg.text}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[9px] text-gray-400 uppercase tracking-wide">
                                                                        {new Date(msg.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                                                                        {t.msg_read_more}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </li>
                                                );
                                            })
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {isFloatingButtonVisible && (
                    <button
                        onClick={() => isOpen ? onClose() : window.dispatchEvent(new CustomEvent('toggleBirthdayModal'))}
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg flex items-center justify-center relative hover:scale-110 active:scale-95 transition-all duration-200 z-30 ring-2 ring-white dark:ring-gray-900"
                        aria-label="Notifications"
                    >
                        <BellIcon className="w-7 h-7" />
                        {totalCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white dark:border-gray-900 animate-bounce-short">
                                {totalCount}
                            </span>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default BirthdayNotifier;
