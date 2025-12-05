import React from 'react';
import { CreateIcon, ImportIcon } from './Icons';
import { translations, Language } from '../utils/translations';

interface InitialViewProps {
    onStartCreating: () => void;
    onImport: () => void;
    language: Language;
}

const InitialView: React.FC<InitialViewProps> = ({ onStartCreating, onImport, language }) => {
    const t = translations[language];

    return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
            <div className="max-w-2xl">
                <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 mb-4">
                    {t.initial_title}
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                    {t.initial_desc}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                        onClick={onStartCreating}
                        className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-all duration-300 transform hover:scale-105"
                    >
                        <CreateIcon className="w-6 h-6 mr-2" />
                        {t.initial_btn_create}
                    </button>
                    <button 
                        onClick={onImport}
                        className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 transform hover:scale-105"
                    >
                        <ImportIcon className="w-6 h-6 mr-2" />
                        {t.initial_btn_import}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InitialView;