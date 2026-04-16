import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Outlet, StockSheet } from './lib/supabase';
import { 
  LayoutDashboard, 
  Store, 
  BarChart2, 
  FileText, 
  Users, 
  Search, 
  Bell, 
  Menu,
  ChevronDown,
  LogOut,
  Package,
  AlertTriangle,
  AlertCircle,
  Download,
  MapPin
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  BarChart,
  Bar,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { MapContainer, TileLayer, Marker, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const marketCoordinates: Record<string, [number, number]> = {
  'Anuradapura': [8.3114, 80.4037],
  'Colombo-15': [6.9603, 79.8739],
  'Badulla': [6.9934, 81.0550],
  'Galle': [6.0535, 80.2210],
  'Batticaloa': [7.7170, 81.6998],
  'Trincomalee': [8.5874, 81.2152],
  'Beruwala': [6.4788, 79.9831],
  'Chilaw': [7.5765, 79.7953],
  'Colombo-05': [6.8845, 79.8687],
  'Jaffna': [9.6615, 80.0255],
  'Kandy': [7.2906, 80.6337],
  'Kurunegala': [7.4833, 80.3667],
  'LB Direct-Boralesgamuwa': [6.8415, 79.9016],
  'LB Direct-Kandy': [7.2906, 80.6337],
  'Negombo': [7.2008, 79.8737],
  'NuwaraEliya': [6.9497, 80.7828],
  'Rathnapura': [6.7056, 80.3847],
  'Tangalle': [6.0240, 80.7941]
};

const redDotIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [stockEntries, setStockEntries] = useState<StockSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');

  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableSearchQuery, setTableSearchQuery] = useState('');

  // Filters for Outlets Manager
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [selectedChannel, setSelectedChannel] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMainBrand, setSelectedMainBrand] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All');
  const [selectedTM, setSelectedTM] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTM, selectedMarket, selectedChannel, selectedCategory, selectedMainBrand, selectedDateRange, tableSearchQuery]);

  // Reports State
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reportData, setReportData] = useState<StockSheet[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Presence State
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  const [lastSeenUsers, setLastSeenUsers] = useState<Record<string, string>>({});

  // Admin Control Center State
  const [markets, setMarkets] = useState<string[]>(Object.keys(marketCoordinates));
  const [systemUsers, setSystemUsers] = useState<any[]>(() => {
    const saved = localStorage.getItem('systemUsers');
    return saved ? JSON.parse(saved) : [
      { id: '1', email: 'rumeshanjanard@gmail.com', name: 'Super Admin', role: 'Admin', market: 'All' },
      { id: '2', email: 'crishmalf@lionbeer.com', name: 'Crishmalf', role: 'RSM', market: 'All' }
    ];
  });
  const [marketMappings, setMarketMappings] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('marketMappings');
    return saved ? JSON.parse(saved) : {};
  });
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'TM', market: 'Colombo-15' });
  const [masterData, setMasterData] = useState({ market: 'Colombo-15', category: 'Spirit', salesQty: '' });
  const [masterDataEntries, setMasterDataEntries] = useState<any[]>(() => {
    const saved = localStorage.getItem('masterDataEntries');
    return saved ? JSON.parse(saved) : [];
  });

  // Save Admin Control Center State
  useEffect(() => {
    localStorage.setItem('systemUsers', JSON.stringify(systemUsers));
  }, [systemUsers]);

  useEffect(() => {
    localStorage.setItem('marketMappings', JSON.stringify(marketMappings));
  }, [marketMappings]);

  useEffect(() => {
    localStorage.setItem('masterDataEntries', JSON.stringify(masterDataEntries));
  }, [masterDataEntries]);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Coverage State
  const [coverageVisits, setCoverageVisits] = useState<{outlet_id: string, updated_at: string}[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [coverageTM, setCoverageTM] = useState('All');
  const [coverageMarket, setCoverageMarket] = useState('All');
  const [coverageSearch, setCoverageSearch] = useState('');

  // Fetch user name
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        const email = user.email || user.id || '';
        if (email.includes('@')) {
          const namePart = email.split('@')[0];
          setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
        } else {
          setUserName(email);
        }
      } catch (e) {
        if (userStr.includes('@')) {
          const namePart = userStr.split('@')[0];
          setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
        } else {
          setUserName(userStr);
        }
      }
    }
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: outletsData } = await supabase.from('outlets').select('*');
      if (outletsData) setOutlets(outletsData);

      const { data: stockData } = await supabase.from('stock_entries').select('*').range(0, 10000);
      if (stockData) setStockEntries(stockData);

      setLoading(false);
    };
    fetchData();
  }, []);

  // Fetch Reports Data
  useEffect(() => {
    if (activeMenu !== 'Reports') return;
    
    const fetchReportData = async () => {
      setReportLoading(true);
      const startDateTime = `${reportStartDate}T00:00:00.000Z`;
      const endDateTime = `${reportEndDate}T23:59:59.999Z`;

      const { data } = await supabase
        .from('stock_entries')
        .select('*')
        .gte('updated_at', startDateTime)
        .lte('updated_at', endDateTime)
        .order('updated_at', { ascending: false });

      if (data) {
        setReportData(data);
      } else {
        setReportData([]);
      }
      setReportLoading(false);
    };

    fetchReportData();
  }, [activeMenu, reportStartDate, reportEndDate]);

  // Fetch Coverage Data
  useEffect(() => {
    const fetchCoverage = async () => {
      if (activeMenu !== 'Coverage' || outlets.length === 0) return;
      
      setLoadingCoverage(true);
      
      // Fetch stock entries just to calculate coverage
      const { data: allEntries } = await supabase
        .from('stock_entries')
        .select('outlet_id, updated_at');
        
      setCoverageVisits(allEntries || []);
      setLoadingCoverage(false);
    };

    fetchCoverage();
  }, [activeMenu, outlets]);

  const coverageDisplayData = useMemo(() => {
    let targetOutlets = outlets;
    
    if (coverageTM !== 'All') {
      const allowedMarkets = Object.entries(marketMappings)
        .filter(([_, email]) => email === coverageTM)
        .map(([m]) => m);
      targetOutlets = targetOutlets.filter(o => allowedMarkets.includes(o.market));
    }
    
    if (coverageMarket !== 'All') {
      targetOutlets = targetOutlets.filter(o => o.market === coverageMarket);
    }
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayEntries = coverageVisits.filter(e => new Date(e.updated_at) >= startOfToday);
    const visitedOutletIds = new Set(todayEntries.map(e => e.outlet_id));
    
    const lastVisitedMap = new Map<string, string>();
    coverageVisits.forEach(entry => {
      const current = lastVisitedMap.get(entry.outlet_id);
      if (!current || new Date(entry.updated_at) > new Date(current)) {
        lastVisitedMap.set(entry.outlet_id, entry.updated_at);
      }
    });

    let unvisited = targetOutlets.filter(o => !visitedOutletIds.has(o.id));
    
    const percentage = targetOutlets.length > 0 
      ? Math.round(((targetOutlets.length - unvisited.length) / targetOutlets.length) * 100) 
      : 0;

    if (coverageSearch) {
      const q = coverageSearch.toLowerCase();
      unvisited = unvisited.filter(o => 
        o.outlet_name?.toLowerCase().includes(q) || 
        o.im_code?.toLowerCase().includes(q)
      );
    }

    const needsFilter = coverageTM === 'All' && coverageMarket === 'All';

    return {
      percentage,
      totalTarget: targetOutlets.length,
      visitedCount: targetOutlets.length - unvisited.length,
      unvisitedOutlets: needsFilter ? [] : unvisited.map(o => ({ ...o, lastVisited: lastVisitedMap.get(o.id) })),
      needsFilter
    };
  }, [outlets, coverageVisits, coverageTM, coverageMarket, coverageSearch, marketMappings]);

  const handleExportCoverage = () => {
    if (coverageDisplayData.unvisitedOutlets.length === 0) return;
    
    const csvContent = "Outlet Name,IM Code,Market,Channel,Last Visited\n" + 
      coverageDisplayData.unvisitedOutlets.map(o => 
        `"${o.outlet_name}","${o.im_code}","${o.market}","${o.channel}","${o.lastVisited ? new Date(o.lastVisited).toLocaleDateString() : 'Never'}"`
      ).join("\n");
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pending_coverage_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Presence Tracking
  useEffect(() => {
    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users: Record<string, any> = {};
        for (const id in newState) {
          if (newState[id].length > 0) {
             const presence = newState[id][0] as any;
             if (presence.user_email) {
               users[presence.user_email] = presence;
             }
          }
        }
        setOnlineUsers(users);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (leftPresences.length > 0) {
           const presence = leftPresences[0] as any;
           if (presence.user_email) {
             setLastSeenUsers(prev => ({
               ...prev,
               [presence.user_email]: new Date().toISOString()
             }));
           }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const outletMap = useMemo(() => {
    const map = new Map<string, Outlet>();
    outlets.forEach(o => map.set(o.id, o));
    return map;
  }, [outlets]);

  // Unique values for filters
  const uniqueTMs = useMemo(() => ['All', ...Array.from(new Set(outlets.map(o => o.tm_name).filter(Boolean))).sort()], [outlets]);
  const uniqueMarkets = useMemo(() => {
    let filteredOutlets = outlets;
    if (selectedTM !== 'All') {
      filteredOutlets = outlets.filter(o => o.tm_name === selectedTM);
    }
    return ['All', ...Array.from(new Set(filteredOutlets.map(o => o.market).filter(Boolean))).sort()];
  }, [outlets, selectedTM]);
  const uniqueChannels = useMemo(() => ['All', ...Array.from(new Set(outlets.map(o => o.channel).filter(Boolean))).sort()], [outlets]);
  const uniqueCategories = useMemo(() => ['All', ...Array.from(new Set(stockEntries.map(s => s.category).filter(Boolean))).sort()], [stockEntries]);
  
  const uniqueMainBrands = useMemo(() => {
    let filteredEntries = stockEntries;
    if (selectedCategory !== 'All') {
      filteredEntries = stockEntries.filter(s => s.category === selectedCategory);
    }
    return ['All', ...Array.from(new Set(filteredEntries.map(s => s.main_brand).filter(Boolean))).sort()];
  }, [stockEntries, selectedCategory]);

  const isToday = (dateString: string) => {
    if (!dateString) return false;
    const today = new Date();
    const date = new Date(dateString);
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Global search filtering for Dashboard
  const filteredStockEntries = useMemo(() => {
    return stockEntries.filter(s => {
      const o = outletMap.get(s.outlet_id);
      let matchSearch = true;
      const query = searchQuery.toLowerCase() || tableSearchQuery.toLowerCase();
      if (query.trim() !== '') {
        const outletName = o?.outlet_name?.toLowerCase() || '';
        const imCode = o?.im_code?.toLowerCase() || '';
        matchSearch = outletName.includes(query) || imCode.includes(query);
      }
      return matchSearch;
    });
  }, [stockEntries, outletMap, searchQuery, tableSearchQuery]);

  // Detailed filtering for Outlets Manager
  const managerFilteredEntries = useMemo(() => {
    return stockEntries.filter(s => {
      const o = outletMap.get(s.outlet_id);
      if (!o) return false;

      const matchTM = selectedTM === 'All' || o.tm_name === selectedTM;
      const matchMarket = selectedMarket === 'All' || o.market === selectedMarket;
      const matchChannel = selectedChannel === 'All' || o.channel === selectedChannel;
      const matchCategory = selectedCategory === 'All' || s.category === selectedCategory;
      const matchMainBrand = selectedMainBrand === 'All' || s.main_brand === selectedMainBrand;
      
      let matchDate = true;
      if (selectedDateRange !== 'All' && s.updated_at) {
        const updatedDate = new Date(s.updated_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - updatedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (selectedDateRange === 'Today') {
          matchDate = isToday(s.updated_at);
        } else if (selectedDateRange === 'This Week') {
          matchDate = diffDays <= 7;
        } else if (selectedDateRange === 'More than a week') {
          matchDate = diffDays > 7;
        }
      }

      let matchSearch = true;
      const query = tableSearchQuery.toLowerCase() || searchQuery.toLowerCase();
      if (query.trim() !== '') {
        const outletName = o.outlet_name?.toLowerCase() || '';
        const imCode = o.im_code?.toLowerCase() || '';
        matchSearch = outletName.includes(query) || imCode.includes(query);
      }

      return matchTM && matchMarket && matchChannel && matchCategory && matchMainBrand && matchDate && matchSearch;
    });
  }, [stockEntries, outletMap, selectedTM, selectedMarket, selectedChannel, selectedCategory, selectedMainBrand, selectedDateRange, tableSearchQuery, searchQuery]);

  // KPIs
  const totalStockQty = filteredStockEntries.reduce((sum, entry) => sum + (entry.stock_count || 0), 0);
  const lowStockCount = filteredStockEntries.filter(entry => entry.stock_count < 10 && entry.stock_count > 0).length;
  const outOfStockCount = filteredStockEntries.filter(entry => entry.stock_count === 0).length;
  
  const activeTMsCount = useMemo(() => {
    const todayEntries = filteredStockEntries.filter(s => isToday(s.updated_at));
    const uniqueTMs = new Set();
    todayEntries.forEach(s => {
      const o = outletMap.get(s.outlet_id);
      if (o?.tm_name) uniqueTMs.add(o.tm_name);
    });
    return uniqueTMs.size;
  }, [filteredStockEntries, outletMap]);

  // Charts Data
  const trendData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const dataMap: Record<string, number> = {};
    last7Days.forEach(date => dataMap[date] = 0);

    filteredStockEntries.forEach(entry => {
      if (!entry.updated_at) return;
      const date = entry.updated_at.split('T')[0];
      if (dataMap[date] !== undefined) {
        dataMap[date] += (entry.stock_count || 0);
      }
    });

    return last7Days.map(date => ({
      name: date.split('-').slice(1).join('/'),
      stock: dataMap[date]
    }));
  }, [filteredStockEntries]);

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStockEntries.forEach(entry => {
      const cat = entry.category || 'Unknown';
      counts[cat] = (counts[cat] || 0) + (entry.stock_count || 0);
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredStockEntries]);

  const pieData = categoryChartData;

  const marketChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    outlets.forEach(o => {
      if (o.market) {
        counts[o.market] = (counts[o.market] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [outlets]);

  const stockByMarketData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStockEntries.forEach(entry => {
      const outlet = outletMap.get(entry.outlet_id);
      if (outlet && outlet.market) {
        counts[outlet.market] = (counts[outlet.market] || 0) + (entry.stock_count || 0);
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredStockEntries, outletMap]);

  const GREEN_COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#4ade80'];
  const COLORS = ['#2b6bed', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const getStatusBadge = (stockCount: number) => {
    if (stockCount === 0) {
      return <div className="w-2.5 h-2.5 rounded-full bg-red-500 mx-auto" title="Critical"></div>;
    } else if (stockCount <= 10) {
      return <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mx-auto" title="Low"></div>;
    } else {
      return <div className="w-2.5 h-2.5 rounded-full bg-green-500 mx-auto" title="Healthy"></div>;
    }
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

  const exportToCSV = () => {
    const headers = ['IM Code', 'Outlet Name', 'TM Name', 'Market', 'Channel', 'Category', 'Main Brand', 'Sub Brand', 'Stock Count', 'Last Updated'];
    const csvData = managerFilteredEntries.map(entry => {
      const outlet = outletMap.get(entry.outlet_id);
      return [
        outlet?.im_code || '',
        `"${outlet?.outlet_name || ''}"`,
        `"${outlet?.tm_name || ''}"`,
        outlet?.market || '',
        outlet?.channel || '',
        entry.category || '',
        `"${entry.main_brand || ''}"`,
        `"${entry.sub_brand || ''}"`,
        entry.stock_count || 0,
        entry.updated_at ? new Date(entry.updated_at).toLocaleString() : ''
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `outlet_stock_summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportReportToCSV = () => {
    const headers = ['IM Code', 'Outlet Name', 'TM Name', 'Market', 'Category', 'Main Brand', 'Sub Brand', 'Previous Stock', 'Current Stock', 'Sales Qty', 'Updated At'];
    const csvData = reportData.map(entry => {
      const outlet = outletMap.get(entry.outlet_id);
      return [
        outlet?.im_code || '',
        `"${outlet?.outlet_name || ''}"`,
        `"${outlet?.tm_name || ''}"`,
        outlet?.market || '',
        entry.category || '',
        `"${entry.main_brand || ''}"`,
        `"${entry.sub_brand || ''}"`,
        entry.previous_stock || 0,
        entry.stock_count || 0,
        entry.sales_qty || 0,
        entry.updated_at ? new Date(entry.updated_at).toLocaleString() : ''
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Format dates for filename
    const startStr = new Date(reportStartDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).replace(' ', '');
    const endStr = new Date(reportEndDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).replace(' ', '');
    
    link.setAttribute('download', `Sales_Report_${startStr}_to_${endStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin Control Center Handlers
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.name) return;
    
    const user = {
      id: Date.now().toString(),
      ...newUser
    };
    
    setSystemUsers([...systemUsers, user]);
    if (newUser.role === 'TM' && newUser.market) {
      setMarketMappings({ ...marketMappings, [newUser.market]: newUser.email });
    }
    
    setNewUser({ email: '', name: '', role: 'TM', market: 'Colombo-15' });
    alert('User added successfully!');
  };

  const handleUpdateMapping = (market: string, email: string) => {
    setMarketMappings({ ...marketMappings, [market]: email });
  };

  const handleMasterDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterData.salesQty) return;
    
    const newEntry = {
      id: Date.now().toString(),
      market: masterData.market,
      category: masterData.category,
      salesQty: parseInt(masterData.salesQty),
      date: new Date().toISOString()
    };
    
    setMasterDataEntries([newEntry, ...masterDataEntries]);
    setMasterData({ ...masterData, salesQty: '' });
    alert(`Master data saved for ${masterData.market} - ${masterData.category}: ${masterData.salesQty}`);
  };

  const totalPages = Math.ceil(managerFilteredEntries.length / itemsPerPage);
  const paginatedEntries = managerFilteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex h-screen bg-[#f0f3f6] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#f8f9fa] border-r border-slate-200 flex flex-col z-20 hidden md:flex text-[13px] text-slate-700">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 mb-2">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 leading-tight">Syntra Luxe</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 custom-scrollbar">
          <ul className="space-y-0.5">
            <li>
              <button 
                onClick={() => setActiveMenu('Dashboard')}
                className={`w-full flex items-center px-4 py-1.5 rounded ${activeMenu === 'Dashboard' ? 'bg-white shadow-sm font-medium text-slate-900' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                Dashboard
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveMenu('Coverage')}
                className={`w-full flex items-center px-4 py-1.5 rounded ${activeMenu === 'Coverage' ? 'bg-white shadow-sm font-medium text-slate-900' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                Today's Coverage
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveMenu('Outlets Manager')}
                className={`w-full flex items-center px-4 py-1.5 rounded ${activeMenu === 'Outlets Manager' ? 'bg-white shadow-sm font-medium text-slate-900' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                Stock Entry
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveMenu('Reports')}
                className={`w-full flex items-center justify-between px-4 py-1.5 rounded ${activeMenu === 'Reports' ? 'bg-white shadow-sm font-medium text-slate-900' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <div className="flex items-center">
                  Reports
                </div>
              </button>
            </li>
          </ul>
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-slate-200 mt-auto">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleLogout}>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-slate-700 truncate">{userName}</span>
              <span className="text-xs text-slate-500 truncate">{currentUser?.email}</span>
            </div>
          </div>
        </div>
      </aside>

        {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fa]">
        
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          
          {activeMenu === 'Dashboard' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
              
              {/* Breadcrumb */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center text-sm text-slate-500">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  <span>/ Dashboard /</span>
                  <span className="text-slate-900 font-medium ml-1">Overview</span>
                </div>
                <button className="p-1.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200">
                  <span className="font-bold tracking-widest leading-none">...</span>
                </button>
              </div>

              {/* Top Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[13px] font-medium text-slate-600">Total Outlets</h3>
                  </div>
                  <div className="text-2xl font-semibold text-slate-800">{outlets.length}</div>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[13px] font-medium text-slate-600">Total Markets</h3>
                  </div>
                  <div className="text-2xl font-semibold text-slate-800">{uniqueMarkets.filter(m => m !== 'All').length}</div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[13px] font-medium text-slate-600">Available Stock</h3>
                  </div>
                  <div className="text-2xl font-semibold text-slate-800">{totalStockQty}</div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Outlets by Market */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="text-[15px] font-medium text-slate-800">Outlets by Market</h3>
                    </div>
                  </div>
                  <div className="h-[300px] mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={marketChartData} margin={{ top: 5, right: 10, bottom: 25, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} angle={-45} textAnchor="end" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="value" fill="#2b6bed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stock by Market */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="text-[15px] font-medium text-slate-800">Stock by Market</h3>
                    </div>
                  </div>
                  <div className="h-[300px] mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockByMarketData} margin={{ top: 5, right: 10, bottom: 25, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} angle={-45} textAnchor="end" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'Outlets Manager' && (
            <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Outlets Manager</h2>
                  <p className="text-sm text-slate-500">Manage and filter all outlet stock details</p>
                </div>
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 shrink-0">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Outlet Name or IM Code..."
                      value={tableSearchQuery}
                      onChange={(e) => setTableSearchQuery(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                  <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setSelectedMainBrand('All'); }} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {/* Main Brand */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Main Brand</label>
                  <select value={selectedMainBrand} onChange={e => setSelectedMainBrand(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {uniqueMainBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {/* TM Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">TM Name</label>
                  <select value={selectedTM} onChange={e => { setSelectedTM(e.target.value); setSelectedMarket('All'); }} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {uniqueTMs.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                  </select>
                </div>
                {/* Market */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Market</label>
                  <select value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {/* Last Updated */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Updated</label>
                  <select value={selectedDateRange} onChange={e => setSelectedDateRange(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {['All', 'Today', 'This Week', 'More than a week'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden relative">
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                      <tr>
                        <th className="sticky left-0 z-30 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Name / IM Code</th>
                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">TM Name</th>
                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Market</th>
                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Channel</th>
                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Category</th>
                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Main Brand</th>
                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Sub Brand</th>
                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-b border-slate-200">Status</th>
                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">Stock</th>
                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading data...</td>
                        </tr>
                      ) : managerFilteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No entries found matching your filters.</td>
                        </tr>
                      ) : (
                        paginatedEntries.map((entry) => {
                          const outlet = outletMap.get(entry.outlet_id);
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-4 py-2 border-r border-slate-50 shadow-[1px_0_0_0_#f1f5f9]">
                                <div className="font-medium text-slate-800 text-sm truncate max-w-[180px]" title={outlet?.outlet_name}>{outlet?.outlet_name || '-'}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{outlet?.im_code || '-'}</div>
                              </td>
                              <td className="px-4 py-2 text-xs text-slate-600">{outlet?.tm_name || '-'}</td>
                              <td className="px-4 py-2 text-xs text-slate-600">{outlet?.market || '-'}</td>
                              <td className="px-4 py-2 text-xs text-slate-600">{outlet?.channel || '-'}</td>
                              <td className="px-4 py-2 text-xs text-slate-600">{entry.category || '-'}</td>
                              <td className="px-4 py-2 text-xs text-slate-600 font-medium">{entry.main_brand || '-'}</td>
                              <td className="px-4 py-2 text-xs text-slate-600 font-medium">{entry.sub_brand || '-'}</td>
                              <td className="px-4 py-2 text-center">
                                {getStatusBadge(entry.stock_count)}
                              </td>
                              <td className="px-4 py-2 text-xs font-bold text-slate-700 text-right">
                                {entry.stock_count}
                              </td>
                              <td className="px-4 py-2 text-[10px] text-slate-500 text-right uppercase tracking-wider">
                                {entry.updated_at ? new Date(entry.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {managerFilteredEntries.length > 0 && (
                  <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-white shrink-0">
                    <div className="text-xs text-slate-500">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, managerFilteredEntries.length)} of {managerFilteredEntries.length} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-slate-200 rounded text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Prev
                      </button>
                      <span className="text-xs font-medium text-slate-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-slate-200 rounded text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'Reports' && (
            <div className="flex flex-col h-full overflow-hidden p-4 sm:p-6 lg:p-8">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Reports</h2>
                  <p className="text-xs text-slate-500">Generate and export sales and stock reports</p>
                </div>
                <button 
                  onClick={exportReportToCSV}
                  disabled={reportData.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${reportData.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-4 flex flex-wrap items-end gap-4 shrink-0">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">From Date</label>
                  <input 
                    type="date" 
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="p-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">To Date</label>
                  <input 
                    type="date" 
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="p-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 shrink-0">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Sales</p>
                    <h4 className="text-lg font-black text-slate-800 leading-tight">
                      {reportData.reduce((sum, entry) => sum + (entry.sales_qty || 0), 0)}
                    </h4>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outlets Visited</p>
                    <h4 className="text-lg font-black text-slate-800 leading-tight">
                      {new Set(reportData.map(entry => entry.outlet_id)).size}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0 relative">
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                      <tr>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Name / IM Code</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Category</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Main Brand</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Sub Brand</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">Previous Stock</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">Current Stock</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">Sales Qty</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportLoading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-xs">Loading report data...</td>
                        </tr>
                      ) : reportData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <FileText className="w-8 h-8 text-slate-300 mb-2" />
                              <p className="text-slate-500 font-medium text-xs">No records found for this period</p>
                              <p className="text-[10px] text-slate-400 mt-1">Try selecting a different date range</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        reportData.map((entry) => {
                          const outlet = outletMap.get(entry.outlet_id);
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2">
                                <div className="font-medium text-slate-800 text-xs">{outlet?.outlet_name || '-'}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{outlet?.im_code || '-'}</div>
                              </td>
                              <td className="px-4 py-2 text-xs text-slate-600">{entry.category || '-'}</td>
                              <td className="px-4 py-2 text-xs text-slate-600 font-medium">{entry.main_brand || '-'}</td>
                              <td className="px-4 py-2 text-xs text-slate-600 font-medium">{entry.sub_brand || '-'}</td>
                              <td className="px-4 py-2 text-xs font-bold text-slate-500 text-right">
                                {entry.previous_stock || 0}
                              </td>
                              <td className="px-4 py-2 text-xs font-bold text-slate-700 text-right">
                                {entry.stock_count}
                              </td>
                              <td className="px-4 py-2 text-xs font-bold text-green-600 text-right">
                                {entry.sales_qty || 0}
                              </td>
                              <td className="px-4 py-2 text-[10px] text-slate-500 text-right uppercase tracking-wider">
                                {entry.updated_at ? new Date(entry.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'Coverage' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
              
              {/* Coverage Filters & Top Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Today's Coverage</h1>
                    <p className="text-sm text-slate-500">Track outlet visits and pending tasks</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select 
                    value={coverageTM} 
                    onChange={e => { setCoverageTM(e.target.value); setCoverageMarket('All'); }} 
                    className="p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white min-w-[150px]"
                  >
                    <option value="All">All TMs</option>
                    {systemUsers.filter(u => u.role === 'TM' || u.role === 'RSM').map(u => (
                      <option key={u.id} value={u.email}>{u.name || u.email}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={coverageMarket} 
                    onChange={e => setCoverageMarket(e.target.value)} 
                    className="p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white min-w-[150px]"
                  >
                    {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>

                  <button 
                    onClick={handleExportCoverage}
                    disabled={coverageDisplayData.unvisitedOutlets.length === 0 || coverageDisplayData.needsFilter}
                    className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Pending
                  </button>
                </div>
              </div>

              {/* Coverage Summary Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm flex items-center justify-between border-l-4 border-purple-500">
                <div>
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Coverage Completion</h2>
                  <div className="flex items-end gap-4">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{coverageDisplayData.percentage}%</span>
                    <span className="text-sm font-semibold text-slate-500 mb-1">
                      ({coverageDisplayData.visitedCount} of {coverageDisplayData.totalTarget} Selected Outlets Visited)
                    </span>
                  </div>
                </div>
                <div className="w-24 h-24 rounded-full border-8 border-slate-100 flex items-center justify-center relative">
                  <div 
                    className="absolute inset-0 rounded-full border-8 border-purple-500 transition-all duration-1000"
                    style={{ clipPath: `polygon(0 0, 100% 0, 100% ${coverageDisplayData.percentage}%, 0 ${coverageDisplayData.percentage}%)` }} 
                  ></div>
                  <MapPin className="w-8 h-8 text-slate-300" />
                </div>
              </div>

              {/* Red List */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-6 bg-red-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-slate-900">The Red List 
                      {!coverageDisplayData.needsFilter && (
                        <span className="text-sm font-medium text-slate-500 ml-2">({coverageDisplayData.unvisitedOutlets.length} Pending)</span>
                      )}
                    </h3>
                  </div>

                  {!coverageDisplayData.needsFilter && (
                    <div className="relative max-w-sm w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Search pending outlets..." 
                        value={coverageSearch}
                        onChange={(e) => setCoverageSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-red-100 min-h-[400px] flex flex-col">
                  {coverageDisplayData.needsFilter ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <MapPin className="w-8 h-8 text-slate-400" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">Filter to View Pending Outlets</h4>
                      <p className="text-sm text-slate-500 max-w-sm">Please select a Territory Manager or Market from the filters above to load the pending outlets list. Loading all outlets by default is disabled to maintain performance.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 bg-red-50 px-6 py-4 border-b border-red-100">
                        <div className="col-span-5 text-[10px] font-bold uppercase tracking-widest text-red-900">Outlet Name</div>
                        <div className="col-span-4 text-[10px] font-bold uppercase tracking-widest text-red-900">Area / Route</div>
                        <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-red-900 text-right">Last Visited</div>
                      </div>

                      <div className="divide-y divide-red-50 flex-1 overflow-auto">
                        {loadingCoverage ? (
                          <div className="p-8 text-center text-sm text-slate-500">Calculating coverage...</div>
                        ) : coverageDisplayData.unvisitedOutlets.length === 0 ? (
                          <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                              <MapPin className="w-8 h-8 text-green-500" />
                            </div>
                            <h4 className="text-lg font-bold text-green-700 mb-1">Coverage Complete!</h4>
                            <p className="text-sm text-green-600/80">All selected outlets have been visited today.</p>
                          </div>
                        ) : (
                          coverageDisplayData.unvisitedOutlets.map((outlet) => (
                            <div key={outlet.id} className="grid grid-cols-12 px-6 py-5 items-center hover:bg-red-50/50 transition-colors">
                              <div className="col-span-5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {outlet.outlet_name?.substring(0, 1).toUpperCase()}
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
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
