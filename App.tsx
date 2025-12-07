
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Person, ModalState, Gender } from './types';
import TreeNode from './components/TreeNode';
import TreeViewList from './components/TreeViewList';
import TimelineView from './components/TimelineView';
import MapPanel from './components/MapPanel';
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
import NotificationSenderModal from './components/NotificationSenderModal';
import NotificationBanner from './components/NotificationBanner';
import SettingsModal from './components/SettingsModal';
import RelationshipFinderModal from './components/RelationshipFinderModal';
import { decryptData, base64ToBuffer } from './utils/crypto';
import { formatTimestamp, calculateAge } from './utils/dateUtils';
import { validatePeopleData, getFamilyUnitFromConnection } from './utils/treeUtils';
import { translations, Language } from './utils/translations';
import { 
    SearchIcon, BackIcon, HomeIcon, MenuIcon, ExportIcon, 
    CenterIcon, StatsIcon, CloseIcon, ShareIcon, JsonExportIcon, 
    JsonImportIcon, SunIcon, MoonIcon, ViewCompactIcon, ViewNormalIcon, 
    ListBulletIcon, GlobeIcon, DocumentIcon, MessageIcon, CogIcon, CalculatorIcon, ClockIcon, MapIcon
} from './components/Icons';

// Hooks
import { useTheme } from './hooks/useTheme';
import { useGestures } from './hooks/useGestures';
import { useFamilyData } from './hooks/useFamilyData';
import { useSupabaseLink } from './hooks/useSupabaseLink';
import { useGoogleGenAI } from './hooks/useGoogleGenAI';

declare const html2canvas: any;
declare const jspdf: any;
declare const pako: any;

// Style Constants
const MENU_ITEM_CLASS = "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-200";
const MENU_HEADER_CLASS = "px-4 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1";
const ZOOM_BTN_CLASS = "w-10 h-10 rounded-full bg-gray-700/50 text-white backdrop-blur-sm flex items-center justify-center text-xl hover:bg-gray-600/70 shadow-md transition-colors";

function App() {
  // --- Hooks Initialization ---
  const { theme, setTheme, toggleTheme } = useTheme();
  const { 
      transform, viewportRef, resetTransform, handlers, handleZoomBtn, isZoomingViaWheel, isPanning 
  } = useGestures();
  
  const {
      people, setPeople, rootIdStack, setRootIdStack, rootId, 
      isInitialLoad, lastUpdated, isReadOnly, setIsReadOnly,
      viewMode, setViewMode, navigateTo, navigateBack, navigateToHome,
      handleDeletePerson, handlePersonUpdate, handleGalleryUpdate
  } = useFamilyData(resetTransform);

  const [isViewingTree, setIsViewingTree] = useState(false);
  const { isPasswordPromptOpen, setIsPasswordPromptOpen, encryptedData, decryptionError, setDecryptionError } = useSupabaseLink({ setIsViewingTree });
  const googleAI = useGoogleGenAI();

  // --- Local State ---
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, context: null });
  const [detailsModalPersonId, setDetailsModalPersonId] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Highlighting
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(null);
  const [highlightedPeople, setHighlightedPeople] = useState<Set<string> | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);

  // UI Toggles
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStatisticsModalOpen, setIsStatisticsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isNotificationSenderOpen, setIsNotificationSenderOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  
  // Language State
  const [language, setLanguage] = useState<Language>('ka');
  const t = translations[language]; // Translation Helper

  // User State
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // File Import Logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileAction, setFileAction] = useState<'import' | 'merge' | null>(null);
  
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- Derived State & Effects ---
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

  // Statistics Calculation
  const statistics = useMemo(() => {
    const list = Object.values(people) as Person[];
    const totalPeople = list.length;
    const male = list.filter(p => p.gender === Gender.Male).length;
    const female = list.filter(p => p.gender === Gender.Female).length;
    const living = list.filter(p => !p.deathDate).length;
    const deceased = list.filter(p => !!p.deathDate).length;

    // Age groups
    const ageGroups = { '0-18': 0, '19-35': 0, '36-60': 0, '60+': 0 };
    let totalAge = 0;
    let ageCount = 0;
    
    let oldest: { name: string; age: number } | null = null;
    let youngest: { name: string; age: number } | null = null;
    const addressCounts: Record<string, number> = {};

    list.forEach(p => {
        // Address Count
        if (p.contactInfo?.address) {
            const addr = p.contactInfo.address.trim();
            if (addr) {
                addressCounts[addr] = (addressCounts[addr] || 0) + 1;
            }
        }

        if (!p.birthDate) return;
        const age = calculateAge(p.birthDate, p.deathDate);
        if (age === null) return;
        
        if (!p.deathDate) {
             if (age <= 18) ageGroups['0-18']++;
             else if (age <= 35) ageGroups['19-35']++;
             else if (age <= 60) ageGroups['36-60']++;
             else ageGroups['60+']++;
             
             // Oldest
             if (!oldest || age > oldest.age) {
                 oldest = { name: `${p.firstName} ${p.lastName}`, age };
             }
             // Youngest (Living)
             if (!youngest || age < youngest.age) {
                 youngest = { name: `${p.firstName} ${p.lastName}`, age };
             }
        } else {
             totalAge += age;
             ageCount++;
        }
    });

    const averageLifespan = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;
    
    // Most Common Address
    let mostCommonAddress = null;
    let maxAddrCount = 0;
    Object.entries(addressCounts).forEach(([addr, count]) => {
        if (count > maxAddrCount) {
            maxAddrCount = count;
            mostCommonAddress = { address: addr, count };
        }
    });

    // Top Names
    const getTopNames = (gender: Gender) => {
        const counts: Record<string, number> = {};
        list.filter(p => p.gender === gender).forEach(p => {
            const name = p.firstName.trim();
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    };

    return {
      totalPeople,
      genderData: { male, female },
      statusData: { living, deceased },
      ageGroupData: ageGroups,
      generationData: { labels: [], data: [] }, // Simplified for performance
      birthRateData: { labels: [], data: [] },
      topMaleNames: getTopNames(Gender.Male),
      topFemaleNames: getTopNames(Gender.Female),
      oldestLivingPerson: oldest,
      youngestLivingPerson: youngest,
      averageLifespan,
      mostCommonAddress
    };
  }, [people]);


  // Header Scroll
  useEffect(() => {
    const handleScroll = () => setIsHeaderCollapsed(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Document Title
  useEffect(() => {
      const rootPerson = people['root'];
      if(rootPerson?.lastName){
        document.title = `${rootPerson.lastName} - Geni`;
      } else {
        document.title = 'Geni';
      }
  }, [people]);

  // Click Outside Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuRef]);

  // PWA Prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // --- Handlers ---

  const handleLandingPageEnter = (startName?: string) => {
    if (startName && startName.trim()) {
        const parts = startName.trim().split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        
        if (startName) setCurrentUser(startName);
        
        setPeople({ 
            'root': { 
                id: 'root', 
                firstName: firstName, 
                lastName: lastName, 
                gender: Gender.Male, 
                children: [], 
                parentIds: [], 
                exSpouseIds: [], 
                birthDate: '', 
                bio: 'დამფუძნებელი', 
                imageUrl: `https://avatar.iran.liara.run/public/boy?username=${firstName}` 
            } as Person 
        });
        setRootIdStack(['root']);
        setIsReadOnly(false);
    }
    setIsViewingTree(true);
  };

  const handleConnectionClick = useCallback((p1Id: string, p2Id: string, type: 'spouse' | 'parent-child') => {
    if (type === 'spouse') {
        setHighlightedPeople(new Set([p1Id, p2Id]));
    } else {
        const familyIds = getFamilyUnitFromConnection(p1Id, p2Id, people);
        setHighlightedPeople(familyIds);
    }
  }, [people]);

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
  
  const handleFormSubmit = useCallback((...args: any[]) => {
      if (!modalState.context) return;
      // @ts-ignore
      handlePersonUpdate(modalState.context.action, modalState.context.personId, ...args);
      handleCloseModal();
  }, [modalState.context, handlePersonUpdate, handleCloseModal]);
  
  const handleCloseDetailsAndDelete = useCallback((id: string) => {
      handleDeletePerson(id);
      setDetailsModalPersonId(null);
  }, [handleDeletePerson]);

  const handleSaveBio = useCallback((personId: string, bio: string) => {
      setPeople(currentPeople => {
          const person = currentPeople[personId];
          if (person) {
              return {
                  ...currentPeople,
                  [personId]: { ...person, bio }
              };
          }
          return currentPeople;
      });
  }, []);

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
          return fullName.includes(lowerCaseQuery) ||
                 (person.bio?.toLowerCase() ?? '').includes(lowerCaseQuery) ||
                 (person.contactInfo?.address?.toLowerCase() ?? '').includes(lowerCaseQuery);
      });
      setSearchResults(results);
  };

  const handleExportPdf = async () => {
    if (isReadOnly) return alert("დათვალიერების რეჟიმში PDF-ის გადმოწერა შეზღუდულია.");
    // PDF export only supports standard view for now
    if (viewMode !== 'default' && viewMode !== 'compact') return alert("PDF ექსპორტისთვის გადადით სტანდარტულ ან კომპაქტურ ხედზე.");

    const treeElement = viewportRef.current?.querySelector('.p-16 > div');
    if (!treeElement) return alert('ხის ექსპორტი ვერ მოხერხდა.');
    document.body.classList.add('pdf-exporting');
    try {
        const canvas = await html2canvas(treeElement as HTMLElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        const { jsPDF } = jspdf;
        const pdf = new jsPDF(canvas.width > canvas.height ? 'l' : 'p', 'px', [canvas.width, canvas.height]);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`გენეალოგიური-ხე-${people[rootId]?.firstName || 'tree'}.pdf`);
    } catch (error) {
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
      
      setPeople(parsedData.people);
      setRootIdStack(parsedData.rootIdStack);
      setIsReadOnly(!!parsedData.readOnly);
      setIsPasswordPromptOpen(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setDecryptionError("პაროლი არასწორია ან მონაცემები დაზიანებულია.");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleExportJson = () => {
    if (isReadOnly) return alert("შეზღუდულია.");
    try {
        const blob = new Blob([JSON.stringify({ people, rootIdStack }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        const rootPerson = people['root'];
        a.href = URL.createObjectURL(blob);
        a.download = `გენეალოგია-${rootPerson?.lastName || 'tree'}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsMenuOpen(false);
    } catch { alert("მონაცემების ექსპორტი ვერ მოხერხდა."); }
  };

  // File Import Logic
  const handleImportJson = () => { if (!isReadOnly) { setFileAction('import'); fileInputRef.current?.click(); } };
  const handleMergeJson = () => { if (!isReadOnly) { setFileAction('merge'); fileInputRef.current?.click(); } };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !fileAction) return;

      if (!window.confirm(fileAction === 'import' ? "ყურადღება: ფაილის იმპორტი წაშლის მიმდინარე ხეს." : "ახალი ინფორმაცია დაემატება არსებულს.")) {
          setFileAction(null); return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const importedData = JSON.parse(e.target?.result as string);
              const { isValid, error } = validatePeopleData(importedData);
              if (!isValid) throw new Error(error || "არასწორი ფაილი");

              if (fileAction === 'import') {
                setPeople(importedData.people);
                setRootIdStack(importedData.rootIdStack);
                setIsReadOnly(false);
                alert("წარმატებით იმპორტირდა.");
              } else {
                 // Simple merge logic: overwrite existing keys
                 setPeople(prev => ({ ...prev, ...importedData.people }));
                 alert("წარმატებით შეერწყა.");
              }
          } catch (error: any) { alert(`შეცდომა: ${error.message}`); } 
          finally { setFileAction(null); if(event.target) event.target.value = ''; }
      };
      reader.readAsText(file);
  };
  
  const handleStartCreating = () => {
    setPeople({ 'root': { id: 'root', firstName: 'დამფუძნებელი', lastName: 'გვარი', gender: Gender.Male, children: [], parentIds: [], exSpouseIds: [], birthDate: '1950-01-01', bio: 'საწყისი წერტილი.', imageUrl: `https://avatar.iran.liara.run/public/boy?username=Founder` } as Person });
    setRootIdStack(['root']);
    setIsReadOnly(false);
  };

  const handleInstallClick = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      setInstallPrompt(null);
  };

  // --- Render Props ---
  const peopleWithBirthdays = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return (Object.values(people) as Person[]).filter((p) => {
        if (p.deathDate || !p.birthDate) return false;
        const parts = p.birthDate.split('-');
        return parts.length > 1 && (parseInt(parts[1], 10) - 1) === currentMonth;
    });
  }, [people]);

  const rootPerson = people['root'];
  
  // Dynamic Title Construction
  let headerTitle = t.tree_default_title;
  if (rootPerson?.lastName) {
      if (language === 'ka') {
          headerTitle = `${rootPerson.lastName}${t.tree_title_suffix}`;
      } else {
          headerTitle = `${t.tree_title_prefix}${rootPerson.lastName}`;
      }
  }

  const treeStats = {
      totalPeople: statistics.totalPeople,
      lastUpdated: lastUpdated,
      rootName: rootPerson ? `${rootPerson.firstName} ${rootPerson.lastName}` : "N/A"
  };

  const renderContent = () => {
      if (Object.keys(people).length === 0 || !people[rootId]) {
          return <InitialView onStartCreating={handleStartCreating} onImport={() => setIsImportModalOpen(true)} language={language} />;
      }

      switch (viewMode) {
          case 'list':
              return <TreeViewList rootId={rootId} people={people} onNavigate={(id) => { navigateTo(id); setHighlightedPersonId(id); }} onShowDetails={setDetailsModalPersonId} highlightedPersonId={highlightedPersonId} language={language} />;
          case 'timeline':
              // @ts-ignore
              return <TimelineView people={people} onShowDetails={setDetailsModalPersonId} highlightedPersonId={highlightedPersonId} />;
          case 'map':
              return <MapPanel people={people} onShowDetails={setDetailsModalPersonId} language={language} />;
          default:
              return (
                <div ref={viewportRef} className="flex-grow flex flex-col relative overflow-hidden" {...handlers} onClick={() => setHighlightedPeople(null)} style={{cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none'}}>
                    <div className={`flex-grow flex items-center justify-center ${isZoomingViaWheel ? '' : 'transition-transform duration-200 ease-out'}`} style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
                        <div className="p-16">
                            <TreeNode 
                                personId={rootId} viewRootId={rootId} people={people} 
                                onAdd={handleOpenAddModal} onEdit={handleOpenEditModal} onShowDetails={setDetailsModalPersonId} onNavigate={navigateTo}
                                highlightedPersonId={highlightedPersonId} highlightedPeople={highlightedPeople} 
                                onConnectionClick={handleConnectionClick} hoveredConnections={hoveredConnections} onSetHover={setHoveredPersonId}
                                viewMode={viewMode as 'default' | 'compact'} isReadOnly={isReadOnly}
                                language={language}
                            />
                        </div>
                    </div>
                </div>
              );
      }
  };

  if (isInitialLoad) return <div className="h-screen bg-white dark:bg-gray-900 flex items-center justify-center text-xl text-gray-800 dark:text-gray-200">იტვირთება...</div>;
  if (!isViewingTree) return <LandingPage onEnter={handleLandingPageEnter} language={language} onLanguageChange={setLanguage} />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col">
      {/* Header */}
      <header className={`p-4 z-20 bg-white/80 dark:bg-gray-900/80 sticky top-0 transition-all duration-300 ${isZoomingViaWheel ? '' : 'backdrop-blur-sm'} ${isHeaderCollapsed ? 'py-2' : 'sm:py-6'}`}>
        
        {/* Main Header Content */}
        <div className={`w-full ${isSearchOpen ? 'hidden' : 'block'}`}>
            <div className="flex items-center justify-between gap-4">
                
                {/* Left: Navigation Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {rootIdStack.length > 1 && (
                        <>
                            <button onClick={navigateBack} className="flex items-center gap-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"><BackIcon className="w-6 h-6"/><span className="hidden sm:inline">{t.header_back}</span></button>
                            <button onClick={navigateToHome} className="flex items-center gap-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"><HomeIcon className="w-6 h-6"/></button>
                        </>
                    )}
                </div>

                {/* Center: Title */}
                <div className="flex-1 text-left xl:text-center min-w-0 flex flex-col items-start xl:items-center">
                    <h1 className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 truncate pb-1 ${isHeaderCollapsed ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-5xl'} w-full`}>{headerTitle}</h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Desktop Search Buttons */}
                    <div className="hidden sm:flex items-center gap-2">
                        <button onClick={() => setIsSearchOpen(true)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" title={t.menu_search}><SearchIcon className="w-6 h-6"/></button>
                        <button onClick={() => googleAI.setIsOpen(true)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" title="Google AI"><GlobeIcon className="w-6 h-6"/></button>
                    </div>
                    
                    {/* Menu Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(p => !p)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><MenuIcon className="w-6 h-6"/></button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-20">
                                <ul className="py-2 max-h-[80vh] overflow-y-auto">
                                    <li><div className={MENU_HEADER_CLASS}>{t.menu_navigation}</div></li>
                                    <li><button onClick={() => { setIsViewingTree(false); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><HomeIcon className="w-5 h-5"/><span>{t.menu_home}</span></button></li>
                                    {!isReadOnly && <li><button onClick={() => { setIsNotificationSenderOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><MessageIcon className="w-5 h-5"/><span>{t.menu_message}</span></button></li>}
                                    {!isReadOnly && <li><button onClick={() => { setIsShareModalOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><ShareIcon className="w-5 h-5"/><span>{t.menu_share}</span></button></li>}
                                    
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>

                                    {/* Mobile Search Actions */}
                                    <li className="sm:hidden">
                                        <div className={MENU_HEADER_CLASS}>{t.menu_search}</div>
                                    </li>
                                    <li className="sm:hidden">
                                        <button onClick={() => { setIsSearchOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}>
                                            <SearchIcon className="w-5 h-5"/><span>{t.menu_search_person}</span>
                                        </button>
                                    </li>
                                    <li className="sm:hidden">
                                        <button onClick={() => { googleAI.setIsOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}>
                                            <GlobeIcon className="w-5 h-5"/><span>{t.menu_search_history}</span>
                                        </button>
                                    </li>
                                    <li className="sm:hidden"><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>
                                    
                                    <li><div className={MENU_HEADER_CLASS}>{t.menu_analysis}</div></li>
                                    <li><button onClick={() => { setIsStatisticsModalOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><StatsIcon className="w-5 h-5"/><span>{t.menu_stats}</span></button></li>
                                    <li><button onClick={() => { setIsRelationshipModalOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><CalculatorIcon className="w-5 h-5"/><span>{t.menu_find_rel}</span></button></li>
                                    {!isReadOnly && <li><button onClick={handleExportPdf} className={MENU_ITEM_CLASS}><ExportIcon className="w-5 h-5"/><span>{t.menu_export_pdf}</span></button></li>}
                                    
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>
                                    <li><div className={MENU_HEADER_CLASS}>{t.menu_view}</div></li>
                                    <li><button onClick={() => setViewMode('default')} className={`${MENU_ITEM_CLASS} ${viewMode === 'default' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}><ViewNormalIcon className="w-5 h-5"/><span>{t.menu_view_default}</span></button></li>
                                    <li><button onClick={() => setViewMode('compact')} className={`${MENU_ITEM_CLASS} ${viewMode === 'compact' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}><ViewCompactIcon className="w-5 h-5"/><span>{t.menu_view_compact}</span></button></li>
                                    <li><button onClick={() => setViewMode('list')} className={`${MENU_ITEM_CLASS} ${viewMode === 'list' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}><ListBulletIcon className="w-5 h-5"/><span>{t.menu_view_list}</span></button></li>
                                    <li><button onClick={() => setViewMode('timeline' as any)} className={`${MENU_ITEM_CLASS} ${viewMode === 'timeline' as any ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}><ClockIcon className="w-5 h-5"/><span>{t.menu_view_timeline}</span></button></li>
                                    <li><button onClick={() => setViewMode('map' as any)} className={`${MENU_ITEM_CLASS} ${viewMode === 'map' as any ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}><MapIcon className="w-5 h-5"/><span>{t.menu_view_map}</span></button></li>
                                    
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>
                                    <li><button onClick={() => { setIsSettingsModalOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><CogIcon className="w-5 h-5"/><span>{t.menu_settings}</span></button></li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
            
        {/* Search Bar Mobile/Desktop Overlay */}
        {isSearchOpen && (
            <div className="absolute inset-0 bg-white dark:bg-gray-900 z-30 flex items-center px-4 animate-fade-in">
                <SearchIcon className="w-6 h-6 text-gray-400 mr-3"/>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={t.search_placeholder}
                    className="flex-grow bg-transparent border-none outline-none text-lg text-gray-800 dark:text-gray-100 placeholder-gray-400"
                    autoFocus
                />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} className="p-2 text-gray-500 dark:text-gray-400">
                    <CloseIcon className="w-6 h-6"/>
                </button>
            </div>
        )}
        
        {/* Search Results Dropdown */}
        {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 shadow-xl border-t border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto z-20">
                <ul>
                    {searchResults.map(person => (
                        <li key={person.id}>
                            <button 
                                onClick={() => { 
                                    navigateTo(person.id); 
                                    setHighlightedPersonId(person.id); 
                                    setIsSearchOpen(false); 
                                    setSearchQuery('');
                                }}
                                className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-4 border-b border-gray-100 dark:border-gray-700 last:border-0"
                            >
                                {person.imageUrl ? (
                                    <img src={person.imageUrl} className="w-10 h-10 rounded-full object-cover"/>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500">
                                        <SearchIcon className="w-5 h-5"/>
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-gray-100">{person.firstName} {person.lastName}</p>
                                    <p className="text-xs text-gray-500">{person.birthDate ? person.birthDate.split('-')[0] : '?'}</p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </header>

      <main className="flex-grow flex flex-col relative z-0">
        {renderContent()}
      </main>

      {/* Floating Elements */}
      <NotificationBanner language={language} />
      <BirthdayNotifier peopleWithBirthdays={peopleWithBirthdays} onNavigate={navigateTo} />

      {/* Modals */}
      <AddPersonModal 
        isOpen={modalState.isOpen} 
        onClose={handleCloseModal} 
        onSubmit={handleFormSubmit}
        onDelete={handleDeletePerson}
        context={modalState.context}
        language={language}
        anchorPerson={modalState.context && modalState.context.personId ? people[modalState.context.personId] : null}
        anchorSpouse={modalState.context?.action === 'add' && modalState.context.personId && people[modalState.context.personId]?.spouseId ? people[people[modalState.context.personId].spouseId!] : null}
        personToEdit={modalState.context?.action === 'edit' ? people[modalState.context.personId] : null}
        anchorPersonExSpouses={modalState.context?.action === 'add' && modalState.context.personId ? (people[modalState.context.personId].exSpouseIds || []).map(id => people[id]).filter(Boolean) : []}
      />

      <DetailsModal 
        person={detailsModalPersonId ? people[detailsModalPersonId] : null}
        people={people}
        onClose={() => setDetailsModalPersonId(null)}
        onEdit={handleOpenEditModal}
        onDelete={handleCloseDetailsAndDelete}
        onNavigate={(id) => { navigateTo(id); setDetailsModalPersonId(null); }}
        onGoogleSearch={(person) => googleAI.openSearchForPerson(person)}
        onShowOnMap={(addr) => { /* Implement map focus if needed */ }}
        isReadOnly={isReadOnly}
        language={language}
        onGenerateBio={googleAI.generateBiography}
        onSaveBio={handleSaveBio}
        onUpdateGallery={handleGalleryUpdate}
      />

      <StatisticsModal 
        isOpen={isStatisticsModalOpen} 
        onClose={() => setIsStatisticsModalOpen(false)} 
        stats={statistics} 
        theme={theme}
        language={language}
      />

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        data={{ people, rootIdStack }} 
        language={language}
      />

      <PasswordPromptModal 
        isOpen={isPasswordPromptOpen}
        onClose={() => { /* Should probably not close if required, but for now allow close */ setIsPasswordPromptOpen(false); }}
        onSubmit={handlePasswordSubmit}
        error={decryptionError}
        isLoading={isDecrypting}
        language={language}
      />

      <GoogleSearchPanel 
        isOpen={googleAI.isOpen}
        onClose={() => googleAI.setIsOpen(false)}
        onSearch={() => googleAI.handleSearch()}
        query={googleAI.query}
        setQuery={googleAI.setQuery}
        result={googleAI.result}
        sources={googleAI.sources}
        isLoading={googleAI.isLoading}
        error={googleAI.error}
        language={language}
      />

      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportFromFile={handleImportJson}
        onMergeFromFile={handleMergeJson}
        onRestore={(data) => {
            setPeople(data.people);
            setRootIdStack(data.rootIdStack || ['root']);
            setIsReadOnly(!!data.readOnly);
        }}
        language={language}
      />

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExportJson={handleExportJson}
        data={{ people, rootIdStack }}
        language={language}
      />

      <FileManagerModal 
        isOpen={isFileManagerOpen}
        onClose={() => setIsFileManagerOpen(false)}
        language={language}
      />

      <NotificationSenderModal 
        isOpen={isNotificationSenderOpen}
        onClose={() => setIsNotificationSenderOpen(false)}
        language={language}
      />

      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        onLogout={() => { setCurrentUser(null); setIsViewingTree(false); }}
        openImport={() => { setIsSettingsModalOpen(false); setIsImportModalOpen(true); }}
        openExport={() => { setIsSettingsModalOpen(false); setIsExportModalOpen(true); }}
        openFileManager={() => { setIsSettingsModalOpen(false); setIsFileManagerOpen(true); }}
        treeStats={treeStats}
      />

      <RelationshipFinderModal 
        isOpen={isRelationshipModalOpen}
        onClose={() => setIsRelationshipModalOpen(false)}
        people={people}
        language={language}
      />

      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelected} 
        className="hidden" 
        accept=".json" 
      />

    </div>
  );
}

export default App;
