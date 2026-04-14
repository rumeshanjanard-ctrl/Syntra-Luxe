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
      {/* Top Navigation Anchor */}
      <header className="fixed top-0 w-full z-50 bg-white shadow-sm flex items-center justify-between px-6 h-16 border-b border-slate-200">
        <div className="flex items-center gap-3 max-w-4xl mx-auto w-full">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined text-slate-700">arrow_back</span>
          </button>
          <div className="flex flex-col flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-blue-600">
              {outlet?.im_code || 'Outlet Name'}
            </span>
            <h1 className="text-slate-900 font-bold tracking-tight text-lg leading-tight truncate max-w-[200px] md:max-w-none">
              {outlet?.outlet_name || 'Select Outlet'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { localStorage.removeItem('currentUser'); navigate('/'); }} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 font-medium text-sm transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span> Logout
            </button>
            <button onClick={() => { localStorage.removeItem('currentUser'); navigate('/'); }} className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 pt-20 pb-6 px-4 md:px-8 overflow-y-auto hide-scrollbar w-full">
        <div className="max-w-4xl mx-auto w-full">
          
          {/* Search Bar */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400">search</span>
          </div>
          <input 
            type="text" 
            placeholder="Search products..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-slate-200 focus:border-slate-300 focus:bg-white transition-all outline-none placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex bg-slate-50 p-1.5 rounded-full mb-8 border border-slate-200">
          <button
            onClick={() => setActiveCategory('Diageo')}
            className={`flex-1 py-3 text-sm font-bold rounded-full transition-all duration-300 ${
              activeCategory === 'Diageo' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            Diageo
          </button>
          <button
            onClick={() => setActiveCategory('Wines')}
            className={`flex-1 py-3 text-sm font-bold rounded-full transition-all duration-300 ${
              activeCategory === 'Wines' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            Wines
          </button>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Product Details</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right w-32">Stock</th>
                </tr>
              </thead>
              <tbody key={activeCategory} className="divide-y divide-slate-50 animate-fade-in">
                {loadingProducts ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-slate-500 font-medium">Loading products...</td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-slate-500 font-medium">No items in this category.</td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{product.sub_brand}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">{product.main_brand}</div>
                        <div className="inline-block mt-2 px-2.5 py-1 bg-[#f4f7fb] text-[#2b6bed] rounded-lg text-[9px] font-bold uppercase tracking-wider">
                          {product.category}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right align-middle">
                        <div className="flex flex-col items-end gap-1">
                          <input 
                            type="number" 
                            className="w-20 p-3 bg-slate-50 border-none rounded-xl text-right font-black text-[#2b6bed] focus:bg-white focus:ring-2 focus:ring-[#2b6bed]/20 outline-none transition-all shadow-inner"
                            value={stockData[product.id] ?? ''}
                            onChange={(e) => handleStockChange(product.id, e.target.value)}
                            onBlur={() => handleStockBlur(product)}
                            placeholder="0"
                            min="0"
                          />
                          {savingId === product.id && (
                            <span className="text-[9px] font-bold text-[#2b6bed] animate-pulse">Saving...</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </main>

      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex justify-around items-center px-4 pb-safe pt-3 pb-3">
        <button 
          onClick={() => navigate('/tm-dashboard')}
          className="flex flex-col items-center justify-center text-slate-400 py-1 px-4 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined mb-1">home</span>
          <span className="font-inter text-[10px] font-bold uppercase tracking-widest">Home</span>
        </button>
        <button className="flex flex-col items-center justify-center text-[#2b6bed] bg-[#f4f7fb] rounded-2xl px-6 py-2 shadow-sm">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>edit_document</span>
          <span className="font-inter text-[10px] font-bold uppercase tracking-widest">Entries</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-400 py-1 px-4 hover:text-slate-600 transition-colors">
          <span className="material-symbols-outlined mb-1">sync</span>
          <span className="font-inter text-[10px] font-bold uppercase tracking-widest">Sync</span>
        </button>
      </nav>
    </div>
  );
}
