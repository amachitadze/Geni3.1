
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Person, People } from '../types';
import { GlobeIcon } from './Icons';
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

        // 2. Partial match (e.g. if user types "თბილისი, ვაკე" but we have "თბილისი")
        // We look for a city key that appears at the start of the address
        const cityKeys = Object.keys(GEORGIAN_CITIES);
        const match = cityKeys.find(city => cleanedAddress.startsWith(city) || cleanedAddress.includes(city));
        
        if (match) {
            return GEORGIAN_CITIES[match];
        }

        return null;
    };

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize Map
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapContainerRef.current).setView([42.3154, 43.3569], 7); // Center of Georgia
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstanceRef.current);
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
                    // Check if points are different enough to draw a line
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

        if (count > 0 && map) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
        setMarkersAdded(count);

        // Listener for popup button click
        const handleDetailEvent = (e: any) => onShowDetails(e.detail);
        window.addEventListener('openPersonDetails', handleDetailEvent);

        return () => {
            markers.clearLayers();
            lines.clearLayers();
            window.removeEventListener('openPersonDetails', handleDetailEvent);
        };
    }, [addressesToMap, onShowDetails, people]);

    return (
        <div className="relative w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900">
            {markersAdded === 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center">
                    <GlobeIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">{t.map_empty}</p>
                    <p className="text-xs text-gray-500 mt-2">გთხოვთ გამოიყენოთ ქალაქების ზუსტი სახელწოდებები (მაგ: თბილისი, ქუთაისი, ბათუმი).</p>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
                <h4 className="font-bold mb-2 text-gray-800 dark:text-gray-100">{t.map_legend}</h4>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm"></div>
                    <span className="text-gray-600 dark:text-gray-300">{t.map_birth}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm"></div>
                    <span className="text-gray-600 dark:text-gray-300">{t.map_residence}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm"></div>
                    <span className="text-gray-600 dark:text-gray-300">{t.map_death}</span>
                </div>
            </div>

            <div ref={mapContainerRef} className="flex-grow w-full h-full z-0" />
        </div>
    );
};

export default MapPanel;
