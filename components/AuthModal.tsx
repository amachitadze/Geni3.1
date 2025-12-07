
import React, { useState, useEffect } from 'react';
import { CloseIcon, GoogleIcon, FacebookIcon, CheckIcon } from './Icons';
import { translations, Language } from '../utils/translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (name?: string) => void;
  language: Language;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, language }) => {
  const t = translations[language];
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setIsLogin(true);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setShowSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
        setIsLoading(false);
        setShowSuccess(true);
        
        // Simulate redirect/success delay
        setTimeout(() => {
            onLoginSuccess(fullName || "User");
            onClose();
        }, 1500);
    }, 1500);
  };

  const inputClasses = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
        <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-200 dark:border-gray-700" 
            onClick={e => e.stopPropagation()}
        >
            {/* Success Overlay */}
            {showSuccess && (
                <div className="absolute inset-0 z-10 bg-white dark:bg-gray-800 flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                        <CheckIcon className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.auth_success}</h3>
                </div>
            )}

            {/* Header Image/Gradient */}
            <div className="h-32 bg-gradient-to-r from-purple-600 to-pink-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
                <div className="absolute top-4 right-4">
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-md">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="absolute bottom-4 left-6">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {isLogin ? t.auth_login : t.auth_register}
                    </h2>
                    <p className="text-purple-100 text-sm">
                        {isLogin ? t.auth_login_link : t.auth_signup_link}
                    </p>
                </div>
            </div>

            <div className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {!isLogin && (
                        <div className="animate-fade-in-up">
                            <label className={labelClasses}>{t.auth_name}</label>
                            <input 
                                type="text" 
                                required 
                                className={inputClasses}
                                placeholder="John Doe"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label className={labelClasses}>{t.auth_email}</label>
                        <input 
                            type="email" 
                            required 
                            className={inputClasses} 
                            placeholder="name@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>{t.auth_password}</label>
                        <input 
                            type="password" 
                            required 
                            className={inputClasses}
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                         {isLogin && (
                            <div className="flex justify-end mt-1">
                                <a href="#" className="text-xs text-purple-600 dark:text-purple-400 hover:underline">{t.auth_forgot}</a>
                            </div>
                        )}
                    </div>

                    {!isLogin && (
                        <div className="animate-fade-in-up">
                            <label className={labelClasses}>{t.auth_confirm_password}</label>
                            <input 
                                type="password" 
                                required 
                                className={inputClasses}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            isLogin ? t.auth_login : t.auth_register
                        )}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-4">
                    <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t.auth_or}</span>
                    <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors bg-white dark:bg-gray-800">
                        <GoogleIcon className="w-5 h-5" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Google</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors bg-white dark:bg-gray-800">
                        <FacebookIcon className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Facebook</span>
                    </button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                    {isLogin ? t.auth_no_account : t.auth_have_account}{" "}
                    <button 
                        onClick={() => setIsLogin(!isLogin)} 
                        className="font-bold text-purple-600 dark:text-purple-400 hover:underline focus:outline-none"
                    >
                        {isLogin ? t.auth_signup_link : t.auth_login_link}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AuthModal;
