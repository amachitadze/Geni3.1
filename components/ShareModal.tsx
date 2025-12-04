import React, { useState, useEffect } from 'react';
import { encryptData, bufferToBase64 } from '../utils/crypto';
import { People } from '../types';
import { ShareIcon, CopyIcon, CloseIcon, KeyIcon, DeleteIcon, DocumentIcon, LockClosedIcon, BackIcon } from './Icons';
import { getSupabaseClient, getStoredSupabaseConfig } from '../utils/supabaseClient';

declare const pako: any;

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    people: People;
    rootIdStack: string[];
  };
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, data }) => {
  const [password, setPassword] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeImages, setIncludeImages] = useState(true);
  
  // Supabase Config State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  // File Manager State
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [storedFiles, setStoredFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  // Admin Auth State
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
      const config = getStoredSupabaseConfig();
      setSupabaseUrl(config.url);
      setSupabaseKey(config.key);
      
      // Auto-expand config if keys are missing from env vars
      if (!config.url || !config.key) {
          setIsConfigExpanded(true);
      }
  }, []);

  const saveConfig = () => {
      if (supabaseUrl && supabaseKey) {
          localStorage.setItem('supabase_url', supabaseUrl.trim());
          localStorage.setItem('supabase_key', supabaseKey.trim());
          setIsConfigExpanded(false);
      }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const removeImages = (originalData: any) => {
      const newData = JSON.parse(JSON.stringify(originalData));
      if (newData.people) {
          Object.keys(newData.people).forEach(key => {
              if (newData.people[key].imageUrl) {
                  delete newData.people[key].imageUrl;
              }
          });
      }
      return newData;
  };

  const fetchStoredFiles = async () => {
      if (!supabaseUrl || !supabaseKey) return;
      setIsLoadingFiles(true);
      try {
          const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
          const { data, error } = await supabase
            .storage
            .from('shares')
            .list();
          
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
      
      const env = typeof process !== 'undefined' ? process.env : {};
      const correctPassword = env.REACT_APP_ADMIN_PASSWORD;
      
      if (!correctPassword) {
          setAdminError("ადმინისტრატორის პაროლი არ არის კონფიგურირებული Vercel-ში (REACT_APP_ADMIN_PASSWORD).");
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

  const toggleFileManager = () => {
      if (!isFileManagerOpen) {
          // Reset auth state when opening
          setIsAdminAuthenticated(false);
          setAdminPasswordInput('');
          setAdminError('');
      }
      setIsFileManagerOpen(!isFileManagerOpen);
  };

  const handleGenerateLink = async () => {
    if (!password) {
      setError('გთხოვთ, ჯერ შექმენით პაროლი.');
      return;
    }
    if (!supabaseUrl || !supabaseKey) {
        setError('გთხოვთ, შეიყვანოთ Supabase-ის მონაცემები კონფიგურაციაში.');
        setIsConfigExpanded(true);
        return;
    }

    setIsLoading(true);
    setError('');
    setShareUrl('');

    try {
      // 1. Prepare Data
      let dataToProcess = data;
      
      if (!includeImages) {
          dataToProcess = removeImages(data);
      }

      const fullJsonString = JSON.stringify(dataToProcess);
      const fullCompressed = pako.deflate(fullJsonString);
      const fullCompressedBase64 = bufferToBase64(fullCompressed.buffer);
      const encryptedData = await encryptData(fullCompressedBase64, password);
      
      // 2. Initialize Supabase
      const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
      
      // 3. Upload to Supabase Storage
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `share_${dateStr}_${Math.random().toString(36).substring(7)}.txt`;
      const blob = new Blob([encryptedData], { type: 'text/plain' });
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('shares') 
        .upload(fileName, blob, {
            contentType: 'text/plain',
            upsert: false
        });

      if (uploadError) {
          throw new Error(`ატვირთვის შეცდომა: ${uploadError.message}`);
      }

      // 4. Generate Link
      const configParam = btoa(JSON.stringify({ u: supabaseUrl, k: supabaseKey }));
      const url = `${window.location.origin}${window.location.pathname}?sbId=${fileName}&cfg=${configParam}`;
      
      setShareUrl(url);
      saveConfig(); 

    } catch (e: any) {
      console.error("Link generation failed", e);
      setError(`შეცდომა: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Could not copy text: ', err);
    });
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
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">ხის გაზიარება (Supabase)</h2>
          <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="დახურვა">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        {isFileManagerOpen ? (
            <div>
                <button onClick={() => setIsFileManagerOpen(false)} className="mb-4 text-sm text-purple-600 hover:underline flex items-center gap-1">
                    <BackIcon className="w-4 h-4" /> უკან გაზიარებაში
                </button>
                
                <h3 className="text-lg font-semibold mb-3 dark:text-white flex items-center gap-2">
                    <DocumentIcon className="w-5 h-5"/> ფაილების მართვა
                </h3>

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
                        {isLoadingFiles ? (
                            <p className="text-gray-500 text-center py-4">იტვირთება...</p>
                        ) : storedFiles.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">ფაილები არ არის.</p>
                        ) : (
                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                {storedFiles.map((file) => (
                                    <li key={file.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500">{formatFileSize(file.metadata?.size)} • {new Date(file.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteFile(file.name)}
                                            className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                            title="წაშლა"
                                        >
                                            <DeleteIcon className="w-4 h-4"/>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="text-xs text-gray-400 mt-2 text-center">აქ ნაჩვენებია ფაილები, რომლებიც ჯერ არ ჩამოუტვირთავთ (ან ავტომატური წაშლა ვერ მოხერხდა).</p>
                    </>
                )}
            </div>
        ) : (
            <>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                    მონაცემები აიტვირთება თქვენს პირად Supabase საცავში. ეს უზრუნველყოფს მუდმივ და საიმედო ბმულს.
                </p>

                <div className="space-y-4">
                    
                {/* Supabase Configuration Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-900/50">
                    <button 
                        onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                        className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                        <span className="flex items-center gap-2"><KeyIcon className="w-4 h-4"/> სერვერის კონფიგურაცია</span>
                        <span className="text-purple-600 hover:text-purple-700">{isConfigExpanded ? 'დამალვა' : 'ჩვენება'}</span>
                    </button>
                    
                    {isConfigExpanded && (
                        <div className="mt-3 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project URL</label>
                                <input 
                                    type="text" 
                                    value={supabaseUrl}
                                    onChange={(e) => setSupabaseUrl(e.target.value)}
                                    placeholder="https://your-project.supabase.co"
                                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 outline-none dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Anon / Public Key</label>
                                <input 
                                    type="text" 
                                    value={supabaseKey}
                                    onChange={(e) => setSupabaseKey(e.target.value)}
                                    placeholder="eyJh..."
                                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 outline-none dark:text-white"
                                />
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-600">
                                <p className="mb-2">აუცილებელია: <b>shares</b> bucket და <b>Public Upload/Delete</b> პოლიტიკა.</p>
                                <a href="#" className="text-purple-600 hover:underline font-medium flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    იხილეთ ინსტრუქცია და პოლიტიკა
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {supabaseUrl && supabaseKey && (
                    <button 
                        onClick={toggleFileManager}
                        className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 border border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <DocumentIcon className="w-4 h-4"/> ატვირთული ფაილების მართვა
                    </button>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">1. პაროლის შექმნა</label>
                    <div className="flex gap-2">
                    <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="შეიყვანეთ ან შექმენით პაროლი" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
                    <button onClick={generatePassword} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 transition-colors text-sm">შექმნა</button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. კონფიგურაცია</label>
                    <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-200 dark:border-gray-700">
                        <input 
                            type="checkbox" 
                            id="includeImages" 
                            checked={includeImages} 
                            onChange={(e) => setIncludeImages(e.target.checked)}
                            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="includeImages" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                            გავაზიარო სურათებით
                        </label>
                    </div>
                    
                    <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded flex items-start gap-2">
                         <span className="text-yellow-600 dark:text-yellow-500 text-lg">⚠️</span>
                         <p className="text-xs text-yellow-800 dark:text-yellow-200">
                             <b>ყურადღება:</b> გაზიარებული ბმული არის <b>ერთჯერადი</b>. ბმულის გახსნისთანავე ფაილი ავტომატურად წაიშლება სერვერიდან უსაფრთხოების მიზნით.
                         </p>
                    </div>

                    <button onClick={handleGenerateLink} disabled={isLoading || !password} className="w-full px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-white">
                        {isLoading ? 'იტვირთება...' : <React.Fragment><ShareIcon className="w-5 h-5"/> ბმულის შექმნა</React.Fragment>}
                    </button>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                </div>

                {shareUrl && (
                    <div className="space-y-4 pt-4 border-t border-gray-300 dark:border-gray-700">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">გასაზიარებელი ბმული</label>
                            <div className="flex gap-2">
                                <input type="text" readOnly value={shareUrl} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 text-sm" />
                                <button onClick={() => copyToClipboard(shareUrl)} title="ბმულის კოპირება" className="p-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 transition-colors"><CopyIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">პაროლი</label>
                            <div className="flex gap-2">
                                <input type="text" readOnly value={password} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300" />
                                <button onClick={() => copyToClipboard(password)} title="პაროლის კოპირება" className="p-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 transition-colors"><CopyIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};
