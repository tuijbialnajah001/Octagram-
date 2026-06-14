/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FC } from 'react';
import { collection, onSnapshot, query, where, getDocFromServer, doc, setDoc, increment } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { AdminDashboard } from './AdminDashboard';
import { StatsView } from './StatsView';
import { LayoutDashboard, BarChart3, Download, Search, Lock } from 'lucide-react';

interface Group {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  time: string;
  joinLink: string;
  isPublic: boolean;
  community?: string;
  createdAt: number;
  isMostActive?: boolean;
}

const COMMUNITIES = [
  '𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠',
  'Kҽɳƈԋσ Aʅʅιαɳƈҽ',
  'Nexus',
  '𝙱𝙹𝙴 ~ Clan',
  'Projects'
];

const ADMIN_EMAILS = ['tuijbialnajah@gmail.com', 'nadiaparveen1526@gmail.com'];

const normalizeText = (text: string) => {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[Λ]/g, 'A')
    .replace(/[λ]/gi, 'a')
    .replace(/[ҽ]/g, 'e')
    .replace(/[ɳ]/g, 'n')
    .replace(/[ƈ]/g, 'c')
    .replace(/[ԋ]/g, 'h')
    .replace(/[σ]/g, 'o')
    .replace(/[ʅ]/g, 'l')
    .replace(/[ι]/g, 'i')
    .replace(/[α]/g, 'a')
    .toLowerCase();
};

const getFallbackImageUrl = (link?: string) => {
  if (!link) return null;
  try {
    const url = new URL(link);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
  } catch (e) {
    return null;
  }
};

import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';

const GroupCard: FC<{ group: Group, requested: boolean, onRequest: () => void | Promise<void> }> = ({ group, requested, onRequest }) => {
  const imgSource = group.imageUrl || getFallbackImageUrl(group.joinLink);

  return (
    <div 
      className="group bg-[#202c33] rounded-xl sm:rounded-3xl overflow-hidden flex flex-col border border-[#38464e]/30 hover:border-[#00a884]/50 transition-colors duration-200 shrink-0 w-[24vw] sm:w-[140px] lg:w-[150px]"
    >
      {/* Cover Image */}
      <div className="relative aspect-square w-full">
        <div className="absolute inset-0 bg-gradient-to-t from-[#202c33] to-transparent z-10 opacity-50"></div>
        {imgSource ? (
          <img 
            src={imgSource} 
            alt={group.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-[#111b21] flex items-center justify-center">
            <span className="text-[#00a884] text-3xl font-bold">{group.title.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-col flex-grow relative z-20 bg-[#202c33]">
        <div className="p-1.5 sm:p-3 pb-1 sm:pb-2 text-center">
          <h3 className="text-[8px] sm:text-[11px] md:text-[12px] leading-tight font-semibold text-[#e9edef] tracking-wide mb-1 px-0.5 sm:px-1 break-words" title={group.title}>
            {group.title}
          </h3>
        </div>

        {/* Action Button */}
        <div className="mt-auto px-1.5 pb-1.5 sm:px-3 sm:pb-3 text-center flex flex-col gap-1 sm:gap-1.5">
          <a
            href={group.joinLink?.startsWith('http') ? group.joinLink : `https://${group.joinLink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-1 sm:py-1.5 bg-[#00a884] text-[#111b21] font-bold text-[8px] sm:text-[11px] rounded-sm sm:rounded-md hover:bg-[#00c59b] transition-colors active:opacity-80 truncate"
          >
            {group.community === 'Projects' ? 'Visit Project' : 'Join'}
          </a>
          {group.community !== 'Projects' && (
            <button
              onClick={onRequest}
              disabled={requested}
              className="swiper-no-swiping block w-full py-1 sm:py-1.5 bg-transparent text-red-500 font-semibold text-[7px] sm:text-[9px] rounded-sm sm:rounded-md border border-red-500/50 hover:bg-red-500/10 transition-colors active:opacity-80 truncate disabled:opacity-50 disabled:border-gray-500 disabled:text-gray-400 disabled:hover:bg-transparent relative z-50 cursor-pointer"
            >
              {requested ? 'Requested' : 'Request new link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);
  const [currentView, setCurrentView] = useState(new URLSearchParams(window.location.search).get('view') || 'home');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [requestedLinks, setRequestedLinks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'groups' | 'projects'>('groups');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [authLoaded, setAuthLoaded] = useState(false);

  const navigateTo = (view: string) => {
    const url = view === 'home' ? '/' : `?view=${view}`;
    window.history.pushState({}, '', url);
    setCurrentView(view);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRequestLink = async (group: Group) => {
    if (requestedLinks.has(group.id)) return;
    try {
      const requestRef = doc(collection(db, 'link_requests'));
      await setDoc(requestRef, {
        groupId: group.id,
        groupTitle: group.title,
        status: 'pending',
        createdAt: Date.now()
      });
      setRequestedLinks(prev => new Set(prev).add(group.id));
    } catch (error) {
      console.error("Error requesting link:", error);
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setCurrentView(params.get('view') || 'home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Record visit
    const recordVisit = async () => {
      // Use sessionStorage to only count unique page views per session
      if (sessionStorage.getItem('visited')) return;
      sessionStorage.setItem('visited', 'true');

      try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const docRef = doc(db, 'daily_stats', dateStr);
        await setDoc(docRef, {
          date: dateStr,
          timestamp: today.getTime(),
          count: increment(1)
        }, { merge: true });
      } catch (error) {
        console.error("Failed to record visit", error);
      }
    };
    recordVisit();

    // Validate connection
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          setDbConnected(false);
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    // Re-check authentication context when component mounts
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user?.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdminUser(true);
      } else {
        setIsAdminUser(false);
      }
      setAuthLoaded(true);
    });

    const q = query(collection(db, 'groups'), where('isPublic', '==', true));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchGroups = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Group[];
        // Sort by createdAt descending locally since we don't have a composite index for it yet
        fetchGroups.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setGroups(fetchGroups);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'groups');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeAuth();
    };
  }, []);

  const handleAdminClick = async () => {
    if (auth.currentUser) {
      if (auth.currentUser.email && ADMIN_EMAILS.includes(auth.currentUser.email)) {
        navigateTo('admin');
      } else {
        alert("You are not authorized as an admin.");
      }
    } else {
      try {
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(auth, provider);
        if (res.user.email && ADMIN_EMAILS.includes(res.user.email)) {
          navigateTo('admin');
        } else {
          alert("You are not authorized as an admin.");
          await auth.signOut();
        }
      } catch (error) {
        console.error("Login failed", error);
      }
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (currentView === 'admin') {
    if (!authLoaded) {
      return (
        <div className="min-h-[100dvh] bg-[#111b21] flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00a884]"></div>
        </div>
      );
    }
    if (!isAdminUser) {
      return (
        <div className="min-h-[100dvh] bg-[#111b21] flex items-center justify-center flex-col gap-4 text-white">
          <p className="text-xl">Admin access required.</p>
          <button onClick={() => navigateTo('home')} className="px-6 py-2 bg-[#00a884] text-[#111b21] rounded-lg font-bold">Go Home</button>
        </div>
      );
    }
    return <AdminDashboard onExit={() => navigateTo('home')} />;
  }
  
  if (currentView === 'stats') {
    return <StatsView onBack={() => navigateTo('home')} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#111b21] text-white font-sans flex flex-col relative selection:bg-[#00a884] selection:text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-[#111b21] border-b border-[#202c33] shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex-1 flex justify-start">
            <button
              onClick={() => navigateTo('stats')}
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#202c33] text-[#e9edef] rounded-full text-sm font-medium hover:bg-[#38464e] transition-colors border border-[#38464e]/50 cursor-pointer"
            >
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Stats</span>
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
            𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠
          </h1>
          <div className="flex-1 flex justify-end gap-2">
          <button
            onClick={() => {
              if (deferredPrompt) {
                handleInstallClick();
              } else {
                alert("To install the app, tap your browser's menu and select 'Add to Home Screen' or 'Install app'.");
              }
            }}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#00a884] text-[#111b21] rounded-full text-sm font-bold hover:bg-[#00c59b] transition-colors shadow-lg shadow-[#00a884]/20"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Install App</span>
          </button>
          {isAdminUser && (
            <button
              onClick={() => navigateTo('admin')}
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#00a884]/10 text-[#00a884] rounded-full text-sm font-medium hover:bg-[#00a884]/20 transition-colors border border-[#00a884]/20 cursor-pointer"
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          </div>
        </div>
        
        {currentView === 'home' && (
          <div className="border-t border-[#202c33] bg-[#111b21] shadow-md">
            <div className="max-w-xl mx-auto px-4 flex justify-center py-3">
              <div className="bg-[#202c33] p-1 rounded-2xl flex gap-1 border border-[#38464e]/50 shadow w-full text-center">
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`flex-1 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 ${
                    activeTab === 'groups'
                      ? 'bg-[#00a884] text-[#111b21] shadow-md'
                      : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'
                  }`}
                >
                  Groups
                </button>
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`flex-1 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 ${
                    activeTab === 'projects'
                      ? 'bg-[#00a884] text-[#111b21] shadow-md'
                      : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'
                  }`}
                >
                  Projects
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {!dbConnected && (
          <div className="text-center p-6 bg-red-900/30 rounded-2xl border border-red-500/30 mb-8 max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
            <p className="text-red-300/80">Could not connect to Firebase. Please check your setup.</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00a884]"></div>
          </div>
        ) : (() => {
          const normalizedSearch = normalizeText(searchQuery);
          const baseFiltered = groups.filter(g =>
            normalizeText(g.title).includes(normalizedSearch) ||
            normalizeText(g.description).includes(normalizedSearch) ||
            (g.community && normalizeText(g.community).includes(normalizedSearch))
          );

          const filteredGroups = baseFiltered.filter(g => 
            activeTab === 'projects' ? g.community === 'Projects' : g.community !== 'Projects'
          );

          if (groups.length === 0) {
            return (
              <div className="text-center py-20 bg-[#202c33] rounded-2xl sm:rounded-3xl border border-[#38464e]/50 max-w-2xl mx-auto">
                <h3 className="text-xl text-[#e9edef] font-medium mb-3">No groups available</h3>
                <p className="text-[#8696a0] max-w-md mx-auto leading-relaxed">
                  Please add groups via your Firebase Console in the "groups" collection.
                  Remember to set <code className="bg-[#111b21] px-1.5 py-0.5 rounded text-sm text-[#00a884]">isPublic: true</code> for them to appear here.
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-6 sm:space-y-8">
              <div ref={searchRef} className="relative max-w-xl mx-auto mb-4 sm:mb-6 z-50">
                <input
                  type="text"
                  placeholder="Search groups and projects..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full bg-[#202c33] text-white px-5 py-3.5 sm:py-4 rounded-2xl border border-[#38464e] focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] placeholder-[#8696a0] transition-colors shadow-lg"
                />
                <Search className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-[#8696a0]" size={20} />
                
                {showSuggestions && searchQuery.trim() && filteredGroups.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#202c33] border border-[#38464e] rounded-xl shadow-2xl overflow-hidden z-[100] max-h-60 overflow-y-auto">
                    {(() => {
                      const uniqueGroups = filteredGroups.reduce((acc, curr) => {
                        if (!acc.find(g => g.title === curr.title)) acc.push(curr);
                        return acc;
                      }, [] as typeof filteredGroups).slice(0, 8);
                      
                      return uniqueGroups.map((group, idx) => {
                        const imgSource = group.imageUrl || getFallbackImageUrl(group.joinLink);
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchQuery(group.title);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-3 text-[#e9edef] hover:bg-[#2a3942] transition-colors border-b border-[#38464e]/50 last:border-b-0 flex items-center gap-3"
                          >
                            {imgSource ? (
                              <img src={imgSource} alt={group.title} className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#38464e]" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center shrink-0 border border-[#38464e]">
                                <span className="text-[#00a884] text-lg font-bold">{group.title.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex flex-col overflow-hidden">
                              <span className="truncate font-medium">{group.title}</span>
                              <span className="text-xs text-[#8696a0] truncate">{group.community || 'Group'}</span>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {filteredGroups.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[#8696a0] text-lg">No groups or projects found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  {(() => {
                    const mostActive = filteredGroups.filter(g => g.isMostActive);
                    if (mostActive.length === 0) return null;
              
              return (
                <section key="most-active" className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/20 px-3 py-1 flex items-center gap-2 rounded-full border border-orange-500/30">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                      <h2 className="text-sm sm:text-base font-bold text-orange-400 tracking-wide uppercase">Most Active</h2>
                    </div>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-orange-500/40 to-transparent"></div>
                  </div>
                  
                  <div className="relative -mx-4 sm:mx-0 overflow-hidden">
                    <Swiper
                      effect={'coverflow'}
                      grabCursor={true}
                      centeredSlides={true}
                      slidesPerView={'auto'}
                      slideToClickedSlide={true}
                      preventClicks={false}
                      preventClicksPropagation={false}
                      coverflowEffect={{
                        rotate: 30,
                        stretch: 0,
                        depth: 100,
                        modifier: 1,
                        slideShadows: true,
                      }}
                      modules={[EffectCoverflow]}
                      className="w-full py-6 px-4"
                    >
                      {mostActive.map((group) => (
                        <SwiperSlide key={`active-${group.id}`} className="!w-auto md:!w-auto">
                          <GroupCard
                            group={group}
                            requested={requestedLinks.has(group.id)}
                            onRequest={() => handleRequestLink(group)}
                          />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </div>
                </section>
              );
            })()}

            {COMMUNITIES.filter(c => activeTab === 'projects' ? c === 'Projects' : c !== 'Projects').map(community => {
              const communityGroups = filteredGroups.filter(g => g.community === community || (!g.community && community === COMMUNITIES[0]));
              if (communityGroups.length === 0) return null;
              
              return (
                <section key={community} className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-2xl font-bold text-white tracking-wide">{community}</h2>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-[#00a884]/40 to-transparent"></div>
                  </div>
                  <div className="relative -mx-4 sm:mx-0 pr-4 sm:pr-0">
                    <div 
                      className="flex overflow-x-auto pb-4 px-4 sm:px-0 gap-3 sm:gap-4 lg:gap-6 scrollbar-hide after:content-[''] after:shrink-0 after:w-1 sm:after:w-0"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                      {communityGroups.map((group) => (
                        <GroupCard
                          key={group.id}
                          group={group}
                          requested={requestedLinks.has(group.id)}
                          onRequest={() => handleRequestLink(group)}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
              )}
            </div>
          );
        })()}

      </main>

      <footer className="w-full bg-black py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:py-5 relative z-10 border-t border-[#202c33]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-3">
          <p className="text-[10px] sm:text-xs text-[#8696a0] max-w-2xl text-center font-medium tracking-wide leading-relaxed">
            We are not merely a gathering of enthusiasts. We are an alliance — a brotherhood and sisterhood united under the banner of anime.
          </p>
          <button 
            onClick={handleAdminClick} 
            className="flex items-center gap-1.5 text-[#38464e] hover:text-[#00a884] transition-colors text-[10px] uppercase tracking-[0.2em] font-bold"
            title="Admin Access"
          >
            <Lock size={12} />
            {isAdminUser ? 'Enter Admin Dashboard' : 'Admin Login'}
          </button>
        </div>
      </footer>
    </div>
  );
}
