import React from 'react';
import DoughnutChart from './charts/DoughnutChart';
import BarChart from './charts/BarChart';
import GenerationChart from './charts/GenerationChart';
import BirthRateChart from './charts/BirthRateChart';
import NameList from './charts/NameList';
import AdditionalStats from './charts/AdditionalStats';

export interface Statistics {
    totalPeople: number;
    genderData: { male: number; female: number; };
    statusData: { living: number; deceased: number; };
    ageGroupData: { '0-18': number; '19-35': number; '36-60': number; '60+': number; };
    generationData: { labels: string[]; data: number[]; };
    birthRateData: { labels: string[]; data: number[]; };
    topMaleNames: { name: string; count: number; }[];
    topFemaleNames: { name: string; count: number; }[];
    oldestLivingPerson: { name: string; age: number; } | null;
    averageLifespan: number;
    mostCommonAddress: { address: string; count: number; } | null;
}

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Statistics;
  theme: 'light' | 'dark';
}

const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose, stats, theme }) => {
    if (!isOpen) return null;
    
    const hasAdditionalStats = stats.oldestLivingPerson || stats.averageLifespan > 0 || stats.mostCommonAddress;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <header className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">სანათესავოს სტატისტიკა</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">სულ: {stats.totalPeople} ადამიანი</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-black dark:hover:text-white transition-colors" aria-label="სტატისტიკის ფანჯრის დახურვა">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                
                <div className="space-y-6">
                    {/* Demographics Section */}
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">დემოგრაფიული ანალიზი</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col">
                                   <h4 className="text-sm font-semibold text-center text-gray-700 dark:text-gray-300 mb-2">სქესობრივი ბალანსი</h4>
                                   <div className="flex-grow">
                                     <DoughnutChart labels={['მამრობითი', 'მდედრობითი']} data={[stats.genderData.male, stats.genderData.female]} theme={theme} />
                                   </div>
                               </div>
                               <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col">
                                   <h4 className="text-sm font-semibold text-center text-gray-700 dark:text-gray-300 mb-2">სტატუსი</h4>
                                   <div className="flex-grow">
                                     <DoughnutChart labels={['ცოცხალი', 'გარდაცვლილი']} data={[stats.statusData.living, stats.statusData.deceased]} theme={theme} />
                                   </div>
                               </div>
                            </div>
                            <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col">
                                <h4 className="text-sm font-semibold text-center text-gray-700 dark:text-gray-300 mb-2">ასაკობრივი ჯგუფები (ცოცხლები)</h4>
                                <div className="flex-grow">
                                    <BarChart labels={Object.keys(stats.ageGroupData)} data={Object.values(stats.ageGroupData)} theme={theme} />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Additional Stats Section */}
                    {hasAdditionalStats && (
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">საინტერესო ფაქტები</h3>
                            <AdditionalStats 
                                oldestPerson={stats.oldestLivingPerson}
                                avgLifespan={stats.averageLifespan}
                                commonAddress={stats.mostCommonAddress}
                            />
                        </div>
                    )}
                    
                    {/* Generations Section */}
                    {stats.generationData.data.length > 0 && (
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">თაობების ანალიზი</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 h-64 flex flex-col">
                                    <h4 className="text-sm font-semibold text-center text-gray-700 dark:text-gray-300 mb-2">ადამიანები თაობებში</h4>
                                    <div className="flex-grow">
                                        <GenerationChart labels={stats.generationData.labels} data={stats.generationData.data} theme={theme} />
                                    </div>
                                </div>
                                {stats.birthRateData.data.length > 0 && (
                                    <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 h-64 flex flex-col">
                                        <h4 className="text-sm font-semibold text-center text-gray-700 dark:text-gray-300 mb-2">შობადობის კოეფიციენტი</h4>
                                        <div className="flex-grow">
                                            <BirthRateChart labels={stats.birthRateData.labels} data={stats.birthRateData.data} theme={theme} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Popular Names Section */}
                     {(stats.topMaleNames.length > 0 || stats.topFemaleNames.length > 0) && (
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">პოპულარული სახელები</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <NameList title="TOP 5 მამრობითი სახელი" names={stats.topMaleNames} />
                                <NameList title="TOP 5 მდედრობითი სახელი" names={stats.topFemaleNames} />
                            </div>
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
};

export default StatisticsModal;