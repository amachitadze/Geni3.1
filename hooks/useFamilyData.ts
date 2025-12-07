import { useState, useEffect, useCallback } from 'react';
import { Person, People, Gender, Relationship } from '../types';

export const useFamilyData = (resetTransform: () => void) => {
  const [people, setPeople] = useState<People>({});
  const [rootIdStack, setRootIdStack] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'default' | 'compact' | 'list' | 'timeline' | 'map'>(() => {
    const savedViewMode = localStorage.getItem('familyTreeViewMode') as any;
    if (savedViewMode) return savedViewMode;
    return window.innerWidth < 768 ? 'list' : 'default';
  });

  const rootId = rootIdStack[rootIdStack.length - 1];

  // Load from LocalStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('familyTree');
      const savedLastUpdated = localStorage.getItem('familyTreeLastUpdated');
      setLastUpdated(savedLastUpdated);

      if (savedData) {
        const { people: savedPeople, rootIdStack: savedRootIdStack } = JSON.parse(savedData);
        if (savedPeople && Object.keys(savedPeople).length > 0) {
            setPeople(savedPeople);
            setRootIdStack(savedRootIdStack || ['root']);
        } else {
            setPeople({});
            setRootIdStack([]);
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setPeople({});
      setRootIdStack([]);
    } finally {
      setIsInitialLoad(false);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isInitialLoad || isReadOnly) return;
    try {
      const dataToSave = JSON.stringify({ people, rootIdStack });
      const timestamp = new Date().toISOString();
      localStorage.setItem('familyTree', dataToSave);
      localStorage.setItem('familyTreeViewMode', viewMode);
      localStorage.setItem('familyTreeLastUpdated', timestamp);
      setLastUpdated(timestamp);
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  }, [people, rootIdStack, viewMode, isInitialLoad, isReadOnly]);

  const navigateTo = useCallback((personId: string) => {
    resetTransform();
    setRootIdStack(prev => {
        if (prev.length > 0 && prev[prev.length - 1] === personId) {
            return prev;
        }
        return [...prev, personId];
    });
  }, [resetTransform]);

  const navigateBack = useCallback(() => {
    resetTransform();
    if (rootIdStack.length > 1) {
      setRootIdStack(prev => prev.slice(0, -1));
    }
  }, [rootIdStack, resetTransform]);

  const navigateToHome = useCallback(() => {
    resetTransform();
    setRootIdStack(['root']);
  }, [resetTransform]);

  const handleDeletePerson = useCallback((personIdToDelete: string) => {
    if (isReadOnly) return;
    if (personIdToDelete === 'root') {
        alert("ხის დამფუძნებლის წაშლა შეუძლებელია.");
        return;
    }
    if (!window.confirm("დარწმუნებული ხართ, რომ გსურთ ამ პიროვნების წაშლა?")) {
        return;
    }

    const newPeople = JSON.parse(JSON.stringify(people));
    const personToDelete = newPeople[personIdToDelete];
    if (!personToDelete) return;

    // Clean up relationships
    if (personToDelete.spouseId) {
        const spouse = newPeople[personToDelete.spouseId];
        if (spouse) spouse.spouseId = undefined;
    }
    if (personToDelete.exSpouseIds) {
        personToDelete.exSpouseIds.forEach((exSpouseId: string) => {
            const exSpouse = newPeople[exSpouseId];
            if (exSpouse && exSpouse.exSpouseIds) {
                exSpouse.exSpouseIds = exSpouse.exSpouseIds.filter((id: string) => id !== personIdToDelete);
            }
        });
    }
    personToDelete.parentIds.forEach((parentId: string) => {
        const parent = newPeople[parentId];
        if (parent) parent.children = parent.children.filter((childId: string) => childId !== personIdToDelete);
    });
    personToDelete.children.forEach((childId: string) => {
        const child = newPeople[childId];
        if (child) child.parentIds = child.parentIds.filter((parentId: string) => parentId !== personIdToDelete);
    });
    
    delete newPeople[personIdToDelete];
    
    const newStack = rootIdStack.filter(id => id !== personIdToDelete);
    if (Object.keys(newPeople).length === 0) {
        setPeople({});
        setRootIdStack([]);
    } else {
        setPeople(newPeople);
        setRootIdStack(newStack.length === 0 ? ['root'] : newStack);
    }
  }, [people, rootIdStack, isReadOnly]);


  const handlePersonUpdate = useCallback((
    action: 'add' | 'edit',
    personId: string,
    formData: Partial<{ firstName: string; lastName: string; gender: Gender; }>,
    details: any,
    relationship?: Relationship,
    existingPersonId?: string
  ) => {
    let postSubmitAction: (() => void) | null = null;

    setPeople(currentPeople => {
        const updatedPeople = { ...currentPeople };
        const contactInfoToSave = {
            phone: details.contactInfo?.phone || undefined,
            email: details.contactInfo?.email || undefined,
            address: details.contactInfo?.address || undefined,
        };

        if (action === 'edit') {
            const targetPerson = updatedPeople[personId];
            updatedPeople[personId] = {
                ...targetPerson,
                ...formData,
                birthDate: details.birthDate || undefined,
                birthPlace: details.birthPlace || undefined,
                deathDate: details.deathDate || undefined,
                deathPlace: details.deathPlace || undefined,
                imageUrl: details.imageUrl || undefined,
                contactInfo: contactInfoToSave,
                bio: details.bio || undefined,
                cemeteryAddress: details.cemeteryAddress || undefined,
            };
        } else if (action === 'add' && relationship) {
            const anchorPerson = updatedPeople[personId];
            const newPersonDetails = {
                birthDate: details.birthDate || undefined,
                birthPlace: details.birthPlace || undefined,
                deathDate: details.deathDate || undefined,
                deathPlace: details.deathPlace || undefined,
                imageUrl: details.imageUrl || undefined,
                contactInfo: contactInfoToSave,
                bio: details.bio || undefined,
                cemeteryAddress: details.cemeteryAddress || undefined,
            };

            const createNewPerson = (id: string) => ({ 
                id, 
                ...formData, 
                children: [], 
                parentIds: [], 
                exSpouseIds: [], 
                ...newPersonDetails 
            } as Person);

            switch (relationship) {
                case 'spouse': {
                    if (existingPersonId) {
                        const newSpouse = updatedPeople[existingPersonId];
                        updatedPeople[personId] = { ...anchorPerson, spouseId: existingPersonId, exSpouseIds: (anchorPerson.exSpouseIds || []).filter(id => id !== existingPersonId) };
                        updatedPeople[existingPersonId] = { ...newSpouse, spouseId: personId, exSpouseIds: (newSpouse.exSpouseIds || []).filter(id => id !== personId) };
                    } else {
                        const newPersonId = `person_${Date.now()}`;
                        updatedPeople[newPersonId] = { ...createNewPerson(newPersonId), spouseId: personId };
                        
                        let updatedAnchorPerson = { ...anchorPerson, spouseId: newPersonId };
                        const oldSpouseId = anchorPerson.spouseId;
                        if (oldSpouseId && updatedPeople[oldSpouseId]) {
                            const oldSpouse = updatedPeople[oldSpouseId];
                            updatedPeople[oldSpouseId] = { ...oldSpouse, spouseId: undefined, exSpouseIds: [...(oldSpouse.exSpouseIds || []), personId] };
                            updatedAnchorPerson.exSpouseIds = [...(anchorPerson.exSpouseIds || []), oldSpouseId];
                        }
                        updatedPeople[personId] = updatedAnchorPerson;
                    }
                    break;
                }
                case 'child': {
                    const newPersonId = `person_${Date.now()}`;
                    const parentIdsForChild = [personId];
                    if (anchorPerson.spouseId) parentIdsForChild.push(anchorPerson.spouseId);
                    
                    updatedPeople[newPersonId] = { ...createNewPerson(newPersonId), parentIds: parentIdsForChild };
                    updatedPeople[personId] = { ...anchorPerson, children: [...anchorPerson.children, newPersonId] };

                    if (anchorPerson.spouseId) {
                        const parent2 = updatedPeople[anchorPerson.spouseId];
                        updatedPeople[anchorPerson.spouseId] = { ...parent2, children: [...parent2.children, newPersonId] };
                    }
                    break;
                }
                case 'parent': {
                    const newPersonId = `person_${Date.now()}`;
                    const childPerson = updatedPeople[personId];
                    const existingParentId = childPerson.parentIds[0] || null;
                    
                    updatedPeople[personId] = { ...childPerson, parentIds: [...childPerson.parentIds, newPersonId] };
                    updatedPeople[newPersonId] = { ...createNewPerson(newPersonId), children: [personId] };

                    if (existingParentId) {
                        const existingParent = updatedPeople[existingParentId];
                        updatedPeople[existingParentId] = { ...existingParent, spouseId: newPersonId };
                        updatedPeople[newPersonId] = { ...updatedPeople[newPersonId], spouseId: existingParentId };
                    }
                    break;
                }
                case 'sibling': {
                    const newPersonId = `person_${Date.now()}`;
                    updatedPeople[newPersonId] = { ...createNewPerson(newPersonId), parentIds: [...anchorPerson.parentIds] };

                    if (anchorPerson.parentIds.length > 0) {
                        anchorPerson.parentIds.forEach(parentId => {
                            const parent = updatedPeople[parentId];
                            if (parent) {
                                updatedPeople[parentId] = { ...parent, children: [...parent.children, newPersonId] };
                            }
                        });
                        const parentToNavigateTo = anchorPerson.parentIds[0];
                        postSubmitAction = () => navigateTo(parentToNavigateTo);
                    }
                    break;
                }
            }
        }
        return updatedPeople;
    });

    if (postSubmitAction) {
        setTimeout(postSubmitAction, 0);
    }
  }, [navigateTo]);

  const handleGalleryUpdate = useCallback((personId: string, newGallery: string[]) => {
      setPeople(prev => {
          const person = prev[personId];
          if (!person) return prev;
          return {
              ...prev,
              [personId]: { ...person, gallery: newGallery }
          };
      });
  }, []);

  return {
    people,
    setPeople,
    rootIdStack,
    setRootIdStack,
    rootId,
    isInitialLoad,
    lastUpdated,
    isReadOnly,
    setIsReadOnly,
    viewMode,
    setViewMode,
    navigateTo,
    navigateBack,
    navigateToHome,
    handleDeletePerson,
    handlePersonUpdate,
    handleGalleryUpdate
  };
};