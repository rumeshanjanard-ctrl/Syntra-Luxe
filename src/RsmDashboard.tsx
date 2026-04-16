import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Outlet } from './lib/supabase';

export default function RsmDashboard() {
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [filteredOutlets, setFilteredOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  const [filters, setFilters] = useState({
    tm_name: 'All Managers',
    market: 'All Markets',
    channel: 'All Channels'
  });

  const [activeMenu, setActiveMenu] = useState('Overview');
  const [coverageData, setCoverageData] = useState<{ percentage: number; unvisitedOutlets: (Outlet & { lastVisited?: string })[] }>({ percentage: 0, unvisitedOutlets: [] });
  const [loadingCoverage, setLoadingCoverage] = useState(false);

  useEffect(() => {
    const fetchOutlets = async () => {
      const userStr = localStorage.getItem('currentUser');
      const user = userStr ? JSON.parse(userStr) : { email: '' };
      setUserEmail(user.email);

      const { data, error } = await supabase.from('outlets').select('*');
      if (data) {
        setOutlets(data);
        setFilteredOutlets(data);
      } else if (error) {
        console.error("Error fetching outlets:", error);
      }
      setLoading(false);
    };

    fetchOutlets();
  }, []);

  useEffect(() => {
    let result = outlets;
    if (filters.tm_name !== 'All Managers') {
      result = result.filter(o => o.tm_name === filters.tm_name);
    }
    if (filters.market !== 'All Markets') {
      result = result.filter(o => o.market === filters.market);
    }
    if (filters.channel !== 'All Channels') {
      result = result.filter(o => o.channel === filters.channel);
    }
    setFilteredOutlets(result);
  }, [filters, outlets]);

  const uniqueTMs = ['All Managers', ...Array.from(new Set(outlets.map(o => o.tm_name).filter(Boolean)))];
  const uniqueMarkets = ['All Markets', ...Array.from(new Set(outlets.map(o => o.market).filter(Boolean)))];
  const uniqueChannels = ['All Channels', ...Array.from(new Set(outlets.map(o => o.channel).filter(Boolean)))];

  useEffect(() => {
    const fetchCoverage = async () => {
      if (activeMenu !== 'Coverage' || filteredOutlets.length === 0) return;
      
      setLoadingCoverage(true);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const outletIds = filteredOutlets.map(o => o.id);

      // Fetch stock entries just to calculate coverage
      const { data: allEntries } = await supabase
        .from('stock_entries')
        .select('outlet_id, updated_at');
        
      const todayEntries = (allEntries || []).filter(e => new Date(e.updated_at) >= startOfToday);
      const visitedOutletIds = new Set(todayEntries.map(e => e.outlet_id));
      
      const unvisited = filteredOutlets.filter(o => !visitedOutletIds.has(o.id));
      const percentage = Math.round(((filteredOutlets.length - unvisited.length) / filteredOutlets.length) * 100) || 0;

      const lastVisitedMap = new Map<string, string>();
      if (allEntries) {
        allEntries.forEach(entry => {
          const current = lastVisitedMap.get(entry.outlet_id);
          if (!current || new Date(entry.updated_at) > new Date(current)) {
            lastVisitedMap.set(entry.outlet_id, entry.updated_at);
          }
        });
      }

      setCoverageData({
        percentage,
        unvisitedOutlets: unvisited.map(o => ({ ...o, lastVisited: lastVisitedMap.get(o.id) }))
      });
      
      setLoadingCoverage(false);
    };

    fetchCoverage();
  }, [activeMenu, filteredOutlets]);

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
    <div className="bg-[#f8f9fc] text-slate-900 min-h-screen flex font-sans">
      {/* Navigation Drawer (Sidebar) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-full fixed left-0 top-0 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="px-8 py-6 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 flex items-center justify-center shadow-sm border border-indigo-800/50 shrink-0">
            <span className="text-transparent bg-clip-text bg-gradient-to-tr from-amber-200 via-fuchsia-400 to-cyan-300 font-black text-lg italic" style={{ fontFamily: 'serif' }}>S</span>
          </div>
          <span className="text-slate-800 font-black text-xl tracking-tight">Syntra Luxe</span>
        </div>
        <nav className="flex flex-col gap-2 flex-1 px-4">
          <button 
            onClick={() => setActiveMenu('Overview')}
            className={`px-4 py-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 w-full text-left font-bold ${activeMenu === 'Overview' ? 'bg-[#f4f7fb] text-[#2b6bed] shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-sm">Overview</span>
          </button>
          
          <button 
            onClick={() => setActiveMenu('Coverage')}
            className={`px-4 py-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 w-full text-left font-bold ${activeMenu === 'Coverage' ? 'bg-[#f4f7fb] text-[#2b6bed] shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">location_on</span>
            <span className="text-sm">Today's Coverage</span>
          </button>

          <button 
            onClick={() => setActiveMenu('Stock Matrix')}
            className={`px-4 py-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 w-full text-left font-bold ${activeMenu === 'Stock Matrix' ? 'bg-[#f4f7fb] text-[#2b6bed] shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
            <span className="text-sm">Stock Matrix</span>
          </button>

          <button 
            onClick={() => setActiveMenu('OOS Alerts')}
            className={`px-4 py-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 w-full text-left font-bold ${activeMenu === 'OOS Alerts' ? 'bg-[#f4f7fb] text-[#2b6bed] shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">notification_important</span>
            <span className="text-sm">OOS Alerts</span>
          </button>

          <button 
            onClick={() => setActiveMenu('TM Performance')}
            className={`px-4 py-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 w-full text-left font-bold ${activeMenu === 'TM Performance' ? 'bg-[#f4f7fb] text-[#2b6bed] shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span className="text-sm">TM Performance</span>
          </button>
          <div className="mt-auto mb-4">
            <button className="text-slate-500 hover:text-slate-800 hover:bg-slate-50 px-4 py-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 w-full text-left font-bold">
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </nav>

        {/* User Profile at Bottom */}
        <div className="p-4 border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors m-2 rounded-2xl" onClick={handleLogout}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f4f7fb] flex items-center justify-center text-[#2b6bed] font-black text-sm border border-[#2b6bed]/10">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'R'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-slate-800 text-sm font-bold truncate">{userEmail || 'RSM User'}</p>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Regional Manager</p>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-sm">logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen w-full">
        {/* TopAppBar */}
        <header className="sticky top-0 w-full z-30 bg-white/80 backdrop-blur-xl h-20 flex items-center justify-between px-10 border-b border-slate-100">
          <div className="flex flex-col">
            <h1 className="font-black tracking-tight text-slate-800 text-2xl">Overview</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Regional Sales Manager Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f4f7fb] text-slate-600 hover:bg-slate-100 transition-colors active:scale-95 text-xs font-bold">
              <span className="material-symbols-outlined text-sm">download</span>
              Export CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2b6bed] text-white shadow-md shadow-[#2b6bed]/20 hover:bg-[#124bd8] transition-all active:scale-95 text-xs font-bold">
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh
            </button>
          </div>
        </header>

        {/* Filters Row */}
        <section className="px-10 py-6 bg-[#f8f9fc] flex items-center gap-4 overflow-x-auto hide-scrollbar">
          <div className="flex flex-col gap-2 min-w-[160px]">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Market</label>
            <select 
              className="bg-white border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#2b6bed]/20 h-12 px-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] outline-none appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
              value={filters.market}
              onChange={(e) => setFilters({ ...filters, market: e.target.value })}
            >
              {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2 min-w-[160px]">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Territory Manager</label>
            <select 
              className="bg-white border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#2b6bed]/20 h-12 px-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] outline-none appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
              value={filters.tm_name}
              onChange={(e) => setFilters({ ...filters, tm_name: e.target.value })}
            >
              {uniqueTMs.map(tm => <option key={tm} value={tm}>{tm}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2 min-w-[160px]">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Channel</label>
            <select 
              className="bg-white border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#2b6bed]/20 h-12 px-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] outline-none appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
              value={filters.channel}
              onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
            >
              {uniqueChannels.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </section>

        {/* Main Dashboard Canvas */}
        <div className="px-10 py-8 flex-1">
          {activeMenu === 'Overview' && (
            <>
              {/* KPI Grid */}
              <div className="grid grid-cols-4 gap-6 mb-10">
                {/* KPI 1 */}
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border-b-4 border-primary">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Outlets Covered</p>
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-extrabold tracking-tighter text-on-surface">{filteredOutlets.length}</span>
                    <span className="text-primary font-bold text-xs mb-2 flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1">trending_up</span>Total
                    </span>
                  </div>
                </div>

                {/* KPI 2 (Danger) */}
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border-b-4 border-error">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">OOS SKUs</p>
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-extrabold tracking-tighter text-error">42</span>
                    <span className="text-error font-bold text-xs mb-2 flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1">warning</span>High
                    </span>
                  </div>
                </div>

                {/* KPI 3 (Success) */}
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border-b-4 border-primary-container">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Fast Movers Avail.</p>
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-extrabold tracking-tighter text-primary-container">94.2%</span>
                    <span className="text-primary-container font-bold text-xs mb-2 flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1">check_circle</span>Optimum
                    </span>
                  </div>
                </div>

                {/* KPI 4 (Amber) */}
                <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border-b-4 border-tertiary">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Slow Movers Flagged</p>
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-extrabold tracking-tighter text-tertiary">186</span>
                    <span className="text-tertiary font-bold text-xs mb-2 flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1">history</span>Pending
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Area: Outlets Directory */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-on-surface">Outlets Directory</h2>
                  <button className="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline">View All</button>
                </div>

                <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                  <div className="grid grid-cols-12 bg-surface-container-low px-6 py-4">
                    <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">IM Code</div>
                    <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Outlet Name</div>
                    <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Channel / Market</div>
                    <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">TM Info</div>
                    <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Action</div>
                  </div>

                  <div className="divide-y divide-surface-container">
                    {loading ? (
                      <div className="p-8 text-center text-sm text-on-surface-variant">Loading outlets...</div>
                    ) : filteredOutlets.length === 0 ? (
                      <div className="p-8 text-center text-sm text-on-surface-variant">No outlets found matching the filters.</div>
                    ) : (
                      filteredOutlets.map((outlet) => (
                        <div key={outlet.id} className="grid grid-cols-12 px-6 py-5 items-center hover:bg-surface-bright transition-colors">
                          <div className="col-span-2">
                            <span className="px-2 py-1 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-black uppercase tracking-tighter">{outlet.im_code}</span>
                          </div>
                          <div className="col-span-3">
                            <p className="text-sm font-bold text-on-surface">{outlet.outlet_name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-medium">{outlet.field_role}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm font-medium text-on-surface">{outlet.channel}</p>
                            <p className="text-[10px] text-slate-500">{outlet.market}</p>
                          </div>
                          <div className="col-span-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                              <span className="material-symbols-outlined text-slate-500 text-sm">person</span>
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-bold text-on-surface truncate">{outlet.tm_name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{outlet.tm_email}</p>
                            </div>
                          </div>
                          <div className="col-span-2 text-right">
                            <button className="text-primary font-bold text-xs px-4 py-2 hover:bg-primary/5 rounded-lg transition-colors">View Details</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeMenu === 'Coverage' && (
            <div className="flex flex-col gap-6">
              {/* Coverage Summary Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm flex items-center justify-between border-l-4 border-[#2b6bed]">
                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Today's Coverage</h2>
                  <div className="flex items-end gap-4">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{coverageData.percentage}%</span>
                    <span className="text-sm font-semibold text-slate-500 mb-1">
                      ({filteredOutlets.length - coverageData.unvisitedOutlets.length} of {filteredOutlets.length} Outlets Visited)
                    </span>
                  </div>
                </div>
                <div className="w-24 h-24 rounded-full border-8 border-slate-100 flex items-center justify-center relative">
                  <div 
                    className="absolute inset-0 rounded-full border-8 border-[#2b6bed]"
                    style={{ clipPath: `polygon(0 0, 100% 0, 100% ${coverageData.percentage}%, 0 ${coverageData.percentage}%)` }} 
                  ></div>
                  <span className="material-symbols-outlined text-3xl text-slate-300">location_on</span>
                </div>
              </div>

              {/* Red List */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-6 bg-red-500 rounded-full"></div>
                  <h3 className="text-xl font-bold text-slate-900">The Red List <span className="text-sm font-medium text-slate-500 ml-2">({coverageData.unvisitedOutlets.length} Pending)</span></h3>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-red-100">
                  <div className="grid grid-cols-12 bg-red-50 px-6 py-4 border-b border-red-100">
                    <div className="col-span-5 text-[10px] font-bold uppercase tracking-widest text-red-900">Outlet Name</div>
                    <div className="col-span-4 text-[10px] font-bold uppercase tracking-widest text-red-900">Area / Route</div>
                    <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-red-900 text-right">Last Visited</div>
                  </div>

                  <div className="divide-y divide-red-50">
                    {loadingCoverage ? (
                      <div className="p-8 text-center text-sm text-slate-500">Calculating coverage...</div>
                    ) : coverageData.unvisitedOutlets.length === 0 ? (
                      <div className="p-8 text-center text-sm text-green-600 font-bold bg-green-50">All selected outlets have been visited today!</div>
                    ) : (
                      coverageData.unvisitedOutlets.map((outlet) => (
                        <div key={outlet.id} className="grid grid-cols-12 px-6 py-5 items-center hover:bg-red-50/50 transition-colors">
                          <div className="col-span-5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {outlet.outlet_name.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-bold text-slate-900 truncate">{outlet.outlet_name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{outlet.im_code}</p>
                            </div>
                          </div>
                          <div className="col-span-4">
                            <p className="text-sm font-semibold text-slate-700">{outlet.market}</p>
                            <p className="text-xs text-slate-500">{outlet.channel}</p>
                          </div>
                          <div className="col-span-3 text-right">
                            {outlet.lastVisited ? (
                              <p className="text-sm font-medium text-slate-700">{new Date(outlet.lastVisited).toLocaleDateString()}</p>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">Never</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu !== 'Overview' && activeMenu !== 'Coverage' && (
            <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">construction</span>
                <h3 className="text-lg font-bold text-slate-800">Module under development</h3>
                <p className="text-sm text-slate-500">This section will be available soon.</p>
              </div>
            </div>
          )}

          {/* Bottom Note */}
          <footer className="mt-12 py-6 flex items-center justify-between border-t border-slate-200">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Syntra Luxe v2.4.0 — Financial Architect View</p>
            <div className="flex gap-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase cursor-pointer hover:text-slate-600">Privacy Policy</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase cursor-pointer hover:text-slate-600">Terms of Service</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

