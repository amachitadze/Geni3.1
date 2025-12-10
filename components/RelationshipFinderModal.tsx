
import React, { useState, useMemo } from 'react';
import { Person, People } from '../types';
import { findRelationshipPath } from '../utils/treeUtils';
import { CloseIcon, CalculatorIcon, ArrowRightIcon } from './Icons';
import { translations, Language } from '../utils/translations';

interface RelationshipFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: People;
  language: Language;
}

const RelationshipFinderModal: React.FC<RelationshipFinderModalProps> = ({ isOpen, onClose, people, language }) => {
  const t = translations[language];
  const [person1Id, setPerson1Id] = useState<string>('');
  const [person2Id, setPerson2Id] = useState<string>('');
  const [path, setPath] = useState<string[] | null>(null);
  const [isCalculated, setIsCalculated] = useState(false);

  const allPeople = useMemo(() => {
      return (Object.values(people) as Person[]).sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [people]);

  if (!isOpen) return null;

  const handleCalculate = () => {
      if (person1Id && person2Id) {
          const result = findRelationshipPath(person1Id, person2Id, people);
          setPath(result);
          setIsCalculated(true);
      }
  };

  const getRelationshipDescription = (id1: string, id2: string): string => {
      const p1 = people[id1];
      const p2 = people[id2];
      if (!p1 || !p2) return '';

      if (p1.spouseId === id2) return t.rel_type_spouse;
      if (p1.children.includes(id2)) return t.rel_type_parent;
      if (p1.parentIds.includes(id2)) return t.rel_type_child;
      if (p1.exSpouseIds?.includes(id2)) return t.rel_type_ex_spouse;
      
      // Sibling check (share at least one parent)
      const commonParent = p1.parentIds.find(pid => p2.parentIds.includes(pid));
      if (commonParent) return t.rel_type_sibling;

      return t.rel_type_relative;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-300 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <header className="flex items-start justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <CalculatorIcon className="w-6 h-6 text-purple-600"/>
                {t.rel_finder_title}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <CloseIcon className="w-6 h-6" />
            </button>
        </header>

        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">{t.rel_finder_desc}</p>

        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.rel_select_person_1}</label>
                    <select 
                        value={person1Id} 
                        onChange={(e) => { setPerson1Id(e.target.value); setIsCalculated(false); }}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                    >
                        <option value="">...</option>
                        {allPeople.map(p => (
                            <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.rel_select_person_2}</label>
                    <select 
                        value={person2Id} 
                        onChange={(e) => { setPerson2Id(e.target.value); setIsCalculated(false); }}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                    >
                        <option value="">...</option>
                        {allPeople.map(p => (
                            <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                        ))}
                    </select>
                </div>
            </div>

            <button 
                onClick={handleCalculate}
                disabled={!person1Id || !person2Id || person1Id === person2Id}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
            >
                {t.rel_calculate}
            </button>

            {isCalculated && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{t.rel_result}:</h3>
                    {path ? (
                        <div className="space-y-2">
                            {path.map((id, index) => {
                                if (index === path.length - 1) return null;
                                const nextId = path[index + 1];
                                const p1 = people[id];
                                const p2 = people[nextId];
                                return (
                                    <div key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-bold text-purple-600 dark:text-purple-400">{p1.firstName}</span>
                                        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                                        <span className="italic text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                                            {getRelationshipDescription(id, nextId)}
                                        </span>
                                        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                                        <span className="font-bold text-purple-600 dark:text-purple-400">{p2.firstName}</span>
                                    </div>
                                );
                            })}
                            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 text-center text-xs text-gray-500">
                                {t.rel_path}: {path.length - 1} steps
                            </div>
                        </div>
                    ) : (
                        <p className="text-red-500 text-sm">{t.rel_not_found}</p>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default RelationshipFinderModal;
