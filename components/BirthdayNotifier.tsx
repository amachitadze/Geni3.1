import React, { useState, useEffect, useRef } from 'react';
import { Person } from '../types';
import { BellIcon, CloseIcon } from './Icons';

interface BirthdayNotifierProps {
  peopleWithBirthdays: Person[];
  onNavigate: (personId: string) => void;
}

const BirthdayNotifier: React.FC<BirthdayNotifierProps> = ({ peopleWithBirthdays, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const notifierRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifierRef.current && !notifierRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (peopleWithBirthdays.length === 0) {
        return null;
    }

    const handlePersonClick = (personId: string) => {
        onNavigate(personId);
        setIsOpen(false);
    };

    const getDay = (dateStr?: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return parts.length > 2 ? parts[2] : '';
    };

    return (
        <div className="fixed bottom-4 left-4 z-20" ref={notifierRef}>
            {isOpen && (
                <div className="absolute bottom-full mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-700 overflow-hidden">
                    <header className="p-3 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">ამ თვის იუბილარები</h3>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400">
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
             <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center relative hover:bg-purple-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-purple-500"
                aria-label={`${peopleWithBirthdays.length} birthdays this month`}
            >
                <BellIcon className="w-7 h-7" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white dark:border-gray-900">
                    {peopleWithBirthdays.length}
                </span>
            </button>
        </div>
    );
};

export default BirthdayNotifier;