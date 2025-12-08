

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
    const [pixelsPerYear, setPixelsPerYear] = useState(10); // Initial zoom
    
    // Drag/Pan State
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    
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

    // Scroll to center on mount
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollLeft = (totalWidth / 2) - (containerRef.current.clientWidth / 2);
        }
    }, [totalWidth]);

    // --- Drag & Pan Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => {
        // Prevent drag if clicking on a person card or button
        if ((e.target as HTMLElement).closest('[data-person-id], button')) return;
        
        const slider = containerRef.current;
        if(!slider) return;

        setIsDown(true);
        setStartX(e.pageX - slider.offsetLeft);
        setStartY(e.pageY - slider.offsetTop);
        setScrollLeft(slider.scrollLeft);
        setScrollTop(slider.scrollTop);
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
        const y = e.pageY - slider.offsetTop;
        const walkX = (x - startX); // scroll-fast
        const walkY = (y - startY);
        slider.scrollLeft = scrollLeft - walkX;
        slider.scrollTop = scrollTop - walkY;
    };

    if (sortedPeople.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">ინფორმაციის საჩვენებლად საჭიროა დაბადების თარიღების შეყვანა.</div>;
    }

    return (
        <div className="relative flex flex-col h-full w-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
            {/* Zoom Controls - Fixed relative to viewport container */}
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

            {/* Timeline Scroll Area */}
            <div 
                ref={containerRef}
                className={`flex-grow h-full w-full overflow-auto relative ${isDown ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                <div style={{ width: `${totalWidth}px`, minHeight: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Sticky Header (Years) */}
                    <div className="sticky top-0 z-40 h-10 w-full flex items-end pb-2 pointer-events-none bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="absolute w-full h-full">
                            {years.map((y) => (
                                <div key={y.year} style={{ position: 'absolute', left: y.left + 4 }} className="text-xs text-gray-600 dark:text-gray-300 font-mono font-bold select-none px-1.5 py-0.5 rounded">
                                    {y.year}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Background Grid Layer (Absolute inset-0 but below content) */}
                    <div className="absolute inset-0 pointer-events-none z-0 mt-10 mb-20">
                        {years.map((y) => (
                            <div key={y.year} style={{ position: 'absolute', left: y.left, top: 0, bottom: 0, borderLeft: '1px dashed rgba(156, 163, 175, 0.2)' }} />
                        ))}
                        {eventPositions.map((e, idx) => (
                            <div key={idx} style={{ position: 'absolute', left: e.left, top: 0, bottom: 0, borderLeft: '2px solid rgba(255, 99, 71, 0.3)' }} />
                        ))}
                    </div>

                    {/* Content (People Lanes) */}
                    <div className="flex-grow relative z-10 py-8" style={{ height: `${lanes.length * laneHeight + 60}px` }}>
                        {lanes.map((lane, laneIndex) => (
                            <div key={laneIndex} style={{ height: laneHeight, position: 'relative' }}>
                                {lane.map(person => {
                                    let birth = getYear(person.birthDate);
                                    if (typeof birth === 'string') birth = parseInt(birth, 10) || 0;
                                    
                                    let death = person.deathDate ? getYear(person.deathDate) : new Date().getFullYear();
                                    if (typeof death === 'string') death = parseInt(death, 10) || new Date().getFullYear();

                                    const left = (birth - minYear) * pixelsPerYear;
                                    const width = Math.max(pixelsPerYear, (death - birth) * pixelsPerYear); // At least 1 year width
                                    
                                    const isHighlighted = highlightedPersonId === person.id;
                                    
                                    return (
                                        <div
                                            key={person.id}
                                            data-person-id={person.id}
                                            onClick={(e) => { e.stopPropagation(); onShowDetails(person.id); }}
                                            className={`absolute rounded-full shadow-sm flex items-center px-2 cursor-pointer transition-all hover:brightness-110 hover:z-20 group overflow-hidden border ${isHighlighted ? 'ring-2 ring-yellow-400 z-20' : ''}`}
                                            style={{
                                                left,
                                                width,
                                                top: 8,
                                                height: laneHeight - 16,
                                                backgroundColor: person.gender === 'male' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(236, 72, 153, 0.8)',
                                                borderColor: person.gender === 'male' ? 'rgb(37, 99, 235)' : 'rgb(219, 39, 119)'
                                            }}
                                            title={`${person.firstName} ${person.lastName} (${birth} - ${person.deathDate ? death : 'Present'})`}
                                        >
                                            {/* Avatar (only if width allows) */}
                                            {width > 40 && (
                                                <div className="flex-shrink-0 mr-2 w-6 h-6 rounded-full overflow-hidden border border-white/50">
                                                    {person.imageUrl ? (
                                                        <img src={person.imageUrl} className="w-full h-full object-cover select-none" alt="" draggable="false" />
                                                    ) : (
                                                        <DefaultAvatar className="w-full h-full bg-white/20 text-white" />
                                                    )}
                                                </div>
                                            )}
                                            
                                            <span className={`text-white text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis select-none ${width < 30 ? 'hidden' : ''}`}>
                                                {person.firstName} {person.lastName}
                                            </span>

                                            {!person.deathDate && (
                                                <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white/30" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Sticky Footer (Events) */}
                    <div className="sticky bottom-0 z-40 h-20 w-full pointer-events-none flex items-start pt-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <div className="absolute w-full h-full overflow-hidden">
                            {eventPositions.map((event, idx) => (
                                <div key={idx} style={{ position: 'absolute', left: event.left + 4, top: 4, width: '12rem' }}>
                                    <div className={`p-2 rounded-lg backdrop-blur-md shadow-sm border ${event.category === 'geo' ? 'bg-red-50/50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-blue-50/50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded select-none ${event.category === 'geo' ? 'text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300' : 'text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                                {event.year}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-700 dark:text-gray-300 leading-tight font-medium select-none truncate">
                                            {event.label}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TimelineView;