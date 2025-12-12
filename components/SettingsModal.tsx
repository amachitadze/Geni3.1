
import React, { useState, useEffect, useRef } from 'react';
import { 
    CloseIcon, UserCircleIcon, CogIcon, DatabaseIcon, InfoIcon, 
    SunIcon, MoonIcon, LanguageIcon, CloudDownloadIcon, CloudUploadIcon,
    DocumentIcon, JsonExportIcon, JsonImportIcon, LogoutIcon, CreditCardIcon,
    BackIcon, LockClosedIcon, CheckIcon, DocumentPlusIcon, DeleteIcon,
    UserGroupIcon, ImageIcon, EditIcon, BellIcon
} from './Icons';
import { translations, Language } from '../utils/translations';
import { formatTimestamp } from '../utils/dateUtils';
import { getStoredSupabaseConfig, getSupabaseClient, getAdminPassword } from '../utils/supabaseClient';
import { validatePeopleData } from '../utils/treeUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  currentUser: string | null;
  onLogout: () => void;
  onLogin?: () => void;
  treeStats: {
      totalPeople: number;
      lastUpdated: string | null;
      rootName: string;
  };
  initialTab?: 'general' | 'account' | 'data' | 'about';
  onRestore: (data: any) => void;
  onExportJson: () => void;
  currentData: { people: any; rootIdStack: string[] };
  appMetadata?: { name: string; version: string; build: string } | null;
  installPrompt?: any;
  onInstall?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, language, onLanguageChange, theme, toggleTheme,
    currentUser, onLogout, onLogin, treeStats, initialTab = 'general',
    onRestore, onExportJson, currentData, appMetadata, installPrompt, onInstall
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'data' | 'about'>(initialTab);
  
  // Data Tab Navigation State
  const [dataView, setDataView] = useState<'menu' | 'import' | 'export' | 'fileManager'>('menu');
  
  // Auth State for Cloud Features
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminError, setAdminError] = useState('');

  // File/Import Logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileAction, setFileAction] = useState<'import' | 'merge' | null>(null);
  
  // Cloud Ops State
  const [isLoading, setIsLoading] = useState(false);
  const [opStatus, setOpStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [supabaseConfig, setSupabaseConfig] = useState({ url: '', key: '' });

  // Notifications State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
      if (isOpen) {
          setActiveTab(initialTab);
          setDataView('menu');
          setOpStatus(null);
          const config = getStoredSupabaseConfig();
          setSupabaseConfig(config);
          
          if ('Notification' in window) {
              setNotifPermission(Notification.permission);
          }
      }
  }, [isOpen, initialTab]);

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const correctPassword = getAdminPassword();
      if (!correctPassword) {
          setAdminError("Admin password not configured.");
          return;
      }
      if (adminPasswordInput === correctPassword) {
          setIsAdminAuthenticated(true);
          setAdminError('');
      } else {
          setAdminError("Incorrect Password");
      }
  };

  // --- Import Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !fileAction) return;

      if (!window.confirm(fileAction === 'import' ? "ყურადღება: ფაილის იმპორტი წაშლის მიმდინარე ხეს." : "ახალი ინფორმაცია დაემატება არსებულს.")) {
          setFileAction(null); return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const importedData = JSON.parse(ev.target?.result as string);
              const { isValid, error } = validatePeopleData(importedData);
              if (!isValid) throw new Error(error || "Invalid file");

              if (fileAction === 'import') {
                  onRestore(importedData);
                  setOpStatus({ msg: "Success: Tree Imported", type: 'success' });
              } else {
                  // Merge logic implies existing people + new ones. 
                  // For simple merge, we create a new combined object.
                  // Note: This is a shallow merge of the 'people' map.
                  const mergedPeople = { ...currentData.people, ...importedData.people };
                  onRestore({ ...currentData, people: mergedPeople });
                  setOpStatus({ msg: "Success: Data Merged", type: 'success' });
              }
          } catch (err: any) {
              setOpStatus({ msg: `Error: ${err.message}`, type: 'error' });
          } finally {
              setFileAction(null);
              if(e.target) e.target.value = '';
          }
      };
      reader.readAsText(file);
  };

  const triggerLocalImport = (mode: 'import' | 'merge') => {
      setFileAction(mode);
      fileInputRef.current?.click();
  };

  const fetchCloudBackups = async () => {
      if (!supabaseConfig.url || !supabaseConfig.key) return;
      setIsLoading(true);
      try {
          const supabase = getSupabaseClient(supabaseConfig.url, supabaseConfig.key);
          const { data, error } = await supabase.storage.from('shares').list('backups', { sortBy: { column: 'created_at', order: 'desc' }});
          if (error) throw error;
          setCloudFiles(data || []);
      } catch (err: any) {
          console.error(err);
      } finally {
          setIsLoading(false);
      }
  };

  const restoreFromCloud = async (fileName: string) => {
      if (!window.confirm(`Restore ${fileName}? This will overwrite current tree.`)) return;
      setIsLoading(true);
      try {
          const supabase = getSupabaseClient(supabaseConfig.url, supabaseConfig.key);
          const { data, error } = await supabase.storage.from('shares').download(`backups/${fileName}`);
          if (error) throw error;
          const text = await data.text();
          onRestore(JSON.parse(text));
          setOpStatus({ msg: "Restored successfully", type: 'success' });
          onClose();
      } catch (err: any) {
          setOpStatus({ msg: err.message, type: 'error' });
      } finally {
          setIsLoading(false);
      }
  };

  // --- Export Logic ---
  const uploadToCloud = async () => {
      if (!supabaseConfig.url || !supabaseConfig.key) return;
      setIsLoading(true);
      try {
          const supabase = getSupabaseClient(supabaseConfig.url, supabaseConfig.key);
          const date = new Date();
          const dateStr = date.toISOString().slice(0, 10);
          const timeStr = date.toTimeString().slice(0, 5).replace(':', '-');
          const rootPerson = currentData.people[currentData.rootIdStack[0]];
          const name = rootPerson?.lastName || 'Tree';
          // Simple translit for filename
          const safeName = name.replace(/[^a-zA-Z0-9]/g, ''); 
          
          const fileName = `backups/backup_${safeName}_${dateStr}_${timeStr}.json`;
          const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
          
          const { error } = await supabase.storage.from('shares').upload(fileName, blob);
          if (error) throw error;
          
          setOpStatus({ msg: `Uploaded: ${fileName}`, type: 'success' });
      } catch (err: any) {
          setOpStatus({ msg: err.message, type: 'error' });
      } finally {
          setIsLoading(false);
      }
  };

  // --- File Manager Logic ---
  const [fmFolder, setFmFolder] = useState('backups');
  const fetchFileManagerFiles = async () => {
      if (!supabaseConfig.url) return;
      setIsLoading(true);
      try {
          const supabase = getSupabaseClient(supabaseConfig.url, supabaseConfig.key);
          const { data, error } = await supabase.storage.from('shares').list(fmFolder, { sortBy: { column: 'created_at', order: 'desc' }});
          if(error) throw error;
          setCloudFiles(data || []);
      } catch (err) { console.error(err); } 
      finally { setIsLoading(false); }
  };

  const deleteCloudFile = async (name: string) => {
      if(!window.confirm("Delete file?")) return;
      try {
          const supabase = getSupabaseClient(supabaseConfig.url, supabaseConfig.key);
          const { error } = await supabase.storage.from('shares').remove([`${fmFolder}/${name}`]);
          if (error) throw error;
          fetchFileManagerFiles();
      } catch(err: any) { alert(err.message); }
  };

  // --- Notifications Logic ---
  const requestNotifPermission = async () => {
      if (!('Notification' in window)) return;
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
          // Trigger a test notification via Service Worker
          if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
              navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification("Notifications Enabled", {
                      body: "You will now receive updates.",
                      icon: 'https://i.postimg.cc/XNfDXTjn/Geni-Icon.png'
                  });
              });
          }
      }
  };

  // Effect to load data when switching views if auth is ready
  useEffect(() => {
      if (activeTab === 'data' && isAdminAuthenticated) {
          if (dataView === 'import') fetchCloudBackups();
          if (dataView === 'fileManager') fetchFileManagerFiles();
      }
  }, [activeTab, dataView, isAdminAuthenticated, fmFolder]);


  if (!isOpen) return null;

  const TabButton = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => (
      <button 
        onClick={() => { setActiveTab(id); setDataView('menu'); }}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === id 
            ? 'border-purple-600 text-purple-600 dark:text-purple-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
          {icon}
          <span>{label}</span>
      </button>
  );

  const renderAuthGate = (content: React.ReactNode) => {
      if (isAdminAuthenticated) return content;
      return (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t.fm_admin_hint}</p>
              <form onSubmit={handleAdminLogin} className="space-y-3">
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
                  {adminError && <p className="text-xs text-red-500">{adminError}</p>}
                  <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors">
                      {t.fm_login}
                  </button>
              </form>
          </div>
      );
  };

  const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-300 dark:border-gray-700 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
                {activeTab === 'data' && dataView !== 'menu' && (
                    <button onClick={() => setDataView('menu')} className="mr-1 p-1 -ml-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors">
                        <BackIcon className="w-5 h-5"/>
                    </button>
                )}
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <CogIcon className="w-6 h-6 text-purple-600"/>
                    {t.settings_title}
                </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <CloseIcon className="w-6 h-6" />
            </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <TabButton id="general" label={t.set_tab_general} icon={<CogIcon className="w-4 h-4"/>} />
            <TabButton id="account" label={t.set_tab_account} icon={<UserCircleIcon className="w-4 h-4"/>} />
            <TabButton id="data" label={t.set_tab_data} icon={<DatabaseIcon className="w-4 h-4"/>} />
            <TabButton id="about" label={t.set_tab_about} icon={<InfoIcon className="w-4 h-4"/>} />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow relative">
            {opStatus && (
                <div className={`mb-4 p-3 rounded flex items-center gap-2 text-sm ${opStatus.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                    {opStatus.type === 'success' ? <CheckIcon className="w-4 h-4"/> : <CloseIcon className="w-4 h-4"/>}
                    {opStatus.msg}
                    <button onClick={() => setOpStatus(null)} className="ml-auto opacity-50 hover:opacity-100"><CloseIcon className="w-4 h-4"/></button>
                </div>
            )}

            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    {/* Theme */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                                {theme === 'light' ? <SunIcon className="w-5 h-5"/> : <MoonIcon className="w-5 h-5"/>}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{t.set_theme}</p>
                                <p className="text-xs text-gray-500">{theme === 'light' ? t.set_theme_light : t.set_theme_dark}</p>
                            </div>
                        </div>
                        <button onClick={toggleTheme} className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors">
                            {theme === 'light' ? <MoonIcon className="w-4 h-4"/> : <SunIcon className="w-4 h-4"/>}
                        </button>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                <LanguageIcon className="w-5 h-5"/>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{t.set_language}</p>
                                <p className="text-xs text-gray-500">{language === 'ka' ? 'ქართული' : 'Español'}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onLanguageChange('ka')} className={`px-3 py-1.5 text-xs font-bold rounded border ${language === 'ka' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>KA</button>
                            <button onClick={() => onLanguageChange('es')} className={`px-3 py-1.5 text-xs font-bold rounded border ${language === 'es' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>ES</button>
                        </div>
                    </div>

                    {/* Install App - Only if available */}
                    {installPrompt && (
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full text-purple-600 dark:text-purple-400">
                                    <CloudDownloadIcon className="w-5 h-5"/>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{t.install_title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.install_desc}</p>
                                </div>
                            </div>
                            <button onClick={onInstall} className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm">
                                {t.install_btn}
                            </button>
                        </div>
                    )}

                    {/* Notifications */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                                <BellIcon className="w-5 h-5"/>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{t.set_notifications}</p>
                                <p className="text-xs text-gray-500">
                                    {notifPermission === 'granted' ? t.set_notif_active : 
                                     notifPermission === 'denied' ? t.set_notif_denied : t.set_enable_notif}
                                </p>
                            </div>
                        </div>
                        {notifPermission === 'default' ? (
                            <button onClick={requestNotifPermission} className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors">
                                Subscribe
                            </button>
                        ) : notifPermission === 'granted' ? (
                            <span className="text-green-600 dark:text-green-400 font-bold text-sm flex items-center gap-1">
                                <CheckIcon className="w-4 h-4"/> Active
                            </span>
                        ) : (
                            <span className="text-red-500 text-xs font-medium">Blocked</span>
                        )}
                    </div>
                </div>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
                <div className="space-y-6 animate-fade-in-up">
                    {currentUser ? (
                        <>
                            {/* Profile Card */}
                            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-6 shadow-lg">
                                <div className="absolute top-0 right-0 p-4 opacity-20"><UserCircleIcon className="w-32 h-32"/></div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30 shadow-inner">
                                        {currentUser.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">{currentUser}</h3>
                                        <p className="text-purple-100 text-sm opacity-90">{currentUser.toLowerCase().replace(/\s+/g, '.')}@example.com</p>
                                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-400 text-yellow-900 uppercase tracking-wide">
                                            {t.plan_free} Plan
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 mb-2"><UserGroupIcon className="w-5 h-5"/></div>
                                    <span className="text-2xl font-bold text-gray-800 dark:text-white">{treeStats.totalPeople}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">{t.set_stat_people}</span>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 mb-2"><ImageIcon className="w-5 h-5"/></div>
                                    <span className="text-2xl font-bold text-gray-800 dark:text-white">0</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Media Files</span>
                                </div>
                            </div>

                            {/* Plan Info */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{t.set_plan}</p>
                                    <p className="text-xs text-gray-500">{t.set_plan_free}</p>
                                </div>
                                <button className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                                    {t.set_plan_upgrade}
                                </button>
                            </div>

                            {/* Logout Action */}
                            <div className="pt-2">
                                <button 
                                    onClick={() => { onLogout(); onClose(); }} 
                                    className="w-full py-3 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <LogoutIcon className="w-5 h-5"/> {t.set_logout}
                                </button>
                            </div>
                        </>
                    ) : (
                        // Guest View
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <UserCircleIcon className="w-16 h-16"/>
                            </div>
                            <div className="max-w-xs mx-auto">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Guest Account</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Sign in to sync your family tree across devices, unlock premium features, and ensure your data is always safe.
                                </p>
                            </div>
                            <div className="w-full max-w-sm space-y-3">
                                <button 
                                    onClick={onLogin}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 transition-transform active:scale-95"
                                >
                                    {t.auth_login} / {t.auth_register}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DATA TAB */}
            {activeTab === 'data' && (
                <div className="space-y-4">
                    {dataView === 'menu' && (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t.set_data_desc}</p>
                            <button onClick={() => setDataView('import')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-500 group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400"><JsonImportIcon className="w-6 h-6"/></div>
                                    <div className="text-left"><p className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-purple-600 transition-colors">{t.imp_title}</p><p className="text-xs text-gray-500">{t.imp_desc}</p></div>
                                </div>
                            </button>
                            <button onClick={() => setDataView('export')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400"><JsonExportIcon className="w-6 h-6"/></div>
                                    <div className="text-left"><p className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 transition-colors">{t.exp_title}</p><p className="text-xs text-gray-500">{t.exp_desc}</p></div>
                                </div>
                            </button>
                            <button onClick={() => setDataView('fileManager')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-orange-500 group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-600 dark:text-orange-400"><DocumentIcon className="w-6 h-6"/></div>
                                    <div className="text-left"><p className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-orange-600 transition-colors">{t.fm_title}</p><p className="text-xs text-gray-500">{t.fm_files_server}</p></div>
                                </div>
                            </button>
                        </>
                    )}

                    {/* IMPORT SUB-VIEW */}
                    {dataView === 'import' && (
                        <div className="animate-fade-in-up">
                            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2"><JsonImportIcon className="w-5 h-5 text-purple-600"/> {t.imp_title}</h3>
                            <div className="space-y-4">
                                {/* Local */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Local File</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => triggerLocalImport('import')} className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded flex items-center justify-center gap-1"><JsonImportIcon className="w-3 h-3"/> {t.imp_file}</button>
                                        <button onClick={() => triggerLocalImport('merge')} className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-xs rounded flex items-center justify-center gap-1"><DocumentPlusIcon className="w-3 h-3"/> {t.imp_merge}</button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2">{t.imp_file_sub}</p>
                                </div>
                                {/* Cloud */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Cloud Restore</h4>
                                    {renderAuthGate(
                                        <div>
                                            <p className="text-xs text-gray-500 mb-3">{t.imp_restore_sub}</p>
                                            {isLoading ? <p className="text-xs">{t.loading}</p> : 
                                             cloudFiles.length === 0 ? <p className="text-xs text-gray-400">{t.fm_no_files}</p> :
                                             <ul className="max-h-40 overflow-y-auto space-y-1">
                                                 {cloudFiles.map(f => (
                                                     <li key={f.id} className="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer border border-transparent hover:border-gray-300">
                                                         <div className="min-w-0">
                                                             <p className="text-xs font-medium truncate w-48">{f.name}</p>
                                                             <p className="text-[10px] text-gray-400">{formatSize(f.metadata?.size)}</p>
                                                         </div>
                                                         <button onClick={() => restoreFromCloud(f.name)} className="text-blue-500 hover:underline text-xs"><CloudDownloadIcon className="w-4 h-4"/></button>
                                                     </li>
                                                 ))}
                                             </ul>
                                            }
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXPORT SUB-VIEW */}
                    {dataView === 'export' && (
                        <div className="animate-fade-in-up">
                            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2"><JsonExportIcon className="w-5 h-5 text-blue-600"/> {t.exp_title}</h3>
                            <div className="space-y-4">
                                <button onClick={onExportJson} className="w-full p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-blue-500 flex items-center gap-4 transition-colors">
                                    <JsonExportIcon className="w-8 h-8 text-blue-500"/>
                                    <div className="text-left">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200 block">{t.exp_file}</span>
                                        <span className="text-xs text-gray-500">{t.exp_file_sub}</span>
                                    </div>
                                </button>
                                
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">{t.exp_cloud}</h4>
                                    {renderAuthGate(
                                        <div>
                                            <p className="text-xs text-gray-500 mb-3">{t.exp_cloud_sub}</p>
                                            <button onClick={uploadToCloud} disabled={isLoading} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center justify-center gap-2">
                                                {isLoading ? t.loading : <><CloudUploadIcon className="w-4 h-4"/> Upload Backup</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FILE MANAGER SUB-VIEW */}
                    {dataView === 'fileManager' && (
                        <div className="animate-fade-in-up">
                            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2"><DocumentIcon className="w-5 h-5 text-orange-600"/> {t.fm_title}</h3>
                            {renderAuthGate(
                                <div className="space-y-3">
                                    <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                                        <button onClick={() => setFmFolder('backups')} className={`pb-2 px-3 text-xs font-medium ${fmFolder === 'backups' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>Backups</button>
                                        <button onClick={() => setFmFolder('links')} className={`pb-2 px-3 text-xs font-medium ${fmFolder === 'links' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>Links</button>
                                    </div>
                                    
                                    {isLoading ? <p className="text-center text-sm py-4">{t.loading}</p> : 
                                     cloudFiles.length === 0 ? <p className="text-center text-sm py-4 text-gray-400">{t.fm_no_files}</p> :
                                     <ul className="max-h-60 overflow-y-auto space-y-2">
                                         {cloudFiles.map(f => (
                                             <li key={f.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                                 <div className="flex items-center gap-2 overflow-hidden">
                                                     <DocumentIcon className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                                                     <div className="min-w-0">
                                                         <p className="text-xs font-medium truncate w-40">{f.name}</p>
                                                         <p className="text-[10px] text-gray-400">{formatSize(f.metadata?.size)}</p>
                                                     </div>
                                                 </div>
                                                 <button onClick={() => deleteCloudFile(f.name)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"><DeleteIcon className="w-3 h-3"/></button>
                                             </li>
                                         ))}
                                     </ul>
                                    }
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
                <div className="space-y-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <InfoIcon className="w-5 h-5 text-gray-500"/>
                            {t.set_tree_info}
                        </h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex justify-between">
                                <span className="text-gray-500">{t.set_stat_root}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{treeStats.rootName}</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-gray-500">{t.set_stat_people}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{treeStats.totalPeople}</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-gray-500">{t.set_stat_updated}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatTimestamp(treeStats.lastUpdated)}</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="text-center pt-4">
                        {appMetadata ? (
                            <p className="text-xs text-gray-400">App Version {appMetadata.version} ({appMetadata.build})</p>
                        ) : (
                            <p className="text-xs text-gray-400">Loading version info...</p>
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>
      {/* Hidden File Input for local operations */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".json" />
    </div>
  );
};

export default SettingsModal;
