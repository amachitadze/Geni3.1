

import React, { useState, useEffect } from 'react';
import { CloseIcon, DocumentIcon, DeleteIcon, LockClosedIcon, BackIcon } from './Icons';
import { getStoredSupabaseConfig, getSupabaseClient, getAdminPassword } from '../utils/supabaseClient';
import { translations, Language } from '../utils/translations';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onBack?: () => void;
}

const FileManagerModal: React.FC<FileManagerModalProps> = ({ isOpen, onClose, language, onBack }) => {
  const t = translations[language];
  const [storedFiles, setStoredFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [currentFolder, setCurrentFolder] = useState('backups'); // Default to backups

  useEffect(() => {
      if (isOpen) {
          const config = getStoredSupabaseConfig();
          setSupabaseUrl(config.url);
          setSupabaseKey(config.key);
          // Reset auth state on open
          setIsAdminAuthenticated(false);
          setAdminPasswordInput('');
          setAdminError('');
          setStoredFiles([]);
      }
  }, [isOpen]);

  const fetchStoredFiles = async () => {
      if (!supabaseUrl || !supabaseKey) return;
      setIsLoadingFiles(true);
      try {
          const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
          // List files in current folder
          const { data, error } = await supabase
            .storage
            .from('shares')
            .list(currentFolder, {
                sortBy: { column: 'created_at', order: 'desc' }
            });
          
          if (error) throw error;
          setStoredFiles(data || []);
      } catch (err) {
          console.error("Error fetching files:", err);
      } finally {
          setIsLoadingFiles(false);
      }
  };

  useEffect(() => {
      if (isAdminAuthenticated) {
          fetchStoredFiles();
      }
  }, [isAdminAuthenticated, currentFolder]);

  const handleDeleteFile = async (fileName: string) => {
      if (!window.confirm(t.fm_delete_confirm)) return;
      try {
          const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
          const fullPath = currentFolder ? `${currentFolder}/${fileName}` : fileName;
          
          const { error } = await supabase
            .storage
            .from('shares')
            .remove([fullPath]);
          
          if (error) throw error;
          // Refresh list
          fetchStoredFiles();
      } catch (err: any) {
          alert(`${t.fm_delete_error} ${err.message}`);
      }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      
      const correctPassword = getAdminPassword();
      
      if (!correctPassword) {
          setAdminError(`${t.fm_admin_pass} missing config.`);
          return;
      }

      if (adminPasswordInput === correctPassword) {
          setIsAdminAuthenticated(true);
          setAdminError('');
      } else {
          setAdminError('Error');
      }
  };

  const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <header className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                {onBack && (
                    <button onClick={onBack} className="p-1 -ml-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <BackIcon className="w-6 h-6" />
                    </button>
                )}
                <DocumentIcon className="w-6 h-6 text-purple-600"/> {t.fm_title}
            </h3>
            <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label={t.close}>
                <CloseIcon className="h-6 w-6" />
            </button>
        </header>

        {!isAdminAuthenticated ? (
            <form onSubmit={handleAdminLogin} className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-300">{t.fm_admin_hint}</p>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.fm_admin_pass}</label>
                    <div className="relative">
                        <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input 
                            type="password" 
                            value={adminPasswordInput}
                            onChange={(e) => setAdminPasswordInput(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 outline-none dark:text-white"
                            placeholder={t.fm_enter_pass}
                            autoFocus
                        />
                    </div>
                </div>
                {adminError && <p className="text-xs text-red-500">{adminError}</p>}
                <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors">
                    {t.fm_login}
                </button>
            </form>
        ) : (
            <>
                {!supabaseUrl || !supabaseKey ? (
                     <p className="text-red-500 text-center py-4">{t.fm_config_missing}</p>
                ) : (
                    <div className="space-y-4">
                        {/* Folder Tabs */}
                        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                            <button 
                                onClick={() => setCurrentFolder('backups')} 
                                className={`pb-2 px-3 text-sm font-medium transition-colors ${currentFolder === 'backups' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            >
                                Backups
                            </button>
                            <button 
                                onClick={() => setCurrentFolder('links')} 
                                className={`pb-2 px-3 text-sm font-medium transition-colors ${currentFolder === 'links' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            >
                                Links
                            </button>
                        </div>

                        {isLoadingFiles ? (
                             <p className="text-gray-500 text-center py-4">{t.loading}</p>
                        ) : storedFiles.length === 0 ? (
                             <p className="text-gray-500 text-center py-4">{t.fm_no_files}</p>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Files in /{currentFolder}
                                </p>
                                <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                                    {storedFiles.map((file) => (
                                        <li key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate" title={file.name}>{file.name}</p>
                                                    <p className="text-xs text-gray-500">{formatFileSize(file.metadata?.size)} • {new Date(file.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'ka-GE')}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteFile(file.name)}
                                                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                title={t.delete}
                                            >
                                                <DeleteIcon className="w-4 h-4"/>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default FileManagerModal;