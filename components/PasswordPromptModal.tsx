import React, { useState } from 'react';
import { CloseIcon } from './Icons';
import { translations, Language } from '../utils/translations';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onSubmit: (password: string) => void;
  onClose: () => void;
  error?: string | null;
  isLoading: boolean;
  language: Language;
}

const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({ isOpen, onSubmit, onClose, error, isLoading, language }) => {
  const t = translations[language];
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onSubmit(password);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-300 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <header className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">{t.pwd_title}</h2>
          <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label={t.close}>
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">{t.pwd_desc}</p>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder={t.lbl_password}
            autoFocus
          />
          
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading || !password}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 text-white font-medium rounded-md transition-colors flex items-center gap-2"
            >
              {isLoading ? t.loading : t.btn_open_tree}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordPromptModal;