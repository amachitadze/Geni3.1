
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Person, People } from '../types';
import { getYear } from '../utils/dateUtils';
import { historicalEvents } from '../data/historicalEvents';
import { DefaultAvatar, PlusIcon, MinusIcon, CenterIcon } from './Icons';

interface TimelineViewProps {
    people: People;
    onShowDetails: (id: string) => void;
    highlightedPersonId?: string | null;
}

const TimelineView: React.FC<TimelineViewProps> = ({ people, onShowDetails, highlightedPersonId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    
    const [pixelsPerYear, setPixelsPerYear] = useState(10); // Initial zoom
    
    // Drag/Pan State
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    
    // Event Z-Index State
    const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);
    
    // Sort people by birth year
    const sortedPeople = useMemo(() => {
        return (Object.values(people) as Person[])
            .filter(p => p.birthDate) // Only show people with birth dates
            .sort((a, b) => {
                const yearA = getYear(a.birthDate);
                const yearB = getYear(b.birthDate);
                // Ensure years are treated as numbers for subtraction
                const numA = typeof yearA === 'string' ? parseInt(yearA, 10) : yearA;
                const numB = typeof yearB === 'string' ? parseInt(yearB, 10) : yearB;
                return (numA || 0) - (numB || 0);
            });
    }, [people]);

    // Calculate time range
    const { minYear, maxYear } = useMemo(() => {
        if (sortedPeople.length === 0) return { minYear: 1900, maxYear: new Date().getFullYear() };
        
        let min = Infinity;
        let max = -Infinity;
        
        sortedPeople.forEach(p => {
            let b = getYear(p.birthDate);
            if (typeof b === 'string') b = parseInt(b, 10);
            if (b) min = Math.min(min, b);
            
            if (p.deathDate) {
                let d = getYear(p.deathDate);
                if (typeof d === 'string') d = parseInt(d, 10);
                if (d) max = Math.max(max, d);
            } else {
                max = Math.max(max, new Date().getFullYear());
            }
        });

        // Expand for events
        historicalEvents.forEach(e => {
            min = Math.min(min, e.year);
            max = Math.max(max, e.year);
        });

        return { minYear: min - 10, maxYear: max + 10 };
    }, [sortedPeople]);

    // Generate years array for header
    const years = useMemo(() => {
        const arr = [];
        for (let i = 0; i <= Math.ceil((maxYear - minYear) / 10); i++) {
            const year = Math.ceil(minYear / 10) * 10 + (i * 10);
            if (year <= maxYear) arr.push({ year, left: (year - minYear) * pixelsPerYear });
        }
        return arr;
    }, [minYear, maxYear, pixelsPerYear]);

    // Smart Lane Algorithm to prevent overlap
    const lanes = useMemo(() => {
        const calculatedLanes: Person[][] = [];
        
        sortedPeople.forEach(person => {
            let birth = getYear(person.birthDate);
            if (typeof birth === 'string') birth = parseInt(birth, 10) || 0;
            
            let death = person.deathDate ? getYear(person.deathDate) : new Date().getFullYear();
            if (typeof death === 'string') death = parseInt(death, 10) || new Date().getFullYear();
            
            // Add slight padding to death year for visual separation
            death += 1; 

            let placed = false;
            
            for (let i = 0; i < calculatedLanes.length; i++) {
                const lane = calculatedLanes[i];
                const lastPersonInLane = lane[lane.length - 1];
                let lastDeath = lastPersonInLane.deathDate ? getYear(lastPersonInLane.deathDate) : new Date().getFullYear();
                if (typeof lastDeath === 'string') lastDeath = parseInt(lastDeath, 10) || new Date().getFullYear();
                
                // If this person's birth is after the last person in this lane died (+ padding)
                if (birth > lastDeath) {
                    lane.push(person);
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                calculatedLanes.push([person]);
            }
        });
        
        return calculatedLanes;
    }, [sortedPeople]);

    // Total width calculation
    const totalWidth = (maxYear - minYear) * pixelsPerYear;
    const laneHeight = 60;
    const headerHeight = 60; // Space reserved at top
    const footerHeight = 160; // Space reserved at bottom
    
    // Calculate precise event positions
    const eventPositions = useMemo(() => {
        return historicalEvents
            .filter(e => e.year >= minYear && e.year <= maxYear)
            .map(e => ({
                ...e,
                left: (e.year - minYear) * pixelsPerYear
            }));
    }, [minYear, maxYear, pixelsPerYear]);

    const handleZoom = (delta: number) => {
        setPixelsPerYear(prev => Math.max(2, Math.min(50, prev + delta)));
    };

    const handleReset = () => {
        setPixelsPerYear(10);
        if (containerRef.current) {
             const centerPos = (totalWidth / 2) - (containerRef.current.clientWidth / 2);
             containerRef.current.scrollTo({ left: centerPos, behavior: 'smooth' });
        }
    };

    // Scroll Sync Handler
    const syncScroll = () => {
        if (containerRef.current) {
            const left = containerRef.current.scrollLeft;
            if (headerRef.current) {
                headerRef.current.style.transform = `translateX(-${left}px)`;
            }
            if (footerRef.current) {
                footerRef.current.style.transform = `translateX(-${left}px)`;
            }
        }
    };

    useEffect(() => {
        // Initial sync
        syncScroll();
        if (containerRef.current) {
            // Scroll to center initially
            containerRef.current.scrollLeft = (totalWidth / 2) - (containerRef.current.clientWidth / 2);
        }
    }, [totalWidth]);

    // --- Drag & Pan Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-person-id], button, .historical-event-card')) return;
        
        const slider = containerRef.current;
        if(!slider) return;

        setIsDown(true);
        setStartX(e.pageX - slider.offsetLeft);
        setScrollLeft(slider.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDown(false);
    };

    const handleMouseUp = () => {
        setIsDown(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDown) return;
        e.preventDefault();
        const slider = containerRef.current;
        if(!slider) return;

        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX); 
        slider.scrollLeft = scrollLeft - walk;
    };

    const handleContainerClick = () => {
        if (activeEventIndex !== null) setActiveEventIndex(null);
    };

    if (sortedPeople.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">ინფორმაციის საჩვენებლად საჭიროა დაბადების თარიღების შეყვანა.</div>;
    }

    return (
        <div className="relative h-full w-full bg-gray-100 dark:bg-gray-900 overflow-hidden flex flex-col" onClick={handleContainerClick}>
            
            {/* Zoom Controls */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-auto">
                <button onClick={() => handleZoom(2)} className="w-9 h-9 rounded-full bg-gray-700/80 text-white backdrop-blur-sm shadow-xl flex items-center justify-center hover:bg-gray-600 transition-all active:scale-95">
                    <PlusIcon className="w-5 h-5" />
                </button>
                <button onClick={() => handleZoom(-2)} className="w-9 h-9 rounded-full bg-gray-700/80 text-white backdrop-blur-sm shadow-xl flex items-center justify-center hover:bg-gray-600 transition-all active:scale-95">
                    <MinusIcon className="w-5 h-5" />
                </button>
                <button onClick={handleReset} className="w-9 h-9 rounded-full bg-gray-700/80 text-white backdrop-blur-sm shadow-xl flex items-center justify-center hover:bg-gray-600 transition-all active:scale-95">
                    <CenterIcon className="w-5 h-5" />
                </button>
            </div>

            {/* FIXED HEADER (Years) - Synced via transform */}
            {/* Changed from fixed top-[...] to absolute top-0 to stick to the parent container top */}
            <div className="absolute top-0 left-0 right-0 h-14 z-30 pointer-events-none overflow-hidden select-none bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
                <div ref={headerRef} className="absolute top-0 left-0 h-full will-change-transform">
                    {years.map((y) => (
                        <div 
                            key={y.year} 
                            style={{ position: 'absolute', left: y.left + 4, top: 12 }} 
                            className="text-xs text-gray-700 dark:text-gray-300 font-mono font-bold px-2 py-0.5 rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/20 dark:border-white/10"
                        >
                            {y.year}
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN SCROLL AREA (Grid + People) */}
            <div 
                ref={containerRef}
                className={`flex-grow w-full overflow-x-auto overflow-y-auto relative z-10 ${isDown ? 'cursor-grabbing' : 'cursor-grab'}`}
                onScroll={syncScroll}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                <div style={{ width: `${totalWidth}px`, height: '100%', minHeight: `${lanes.length * laneHeight + headerHeight + footerHeight}px`, paddingTop: headerHeight, paddingBottom: footerHeight, position: 'relative' }}>
                    
                    {/* Background Grid Lines */}
                    <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none z-0">
                        {years.map((y) => (
                            <div key={y.year} style={{ position: 'absolute', left: y.left, top: 0, bottom: 0, borderLeft: '1px dashed rgba(156, 163, 175, 0.15)' }} />
                        ))}
                        {eventPositions.map((e, idx) => (
                            <div key={idx} style={{ position: 'absolute', left: e.left, top: 0, bottom: 0, borderLeft: '2px solid rgba(255, 99, 71, 0.1)' }} />
                        ))}
                    </div>

                    {/* People Lanes */}
                    {lanes.map((lane, laneIndex) => (
                        <div key={laneIndex} style={{ height: laneHeight, position: 'relative' }}>
                            {lane.map(person => {
                                let birth = getYear(person.birthDate);
                                if (typeof birth === 'string') birth = parseInt(birth, 10) || 0;
                                
                                let death = person.deathDate ? getYear(person.deathDate) : new Date().getFullYear();
                                if (typeof death === 'string') death = parseInt(death, 10) || new Date().getFullYear();

                                const left = (birth - minYear) * pixelsPerYear;
                                const width = Math.max(pixelsPerYear, (death - birth) * pixelsPerYear); 
                                
                                const isHighlighted = highlightedPersonId === person.id;
                                const isDeceased = !!person.deathDate;
                                
                                return (
                                    <div
                                        key={person.id}
                                        data-person-id={person.id}
                                        onClick={(e) => { e.stopPropagation(); onShowDetails(person.id); }}
                                        className={`absolute rounded-full shadow-sm flex items-center px-2 cursor-pointer transition-all hover:scale-[1.02] hover:z-30 group overflow-hidden border 
                                            ${isHighlighted ? 'ring-4 ring-yellow-400 z-20' : ''} 
                                            ${isDeceased ? 'grayscale opacity-90' : ''}`}
                                        style={{
                                            left,
                                            width,
                                            top: 4,
                                            height: laneHeight - 16,
                                            backgroundColor: person.gender === 'male' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(236, 72, 153, 0.8)',
                                            borderColor: person.gender === 'male' ? 'rgb(37, 99, 235)' : 'rgb(219, 39, 119)'
                                        }}
                                        title={`${person.firstName} ${person.lastName}`}
                                    >
                                        {width > 40 && (
                                            <div className="flex-shrink-0 mr-2 w-7 h-7 rounded-full overflow-hidden border border-white/50 bg-white/20">
                                                {person.imageUrl ? (
                                                    <img src={person.imageUrl} className="w-full h-full object-cover select-none" alt="" draggable="false" />
                                                ) : (
                                                    <DefaultAvatar className="w-full h-full text-white" />
                                                )}
                                            </div>
                                        )}
                                        <span className={`text-white text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis select-none drop-shadow-md ${width < 30 ? 'hidden' : ''}`}>
                                            {person.firstName} {person.lastName}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* FIXED FOOTER (Historical Events) - Synced via transform */}
            <div className="fixed bottom-0 left-0 right-0 h-32 z-30 pointer-events-none overflow-hidden select-none bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
                <div ref={footerRef} className="absolute top-0 left-0 h-full w-full will-change-transform">
                    {eventPositions.map((event, idx) => {
                        const isActive = activeEventIndex === idx;
                        return (
                            <div 
                                key={idx} 
                                style={{ position: 'absolute', left: event.left + 4, bottom: 20, width: '14rem' }}
                                className={`transition-all duration-300 pointer-events-auto ${isActive ? 'z-50' : 'z-10'}`}
                            >
                                <div 
                                    onClick={(e) => { e.stopPropagation(); setActiveEventIndex(idx); }}
                                    className={`historical-event-card p-2.5 rounded-xl backdrop-blur-md shadow-md border cursor-pointer transition-all duration-200
                                        ${isActive ? 'scale-110 shadow-xl ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-gray-900 bg-opacity-100' : 'hover:scale-105 hover:shadow-lg opacity-80 hover:opacity-100'}
                                        ${event.category === 'geo' ? 'bg-red-50/80 dark:bg-red-900/60 border-red-200 dark:border-red-800' : 'bg-blue-50/80 dark:bg-blue-900/60 border-blue-200 dark:border-blue-800'}
                                    `}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${event.category === 'geo' ? 'text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300' : 'text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                            {event.year}
                                        </span>
                                        {event.category === 'geo' && <span className="text-[10px]">🇬🇪</span>}
                                    </div>
                                    <p className="text-xs text-gray-800 dark:text-gray-200 leading-snug font-semibold line-clamp-2">
                                        {event.label}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TimelineView;
