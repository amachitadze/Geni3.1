import React, { useState, useEffect } from 'react';
import { CloseIcon, DocumentIcon, DeleteIcon, LockClosedIcon, BackIcon } from './Icons';
import { getStoredSupabaseConfig, getSupabaseClient, getAdminPassword } from '../utils/supabaseClient';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FileManagerModal: React.FC<FileManagerModalProps> = ({ isOpen, onClose }) => {
  const [storedFiles, setStoredFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

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
          const { data, error } = await supabase
            .storage
            .from('shares')
            .list(undefined, {
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

  const handleDeleteFile = async (fileName: string) => {
      if (!window.confirm("ნამდვილად გსურთ ამ ფაილის წაშლა?")) return;
      try {
          const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
          const { error } = await supabase
            .storage
            .from('shares')
            .remove([fileName]);
          
          if (error) throw error;
          // Refresh list
          fetchStoredFiles();
      } catch (err: any) {
          alert(`წაშლის შეცდომა: ${err.message}`);
      }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      
      const correctPassword = getAdminPassword();
      
      if (!correctPassword) {
          setAdminError("ადმინისტრატორის პაროლი არ არის კონფიგურირებული სისტემაში.");
          return;
      }

      if (adminPasswordInput === correctPassword) {
          setIsAdminAuthenticated(true);
          setAdminError('');
          fetchStoredFiles();
      } else {
          setAdminError('პაროლი არასწორია.');
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
                <DocumentIcon className="w-6 h-6 text-purple-600"/> მონაცემების მართვა
            </h3>
            <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="დახურვა">
                <CloseIcon className="h-6 w-6" />
            </button>
        </header>

        {!isAdminAuthenticated ? (
            <form onSubmit={handleAdminLogin} className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-300">ფაილების სანახავად და სამართავად საჭიროა ადმინისტრატორის პაროლი.</p>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ადმინისტრატორის პაროლი</label>
                    <div className="relative">
                        <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input 
                            type="password" 
                            value={adminPasswordInput}
                            onChange={(e) => setAdminPasswordInput(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 outline-none dark:text-white"
                            placeholder="შეიყვანეთ პაროლი"
                            autoFocus
                        />
                    </div>
                </div>
                {adminError && <p className="text-xs text-red-500">{adminError}</p>}
                <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors">
                    შესვლა
                </button>
            </form>
        ) : (
            <>
                {!supabaseUrl || !supabaseKey ? (
                     <p className="text-red-500 text-center py-4">Supabase კონფიგურაცია არ მოიძებნა.</p>
                ) : isLoadingFiles ? (
                    <p className="text-gray-500 text-center py-4">იტვირთება...</p>
                ) : storedFiles.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">ფაილები არ არის.</p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">სერვერზე ატვირთული ფაილები:</p>
                        <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                            {storedFiles.map((file) => (
                                <li key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate" title={file.name}>{file.name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(file.metadata?.size)} • {new Date(file.created_at).toLocaleString('ka-GE')}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteFile(file.name)}
                                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                        title="წაშლა"
                                    >
                                        <DeleteIcon className="w-4 h-4"/>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default FileManagerModal;