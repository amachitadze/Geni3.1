

import React, { useState, useRef, useEffect } from 'react';
import { Person, People } from '../types';
import { formatDate, calculateAge } from '../utils/dateUtils';
import { 
    EditIcon, DeleteIcon, PhoneIcon, EmailIcon, AddressIcon, 
    GlobeIcon, EllipsisVerticalIcon, CloseIcon, MagicWandIcon, InfoIcon, PhotoIcon
} from './Icons';
import { translations, Language } from '../utils/translations';
import MediaGallery from './MediaGallery';

// Just reusing CheckIcon for save visual
import { CheckIcon } from './Icons';

interface DetailsModalProps {
  person: Person | null;
  people: People;
  onClose: () => void;
  onEdit: (personId: string) => void;
  onDelete: (personId: string) => void;
  onNavigate: (personId: string) => void;
  onGoogleSearch: (person: Person) => void;
  onShowOnMap: (address: string) => void;
  isReadOnly?: boolean;
  language: Language;
  onGenerateBio?: (person: Person, people: People) => Promise<string>;
  onSaveBio?: (personId: string, bio: string) => void;
  onUpdateGallery?: (personId: string, gallery: string[]) => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ 
    person, people, onClose, onEdit, onDelete, onNavigate, 
    onGoogleSearch, onShowOnMap, isReadOnly, language,
    onGenerateBio, onSaveBio, onUpdateGallery
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [generatedBio, setGeneratedBio] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'gallery'>('info');
  
  const menuRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!person) return null;

  const handleGenerateBio = async () => {
      if (!onGenerateBio) return;
      setIsGeneratingBio(true);
      setGeneratedBio(null);
      try {
          const bio = await onGenerateBio(person, people);
          setGeneratedBio(bio);
      } catch (e) {
          alert(t.ai_bio_error);
      } finally {
          setIsGeneratingBio(false);
      }
  };

  const handleSaveGeneratedBio = () => {
      if (generatedBio && onSaveBio) {
          onSaveBio(person.id, generatedBio);
          setGeneratedBio(null); // Clear preview after save
      }
  };

  const genderColor = person.gender === 'male' ? 'text-blue-500 dark:text-blue-400' : 'text-pink-500 dark:text-pink-400';
  const hasContactInfo = person.contactInfo && Object.values(person.contactInfo).some(Boolean);
  const fullName = `${person.firstName} ${person.lastName}`.trim();
  const exSpouses = person.exSpouseIds?.map(id => people[id]).filter(Boolean) || [];
  const age = calculateAge(person.birthDate, person.deathDate);

  const renderActionButtons = (isMenu?: boolean) => (
    <React.Fragment>
      <button
        onClick={() => onGoogleSearch(person)}
        className={isMenu ? "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3" : "p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-black dark:hover:text-white transition-colors"}
        title={t.btn_google_search}
        aria-label={t.btn_google_search}
      >
        <GlobeIcon className="h-5 w-5" />
        {isMenu && <span>{t.btn_google_search}</span>}
      </button>

      {!isReadOnly && (
        <React.Fragment>
          <button
            onClick={() => onEdit(person.id)}
            className={isMenu ? "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3" : "p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-black dark:hover:text-white transition-colors"}
            aria-label={t.edit}
            title={t.edit}
          >
            <EditIcon className="h-5 w-5" />
            {isMenu && <span>{t.edit}</span>}
          </button>
          {person.id !== 'root' && (
             <button
                onClick={() => onDelete(person.id)}
                className={isMenu ? "w-full text-left px-4 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-3 text-red-600 dark:text-red-400" : "p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white transition-colors"}
                aria-label={t.delete}
                title={t.delete}
              >
                <DeleteIcon className="h-5 w-5" />
                {isMenu && <span>{t.delete}</span>}
              </button>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-300 dark:border-gray-700 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 pb-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 break-words">
                    {fullName}
                    </h2>
                    <p className={`capitalize font-semibold ${genderColor}`}>{person.gender === 'male' ? t.lbl_male : t.lbl_female}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Desktop Buttons */}
                    <div className="hidden sm:flex items-center gap-2">
                    {renderActionButtons()}
                    </div>

                    {/* Mobile Menu */}
                    <div className="sm:hidden relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(prev => !prev)}
                            className="p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            <EllipsisVerticalIcon className="h-5 w-5" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-20 py-1">
                            {renderActionButtons(true)}
                            </div>
                        )}
                    </div>

                    <button
                    onClick={onClose}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-black dark:hover:text-white transition-colors"
                    >
                    <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mt-6">
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'info' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                    <InfoIcon className="w-4 h-4" />
                    {t.tab_info}
                </button>
                <button 
                    onClick={() => setActiveTab('gallery')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'gallery' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                    <PhotoIcon className="w-4 h-4" />
                    {t.tab_gallery}
                </button>
            </div>
        </header>

        <div className="p-6 overflow-y-auto flex-grow">
            {activeTab === 'info' ? (
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                        {person.imageUrl ? (
                        <img src={person.imageUrl} alt={fullName} className="w-32 h-32 object-cover rounded-full border-2 border-purple-400 dark:border-purple-500 flex-shrink-0" />
                        ) : (
                        <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        )}
                        <div className="text-center sm:text-left">
                        {person.birthDate && (
                            <p>
                            <strong>{t.det_born}:</strong> {formatDate(person.birthDate)}
                            {!person.deathDate && age !== null && <span className="text-gray-500 dark:text-gray-400 ml-2">({age} {t.det_years})</span>}
                            </p>
                        )}
                        {person.deathDate && (
                            <p>
                                <strong>{t.det_died}:</strong> {formatDate(person.deathDate)}
                                {age !== null && <span className="text-gray-500 dark:text-gray-400 ml-2">({t.det_age_at_death} {age})</span>}
                            </p>
                        )}
                        {!person.birthDate && !person.deathDate && (
                            <p className="text-gray-500">{t.det_unknown}</p>
                        )}
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">
                            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">{t.det_bio}</h3>
                            {!isReadOnly && onGenerateBio && (
                                <button 
                                    onClick={handleGenerateBio} 
                                    disabled={isGeneratingBio}
                                    className="text-xs flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-200 transition-colors disabled:opacity-50"
                                >
                                    {isGeneratingBio ? (
                                        <span className="animate-pulse">{t.ai_bio_loading}</span>
                                    ) : (
                                        <>
                                            <MagicWandIcon className="w-3 h-3" /> {t.btn_ai_bio}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        
                        {generatedBio && (
                            <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md animate-fade-in-up">
                                <p className="whitespace-pre-wrap text-sm italic">{generatedBio}</p>
                                <div className="mt-2 flex justify-end gap-2">
                                    <button onClick={() => setGeneratedBio(null)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">{t.cancel}</button>
                                    <button onClick={handleSaveGeneratedBio} className="text-xs flex items-center gap-1 bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700">
                                        <CheckIcon className="w-3 h-3"/> {t.save}
                                    </button>
                                </div>
                            </div>
                        )}

                        {person.bio ? (
                            <p className="whitespace-pre-wrap">{person.bio}</p>
                        ) : (
                            !generatedBio && <p className="text-gray-400 italic text-sm">...</p>
                        )}
                    </div>

                    {person.deathDate && person.cemeteryAddress && (
                        <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">{t.det_cemetery}</h3>
                        <div className="flex items-start gap-3 mt-2">
                            <AddressIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-1" />
                            {person.cemeteryAddress.startsWith('http') ? (
                            <a 
                                href={person.cemeteryAddress} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-purple-600 dark:text-purple-400 hover:underline"
                            >
                                {person.cemeteryAddress}
                            </a>
                            ) : (
                            <p>{person.cemeteryAddress}</p>
                            )}
                        </div>
                        </div>
                    )}
                    
                    {exSpouses.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">{t.det_ex_spouses}</h3>
                            <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700 dark:text-gray-300">
                                {exSpouses.map(ex => (
                                    <li key={ex.id}>
                                    <button 
                                            onClick={() => onNavigate(ex.id)} 
                                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:underline focus:outline-none"
                                        >
                                            {ex.firstName} {ex.lastName}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {hasContactInfo && (
                        <div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">{t.det_contact}</h3>
                        <ul className="space-y-2 mt-2">
                            {person.contactInfo?.phone && (
                            <li className="flex items-center gap-3">
                                <PhoneIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" /> 
                                <span>{person.contactInfo.phone}</span>
                            </li>
                            )}
                            {person.contactInfo?.email && (
                            <li className="flex items-center gap-3">
                                <EmailIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" /> 
                                <span>{person.contactInfo.email}</span>
                            </li>
                            )}
                            {person.contactInfo?.address && (
                                <li className="flex items-start gap-3">
                                <AddressIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-1" /> 
                                <button
                                    onClick={() => onShowOnMap(person.contactInfo!.address!)}
                                    className="text-left whitespace-pre-wrap text-purple-600 dark:text-purple-400 hover:underline focus:outline-none"
                                    title="Map"
                                >
                                    {person.contactInfo.address}
                                </button>
                                </li>
                            )}
                        </ul>
                        </div>
                    )}
                </div>
            ) : (
                // GALLERY TAB
                <MediaGallery 
                    personId={person.id}
                    gallery={person.gallery || []}
                    onUpdate={(newGallery) => onUpdateGallery?.(person.id, newGallery)}
                    readOnly={!!isReadOnly}
                    language={language}
                />
            )}
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;