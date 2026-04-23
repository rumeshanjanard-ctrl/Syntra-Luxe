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
          
          {/* Mobile Top Header - Dark Blue Theme */}
          <header className="md:hidden pt-8 pb-12 px-6 flex items-center justify-between z-10 shrink-0 bg-[#1e2a52] text-white rounded-b-[2rem] relative">
            {/* Subtle background pattern/overlay for the header */}
            <div className="absolute inset-0 overflow-hidden rounded-b-[2rem] pointer-events-none opacity-10">
               <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0,0 L100,100 M100,0 L0,100" stroke="currentColor" strokeWidth="2" />
               </svg>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <h1 className="text-xl font-bold tracking-tight text-white">Syntra Luxe</h1>
            </div>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors border border-white/20 relative z-10"
            >
              <LogOut size={16} />
            </button>
          </header>

          {/* Content Canvas */}
          <div className="flex-1 bg-transparent overflow-hidden flex flex-col relative -mt-6">
            <div className="flex-1 px-5 md:px-10 pb-28 md:pb-10 overflow-y-auto hide-scrollbar pt-6 bg-[#f4f6f9] rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
              <div className="max-w-4xl mx-auto w-full">
                
                {activeTab === 'home' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    
                    {/* Header Text mapping "Where do you want to travel?" */}
                    <div className="mb-6 flex justify-between items-end mt-2">
                       <h2 className="text-[26px] font-bold text-[#1e2a52] leading-tight max-w-[70%]">
                         Your Daily<br/>Dashboard
                       </h2>
                       <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm relative shrink-0">
                          <Bell size={18} />
                          <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff6b6b] rounded-full border-2 border-white"></span>
                       </div>
                    </div>

                    {/* Universal Search - Pill matching image */}
                    <div className="mb-8 relative z-20">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                      </div>
                      <input 
                        className="w-full bg-white border-none rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#2b6bed] transition-all outline-none shadow-[0_4px_20px_rgba(0,0,0,0.03)]" 
                        placeholder="Select branch..." 
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
                                className="p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors group"
                                onClick={() => navigate('/sku-entry', { state: { outlet } })}
                              >
                                <div>
                                  <h4 className="font-bold text-[#1e2a52] text-sm group-hover:text-[#2b6bed] transition-colors">{outlet.outlet_name}</h4>
                                  <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">{outlet.im_code}</p>
                                </div>
                                <ChevronRight size={16} className="text-slate-300" />
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Action Buttons - Circular "Included" Row */}
                    <div className="mb-8">
                      <h3 className="text-lg font-bold text-[#1e2a52] mb-1">Actions</h3>
                      <p className="text-[11px] text-slate-400 mb-4 font-medium">For more details press on the icons.</p>
                      <div className="flex justify-between items-start px-2">
                        <button 
                          onClick={() => navigate('/stock-request')}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="w-14 h-14 rounded-full border-2 border-[#2b6bed]/20 bg-white flex items-center justify-center text-[#2b6bed] group-active:scale-95 transition-transform shadow-sm">
                            <PackagePlus size={24} strokeWidth={2} />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700">Request</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            const recentSection = document.getElementById('recent-entries-section');
                            if (recentSection) {
                              recentSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="w-14 h-14 rounded-full border-2 border-[#2b6bed]/20 bg-[#2b6bed] flex items-center justify-center text-white group-active:scale-95 transition-transform shadow-md shadow-[#2b6bed]/20">
                            <History size={24} strokeWidth={2} />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700">History</span>
                        </button>

                        <button 
                          onClick={() => setActiveTab('entries')}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="w-14 h-14 rounded-full border-2 border-[#2b6bed]/20 bg-white flex items-center justify-center text-[#2b6bed] group-active:scale-95 transition-transform shadow-sm">
                            <List size={24} strokeWidth={2} />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700">Outlets</span>
                        </button>

                        <button 
                           onClick={() => setActiveTab('sync')}
                           className="flex flex-col items-center gap-2 group"
                        >
                          <div className="w-14 h-14 rounded-full border-2 border-[#2b6bed]/20 bg-white flex items-center justify-center text-[#2b6bed] group-active:scale-95 transition-transform shadow-sm">
                            <RefreshCw size={24} strokeWidth={2} />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700">Sync</span>
                        </button>
                      </div>
                    </div>

                    {/* Recent Entries Section - "Gallery" style */}
                    <section id="recent-entries-section" className="pb-4">
                      <h3 className="text-lg font-bold text-[#1e2a52] mb-1">Recent History</h3>
                      <p className="text-[11px] text-slate-400 mb-4 font-medium flex justify-between">
                        <span>Sorted by recent updates</span>
                      </p>
                      
                      {recentOutlets.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-none">
                          <History size={32} className="text-slate-200 mb-3" />
                          <span className="text-sm font-semibold text-slate-400">No recent entries</span>
                        </div>
                      ) : (
                        <div className="space-y-3 pb-4">
                          {recentOutlets.map((outlet) => (
                            <div 
                              key={outlet.id}
                              className="bg-white rounded-[1.5rem] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer border border-slate-50"
                              onClick={() => handleViewDetails(outlet)}
                            >
                              <div className="flex items-center gap-4 truncate">
                                <div className="w-11 h-11 rounded-full bg-[#f8fafc] flex items-center justify-center text-[#2b6bed] border border-slate-50">
                                  <History size={18} />
                                </div>
                                <div className="truncate">
                                  <h4 className="font-bold text-[#1e2a52] text-sm leading-tight truncate">{outlet.outlet_name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-[#2b6bed] uppercase tracking-wider">{outlet.im_code}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                    <span className="text-[10px] font-medium text-slate-400">Recently Updated</span>
                                  </div>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                <ChevronRight size={18} />
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
                    <div className="mb-6 flex justify-between items-end mt-2">
                       <h2 className="text-[26px] font-bold text-[#1e2a52] leading-tight max-w-[70%]">
                         Outlet<br/>Catalog
                       </h2>
                       <div className="bg-[#eef4ff] text-[#2b6bed] px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-[#2b6bed]/10">
                         {filteredOutlets.length} Units
                       </div>
                    </div>

                    {/* Search Bar - Pill Style */}
                    <section className="mb-6">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Search size={18} className="text-slate-400" />
                        </div>
                        <input 
                          className="w-full bg-white border-none rounded-full py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#2b6bed] transition-all outline-none shadow-[0_4px_20px_rgba(0,0,0,0.03)]" 
                          placeholder="Search identifier..." 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </section>

                    {/* Outlet List Section - Sleek Cards */}
                    <section>
                      <div className="space-y-3">
                        {loading ? (
                          <div className="py-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-none">
                            <RefreshCw size={32} className="text-slate-200 mb-3 animate-spin" />
                            <span className="text-sm font-semibold text-slate-400">Scanning Directory...</span>
                          </div>
                        ) : filteredOutlets.length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-none">
                            <Search size={32} className="text-slate-200 mb-3" />
                            <span className="text-sm font-semibold text-slate-400">No Matches Found</span>
                          </div>
                        ) : (
                          filteredOutlets.map((outlet) => {
                            const isCompleted = completedOutletIds.has(outlet.id);
                            return (
                              <div 
                                key={outlet.id}
                                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-none flex flex-col gap-2 transition-all active:scale-[0.98] cursor-pointer hover:bg-slate-50 relative overflow-hidden"
                                onClick={() => navigate('/sku-entry', { state: { outlet } })}
                              >
                                {isCompleted && <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]"></div>}
                                <div className="flex justify-between items-center pl-1">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${isCompleted ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' : 'bg-[#ffb11a]/10 text-[#ffb11a] border-[#ffb11a]/20'}`}>
                                      {isCompleted ? <CheckCircle2 size={24} strokeWidth={2} /> : <Clock size={24} strokeWidth={2} />}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-[#1e2a52] text-sm mb-0.5 leading-tight">{outlet.outlet_name}</h4>
                                      <p className="text-[11px] text-slate-400 font-semibold">{outlet.im_code}</p>
                                    </div>
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                    <ChevronRight size={16} />
                                  </div>
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

          {/* Fixed Bottom Navigation Bar - Floating Pill Style */}
          <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[320px]">
            <nav className="flex justify-around items-center px-2 py-3 bg-white rounded-full shadow-[0_10px_40px_rgba(43,107,237,0.15)] mx-auto">
              <button 
                onClick={() => setActiveTab('home')}
                className={`p-3 rounded-full transition-all duration-300 ${activeTab === 'home' ? 'text-[#2b6bed] bg-[#eef4ff] scale-110' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <Home size={22} strokeWidth={2.5} />
              </button>
              
              <button 
                onClick={() => navigate('/stock-request')}
                className={`p-3 rounded-full transition-all duration-300 text-slate-300 hover:text-slate-500`}
              >
                <PackagePlus size={22} strokeWidth={2.5} />
              </button>
              
              <button 
                onClick={() => setActiveTab('entries')}
                className={`p-3 rounded-full transition-all duration-300 ${activeTab === 'entries' ? 'text-[#2b6bed] bg-[#eef4ff] scale-110' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <List size={22} strokeWidth={2.5} />
              </button>
              
              <button 
                 onClick={() => {
                   document.getElementById('recent-entries-section')?.scrollIntoView({ behavior: 'smooth' });
                   setActiveTab('home');
                 }}
                 className="p-3 rounded-full transition-all duration-300 text-slate-300 hover:text-slate-500"
              >
                <History size={22} strokeWidth={2.5} />
              </button>
            </nav>
          </div>

          {/* View Details Modal / Bottom Sheet - Refined */}
          {selectedRecentOutlet && (
            <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-[420px] md:max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] md:mb-0 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full md:zoom-in-95 duration-400 ease-out border border-slate-100">
                <div className="flex justify-center pt-4 pb-2 md:hidden">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>
                <div className="px-6 pb-4 pt-2 md:pt-8 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-[#1e2a52] leading-tight mb-1">{selectedRecentOutlet.outlet_name}</h3>
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#f8fafc] border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedRecentOutlet.im_code}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedRecentOutlet(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors shrink-0">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="px-6 pb-2">
                   <h4 className="text-sm font-bold text-[#1e2a52] mb-1">Stock Details</h4>
                   <p className="text-[11px] text-slate-400 font-medium">Recordings from the latest physical audit.</p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-4 hide-scrollbar">
                  {loadingDetails ? (
                    <div className="text-center py-12 flex flex-col items-center">
                      <RefreshCw size={28} className="text-[#2b6bed] animate-spin mb-3" />
                      <p className="text-xs font-semibold text-slate-400">Loading Data...</p>
                    </div>
                  ) : recentStockDetails.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center bg-[#f8fafc] rounded-2xl border border-slate-100 mt-2">
                       <Search size={28} className="text-slate-300 mb-3" />
                      <div className="text-xs font-semibold text-slate-400">Zero Data Captured</div>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-4">
                      {recentStockDetails.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                          <div>
                            <div className="font-bold text-[#1e2a52] text-sm leading-tight mb-0.5">{entry.sub_brand}</div>
                            <div className="text-[11px] text-slate-400 font-semibold">{entry.main_brand}</div>
                          </div>
                          <div className="text-[#2b6bed] font-black text-xl tabular-nums bg-[#eef4ff] px-3 py-1 rounded-xl">
                            {entry.stock_count}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-6 md:rounded-b-[2.5rem] bg-white border-t border-slate-50">
                  <button 
                    onClick={() => {
                      const initialCategory = recentStockDetails.length > 0 && recentStockDetails[0].category === 'Wines' ? 'Wines' : 'Diageo';
                      navigate('/sku-entry', { state: { outlet: selectedRecentOutlet, initialCategory } });
                    }}
                    className="w-full py-4 bg-[#2b6bed] text-white rounded-2xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-[0_8px_20px_rgba(43,107,237,0.25)] flex justify-center items-center gap-2"
                  >
                    Edit <ChevronRight size={16} />
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
