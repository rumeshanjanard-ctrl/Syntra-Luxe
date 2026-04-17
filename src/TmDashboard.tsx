import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Outlet } from './lib/supabase';
import { Home, FileText, RefreshCw, LogOut, ChevronRight, Search, CheckCircle2, Clock, MapPin, Bell, PackagePlus, History, List, X } from 'lucide-react';

export default function TmDashboard() {
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [recentOutlets, setRecentOutlets] = useState<Outlet[]>([]);
  const [completedOutletIds, setCompletedOutletIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'entries' | 'sync'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  // Presence State
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  const [lastSeenUsers, setLastSeenUsers] = useState<Record<string, string>>({});

  // Modal State
  const [selectedRecentOutlet, setSelectedRecentOutlet] = useState<Outlet | null>(null);
  const [recentStockDetails, setRecentStockDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchOutlets = async () => {
      const userStr = localStorage.getItem('currentUser');
      const user = userStr ? JSON.parse(userStr) : { email: '' };
      setUserEmail(user.email);

      if (user.email) {
        const { data, error } = await supabase
          .from('outlets')
          .select('*')
          .eq('tm_email', user.email)
          .limit(10000);
        
        if (data) {
          setOutlets(data);
          
          const outletIds = data.map(o => o.id);
          if (outletIds.length > 0) {
            // Get today's start time
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            // Fetch today's entries to calculate completed count
            const { data: todayEntries } = await supabase
              .from('stock_entries')
              .select('outlet_id')
              .in('outlet_id', outletIds)
              .gte('updated_at', startOfToday.toISOString());

            if (todayEntries) {
              const completedIds = new Set(todayEntries.map(e => e.outlet_id));
              setCompletedOutletIds(completedIds);
            }

            // Fetch recent stock entries for the list
            const { data: stockData } = await supabase
              .from('stock_entries')
              .select('outlet_id, updated_at')
              .in('outlet_id', outletIds)
              .order('updated_at', { ascending: false })
              .limit(50);

            if (stockData) {
              const uniqueRecentIds = Array.from(new Set(stockData.map(s => s.outlet_id))).slice(0, 5);
              const recent = uniqueRecentIds.map(id => data.find(o => o.id === id)).filter(Boolean) as Outlet[];
              setRecentOutlets(recent);
            }
          }
        } else if (error) {
          console.error("Error fetching outlets:", error);
        }
      }
      setLoading(false);
    };

    fetchOutlets();

    // Subscribe to stock_entries for real-time updates
    const stockChannel = supabase.channel('tm-stock-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'stock_entries' 
      }, () => {
        // Re-fetch progress and recent outlets when entries change
        fetchOutlets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(stockChannel);
    };
  }, []);

  useEffect(() => {
    if (!userEmail) return;

    const email = userEmail.toLowerCase();
    const tmName = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
    const formattedName = tmName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: email,
        },
      },
    });

    const updatePresence = () => {
      const newState = channel.presenceState();
      const users: Record<string, any> = {};
      for (const key in newState) {
        if (newState[key] && newState[key].length > 0) {
          const presence = newState[key][0] as any;
          if (presence.user_email) {
            users[presence.user_email.toLowerCase().trim()] = presence;
          }
        }
      }
      setOnlineUsers(users);
    };

    channel
      .on('presence', { event: 'sync' }, updatePresence)
      .on('presence', { event: 'join' }, updatePresence)
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (leftPresences.length > 0) {
          const presence = leftPresences[0] as any;
          if (presence.user_email) {
            const email = presence.user_email.toLowerCase();
            setLastSeenUsers(prev => ({
              ...prev,
              [email]: new Date().toISOString()
            }));
          }
        }
        updatePresence();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_email: email,
            name: formattedName,
            role: 'TM',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userEmail]);

  const filteredOutlets = outlets.filter(o => 
    (o.outlet_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (o.im_code?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const tmName = userEmail ? userEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ') : 'TM';
  const formattedName = tmName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const completedCount = completedOutletIds.size;
  const progressPercentage = outlets.length > 0 ? Math.round((completedCount / outlets.length) * 100) : 0;

  const filteredHomeOutlets = outlets.filter(o => 
    (o.outlet_name?.toLowerCase() || '').includes(homeSearchQuery.toLowerCase()) ||
    (o.im_code?.toLowerCase() || '').includes(homeSearchQuery.toLowerCase())
  ).slice(0, 5); // Limit to 5 results for the dropdown

  const handleViewDetails = async (outlet: Outlet) => {
    setSelectedRecentOutlet(outlet);
    setLoadingDetails(true);
    const { data, error } = await supabase
      .from('stock_entries')
      .select('*')
      .eq('outlet_id', outlet.id)
      .order('updated_at', { ascending: false });
    
    if (data) {
      setRecentStockDetails(data);
    }
    setLoadingDetails(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.removeAllChannels();
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  return (
    <div className="bg-white text-slate-900 h-[100dvh] flex flex-col font-sans overflow-hidden">
      {/* Desktop Top Bar */}
      <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Syntra Luxe</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 font-medium text-sm transition-colors">
          <LogOut size={16} /> Logout
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full z-20 shrink-0">
          <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors ${activeTab === 'home' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Home size={20} /> Home
            </button>
            <button onClick={() => navigate('/stock-request')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900`}>
              <PackagePlus size={20} /> Stock Request
            </button>
            <button onClick={() => { setActiveTab('home'); setTimeout(() => document.getElementById('recent-entries-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900`}>
              <History size={20} /> Recent Entries
            </button>
            <button onClick={() => setActiveTab('entries')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors ${activeTab === 'entries' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <List size={20} /> Outlet List
            </button>
          </nav>

          {/* Team Online Status (Desktop Sidebar) */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2 flex items-center justify-between">
              TMs Online
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            </h4>
            <div className="flex -space-x-2 overflow-hidden px-2 mb-2">
              {Object.values(onlineUsers).filter((user: any) => user.role === 'TM').length > 0 ? (
                <>
                  {Object.values(onlineUsers)
                    .filter((user: any) => user.role === 'TM')
                    .slice(0, 5)
                    .map((user: any) => (
                      <div key={user.user_email} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 uppercase" title={user.name}>
                        {user.name?.substring(0,1)}
                      </div>
                    ))}
                  {Object.values(onlineUsers).filter((user: any) => user.role === 'TM').length > 5 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 ring-2 ring-white">
                      +{Object.values(onlineUsers).filter((user: any) => user.role === 'TM').length - 5}
                    </div>
                  )}
                </>
              ) : (
                <div className="px-2 py-1 bg-slate-100 rounded-lg">
                  <span className="text-[9px] font-medium text-slate-400 italic font-sans italic">All TMs offline</span>
                </div>
              )}
            </div>
            <p className="text-[10px] font-medium text-slate-500 px-2">
              {Object.values(onlineUsers).filter((user: any) => user.role === 'TM').length} active TMs
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 h-full flex flex-col relative overflow-hidden w-full max-w-[420px] md:max-w-none mx-auto">
          
          {/* Mobile Top Header */}
          <header className="md:hidden pt-8 pb-2 px-4 flex items-center justify-between z-10 shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">Syntra Luxe</h1>
            </div>
            <button 
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors border border-slate-100"
            >
              <LogOut size={14} />
            </button>
          </header>

          {/* Content Canvas */}
          <div className="flex-1 bg-white overflow-hidden flex flex-col relative">
            <div className="flex-1 px-5 md:px-10 pb-28 md:pb-10 overflow-y-auto hide-scrollbar pt-1 md:pt-10">
              <div className="max-w-4xl mx-auto w-full">
                
                {activeTab === 'home' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    
                    <div className="mb-3 flex justify-between items-center text-slate-900">
                      <div>
                        <h2 className="text-base font-black tracking-tight uppercase leading-none mb-1">Overview</h2>
                        <p className="text-[9px] items-center gap-1 font-bold text-slate-400 uppercase tracking-widest flex">
                          <Clock size={8} /> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 relative border border-slate-100">
                        <Bell size={14} />
                        <span className="absolute top-1 right-1 w-1 h-1 bg-green-500 rounded-full border border-white"></span>
                      </div>
                    </div>

                    {/* Replacement Sleek Progress Component */}
                    <div className="mb-5 bg-slate-900 rounded-[1.5rem] p-4 shadow-xl shadow-slate-200 relative overflow-hidden group">
                      <div className="absolute right-0 top-0 w-16 h-16 bg-white/5 rounded-full blur-xl -mr-8 -mt-8"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Efficiency</span>
                            <span className="text-lg font-black text-white leading-none">{progressPercentage}%</span>
                          </div>
                          <div className="w-8 h-8 rounded-full border-2 border-white/10 flex items-center justify-center relative">
                            <svg className="w-full h-full -rotate-90">
                              <circle cx="16" cy="16" r="13" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                              <circle cx="16" cy="16" r="13" fill="transparent" stroke="white" strokeWidth="2" strokeDasharray={82} strokeDashoffset={82 - (82 * progressPercentage / 100)} strokeLinecap="round" />
                            </svg>
                            <CheckCircle2 size={12} className="absolute text-white" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Done</span>
                            <span className="text-xs font-bold text-white leading-none">{completedCount}</span>
                          </div>
                          <div className="w-px h-4 bg-white/10"></div>
                          <div className="flex flex-col">
                            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Left</span>
                            <span className="text-xs font-bold text-white leading-none">{outlets.length - completedCount}</span>
                          </div>
                          <div className="ml-auto">
                             <div className="px-1.5 py-0.5 rounded-full bg-white/10 text-white text-[7.5px] font-bold uppercase tracking-wider backdrop-blur-sm">
                               {progressPercentage === 100 ? 'Target Met' : 'Active'}
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Universal Search - Compact */}
                    <div className="mb-6 relative z-20">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400" />
                      </div>
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all outline-none shadow-sm" 
                        placeholder="Quick outlet search..." 
                        type="text" 
                        value={homeSearchQuery}
                        onChange={(e) => setHomeSearchQuery(e.target.value)}
                      />
                      {homeSearchQuery && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-50 max-h-56 overflow-y-auto z-30 divide-y divide-slate-50 animate-in fade-in slide-in-from-top-1 duration-200">
                          {filteredHomeOutlets.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">No matching outlets.</div>
                          ) : (
                            filteredHomeOutlets.map(outlet => (
                              <div 
                                key={outlet.id}
                                className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors group"
                                onClick={() => navigate('/sku-entry', { state: { outlet } })}
                              >
                                <div>
                                  <h4 className="font-bold text-slate-900 text-xs group-hover:text-fuchsia-600 transition-colors">{outlet.outlet_name}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium tracking-wide">{outlet.im_code}</p>
                                </div>
                                <ChevronRight size={14} className="text-slate-300" />
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Action Buttons - Ultra Compact */}
                    <div className="mb-5">
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => navigate('/stock-request')}
                          className="bg-white rounded-[1.25rem] p-2.5 border border-slate-100 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <PackagePlus size={14} strokeWidth={2.5} />
                          </div>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Request</span>
                        </button>
                        <button 
                          onClick={() => {
                            const recentSection = document.getElementById('recent-entries-section');
                            if (recentSection) {
                              recentSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="bg-white rounded-[1.25rem] p-2.5 border border-slate-100 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <History size={14} strokeWidth={2.5} />
                          </div>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">History</span>
                        </button>
                        <button 
                          onClick={() => setActiveTab('entries')}
                          className="bg-white rounded-[1.25rem] p-2.5 border border-slate-100 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <List size={14} strokeWidth={2.5} />
                          </div>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Outlets</span>
                        </button>
                      </div>
                    </div>

                    {/* Recent Entries Section - Compact */}
                    <section id="recent-entries-section" className="pb-4">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em]">Recently Handled</h3>
                        <button onClick={() => setActiveTab('entries')} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline uppercase tracking-tighter">
                          View Log <ChevronRight size={12} />
                        </button>
                      </div>
                      
                      {recentOutlets.length === 0 ? (
                        <div className="py-8 text-center text-[11px] font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 uppercase tracking-widest">
                          Waiting for first entry
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {recentOutlets.map((outlet) => (
                            <div 
                              key={outlet.id}
                              className="bg-white rounded-2xl p-3 border border-slate-100 flex justify-between items-center transition-all active:scale-[0.98] cursor-pointer hover:bg-slate-50 group hover:shadow-sm"
                              onClick={() => handleViewDetails(outlet)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform border border-emerald-100">
                                  <CheckCircle2 size={18} strokeWidth={2.5} />
                                </div>
                                <div className="overflow-hidden max-w-[140px] sm:max-w-none">
                                  <h4 className="font-black text-slate-900 text-[11px] mb-0.5 truncate uppercase tracking-tight">{outlet.outlet_name}</h4>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">{outlet.im_code}</p>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <div className="text-[9px] font-black text-emerald-600 mb-0.5 uppercase flex items-center gap-1">
                                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                  Verified
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {activeTab === 'entries' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="mb-4 flex justify-between items-center">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Outlet Catalog</h2>
                      <div className="bg-slate-900 text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-lg shadow-slate-100">
                        {filteredOutlets.length} Units
                      </div>
                    </div>

                    {/* Search Bar - Compact */}
                    <section className="mb-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Search size={16} className="text-slate-400" />
                        </div>
                        <input 
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all outline-none" 
                          placeholder="Search identifier..." 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </section>

                    {/* Outlet List Section - Compact */}
                    <section>
                      <div className="space-y-2">
                        {loading ? (
                          <div className="py-12 text-center text-[11px] font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 uppercase tracking-widest">
                            Scanning Directory...
                          </div>
                        ) : filteredOutlets.length === 0 ? (
                          <div className="py-12 text-center text-[11px] font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 uppercase tracking-widest">
                            No Matches Found
                          </div>
                        ) : (
                          filteredOutlets.map((outlet) => {
                            const isCompleted = completedOutletIds.has(outlet.id);
                            return (
                              <div 
                                key={outlet.id}
                                className="bg-white rounded-2xl p-3 border border-slate-100 flex flex-col gap-2 transition-all active:scale-[0.98] cursor-pointer hover:bg-slate-50 hover:shadow-sm"
                                onClick={() => navigate('/sku-entry', { state: { outlet } })}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-500 border border-orange-100'}`}>
                                      {isCompleted ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <Clock size={18} strokeWidth={2.5} />}
                                    </div>
                                    <div>
                                      <h4 className="font-black text-slate-900 text-[11px] mb-0.5 uppercase tracking-tight">{outlet.outlet_name}</h4>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{outlet.im_code}</p>
                                    </div>
                                  </div>
                                  <ChevronRight size={14} className="text-slate-300" />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'sync' && (
                  <section className="flex flex-col items-center justify-center h-full pt-24 animate-in fade-in duration-500">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100 shadow-inner">
                      <RefreshCw size={24} className="text-slate-900 animate-[spin_3s_linear_infinite]" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-1 uppercase tracking-tighter">Syncing Core Data</h3>
                    <p className="text-[10px] text-slate-400 text-center px-10 leading-relaxed font-bold uppercase tracking-wide">
                      Uploading local buffer to central vault. Maintain connection.
                    </p>
                  </section>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Bottom Navigation Bar (Mobile Only) - Ultra Compact */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-slate-100 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <nav className="flex justify-around items-center px-4 py-3">
              <button 
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'home' ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'home' ? 'bg-slate-100' : ''}`}>
                  <Home size={20} strokeWidth={activeTab === 'home' ? 3 : 2} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-tighter">Home</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('entries')}
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'entries' ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'entries' ? 'bg-slate-100' : ''}`}>
                  <List size={20} strokeWidth={activeTab === 'entries' ? 3 : 2} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-tighter">Outlets</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('sync')}
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'sync' ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'sync' ? 'bg-slate-100' : ''}`}>
                  <RefreshCw size={20} strokeWidth={activeTab === 'sync' ? 3 : 2} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-tighter">Sync</span>
              </button>
            </nav>
          </div>

          {/* View Details Modal / Bottom Sheet - Refined */}
          {selectedRecentOutlet && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-[420px] md:max-w-lg rounded-t-[2.5rem] md:rounded-3xl md:mb-10 shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-full md:zoom-in-95 duration-400 ease-out">
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                  <div className="w-10 h-1 bg-slate-100 rounded-full"></div>
                </div>
                <div className="px-6 pb-3 pt-3 md:pt-8 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{selectedRecentOutlet.outlet_name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{selectedRecentOutlet.im_code}</p>
                  </div>
                  <button onClick={() => setSelectedRecentOutlet(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-4 hide-scrollbar">
                  {loadingDetails ? (
                    <div className="text-center py-10">
                      <div className="w-6 h-6 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Analytics...</p>
                    </div>
                  ) : recentStockDetails.length === 0 ? (
                    <div className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Zero Data Captured
                    </div>
                  ) : (
                    <div className="space-y-1.5 mt-2">
                      {recentStockDetails.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 bg-slate-50/50">
                          <div>
                            <div className="font-black text-slate-900 text-[10px] uppercase tracking-tighter leading-none mb-1">{entry.sub_brand}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">{entry.main_brand}</div>
                          </div>
                          <div className="text-slate-900 font-black text-lg tabular-nums">
                            {entry.stock_count}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-5 md:rounded-b-3xl">
                  <button 
                    onClick={() => {
                      navigate('/sku-entry', { state: { outlet: selectedRecentOutlet } });
                    }}
                    className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200"
                  >
                    Adjust Analytics
                  </button>
                </div>
              </div>
            </div>
          )}


        </main>
      </div>
    </div>
  );
}
