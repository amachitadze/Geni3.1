import React from 'react';
import { CakeIcon, HeartIcon, HomeIcon } from '../Icons';

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
    avgLifespan: number;
    commonAddress: { address: string; count: number; } | null;
}

const AdditionalStats: React.FC<AdditionalStatsProps> = ({ oldestPerson, avgLifespan, commonAddress }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {oldestPerson && (
                <StatCard 
                    icon={<CakeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    title="ყველაზე ხანდაზმული (ცოცხალი)"
                    value={`${oldestPerson.age} წლის`}
                    subtext={oldestPerson.name}
                />
            )}
            {avgLifespan > 0 && (
                <StatCard 
                    icon={<HeartIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    title="სიცოცხლის საშ. ხანგრძლივობა"
                    value={`${avgLifespan} წელი`}
                    subtext="(გარდაცვლილების მიხედვით)"
                />
            )}
            {commonAddress && (
                <StatCard 
                    icon={<HomeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    title="ყველაზე გავრც. მისამართი"
                    value={`${commonAddress.count} ადამიანი`}
                    subtext={commonAddress.address}
                />
            )}
        </div>
    );
};

export default AdditionalStats;