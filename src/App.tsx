/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, getDocFromServer, doc, setDoc, increment } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { AdminDashboard } from './AdminDashboard';
import { StatsView } from './StatsView';
import { Lock, LayoutDashboard, BarChart3, Download } from 'lucide-react';

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
}

const COMMUNITIES = [
  '𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠',
  'Kҽɳƈԋσ Aʅʅιαɳƈҽ',
  'Nexus',
  '𝙱𝙹𝙴 ~ Clan'
];

const ADMIN_EMAILS = ['tuijbialnajah@gmail.com', 'nadiaparveen1526@gmail.com'];

export default function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isStatsView, setIsStatsView] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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
        setIsAdminView(true);
      } else {
        alert("You are not authorized as an admin.");
      }
    } else {
      try {
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(auth, provider);
        if (res.user.email && ADMIN_EMAILS.includes(res.user.email)) {
          setIsAdminView(true);
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

  if (isAdminView) {
    return <AdminDashboard onExit={() => setIsAdminView(false)} />;
  }
  
  if (isStatsView) {
    return <StatsView onBack={() => setIsStatsView(false)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#111b21] text-white font-sans flex flex-col relative selection:bg-[#00a884] selection:text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-[#111b21] border-b border-[#202c33] shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex-1 flex justify-start">
            <button
              onClick={() => setIsStatsView(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#202c33] text-[#e9edef] rounded-full text-sm font-medium hover:bg-[#38464e] transition-colors border border-[#38464e]/50"
            >
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Stats</span>
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠
          </h1>
          <div className="flex-1 flex justify-end gap-2">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#00a884] text-[#111b21] rounded-full text-sm font-bold hover:bg-[#00c59b] transition-colors shadow-lg shadow-[#00a884]/20"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}
          {isAdminUser && (
            <button
              onClick={() => setIsAdminView(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#00a884]/10 text-[#00a884] rounded-full text-sm font-medium hover:bg-[#00a884]/20 transition-colors border border-[#00a884]/20"
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          </div>
        </div>
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
        ) : groups.length === 0 ? (
          <div className="text-center py-20 bg-[#202c33] rounded-2xl sm:rounded-3xl border border-[#38464e]/50 max-w-2xl mx-auto">
            <h3 className="text-xl text-[#e9edef] font-medium mb-3">No groups available</h3>
            <p className="text-[#8696a0] max-w-md mx-auto leading-relaxed">
              Please add groups via your Firebase Console in the "groups" collection.
              Remember to set <code className="bg-[#111b21] px-1.5 py-0.5 rounded text-sm text-[#00a884]">isPublic: true</code> for them to appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-12 sm:space-y-16">
            {COMMUNITIES.map(community => {
              const communityGroups = groups.filter(g => g.community === community || (!g.community && community === COMMUNITIES[0]));
              if (communityGroups.length === 0) return null;
              
              return (
                <section key={community} className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-2xl font-bold text-white tracking-wide">{community}</h2>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-[#00a884]/40 to-transparent"></div>
                  </div>
                  <div className="relative -mx-4 sm:mx-0">
                    <div className="flex overflow-x-auto pb-4 px-4 sm:px-0 gap-3 sm:gap-4 lg:gap-6 snap-x snap-mandatory scrollbar-hide scroll-smooth after:content-[''] after:shrink-0 after:w-1 sm:after:w-0">
                      {communityGroups.map((group) => (
                      <div 
                        key={group.id} 
                        className="group bg-[#202c33] rounded-xl sm:rounded-3xl overflow-hidden flex flex-col border border-[#38464e]/30 hover:border-[#00a884]/50 transition-colors duration-200 snap-center sm:snap-start shrink-0 w-[40vw] sm:w-[220px] lg:w-[240px]"
                      >
                      {/* Cover Image */}
                      <div className="relative aspect-square w-full">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#202c33] to-transparent z-10 opacity-50"></div>
                        <img 
                          src={group.imageUrl} 
                          alt={group.title}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>

                      {/* Card Content */}
                      <div className="flex flex-col flex-grow relative z-20 bg-[#202c33]">
                        <div className="p-2 sm:p-5 pb-1.5 sm:pb-3 text-center">
                          <h3 className="text-[9px] sm:text-[14px] md:text-[16px] leading-tight font-semibold text-[#e9edef] tracking-wide mb-1 px-0.5 sm:px-2 break-words" title={group.title}>
                            {group.title}
                          </h3>
                        </div>

                        {/* Action Button */}
                        <div className="mt-auto px-2 pb-2 sm:px-5 sm:pb-5 text-center">
                          <a
                            href={group.joinLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-1.5 sm:py-3 bg-[#00a884] text-[#111b21] font-bold text-[10px] sm:text-[15px] rounded-md sm:rounded-2xl hover:bg-[#00c59b] transition-colors active:opacity-80 truncate"
                          >
                            Join
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

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
