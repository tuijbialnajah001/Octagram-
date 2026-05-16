import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { ArrowLeft, BarChart3, Users, Calendar, TrendingUp, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { isToday, isThisWeek, isThisMonth, isThisYear, format, parseISO } from 'date-fns';

interface StatsViewProps {
  onBack: () => void;
}

interface DailyStat {
  id: string;
  date: string;
  timestamp: number;
  count: number;
}

export function StatsView({ onBack }: StatsViewProps) {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);
    
    const unsubscribe = onSnapshot(collection(db, 'daily_stats'), (snapshot) => {
      const fetchedStats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyStat[];
      
      // Sort by date ascending
      fetchedStats.sort((a, b) => a.date.localeCompare(b.date));
      setStats(fetchedStats);
      setLoading(false);
    }, (error) => {
      console.error('Failed to fetch stats:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const aggregatedStats = useMemo(() => {
    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let thisYear = 0;
    let lifetime = 0;

    stats.forEach((stat) => {
      const count = stat.count || 0;
      lifetime += count;
      
      const statDate = parseISO(stat.date);
      
      if (isToday(statDate)) {
        today += count;
      }
      if (isThisWeek(statDate, { weekStartsOn: 1 })) { // Monday as week start
        thisWeek += count;
      }
      if (isThisMonth(statDate)) {
        thisMonth += count;
      }
      if (isThisYear(statDate)) {
        thisYear += count;
      }
    });

    return { today, thisWeek, thisMonth, thisYear, lifetime };
  }, [stats]);

  const chartData = useMemo(() => {
    // Map dates nicely for the chart
    return stats.map(stat => ({
      name: format(parseISO(stat.date), 'MMM dd'),
      visits: stat.count || 0,
    }));
  }, [stats]);

  return (
    <div className="min-h-[100dvh] bg-[#111b21] text-white font-sans flex flex-col relative selection:bg-[#00a884] selection:text-white pb-[calc(3rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#111b21] border-b border-[#202c33] shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex-1 flex justify-start">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#202c33] text-[#e9edef] rounded-full text-sm font-medium hover:bg-[#38464e] transition-colors border border-[#38464e]/50"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="text-[#00a884]" />
            Traffic Stats
          </h1>
          <div className="flex-1 flex justify-end"></div>
        </div>
      </header>

      <main className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00a884]"></div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
              <StatCard label="Today" value={aggregatedStats.today} icon={<Activity size={20} className="text-[#00a884]" />} />
              <StatCard label="This Week" value={aggregatedStats.thisWeek} icon={<Calendar size={20} className="text-[#00a884]" />} />
              <StatCard label="This Month" value={aggregatedStats.thisMonth} icon={<Calendar size={20} className="text-[#00a884]" />} />
              <StatCard label="This Year" value={aggregatedStats.thisYear} icon={<TrendingUp size={20} className="text-[#00a884]" />} />
              <div className="col-span-2 md:col-span-2">
                <StatCard label="Lifetime Visits" value={aggregatedStats.lifetime} icon={<Users size={20} className="text-[#00a884]" />} primary />
              </div>
            </div>

            {/* Chart Area */}
            <div className="bg-[#202c33] border border-[#38464e]/50 rounded-2xl sm:rounded-3xl p-4 sm:p-7">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#e9edef] flex items-center gap-2">
                  <Activity size={18} className="text-[#00a884]" />
                  Visit History
                </h3>
                <p className="text-[#8696a0] text-sm mt-1">Growth over time</p>
              </div>

              <div className="h-72 sm:h-96 w-full mt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00a884" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#00a884" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#38464e" vertical={false} opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#8696a0" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        minTickGap={20}
                      />
                      <YAxis 
                        stroke="#8696a0" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111b21', borderColor: '#38464e', borderRadius: '12px', color: '#fff', padding: '12px' }}
                        itemStyle={{ color: '#00a884', fontWeight: 'bold' }}
                        labelStyle={{ color: '#8696a0', marginBottom: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="visits" 
                        name="Visits"
                        stroke="#00a884" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorVisits)" 
                        activeDot={{ r: 6, fill: '#111b21', stroke: '#00a884', strokeWidth: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#8696a0] opacity-70">
                    <BarChart3 size={48} className="mb-4 opacity-50" />
                    <p>No visit data collected yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, primary = false }: { label: string; value: number; icon: React.ReactNode; primary?: boolean }) {
  return (
    <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col ${
      primary 
        ? "bg-[#202c33] border-[#00a884]/40 relative overflow-hidden" 
        : "bg-[#202c33] border-[#38464e]/50"
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${primary ? 'bg-[#00a884]/10' : 'bg-[#111b21]'}`}>
          {icon}
        </div>
        <h3 className="text-[#8696a0] font-medium text-sm sm:text-base">{label}</h3>
      </div>
      <div className="mt-auto">
        <span className={`text-3xl sm:text-4xl font-black tracking-tight ${primary ? 'text-white' : 'text-[#e9edef]'}`}>
          {value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
