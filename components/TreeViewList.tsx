import React from 'react';
import { Person, People, Gender } from '../types';
import { ChevronRightIcon, DefaultAvatar } from './Icons';

interface TreeViewListProps {
  rootId: string;
  people: People;
  onNavigate: (personId: string) => void;
  onShowDetails: (personId: string) => void;
  highlightedPersonId: string | null;
}

const ListItem: React.FC<{ 
    person: Person, 
    onNavigate: (id: string) => void, 
    onShowDetails: (id: string) => void,
    isHighlighted: boolean, 
    isSpouse?: boolean 
}> = ({ person, onNavigate, onShowDetails, isHighlighted, isSpouse }) => {
    // Show navigation arrow if person has children OR has a spouse.
    // This allows navigating to a childless couple to see the spouse.
    const showNavigation = (person.children && person.children.length > 0) || person.spouseId;
    
    const isDeceased = !!person.deathDate;
    
    const highlightClass = isHighlighted 
        ? 'bg-purple-100 dark:bg-purple-900/50' 
        : 'bg-gray-50 dark:bg-gray-800/50';
    
    const genderBorderClass = person.gender === Gender.Male 
        ? 'border-l-blue-400 dark:border-l-blue-500' 
        : 'border-l-pink-400 dark:border-l-pink-500';
    
    const deceasedClass = isDeceased && !isHighlighted ? 'opacity-70 grayscale-[60%]' : '';

    const getYear = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Return as is if just a year
        return date.getFullYear();
    }
    const birthYear = getYear(person.birthDate);
    const deathYear = getYear(person.deathDate);
    const lifeRange = (birthYear || deathYear) ? `(${birthYear || '?'} - ${deathYear || ''})` : '';

    const handleNavigateClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onNavigate(person.id);
    };

    return (
        <li className="list-none">
            <div className={`w-full flex items-stretch rounded-lg text-left transition-all duration-200 border-l-4 overflow-hidden ${genderBorderClass} ${highlightClass} ${deceasedClass}`}>
                {/* Details Area */}
                <div
                    onClick={() => onShowDetails(person.id)}
                    className="flex-grow flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
                    role="button"
                    aria-label={`View details for ${person.firstName} ${person.lastName}`}
                >
                    {person.imageUrl ? (
                        <img src={person.imageUrl} alt={`${person.firstName} ${person.lastName}`} className="w-12 h-12 object-cover rounded-full flex-shrink-0" />
                    ) : (
                        <DefaultAvatar className="w-12 h-12 flex-shrink-0"/>
                    )}
                    <div className="flex-grow w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {person.firstName} {person.lastName}
                            {isSpouse && <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(მეუღლე)</span>}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{lifeRange}</p>
                    </div>
                </div>

                {/* Navigation Area */}
                {showNavigation && (
                    <button 
                        onClick={handleNavigateClick} 
                        className="group flex-shrink-0 flex items-center justify-center px-4 relative hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                        aria-label={`Navigate to ${person.firstName} ${person.lastName}'s family`}
                    >
                        {/* Vertical Separator */}
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-px bg-gray-200 dark:bg-gray-700/50 transition-colors group-hover:bg-gray-300 dark:group-hover:bg-gray-600"></div>
                        
                        <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-all duration-200 group-hover:translate-x-0.5" />
                    </button>
                )}
            </div>
        </li>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="px-3 py-1 text-sm font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 mb-2">
            {title}
        </h3>
        <ul className="space-y-1">
            {children}
        </ul>
    </div>
);

const TreeViewList: React.FC<TreeViewListProps> = ({ rootId, people, onNavigate, onShowDetails, highlightedPersonId }) => {
  const rootPerson = people[rootId];

  if (!rootPerson) {
    return <div className="p-4 text-center text-gray-500">პიროვნება ვერ მოიძებნა.</div>;
  }

  const parents = rootPerson.parentIds.map(id => people[id]).filter(Boolean);
  const spouse = rootPerson.spouseId ? people[rootPerson.spouseId] : null;
  const children = rootPerson.children.map(id => people[id]).filter(Boolean);

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-4">
        {parents.length > 0 && (
            <Section title="მშობლები">
                {parents.map(p => (
                    <ListItem 
                        key={p.id} 
                        person={p} 
                        onNavigate={onNavigate} 
                        onShowDetails={onShowDetails}
                        isHighlighted={p.id === highlightedPersonId} 
                    />
                ))}
            </Section>
        )}

        <Section title="ოჯახი">
            <ListItem 
                person={rootPerson} 
                onNavigate={onNavigate} 
                onShowDetails={onShowDetails}
                isHighlighted={rootPerson.id === highlightedPersonId}
            />
            {spouse && (
                <ListItem 
                    key={spouse.id} 
                    person={spouse} 
                    onNavigate={onNavigate} 
                    onShowDetails={onShowDetails}
                    isHighlighted={spouse.id === highlightedPersonId}
                    isSpouse
                />
            )}
        </Section>
        
        {children.length > 0 && (
            <Section title="შვილები">
                 {children.map(c => (
                    <ListItem 
                        key={c.id} 
                        person={c} 
                        onNavigate={onNavigate} 
                        onShowDetails={onShowDetails}
                        isHighlighted={c.id === highlightedPersonId}
                    />
                ))}
            </Section>
        )}
    </div>
  );
};

export default TreeViewList;