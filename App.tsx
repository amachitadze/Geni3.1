import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Person, People, Gender, ModalState, Relationship } from './types';
import TreeNode from './components/TreeNode';
import TreeViewList from './components/TreeViewList';
import AddPersonModal from './components/AddPersonModal';
import DetailsModal from './components/DetailsModal';
import StatisticsModal from './components/StatisticsModal';
import { ShareModal } from './components/ShareModal';
import PasswordPromptModal from './components/PasswordPromptModal';
import BirthdayNotifier from './components/BirthdayNotifier';
import GoogleSearchPanel from './components/GoogleSearchPanel';
import ImportModal from './components/ImportModal';
import ExportModal from './components/ExportModal';
import LandingPage from './components/LandingPage';
import InitialView from './components/InitialView';
import FileManagerModal from './components/FileManagerModal';
import { decryptData, base64ToBuffer } from './utils/crypto';
import { calculateAge, formatTimestamp } from './utils/dateUtils';
import { validatePeopleData, getFamilyUnitFromConnection } from './utils/treeUtils';
import { 
    SearchIcon, BackIcon, HomeIcon, MenuIcon, ExportIcon, 
    CenterIcon, StatsIcon, CloseIcon, ShareIcon, JsonExportIcon, 
    JsonImportIcon, SunIcon, MoonIcon, ViewCompactIcon, ViewNormalIcon, 
    ListBulletIcon, GlobeIcon, DocumentTextIcon, LockClosedIcon, DocumentIcon 
} from './components/Icons';
import { getSupabaseClient } from './utils/supabaseClient';

// Allow TypeScript to recognize the libraries loaded from CDN
declare const html2canvas: any;
declare const jspdf: any;
declare const pako: any;

function App() {
  const [people, setPeople] = useState<People>({});
  const [rootIdStack, setRootIdStack] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  const [isViewingTree, setIsViewingTree] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const storedTheme = localStorage.getItem('familyTreeTheme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [viewMode, setViewMode] = useState<'default' | 'compact' | 'list'>(() => {
    const savedViewMode = localStorage.getItem('familyTreeViewMode') as 'default' | 'compact' | 'list' | null;
    if (savedViewMode) return savedViewMode;
    // Default to 'list' for mobile devices (screen width < 768px), otherwise 'default'
    return window.innerWidth < 768 ? 'list' : 'default';
  });

  const rootId = rootIdStack[rootIdStack.length - 1];

  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, context: null });
  const [detailsModalPersonId, setDetailsModalPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(null);
  
  // State for highlighting connections
  const [highlightedPeople, setHighlightedPeople] = useState<Set<string> | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);


  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStatisticsModalOpen, setIsStatisticsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isZoomingViaWheel, setIsZoomingViaWheel] = useState(false);
  const zoomTimeoutRef = useRef<number | null>(null);
  
  const pinchStartDistanceRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileAction, setFileAction] = useState<'import' | 'merge' | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [encryptedData, setEncryptedData] = useState<string | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // State for Google Search
  const [isGoogleSearchOpen, setIsGoogleSearchOpen] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  const [googleSearchResult, setGoogleSearchResult] = useState<string | null>(null);
  const [googleSearchSources, setGoogleSearchSources] = useState<any[]>([]);
  const [isGoogleSearchLoading, setIsGoogleSearchLoading] = useState(false);
  const [googleSearchError, setGoogleSearchError] = useState<string | null>(null);


  const hoveredConnections = useMemo(() => {
    if (!hoveredPersonId) return null;
    const person = people[hoveredPersonId];
    if (!person) return null;
    const connections = new Set<string>([hoveredPersonId]);
    if (person.spouseId) connections.add(person.spouseId);
    person.parentIds.forEach(id => connections.add(id));
    person.children.forEach(id => connections.add(id));
    return connections;
  }, [hoveredPersonId, people]);

  // Apply theme class to HTML element and save preference
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#111827');
    } else {
      root.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
    }
    localStorage.setItem('familyTreeTheme', theme);
  }, [theme]);

  // PWA install prompt handler
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Check for shared data in URL on initial mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sbId = urlParams.get('sbId'); // Supabase ID (filename)
    const cfg = urlParams.get('cfg'); // Config string (base64 encoded)

    if (sbId && cfg) {
        setIsViewingTree(true);
        setIsPasswordPromptOpen(true);
        
        const fetchFile = async () => {
            try {
                // Decode config
                const configStr = atob(cfg);
                const config = JSON.parse(configStr);
                
                if (!config.u || !config.k) {
                    throw new Error("Invalid configuration");
                }

                // Init Supabase
                const supabase = getSupabaseClient(config.u, config.k);

                // Download Data
                const { data, error } = await supabase
                    .storage
                    .from('shares')
                    .download(sbId);

                if (error) throw error;
                if (!data) throw new Error("Empty data received");

                const text = await data.text();
                setEncryptedData(text);

                // --- ONE-TIME VIEW POLICY ---
                // Delete the file immediately after downloading
                // Note: This requires the 'anon' role to have DELETE permissions in Supabase policies
                try {
                    await supabase
                        .storage
                        .from('shares')
                        .remove([sbId]);
                    console.log("File removed from server (One-time view policy)");
                } catch (deleteError) {
                    // We don't block the user if delete fails, but we log it
                    console.warn("Failed to delete shared file:", deleteError);
                }

            } catch (error: any) {
                 console.error("Failed to fetch data:", error);
                 setDecryptionError("მონაცემების ჩამოტვირთვა ვერ მოხერხდა. ბმული დაზიანებულია ან ფაილი უკვე წაშლილია (ერთჯერადი ბმული).");
                 setIsPasswordPromptOpen(true);
            }
        };
        fetchFile();
    }
  }, []);

  // Load data from localStorage on initial mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('familyTree');
      // viewMode is already initialized in useState
      const savedLastUpdated = localStorage.getItem('familyTreeLastUpdated');
      
      setLastUpdated(savedLastUpdated);

      if (savedData) {
        const { people: savedPeople, rootIdStack: savedRootIdStack } = JSON.parse(savedData);
        if (savedPeople && Object.keys(savedPeople).length > 0) {
            setPeople(savedPeople);
            setRootIdStack(savedRootIdStack || ['root']);
        } else {
            // Data is empty or corrupt
            setPeople({});
            setRootIdStack([]);
        }
      } else {
        // No data saved, it's a fresh start
        setPeople({});
        setRootIdStack([]);
      }
    } catch (error: any) {
      console.error("Failed to load data from localStorage:", error);
      // Fallback to empty state if localStorage is corrupt
      setPeople({});
      setRootIdStack([]);
    } finally {
      setIsInitialLoad(false);
    }
  }, []);

  // Save core data to localStorage whenever it changes
  // IMPORTANT: Do NOT save to localStorage if we are in ReadOnly mode (viewing a shared link)
  useEffect(() => {
    if (isInitialLoad || isReadOnly) return;
    try {
      const dataToSave = JSON.stringify({ people, rootIdStack });
      const timestamp = new Date().toISOString();
      localStorage.setItem('familyTree', dataToSave);
      localStorage.setItem('familyTreeViewMode', viewMode);
      localStorage.setItem('familyTreeLastUpdated', timestamp);
      setLastUpdated(timestamp);
    } catch (error: any) {
      console.error("Failed to save data to localStorage:", error);
    }
  }, [people, rootIdStack, viewMode, isInitialLoad, isReadOnly]);

  // Handle header collapse on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderCollapsed(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Set dynamic page title
  useEffect(() => {
      const rootPerson = people['root'];
      if(rootPerson?.lastName){
        document.title = `${rootPerson.lastName}ების გენეალოგიური ხე`;
      } else {
        document.title = 'გენეალოგიური ხე';
      }
  }, [people]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);
  
    const resetTransform = useCallback(() => setTransform({ scale: 1, x: 0, y: 0 }), []);
  
    const navigateTo = useCallback((personId: string) => {
        setHighlightedPeople(null);
        resetTransform();
        setRootIdStack(prev => {
            if (prev.length > 0 && prev[prev.length - 1] === personId) {
                return prev;
            }
            return [...prev, personId];
        });
    }, [resetTransform]);

  const navigateBack = useCallback(() => {
    setHighlightedPeople(null);
    resetTransform();
    if (rootIdStack.length > 1) {
      setRootIdStack(prev => prev.slice(0, -1));
    }
  }, [rootIdStack, resetTransform]);

  const navigateToHome = useCallback(() => {
    setHighlightedPeople(null);
    resetTransform();
    setRootIdStack(['root']);
  }, [resetTransform]);

  const handleConnectionClick = useCallback((p1Id: string, p2Id: string, type: 'spouse' | 'parent-child') => {
    if (type === 'spouse') {
        setHighlightedPeople(new Set([p1Id, p2Id]));
    } else { // 'parent-child'
        const familyIds = getFamilyUnitFromConnection(p1Id, p2Id, people);
        setHighlightedPeople(familyIds);
    }
  }, [people]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    setIsZoomingViaWheel(true);
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    zoomTimeoutRef.current = window.setTimeout(() => {
      setIsZoomingViaWheel(false);
    }, 150);

    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.2, transform.scale + scaleAmount), 3);
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newX = transform.x + (mouseX - transform.x) * (1 - newScale / transform.scale);
    const newY = transform.y + (mouseY - transform.y) * (1 - newScale / transform.scale);
    setTransform({ scale: newScale, x: newX, y: newY });
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if the user clicks on the background, not on a card or button
    if ((e.target as HTMLElement).closest('[data-person-id], .person-card-buttons, button, svg g')) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    if(viewportRef.current) viewportRef.current.style.cursor = 'grabbing';
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setTransform(prev => ({ ...prev, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
    if(viewportRef.current) viewportRef.current.style.cursor = 'grab';
  };

  const getDistance = (touches: React.TouchList): number => {
    const [touch1, touch2] = [touches[0], touches[1]];
    return Math.sqrt(
        Math.pow(touch1.clientX - touch2.clientX, 
        Math.pow(touch1.clientY - touch2.clientY, 2)
    ));
  };
    
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-person-id], .person-card-buttons, button, svg g')) {
        return;
    }
    if (e.touches.length === 1) { // Panning
        const touch = e.touches[0];
        setIsPanning(true);
        setPanStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
    } else if (e.touches.length === 2) { // Zooming
        setIsPanning(false); // Disable panning when zooming
        pinchStartDistanceRef.current = getDistance(e.touches);
        pinchStartScaleRef.current = transform.scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent page scroll
    if (isPanning && e.touches.length === 1) { // Panning
        const touch = e.touches[0];
        setTransform(prev => ({ ...prev, x: touch.clientX - panStart.x, y: touch.clientY - panStart.y }));
    } else if (e.touches.length === 2 && pinchStartDistanceRef.current > 0) { // Zooming
        const currentDistance = getDistance(e.touches);
        const scaleFactor = currentDistance / pinchStartDistanceRef.current;
        const newScale = Math.min(Math.max(0.2, pinchStartScaleRef.current * scaleFactor), 3);
        
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const midpointX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const midpointY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

        const newX = transform.x + (midpointX - transform.x) * (1 - newScale / transform.scale);
        const newY = transform.y + (midpointY - transform.y) * (1 - newScale / transform.scale);
        
        setTransform({ scale: newScale, x: newX, y: newY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
          pinchStartDistanceRef.current = 0;
      }
      if (e.touches.length < 1) {
          setIsPanning(false);
      } else if (e.touches.length === 1) {
          // Switch from zoom to pan smoothly
          const touch = e.touches[0];
          setIsPanning(true);
          setPanStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
      }
  };

  const handleZoom = (direction: 'in' | 'out') => {
      const scaleAmount = 0.2;
      const newScale = direction === 'in' ? transform.scale + scaleAmount : transform.scale - scaleAmount;
      setTransform(prev => ({...prev, scale: Math.min(Math.max(0.2, newScale), 3)}));
  };
  
  const handleOpenAddModal = useCallback((personId: string) => {
      if (isReadOnly) return;
      setModalState({ isOpen: true, context: { action: 'add', personId }});
  }, [isReadOnly]);

  const handleOpenEditModal = useCallback((personId: string) => {
    if (isReadOnly) return;
    setDetailsModalPersonId(null);
    setModalState({ isOpen: true, context: { action: 'edit', personId } });
  }, [isReadOnly]);

  const handleCloseModal = useCallback(() => setModalState({ isOpen: false, context: null }), []);
  const handleOpenDetailsModal = useCallback((personId: string) => setDetailsModalPersonId(personId), []);
  const handleCloseDetailsModal = useCallback(() => setDetailsModalPersonId(null), []);
  
  const handleDeletePerson = useCallback((personIdToDelete: string) => {
    if (isReadOnly) return;
    if (personIdToDelete === 'root') {
        alert("ხის დამფუძნებლის წაშლა შეუძლებელია.");
        return;
    }
    if (!window.confirm("დარწმუნებული ხართ, რომ გსურთ ამ პიროვნების წაშლა? ეს მოქმედება წაშლის მასთან დაკავშირებულ ყველა კავშირს.")) {
        return;
    }

    const newPeople = JSON.parse(JSON.stringify(people));
    const personToDelete = newPeople[personIdToDelete];
    if (!personToDelete) return;

    if (personToDelete.spouseId) {
        const spouse = newPeople[personToDelete.spouseId];
        if (spouse) spouse.spouseId = undefined;
    }
    if (personToDelete.exSpouseIds) {
        personToDelete.exSpouseIds.forEach(exSpouseId => {
            const exSpouse = newPeople[exSpouseId];
            if (exSpouse && exSpouse.exSpouseIds) {
                exSpouse.exSpouseIds = exSpouse.exSpouseIds.filter(id => id !== personIdToDelete);
            }
        });
    }
    personToDelete.parentIds.forEach(parentId => {
        const parent = newPeople[parentId];
        if (parent) parent.children = parent.children.filter(childId => childId !== personIdToDelete);
    });
    personToDelete.children.forEach(childId => {
        const child = newPeople[childId];
        if (child) child.parentIds = child.parentIds.filter(parentId => parentId !== personIdToDelete);
    });
    delete newPeople[personIdToDelete];
    
    const newStack = rootIdStack.filter(id => id !== personIdToDelete);
    // If the entire tree is deleted, reset to initial empty view
    if (Object.keys(newPeople).length === 0) {
        setPeople({});
        setRootIdStack([]);
    } else {
        const finalStack = newStack.length === 0 ? ['root'] : newStack;
        setPeople(newPeople);
        setRootIdStack(finalStack);
    }


    handleCloseModal();
    handleCloseDetailsModal();
  }, [people, rootIdStack, handleCloseModal, handleCloseDetailsModal, isReadOnly]);

    const handleFormSubmit = useCallback((
        formData: Partial<{ firstName: string; lastName: string; gender: Gender; }>,
        details: Partial<{ birthDate: string; deathDate: string; imageUrl: string; contactInfo: { phone: string; email: string; address: string; }; bio: string; cemeteryAddress: string; }>,
        relationship?: Relationship,
        existingPersonId?: string
    ) => {
        if (!modalState.context) return;
        const { personId, action } = modalState.context;

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
                    deathDate: details.deathDate || undefined,
                    imageUrl: details.imageUrl || undefined,
                    contactInfo: contactInfoToSave,
                    bio: details.bio || undefined,
                    cemeteryAddress: details.cemeteryAddress || undefined,
                };
            } else if (action === 'add' && relationship) {
                const anchorPerson = updatedPeople[personId];
                const newPersonDetails = {
                    birthDate: details.birthDate || undefined,
                    deathDate: details.deathDate || undefined,
                    imageUrl: details.imageUrl || undefined,
                    contactInfo: contactInfoToSave,
                    bio: details.bio || undefined,
                    cemeteryAddress: details.cemeteryAddress || undefined,
                };

                switch (relationship) {
                    case 'spouse': {
                        if (existingPersonId) {
                            const newSpouse = updatedPeople[existingPersonId];
                            updatedPeople[personId] = { ...anchorPerson, spouseId: existingPersonId, exSpouseIds: (anchorPerson.exSpouseIds || []).filter(id => id !== existingPersonId) };
                            updatedPeople[existingPersonId] = { ...newSpouse, spouseId: personId, exSpouseIds: (newSpouse.exSpouseIds || []).filter(id => id !== personId) };
                        } else {
                            const newPersonId = `person_${Date.now()}`;
                            const newPerson: Person = { id: newPersonId, ...formData, children: [], parentIds: [], exSpouseIds: [], ...newPersonDetails } as Person;
                            updatedPeople[newPersonId] = { ...newPerson, spouseId: personId };
                            
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
                        if (anchorPerson.spouseId) {
                            parentIdsForChild.push(anchorPerson.spouseId);
                        }
                        const newPerson: Person = { id: newPersonId, ...formData, children: [], parentIds: parentIdsForChild, exSpouseIds: [], ...newPersonDetails } as Person;
                        updatedPeople[newPersonId] = newPerson;
                        
                        updatedPeople[personId] = { ...anchorPerson, children: [...anchorPerson.children, newPersonId] };

                        if (anchorPerson.spouseId) {
                            const parent2 = updatedPeople[anchorPerson.spouseId];
                            updatedPeople[anchorPerson.spouseId] = { ...parent2, children: [...parent2.children, newPersonId] };
                        }
                        break;
                    }
                    case 'parent': {
                        const newPersonId = `person_${Date.now()}`;
                        const newPerson: Person = { id: newPersonId, ...formData, children: [personId], parentIds: [], exSpouseIds: [], ...newPersonDetails } as Person;
                        
                        const childPerson = updatedPeople[personId];
                        const existingParentId = childPerson.parentIds[0] || null;
                        
                        updatedPeople[personId] = { ...childPerson, parentIds: [...childPerson.parentIds, newPersonId] };
                        updatedPeople[newPersonId] = newPerson;

                        if (existingParentId) {
                            const existingParent = updatedPeople[existingParentId];
                            updatedPeople[existingParentId] = { ...existingParent, spouseId: newPersonId };
                            updatedPeople[newPersonId] = { ...newPerson, spouseId: existingParentId };
                        }
                        break;
                    }
                    case 'sibling': {
                        const newPersonId = `person_${Date.now()}`;
                        const anchorSibling = updatedPeople[personId];
                        const newPerson: Person = { id: newPersonId, ...formData, children: [], parentIds: [...anchorSibling.parentIds], exSpouseIds: [], ...newPersonDetails } as Person;
                        updatedPeople[newPersonId] = newPerson;

                        if (anchorSibling.parentIds.length > 0) {
                            anchorSibling.parentIds.forEach(parentId => {
                                const parent = updatedPeople[parentId];
                                if (parent) {
                                    updatedPeople[parentId] = { ...parent, children: [...parent.children, newPersonId] };
                                }
                            });
                            
                            const parentToNavigateTo = anchorSibling.parentIds[0];
                            postSubmitAction = () => {
                                navigateTo(parentToNavigateTo);
                            };
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

        handleCloseModal();
    }, [modalState.context, handleCloseModal, navigateTo]);
  
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim() === '') {
            setSearchResults([]);
            setHighlightedPersonId(null);
            return;
        }
        const lowerCaseQuery = query.toLowerCase();
        const results = (Object.values(people) as Person[]).filter((person: Person) => {
            const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
            const bio = person.bio?.toLowerCase() ?? '';
            const phone = person.contactInfo?.phone ?? '';
            const email = person.contactInfo?.email?.toLowerCase() ?? '';
            const address = person.contactInfo?.address?.toLowerCase() ?? '';

            return fullName.includes(lowerCaseQuery) ||
                   bio.includes(lowerCaseQuery) ||
                   phone.includes(query) || // Use original query for phone numbers, etc.
                   email.includes(lowerCaseQuery) ||
                   address.includes(lowerCaseQuery);
        });
        setSearchResults(results);
    };

  const handleSearchResultClick = (personId: string) => {
    navigateTo(personId);
    setHighlightedPersonId(personId);
    // Keep search open, but clear results
    setSearchQuery('');
    setSearchResults([]);
    // Do not close search panel automatically, user might want to check the location and then close manually
    // setIsSearchOpen(false); 
  };
  
  const handleExportPdf = async () => {
    if (isReadOnly) {
        alert("დათვალიერების რეჟიმში PDF-ის გადმოწერა შეზღუდულია.");
        setIsMenuOpen(false);
        return;
    }
    const treeElement = viewportRef.current?.querySelector('.p-16 > div');
    if (!treeElement) { alert('ხის ექსპორტი ვერ მოხერხდა.'); return; }
    document.body.classList.add('pdf-exporting');
    try {
        const canvas = await html2canvas(treeElement as HTMLElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = jspdf;
        const orientation = canvas.width > canvas.height ? 'l' : 'p';
        const pdf = new jsPDF(orientation, 'px', [canvas.width, canvas.height]);
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`გენეალოგიური-ხე-${people[rootId]?.firstName || 'tree'}.pdf`);
    } catch (error: any) {
        console.error('PDF ექსპორტის შეცდომა:', error);
        alert('PDF-ის გენერირება ვერ მოხერხდა.');
    } finally {
        document.body.classList.remove('pdf-exporting');
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!encryptedData) return;
    setIsDecrypting(true);
    setDecryptionError(null);
    try {
      const decryptedCompressedBase64 = await decryptData(encryptedData, password);
      const compressedBuffer = base64ToBuffer(decryptedCompressedBase64);
      const decompressedString = pako.inflate(compressedBuffer, { to: 'string' });
      const parsedData = JSON.parse(decompressedString);
      
      const { people: sharedPeople, rootIdStack: sharedRootIdStack, readOnly } = parsedData;
      setPeople(sharedPeople);
      setRootIdStack(sharedRootIdStack);
      setIsReadOnly(!!readOnly); // Set Read-Only state based on the flag in file
      
      setIsPasswordPromptOpen(false);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      console.error("Decryption failed", error);
      setDecryptionError("პაროლი არასწორია ან მონაცემები დაზიანებულია.");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleExportJson = () => {
    if (isReadOnly) {
        alert("დათვალიერების რეჟიმში მონაცემების ექსპორტი შეზღუდულია.");
        setIsMenuOpen(false);
        return;
    }
    try {
        const dataToSave = JSON.stringify({ people, rootIdStack }, null, 2);
        const blob = new Blob([dataToSave], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        const rootPerson = people['root'];
        const fileName = rootPerson?.lastName ? `გენეალოგია-${rootPerson.lastName}-${date}.json` : `გენეალოგია-${date}.json`;
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsMenuOpen(false);
    } catch (error) {
        console.error("Failed to export data:", error);
        alert("მონაცემების ექსპორტი ვერ მოხერხდა.");
    }
  };

  const handleImportJson = () => {
      if (isReadOnly) {
          alert("დათვალიერების რეჟიმში მონაცემების იმპორტი შეზღუდულია.");
          setIsMenuOpen(false);
          return;
      }
      setFileAction('import');
      fileInputRef.current?.click();
  };
  
  const handleMergeJson = () => {
    setFileAction('merge');
    fileInputRef.current?.click();
  };
  
  const handleShareClick = () => {
      if (isReadOnly) {
          alert("დათვალიერების რეჟიმში გაზიარება შეზღუდულია.");
          setIsMenuOpen(false);
          return;
      }
      setIsShareModalOpen(true);
      setIsMenuOpen(false);
  };
  
  const handleImportModalOpen = () => {
      if (isReadOnly) {
          alert("დათვალიერების რეჟიმში იმპორტი შეზღუდულია.");
          setIsMenuOpen(false);
          return;
      }
      setIsImportModalOpen(true);
      setIsMenuOpen(false);
  };
  
  const handleExportModalOpen = () => {
      if (isReadOnly) {
          alert("დათვალიერების რეჟიმში ექსპორტი შეზღუდულია.");
          setIsMenuOpen(false);
          return;
      }
      setIsExportModalOpen(true);
      setIsMenuOpen(false);
  };

  const handleExitReadOnly = () => {
      if(window.confirm("ნამდვილად გსურთ გამოსვლა? ეს გაწყვეტს კავშირს მიმდინარე ხესთან და დაბრუნდებით საწყის გვერდზე.")) {
        setPeople({});
        setRootIdStack([]);
        setIsReadOnly(false);
        setIsViewingTree(false);
        // Clear URL params and history state
        window.history.replaceState({}, document.title, window.location.pathname);
      }
  };

  const mergePeopleData = (currentPeople: People, importedPeople: People): People => {
    const newPeople = JSON.parse(JSON.stringify(currentPeople));
  
    for (const personId in importedPeople) {
      const importedPerson = importedPeople[personId];
      const currentPerson = newPeople[personId];
  
      if (currentPerson) {
        // Person exists, merge properties. Overwrite with imported data if it's not empty/undefined.
        const mergedPerson = { ...currentPerson };
  
        mergedPerson.firstName = importedPerson.firstName || currentPerson.firstName;
        mergedPerson.lastName = importedPerson.lastName || currentPerson.lastName;
        mergedPerson.gender = importedPerson.gender || currentPerson.gender;
        mergedPerson.birthDate = importedPerson.birthDate || currentPerson.birthDate;
        mergedPerson.deathDate = importedPerson.deathDate || currentPerson.deathDate;
        mergedPerson.imageUrl = importedPerson.imageUrl || currentPerson.imageUrl;
        mergedPerson.bio = importedPerson.bio || currentPerson.bio;
        
        mergedPerson.contactInfo = {
          phone: importedPerson.contactInfo?.phone || currentPerson.contactInfo?.phone,
          email: importedPerson.contactInfo?.email || currentPerson.contactInfo?.email,
          address: importedPerson.contactInfo?.address || currentPerson.contactInfo?.address,
        };
  
        mergedPerson.spouseId = importedPerson.spouseId || currentPerson.spouseId;
  
        mergedPerson.children = [...new Set([...(currentPerson.children || []), ...(importedPerson.children || [])])];
        mergedPerson.parentIds = [...new Set([...(currentPerson.parentIds || []), ...(importedPerson.parentIds || [])])];
        mergedPerson.exSpouseIds = [...new Set([...(currentPerson.exSpouseIds || []), ...(importedPerson.exSpouseIds || [])])];
  
        newPeople[personId] = mergedPerson;
      } else {
        newPeople[personId] = importedPerson;
      }
    }
    return newPeople;
  };

  const handleRestoreData = useCallback((importedData: any) => {
    try {
        const validationResult = validatePeopleData(importedData);
        if (!validationResult.isValid) {
            throw new Error(validationResult.error || "მონაცემები დაზიანებულია ან არასწორი ფორმატი აქვს.");
        }
        
        if (window.confirm("ყურადღება: ეს მოქმედება წაშლის მიმდინარე გენეალოგიურ ხეს და ჩაანაცვლებს არჩეული ვერსიით. დარწმუნებული ხართ?")) {
            setPeople(importedData.people);
            setRootIdStack(importedData.rootIdStack);
            setIsReadOnly(false); // Reset Read Only mode when restoring a backup
            alert("მონაცემები წარმატებით აღდგა.");
        }
    } catch (error: any) {
        console.error("Failed to restore data:", error);
        alert(`აღდგენის შეცდომა: ${error.message}`);
    }
  }, []);

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !fileAction) return;

      const confirmMessage = fileAction === 'import' 
        ? "ყურადღება: ფაილის იმპორტი წაშლის მიმდინარე გენეალოგიურ ხეს. დარწმუნებული ხართ, რომ გსურთ გაგრძელება?"
        : "ყურადღება: ეს მოქმედება შეურწყამს ფაილში არსებულ მონაცემებს თქვენს ამჟამინდელ ხეს. ახალი ინფორმაცია დაემატება და არსებული შეიძლება განახლდეს. გსურთ გაგრძელება?";

      if (!window.confirm(confirmMessage)) {
          if (event.target) event.target.value = '';
          setFileAction(null);
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text !== 'string') throw new Error("File content is not readable.");
              const importedData = JSON.parse(text);
              
              const validationResult = validatePeopleData(importedData);
              if (!validationResult.isValid) {
                  throw new Error(validationResult.error || "ფაილი დაზიანებულია ან არასწორი ფორმატი აქვს.");
              }

              if (fileAction === 'import') {
                setPeople(importedData.people);
                setRootIdStack(importedData.rootIdStack);
                setIsReadOnly(false); // Reset Read Only mode on import
                alert("მონაცემები წარმატებით იმპორტირდა.");
              } else if (fileAction === 'merge') {
                if (isReadOnly) {
                    alert("შერწყმა შეუძლებელია მხოლოდ დათვალიერების რეჟიმში.");
                    return;
                }
                const mergedPeople = mergePeopleData(people, importedData.people);
                setPeople(mergedPeople);
                alert("მონაცემები წარმატებით შეერწყა.");
              }
          } catch (error: any) {
              console.error(`Failed to ${fileAction} data:`, error);
              alert(`${fileAction === 'import' ? 'იმპორტის' : 'შერწყმის'} შეცდომა: ${error.message || 'ფაილი დაზიანებულია ან არასწორი ფორმატი აქვს.'}`);
          } finally {
              if (event.target) event.target.value = '';
              setFileAction(null);
          }
      };
      reader.onerror = () => {
           alert("ფაილის წაკითხვა ვერ მოხერხდა.");
           if (event.target) event.target.value = '';
           setFileAction(null);
      };
      reader.readAsText(file);
  };
  
  const handleInstallClick = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
    };

    const handleGoogleSearch = async (queryOverride?: string) => {
    const query = queryOverride || googleSearchQuery;
    if (!query.trim()) return;

    setIsGoogleSearchLoading(true);
    setGoogleSearchError(null);
    setGoogleSearchResult(null);
    setGoogleSearchSources([]);

    try {
      // Safely access process.env to prevent ReferenceError in browser
      const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;
      
      if (!apiKey) {
        throw new Error("API key is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setGoogleSearchResult(response.text);
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setGoogleSearchSources(sources);

    } catch (error: any) {
      console.error("Google Search failed:", error);
      setGoogleSearchError("ძიებისას მოხდა შეცდომა. გთხოვთ, სცადოთ მოგვიანებით.");
    } finally {
      setIsGoogleSearchLoading(false);
    }
  };
  
  const handleGoogleSearchFromDetails = (person: Person) => {
    const query = `${person.firstName} ${person.lastName}`;
    setGoogleSearchQuery(query);
    handleCloseDetailsModal();
    setIsGoogleSearchOpen(true);
    handleGoogleSearch(query);
  };

  const handleShowOnMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
    handleCloseDetailsModal();
  };
  
  const handleStartCreating = () => {
    const initialPeople: People = {
      'root': {
        id: 'root',
        firstName: 'დამფუძნებელი',
        lastName: 'გვარი',
        gender: Gender.Male,
        children: [],
        parentIds: [],
        exSpouseIds: [],
        birthDate: '1950-01-01',
        bio: 'ამ გენეალოგიური ხის საწყისი წერტილი.',
        imageUrl: `https://avatar.iran.liara.run/public/boy?username=Founder`
      },
    };
    setPeople(initialPeople);
    setRootIdStack(['root']);
    setIsReadOnly(false);
  };
  
  const handleOpenImport = () => setIsImportModalOpen(true);

  const anchorPerson = modalState.context?.action === 'add' ? people[modalState.context.personId] : null;
  const anchorSpouse = anchorPerson?.spouseId ? people[anchorPerson.spouseId] : null;
  const personToEdit = modalState.context?.action === 'edit' ? people[modalState.context.personId] : null;

  const anchorPersonExSpouses = useMemo(() => {
    if (!anchorPerson || !anchorPerson.exSpouseIds) return [];
    return anchorPerson.exSpouseIds.map(id => people[id]).filter(Boolean);
  }, [anchorPerson, people]);
  
  const rootPerson = people['root'];
  const headerTitle = rootPerson?.lastName ? `${rootPerson.lastName}ების გენეალოგიური ხე` : 'გენეალოგიური ხე';
  const headerSubtitle = rootPerson && (rootPerson.firstName !== 'დამფუძნებელი' || rootPerson.lastName !== 'გვარი')
    ? `${rootPerson.firstName} ${rootPerson.lastName || ''}ს ოჯახის საგვარეულო და სანათესაო ხე`
    : 'შექმენით და ვიზუალურად გამოსახეთ თქვენი ოჯახის ისტორია.';

  const statistics = useMemo(() => {
    const peopleArray: Person[] = Object.values(people);
    if (peopleArray.length === 0) {
        return {
            totalPeople: 0,
            genderData: { male: 0, female: 0 },
            statusData: { living: 0, deceased: 0 },
            ageGroupData: { '0-18': 0, '19-35': 0, '36-60': 0, '60+': 0 },
            generationData: { labels: [], data: [] },
            birthRateData: { labels: [], data: [] },
            topMaleNames: [],
            topFemaleNames: [],
            oldestLivingPerson: null,
            averageLifespan: 0,
            mostCommonAddress: null
        };
    }

    const livingPeople = peopleArray.filter(p => !p.deathDate);

    // Age Groups Calculation
    const ageGroups = { '0-18': 0, '19-35': 0, '36-60': 0, '60+': 0 };
    livingPeople.forEach(p => {
        const age = calculateAge(p.birthDate);
        if (age !== null) {
            if (age <= 18) ageGroups['0-18']++;
            else if (age <= 35) ageGroups['19-35']++;
            else if (age <= 60) ageGroups['36-60']++;
            else ageGroups['60+']++;
        }
    });

    const generationMap = new Map<string, number>();
        if (people['root']) {
            const queue: [string, number][] = [['root', 0]];
            const visited = new Set<string>(['root']);
            generationMap.set('root', 0);

            let head = 0;
            while (head < queue.length) {
                const [personId, level] = queue[head++];
                const person = people[personId];
                if (!person) continue;

                const processChildren = (p: Person) => {
                    p.children.forEach(childId => {
                        if (!visited.has(childId)) {
                            visited.add(childId);
                            generationMap.set(childId, level + 1);
                            queue.push([childId, level + 1]);
                        }
                    });
                };
                
                processChildren(person);

                if (person.spouseId && !visited.has(person.spouseId)) {
                    const spouse = people[person.spouseId];
                    if (spouse) {
                        visited.add(person.spouseId);
                        generationMap.set(person.spouseId, level);
                        processChildren(spouse);
                    }
                }
            }
        }

    const getGenerationData = (genMap: Map<string, number>): { labels: string[], data: number[] } => {
        const generationCounts: { [key: number]: number } = {};
        for (const level of genMap.values()) {
            generationCounts[level] = (generationCounts[level] || 0) + 1;
        }
        
        const sortedGenerations = Object.keys(generationCounts).map(Number).sort((a, b) => a - b);
        const labels = sortedGenerations.map(gen => `თაობა ${gen + 1}`);
        const data = sortedGenerations.map(gen => generationCounts[gen]);

        return { labels, data };
    };
    
    const getBirthRateData = (peopleData: People, genMap: Map<string, number>): { labels: string[], data: number[] } => {
        const birthRateByGen: { [key: number]: { children: number; mothers: number } } = {};
        
        for (const personId in peopleData) {
            const person = peopleData[personId];
            const isMother = person.gender === Gender.Female && person.children.length > 0;
            
            if (isMother) {
                const level = genMap.get(personId);
                if (level !== undefined) {
                    if (!birthRateByGen[level]) {
                        birthRateByGen[level] = { children: 0, mothers: 0 };
                    }
                    birthRateByGen[level].mothers++;
                    birthRateByGen[level].children += person.children.length;
                }
            }
        }

        const sortedGenerations = Object.keys(birthRateByGen).map(Number).sort((a, b) => a - b);
        const labels = sortedGenerations.map(gen => `თაობა ${gen + 1}`);
        const data = sortedGenerations.map(gen => {
            const genData = birthRateByGen[gen];
            const average = genData.mothers > 0 ? genData.children / genData.mothers : 0;
            return parseFloat(average.toFixed(1)); 
        });

        return { labels, data };
    };

    // Popular Names Calculation
    const getTopNames = (gender: Gender) => {
        const nameCounts: { [name: string]: number } = {};
        peopleArray
            .filter(p => p.gender === gender && p.firstName !== 'დამფუძნებელი')
            .forEach(p => {
                nameCounts[p.firstName] = (nameCounts[p.firstName] || 0) + 1;
            });
        return Object.entries(nameCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    };
    
    // Additional Stats Calculation
    let oldestLivingPerson: { name: string; age: number } | null = null;
    let totalLifespan = 0;
    let deceasedWithAge = 0;
    const addressCounts: { [key: string]: number } = {};

    livingPeople.forEach(p => {
        const age = calculateAge(p.birthDate);
        if (age !== null) {
            if (!oldestLivingPerson || age > oldestLivingPerson.age) {
                oldestLivingPerson = { name: `${p.firstName} ${p.lastName}`, age: age };
            }
        }
    });

    peopleArray.filter(p => p.deathDate).forEach(p => {
        const age = calculateAge(p.birthDate, p.deathDate);
        if (age !== null) {
            totalLifespan += age;
            deceasedWithAge++;
        }
    });

    peopleArray.forEach(p => {
        if (p.contactInfo?.address) {
            const address = p.contactInfo.address.trim();
            if(address) {
                addressCounts[address] = (addressCounts[address] || 0) + 1;
            }
        }
    });

    let mostCommonAddress: { address: string; count: number } | null = null;
    if (Object.keys(addressCounts).length > 0) {
        const [address, count] = Object.entries(addressCounts).sort((a, b) => b[1] - a[1])[0];
        mostCommonAddress = { address, count };
    }

    const averageLifespan = deceasedWithAge > 0 ? Math.round(totalLifespan / deceasedWithAge) : 0;


    return {
        totalPeople: peopleArray.length,
        genderData: {
            male: peopleArray.filter(p => p.gender === Gender.Male).length,
            female: peopleArray.filter(p => p.gender === Gender.Female).length,
        },
        statusData: {
            living: livingPeople.length,
            deceased: peopleArray.length - livingPeople.length,
        },
        ageGroupData: ageGroups,
        generationData: getGenerationData(generationMap),
        birthRateData: getBirthRateData(people, generationMap),
        topMaleNames: getTopNames(Gender.Male),
        topFemaleNames: getTopNames(Gender.Female),
        oldestLivingPerson,
        averageLifespan,
        mostCommonAddress,
    };
  }, [people]);

const peopleWithBirthdays = useMemo(() => {
    const currentMonth = new Date().getMonth(); // 0-indexed
    return (Object.values(people) as Person[]).filter((p: Person) => {
        // Must be alive and have a birthdate with a month specified
        if (p.deathDate || !p.birthDate) {
            return false;
        }
        const parts = p.birthDate.split('-');
        if (parts.length < 2) {
            // Cannot determine month from 'YYYY' format
            return false;
        }
        const monthPart = parseInt(parts[1], 10);
        if (isNaN(monthPart)) {
            return false;
        }
        // monthPart is 1-indexed from input, currentMonth is 0-indexed
        return (monthPart - 1) === currentMonth;
    });
}, [people]);

  const handleViewModeChange = (mode: 'default' | 'compact' | 'list') => {
    setViewMode(mode);
    setIsMenuOpen(false);
  };


  if (isInitialLoad) {
    return (
      <div className="h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-800 dark:text-white text-xl">იტვირთება...</p>
      </div>
    );
  }

  if (!isViewingTree) {
      return <LandingPage onEnter={() => setIsViewingTree(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col">
      <header className={`p-4 z-20 bg-white/80 dark:bg-gray-900/80 sticky top-0 transition-all duration-300 ${isZoomingViaWheel ? '' : 'backdrop-blur-sm'} ${isHeaderCollapsed ? 'py-2' : 'sm:py-6'}`}>
        {/* Main Header Content - visible when search is closed */}
        <div className={`w-full ${isSearchOpen ? 'hidden' : 'block'}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                    {rootIdStack.length > 1 && (
                        <>
                            <button onClick={navigateBack} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors" title="უკან დაბრუნება"><BackIcon className="w-6 h-6"/><span className="hidden sm:inline">უკან</span></button>
                            <button onClick={navigateToHome} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors" title="საწყისზე დაბრუნება"><HomeIcon className="w-6 h-6"/></button>
                        </>
                    )}
                </div>

                <div className="flex-1 text-left xl:text-center min-w-0 flex flex-col items-start xl:items-center">
                    <h1 className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300 truncate pb-1 ${isHeaderCollapsed ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-5xl'}`}>
                        {headerTitle}
                    </h1>
                    <p className={`text-xs sm:text-sm text-gray-500 dark:text-gray-400 transition-opacity duration-300 truncate ${isHeaderCollapsed ? 'opacity-0 h-0' : 'opacity-100'}`}>
                        {headerSubtitle}
                    </p>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setIsSearchOpen(true)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" title="ძიება">
                        <SearchIcon className="w-6 h-6"/>
                    </button>
                    <button onClick={() => setIsGoogleSearchOpen(true)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" title="ისტორიული ძიება">
                        <GlobeIcon className="w-6 h-6"/>
                    </button>
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(prev => !prev)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" title="მენიუ"><MenuIcon className="w-6 h-6"/></button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-20">
                                <ul className="py-1 text-gray-700 dark:text-gray-300">
                                    <li><button onClick={() => { setIsViewingTree(false); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"><HomeIcon className="w-5 h-5"/><span>საწყისი გვერდი</span></button></li>
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>
                                    <li className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">მენიუ</li>
                                    <li><button onClick={handleShareClick} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"><ShareIcon className="w-5 h-5"/><span>გაზიარება</span></button></li>
                                    <li><button onClick={() => { setIsStatisticsModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"><StatsIcon className="w-5 h-5"/><span>სტატისტიკა</span></button></li>
                                    <li><button onClick={handleExportPdf} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"><ExportIcon className="w-5 h-5"/><span>PDF ექსპორტი</span></button></li>
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>
                                    
                                    <li className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">მონაცემები და რესურსები</li>
                                    <li><button onClick={() => { setIsFileManagerOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"><DocumentIcon className="w-5 h-5"/><span>მონაცემების მართვა</span></button></li>
                                    <li><button onClick={handleImportModalOpen} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"><JsonImportIcon className="w-5 h-5"/><span>მონაცემების იმპორტი</span></button></li>
                                    <li><button onClick={handleExportModalOpen} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"><JsonExportIcon className="w-5 h-5"/><span>მონაცემების ექსპორტი</span></button></li>
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>

                                    <li className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">ინტერფეისი</li>
                                    <li><button onClick={() => setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'))} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"><span>თემის შეცვლა</span> {theme === 'dark' ? <SunIcon className="w-5 h-5 text-yellow-400"/> : <MoonIcon className="w-5 h-5 text-indigo-500"/>}</button></li>
                                    
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>
                                    <li className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">ხედის რეჟიმი</li>
                                    <li>
                                        <button onClick={() => handleViewModeChange('default')} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors ${viewMode === 'default' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}>
                                            <ViewNormalIcon className="w-5 h-5"/><span>სტანდარტული</span>
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => handleViewModeChange('compact')} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors ${viewMode === 'compact' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}>
                                            <ViewCompactIcon className="w-5 h-5"/><span>კომპაქტური</span>
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => handleViewModeChange('list')} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors ${viewMode === 'list' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}>
                                            <ListBulletIcon className="w-5 h-5"/><span>სია (მობილურისთვის)</span>
                                        </button>
                                    </li>
                                </ul>
                                <div className="px-4 py-2 text-xs text-center text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700">
                                    ბოლოს განახლდა: {formatTimestamp(lastUpdated)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Search Input - visible when search is open */}
        <div className={`absolute top-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 shadow-md transition-transform duration-300 ${isZoomingViaWheel ? '' : 'backdrop-blur-sm'} ${isSearchOpen ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="relative w-full max-w-2xl mx-auto">
                <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input
                    type="text"
                    placeholder="მოძებნეთ პიროვნება..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full h-12 pl-10 pr-10 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                />
                 <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); setHighlightedPersonId(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="ძიების დახურვა">
                    <CloseIcon className="w-5 h-5"/>
                </button>

                {searchResults.length > 0 && (
                <ul className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-80 overflow-y-auto z-30">
                    {searchResults.map(person => (
                    <li key={person.id} onClick={() => handleSearchResultClick(person.id)} className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        {person.firstName} {person.lastName}
                    </li>
                    ))}
                </ul>
                )}
            </div>
        </div>
      </header>

      <main 
        className="flex-grow flex flex-col relative overflow-hidden" 
      >
        {Object.keys(people).length > 0 && people[rootId] ? (
            viewMode === 'list' ? (
                <TreeViewList
                    rootId={rootId}
                    people={people}
                    onNavigate={(personId) => {
                        navigateTo(personId);
                        setHighlightedPersonId(personId);
                    }}
                    onShowDetails={handleOpenDetailsModal}
                    highlightedPersonId={highlightedPersonId}
                />
            ) : (
                <div 
                    ref={viewportRef}
                    className="flex-grow flex flex-col relative overflow-hidden"
                    onWheel={handleWheel} 
                    onMouseDown={handleMouseDown} 
                    onMouseMove={handleMouseMove} 
                    onMouseUp={handleMouseUp} 
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => setHighlightedPeople(null)} 
                    style={{cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none'}}
                >
                    <div className={`flex-grow flex items-center justify-center ${isZoomingViaWheel ? '' : 'transition-transform duration-200 ease-out'}`} style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
                        <div className="p-16">
                            <TreeNode 
                                personId={rootId} 
                                viewRootId={rootId}
                                people={people} 
                                onAdd={handleOpenAddModal}
                                onEdit={handleOpenEditModal}
                                onShowDetails={handleOpenDetailsModal}
                                onNavigate={navigateTo}
                                highlightedPersonId={highlightedPersonId}
                                highlightedPeople={highlightedPeople}
                                onConnectionClick={handleConnectionClick}
                                hoveredConnections={hoveredConnections}
                                onSetHover={setHoveredPersonId}
                                viewMode={viewMode as 'default' | 'compact'}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </div>
                </div>
            )
        ) : (
             <InitialView 
                onStartCreating={handleStartCreating}
                onImport={handleOpenImport}
            />
        )}
         {/* Zoom Controls */}
        {viewMode !== 'list' && (
            <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-10">
                <button onClick={() => handleZoom('in')} className="w-10 h-10 rounded-full bg-gray-700/50 text-white backdrop-blur-sm flex items-center justify-center text-xl hover:bg-gray-600/70">+</button>
                <button onClick={() => handleZoom('out')} className="w-10 h-10 rounded-full bg-gray-700/50 text-white backdrop-blur-sm flex items-center justify-center text-xl hover:bg-gray-600/70">-</button>
                <button onClick={resetTransform} className="w-10 h-10 rounded-full bg-gray-700/50 text-white backdrop-blur-sm flex items-center justify-center hover:bg-gray-600/70" title="ხედის განულება"><CenterIcon className="w-5 h-5"/></button>
            </div>
        )}
        
        {/* Read Only Badge - Centered Bottom */}
        {isReadOnly && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-full shadow-lg animate-fade-in-up">
                <span className="font-medium text-sm whitespace-nowrap">👁️ დამთვალიერებლის რეჟიმი</span>
                <button 
                    onClick={handleExitReadOnly} 
                    className="ml-2 p-1 hover:bg-yellow-200 rounded-full transition-colors text-yellow-900"
                    title="რეჟიმიდან გამოსვლა"
                >
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
        )}

        <BirthdayNotifier 
            peopleWithBirthdays={peopleWithBirthdays}
            onNavigate={(personId) => {
                navigateTo(personId);
                setHighlightedPersonId(personId);
            }}
        />
        {installPrompt && (
          <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md p-3 bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 flex items-center justify-between gap-4 border border-gray-200 dark:border-gray-700 animate-fade-in-up">
            <p className="text-sm text-gray-800 dark:text-gray-200">დააინსტალირეთ აპლიკაცია უკეთესი გამოცდილებისთვის.</p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={handleInstallClick} className="px-3 py-1.5 text-sm rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors">ინსტალაცია</button>
              <button onClick={() => setInstallPrompt(null)} className="px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 transition-colors">დახურვა</button>
            </div>
          </div>
        )}
      </main>

      {modalState.isOpen && modalState.context && (
        <AddPersonModal 
          isOpen={modalState.isOpen}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
          onDelete={handleDeletePerson}
          context={modalState.context}
          anchorPerson={anchorPerson}
          anchorSpouse={anchorSpouse}
          personToEdit={personToEdit}
          anchorPersonExSpouses={anchorPersonExSpouses}
        />
      )}
      {detailsModalPersonId && (
        <DetailsModal 
          person={people[detailsModalPersonId]} 
          people={people}
          onClose={handleCloseDetailsModal}
          onEdit={handleOpenEditModal}
          onDelete={handleDeletePerson}
          onGoogleSearch={handleGoogleSearchFromDetails}
          onShowOnMap={handleShowOnMap}
          onNavigate={(personId) => {
            handleCloseDetailsModal();
            navigateTo(personId);
          }}
          isReadOnly={isReadOnly}
        />
      )}
      {isStatisticsModalOpen && (
          <StatisticsModal 
            isOpen={isStatisticsModalOpen}
            onClose={() => setIsStatisticsModalOpen(false)}
            stats={statistics}
            theme={theme}
          />
      )}
      {isShareModalOpen && (
        <ShareModal 
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            data={{ people, rootIdStack }}
        />
      )}
       {isPasswordPromptOpen && (
        <PasswordPromptModal
          isOpen={isPasswordPromptOpen}
          onSubmit={handlePasswordSubmit}
          onClose={() => setIsPasswordPromptOpen(false)}
          error={decryptionError}
          isLoading={isDecrypting}
        />
      )}
      <GoogleSearchPanel
        isOpen={isGoogleSearchOpen}
        onClose={() => setIsGoogleSearchOpen(false)}
        onSearch={() => handleGoogleSearch()}
        query={googleSearchQuery}
        setQuery={setGoogleSearchQuery}
        result={googleSearchResult}
        sources={googleSearchSources}
        isLoading={isGoogleSearchLoading}
        error={googleSearchError}
      />
      {isImportModalOpen && (
        <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImportFromFile={handleImportJson}
            onMergeFromFile={handleMergeJson}
            onRestore={handleRestoreData}
        />
      )}
      {isExportModalOpen && (
        <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onExportJson={handleExportJson}
            data={{ people, rootIdStack }}
        />
      )}
      {isFileManagerOpen && (
        <FileManagerModal
            isOpen={isFileManagerOpen}
            onClose={() => setIsFileManagerOpen(false)}
        />
      )}
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".json" style={{ display: 'none' }} />
    </div>
  );
}

export default App;