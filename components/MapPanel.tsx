
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Person, People } from '../types';
import { GlobeIcon, CloseIcon, ChevronDownIcon, InfoIcon } from './Icons';
import { translations, Language } from '../utils/translations';
import { GEORGIAN_CITIES } from '../data/georgianCities';

// Declare Leaflet global (loaded via CDN)
declare const L: any;

interface MapPanelProps {
    people: People;
    onShowDetails: (id: string) => void;
    language: Language;
    highlightedPersonId?: string | null;
}

const MapPanel: React.FC<MapPanelProps> = ({ people, onShowDetails, language, highlightedPersonId }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    // Ref to store markers mapped by person ID for quick access
    const personMarkersRef = useRef<Record<string, any[]>>({});
    const [markersAdded, setMarkersAdded] = useState(0);
    const [selectedCity, setSelectedCity] = useState('');
    const [isListExpanded, setIsListExpanded] = useState(true); // New state for collapsing list
    const [notification, setNotification] = useState<string | null>(null); // State for missing address toast
    const t = translations[language];

    // Collect all relevant addresses from people
    const addressesToMap = useMemo(() => {
        const locations: { person: Person, type: 'birth' | 'residence' | 'death', address: string }[] = [];
        
        (Object.values(people) as Person[]).forEach(p => {
            if (p.birthPlace) locations.push({ person: p, type: 'birth', address: p.birthPlace });
            if (p.contactInfo?.address) locations.push({ person: p, type: 'residence', address: p.contactInfo.address });
            if (p.deathPlace) locations.push({ person: p, type: 'death', address: p.deathPlace });
            else if (p.cemeteryAddress && p.deathDate) locations.push({ person: p, type: 'death', address: p.cemeteryAddress }); // Fallback to cemetery
        });
        return locations;
    }, [people]);

    // Local Geocoding Helper
    const getLocalCoordinates = (address: string): { lat: number; lng: number } | null => {
        if (!address) return null;
        const cleanedAddress = address.trim();
        
        // 1. Direct match
        if (GEORGIAN_CITIES[cleanedAddress]) {
            return GEORGIAN_CITIES[cleanedAddress];
        }

        // 2. Partial match
        const cityKeys = Object.keys(GEORGIAN_CITIES);
        const match = cityKeys.find(city => cleanedAddress.startsWith(city) || cleanedAddress.includes(city));
        
        if (match) {
            return GEORGIAN_CITIES[match];
        }

        return null;
    };

    const handleCitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const city = e.target.value;
        setSelectedCity(city);
        setIsListExpanded(true); // Auto-expand when selecting a city
        const coords = GEORGIAN_CITIES[city];
        if (coords && mapInstanceRef.current) {
            mapInstanceRef.current.setView([coords.lat, coords.lng], 12);
        }
    };

    // Handler to focus map on a person from the list
    const handlePersonListClick = (personId: string) => {
        const markers = personMarkersRef.current[personId];
        
        // Auto-collapse the list so the user can see the map (especially on mobile)
        setIsListExpanded(false);
        
        if (markers && markers.length > 0 && mapInstanceRef.current) {
            const map = mapInstanceRef.current;
            
            // Close all other popups first
            Object.values(personMarkersRef.current).forEach(ms => ms.forEach((m: any) => m.closePopup()));

            // Create a feature group to calculate bounds for all markers of this person
            const group = L.featureGroup(markers);
            
            // Fly to the bounds
            map.fitBounds(group.getBounds(), { 
                padding: [100, 100], 
                maxZoom: 15,
                animate: true,
                duration: 1
            });

            // Open popup for all markers (using autoClose: false in creation)
            setTimeout(() => {
                markers.forEach((m: any) => m.openPopup());
            }, 500);
        }
    };

    // Group people by ID for the list view
    const peopleInSelectedCity = useMemo(() => {
        if (!selectedCity) return [];
        
        const selectedCoords = GEORGIAN_CITIES[selectedCity];
        if (!selectedCoords) return [];

        const groups: Record<string, { person: Person, types: Set<'birth' | 'residence' | 'death'>, address?: string }> = {};

        addressesToMap.forEach(item => {
             const coords = getLocalCoordinates(item.address);
             // strict check against the selected city coordinates object reference
             if (coords === selectedCoords) {
                 if (!groups[item.person.id]) {
                     groups[item.person.id] = { person: item.person, types: new Set() };
                 }
                 groups[item.person.id].types.add(item.type);
                 
                 // Prioritize Residence address for display text
                 if (item.type === 'residence') {
                     groups[item.person.id].address = item.address;
                 }
             }
        });

        return Object.values(groups);
    }, [selectedCity, addressesToMap]);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize Map
        if (!mapInstanceRef.current) {
            // Disable default zoom control to move it
            mapInstanceRef.current = L.map(mapContainerRef.current, { zoomControl: false }).setView([42.3154, 43.3569], 7); // Center of Georgia
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);

            // Add zoom control to bottom right
            L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
        }

        const map = mapInstanceRef.current;
        const markers = L.layerGroup().addTo(map);
        // Lines layer group removed based on request

        let count = 0;
        const bounds = L.latLngBounds([]);
        
        // Reset marker refs
        personMarkersRef.current = {};

        // Process locations locally and synchronously
        addressesToMap.forEach(locData => {
            const coords = getLocalCoordinates(locData.address);
            
            if (coords) {
                // Create Custom Marker Icon based on type
                let color = 'blue';
                if (locData.type === 'birth') color = 'green';
                if (locData.type === 'death') color = 'red';

                const iconHtml = `
                    <div style="
                        background-color: ${color};
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        border: 2px solid white;
                        box-shadow: 0 0 4px rgba(0,0,0,0.5);
                    "></div>
                `;

                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: iconHtml,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });

                // Add random jitter to separate markers at exact same location
                // Increased range to prevent visual overlap of popups
                const jitterLat = (Math.random() - 0.5) * 0.01;
                const jitterLng = (Math.random() - 0.5) * 0.01;
                const lat = coords.lat + jitterLat;
                const lng = coords.lng + jitterLng;

                const marker = L.marker([lat, lng], { icon })
                    .bindPopup(`
                        <div class="text-center min-w-[150px]">
                            <strong class="block text-sm text-gray-900">${locData.person.firstName} ${locData.person.lastName}</strong>
                            <span class="text-xs uppercase font-bold text-gray-500 mb-1 block">${t[`map_${locData.type}`]}</span>
                            <span class="text-xs text-gray-600 block mb-2">${locData.address}</span>
                            <button onclick="window.dispatchEvent(new CustomEvent('openPersonDetails', { detail: '${locData.person.id}' }))" 
                                class="inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors w-full">
                                დეტალები
                            </button>
                        </div>
                    `, { autoClose: false, closeOnClick: false }); // Key change: allow multiple open
                
                markers.addLayer(marker);
                bounds.extend([lat, lng]);
                count++;

                // Store marker reference
                if (!personMarkersRef.current[locData.person.id]) {
                    personMarkersRef.current[locData.person.id] = [];
                }
                personMarkersRef.current[locData.person.id].push(marker);
            }
        });

        if (count > 0 && map && !selectedCity && !highlightedPersonId) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
        setMarkersAdded(count);

        // Listener for popup button click
        const handleDetailEvent = (e: any) => onShowDetails(e.detail);
        window.addEventListener('openPersonDetails', handleDetailEvent);

        // Fix for blank map: Invalidate size on resize
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);

        return () => {
            markers.clearLayers();
            window.removeEventListener('openPersonDetails', handleDetailEvent);
            resizeObserver.disconnect();
        };
    }, [addressesToMap, onShowDetails, people, selectedCity]); 

    // React to highlightedPersonId change
    useEffect(() => {
        if (highlightedPersonId && mapInstanceRef.current) {
            // 1. Close ALL currently open popups first to avoid clutter
            Object.values(personMarkersRef.current).forEach(markers => {
                markers.forEach((m: any) => m.closePopup());
            });

            // 2. Check if the searched person has any markers
            const markers = personMarkersRef.current[highlightedPersonId];
            
            if (markers && markers.length > 0) {
                // Focus on new markers
                const group = L.featureGroup(markers);
                mapInstanceRef.current.fitBounds(group.getBounds(), { 
                    padding: [100, 100], 
                    maxZoom: 15,
                    animate: true,
                    duration: 1
                });
                
                // Open all popups for this person with a longer delay to let animation finish
                setTimeout(() => {
                    markers.forEach((m: any) => m.openPopup());
                }, 1000);
            } else {
                // 3. If no markers found for this person, show notification
                const person = people[highlightedPersonId];
                if (person) {
                    setNotification(`${person.firstName} ${person.lastName}-ის შესახებ მისამართები არ იძებნება.`);
                    // Auto-hide after 3 seconds
                    setTimeout(() => setNotification(null), 3000);
                }
            }
        }
    }, [highlightedPersonId, people]);

    return (
        <div className="flex-grow w-full flex flex-col bg-gray-100 dark:bg-gray-900 relative h-full">
            {/* Transient Notification for missing address */}
            {notification && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1010] bg-gray-800/90 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in-up">
                    <InfoIcon className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm font-medium">{notification}</span>
                </div>
            )}

            {markersAdded === 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center">
                    <GlobeIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">{t.map_empty}</p>
                    <p className="text-xs text-gray-500 mt-2">გთხოვთ გამოიყენოთ ქალაქების ზუსტი სახელწოდებები.</p>
                </div>
            )}

            {/* City Filter & List (Top Left) - Higher Z-Index to overlap legend if needed */}
            <div className="absolute top-4 left-4 z-[1005] flex flex-col items-start gap-2 max-h-[calc(100%-2rem)] max-w-[280px] w-[calc(100%-2rem)] sm:w-auto">
                <div className="relative shadow-lg rounded-md w-full">
                    <select 
                        onChange={handleCitySelect} 
                        value={selectedCity}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer appearance-none pr-8 font-medium"
                    >
                        <option value="">{t.search_placeholder || "ქალაქის არჩევა..."}</option>
                        {Object.keys(GEORGIAN_CITIES).sort().map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                    {/* Custom Arrow Icon */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>

                {selectedCity && peopleInSelectedCity.length > 0 && (
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full overflow-hidden flex flex-col animate-fade-in-up transition-all duration-300">
                        {/* Collapsible Header */}
                        <div 
                            className="p-3 bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center cursor-pointer select-none"
                            onClick={() => setIsListExpanded(!isListExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isListExpanded ? 'rotate-180' : ''}`} />
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {selectedCity} <span className="ml-1 bg-gray-200 dark:bg-gray-600 px-1.5 rounded-full text-gray-700 dark:text-gray-200">{peopleInSelectedCity.length}</span>
                                </span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedCity(''); }} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                            >
                                <CloseIcon className="w-4 h-4"/>
                            </button>
                        </div>
                        
                        {/* List Content - Conditionally rendered */}
                        {isListExpanded && (
                            <ul className="overflow-y-auto max-h-[50vh] divide-y divide-gray-100 dark:divide-gray-700/50">
                                {peopleInSelectedCity.map((group, idx) => (
                                    <li key={`${group.person.id}-${idx}`}>
                                        <button 
                                            onClick={() => handlePersonListClick(group.person.id)}
                                            className="w-full text-left px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-start gap-3 group"
                                        >
                                            <div className="mt-1 flex flex-col gap-1 items-center min-w-[12px]">
                                                {group.types.has('birth') && (
                                                    <div 
                                                        className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm ring-1 ring-white dark:ring-gray-800" 
                                                        title={t.map_birth}
                                                    />
                                                )}
                                                {group.types.has('residence') && (
                                                    <div 
                                                        className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm ring-1 ring-white dark:ring-gray-800" 
                                                        title={t.map_residence}
                                                    />
                                                )}
                                                {group.types.has('death') && (
                                                    <div 
                                                        className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm ring-1 ring-white dark:ring-gray-800" 
                                                        title={t.map_death}
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-grow">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                    {group.person.firstName} {group.person.lastName}
                                                </p>
                                                {group.address && (
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                        {group.address}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Legend (Bottom Center - Horizontal) */}
            <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-3 py-2 sm:px-6 sm:py-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 pointer-events-none flex flex-row items-center gap-2 sm:gap-6">
                <h4 className="font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide text-[10px] hidden sm:block border-r border-gray-300 dark:border-gray-600 pr-4 mr-1 h-4 leading-4">{t.map_legend}</h4>
                <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 border border-white shadow-sm"></div>
                    <span className="text-gray-600 dark:text-gray-300 font-medium text-[10px] sm:text-xs whitespace-nowrap">{t.map_birth}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 border border-white shadow-sm"></div>
                    <span className="text-gray-600 dark:text-gray-300 font-medium text-[10px] sm:text-xs whitespace-nowrap">{t.map_residence}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 border border-white shadow-sm"></div>
                    <span className="text-gray-600 dark:text-gray-300 font-medium text-[10px] sm:text-xs whitespace-nowrap">{t.map_death}</span>
                </div>
            </div>

            {/* Map Container - Absolute to ensure height fill */}
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        </div>
    );
};

export default MapPanel;
