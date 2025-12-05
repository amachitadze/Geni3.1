import React from 'react';
import { CakeIcon, HeartIcon, MapPinIcon, SparklesIcon } from '../Icons';

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    subtext: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtext }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-4">
        <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-full">
            {icon}
        </div>
        <div className="overflow-hidden">
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{value}</p>
            {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtext}</p>}
        </div>
    </div>
);

interface AdditionalStatsProps {
    oldestPerson: { name: string; age: number; } | null;
    youngestPerson: { name: string; age: number; } | null;
    avgLifespan: number;
    commonAddress: { address: string; count: number; } | null;
    t: any;
}

const AdditionalStats: React.FC<AdditionalStatsProps> = ({ oldestPerson, youngestPerson, avgLifespan, commonAddress, t }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {oldestPerson && (
                <StatCard 
                    icon={<CakeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    title={t.card_oldest}
                    value={`${oldestPerson.age} ${t === 'ka' ? 'წლის' : ''}`}
                    subtext={oldestPerson.name}
                />
            )}
            {youngestPerson && (
                <StatCard 
                    icon={<SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    title={t.card_youngest}
                    value={`${youngestPerson.age} ${t === 'ka' ? 'წლის' : ''}`}
                    subtext={youngestPerson.name}
                />
            )}
            {avgLifespan > 0 && (
                <StatCard 
                    icon={<HeartIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    title={t.card_lifespan}
                    value={`${avgLifespan} ${t === 'ka' ? 'წელი' : ''}`}
                    subtext={t.card_lifespan_sub}
                />
            )}
            {commonAddress && (
                <StatCard 
                    icon={<MapPinIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    title={t.card_address}
                    value={`${commonAddress.count} ${t.card_address_sub}`}
                    subtext={commonAddress.address}
                />
            )}
        </div>
    );
};

export default AdditionalStats;