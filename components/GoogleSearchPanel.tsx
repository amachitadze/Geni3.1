import React from 'react';
import { CloseIcon, SearchIcon, GlobeIcon } from './Icons';
import { translations, Language } from '../utils/translations';

interface GoogleSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: () => void;
  query: string;
  setQuery: (query: string) => void;
  result: string | null;
  sources: any[];
  isLoading: boolean;
  error: string | null;
  language: Language;
}

const GoogleSearchPanel: React.FC<GoogleSearchPanelProps> = ({ isOpen, onClose, onSearch, query, setQuery, result, sources, isLoading, error, language }) => {
  const t = translations[language];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <GlobeIcon className="w-6 h-6 text-purple-500" />
              {t.search_history_title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label={t.close}
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </header>

          <div className="p-4 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.search_placeholder_example}
                className="w-full h-12 pl-4 pr-20 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={onSearch}
                disabled={isLoading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors text-white text-sm font-semibold flex items-center gap-2"
              >
                <SearchIcon className="w-4 h-4" />
                <span>{t.search}</span>
              </button>
            </div>
          </div>

          <div className="flex-grow p-4 overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                 <p>{t.search_searching}</p>
              </div>
            )}
            {error && (
              <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300">
                <p><strong>Error:</strong> {error}</p>
              </div>
            )}
            {result && (
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                 <p className="whitespace-pre-wrap">{result}</p>
              </div>
            )}
             {sources.length > 0 && (
                <div className="mt-6">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">{t.search_sources}</h3>
                    <ul className="space-y-2">
                        {sources.map((source, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-gray-500 dark:text-gray-400">{index + 1}.</span>
                                <a 
                                    href={source.web?.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-purple-600 dark:text-purple-400 hover:underline text-sm truncate"
                                    title={source.web?.uri}
                                >
                                    {source.web?.title || source.web?.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {!isLoading && !result && !error && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                    <p className="mb-2">{t.search_empty_desc}</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GoogleSearchPanel;