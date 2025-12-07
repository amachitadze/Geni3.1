
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Person, People } from '../types';
import { GlobeIcon, CloseIcon } from './Icons';
import { translations, Language } from '../utils/translations';
import { GEORGIAN_CITIES } from '../data/georgianCities';

// Declare Leaflet global (loaded via CDN)
declare const L: any;

interface MapPanelProps {
    people: People;
    onShowDetails: (id: string) => void;
    language: Language;
}

const MapPanel: React.FC<MapPanelProps> = ({ people, onShowDetails, language }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [markersAdded, setMarkersAdded] = useState(0);
    const [selectedCity, setSelectedCity] = useState('');
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
        const coords = GEORGIAN_CITIES[city];
        if (coords && mapInstanceRef.current) {
            mapInstanceRef.current.setView([coords.lat, coords.lng], 12);
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
        const lines = L.layerGroup().addTo(map);

        let count = 0;
        const bounds = L.latLngBounds([]);

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
                const jitter = (Math.random() - 0.5) * 0.005;
                const lat = coords.lat + jitter;
                const lng = coords.lng + jitter;

                const marker = L.marker([lat, lng], { icon })
                    .bindPopup(`
                        <div class="text-center">
                            <strong class="block text-sm">${locData.person.firstName} ${locData.person.lastName}</strong>
                            <span class="text-xs uppercase font-bold text-gray-500">${t[`map_${locData.type}`]}</span><br/>
                            <span class="text-xs">${locData.address}</span><br/>
                            <button onclick="window.dispatchEvent(new CustomEvent('openPersonDetails', { detail: '${locData.person.id}' }))" 
                                class="mt-2 text-xs bg-purple-600 text-white px-2 py-1 rounded">
                                Info
                            </button>
                        </div>
                    `);
                
                markers.addLayer(marker);
                bounds.extend([lat, lng]);
                count++;
            }
        });

        // Migration Lines (Connect Birth -> Death)
        (Object.values(people) as Person[]).forEach(p => {
            if (p.birthPlace && p.deathPlace) {
                const birth = getLocalCoordinates(p.birthPlace);
                const death = getLocalCoordinates(p.deathPlace);
                if (birth && death) {
                    if (Math.abs(birth.lat - death.lat) > 0.01 || Math.abs(birth.lng - death.lng) > 0.01) {
                        const line = L.polyline([[birth.lat, birth.lng], [death.lat, death.lng]], {
                            color: 'purple',
                            weight: 2,
                            opacity: 0.5,
                            dashArray: '5, 10'
                        }).bindPopup(`${p.firstName} ${p.lastName}: ${p.birthPlace} ➝ ${p.deathPlace}`);
                        lines.addLayer(line);
                    }
                }
            }
        });

        if (count > 0 && map && !selectedCity) {
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
            lines.clearLayers();
            window.removeEventListener('openPersonDetails', handleDetailEvent);
            resizeObserver.disconnect();
        };
    }, [addressesToMap, onShowDetails, people, selectedCity]);

    return (
        <div className="flex-grow w-full flex flex-col bg-gray-100 dark:bg-gray-900 relative h-full">
            {markersAdded === 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center">
                    <GlobeIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">{t.map_empty}</p>
                    <p className="text-xs text-gray-500 mt-2">გთხოვთ გამოიყენოთ ქალაქების ზუსტი სახელწოდებები.</p>
                </div>
            )}

            {/* City Filter & List (Top Left) - Higher Z-Index to overlap legend if needed */}
            <div className="absolute top-4 left-4 z-[1005] flex flex-col items-start gap-2 max-h-[calc(100%-2rem)] max-w-[280px]">
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
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="p-3 bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {selectedCity} <span className="ml-1 bg-gray-200 dark:bg-gray-600 px-1.5 rounded-full text-gray-700 dark:text-gray-200">{peopleInSelectedCity.length}</span>
                            </span>
                            <button 
                                onClick={() => setSelectedCity('')} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <CloseIcon className="w-4 h-4"/>
                            </button>
                        </div>
                        <ul className="overflow-y-auto max-h-[60vh] divide-y divide-gray-100 dark:divide-gray-700/50">
                            {peopleInSelectedCity.map((group, idx) => (
                                <li key={`${group.person.id}-${idx}`}>
                                    <button 
                                        onClick={() => onShowDetails(group.person.id)}
                                        className="w-full text-left px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-start gap-3 group"
                                    >
                                        <div className="mt-1 flex gap-1 flex-wrap max-w-[40px]">
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
                    </div>
                )}
            </div>

            {/* Legend (Bottom Left) */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs pointer-events-none">
                <h4 className="font-bold mb-3 text-gray-800 dark:text-gray-100 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-2">{t.map_legend}</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm"></div>
                        <span className="text-gray-600 dark:text-gray-300 font-medium">{t.map_birth}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm"></div>
                        <span className="text-gray-600 dark:text-gray-300 font-medium">{t.map_residence}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm"></div>
                        <span className="text-gray-600 dark:text-gray-300 font-medium">{t.map_death}</span>
                    </div>
                </div>
            </div>

            {/* Map Container - Absolute to ensure height fill */}
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        </div>
    );
};

export default MapPanel;
