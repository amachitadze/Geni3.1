

import React, { useState } from 'react';
import { CloseIcon, JsonExportIcon, CloudUploadIcon, LockClosedIcon, CheckIcon, BackIcon } from './Icons';
import { People } from '../types';
import { getStoredSupabaseConfig, getSupabaseClient, getAdminPassword } from '../utils/supabaseClient';
import { translations, Language } from '../utils/translations';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportJson: () => void;
  data: {
      people: People;
      rootIdStack: string[];
  };
  language: Language;
  onBack?: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExportJson, data, language, onBack }) => {
    const t = translations[language];
    const [view, setView] = useState<'menu' | 'auth'>('menu');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleExportClick = () => {
        onExportJson();
        onClose();
    };

    const handleCloudUploadClick = () => {
        setView('auth');
        setError('');
        setPassword('');
    };

    const transliterate = (text: string) => {
        const map: Record<string, string> = {
          'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't',
          'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p', 'ჟ': 'zh',
          'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q',
          'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
        };
        return text.split('').map(char => map[char] || char).join('');
    };

    const handleAdminLoginAndUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const correctPassword = getAdminPassword();

        if (!correctPassword) {
            setError(t.fm_admin_pass + " not set");
            return;
        }

        if (password !== correctPassword) {
            setError('Error');
            return;
        }

        // Auth successful, proceed to upload
        setIsLoading(true);
        setError('');
        
        try {
            const config = getStoredSupabaseConfig();
            if (!config.url || !config.key) {
                throw new Error("Supabase config missing");
            }

            const supabase = getSupabaseClient(config.url, config.key);
            
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10);
            const timeStr = date.toTimeString().slice(0, 5).replace(':', '-');
            
            const rootPerson = data.people[data.rootIdStack[0]]; 
            const rawLastName = rootPerson?.lastName || 'Family';
            const latinLastName = transliterate(rawLastName).replace(/[^a-zA-Z0-9]/g, '');
            
            // Store in 'backups/' folder
            const fileName = `backups/backup_${latinLastName || 'Tree'}_${dateStr}_${timeStr}.json`;
            
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            const { error: uploadError } = await supabase
                .storage
                .from('shares')
                .upload(fileName, blob, {
                    contentType: 'application/json',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            setSuccessMessage(`Success: ${fileName}`);
            setTimeout(() => {
                onClose();
                setView('menu');
                setSuccessMessage('');
            }, 2000);

        } catch (err: any) {
            console.error("Upload failed:", err);
            setError(err.message || "Upload Failed");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const buttonBaseClasses = "w-full p-4 rounded-lg border flex items-center gap-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
    const buttonHoverClasses = "hover:bg-gray-100 dark:hover:bg-gray-700";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <header className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        {onBack && (
                            <button onClick={onBack} className="p-1 -ml-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <BackIcon className="w-6 h-6" />
                            </button>
                        )}
                        {t.exp_title}
                    </h2>
                    <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label={t.close}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                {view === 'menu' ? (
                    <>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{t.exp_desc}</p>
                        <div className="space-y-4">
                            <button
                                onClick={handleExportClick}
                                className={`${buttonBaseClasses} bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 ${buttonHoverClasses}`}
                            >
                                <JsonExportIcon className="w-8 h-8 text-purple-500 flex-shrink-0" />
                                <div className="flex-grow">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{t.exp_file}</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.exp_file_sub}</p>
                                </div>
                            </button>

                            <button
                                onClick={handleCloudUploadClick}
                                className={`${buttonBaseClasses} bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 ${buttonHoverClasses}`}
                            >
                                <CloudUploadIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                <div className="flex-grow">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{t.exp_cloud}</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.exp_cloud_sub}</p>
                                </div>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setView('menu')} className="text-sm text-purple-600 hover:underline">{t.back}</button>
                            <span className="text-gray-400">|</span>
                            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">{t.fm_admin_pass}</h3>
                        </div>

                        {successMessage ? (
                            <div className="flex flex-col items-center justify-center py-4 text-green-600 dark:text-green-400 animate-fade-in-up">
                                <CheckIcon className="w-10 h-10 mb-2" />
                                <p className="text-center font-medium">{successMessage}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleAdminLoginAndUpload} className="space-y-4">
                                <div>
                                    <div className="relative">
                                        <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                        <input 
                                            type="password" 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 outline-none dark:text-white"
                                            autoFocus
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                                {error && <p className="text-xs text-red-500">{error}</p>}
                                <button 
                                    type="submit" 
                                    disabled={isLoading || !password}
                                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 text-white rounded text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    {isLoading ? t.loading : <><CloudUploadIcon className="w-4 h-4" /> Upload</>}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportModal;