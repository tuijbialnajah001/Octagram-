import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { X, Plus, LogOut, Edit, Trash } from 'lucide-react';
import { signOut } from 'firebase/auth';

interface Group {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  time: string;
  joinLink: string;
  isPublic: boolean;
  community: string;
  createdAt: number;
}

const COMMUNITIES = [
  '𝗢𝗖𝗧Λ𝗚𝗥Λ𝗠',
  'Kҽɳƈԋσ Aʅʅιαɳƈҽ',
  'Nexus',
  '𝙱𝙹𝙴 ~ Clan'
];

interface LinkRequest {
  id: string;
  groupId: string;
  groupTitle: string;
  status: string;
  createdAt: number;
}

export function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([]);
  const [editingGroup, setEditingGroup] = useState<Partial<Group> | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  
  const handleFetchGroupInfo = async () => {
    if (!editingGroup?.joinLink) return;
    setIsFetchingUrl(true);
    try {
      const res = await fetch('/api/fetch-group-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: editingGroup.joinLink }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setEditingGroup(prev => ({
          ...prev!,
          title: data.title || prev?.title || '',
          imageUrl: data.image || prev?.imageUrl || ''
        }));
      } else {
        alert(data.error || "Could not fetch info. Make sure it's a valid WhatsApp link.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error fetching info.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  useEffect(() => {
    const unsubscribeGroups = onSnapshot(
      collection(db, 'groups'),
      (snapshot) => {
        const fetchGroups = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Group[];
        fetchGroups.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setGroups(fetchGroups);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'groups')
    );

    const unsubscribeRequests = onSnapshot(
      collection(db, 'link_requests'),
      (snapshot) => {
        const fetchRequests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as LinkRequest[];
        fetchRequests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setLinkRequests(fetchRequests);
      },
      (error) => console.error("Error fetching link requests:", error)
    );

    return () => {
      unsubscribeGroups();
      unsubscribeRequests();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    try {
      if (editingGroup.id) {
        // Update existing
        await updateDoc(doc(db, 'groups', editingGroup.id), editingGroup);
        // Automatically dismiss any requests for this group
        const requestsToDismiss = linkRequests.filter(r => r.groupId === editingGroup.id);
        for (const req of requestsToDismiss) {
          await deleteDoc(doc(db, 'link_requests', req.id));
        }
      } else {
        // Create new
        const id = editingGroup.title?.toLowerCase().replace(/\s+/g, '-') || Date.now().toString();
        await setDoc(doc(db, 'groups', id), {
          title: editingGroup.title || '',
          description: editingGroup.description || '',
          imageUrl: editingGroup.imageUrl || '',
          time: editingGroup.time || '',
          joinLink: editingGroup.joinLink || '',
          isPublic: editingGroup.isPublic ?? false,
          community: editingGroup.community || COMMUNITIES[0],
          createdAt: Date.now()
        });
      }
      setEditingGroup(null);
    } catch (err) {
      handleFirestoreError(err, editingGroup.id ? OperationType.UPDATE : OperationType.CREATE, 'groups');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      try {
        await deleteDoc(doc(db, 'groups', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'groups');
      }
    }
  };

  const handleResolveRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'link_requests', id));
    } catch (err) {
      console.error("Error resolving request:", err);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#111b21] text-white pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] px-4 sm:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setEditingGroup({ isPublic: true, community: COMMUNITIES[0] })}
              className="flex items-center gap-2 px-4 py-2 bg-[#00a884] text-[#111b21] rounded-lg font-medium hover:bg-[#00a884]/90"
            >
              <Plus size={20} /> Add Group
            </button>
            <button
              onClick={() => {
                signOut(auth);
                onExit();
              }}
              className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500/10"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </div>

        {linkRequests.length > 0 && (
          <div className="bg-[#2a3942] rounded-xl p-6 border border-[#38464e]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Link Reset Requests ({linkRequests.length})
            </h2>
            <div className="space-y-3">
              {linkRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between bg-[#202c33] p-4 rounded-lg border border-red-500/20 flex-wrap gap-4">
                  <div>
                    <h3 className="font-medium text-white">{request.groupTitle}</h3>
                    <p className="text-sm text-[#8696a0]">Requested: {new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const groupToEdit = groups.find(g => g.id === request.groupId);
                        if (groupToEdit) setEditingGroup(groupToEdit);
                      }}
                      className="px-3 py-1.5 bg-[#00a884]/10 text-[#00a884] rounded hover:bg-[#00a884]/20 transition-colors text-sm font-medium"
                    >
                      Update Link
                    </button>
                    <button
                      onClick={() => handleResolveRequest(request.id)}
                      className="px-3 py-1.5 bg-gray-500/10 text-gray-300 rounded hover:bg-gray-500/20 transition-colors text-sm font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editingGroup ? (
          <form onSubmit={handleSave} className="bg-[#202c33] p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">{editingGroup.id ? 'Edit Group' : 'New Group'}</h2>
              <button type="button" onClick={() => setEditingGroup(null)} className="text-[#8696a0] hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm text-[#8696a0] mb-1">Title</label>
              <input
                required
                value={editingGroup.title || ''}
                onChange={e => setEditingGroup({...editingGroup, title: e.target.value})}
                className="w-full bg-[#2a3942] border border-[#38464e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00a884]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#8696a0] mb-1">Image URL</label>
              <input
                required
                value={editingGroup.imageUrl || ''}
                onChange={e => setEditingGroup({...editingGroup, imageUrl: e.target.value})}
                className="w-full bg-[#2a3942] border border-[#38464e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00a884]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#8696a0] mb-1">Join Link</label>
              <div className="flex gap-2">
                <input
                  required
                  value={editingGroup.joinLink || ''}
                  onChange={e => setEditingGroup({...editingGroup, joinLink: e.target.value})}
                  className="flex-1 bg-[#2a3942] border border-[#38464e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00a884]"
                />
                <button
                  type="button"
                  onClick={handleFetchGroupInfo}
                  disabled={isFetchingUrl || !editingGroup.joinLink}
                  className="px-4 py-2 bg-[#2a3942] hover:bg-[#38464e] disabled:opacity-50 border border-[#38464e] rounded-lg text-sm text-[#00a884] font-medium transition-colors"
                >
                  {isFetchingUrl ? 'Fetching...' : 'Auto-Fill'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#8696a0] mb-1">Community</label>
              <select
                value={editingGroup.community || COMMUNITIES[0]}
                onChange={e => setEditingGroup({...editingGroup, community: e.target.value})}
                className="w-full bg-[#2a3942] border border-[#38464e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00a884] appearance-none"
              >
                {COMMUNITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-3 select-none">
              <input
                type="checkbox"
                checked={!!editingGroup.isPublic}
                onChange={e => setEditingGroup({...editingGroup, isPublic: e.target.checked})}
                className="w-5 h-5 accent-[#00a884]"
              />
              <span>Is Public</span>
            </label>

            <button type="submit" className="w-full py-3 bg-[#00a884] text-[#111b21] rounded-lg font-medium hover:bg-[#00a884]/90">
              Save Group
            </button>
          </form>
        ) : (
          <div className="grid gap-4">
            {groups.map(group => (
              <div key={group.id} className="bg-[#202c33] p-4 flex items-center justify-between rounded-xl">
                <div className="flex items-center gap-4">
                  <img src={group.imageUrl} alt={group.title} className="w-16 h-16 object-cover rounded-lg" />
                  <div>
                    <h3 className="font-medium text-lg">{group.title}</h3>
                    <div className="text-sm text-[#8696a0] flex gap-2 items-center flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs leading-tight bg-[#2a3942] border border-[#38464e] text-white`}>
                        {group.community || 'Uncategorized'}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${group.isPublic ? 'bg-[#00a884]' : 'bg-red-500'}`} />
                      {group.isPublic ? 'Public' : 'Hidden'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingGroup(group)} className="p-2 text-[#8696a0] hover:text-white bg-[#2a3942] rounded-lg">
                    <Edit size={20} />
                  </button>
                  <button onClick={() => handleDelete(group.id)} className="p-2 text-red-500 hover:text-white bg-[#2a3942] rounded-lg">
                    <Trash size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
