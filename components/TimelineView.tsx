import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Person, People } from '../types';
import { getYear } from '../utils/dateUtils';
import { historicalEvents } from '../data/historicalEvents';
import { DefaultAvatar } from './Icons';

interface TimelineViewProps {
    people: People;
    onShowDetails: (id: string) => void;
    highlightedPersonId?: string | null;
}

const TimelineView: React.FC<TimelineViewProps> = ({ people, onShowDetails, highlightedPersonId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pixelsPerYear, setPixelsPerYear] = useState(10); // Initial zoom
    
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
    const headerHeight = 40;
    const footerHeight = 100; // For events
    const contentHeight = headerHeight + (lanes.length * laneHeight) + footerHeight;

    const handleZoom = (delta: number) => {
        setPixelsPerYear(prev => Math.max(2, Math.min(50, prev + delta)));
    };

    // Scroll to center on mount
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollLeft = (totalWidth / 2) - (containerRef.current.clientWidth / 2);
        }
    }, [totalWidth]);

    if (sortedPeople.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">ინფორმაციის საჩვენებლად საჭიროა დაბადების თარიღების შეყვანა.</div>;
    }

    return (
        <div className="relative flex flex-col h-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
                <button onClick={() => handleZoom(2)} className="w-10 h-10 rounded-full bg-gray-800 text-white shadow-lg flex items-center justify-center text-xl hover:bg-gray-700 opacity-80 hover:opacity-100">+</button>
                <button onClick={() => handleZoom(-2)} className="w-10 h-10 rounded-full bg-gray-800 text-white shadow-lg flex items-center justify-center text-xl hover:bg-gray-700 opacity-80 hover:opacity-100">-</button>
            </div>

            {/* Timeline Scroll Area */}
            <div 
                ref={containerRef}
                className="flex-grow overflow-auto relative cursor-grab active:cursor-grabbing"
                style={{ scrollBehavior: 'smooth' }}
            >
                <div style={{ width: `${totalWidth}px`, height: `${contentHeight}px`, minHeight: '100%', position: 'relative' }}>
                    
                    {/* Year Grid Lines */}
                    {Array.from({ length: Math.ceil((maxYear - minYear) / 10) + 1 }).map((_, i) => {
                        const year = Math.ceil(minYear / 10) * 10 + (i * 10);
                        if (year > maxYear) return null;
                        const left = (year - minYear) * pixelsPerYear;
                        
                        return (
                            <div key={year} style={{ position: 'absolute', left, top: 0, bottom: 0, borderLeft: '1px dashed rgba(156, 163, 175, 0.2)' }}>
                                <span className="absolute top-2 left-1 text-xs text-gray-400 font-mono">{year}</span>
                            </div>
                        );
                    })}

                    {/* Historical Events */}
                    {historicalEvents.map((event, idx) => {
                        if (event.year < minYear || event.year > maxYear) return null;
                        const left = (event.year - minYear) * pixelsPerYear;
                        return (
                            <div key={idx} style={{ position: 'absolute', left, top: 0, bottom: 0, borderLeft: '2px solid rgba(255, 99, 71, 0.3)', pointerEvents: 'none' }}>
                                <div className="absolute bottom-4 left-1 w-40">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-1 py-0.5 rounded ${event.category === 'geo' ? 'text-red-600 bg-red-100/80' : 'text-blue-600 bg-blue-100/80'}`}>
                                        {event.year}
                                    </span>
                                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 leading-tight font-medium bg-white/50 dark:bg-black/50 p-1 rounded backdrop-blur-sm inline-block">
                                        {event.label}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {/* People Bars */}
                    <div style={{ position: 'absolute', top: headerHeight, left: 0, right: 0 }}>
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
                                            onClick={(e) => { e.stopPropagation(); onShowDetails(person.id); }}
                                            className={`absolute rounded-full shadow-sm flex items-center px-2 cursor-pointer transition-all hover:brightness-110 hover:z-10 group overflow-hidden border ${isHighlighted ? 'ring-2 ring-yellow-400 z-20' : ''}`}
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
                                                        <img src={person.imageUrl} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <DefaultAvatar className="w-full h-full bg-white/20 text-white" />
                                                    )}
                                                </div>
                                            )}
                                            
                                            <span className={`text-white text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${width < 30 ? 'hidden' : ''}`}>
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
                </div>
            </div>
        </div>
    );
};

export default TimelineView;