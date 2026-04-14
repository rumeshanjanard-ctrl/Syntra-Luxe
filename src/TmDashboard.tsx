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
  }, []);

  useEffect(() => {
    if (!userEmail) return;

    const tmName = userEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
    const formattedName = tmName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const channel = supabase.channel('online-users');

    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_email: userEmail,
            name: formattedName,
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
      const channel = supabase.channel('online-users');
      await channel.untrack();
      supabase.removeChannel(channel);
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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 flex items-center justify-center shadow-sm border border-indigo-800/50 shrink-0">
            <span className="text-transparent bg-clip-text bg-gradient-to-tr from-amber-200 via-fuchsia-400 to-cyan-300 font-black text-lg italic" style={{ fontFamily: 'serif' }}>S</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Syntra Luxe</h1>
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
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 h-full flex flex-col relative overflow-hidden w-full max-w-[420px] md:max-w-none mx-auto">
          
          {/* Mobile Top Header */}
          <header className="md:hidden pt-12 pb-4 px-6 flex items-center justify-between z-10 shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 flex items-center justify-center shadow-lg border border-indigo-800/50 shrink-0">
                <span className="text-transparent bg-clip-text bg-gradient-to-tr from-amber-200 via-fuchsia-400 to-cyan-300 font-black text-2xl italic" style={{ fontFamily: 'serif' }}>S</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Syntra Luxe</h1>
            </div>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors active:scale-95 duration-200"
            >
              <LogOut size={18} />
            </button>
          </header>

          {/* Content Canvas */}
          <div className="flex-1 bg-white overflow-hidden flex flex-col relative">
            <div className="flex-1 px-6 md:px-10 pb-28 md:pb-10 overflow-y-auto hide-scrollbar pt-2 md:pt-10">
              <div className="max-w-4xl mx-auto w-full">
                
                {activeTab === 'home' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Greeting Section */}
                    <div className="mb-6 flex justify-between items-center">
                      <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h2>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                        <span className="text-slate-500 font-medium text-sm mb-1">Progress</span>
                        <div className="text-3xl font-bold text-green-600 mb-1">{progressPercentage}%</div>
                        <span className="text-slate-400 text-xs">Completed</span>
                        <div className="mt-4 w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          <CheckCircle2 size={24} />
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                        <span className="text-slate-500 font-medium text-sm mb-1">Pending</span>
                        <div className="text-3xl font-bold text-slate-900 mb-1">{outlets.length - completedCount}</div>
                        <span className="text-slate-400 text-xs">Outlets</span>
                        <div className="mt-4 w-12 h-12 rounded-full bg-orange-400 flex items-center justify-center text-white">
                          <Clock size={24} />
                        </div>
                      </div>
                    </div>

                    {/* Universal Search */}
                    <div className="mb-8 relative z-20">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search size={20} className="text-slate-400" />
                      </div>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200 focus:border-slate-300 focus:bg-white transition-all outline-none" 
                        placeholder="Search by Outlet Name or IM Number..." 
                        type="text" 
                        value={homeSearchQuery}
                        onChange={(e) => setHomeSearchQuery(e.target.value)}
                      />
                      {homeSearchQuery && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto z-30">
                          {filteredHomeOutlets.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">No outlets found.</div>
                          ) : (
                            filteredHomeOutlets.map(outlet => (
                              <div 
                                key={outlet.id}
                                className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                                onClick={() => navigate('/sku-entry', { state: { outlet } })}
                              >
                                <div>
                                  <h4 className="font-bold text-slate-900 text-sm">{outlet.outlet_name}</h4>
                                  <p className="text-xs text-slate-500">{outlet.im_code}</p>
                                </div>
                                <ChevronRight size={16} className="text-slate-400" />
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="mb-8">
                      <div className="grid grid-cols-3 gap-4">
                        <button 
                          onClick={() => navigate('/stock-request')}
                          className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 group"
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 group-hover:scale-110 transition-transform">
                            <PackagePlus size={20} strokeWidth={2} />
                          </div>
                          <span className="text-xs font-medium text-slate-600 text-center">Request</span>
                        </button>
                        <button 
                          onClick={() => {
                            const recentSection = document.getElementById('recent-entries-section');
                            if (recentSection) {
                              recentSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 group"
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 group-hover:scale-110 transition-transform">
                            <History size={20} strokeWidth={2} />
                          </div>
                          <span className="text-xs font-medium text-slate-600 text-center">History</span>
                        </button>
                        <button 
                          onClick={() => setActiveTab('entries')}
                          className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 group"
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 group-hover:scale-110 transition-transform">
                            <List size={20} strokeWidth={2} />
                          </div>
                          <span className="text-xs font-medium text-slate-600 text-center">Outlets</span>
                        </button>
                      </div>
                    </div>

                    {/* Recent Entries Section */}
                    <section id="recent-entries-section">
                      <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-xl font-bold text-slate-900">Recent</h3>
                        <button onClick={() => setActiveTab('entries')} className="text-sm font-medium text-slate-500 flex items-center gap-1">
                          See all <ChevronRight size={16} />
                        </button>
                      </div>
                      
                      {recentOutlets.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-3xl border border-slate-100">
                          No recent entries today.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recentOutlets.map((outlet) => (
                            <div 
                              key={outlet.id}
                              className="bg-white rounded-3xl p-4 border border-slate-200 flex justify-between items-center transition-all active:scale-[0.98] cursor-pointer hover:bg-slate-50 group"
                              onClick={() => handleViewDetails(outlet)}
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                  <CheckCircle2 size={24} strokeWidth={2} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-900 text-base mb-0.5">{outlet.outlet_name}</h4>
                                  <p className="text-xs text-slate-500">{outlet.im_code}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-green-600 mb-0.5">Done</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {activeTab === 'entries' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6 flex justify-between items-center">
                      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Outlets</h2>
                      <div className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                        {filteredOutlets.length} Total
                      </div>
                    </div>

                    {/* Search Bar */}
                    <section className="mb-6">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Search size={20} className="text-slate-400" />
                        </div>
                        <input 
                          className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200 focus:border-slate-300 focus:bg-white transition-all outline-none" 
                          placeholder="Search outlet name or code..." 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </section>

                    {/* Outlet List Section */}
                    <section>
                      <div className="space-y-3">
                        {loading ? (
                          <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-3xl border border-slate-100">Loading outlets...</div>
                        ) : filteredOutlets.length === 0 ? (
                          <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-3xl border border-slate-100">No outlets found.</div>
                        ) : (
                          filteredOutlets.map((outlet) => {
                            const isCompleted = completedOutletIds.has(outlet.id);
                            return (
                              <div 
                                key={outlet.id}
                                className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-col gap-3 transition-all active:scale-[0.98] cursor-pointer hover:bg-slate-50"
                                onClick={() => navigate('/sku-entry', { state: { outlet } })}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
                                      {isCompleted ? <CheckCircle2 size={24} strokeWidth={2} /> : <Clock size={24} strokeWidth={2} />}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-900 text-base mb-0.5">{outlet.outlet_name}</h4>
                                      <p className="text-xs text-slate-500">{outlet.im_code}</p>
                                    </div>
                                  </div>
                                  <ChevronRight size={20} className="text-slate-400" />
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
                  <section className="flex flex-col items-center justify-center h-full pt-32 animate-in fade-in duration-500">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                      <RefreshCw size={32} className="text-slate-800 animate-[spin_3s_linear_infinite]" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Syncing Data</h3>
                    <p className="text-sm text-slate-500 text-center px-8 leading-relaxed">
                      Please wait while we sync your offline entries with the server. Ensure you have a stable connection.
                    </p>
                  </section>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Bottom Navigation Bar (Mobile Only) */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe">
            <nav className="flex justify-around items-center px-6 py-3">
              <button 
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'home' ? 'text-slate-900' : 'text-slate-400'}`}
              >
                <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Home</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('entries')}
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'entries' ? 'text-slate-900' : 'text-slate-400'}`}
              >
                <List size={24} strokeWidth={activeTab === 'entries' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Outlets</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('sync')}
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'sync' ? 'text-slate-900' : 'text-slate-400'}`}
              >
                <RefreshCw size={24} strokeWidth={activeTab === 'sync' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Sync</span>
              </button>
            </nav>
          </div>

          {/* View Details Modal / Bottom Sheet */}
          {selectedRecentOutlet && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-[420px] md:max-w-lg rounded-t-[2.5rem] md:rounded-3xl md:mb-10 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full md:zoom-in-95 duration-300">
                <div className="flex justify-center pt-4 pb-2 md:hidden">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>
                <div className="px-8 pb-4 pt-2 md:pt-8 flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedRecentOutlet.outlet_name}</h3>
                    <p className="text-sm font-medium text-slate-500">{selectedRecentOutlet.im_code}</p>
                  </div>
                  <button onClick={() => setSelectedRecentOutlet(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-8 pb-6 hide-scrollbar">
                  {loadingDetails ? (
                    <div className="text-center py-8 text-slate-500 text-sm">Loading details...</div>
                  ) : recentStockDetails.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">No stock entries found.</div>
                  ) : (
                    <div className="space-y-3 mt-2">
                      {recentStockDetails.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-4 rounded-3xl border border-slate-200 bg-white">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{entry.sub_brand}</div>
                            <div className="text-xs text-slate-500">{entry.main_brand}</div>
                          </div>
                          <div className="text-slate-900 font-bold text-xl">
                            {entry.stock_count}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-6 md:rounded-b-3xl">
                  <button 
                    onClick={() => {
                      navigate('/sku-entry', { state: { outlet: selectedRecentOutlet } });
                    }}
                    className="w-full py-4 bg-slate-900 text-white rounded-full font-bold text-base hover:bg-slate-800 active:scale-95 transition-all"
                  >
                    Edit Stock
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
