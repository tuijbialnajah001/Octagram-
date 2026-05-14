/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, getDocFromServer, doc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { AdminDashboard } from './AdminDashboard';
import { Lock, LayoutDashboard } from 'lucide-react';

interface Group {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  time: string;
  joinLink: string;
  isPublic: boolean;
  createdAt: number;
}

const ADMIN_EMAILS = ['tuijbialnajah@gmail.com', 'nadiaparveen1526@gmail.com'];

export default function App() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
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

  if (isAdminView) {
    return <AdminDashboard onExit={() => setIsAdminView(false)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#111b21] text-white pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))] px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
            𝗧𝗛Ξ 𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠
          </h1>
          {isAdminUser && (
            <button
              onClick={() => setIsAdminView(true)}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-[#00a884] text-[#111b21] rounded-full font-medium hover:bg-[#00a884]/90 transition-colors shadow-lg"
            >
              <LayoutDashboard size={20} />
              Go to Admin Dashboard
            </button>
          )}
        </div>

        {!dbConnected && (
          <div className="text-center p-6 bg-red-900/50 rounded-xl border border-red-500/50 mb-8 max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-red-200 mb-2">Connection Error</h2>
            <p className="text-red-300">Could not connect to Firebase. Please check your setup.</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00a884]"></div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 bg-[#202c33] rounded-2xl border border-[#38464e]">
            <h3 className="text-xl text-[#e9edef] font-medium mb-2">No groups available</h3>
            <p className="text-[#8696a0]">
              Please add groups via your Firebase Console in the "groups" collection.
              Remember to set <code className="bg-[#111b21] px-1.5 py-0.5 rounded">isPublic: true</code> for them to appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {groups.map((group) => (
            <div 
              key={group.id} 
              className="bg-[#202c33] rounded-2xl overflow-hidden flex flex-col shadow-lg border border-[#202c33] hover:border-[#38464e] transition-colors"
            >
              {/* Cover Image */}
              <div className="relative aspect-square w-full">
                <img 
                  src={group.imageUrl} 
                  alt={group.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              {/* Card Content */}
              <div className="flex flex-col flex-grow">
                <div className="p-3 sm:p-4 pb-2 text-center">
                  <h3 className="text-[14px] sm:text-[17px] leading-snug font-medium text-[#e9edef] mb-1 truncate">
                    {group.title}
                  </h3>
                </div>

                {/* Divider & Action Button */}
                <div className="mt-auto border-t border-[#8696a0]/20">
                  <a
                    href={group.joinLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 sm:py-3.5 text-center text-[#00a884] font-medium text-[13px] sm:text-[15px] hover:bg-[#8696a0]/5 transition-colors active:bg-[#8696a0]/10"
                  >
                    Join group
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-lg text-[#8696a0] max-w-3xl mx-auto font-medium mb-8">
            We are not merely a gathering of enthusiasts. We are an alliance — a brotherhood and sisterhood united under the banner of anime.
          </p>
          <div className="flex justify-center">
            <button 
              onClick={handleAdminClick} 
              className="flex items-center gap-2 text-[#38464e] hover:text-[#00a884] transition-colors text-sm font-medium"
              title="Admin Access"
            >
              <Lock size={16} />
              {isAdminUser ? 'Enter Admin Dashboard' : 'Admin Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
