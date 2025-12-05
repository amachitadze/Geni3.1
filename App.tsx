
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Person, ModalState, Gender } from './types';
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
import { formatTimestamp, calculateAge } from './utils/dateUtils';
import { validatePeopleData, getFamilyUnitFromConnection } from './utils/treeUtils';
import { 
    SearchIcon, BackIcon, HomeIcon, MenuIcon, ExportIcon, 
    CenterIcon, StatsIcon, CloseIcon, ShareIcon, JsonExportIcon, 
    JsonImportIcon, SunIcon, MoonIcon, ViewCompactIcon, ViewNormalIcon, 
    ListBulletIcon, GlobeIcon, DocumentIcon 
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
      handleDeletePerson, handlePersonUpdate
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
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
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

    list.forEach(p => {
        if (!p.birthDate) return;
        const age = calculateAge(p.birthDate, p.deathDate);
        if (age === null) return;
        
        if (!p.deathDate) {
             if (age <= 18) ageGroups['0-18']++;
             else if (age <= 35) ageGroups['19-35']++;
             else if (age <= 60) ageGroups['36-60']++;
             else ageGroups['60+']++;
             
             if (!oldest || age > oldest.age) {
                 oldest = { name: `${p.firstName} ${p.lastName}`, age };
             }
        } else {
             totalAge += age;
             ageCount++;
        }
    });

    const averageLifespan = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;
    
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
      averageLifespan,
      mostCommonAddress: null
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
        document.title = `${rootPerson.lastName}ების გენეალოგიური ხე`;
      } else {
        document.title = 'გენეალოგიური ხე';
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
  const headerTitle = rootPerson?.lastName ? `${rootPerson.lastName}ების გენეალოგიური ხე` : 'გენეალოგიური ხე';

  if (isInitialLoad) return <div className="h-screen bg-white dark:bg-gray-900 flex items-center justify-center text-xl text-gray-800 dark:text-gray-200">იტვირთება...</div>;
  if (!isViewingTree) return <LandingPage onEnter={() => setIsViewingTree(true)} />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col">
      {/* Header */}
      <header className={`p-4 z-20 bg-white/80 dark:bg-gray-900/80 sticky top-0 transition-all duration-300 ${isZoomingViaWheel ? '' : 'backdrop-blur-sm'} ${isHeaderCollapsed ? 'py-2' : 'sm:py-6'}`}>
        <div className={`w-full ${isSearchOpen ? 'hidden' : 'block'}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                    {rootIdStack.length > 1 && (
                        <>
                            <button onClick={navigateBack} className="flex items-center gap-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"><BackIcon className="w-6 h-6"/><span className="hidden sm:inline">უკან</span></button>
                            <button onClick={navigateToHome} className="flex items-center gap-1 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"><HomeIcon className="w-6 h-6"/></button>
                        </>
                    )}
                </div>
                <div className="flex-1 text-left xl:text-center min-w-0 flex flex-col items-start xl:items-center">
                    <h1 className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 truncate pb-1 ${isHeaderCollapsed ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-5xl'}`}>{headerTitle}</h1>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setIsSearchOpen(true)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><SearchIcon className="w-6 h-6"/></button>
                    <button onClick={() => googleAI.setIsOpen(true)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><GlobeIcon className="w-6 h-6"/></button>
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(p => !p)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"><MenuIcon className="w-6 h-6"/></button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-20">
                                <ul className="py-1">
                                    <li><button onClick={() => { setIsViewingTree(false); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><HomeIcon className="w-5 h-5"/><span>საწყისი გვერდი</span></button></li>
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>
                                    <li><button onClick={() => { setIsShareModalOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><ShareIcon className="w-5 h-5"/><span>გაზიარება</span></button></li>
                                    <li><button onClick={() => { setIsStatisticsModalOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><StatsIcon className="w-5 h-5"/><span>სტატისტიკა</span></button></li>
                                    <li><button onClick={handleExportPdf} className={MENU_ITEM_CLASS}><ExportIcon className="w-5 h-5"/><span>PDF ექსპორტი</span></button></li>
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>
                                    <li><button onClick={() => { setIsFileManagerOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><DocumentIcon className="w-5 h-5"/><span>მონაცემების მართვა</span></button></li>
                                    <li><button onClick={() => { setIsImportModalOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><JsonImportIcon className="w-5 h-5"/><span>იმპორტი</span></button></li>
                                    <li><button onClick={() => { setIsExportModalOpen(true); setIsMenuOpen(false); }} className={MENU_ITEM_CLASS}><JsonExportIcon className="w-5 h-5"/><span>ექსპორტი</span></button></li>
                                    <li><hr className="my-1 border-gray-200 dark:border-gray-700" /></li>
                                    <li><button onClick={toggleTheme} className={`${MENU_ITEM_CLASS} justify-between`}><span>თემის შეცვლა</span> {theme === 'dark' ? <SunIcon className="w-5 h-5 text-yellow-400"/> : <MoonIcon className="w-5 h-5 text-indigo-500"/>}</button></li>
                                    <li><button onClick={() => setViewMode('default')} className={`${MENU_ITEM_CLASS} ${viewMode === 'default' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}><ViewNormalIcon className="w-5 h-5"/><span>სტანდარტული</span></button></li>
                                    <li><button onClick={() => setViewMode('compact')} className={`${MENU_ITEM_CLASS} ${viewMode === 'compact' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}><ViewCompactIcon className="w-5 h-5"/><span>კომპაქტური</span></button></li>
                                    <li><button onClick={() => setViewMode('list')} className={`${MENU_ITEM_CLASS} ${viewMode === 'list' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}`}><ListBulletIcon className="w-5 h-5"/><span>სია</span></button></li>
                                </ul>
                                <div className="px-4 py-2 text-xs text-center text-gray-400 border-t border-gray-200 dark:border-gray-700">ბოლოს განახლდა: {formatTimestamp(lastUpdated)}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Search Bar Overlay */}
        <div className={`absolute top-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 shadow-md transition-transform duration-300 ${isSearchOpen ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="relative w-full max-w-2xl mx-auto">
                <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input type="text" placeholder="მოძებნეთ პიროვნება..." value={searchQuery} onChange={handleSearchChange} className="w-full h-12 pl-10 pr-10 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" autoFocus />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); setHighlightedPersonId(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"><CloseIcon className="w-5 h-5"/></button>
                {searchResults.length > 0 && (
                <ul className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-80 overflow-y-auto z-30">
                    {searchResults.map(p => (
                    <li key={p.id} onClick={() => { navigateTo(p.id); setHighlightedPersonId(p.id); setSearchQuery(''); setSearchResults([]); }} className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200">{p.firstName} {p.lastName}</li>
                    ))}
                </ul>
                )}
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col relative overflow-hidden">
        {Object.keys(people).length > 0 && people[rootId] ? (
            viewMode === 'list' ? (
                <TreeViewList rootId={rootId} people={people} onNavigate={(id) => { navigateTo(id); setHighlightedPersonId(id); }} onShowDetails={setDetailsModalPersonId} highlightedPersonId={highlightedPersonId} />
            ) : (
                <div ref={viewportRef} className="flex-grow flex flex-col relative overflow-hidden" {...handlers} onClick={() => setHighlightedPeople(null)} style={{cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none'}}>
                    <div className={`flex-grow flex items-center justify-center ${isZoomingViaWheel ? '' : 'transition-transform duration-200 ease-out'}`} style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
                        <div className="p-16">
                            <TreeNode 
                                personId={rootId} viewRootId={rootId} people={people} 
                                onAdd={handleOpenAddModal} onEdit={handleOpenEditModal} onShowDetails={setDetailsModalPersonId} onNavigate={navigateTo}
                                highlightedPersonId={highlightedPersonId} highlightedPeople={highlightedPeople} 
                                onConnectionClick={handleConnectionClick} hoveredConnections={hoveredConnections} onSetHover={setHoveredPersonId}
                                viewMode={viewMode as 'default' | 'compact'} isReadOnly={isReadOnly}
                            />
                        </div>
                    </div>
                </div>
            )
        ) : <InitialView onStartCreating={handleStartCreating} onImport={() => setIsImportModalOpen(true)} />}

        {/* Floating Controls */}
        {viewMode !== 'list' && (
            <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-10">
                <button onClick={() => handleZoomBtn('in')} className={ZOOM_BTN_CLASS}>+</button>
                <button onClick={() => handleZoomBtn('out')} className={ZOOM_BTN_CLASS}>-</button>
                <button onClick={resetTransform} className={ZOOM_BTN_CLASS}><CenterIcon className="w-5 h-5"/></button>
            </div>
        )}
        
        {isReadOnly && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-full shadow-lg">
                <span className="font-medium text-sm">👁️ დამთვალიერებლის რეჟიმი</span>
                <button onClick={() => { if(window.confirm("გამოსვლა?")) { setPeople({}); setRootIdStack([]); setIsReadOnly(false); setIsViewingTree(false); window.history.replaceState({}, '', window.location.pathname); } }} className="ml-2 hover:bg-yellow-200 rounded-full"><CloseIcon className="w-4 h-4" /></button>
            </div>
        )}

        <BirthdayNotifier peopleWithBirthdays={peopleWithBirthdays} onNavigate={(id) => { navigateTo(id); setHighlightedPersonId(id); }} />
        {installPrompt && (
          <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-2xl z-50 flex gap-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">დააინსტალირეთ აპლიკაცია.</p>
            <button onClick={handleInstallClick} className="text-sm text-purple-600 font-bold">ინსტალაცია</button>
            <button onClick={() => setInstallPrompt(null)} className="text-sm text-gray-500">დახურვა</button>
          </div>
        )}
      </main>

      {/* Modals */}
      {modalState.isOpen && modalState.context && (
        <AddPersonModal 
          isOpen={modalState.isOpen} onClose={handleCloseModal} onSubmit={handleFormSubmit} onDelete={handleCloseDetailsAndDelete}
          context={modalState.context} anchorPerson={people[modalState.context.personId]}
          anchorSpouse={people[modalState.context.personId]?.spouseId ? people[people[modalState.context.personId].spouseId!] : null}
          personToEdit={modalState.context.action === 'edit' ? people[modalState.context.personId] : null}
          anchorPersonExSpouses={people[modalState.context.personId]?.exSpouseIds?.map(id => people[id]).filter(Boolean)}
        />
      )}
      {detailsModalPersonId && (
        <DetailsModal 
          person={people[detailsModalPersonId]} people={people} onClose={() => setDetailsModalPersonId(null)}
          onEdit={handleOpenEditModal} onDelete={handleCloseDetailsAndDelete}
          onGoogleSearch={googleAI.openSearchForPerson}
          onShowOnMap={(addr) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank')}
          onNavigate={(id) => { setDetailsModalPersonId(null); navigateTo(id); }} isReadOnly={isReadOnly}
        />
      )}
      {isStatisticsModalOpen && <StatisticsModal isOpen={isStatisticsModalOpen} onClose={() => setIsStatisticsModalOpen(false)} stats={statistics} theme={theme} />} 

      {isShareModalOpen && <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} data={{ people, rootIdStack }} />}
      {isPasswordPromptOpen && <PasswordPromptModal isOpen={isPasswordPromptOpen} onSubmit={handlePasswordSubmit} onClose={() => setIsPasswordPromptOpen(false)} error={decryptionError} isLoading={isDecrypting} />}
      
      <GoogleSearchPanel 
          isOpen={googleAI.isOpen} onClose={() => googleAI.setIsOpen(false)} onSearch={() => googleAI.handleSearch()}
          query={googleAI.query} setQuery={googleAI.setQuery} result={googleAI.result} sources={googleAI.sources} isLoading={googleAI.isLoading} error={googleAI.error}
      />

      {isImportModalOpen && <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportFromFile={handleImportJson} onMergeFromFile={handleMergeJson} onRestore={(d) => { setPeople(d.people); setRootIdStack(d.rootIdStack); setIsReadOnly(false); }} />}
      {isExportModalOpen && <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExportJson={handleExportJson} data={{ people, rootIdStack }} />}
      {isFileManagerOpen && <FileManagerModal isOpen={isFileManagerOpen} onClose={() => setIsFileManagerOpen(false)} />}
      
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".json" style={{ display: 'none' }} />
    </div>
  );
}

export default App;
