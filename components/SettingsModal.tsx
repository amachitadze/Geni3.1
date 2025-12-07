

import React, { useState } from 'react';
import { 
    CloseIcon, UserCircleIcon, CogIcon, DatabaseIcon, InfoIcon, 
    SunIcon, MoonIcon, LanguageIcon, CloudDownloadIcon, CloudUploadIcon,
    DocumentIcon, JsonExportIcon, JsonImportIcon, LogoutIcon, CreditCardIcon
} from './Icons';
import { translations, Language } from '../utils/translations';
import { formatTimestamp } from '../utils/dateUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  currentUser: string | null;
  onLogout: () => void;
  openImport: () => void;
  openExport: () => void;
  openFileManager: () => void;
  treeStats: {
      totalPeople: number;
      lastUpdated: string | null;
      rootName: string;
  };
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, language, onLanguageChange, theme, toggleTheme,
    currentUser, onLogout, openImport, openExport, openFileManager, treeStats
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'data' | 'about'>('general');

  if (!isOpen) return null;

  const TabButton = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === id 
            ? 'border-purple-600 text-purple-600 dark:text-purple-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
          {icon}
          <span>{label}</span>
      </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-300 dark:border-gray-700 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <CogIcon className="w-6 h-6 text-purple-600"/>
                {t.settings_title}
            </h2>
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
        <div className="p-6 overflow-y-auto flex-grow">
            
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="space-y-6">
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
                        <button 
                            onClick={toggleTheme}
                            className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                        >
                            {theme === 'light' ? <MoonIcon className="w-4 h-4"/> : <SunIcon className="w-4 h-4"/>}
                        </button>
                    </div>

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
                            <button 
                                onClick={() => onLanguageChange('ka')}
                                className={`px-3 py-1.5 text-xs font-bold rounded border ${language === 'ka' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}
                            >
                                KA
                            </button>
                            <button 
                                onClick={() => onLanguageChange('es')}
                                className={`px-3 py-1.5 text-xs font-bold rounded border ${language === 'es' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}
                            >
                                ES
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white shadow-lg">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/30">
                            {currentUser ? currentUser.charAt(0).toUpperCase() : <UserCircleIcon className="w-10 h-10"/>}
                        </div>
                        <div>
                            <p className="text-sm opacity-80 uppercase tracking-wide">{t.set_user_name}</p>
                            <h3 className="text-2xl font-bold">{currentUser || "Guest User"}</h3>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{t.set_plan}</p>
                                <p className="text-xs text-gray-500">{t.set_plan_free}</p>
                            </div>
                            <span className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-full">
                                FREE
                            </span>
                        </div>
                        <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                            <CreditCardIcon className="w-4 h-4" />
                            {t.set_plan_upgrade}
                        </button>
                    </div>

                    {currentUser && (
                        <button 
                            onClick={() => { onLogout(); onClose(); }}
                            className="w-full py-3 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            <LogoutIcon className="w-5 h-5"/>
                            {t.set_logout}
                        </button>
                    )}
                </div>
            )}

            {/* DATA TAB */}
            {activeTab === 'data' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t.set_data_desc}</p>
                    
                    <button 
                        onClick={openImport}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-500 group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400">
                                <JsonImportIcon className="w-6 h-6"/>
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-purple-600 transition-colors">{t.imp_title}</p>
                                <p className="text-xs text-gray-500">{t.imp_desc}</p>
                            </div>
                        </div>
                    </button>

                    <button 
                        onClick={openExport}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                                <JsonExportIcon className="w-6 h-6"/>
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 transition-colors">{t.exp_title}</p>
                                <p className="text-xs text-gray-500">{t.exp_desc}</p>
                            </div>
                        </div>
                    </button>

                    <button 
                        onClick={openFileManager}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-orange-500 group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-600 dark:text-orange-400">
                                <DocumentIcon className="w-6 h-6"/>
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-orange-600 transition-colors">{t.fm_title}</p>
                                <p className="text-xs text-gray-500">{t.fm_files_server}</p>
                            </div>
                        </div>
                    </button>
                </div>
            )}

            {/* ABOUT / INFO TAB */}
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
                        <p className="text-xs text-gray-400">App Version 3.1.0</p>
                        <div className="flex justify-center gap-4 mt-2">
                             <a href="#" className="text-xs text-purple-600 hover:underline">Privacy Policy</a>
                             <a href="#" className="text-xs text-purple-600 hover:underline">Terms of Service</a>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
