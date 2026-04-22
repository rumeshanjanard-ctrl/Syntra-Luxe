import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Outlet, Product, supabase } from './lib/supabase';

export default function SkuEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = location.state?.outlet as Outlet | undefined;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  const [stockData, setStockData] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Diageo' | 'Wines'>('Diageo');

  useEffect(() => {
    const fetchProductsAndStock = async () => {
      setLoadingProducts(true);
      
      // Fetch all products
      const { data: productsData, error: productsError } = await supabase.from('products').select('*');
      if (productsData) {
        setProducts(productsData);
      }
      if (productsError) {
        console.error("Error fetching products:", productsError);
        alert("Error fetching products: " + productsError.message);
      }

      // Fetch existing stock for this outlet to pre-fill
      if (outlet) {
        const { data: stockEntries } = await supabase
          .from('stock_entries')
          .select('product_id, stock_count')
          .eq('outlet_id', outlet.id)
          .order('updated_at', { ascending: true }); // Ascending so latest overwrites in the map
          
        if (stockEntries) {
          const initialStock: Record<string, number> = {};
          stockEntries.forEach(entry => {
            if (entry.product_id) {
              initialStock[entry.product_id] = entry.stock_count;
            }
          });
          setStockData(initialStock);
        }
      }
      
      setLoadingProducts(false);
    };
    
    fetchProductsAndStock();
  }, [outlet]);

  const handleStockChange = (productId: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    setStockData(prev => ({ ...prev, [productId]: isNaN(numValue) ? 0 : numValue }));
  };

  const handleStockBlur = async (product: Product) => {
    if (!outlet) return;
    const stockCount = stockData[product.id];
    if (stockCount === undefined) return;

    setSavingId(product.id);
    const userStr = localStorage.getItem('currentUser');
    const userEmail = userStr ? JSON.parse(userStr).email : '';

    // Fetch existing record to get previous_stock
    const { data: existingData } = await supabase
      .from('stock_entries')
      .select('stock_count')
      .eq('outlet_id', outlet.id)
      .eq('product_id', product.id)
      .maybeSingle();

    let previousStock = 0;
    let salesQty = 0;

    if (existingData) {
      previousStock = existingData.stock_count || 0;
      
      // Sales Calculation: (Previous - Current)
      salesQty = previousStock - stockCount;
      
      // Refill Check: If new stock is greater than previous (Refill), sales is 0
      if (salesQty < 0) {
        salesQty = 0;
      }
    }

    // Upsert logic with onConflict
    const { error } = await supabase.from('stock_entries').upsert({
      outlet_id: outlet.id,
      product_id: product.id,
      user_email: userEmail,
      category: product.category,
      main_brand: product.main_brand,
      sub_brand: product.sub_brand,
      stock_count: stockCount,
      previous_stock: previousStock,
      sales_qty: salesQty
    }, {
      onConflict: 'outlet_id,product_id'
    });

    if (error) {
      console.error("Database Connection/Upsert Error:", error.message, error.details);
      alert("Failed to save stock for " + product.sub_brand);
    }
    setSavingId(null);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = (p.category?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.main_brand?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.sub_brand?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === 'Diageo' 
        ? p.category !== 'Wines' 
        : p.category === 'Wines';
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  return (
    <div className="bg-white text-slate-900 antialiased flex flex-col h-[100dvh] w-full mx-auto overflow-hidden relative">
      {/* Top Navigation Anchor - Modern Dark Blue */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1e2a52] text-white flex items-center justify-between px-6 pt-4 pb-8 rounded-b-[2rem] shadow-sm">
        {/* Subtle background overlay */}
        <div className="absolute inset-0 overflow-hidden rounded-b-[2rem] pointer-events-none opacity-10">
           <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M0,0 L100,100 M100,0 L0,100" stroke="currentColor" strokeWidth="2" />
           </svg>
        </div>
        <div className="flex items-center gap-4 max-w-4xl mx-auto w-full relative z-10">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20 active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex flex-col flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#ffb11a]">
              {outlet?.im_code || 'Outlet Name'}
            </span>
            <h1 className="text-white font-bold tracking-tight text-xl leading-tight truncate max-w-[200px] md:max-w-none">
              {outlet?.outlet_name || 'Select Outlet'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { localStorage.removeItem('currentUser'); navigate('/'); }} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/20 font-bold text-xs transition-colors">
              <span className="material-symbols-outlined text-[16px]">logout</span> Logout
            </button>
            <button onClick={() => { localStorage.removeItem('currentUser'); navigate('/'); }} className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-colors">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 pt-28 pb-6 px-4 md:px-8 overflow-y-auto hide-scrollbar w-full bg-[#f4f6f9]">
        <div className="max-w-4xl mx-auto w-full relative -mt-6">
          
          {/* Search Bar - Pill */}
        <div className="mb-6 relative z-20">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400">search</span>
          </div>
          <input 
            type="text" 
            placeholder="Search products..." 
            className="w-full bg-white border-none rounded-full py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#2b6bed] focus:outline-none transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex bg-white p-1.5 rounded-full mb-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-none">
          <button
            onClick={() => setActiveCategory('Diageo')}
            className={`flex-1 py-3 text-sm font-bold rounded-full transition-all duration-300 ${
              activeCategory === 'Diageo' 
                ? 'bg-[#2b6bed] text-white shadow-md shadow-[#2b6bed]/20' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Diageo
          </button>
          <button
            onClick={() => setActiveCategory('Wines')}
            className={`flex-1 py-3 text-sm font-bold rounded-full transition-all duration-300 ${
              activeCategory === 'Wines' 
                ? 'bg-[#2b6bed] text-white shadow-md shadow-[#2b6bed]/20' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Wines
          </button>
        </div>

        {/* Products Table - Sleek Cards Approach */}
        <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden border border-slate-50">
          <div className="px-6 py-4 bg-[#f8fafc] border-b border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Product Details</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock Count</span>
          </div>
          <div key={activeCategory} className="divide-y divide-slate-100 animate-fade-in">
            {loadingProducts ? (
              <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
                 <span className="material-symbols-outlined animate-spin text-[#2b6bed] mb-2 text-3xl">refresh</span>
                 <span className="text-sm font-semibold text-slate-400">Loading products...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
                 <span className="material-symbols-outlined text-slate-200 mb-2 text-3xl">search_off</span>
                 <span className="text-sm font-semibold text-slate-400">No items in this category.</span>
               </div>
            ) : (
              filteredProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 pr-4">
                    <div className="font-bold text-[#1e2a52] text-sm">{product.sub_brand}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{product.main_brand}</div>
                    <div className="inline-block mt-2 px-2.5 py-1 bg-[#eef4ff] text-[#2b6bed] rounded-lg text-[9px] font-bold uppercase tracking-wider border border-[#2b6bed]/10">
                      {product.category}
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="flex flex-col items-end gap-1 relative">
                      <input 
                        type="number" 
                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-center font-black text-[#2b6bed] focus:bg-white focus:ring-2 focus:ring-[#2b6bed] outline-none transition-all shadow-inner text-lg"
                        value={stockData[product.id] ?? ''}
                        onChange={(e) => handleStockChange(product.id, e.target.value)}
                        onBlur={() => handleStockBlur(product)}
                        placeholder="0"
                        min="0"
                      />
                      {savingId === product.id && (
                        <span className="absolute -bottom-5 right-1 text-[9px] font-bold text-[#2b6bed] animate-pulse">Saving...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </main>

      {/* Floating Pill Bottom Navigation matching Dash */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[320px]">
        <nav className="flex justify-around items-center px-2 py-3 bg-white rounded-full shadow-[0_10px_40px_rgba(43,107,237,0.15)] mx-auto">
          <button 
            onClick={() => navigate('/tm-dashboard')}
            className={`p-3 rounded-full transition-all duration-300 text-slate-300 hover:text-slate-500`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>home</span>
          </button>
          
          <button className={`p-3 rounded-full transition-all duration-300 text-[#2b6bed] bg-[#eef4ff] scale-110`}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>edit_document</span>
          </button>
          
          <button className={`p-3 rounded-full transition-all duration-300 text-slate-300 hover:text-slate-500`}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>sync</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
