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
  MapPin,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  Activity,
  User,
  Clock
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

const isToday = (dateString: string) => {
  if (!dateString) return false;
  const today = new Date();
  const date = new Date(dateString);
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

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
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedTM, setSelectedTM] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTM, selectedMarket, selectedChannel, selectedCategory, selectedMainBrand, selectedDateRange, customStartDate, customEndDate, tableSearchQuery]);

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
  const [reportTM, setReportTM] = useState('All');
  const [reportMarket, setReportMarket] = useState('All');
  const [reportCategory, setReportCategory] = useState('All');

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
  const [coverageMarket, setCoverageMarket] = useState('All');
  const [coverageStatus, setCoverageStatus] = useState<'All' | 'Visited' | 'Pending'>('All');
  const [coverageSearch, setCoverageSearch] = useState('');
  const [coverageDateRange, setCoverageDateRange] = useState('Today'); // Default to Today
  const [coverageCustomStartDate, setCoverageCustomStartDate] = useState('');
  const [coverageCustomEndDate, setCoverageCustomEndDate] = useState('');

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
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const { data: outletsData, error: outletsError } = await supabase.from('outlets').select('*');
    
    if (outletsError) {
      if (outletsError.message.includes('refresh_token_not_found') || outletsError.message.includes('Refresh Token Not Found')) {
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem('currentUser');
        navigate('/');
        return;
      }
    }
    
    if (outletsData) setOutlets(outletsData);

    const { data: stockData, error: stockError } = await supabase.from('stock_entries').select('*').range(0, 10000);
    
    if (stockError && (stockError.message.includes('refresh_token_not_found') || stockError.message.includes('Refresh Token Not Found'))) {
      await supabase.auth.signOut().catch(() => {});
      localStorage.removeItem('currentUser');
      navigate('/');
      return;
    }
    
    if (stockData) setStockEntries(stockData);

    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    fetchData();

    // Subscribe to stock_entries for real-time updates
    const stockChannel = supabase.channel('admin-stock-updates-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'stock_entries' 
      }, (payload) => {
        console.log("Real-time update received admin:", payload);
        fetchData();
      })
      .subscribe((status) => {
        console.log("Admin stock channel status:", status);
      });

    return () => {
      supabase.removeChannel(stockChannel);
    };
  }, [fetchData]);

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
    
    if (coverageMarket !== 'All') {
      targetOutlets = targetOutlets.filter(o => o.market === coverageMarket);
    }
    
    const today = new Date();
    
    const filteredVisits = coverageVisits.filter(e => {
        if (coverageDateRange === 'All') return true;
        
        const visitDate = new Date(e.updated_at);
        const diffTime = Math.abs(today.getTime() - visitDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (coverageDateRange === 'Today') {
            return isToday(e.updated_at);
        } else if (coverageDateRange === 'This Week') {
            return diffDays <= 7;
        } else if (coverageDateRange === 'More than a week') {
            return diffDays > 7;
        } else if (coverageDateRange === 'Custom Date' && coverageCustomStartDate && coverageCustomEndDate) {
            const startDate = new Date(coverageCustomStartDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(coverageCustomEndDate);
            endDate.setHours(23, 59, 59, 999);
            return visitDate >= startDate && visitDate <= endDate;
        }
        return true;
    });

    const visitedInRangeIds = new Set(filteredVisits.map(e => e.outlet_id));
    
    const lastVisitedMap = new Map<string, string>();
    coverageVisits.forEach(entry => {
      const current = lastVisitedMap.get(entry.outlet_id);
      if (!current || new Date(entry.updated_at) > new Date(current)) {
        lastVisitedMap.set(entry.outlet_id, entry.updated_at);
      }
    });

    let mapped = targetOutlets.map(o => ({ 
      ...o, 
      isEverVisited: visitedInRangeIds.has(o.id),
      visitedToday: visitedInRangeIds.has(o.id),
      lastVisited: lastVisitedMap.get(o.id)
    }));

    if (coverageSearch) {
      const q = coverageSearch.toLowerCase();
      mapped = mapped.filter(o => 
        o.outlet_name?.toLowerCase().includes(q) || 
        o.im_code?.toLowerCase().includes(q)
      );
    }

    // Filter by ever visited status as requested
    let filtered = [...mapped];
    if (coverageStatus === 'Visited') {
      filtered = filtered.filter(o => o.isEverVisited);
    } else if (coverageStatus === 'Pending') {
      filtered = filtered.filter(o => !o.isEverVisited);
    }

    const needsFilter = coverageMarket === 'All';

    // Percentage logic based on today's coverage for the filtered set
    // This ensures accuracy when filtering by market
    const filteredVisitedToday = filtered.filter(o => o.visitedToday).length;
    const percentage = filtered.length > 0 
      ? Math.round((filteredVisitedToday / filtered.length) * 100) 
      : 0;

    return {
      percentage,
      totalCount: filtered.length,
      doneCount: filteredVisitedToday,
      displayOutlets: needsFilter ? [] : filtered,
      needsFilter
    };
  }, [outlets, coverageVisits, coverageMarket, coverageStatus, coverageSearch, coverageDateRange, coverageCustomStartDate, coverageCustomEndDate]);

  const handleExportCoverage = () => {
    if (coverageDisplayData.displayOutlets.length === 0) return;
    
    const csvContent = "Status,IM Code,Outlet Name,Market,Channel,Last Visited\n" + 
      coverageDisplayData.displayOutlets.map(o => 
        `"${o.isEverVisited ? 'Visited' : 'Pending'}","${o.im_code}","${o.outlet_name}","${o.market}","${o.channel}","${o.lastVisited ? new Date(o.lastVisited).toLocaleDateString() : 'Never'}"`
      ).join("\n");
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `coverage_report_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Presence Tracking
  useEffect(() => {
    if (!currentUser?.email) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUser.email.toLowerCase(),
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
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        updatePresence();
      })
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
            user_email: currentUser.email,
            name: userName,
            role: currentUser.role,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, userName]);

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
        } else if (selectedDateRange === 'Custom Date' && customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          matchDate = updatedDate >= startDate && updatedDate <= endDate;
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
  }, [stockEntries, outletMap, selectedTM, selectedMarket, selectedChannel, selectedCategory, selectedMainBrand, selectedDateRange, customStartDate, customEndDate, tableSearchQuery, searchQuery]);

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

  // Today's Global Coverage Calculation
  const todayVisitedOutletsCount = useMemo(() => {
    const todayEntries = stockEntries.filter(s => isToday(s.updated_at));
    const uniqueVisited = new Set(todayEntries.map(s => s.outlet_id));
    return uniqueVisited.size;
  }, [stockEntries]);

  const todayCoveragePercentage = outlets.length > 0 ? Math.round((todayVisitedOutletsCount / outlets.length) * 100) : 0;

  const marketCoverageData = useMemo(() => {
    const todayEntries = stockEntries.filter(s => isToday(s.updated_at));
    const visitedSet = new Set(todayEntries.map(s => s.outlet_id));
    
    const marketStats = new Map<string, { total: number, visited: number }>();
    
    outlets.forEach(o => {
      const m = o.market || 'Unknown';
      if (!marketStats.has(m)) {
        marketStats.set(m, { total: 0, visited: 0 });
      }
      const stats = marketStats.get(m)!;
      stats.total += 1;
      if (visitedSet.has(o.id)) {
        stats.visited += 1;
      }
    });

    return Array.from(marketStats.entries())
      .map(([name, stats]) => ({
        name: name.length > 10 ? name.substring(0, 10) + '...' : name,
        Visited: stats.visited,
        Pending: stats.total - stats.visited,
        total: stats.total,
        percentage: Math.round((stats.visited / Math.max(stats.total, 1)) * 100)
      }))
      .filter(item => item.total > 0)
      .sort((a,b) => b.Visited - a.Visited)
      .slice(0, 6);
  }, [stockEntries, outlets]);

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

  const tmProfiles = useMemo(() => {
    const map = new Map<string, { email: string, name: string, totalOutlets: number, visitedOutlets: Set<string>, lastSeen: Date | null }>();
    
    outlets.forEach(o => {
      if (!o.tm_email) return;
      if (!map.has(o.tm_email)) {
        map.set(o.tm_email, { email: o.tm_email, name: o.tm_name || o.tm_email.split('@')[0], totalOutlets: 0, visitedOutlets: new Set(), lastSeen: null });
      }
      map.get(o.tm_email)!.totalOutlets += 1;
    });

    const todayEntries = stockEntries.filter(s => isToday(s.updated_at));
    todayEntries.forEach(s => {
      const o = outletMap.get(s.outlet_id);
      if (o && o.tm_email && map.has(o.tm_email)) {
        map.get(o.tm_email)!.visitedOutlets.add(s.outlet_id);
      }
    });

    stockEntries.forEach(s => {
      const o = outletMap.get(s.outlet_id);
      if (o && o.tm_email && map.has(o.tm_email)) {
        const d = new Date(s.updated_at);
        const curr = map.get(o.tm_email)!.lastSeen;
        if (!curr || d > curr) {
          map.get(o.tm_email)!.lastSeen = d;
        }
      }
    });

    return Array.from(map.values()).map(tm => {
      const now = new Date();
      const isOnline = tm.lastSeen && (now.getTime() - tm.lastSeen.getTime() < 60 * 60 * 1000); // 1 hour
      return {
        ...tm,
        visitedCount: tm.visitedOutlets.size,
        coverage: tm.totalOutlets > 0 ? Math.round((tm.visitedOutlets.size / tm.totalOutlets) * 100) : 0,
        isOnline
      };
    }).sort((a, b) => b.coverage - a.coverage);
  }, [outlets, stockEntries, outletMap]);

  const recentTMActivities = useMemo(() => {
    return stockEntries.slice(0, 10).map(s => {
      const o = outletMap.get(s.outlet_id);
      return {
        id: s.id,
        tmName: o?.tm_name || o?.tm_email?.split('@')[0] || 'Unknown',
        outletName: o?.outlet_name || 'Unknown',
        date: new Date(s.updated_at),
        type: s.stock_count > 0 ? 'Stock Entry' : 'Out of Stock check'
      };
    });
  }, [stockEntries, outletMap]);

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
    link.setAttribute('download', `Reports.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportReportToCSV = () => {
    const headers = ['IM Code', 'Outlet Name', 'TM Name', 'Market', 'Category', 'Main Brand', 'Sub Brand', 'Current Stock', 'Updated At'];
    const csvData = filteredReportData.map(entry => {
      const outlet = outletMap.get(entry.outlet_id);
      return [
        outlet?.im_code || '',
        `"${outlet?.outlet_name || ''}"`,
        `"${outlet?.tm_name || ''}"`,
        outlet?.market || '',
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
    link.setAttribute('download', `Reports.csv`);
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

  const filteredReportData = useMemo(() => {
    return reportData.filter(entry => {
      const outlet = outletMap.get(entry.outlet_id);
      const matchTM = reportTM === 'All' || outlet?.tm_name === reportTM;
      const matchMarket = reportMarket === 'All' || outlet?.market === reportMarket;
      const matchCategory = reportCategory === 'All' || entry.category === reportCategory;
      return matchTM && matchMarket && matchCategory;
    });
  }, [reportData, outletMap, reportTM, reportMarket, reportCategory]);

  const totalPages = Math.ceil(managerFilteredEntries.length / itemsPerPage);
  const paginatedEntries = managerFilteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex h-screen bg-[#f0f3f6] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#f8f9fa] border-r border-slate-200 flex flex-col z-20 hidden md:flex text-[13px] text-slate-700">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 mb-2">
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-[25px]">Syntra Luxe</span>
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
                <BarChart2 className={`w-4 h-4 mr-3 ${activeMenu === 'Dashboard' ? 'text-[#2b6bed]' : 'text-slate-400'}`} />
                Dashboard
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveMenu('Coverage')}
                className={`w-full flex items-center px-4 py-1.5 rounded ${activeMenu === 'Coverage' ? 'bg-white shadow-sm font-medium text-slate-900' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <MapPin className={`w-4 h-4 mr-3 ${activeMenu === 'Coverage' ? 'text-[#2b6bed]' : 'text-slate-400'}`} />
                Coverage
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveMenu('Outlets Manager')}
                className={`w-full flex items-center px-4 py-1.5 rounded ${activeMenu === 'Outlets Manager' ? 'bg-white shadow-sm font-medium text-slate-900' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <Package className={`w-4 h-4 mr-3 ${activeMenu === 'Outlets Manager' ? 'text-[#2b6bed]' : 'text-slate-400'}`} />
                Stock Entry
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveMenu('Reports')}
                className={`w-full flex items-center justify-between px-4 py-1.5 rounded ${activeMenu === 'Reports' ? 'bg-white shadow-sm font-medium text-slate-900' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <div className="flex items-center">
                  <FileText className={`w-4 h-4 mr-3 ${activeMenu === 'Reports' ? 'text-[#2b6bed]' : 'text-slate-400'}`} />
                  Reports
                </div>
              </button>
            </li>
            {currentUser?.email === 'rumeshanjanard@gmail.com' && (
              <li>
                <button 
                  onClick={() => setActiveMenu('Tracking Directory')}
                  className={`w-full flex items-center px-4 py-1.5 rounded ${activeMenu === 'Tracking Directory' ? 'bg-white shadow-sm font-medium text-slate-900' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  <ShieldCheck className={`w-4 h-4 mr-3 ${activeMenu === 'Tracking Directory' ? 'text-[#2b6bed]' : 'text-slate-400'}`} />
                  Tracking Directory
                </button>
              </li>
            )}
          </ul>
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-slate-200 mt-auto">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogout}>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-indigo-100">
                {userName.substring(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{userName}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 truncate">{currentUser?.email}</span>
              </div>
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
                <div className="flex items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <LayoutDashboard className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                  <span className="hover:text-slate-600 transition-colors">Dashboard</span>
                  <span className="mx-2 text-slate-200">/</span>
                  <span className="text-slate-900 font-black">Overview</span>
                </div>
                <button className="p-1.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200">
                  <span className="font-bold tracking-widest leading-none">...</span>
                </button>
              </div>

              <div className="flex flex-col xl:flex-row gap-6">
                
                {/* Left: Main Content Area */}
                <div className="flex-1 min-w-0 flex flex-col gap-6">
                  
                  {/* Top Cards - Modern Minimalist Style */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150"></div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <Store className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-[13px] font-semibold text-slate-400 mb-1 relative z-10 uppercase tracking-widest">Total Outlets</h3>
                      <div className="text-3xl font-black text-slate-800 tracking-tight relative z-10">{outlets.length}</div>
                    </div>
                    
                    <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150"></div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          <MapPin className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-[13px] font-semibold text-slate-400 mb-1 relative z-10 uppercase tracking-widest">Total Markets</h3>
                      <div className="text-3xl font-black text-slate-800 tracking-tight relative z-10">{uniqueMarkets.filter(m => m !== 'All').length}</div>
                    </div>

                    <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150"></div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Package className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-[13px] font-semibold text-slate-400 mb-1 relative z-10 uppercase tracking-widest">Available Stock</h3>
                      <div className="text-3xl font-black text-slate-800 tracking-tight relative z-10">{totalStockQty}</div>
                    </div>
                  </div>

                  {/* Today's Coverage Status Component - Same design as custom request */}
                  <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col lg:flex-row gap-8">
                    {/* Left: Overall Coverage */}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-4 text-indigo-600">
                        <MapPin className="w-5 h-5" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Today's Coverage Status</h2>
                      </div>
                      
                      <div className="flex items-end gap-3 mb-4">
                        <span className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{todayCoveragePercentage}%</span>
                        <span className="text-slate-500 font-medium mb-1">Overall</span>
                      </div>
                      
                      <p className="text-sm text-slate-500 mb-8 font-medium">
                        <strong className="text-indigo-600">{todayVisitedOutletsCount}</strong> visited out of <strong className="text-slate-800">{outlets.length}</strong> total outlets today.
                      </p>

                      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-2 relative shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full relative z-10 transition-all duration-1000 ease-out" 
                          style={{ width: `${todayCoveragePercentage}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                        <span>0%</span>
                        <span>Target (100%)</span>
                      </div>
                    </div>

                    {/* Right: Visit Status by Market List */}
                    <div className="flex-1 lg:border-l lg:border-slate-100 lg:pl-10 h-[220px]">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Visit Status by Market</h3>
                      <div className="h-[180px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {marketCoverageData.map((market, idx) => (
                          <div key={idx} className="bg-white rounded-xl p-3 border border-slate-100 hover:shadow-sm hover:border-slate-200 transition-all">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 font-bold border border-slate-100 text-xs shadow-inner">
                                  {market.name.substring(0, 1)}
                                </div>
                                <h4 className="text-[13px] font-bold text-slate-800">{market.name}</h4>
                              </div>
                              <span className="text-xs font-bold text-slate-400">{market.percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${market.percentage >= 80 ? 'bg-emerald-500' : market.percentage >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                style={{ width: `${market.percentage}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              <span>Visited: <strong className="text-slate-700">{market.Visited}</strong></span>
                              <span>Target: <strong className="text-slate-700">{market.total}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Outlets by Market */}
                    <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-[13px] font-bold uppercase tracking-widest text-slate-800">Outlets by Market</h3>
                      </div>
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={marketChartData} margin={{ top: 0, right: 0, bottom: 0, left: -25 }} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <RechartsTooltip 
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                              cursor={{ fill: '#f8fafc' }}
                            />
                            <Bar dataKey="value" fill="#1e293b" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Stock by Market */}
                    <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-[13px] font-bold uppercase tracking-widest text-slate-800">Stock by Market</h3>
                      </div>
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stockByMarketData} margin={{ top: 0, right: 0, bottom: 0, left: -25 }} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <RechartsTooltip 
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                              cursor={{ fill: '#f8fafc' }}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Sidebar: TM Stats & Recent Activities */}
                <div className="w-full xl:w-[360px] shrink-0 space-y-6">
                  
                  {/* Visit Status by TM */}
                  <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-widest">Visit Status by TM</h3>
                      <button className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full text-xs font-bold">See All</button>
                    </div>
                    
                    <div className="space-y-5 h-[340px] overflow-y-auto custom-scrollbar pr-2">
                      {tmProfiles.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-4">No TM profiles found</div>
                      ) : tmProfiles.map((tm, idx) => (
                        <div key={idx} className="flex items-center gap-4 group">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 overflow-hidden">
                              {tm.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${tm.isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                              <h4 className="text-sm font-bold text-slate-800 truncate pr-2 group-hover:text-indigo-600 transition-colors">{tm.name}</h4>
                              <span className="text-xs font-bold text-slate-500 shrink-0">{tm.coverage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${tm.coverage >= 80 ? 'bg-emerald-500' : tm.coverage >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                                style={{ width: `${tm.coverage}%` }}
                              ></div>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400 flex justify-between">
                              <span>{tm.visitedCount} / {tm.totalOutlets} outlets</span>
                              <span>{tm.isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity TMs */}
                  <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-widest">Recent Activity</h3>
                    </div>
                    
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pr-2 h-[340px] overflow-y-auto custom-scrollbar">
                      {recentTMActivities.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-4 relative z-10 bg-white">No recent activities</div>
                      ) : recentTMActivities.map((activity, idx) => (
                        <div key={idx} className="relative flex items-start gap-4">
                          <div className="absolute left-0 w-6 h-6 rounded-full bg-indigo-100 border-4 border-white flex items-center justify-center shrink-0 z-10 mt-0.5">
                            <Clock className="w-3 h-3 text-indigo-600" />
                          </div>
                          <div className="pl-10 pb-2">
                            <p className="text-xs text-slate-800 leading-snug">
                              <span className="font-bold">{activity.tmName}</span> {activity.type === 'Stock Entry' ? 'updated stock at' : 'reported issue at'} <span className="font-bold text-indigo-600">{activity.outletName}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                              {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
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
                    {['All', 'Today', 'This Week', 'More than a week', 'Custom Date'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {selectedDateRange === 'Custom Date' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                      <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                      <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                    </div>
                  </>
                )}
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
                  disabled={filteredReportData.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${filteredReportData.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
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
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">TM</label>
                  <select
                    value={reportTM}
                    onChange={(e) => setReportTM(e.target.value)}
                    className="p-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    {uniqueTMs.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Market</label>
                  <select
                    value={reportMarket}
                    onChange={(e) => setReportMarket(e.target.value)}
                    className="p-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="p-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
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
                      {filteredReportData.reduce((sum, entry) => sum + (entry.sales_qty || 0), 0)}
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
                      {new Set(filteredReportData.map(entry => entry.outlet_id)).size}
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
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">Current Stock</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportLoading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-xs">Loading report data...</td>
                        </tr>
                      ) : filteredReportData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <FileText className="w-8 h-8 text-slate-300 mb-2" />
                              <p className="text-slate-500 font-medium text-xs">No records found for this period</p>
                              <p className="text-[10px] text-slate-400 mt-1">Try selecting a different date range or filters</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredReportData.map((entry) => {
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
              </div>
            </div>
          )}



          {activeMenu === 'Coverage' && (
            <div className="p-4 sm:p-5 max-w-7xl mx-auto flex flex-col gap-4">
              
              {/* Coverage Filters & Top Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Coverage</h1>
                    <p className="text-xs text-slate-500">Track outlet visits and status</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={coverageStatus} 
                    onChange={e => setCoverageStatus(e.target.value as any)} 
                    className="p-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[120px]"
                  >
                    <option value="All">All Status</option>
                    <option value="Visited">Visited</option>
                    <option value="Pending">Pending</option>
                  </select>

                  <select 
                    value={coverageMarket} 
                    onChange={e => setCoverageMarket(e.target.value)} 
                    className="p-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[140px]"
                  >
                    {uniqueMarkets.map(m => <option key={m} value={m}>{m === 'All' ? 'Select Market' : m}</option>)}
                  </select>

                  <select 
                    value={coverageDateRange} 
                    onChange={e => setCoverageDateRange(e.target.value)} 
                    className="p-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[140px]"
                  >
                    <option value="All">All Time</option>
                    <option value="Today">Today</option>
                    <option value="This Week">This Week</option>
                    <option value="More than a week">More than a week</option>
                    <option value="Custom Date">Custom Date</option>
                  </select>

                  {coverageDateRange === 'Custom Date' && (
                    <>
                      <input 
                        type="date"
                        value={coverageCustomStartDate}
                        onChange={e => setCoverageCustomStartDate(e.target.value)}
                        className="p-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <span className="text-xs text-slate-500">-</span>
                      <input 
                        type="date"
                        value={coverageCustomEndDate}
                        onChange={e => setCoverageCustomEndDate(e.target.value)}
                        className="p-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </>
                  )}

                  <button 
                    onClick={handleExportCoverage}
                    disabled={coverageDisplayData.displayOutlets.length === 0 || coverageDisplayData.needsFilter}
                    className="flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export
                  </button>
                </div>
              </div>

              {/* List Section */}
              <div className="flex flex-col gap-3 min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-5 ${coverageStatus === 'Visited' ? 'bg-green-500' : coverageStatus === 'Pending' ? 'bg-red-500' : 'bg-indigo-500'} rounded-full`}></div>
                    <h3 className="text-base font-bold text-slate-800">
                      {coverageStatus === 'Visited' ? 'Visited Outlets' : coverageStatus === 'Pending' ? 'Pending Outlets' : 'Outlet List'}
                      {!coverageDisplayData.needsFilter && (
                        <span className="text-[11px] font-medium text-slate-500 ml-2">({coverageDisplayData.displayOutlets.length})</span>
                      )}
                    </h3>
                  </div>

                  {!coverageDisplayData.needsFilter && (
                    <div className="relative max-w-xs w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Search outlets..." 
                        value={coverageSearch}
                        onChange={(e) => setCoverageSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 flex-1 flex flex-col min-h-[350px]">
                  {coverageDisplayData.needsFilter ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                        <MapPin className="w-6 h-6 text-slate-300" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">Select a Market</h4>
                      <p className="text-[11px] text-slate-500 max-w-[240px]">Please select a market from the filter above to view coverage details.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 bg-slate-50/80 px-4 py-2.5 border-b border-slate-100">
                        <div className="col-span-5 text-[10px] font-bold uppercase tracking-tight text-slate-500">Outlet Details</div>
                        <div className="col-span-2 text-[10px] font-bold uppercase tracking-tight text-slate-500">Channel</div>
                        <div className="col-span-2 text-[10px] font-bold uppercase tracking-tight text-slate-500 text-center">Status</div>
                        <div className="col-span-3 text-[10px] font-bold uppercase tracking-tight text-slate-500 text-right">Last Activity</div>
                      </div>

                      <div className="divide-y divide-slate-50 flex-1 overflow-auto custom-scrollbar">
                        {loadingCoverage ? (
                          <div className="p-8 text-center text-xs text-slate-400 animate-pulse font-medium">Loading data...</div>
                        ) : coverageDisplayData.displayOutlets.length === 0 ? (
                          <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                              <Search className="w-6 h-6 text-slate-300" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1">No outlets found</h4>
                            <p className="text-[11px] text-slate-500 italic">Try adjusting your search or filters.</p>
                          </div>
                        ) : (
                          coverageDisplayData.displayOutlets.map((outlet) => (
                            <div key={outlet.id} className="grid grid-cols-12 px-4 py-4 items-center hover:bg-slate-50/80 transition-all border-b border-transparent hover:border-slate-100">
                              <div className="col-span-5 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-[11px] shrink-0 border ${outlet.isEverVisited ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                  {outlet.outlet_name?.substring(0, 1).toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-slate-900 truncate leading-tight mb-0.5">{outlet.outlet_name}</p>
                                  <p className="text-[10px] font-medium text-slate-400 truncate tracking-wide">{outlet.im_code}</p>
                                </div>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{outlet.channel}</span>
                              </div>
                              <div className="col-span-2 text-center">
                                {outlet.isEverVisited ? (
                                  <div className="flex justify-center">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-green-700 px-3 py-1 rounded bg-green-50 border border-green-200">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div> Visited
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex justify-center">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-red-600 px-3 py-1 rounded bg-red-50 border border-red-200">
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.5)]"></div> Pending
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="col-span-3 text-right">
                                <div className="flex flex-col items-end">
                                  <p className="text-[11px] font-bold text-slate-700 font-mono tracking-tighter">
                                    {outlet.lastVisited ? new Date(outlet.lastVisited).toLocaleDateString('en-GB') : '--/--/----'}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-medium">
                                    {outlet.lastVisited ? new Date(outlet.lastVisited).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never Visited'}
                                  </p>
                                </div>
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

          {activeMenu === 'Tracking Directory' && currentUser?.email === 'rumeshanjanard@gmail.com' && (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Tracking Directory
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Enterprise</span>
                  </h1>
                  <p className="text-sm text-slate-500 font-medium">Manage personnel and real-time field tracking protocols</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Tracking Live</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-lg"><UserPlus className="w-3.5 h-3.5" /></div>
                      Provision New User
                    </h3>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={newUser.name}
                          onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                          className="w-full bg-slate-50/50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                          placeholder="e.g. Kasun Perera"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={newUser.email}
                          onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                          className="w-full bg-slate-50/50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                          placeholder="name@company.com"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Privilege Role</label>
                          <select 
                            value={newUser.role}
                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                            className="w-full bg-slate-50/50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="TM">TM</option>
                            <option value="RSM">RSM</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Assigned Market</label>
                          <select 
                            value={newUser.market}
                            onChange={e => setNewUser({ ...newUser, market: e.target.value })}
                            className="w-full bg-slate-50/50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            {uniqueMarkets.filter(m => m !== 'All').map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-black text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 mt-2"
                      >
                        Grant Access
                      </button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                          Live Signal Monitor
                        </h3>
                        <button 
                          onClick={() => window.location.reload()}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                          title="Refresh Connections"
                        >
                          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      </div>
                      
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {Object.keys(onlineUsers).length === 0 ? (
                          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                            <p className="text-[10px] font-medium text-slate-400 italic">Listening for incoming satellite signals...</p>
                          </div>
                        ) : (
                          Object.entries(onlineUsers).map(([email, presence]: [string, any]) => (
                            <div key={email} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-[10px] font-black text-indigo-600 border border-slate-100 shrink-0">
                                  {presence.role?.substring(0, 1) || '?'}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-[10px] font-black text-slate-700 leading-tight truncate">{presence.name || email}</span>
                                  <span className="text-[9px] font-bold text-slate-400 tracking-tight truncate">{email}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${presence.role === 'Admin' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                  {presence.role || 'Unknown'}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight leading-none">Status Code</span>
                          <span className="text-[10px] font-bold text-green-600 leading-none mt-1 uppercase">PULSE_ESTABLISHED</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-4 h-1 bg-indigo-500 rounded-full opacity-20"></div>
                          <div className="w-4 h-1 bg-indigo-500 rounded-full opacity-40"></div>
                          <div className="w-4 h-1 bg-indigo-500 rounded-full opacity-60"></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-4">Tracking Protocol</h4>
                      <ul className="space-y-4">
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-indigo-300">A</span>
                          </div>
                          <p className="text-[10px] text-indigo-100/80 leading-relaxed font-medium">Real-time sync via Supabase Presence encrypted channels.</p>
                        </li>
                        <li className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-indigo-300">B</span>
                          </div>
                          <p className="text-[10px] text-indigo-100/80 leading-relaxed font-medium">Auto-purge of presence data on session termination.</p>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex flex-col">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Personnel Tracking Directory</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Live field synchronization active</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                        <div className="flex items-center gap-1.5 font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          {Object.values(onlineUsers).filter((u: any) => u.role === 'TM').length} ONLINE TMs
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-lg">
                          <span className="text-[9px] font-bold text-slate-400">TOTAL PULSES: {Object.keys(onlineUsers).length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-auto custom-scrollbar max-h-[600px]">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="border-b border-slate-100">
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel Identity</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Assigned Market</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Connectivity</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status Hub</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {systemUsers.filter((u: any) => u.role === 'TM').length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center bg-slate-50/30">
                                <div className="flex flex-col items-center justify-center">
                                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                                    <Users className="w-6 h-6 text-slate-200" />
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-800 mb-1">No personnel registered</h4>
                                  <p className="text-[11px] text-slate-500 italic">Register TMs in the Provisioning section to start tracking.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            systemUsers.filter((u: any) => u.role === 'TM')
                            .sort((a, b) => {
                              const aOnline = !!onlineUsers[a.email?.toLowerCase()];
                              const bOnline = !!onlineUsers[b.email?.toLowerCase()];
                              if (aOnline && !bOnline) return -1;
                              if (!aOnline && bOnline) return 1;
                              return 0;
                            })
                            .map((user: any) => {
                              const email = user.email?.toLowerCase().trim();
                              const isOnline = onlineUsers[email];
                              const lastSeen = lastSeenUsers[email];
                              
                              return (
                                <tr key={user.id} className="hover:bg-slate-50/80 transition-all group border-b border-slate-50 last:border-0">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${isOnline ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                                          {(onlineUsers[email]?.name || user.name || 'U').substring(0, 1).toUpperCase()}
                                        </div>
                                        {isOnline && (
                                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                                        )}
                                      </div>
                                      <div className="overflow-hidden">
                                        <p className="text-xs font-black text-slate-900 truncate leading-tight mb-0.5">
                                          {onlineUsers[email]?.name || user.name}
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded uppercase tracking-tighter ring-1 ring-indigo-100">{user.role}</span>
                                          <span className="text-[10px] font-medium text-slate-400 truncate tracking-tight">{user.email}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tight">{user.market || 'General'}</span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {isOnline ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="flex gap-0.5">
                                          <div className="w-1 h-3 bg-green-500 rounded-sm animate-pulse"></div>
                                          <div className="w-1 h-3 bg-green-500/60 rounded-sm animate-pulse delay-75"></div>
                                        </div>
                                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active Pulse</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Offline</span>
                                        <span className="text-[9px] font-medium text-slate-300 italic">
                                          {lastSeen ? `Last: ${new Date(lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'No pulse recorded'}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {isOnline ? (
                                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded uppercase ring-1 ring-green-200">Live now</span>
                                    ) : (
                                      <button 
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                        onClick={() => {
                                          if (confirm('Retire personnel from system?')) {
                                            setSystemUsers(systemUsers.filter((u: any) => u.id !== user.id));
                                          }
                                        }}
                                      >
                                        <div className="p-1 px-2 border border-slate-100 rounded text-[9px] font-bold uppercase hover:bg-red-50 hover:border-red-100">Retire</div>
                                      </button>
                                    )}
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
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
