
import React, { useState } from 'react';
import { translations, Language } from '../utils/translations';
import { CheckIcon, CloseIcon, StarIcon, InfiniteIcon, ChartBarIcon, LockClosedIcon, ShareIcon, ChevronDownIcon, UserPlusIcon, UsersIcon, ArrowRightIcon, MapIcon, ClockIcon } from './Icons';
import AuthModal from './AuthModal';

interface LandingPageProps {
  onEnter: (startName?: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter, language, onLanguageChange }) => {
    const t = translations[language];
    const [startName, setStartName] = useState('');
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [pendingStartName, setPendingStartName] = useState<string | null>(null);

    const handleQuickStart = (e: React.FormEvent) => {
        e.preventDefault();
        onEnter(startName);
    };
    
    const handleAuthSuccess = (name?: string) => {
        // If the user entered a name in quickstart but then went to login/register, 
        // we might want to use that or the name from auth.
        // For now, let's just enter.
        onEnter(pendingStartName || name || startName);
    };

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    const features = [
        {
            icon: <InfiniteIcon className="w-8 h-8 text-purple-600" />,
            title: t.feat_unlimited_title,
            description: t.feat_unlimited_desc
        },
        {
            icon: <LockClosedIcon className="w-8 h-8 text-green-600" />,
            title: t.feat_private_title,
            description: t.feat_private_desc
        },
        {
            icon: <ShareIcon className="w-8 h-8 text-blue-600" />,
            title: t.feat_share_title,
            description: t.feat_share_desc
        },
        {
            icon: <ChartBarIcon className="w-8 h-8 text-orange-500" />,
            title: t.feat_stats_title,
            description: t.feat_stats_desc
        },
        {
            icon: <MapIcon className="w-8 h-8 text-red-500" />,
            title: t.feat_map_title,
            description: t.feat_map_desc
        },
        {
            icon: <ClockIcon className="w-8 h-8 text-indigo-500" />,
            title: t.feat_timeline_title,
            description: t.feat_timeline_desc
        }
    ];

    const testimonials = [
        {
            name: t.testim_1_name,
            role: t.testim_1_role,
            text: t.testim_1_text,
            avatar: "https://avatar.iran.liara.run/public/boy?username=Giorgi"
        },
        {
            name: t.testim_2_name,
            role: t.testim_2_role,
            text: t.testim_2_text,
            avatar: "https://avatar.iran.liara.run/public/girl?username=Nino"
        },
        {
            name: t.testim_3_name,
            role: t.testim_3_role,
            text: t.testim_3_text,
            avatar: "https://avatar.iran.liara.run/public/boy?username=David"
        }
    ];

    const plans = [
        {
            name: t.plan_free,
            features: [
                { text: t.feat_members_limit, included: true },
                { text: t.feat_stats_basic, included: true },
                { text: t.feat_storage_local, included: true },
                { text: t.feat_share, included: true },
                { text: t.feat_import_export, included: true },
                { text: t.feat_premium_timeline, included: false },
                { text: t.feat_premium_map, included: false },
                { text: t.feat_messages, included: false },
                { text: t.feat_export_pdf, included: false }
            ],
            buttonText: t.btn_start,
            primary: false,
            action: () => onEnter(startName) // Free starts immediately
        },
        {
            name: t.plan_premium,
            features: [
                { text: t.feat_members_unlimited, included: true },
                { text: t.feat_stats_full, included: true },
                { text: t.feat_storage_cloud, included: true },
                { text: t.feat_share, included: true },
                { text: t.feat_import_export, included: true },
                { text: t.feat_premium_timeline, included: true },
                { text: t.feat_premium_map, included: true },
                { text: t.feat_messages, included: true },
                { text: t.feat_export_pdf, included: true }
            ],
            buttonText: t.btn_activate,
            primary: true,
            badge: t.plan_recommended,
            action: () => {
                setPendingStartName(startName);
                setIsAuthOpen(true);
            }
        }
    ];

    const faqs = [
        { q: t.faq_1_q, a: t.faq_1_a },
        { q: t.faq_2_q, a: t.faq_2_a },
        { q: t.faq_3_q, a: t.faq_3_a },
    ];

    return (
        <div className="bg-white dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200 font-sans selection:bg-purple-200 dark:selection:bg-purple-900">
            
            {/* Hero Section */}
            <header className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-10">
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ 
                        backgroundImage: "url('https://i.postimg.cc/DZBW1Cbf/Geni-cover.png')",
                        filter: "brightness(0.4) blur(2px)" 
                    }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-gray-900/50 to-gray-900"></div>
                
                {/* Animated Background Elements (CSS only for performance) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-2/3 w-40 h-40 bg-pink-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>
                
                <div className="relative z-10 container mx-auto px-6 text-center">
                    <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-purple-600/30 border border-purple-500/50 backdrop-blur-md text-purple-200 text-sm font-medium tracking-wide animate-fade-in-up">
                        {t.landing_badge}
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 text-white tracking-tight drop-shadow-2xl animate-fade-in-up delay-100">
                        {t.landing_title_1}<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">{t.landing_title_2}</span>{t.landing_title_3}
                    </h1>
                    <p className="text-lg md:text-2xl mb-12 text-gray-300 max-w-3xl mx-auto leading-relaxed animate-fade-in-up delay-200">
                        {t.landing_desc}
                    </p>
                    
                    {/* Quick Start Form */}
                    <div className="w-full max-w-md mx-auto animate-fade-in-up delay-300 mb-10">
                        <form onSubmit={handleQuickStart} className="relative group">
                            <input 
                                type="text" 
                                value={startName}
                                onChange={(e) => setStartName(e.target.value)}
                                placeholder={t.quick_start_placeholder}
                                className="w-full py-4 pl-6 pr-36 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-xl"
                            />
                            <button 
                                type="submit"
                                className="absolute right-2 top-2 bottom-2 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full transition-all transform group-hover:scale-105 shadow-lg flex items-center gap-2"
                            >
                                {t.quick_start_btn} <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </form>
                    </div>

                    {/* Language Switcher */}
                    <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20 w-fit mx-auto animate-fade-in-up delay-400">
                        <button 
                            onClick={() => onLanguageChange('ka')} 
                            className={`px-4 py-1.5 text-xs rounded-full transition-colors ${language === 'ka' ? 'bg-white text-gray-900 font-bold shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            ქართული
                        </button>
                        <button 
                            onClick={() => onLanguageChange('es')} 
                            className={`px-4 py-1.5 text-xs rounded-full transition-colors ${language === 'es' ? 'bg-white text-gray-900 font-bold shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            Español
                        </button>
                    </div>
                </div>
            </header>

            {/* How it Works Section */}
            <section className="py-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">{t.how_title}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-200 dark:via-purple-800 to-transparent z-0"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 border-4 border-purple-100 dark:border-purple-900 flex items-center justify-center mb-6 shadow-lg">
                                <UserPlusIcon className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{t.step_1_title}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{t.step_1_desc}</p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 border-4 border-purple-100 dark:border-purple-900 flex items-center justify-center mb-6 shadow-lg">
                                <UsersIcon className="w-10 h-10 text-pink-600 dark:text-pink-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{t.step_2_title}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{t.step_2_desc}</p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 border-4 border-purple-100 dark:border-purple-900 flex items-center justify-center mb-6 shadow-lg">
                                <ShareIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{t.step_3_title}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{t.step_3_desc}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-gray-50 dark:bg-gray-800/50 relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">{t.landing_features_title}</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            {t.landing_features_desc}
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

             {/* Testimonials Section */}
             <section className="py-24 bg-white dark:bg-gray-900">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">{t.testim_title}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {testimonials.map((item, index) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
                                <img 
                                    src={item.avatar} 
                                    alt={item.name} 
                                    className="w-16 h-16 rounded-full object-cover mb-4 border-2 border-purple-500"
                                />
                                <div className="flex gap-1 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon key={i} className="w-4 h-4 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 italic">"{item.text}"</p>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{item.name}</h4>
                                    <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">{item.role}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing / Plans Section */}
            <section className="py-24 bg-gray-50 dark:bg-gray-900 relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">{t.pricing_title}</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            {t.pricing_subtitle}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row justify-center gap-8 items-stretch max-w-5xl mx-auto">
                        {plans.map((plan, index) => (
                            <div 
                                key={index}
                                className={`flex-1 flex flex-col p-8 rounded-3xl transition-all duration-300 relative ${
                                    plan.primary 
                                    ? 'bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl scale-100 md:scale-105 z-10 border-2 border-purple-500/50' 
                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:shadow-lg'
                                }`}
                            >
                                {plan.badge && (
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                                        {plan.badge}
                                    </div>
                                )}
                                
                                <div className="mb-8">
                                    <h3 className={`text-2xl font-bold mb-2 ${plan.primary ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{plan.name}</h3>
                                </div>

                                <ul className="flex-grow space-y-4 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className={`flex items-start gap-3 ${!feature.included ? 'opacity-50' : ''}`}>
                                            <div className={`flex-shrink-0 mt-0.5 ${feature.included ? (plan.primary ? 'text-green-400' : 'text-green-600') : 'text-gray-400'}`}>
                                                {feature.included ? <CheckIcon className="w-5 h-5"/> : <CloseIcon className="w-5 h-5"/>}
                                            </div>
                                            <span className={`text-sm ${!feature.included && 'line-through decoration-gray-400'}`}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={plan.action}
                                    className={`w-full py-4 rounded-xl font-bold transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${
                                        plan.primary
                                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                                    }`}
                                >
                                    {plan.buttonText}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-white dark:bg-gray-800/30">
                <div className="container mx-auto px-6 max-w-3xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t.faq_title}</h2>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <button 
                                    onClick={() => toggleFaq(index)}
                                    className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                                >
                                    <span className="font-semibold text-lg text-gray-900 dark:text-white">{faq.q}</span>
                                    <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`px-6 pb-6 text-gray-600 dark:text-gray-400 transition-all duration-300 ${openFaqIndex === index ? 'block' : 'hidden'}`}>
                                    {faq.a}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer CTA */}
            <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-900/20 to-pink-900/20 pointer-events-none"></div>
                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="text-3xl md:text-4xl font-bold mb-8">{t.landing_footer_cta_title}</h2>
                    <p className="text-gray-300 mb-10 max-w-xl mx-auto">
                        {t.landing_footer_cta_desc}
                    </p>
                    <button 
                        onClick={() => { setPendingStartName(startName); setIsAuthOpen(true); }}
                        className="inline-flex items-center justify-center px-8 py-3 border border-gray-600 hover:border-white rounded-full text-lg font-medium transition-colors hover:bg-white hover:text-gray-900"
                    >
                        {t.landing_open_tree}
                    </button>
                </div>
            </section>

            <footer className="bg-black py-10 border-t border-gray-800">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
                    <p className="flex items-center gap-1">
                        <span>&copy; {new Date().getFullYear()} {t.landing_copyright}</span>
                    </p>
                    
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                    </div>

                    <p className="flex items-center gap-1">
                        {t.landing_created_by}
                        <a href="https://bit.ly/av-ma" target="_blank" rel="noopener noreferrer" className="inline-block transition-opacity hover:opacity-80">
                            <img 
                                src="https://i.postimg.cc/c1T2NJgV/avma.png" 
                                alt="AvMa" 
                                className="h-3 w-auto ml-1" 
                            />
                        </a>
                    </p>
                </div>
            </footer>

            <AuthModal 
                isOpen={isAuthOpen} 
                onClose={() => setIsAuthOpen(false)} 
                onLoginSuccess={handleAuthSuccess}
                language={language}
            />
        </div>
    );
};

export default LandingPage;
