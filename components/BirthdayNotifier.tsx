import React, { useState, useEffect, useRef } from 'react';
import { Person } from '../types';
import { BellIcon, CloseIcon } from './Icons';

interface BirthdayNotifierProps {
  peopleWithBirthdays: Person[];
  onNavigate: (personId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isFloatingButtonVisible: boolean;
}

const BirthdayNotifier: React.FC<BirthdayNotifierProps> = ({ peopleWithBirthdays, onNavigate, isOpen, onClose, isFloatingButtonVisible }) => {
    // We lift the state up, so this component is now controlled by props
    const notifierRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && notifierRef.current && !notifierRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (peopleWithBirthdays.length === 0) {
        return null;
    }

    const handlePersonClick = (personId: string) => {
        onNavigate(personId);
        onClose();
    };

    const getDay = (dateStr?: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return parts.length > 2 ? parts[2] : '';
    };

    const toggleOpen = () => {
        if (isOpen) onClose();
        else {
            // We need a way to open it. In parent, we will handle this.
            // But if we click the floating button, we are toggling.
            // Since this component doesn't own "open" state anymore, we simulate toggle via onClose/Parent logic
            // Actually, we need an onToggle or onOpen prop, but usually if we have isOpen and onClose, we assume parent handles state.
            // For the floating button click, we will just call a prop or if we passed setters.
            // To be cleaner, let's assume parent passed a setter wrapper or we modify props.
            // Let's assume the parent handles logic. We will add a temporary local toggle effect? No.
            // Let's just emit event.
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-20 pointer-events-none" ref={notifierRef}>
            <div className="pointer-events-auto">
                {isOpen && (
                    <div className="absolute bottom-full mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-700 overflow-hidden animate-fade-in-up">
                        <header className="p-3 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100">ამ თვის იუბილარები</h3>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400">
                                <CloseIcon className="w-5 h-5"/>
                            </button>
                        </header>
                        <ul className="max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                            {peopleWithBirthdays
                                .sort((a, b) => parseInt(getDay(a.birthDate)) - parseInt(getDay(b.birthDate)))
                                .map(person => (
                                <li key={person.id}>
                                    <button onClick={() => handlePersonClick(person.id)} className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between">
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{person.firstName} {person.lastName}</span>
                                        <span className="text-sm text-purple-600 dark:text-purple-400 font-mono font-semibold">{getDay(person.birthDate)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {isFloatingButtonVisible && (
                    <button
                        onClick={() => isOpen ? onClose() : window.dispatchEvent(new CustomEvent('toggleBirthdayModal'))}
                        className="w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center relative hover:bg-purple-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-purple-500"
                        aria-label={`${peopleWithBirthdays.length} birthdays this month`}
                    >
                        <BellIcon className="w-7 h-7" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white dark:border-gray-900">
                            {peopleWithBirthdays.length}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default BirthdayNotifier;