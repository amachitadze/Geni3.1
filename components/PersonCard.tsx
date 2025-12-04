import React from 'react';
import { Person, Gender } from '../types';
import { PlusIcon, AncestorsIcon, DefaultAvatar } from './Icons';

interface PersonCardProps {
  person: Person;
  onAdd: (personId: string) => void;
  onEdit: (personId: string) => void;
  onShowDetails: (personId: string) => void;
  onNavigate: (personId: string) => void;
  isHighlighted?: boolean;
  isConnectionHighlighted?: boolean;
  isHoverConnected?: boolean;
  onSetHover: (personId: string | null) => void;
  viewMode: 'default' | 'compact';
}

const genderStyles = {
  [Gender.Male]: {
    bg: 'bg-blue-50 dark:bg-blue-900/50',
    border: 'border-blue-300 dark:border-blue-500',
    button: 'bg-blue-500 hover:bg-blue-600 text-white',
    buttonCompact: 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-blue-200',
  },
  [Gender.Female]: {
    bg: 'bg-pink-50 dark:bg-pink-900/50',
    border: 'border-pink-300 dark:border-pink-500',
    button: 'bg-pink-500 hover:bg-pink-600 text-white',
    buttonCompact: 'bg-pink-100 hover:bg-pink-200 text-pink-700 dark:bg-pink-800 dark:hover:bg-pink-700 dark:text-pink-200',
  },
};

const PersonCard: React.FC<PersonCardProps> = ({ person, onAdd, onShowDetails, onNavigate, isHighlighted, isConnectionHighlighted, isHoverConnected, onSetHover, viewMode }) => {
  const styles = genderStyles[person.gender];
  const fullName = `${person.firstName} ${person.lastName}`;

  const getYear = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.getFullYear();
  }

  const birthYear = getYear(person.birthDate);
  const deathYear = getYear(person.deathDate);
  
  const isDeceased = !!person.deathDate;
  
  const highlightClass = isHighlighted ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : '';
  const connectionHighlightClass = isConnectionHighlighted && !isHighlighted ? 'ring-4 ring-purple-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : '';
  const hoverConnectClass = isHoverConnected && !isHighlighted && !isConnectionHighlighted ? 'ring-2 ring-purple-400' : '';
  const deceasedClass = isDeceased && !isHighlighted && !isConnectionHighlighted && !isHoverConnected ? 'opacity-75 filter grayscale-[80%]' : '';

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowDetails(person.id);
  };

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onAdd(person.id);
  };

  const handleNavigateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // canNavigateToAncestors ensures parentIds exists.
    // We navigate to the parent's view, which will display all their children (i.e., this person and their siblings).
    onNavigate(person.parentIds[0]);
  };

  const canNavigateToAncestors = person.parentIds && person.parentIds.length > 0 && person.id !== 'root';

  if (viewMode === 'compact') {
      return (
        <div 
            data-person-id={person.id}
            onClick={handleCardClick}
            onMouseEnter={() => onSetHover(person.id)}
            onMouseLeave={() => onSetHover(null)}
            className={`w-56 p-2 rounded-xl shadow-md flex items-center cursor-pointer transition-all duration-300 transform hover:scale-105 ${styles.bg} border ${styles.border} ${highlightClass} ${connectionHighlightClass} ${hoverConnectClass} ${deceasedClass}`}
        >
            <div className="flex-shrink-0">
                {person.imageUrl ? (
                    <img src={person.imageUrl} alt={fullName} className="w-12 h-12 object-cover rounded-full border-2 border-gray-300 dark:border-gray-500" />
                ) : (
                    <DefaultAvatar className="w-12 h-12 border-2 border-gray-300 dark:border-gray-600"/>
                )}
            </div>
            <div className="flex-grow ml-3 text-left w-0">
                <div className="font-bold text-sm leading-tight truncate text-gray-800 dark:text-gray-100">
                  {person.firstName}
                </div>
                <div className="font-semibold text-sm leading-tight truncate text-gray-700 dark:text-gray-200">
                  {person.lastName}
                </div>
            </div>
             {canNavigateToAncestors && (
                <div className="flex-shrink-0 ml-2 person-card-buttons">
                    <button
                        onClick={handleNavigateClick}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${styles.buttonCompact}`}
                        title="წინაპრების ნახვა"
                        aria-label={`${fullName}-ს წინაპრების ნახვა`}
                    >
                        <AncestorsIcon className="w-4 h-4" />
                    </button>
                </div>
              )}
        </div>
      );
  }

  return (
    <div 
        data-person-id={person.id}
        onClick={handleCardClick}
        onMouseEnter={() => onSetHover(person.id)}
        onMouseLeave={() => onSetHover(null)}
        className={`person-card-default-view w-auto min-w-56 p-3 rounded-xl shadow-lg flex flex-col items-center cursor-pointer transition-all duration-300 transform hover:scale-105 ${styles.bg} border ${styles.border} ${highlightClass} ${connectionHighlightClass} ${hoverConnectClass} ${deceasedClass}`}
        style={{ minHeight: '14rem' }} 
    >
      <div className="text-center w-full text-gray-800 dark:text-gray-100">
        {person.imageUrl ? (
            <img src={person.imageUrl} alt={fullName} className="w-16 h-16 object-cover rounded-full mx-auto border-2 border-gray-300 dark:border-gray-500" />
        ) : (
            <DefaultAvatar className="w-16 h-16 mx-auto border-2 border-gray-300 dark:border-gray-600"/>
        )}
        <div className="person-card-text-container font-bold text-lg mt-2 leading-tight">
          <span className="block">{person.firstName}</span>
          {person.lastName && <span className="block">{person.lastName}</span>}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 h-4">
          {(birthYear || deathYear) && (
            <span>
              {birthYear || '?'} - {deathYear || ''}
            </span>
          )}
        </div>
      </div>
      <div className="mt-auto w-full pt-2 flex items-stretch gap-2 person-card-buttons">
        <button 
          onClick={handleAddButtonClick}
          className={`w-full flex-grow text-xs py-1.5 px-2 rounded-md flex items-center justify-center gap-1 transition-colors ${styles.button}`}
          aria-label={`${fullName}-თვის ნათესავის დამატება`}
          title="დაამატე ნათესავი"
        >
          <PlusIcon className="w-3 h-3"/> დამატება
        </button>
        {canNavigateToAncestors && (
            <button
                onClick={handleNavigateClick}
                className={`flex-shrink-0 p-2 rounded-md transition-colors ${styles.button}`}
                title="წინაპრების ნახვა"
                aria-label={`${fullName}-ს წინაპრების ნახვა`}
            >
                <AncestorsIcon className="w-4 h-4" />
            </button>
        )}
      </div>
    </div>
  );
};

export default PersonCard;