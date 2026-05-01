import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Outlet } from './lib/supabase';
import { Home, FileText, RefreshCw, LogOut, ChevronRight, ChevronLeft, Search, CheckCircle2, Clock, MapPin, Bell, History, List, X, Zap, Calendar, Store, Target, Camera, ImagePlus, Plus } from 'lucide-react';
import { useSupabasePresence } from './hooks/useSupabasePresence';

export default function TmDashboard() {
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [recentOutlets, setRecentOutlets] = useState<Outlet[]>([]);
  const [completedOutletIds, setCompletedOutletIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'entries' | 'sync' | 'competitor'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [showCompetitorForm, setShowCompetitorForm] = useState(false);
  const [compName, setCompName] = useState('');
  const [compSku, setCompSku] = useState('');
  const [compImage, setCompImage] = useState<string | null>(null);

  const handleCompImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { greeting, currentMonthYear, calendarDays } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    let greeting = 'Good morning!';
    if (hour >= 18) greeting = 'Good evening!';
    else if (hour >= 12) greeting = 'Good afternoon!';

    const currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const days = [];
    const dayNames = ['S','M','T','W','T','F','S'];
    for(let i = -3; i <= 3; i++) {
       const d = new Date(now);
       d.setDate(now.getDate() + i);
       days.push({
         dayStr: dayNames[d.getDay()],
         date: d.getDate(),
         isToday: i === 0
       });
    }
    return { greeting, currentMonthYear, calendarDays: days };
  }, []);

  const tmNameTemp = userEmail ? userEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ') : '';
  const formattedNameTemp = tmNameTemp.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const { onlineUsers } = useSupabasePresence(userEmail, formattedNameTemp, 'TM');

  // Modal State
  const [selectedRecentOutlet, setSelectedRecentOutlet] = useState<Outlet | null>(null);
  const [recentStockDetails, setRecentStockDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchOutlets = React.useCallback(async () => {
    const userStr = localStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : { email: '' };
    setUserEmail(user.email);

    if (user.email) {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('tm_email', user.email)
        .limit(10000);
      
      if (error) {
        if (error.message.includes('refresh_token_not_found') || error.message.includes('Refresh Token Not Found')) {
          await supabase.auth.signOut().catch(() => {});
          localStorage.removeItem('currentUser');
          navigate('/');
          return;
        }
        console.error("Error fetching outlets:", error);
      }
      
      if (data) {
        setOutlets(data);
        
        const outletIds = data.map(o => o.id);
        if (outletIds.length > 0) {
          // Get today's start time
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          // Fetch today's entries to calculate completed count
          const { data: todayEntries, error: todayError } = await supabase
            .from('stock_entries')
            .select('outlet_id')
            .in('outlet_id', outletIds)
            .gte('updated_at', startOfToday.toISOString());

          if (todayError) console.error("Error fetching today entries:", todayError);

          if (todayEntries) {
            const completedIds = new Set(todayEntries.map(e => e.outlet_id));
            setCompletedOutletIds(completedIds);
          }

          // Fetch recent stock entries for the list
          const { data: stockData, error: stockError } = await supabase
            .from('stock_entries')
            .select('outlet_id, updated_at')
            .in('outlet_id', outletIds)
            .order('updated_at', { ascending: false })
            .limit(500); // Increased significantly to find unique outlets among many SKU entries

          if (stockError) console.error("Error fetching recent stock data:", stockError);

          if (stockData) {
            // Get unique outlet IDs by taking the first occurrence (latest due to order)
            const uniqueRecentIds: string[] = [];
            const seen = new Set<string>();
            
            for (const item of stockData) {
              if (!seen.has(item.outlet_id)) {
                seen.add(item.outlet_id);
                uniqueRecentIds.push(item.outlet_id);
                if (uniqueRecentIds.length >= 10) break;
              }
            }
            
            const recent = uniqueRecentIds.map(id => data.find(o => o.id === id)).filter(Boolean) as Outlet[];
            setRecentOutlets(recent);
          }
        }
      }
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    fetchOutlets();

    // Subscribe to stock_entries for real-time updates
    const stockChannel = supabase.channel('tm-stock-updates-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'stock_entries' 
      }, (payload) => {
        console.log("Real-time update received:", payload);
        // Re-fetch progress and recent outlets when entries change
        fetchOutlets();
      })
      .subscribe((status) => {
        console.log("Stock channel status:", status);
      });

    return () => {
      supabase.removeChannel(stockChannel);
    };
  }, [fetchOutlets]);



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
            <button onClick={() => { setActiveTab('home'); setTimeout(() => document.getElementById('recent-entries-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900`}>
              <History size={20} /> Recent Entries
            </button>
            <button onClick={() => setActiveTab('entries')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors ${activeTab === 'entries' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <List size={20} /> Outlet List
            </button>
            <button onClick={() => setActiveTab('competitor')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors ${activeTab === 'competitor' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Target size={20} /> Competitor Track
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
        <main className="flex-1 h-full flex flex-col relative overflow-hidden w-full max-w-[420px] md:max-w-none mx-auto bg-white md:bg-[#f4f6f9]">
          
          {/* Content Canvas */}
          <div className="flex-1 overflow-hidden flex flex-col relative w-full bg-[#f8f9fa] z-10 rounded-b-[2rem] md:rounded-none">
            <div className="flex-1 px-5 overflow-y-auto pb-24 hide-scrollbar">
              <div className="max-w-4xl mx-auto w-full">
                
                {activeTab === 'home' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    
                    <header className="pt-10 pb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {formattedName.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[11px] text-slate-500 font-medium">{greeting}</span>
                           <span className="text-[14px] font-bold text-slate-900">{formattedName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                         <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-800 shadow-[0_2px_10px_rgb(0,0,0,0.03)]"><Calendar size={16} strokeWidth={2.5}/></button>
                         <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-800 shadow-[0_2px_10px_rgb(0,0,0,0.03)] relative"><Bell size={16} strokeWidth={2.5}/><span className="absolute top-2.5 right-2 w-2 h-2 bg-green-400 border-2 border-white rounded-full"></span></button>
                      </div>
                    </header>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white rounded-[24px] p-5 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50">
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-[13px] font-semibold text-slate-700 leading-tight">Total<br/>Outlets</span>
                        </div>
                        <span className="text-2xl font-bold text-slate-800">{outlets.length}</span>
                      </div>
                      <div className="bg-white rounded-[24px] p-5 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50">
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-[13px] font-semibold text-slate-700 leading-tight">Visited<br/>Today</span>
                        </div>
                        <span className="text-2xl font-bold text-slate-800">{completedCount}</span>
                      </div>
                    </div>

                    {/* Quick Actions Title */}
                    <div className="mb-4 flex items-center justify-between mt-2">
                       <h3 className="text-[16px] font-bold text-slate-800">{currentMonthYear}</h3>
                       <div className="flex items-center gap-2">
                           <button className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><ChevronLeft size={16}/></button>
                           <button className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><ChevronRight size={16}/></button>
                       </div>
                    </div>

                    {/* Dynamic Calendar Row */}
                    <div className="grid grid-cols-7 gap-1 mb-8 px-1">
                      {calendarDays.map((day, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-400">{day.dayStr}</span>
                          <div className={`w-8 h-8 rounded-full flex flex-col items-center justify-center text-[13px] font-semibold ${day.isToday ? 'bg-[#cbf08b] text-[#4d7c0f]' : 'text-slate-700'}`}>
                            {day.date < 10 ? `0${day.date}` : day.date}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recent Entries */}
                    <div className="space-y-4" id="recent-entries-section">
                       {/* Universal Search styling like list items */}
                       <div className="relative z-20 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50 flex items-center p-2 mb-4">
                         <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 ml-2 shrink-0">
                           <Search size={18} />
                         </div>
                         <div className="flex-1 ml-4 pr-4 py-1">
                            <input 
                              className="w-full bg-transparent border-none text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-0 outline-none p-0 h-6" 
                              placeholder="Search outlet..." 
                              value={homeSearchQuery}
                              onChange={(e) => setHomeSearchQuery(e.target.value)}
                            />
                         </div>
                         {homeSearchQuery && filteredHomeOutlets.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100 p-2 z-30 divide-y divide-slate-50 animate-in fade-in slide-in-from-top-1 duration-200">
                               {filteredHomeOutlets.map(outlet => (
                                 <div 
                                    key={outlet.id}
                                    className="p-3 hover:bg-slate-50 rounded-2xl cursor-pointer flex justify-between items-center transition-colors"
                                    onClick={() => navigate('/sku-entry', { state: { outlet } })}
                                 >
                                   <div>
                                     <h4 className="font-semibold text-slate-800 text-[13px]">{outlet.outlet_name}</h4>
                                     <p className="text-[11px] text-slate-400 mt-0.5">{outlet.im_code}</p>
                                   </div>
                                   <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                     <ChevronRight size={16} />
                                   </div>
                                 </div>
                               ))}
                            </div>
                         )}
                         {homeSearchQuery && filteredHomeOutlets.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100 p-4 text-center text-xs text-slate-400 z-30">
                              No matching outlets.
                            </div>
                         )}
                       </div>

                       {recentOutlets.length === 0 && (
                         <div className="text-center py-6 text-sm text-slate-400 font-medium">No recent entries found.</div>
                       )}

                       {recentOutlets.map((outlet, idx) => (
                         <div 
                            key={outlet.id}
                            className="bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50 p-3 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
                            onClick={() => handleViewDetails(outlet)}
                         >
                           <div className="flex items-center gap-4 truncate">
                             <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl shadow-sm border border-slate-100 shrink-0">
                               <Store size={22} className="text-slate-400" />
                             </div>
                             <div className="truncate">
                               <h4 className="font-semibold text-slate-800 text-[15px] truncate">{outlet.outlet_name}</h4>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-[11px] font-medium text-[#f97316] flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded-md">
                                    <Zap size={10} className="fill-current" /> 
                                    {outlet.im_code}
                                 </span>
                               </div>
                             </div>
                           </div>
                           <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 bg-white shadow-sm border border-slate-100 shrink-0 ml-2">
                              +
                           </div>
                         </div>
                       ))}
                    </div>

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
                                className={`bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-3 flex items-center justify-between cursor-pointer active:scale-95 transition-transform relative overflow-hidden ${isCompleted ? 'border border-[#10b981]/20' : 'border border-slate-50'}`}
                                onClick={() => navigate('/sku-entry', { state: { outlet } })}
                              >
                                {isCompleted && <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]"></div>}
                                <div className="flex items-center gap-4 truncate pl-1">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm border shrink-0 ${isCompleted ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    <Store size={22} className={isCompleted ? "text-[#10b981]" : "text-slate-400"} />
                                  </div>
                                  <div className="truncate">
                                    <h4 className="font-semibold text-slate-800 text-[15px] truncate mb-0.5">{outlet.outlet_name}</h4>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-medium text-[#f97316] flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded-md">
                                        <Zap size={10} className="fill-current" /> 
                                        {outlet.im_code}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm border shrink-0 ml-2 ${isCompleted ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' : 'bg-white text-slate-600 border-slate-100'}`}>
                                  {isCompleted ? <CheckCircle2 size={16} strokeWidth={2} /> : '+'}
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

                {activeTab === 'competitor' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="mb-6 flex justify-between items-end mt-2">
                       <h2 className="text-[26px] font-bold text-[#1e2a52] leading-tight max-w-[70%]">
                         Competitor<br/>Radar
                       </h2>
                       <button
                         onClick={() => setShowCompetitorForm(!showCompetitorForm)}
                         className="bg-[#cbf08b] text-[#4d7c0f] px-4 py-2 rounded-full text-sm font-bold shadow-sm flex items-center gap-2 active:scale-95 transition-transform"
                       >
                         {showCompetitorForm ? <X size={16} /> : <Plus size={16} />}
                         {showCompetitorForm ? 'Cancel' : 'Add Entry'}
                       </button>
                    </div>

                    {showCompetitorForm ? (
                      <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                         <h3 className="text-lg font-bold text-slate-800 mb-4">New Observation</h3>
                         
                         <div className="space-y-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Competitor Name</label>
                              <input 
                                type="text"
                                value={compName}
                                onChange={(e) => setCompName(e.target.value)}
                                placeholder="e.g. Brand X"
                                className="w-full bg-[#f8f9fa] border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#cbf08b] focus:border-transparent transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">SKU / Product</label>
                              <input 
                                type="text"
                                value={compSku}
                                onChange={(e) => setCompSku(e.target.value)}
                                placeholder="e.g. Energy Drink 250ml"
                                className="w-full bg-[#f8f9fa] border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#cbf08b] focus:border-transparent transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Photo Evidence</label>
                              <div className="flex gap-3">
                                <label className="flex-1 flex flex-col items-center justify-center gap-2 bg-[#f8f9fa] border-2 border-dashed border-slate-200 rounded-xl py-6 cursor-pointer hover:bg-slate-50 transition-colors">
                                  <Camera size={24} className="text-slate-400" />
                                  <span className="text-xs font-semibold text-slate-500">Capture Photo</span>
                                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCompImageChange} />
                                </label>
                                <label className="flex-1 flex flex-col items-center justify-center gap-2 bg-[#f8f9fa] border-2 border-dashed border-slate-200 rounded-xl py-6 cursor-pointer hover:bg-slate-50 transition-colors">
                                  <ImagePlus size={24} className="text-slate-400" />
                                  <span className="text-xs font-semibold text-slate-500">Upload Image</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={handleCompImageChange} />
                                </label>
                              </div>
                              {compImage && (
                                <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                                   <button 
                                     onClick={() => setCompImage(null)}
                                     className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white z-10"
                                   >
                                     <X size={16} />
                                   </button>
                                   <img src={compImage} alt="Competitor Evidence" className="w-full h-48 object-cover" />
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                alert("Competitor entry saved successfully!");
                                setShowCompetitorForm(false);
                                setCompName('');
                                setCompSku('');
                                setCompImage(null);
                              }}
                              disabled={!compName || (!compSku && !compImage)}
                              className="w-full mt-2 bg-[#1e2a52] text-white py-3.5 rounded-xl font-bold text-sm shadow-[0_8px_20px_rgba(30,42,82,0.2)] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100"
                            >
                              Submit Entry
                            </button>
                         </div>
                      </div>
                    ) : (
                      <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50 relative overflow-hidden">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 relative z-10">
                           <Target size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2 relative z-10">No Competitor Data</h3>
                        <p className="text-xs text-slate-500 max-w-[220px] relative z-10 font-medium">Record market activities, promotional materials, or new products from competitors.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Bottom Navigation Bar - Reference Style */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md pb-6 pt-3 px-6 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.06)] border border-slate-50">
            <nav className="flex justify-between items-center relative">
              <button 
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center gap-1.5 min-w-[56px] transition-colors relative ${activeTab === 'home' ? 'text-slate-800' : 'text-slate-400'}`}
              >
                <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
                <span className="text-[10px] font-semibold">Home</span>
                {activeTab === 'home' && <div className="absolute bottom-[-16px] w-[20px] h-[3px] bg-slate-800 rounded-t-lg"></div>}
              </button>
              
              <button 
                onClick={() => setActiveTab('entries')}
                className={`flex flex-col items-center gap-1.5 min-w-[56px] transition-colors relative ${activeTab === 'entries' ? 'text-slate-800' : 'text-slate-400'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'entries' ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                <span className="text-[10px] font-semibold">Progress</span>
                {activeTab === 'entries' && <div className="absolute bottom-[-16px] w-[20px] h-[3px] bg-slate-800 rounded-t-lg"></div>}
              </button>
              
              <button 
                 onClick={() => {
                   document.getElementById('recent-entries-section')?.scrollIntoView({ behavior: 'smooth' });
                   setActiveTab('home');
                 }}
                 className="flex justify-center items-center w-14 h-14 bg-[#cbf08b] rounded-full shadow-[0_8px_20px_rgba(135,215,37,0.3)] text-[#4d7c0f] transform -translate-y-5 relative border-4 border-white shrink-0 active:scale-95 transition-transform"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h3"/><path d="M20 7V4h-3"/><path d="M4 17v3h3"/><path d="M20 17v3h-3"/><rect x="9" y="9" width="6" height="6"/></svg>
              </button>

              <button 
                onClick={() => setActiveTab('competitor')}
                className={`flex flex-col items-center gap-1.5 min-w-[56px] transition-colors relative ${activeTab === 'competitor' ? 'text-slate-800' : 'text-slate-400'}`}
              >
                <Target size={22} strokeWidth={activeTab === 'competitor' ? 2.5 : 2} />
                <span className="text-[10px] font-semibold">Competitor</span>
                {activeTab === 'competitor' && <div className="absolute bottom-[-16px] w-[20px] h-[3px] bg-slate-800 rounded-t-lg"></div>}
              </button>

              <button 
                onClick={handleLogout}
                className={`flex flex-col items-center gap-1.5 min-w-[56px] text-slate-400`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                <span className="text-[10px] font-semibold">Menu</span>
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
