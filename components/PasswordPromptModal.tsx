import React, { useState } from 'react';
import { CloseIcon } from './Icons';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onSubmit: (password: string) => void;
  onClose: () => void;
  error?: string | null;
  isLoading: boolean;
}

const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({ isOpen, onSubmit, onClose, error, isLoading }) => {
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
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">დაშიფრული ხის გახსნა</h2>
          <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="დახურვა">
             <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        <p className="text-gray-600 dark:text-gray-400 mb-4">ამ გენეალოგიური ხის სანახავად, გთხოვთ, შეიყვანოთ პაროლი.</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="share-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">პაროლი</label>
              <input 
                type="password" 
                id="share-password"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" 
                required 
                autoFocus
              />
            </div>
             {error && <p className="text-red-500 dark:text-red-400 text-sm -mt-2">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors text-white">
              {isLoading ? 'იტვირთება...' : 'ხის გახსნა'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordPromptModal;