
import React, { useState } from 'react';
import { CloseIcon, JsonImportIcon, DocumentPlusIcon, CloudDownloadIcon, LockClosedIcon, DocumentIcon } from './Icons';
import { getStoredSupabaseConfig, getSupabaseClient, getAdminPassword } from '../utils/supabaseClient';
import { translations, Language } from '../utils/translations';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFromFile: () => void;
  onMergeFromFile: () => void;
  onRestore: (data: any) => void;
  language: Language;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportFromFile, onMergeFromFile, onRestore, language }) => {
    const t = translations[language];
    const [view, setView] = useState<'menu' | 'auth' | 'list'>('menu');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [backups, setBackups] = useState<any[]>([]);

    const handleImportClick = () => {
        onImportFromFile();
        onClose();
    };

    const handleMergeClick = () => {
        onMergeFromFile();
        onClose();
    };

    const handleCloudRestoreClick = () => {
        setView('auth');
        setError('');
        setPassword('');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleAdminLogin = async (e: React.FormEvent) => {
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

        setIsLoading(true);
        setError('');

        try {
            const config = getStoredSupabaseConfig();
            if (!config.url || !config.key) {
                throw new Error("Supabase config missing");
            }
            const supabase = getSupabaseClient(config.url, config.key);
            
            // List files in the 'backups' folder
            const { data, error: listError } = await supabase
                .storage
                .from('shares')
                .list('backups', {
                    limit: 100,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (listError) throw listError;

            // 'data' contains items in the folder. We filter to ensure they look like files.
            const backupFiles = (data || []).filter(f => f.name.endsWith('.json'));
            setBackups(backupFiles);
            setView('list');

        } catch (err: any) {
             console.error("List failed:", err);
             setError(err.message || "Failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestoreFile = async (fileName: string) => {
        if (!window.confirm("Restore? " + fileName)) return;
        
        setIsLoading(true);
        try {
            const config = getStoredSupabaseConfig();
            const supabase = getSupabaseClient(config.url, config.key);
            
            const { data, error: downloadError } = await supabase
                .storage
                .from('shares')
                .download(`backups/${fileName}`);
            
            if (downloadError) throw downloadError;
            if (!data) throw new Error("Empty file");

            const text = await data.text();
            const jsonData = JSON.parse(text);
            
            onRestore(jsonData);
            onClose();

        } catch (err: any) {
            console.error("Download failed:", err);
            alert(`Error: ${err.message}`);
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
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t.imp_title}</h2>
                    <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label={t.close}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                {view === 'menu' && (
                    <>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{t.imp_desc}</p>
                        <div className="space-y-4">
                             <button
                                onClick={handleCloudRestoreClick}
                                className={`${buttonBaseClasses} bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 ${buttonHoverClasses}`}
                            >
                                <CloudDownloadIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                <div className="flex-grow">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{t.imp_restore}</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.imp_restore_sub}</p>
                                </div>
                            </button>

                            <button
                                onClick={handleImportClick}
                                className={`${buttonBaseClasses} bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 ${buttonHoverClasses}`}
                            >
                                <JsonImportIcon className="w-8 h-8 text-purple-500 flex-shrink-0" />
                                <div className="flex-grow">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{t.imp_file}</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.imp_file_sub}</p>
                                </div>
                            </button>

                            <button
                                onClick={handleMergeClick}
                                className={`${buttonBaseClasses} bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 ${buttonHoverClasses}`}
                            >
                                <DocumentPlusIcon className="w-8 h-8 text-purple-500 flex-shrink-0" />
                                <div className="flex-grow">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{t.imp_merge}</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.imp_merge_sub}</p>
                                </div>
                            </button>
                        </div>
                    </>
                )}

                {view === 'auth' && (
                     <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setView('menu')} className="text-sm text-purple-600 hover:underline">{t.back}</button>
                            <span className="text-gray-400">|</span>
                            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">{t.fm_admin_pass}</h3>
                        </div>
                         <form onSubmit={handleAdminLogin} className="space-y-4">
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
                                    {isLoading ? t.loading : t.fm_login}
                                </button>
                        </form>
                    </div>
                )}

                {view === 'list' && (
                     <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setView('menu')} className="text-sm text-purple-600 hover:underline">{t.back}</button>
                            <span className="text-gray-400">|</span>
                            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Backups</h3>
                        </div>

                        {isLoading ? (
                            <p className="text-center text-gray-500">{t.loading}</p>
                        ) : backups.length === 0 ? (
                            <p className="text-center text-gray-500">{t.fm_no_files}</p>
                        ) : (
                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                {backups.map((file) => (
                                    <li key={file.id}>
                                        <button 
                                            onClick={() => handleRestoreFile(file.name)}
                                            className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-200 dark:border-gray-700 rounded transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.name}</p>
                                                    <p className="text-xs text-gray-500">{formatFileSize(file.metadata?.size)} • {new Date(file.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'ka-GE')}</p>
                                                </div>
                                            </div>
                                            <CloudDownloadIcon className="w-5 h-5 text-purple-500 opacity-0 group-hover:opacity-100"/>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportModal;
