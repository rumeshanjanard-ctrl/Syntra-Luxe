import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Outlet, Product } from './lib/supabase';
import { Home, FileText, RefreshCw, LogOut, PackagePlus, History, List, Trash2, Send, Plus, CheckCircle2 } from 'lucide-react';

interface RequestItem {
  id: string;
  product: Product;
  quantity: number;
}

export default function StockRequest() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [market, setMarket] = useState('');
  const [tmName, setTmName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      navigate('/');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (!user.email) {
        navigate('/');
        return;
      }
      setUserEmail(user.email);
      fetchInitialData(user.email);
    } catch (e) {
      navigate('/');
    }
  }, [navigate]);

  const fetchInitialData = async (email: string) => {
    // Fetch TM's market
    const { data: outletData } = await supabase
      .from('outlets')
      .select('market, tm_name')
      .eq('tm_email', email)
      .limit(1)
      .single();
    
    if (outletData) {
      setMarket(outletData.market || 'Unknown Market');
      setTmName(outletData.tm_name || email.split('@')[0]);
    }

    // Fetch products
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .order('sub_brand');
    
    if (productData) {
      setProducts(productData);
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId || !quantity || parseInt(quantity) <= 0) return;

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const newItem: RequestItem = {
      id: Math.random().toString(36).substr(2, 9),
      product,
      quantity: parseInt(quantity)
    };

    setRequestItems([...requestItems, newItem]);
    setSelectedProductId('');
    setQuantity('');
  };

  const handleRemoveItem = (id: string) => {
    setRequestItems(requestItems.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (requestItems.length === 0) return;
    setIsSubmitting(true);

    try {
      // 1. Save to Supabase
      // Assuming market_stock_requests table exists or will be created
      const requestData = requestItems.map(item => ({
        tm_email: userEmail,
        tm_name: tmName,
        market: market,
        product_id: item.product.id,
        sub_brand: item.product.sub_brand,
        quantity: item.quantity,
        status: 'pending'
      }));

      const { error: dbError } = await supabase
        .from('market_stock_requests')
        .insert(requestData);

      if (dbError) {
        console.warn("Could not save to market_stock_requests (table might not exist yet):", dbError);
        // We'll continue anyway for the prototype to show the email logic
      }

      // 2. Send Email via Backend API
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });

      const response = await fetch('/api/send-stock-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          market,
          tmName,
          requestItems,
          currentDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email via API');
      }

      setSubmitSuccess(true);
      setRequestItems([]);
      
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);

    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white text-slate-900 h-[100dvh] flex flex-col font-sans overflow-hidden">
      {/* Desktop Top Bar */}
      <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Syntra Luxe</h1>
        </div>
        <button onClick={() => { localStorage.removeItem('currentUser'); navigate('/'); }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 font-medium text-sm transition-colors">
          <LogOut size={16} /> Logout
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full z-20 shrink-0">
          <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => navigate('/tm-dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900">
              <Home size={20} /> Home
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors bg-slate-100 text-slate-900">
              <PackagePlus size={20} /> Stock Request
            </button>
            <button onClick={() => navigate('/tm-dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900">
              <History size={20} /> Recent Entries
            </button>
            <button onClick={() => navigate('/tm-dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900">
              <List size={20} /> Outlet List
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 h-full flex flex-col relative overflow-hidden bg-white w-full max-w-[420px] md:max-w-none mx-auto">
          
          {/* Mobile Top Header */}
          <header className="md:hidden pt-12 pb-4 px-6 flex items-center justify-between bg-white z-10 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/tm-dashboard')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors active:scale-95 duration-200"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Syntra Luxe</h1>
            </div>
          </header>

          {/* Content Canvas */}
          <div className="flex-1 px-6 md:px-10 pb-24 md:pb-10 overflow-y-auto hide-scrollbar">
            <div className="max-w-4xl mx-auto w-full pt-2 md:pt-8">
              
              <div className="hidden md:block mb-8">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bulk Stock Request</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">Request new stock for your market</p>
              </div>

              {submitSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-3xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                  <div className="bg-green-100 text-green-600 p-2 rounded-full">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-bold text-sm">Request Sent Successfully!</h4>
                    <p className="text-slate-500 text-xs mt-0.5 font-medium">RSM and Warehouse team have been notified.</p>
                  </div>
                </div>
              )}

              {/* Request Form Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 mb-6">
                <div className="space-y-5">
                  
                  {/* Market Field (Disabled) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Market</label>
                    <input 
                      type="text" 
                      value={market || 'Loading...'} 
                      disabled 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Item Selection */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Product (Sub-brand)</label>
                      <select 
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-200 focus:border-slate-300 focus:bg-white outline-none transition-all appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                      >
                        <option value="" disabled>Select a product...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.sub_brand} ({p.main_brand})</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="w-full md:w-32">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Qty</label>
                      <input 
                        type="number" 
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-200 focus:border-slate-300 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleAddItem}
                    disabled={!selectedProductId || !quantity || parseInt(quantity) <= 0}
                    className="w-full py-4 bg-slate-100 text-slate-900 rounded-full font-bold text-sm hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Add to Request List
                  </button>
                </div>
              </div>

              {/* Request List */}
              {requestItems.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden mb-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 text-sm">Items to Request</h3>
                    <span className="bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full">{requestItems.length} items</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {requestItems.map(item => (
                      <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{item.product.sub_brand}</h4>
                          <p className="text-xs text-slate-500 font-medium">{item.product.main_brand}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-slate-900 bg-slate-100 px-4 py-2 rounded-full">{item.quantity}</span>
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 border-t border-slate-100">
                    <button 
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-slate-900 text-white rounded-full font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2 hover:bg-slate-800"
                    >
                      {isSubmitting ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      {isSubmitting ? 'Sending Request...' : 'Send Request'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Fixed Bottom Navigation Bar (Mobile Only) */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe">
            <nav className="flex justify-around items-center px-6 py-3">
              <button 
                onClick={() => navigate('/tm-dashboard')}
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 text-slate-400 hover:text-slate-900`}
              >
                <Home size={24} strokeWidth={2} />
                <span className="text-[10px] font-medium">Home</span>
              </button>
              
              <button 
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 text-slate-900`}
              >
                <PackagePlus size={24} strokeWidth={2.5} />
                <span className="text-[10px] font-medium">Request</span>
              </button>
              
              <button 
                onClick={() => navigate('/tm-dashboard')}
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 text-slate-400 hover:text-slate-900`}
              >
                <FileText size={24} strokeWidth={2} />
                <span className="text-[10px] font-medium">Outlets</span>
              </button>
            </nav>
          </div>

        </main>
      </div>
    </div>
  );
}
