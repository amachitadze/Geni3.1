
import React, { useState, useEffect } from 'react';
import { encryptData, bufferToBase64 } from '../utils/crypto';
import { People } from '../types';
import { ShareIcon, CopyIcon, CloseIcon } from './Icons';
import { getSupabaseClient, getStoredSupabaseConfig } from '../utils/supabaseClient';
import { translations, Language } from '../utils/translations';

declare const pako: any;

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    people: People;
    rootIdStack: string[];
  };
  language: Language;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, data, language }) => {
  const t = translations[language];
  const [password, setPassword] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeImages, setIncludeImages] = useState(true);
  
  // Logic: Unchecked by default means NOT editable (Read Only). 
  // Checked means Editable.
  const [isEditable, setIsEditable] = useState(false);
  
  // Supabase Config State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  useEffect(() => {
      const config = getStoredSupabaseConfig();
      setSupabaseUrl(config.url);
      setSupabaseKey(config.key);
  }, []);

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

  const transliterate = (text: string) => {
    const map: Record<string, string> = {
      'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't',
      'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p', 'ჟ': 'zh',
      'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q',
      'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
    };
    return text.split('').map(char => map[char] || char).join('');
  };

  const handleGenerateLink = async () => {
    if (!password) {
      setError('Error: Password required');
      return;
    }
    if (!supabaseUrl || !supabaseKey) {
        setError('Server config missing');
        return;
    }

    setIsLoading(true);
    setError('');
    setShareUrl('');

    try {
      // 1. Prepare Data
      let dataToProcess: any = { ...data };
      
      if (!includeImages) {
          dataToProcess = removeImages(data);
      }
      
      if (!isEditable) {
          dataToProcess.readOnly = true;
      } else {
          dataToProcess.readOnly = false;
      }

      const fullJsonString = JSON.stringify(dataToProcess);
      const fullCompressed = pako.deflate(fullJsonString);
      const fullCompressedBase64 = bufferToBase64(fullCompressed.buffer);
      const encryptedData = await encryptData(fullCompressedBase64, password);
      
      const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
      
      const dateStr = new Date().toISOString().slice(0, 10);
      
      const rootPerson = data.people[data.rootIdStack[0]]; 
      const rawLastName = rootPerson?.lastName || 'Family';
      const latinLastName = transliterate(rawLastName).replace(/[^a-zA-Z0-9]/g, '');
      
      const randomId = Math.random().toString(36).substring(7);
      
      // Store in 'links/' folder
      const fileName = `links/share_${latinLastName || 'Tree'}_${dateStr}_${randomId}.txt`;
      const blob = new Blob([encryptedData], { type: 'text/plain' });
      
      const { error: uploadError } = await supabase
        .storage
        .from('shares') 
        .upload(fileName, blob, {
            contentType: 'text/plain',
            upsert: false
        });

      if (uploadError) {
          throw new Error(`Upload Error: ${uploadError.message}`);
      }

      const configParam = btoa(JSON.stringify({ u: supabaseUrl, k: supabaseKey }));
      const url = `${window.location.origin}${window.location.pathname}?sbId=${fileName}&cfg=${configParam}`;
      
      setShareUrl(url);

    } catch (e: any) {
      console.error("Link generation failed", e);
      setError(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <header className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">{t.share_title}</h2>
          <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Close">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
            {t.share_desc}
        </p>

        <div className="space-y-4">
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.share_step1}</label>
                <div className="flex gap-2">
                    <input type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
                    <button onClick={generatePassword} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 transition-colors text-sm">{t.share_generate}</button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.share_step2}</label>
                <div className="space-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="includeImages" 
                            checked={includeImages} 
                            onChange={(e) => setIncludeImages(e.target.checked)}
                            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="includeImages" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                            {t.share_with_images}
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="isEditable" 
                            checked={isEditable} 
                            onChange={(e) => setIsEditable(e.target.checked)}
                            className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="isEditable" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer flex items-center gap-2">
                            {t.share_editable}
                        </label>
                    </div>
                </div>
                
                <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded flex items-start gap-2">
                        <span className="text-yellow-600 dark:text-yellow-500 text-lg">⚠️</span>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-snug">
                            {t.share_warning}
                        </p>
                </div>

                <button onClick={handleGenerateLink} disabled={isLoading || !password} className="w-full px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-white">
                    {isLoading ? t.loading : <><ShareIcon className="w-5 h-5"/> {t.btn_create_link}</>}
                </button>
                {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
            </div>

            {shareUrl && (
                <div className="space-y-4 pt-4 border-t border-gray-300 dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lbl_share_link}</label>
                        <div className="flex gap-2">
                            <input type="text" readOnly value={shareUrl} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 text-sm" />
                            <button onClick={() => copyToClipboard(shareUrl)} className="p-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 transition-colors"><CopyIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lbl_password}</label>
                        <div className="flex gap-2">
                            <input type="text" readOnly value={password} className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300" />
                            <button onClick={() => copyToClipboard(password)} className="p-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 transition-colors"><CopyIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
