import React, { useState, useRef, useEffect } from 'react';
import { Person, People } from '../types';
import { formatDate, calculateAge } from '../utils/dateUtils';
import { 
    EditIcon, DeleteIcon, PhoneIcon, EmailIcon, AddressIcon, 
    GlobeIcon, EllipsisVerticalIcon 
} from './Icons';

interface DetailsModalProps {
  person: Person | null;
  people: People;
  onClose: () => void;
  onEdit: (personId: string) => void;
  onDelete: (personId: string) => void;
  onNavigate: (personId: string) => void;
  onGoogleSearch: (person: Person) => void;
  onShowOnMap: (address: string) => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ person, people, onClose, onEdit, onDelete, onNavigate, onGoogleSearch, onShowOnMap }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const genderColor = person.gender === 'male' ? 'text-blue-500 dark:text-blue-400' : 'text-pink-500 dark:text-pink-400';
  const hasContactInfo = person.contactInfo && Object.values(person.contactInfo).some(Boolean);
  const fullName = `${person.firstName} ${person.lastName}`.trim();
  const exSpouses = person.exSpouseIds?.map(id => people[id]).filter(Boolean) || [];
  const age = calculateAge(person.birthDate, person.deathDate);

  const ActionButtons = ({ isMenu }: { isMenu?: boolean }) => (
    <>
      <button
        onClick={() => onGoogleSearch(person)}
        className={isMenu ? "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3" : "p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-black dark:hover:text-white transition-colors"}
        title="ინფორმაციის მოძიება Google-ში"
        aria-label={`${fullName}-ს შესახებ ინფორმაციის მოძიება`}
      >
        <GlobeIcon className="h-5 w-5" />
        {isMenu && <span>ძიება Google-ში</span>}
      </button>
      <button
        onClick={() => onEdit(person.id)}
        className={isMenu ? "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3" : "p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-black dark:hover:text-white transition-colors"}
        aria-label={`${fullName}-ს რედაქტირება`}
      >
        <EditIcon className="h-5 w-5" />
         {isMenu && <span>რედაქტირება</span>}
      </button>
      {person.id !== 'root' && (
         <button
            onClick={() => onDelete(person.id)}
            className={isMenu ? "w-full text-left px-4 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-3 text-red-600 dark:text-red-400" : "p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white transition-colors"}
            aria-label={`${fullName}-ს წაშლა`}
          >
            <DeleteIcon className="h-5 w-5" />
            {isMenu && <span>წაშლა</span>}
          </button>
      )}
    </>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between mb-4 gap-4">
          <div className="flex-1 min-w-0">
            <h2 id="details-modal-title" className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 break-words">
              {fullName}
            </h2>
            <p className={`capitalize font-semibold ${genderColor}`}>{person.gender === 'male' ? 'მამრობითი' : 'მდედრობითი'}</p>
          </div>
           <div className="flex items-center gap-2 flex-shrink-0">
            {/* Desktop Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <ActionButtons />
            </div>

            {/* Mobile Menu */}
            <div className="sm:hidden relative" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(prev => !prev)}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    aria-label="More actions"
                >
                    <EllipsisVerticalIcon className="h-5 w-5" />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-20 py-1">
                      <ActionButtons isMenu />
                    </div>
                )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-black dark:hover:text-white transition-colors"
              aria-label="დეტალების ფანჯრის დახურვა"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <main className="space-y-4 text-gray-700 dark:text-gray-300">
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
                  <strong>დაიბადა:</strong> {formatDate(person.birthDate)}
                  {!person.deathDate && age !== null && <span className="text-gray-500 dark:text-gray-400 ml-2">({age} წლის)</span>}
                </p>
              )}
              {person.deathDate && (
                 <p>
                    <strong>გარდაიცვალა:</strong> {formatDate(person.deathDate)}
                    {age !== null && <span className="text-gray-500 dark:text-gray-400 ml-2">({age} წლის ასაკში)</span>}
                 </p>
              )}
              {!person.birthDate && !person.deathDate && (
                <p className="text-gray-500">თარიღები უცნობია</p>
              )}
            </div>
          </div>
          
          {person.bio && (
            <div>
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">ბიოგრაფია</h3>
              <p className="whitespace-pre-wrap">{person.bio}</p>
            </div>
          )}

          {person.deathDate && person.cemeteryAddress && (
            <div>
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">სასაფლაოს მისამართი</h3>
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
                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">ყოფილი მეუღლეები</h3>
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
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">საკონტაქტო ინფორმაცია</h3>
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
                        title="რუკაზე ჩვენება"
                      >
                        {person.contactInfo.address}
                      </button>
                    </li>
                 )}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DetailsModal;
