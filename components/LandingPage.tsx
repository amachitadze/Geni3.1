import React from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
);

const InfiniteIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> {/* Stylized infinite-like cloud/network */}
    </svg>
);

const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
);

const DevicePhoneMobileIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
);

const ChartBarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.186 2.25 2.25 0 00-3.933 2.186z" />
    </svg>
);

const DocumentIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

const UserGroupIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM3.75 19.125a9.094 9.094 0 018.25-3.469 9.094 9.094 0 018.25 3.469m-16.5 0a9.094 9.094 0 003.741.479m7.5-2.962a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
    </svg>
);

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    const features = [
        {
            icon: <InfiniteIcon className="w-8 h-8 text-purple-600" />,
            title: "შეზღუდვების გარეშე",
            description: "დაამატეთ უსასრულო რაოდენობის პიროვნება. მშობლები, შვილები, მეუღლეები, დედმამიშვილები — ხე იზრდება თქვენთან ერთად."
        },
        {
            icon: <LockClosedIcon className="w-8 h-8 text-green-600" />,
            title: "100% კონფიდენციალური",
            description: "თქვენი მონაცემები ინახება მხოლოდ თქვენს მოწყობილობაში. ჩვენ არ გვაქვს წვდომა თქვენს ოჯახურ ისტორიაზე."
        },
        {
            icon: <ShareIcon className="w-8 h-8 text-blue-600" />,
            title: "დაცული გაზიარება",
            description: "გაუზიარეთ ხე ნათესავებს სპეციალური, დაშიფრული ბმულით. ინფორმაციის ნახვა მხოლოდ პაროლითაა შესაძლებელი."
        },
        {
            icon: <ChartBarIcon className="w-8 h-8 text-orange-500" />,
            title: "ჭკვიანი სტატისტიკა",
            description: "ავტომატური ანალიზი: სიცოცხლის ხანგრძლივობა, თაობების განაწილება, პოპულარული სახელები და გენდერული ბალანსი."
        },
        {
            icon: <DocumentIcon className="w-8 h-8 text-red-500" />,
            title: "იმპორტი & ექსპორტი",
            description: "შეინახეთ მონაცემები JSON ფორმატში სარეზერვო ასლისთვის ან გადმოწერეთ ხე მაღალი ხარისხის PDF ფაილად."
        },
        {
            icon: <DevicePhoneMobileIcon className="w-8 h-8 text-indigo-500" />,
            title: "მობილურზე მორგებული",
            description: "სრულად ადაპტირებული ინტერფეისი. მართეთ თქვენი ხე ნებისმიერი ადგილიდან, ნებისმიერი მოწყობილობით."
        }
    ];

    return (
        <div className="bg-white dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200 font-sans selection:bg-purple-200 dark:selection:bg-purple-900">
            
            {/* Hero Section */}
            <header className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ 
                        backgroundImage: "url('https://i.postimg.cc/DZBW1Cbf/Geni-cover.png')",
                        filter: "brightness(0.4) blur(2px)" 
                    }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-gray-900"></div>
                
                <div className="relative z-10 container mx-auto px-6 text-center">
                    <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-purple-600/30 border border-purple-500/50 backdrop-blur-md text-purple-200 text-sm font-medium tracking-wide animate-fade-in-up">
                        ანალოგი არ აქვს
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 text-white tracking-tight drop-shadow-2xl animate-fade-in-up delay-100">
                        თქვენი ისტორია,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">უსასრულო</span> და დაცული.
                    </h1>
                    <p className="text-lg md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto leading-relaxed animate-fade-in-up delay-200">
                        შექმენით გენეალოგიური ხე შეზღუდვების გარეშე. სრული კონფიდენციალურობა, დეტალური სტატისტიკა და მარტივი გაზიარება — ყველაფერი ერთ სივრცეში.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
                        <button 
                            onClick={onEnter}
                            className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(147,51,234,0.5)] flex items-center justify-center gap-2"
                        >
                            დაიწყეთ ახლავე <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section className="py-24 bg-gray-50 dark:bg-gray-900 relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">რატომ არის ჩვენი პლატფორმა უნიკალური?</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            ჩვენ გავაერთიანეთ სიმარტივე და სიმძლავრე, რათა თქვენი ოჯახის ისტორია იყოს დაცული და ადვილად სამართავი.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div 
                                key={index} 
                                className="group bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works / Footer CTA */}
            <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-900/20 to-pink-900/20 pointer-events-none"></div>
                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="text-3xl md:text-4xl font-bold mb-8">შეინახეთ წარსული მომავლისთვის</h2>
                    <p className="text-gray-300 mb-10 max-w-xl mx-auto">
                        თქვენი ოჯახის ისტორია იმსახურებს საუკეთესო ადგილს. დაიწყეთ დღესვე, სრულიად უფასოდ.
                    </p>
                    <button 
                        onClick={onEnter}
                        className="inline-flex items-center justify-center px-8 py-3 border border-gray-600 hover:border-white rounded-full text-lg font-medium transition-colors hover:bg-white hover:text-gray-900"
                    >
                        ხის გახსნა
                    </button>
                </div>
            </section>

            <footer className="bg-gray-50 dark:bg-black py-8 border-t border-gray-200 dark:border-gray-800">
                <div className="container mx-auto px-6 text-center text-gray-500 dark:text-gray-500 text-sm">
                    <p className="flex items-center justify-center gap-1 flex-wrap">
                        <span>&copy; {new Date().getFullYear()} გენეალოგიური ხე. ყველა უფლება დაცულია.</span>
                        <span className="flex items-center gap-1">
                            შექმნილია
                            <a href="https://bit.ly/av-ma" target="_blank" rel="noopener noreferrer" className="inline-block transition-opacity hover:opacity-80">
                                <img 
                                    src="https://i.postimg.cc/c1T2NJgV/avma.png" 
                                    alt="AvMa" 
                                    className="h-3 w-auto" 
                                    style={{ display: 'inline', verticalAlign: 'middle' }}
                                />
                            </a>
                            -ს მიერ
                        </span>
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;