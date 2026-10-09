import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import api from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import {
  Edit2, Trash2, X, Check, Package, ShoppingBag, Clock,
  CheckCircle2, AlertCircle, Send, Gavel, Star, TrendingUp,
  User, Mail, Shield, RefreshCw
} from 'lucide-react';

const STATUS_CONFIG = {
  available:        { label: 'Available',         color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  pending_approval: { label: 'Pending Approval',  color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  active_auction:   { label: 'Live Auction',      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30'   },
  sold:             { label: 'Sold',              color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'   },
  removed:          { label: 'Removed',           color: 'bg-slate-500/20 text-slate-400 border-slate-500/30'},
  purchased:        { label: 'Purchased',         color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'},
};

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', askingPrice: '', buyingDate: '' });

  useEffect(() => { fetchMyProducts(); }, []);

  const fetchMyProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/my-products');
      if (res.data.success) {
        setProducts(res.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        setError('Failed to fetch your products');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(p => p.filter(x => x._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/products/${id}`, { status: newStatus });
      setProducts(p => p.map(x => x._id === id ? { ...x, status: newStatus } : x));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product._id);
    setEditForm({
      title: product.title,
      description: product.description,
      askingPrice: product.askingPrice || product.startingBid || '',
      buyingDate: product.buyingDate ? product.buyingDate.split('T')[0] : ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Use PATCH so multer doesn't intercept the JSON body
      await api.patch(`/products/${editingProduct}`, editForm);
      setEditingProduct(null);
      // Optimistically update the local card to show pending_approval immediately
      setProducts(p => p.map(x => x._id === editingProduct
        ? { ...x, ...editForm, status: 'pending_approval' }
        : x
      ));
      alert('✅ Your edits were saved! The listing has been sent back to the admin for re-verification before going live again.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update product.');
    }
  };

  if (!user) return <div className="text-center mt-20 text-teal-100">Please login to view profile.</div>;

  const tabs = [
    { key: 'all',      label: 'All Listings',    icon: Package },
    { key: 'available',label: 'Available',        icon: CheckCircle2 },
    { key: 'pending_approval', label: 'Pending',  icon: Clock },
    { key: 'active_auction',   label: 'Auctions', icon: Gavel },
    { key: 'sold',     label: 'Sold',             icon: ShoppingBag },
  ];

  const filtered = activeTab === 'all' ? products : products.filter(p => p.status === activeTab);
  const stats = {
    total:   products.length,
    live:    products.filter(p => p.status === 'active_auction').length,
    sold:    products.filter(p => p.status === 'sold').length,
    pending: products.filter(p => p.status === 'pending_approval').length,
  };

  return (
    <div className="w-full min-h-screen animate-fade-in relative z-10">

      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-[#030d0e] via-[#051a1c] to-[#030d0e] border-b border-teal-900/30 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-8">

          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-teal-400 to-cyan-600 shadow-[0_0_30px_rgba(0,210,200,0.4)] flex items-center justify-center text-4xl font-black text-[#030a0d]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#030d0e] flex items-center justify-center">
              <Shield size={10} className="text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-black text-teal-50 tracking-tight">{user.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Mail size={14} className="text-teal-500" />
              <span className="text-teal-400 font-medium text-sm">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">✓ Verified IITP Member</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-4 flex-wrap">
            {[
              { label: 'Total',   val: stats.total,   color: 'teal',   icon: Package },
              { label: 'Live',    val: stats.live,    color: 'rose',   icon: Gavel },
              { label: 'Sold',    val: stats.sold,    color: 'blue',   icon: ShoppingBag },
              { label: 'Pending', val: stats.pending, color: 'amber',  icon: Clock },
            ].map(s => (
              <div key={s.label} className={`glass-card py-3 px-5 flex flex-col items-center gap-1 border-${s.color}-500/20 min-w-[80px]`}>
                <s.icon size={18} className={`text-${s.color}-400`} />
                <span className={`text-2xl font-black text-${s.color}-300`}>{s.val}</span>
                <span className="text-[10px] text-teal-600 font-bold uppercase">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Tab Bar */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-teal-900/30">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-teal-700 hover:text-teal-400 hover:bg-teal-500/10'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">
                {tab.key === 'all' ? products.length : products.filter(p => p.status === tab.key).length}
              </span>
            </button>
          ))}
          <button onClick={fetchMyProducts} className="ml-auto text-teal-600 hover:text-teal-300 transition p-2">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="glass-card h-72 animate-pulse bg-teal-900/10" />)}
          </div>
        ) : error ? (
          <div className="glass-card text-center py-12 border-red-500/20">
            <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
            <p className="text-red-400 font-bold">{error}</p>
            <button onClick={fetchMyProducts} className="mt-4 text-teal-400 text-sm underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card text-center py-16">
            <Package size={48} className="text-teal-800 mx-auto mb-4" />
            <p className="text-teal-600 text-lg font-bold">No listings here yet</p>
            <p className="text-teal-800 text-sm mt-1">Go to Sell to list your first product!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
            {filtered.map(product => {
              const cfg = STATUS_CONFIG[product.status] || STATUS_CONFIG.removed;
              const price = product.listingType === 'auction'
                ? product.startingBid
                : (product.askingPrice || product.price);

              return (
                <div key={product._id} className="glass-card p-0 overflow-hidden flex flex-col group border-teal-900/20 hover:border-teal-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,180,150,0.1)]">

                  {/* Image */}
                  <div className="relative w-full h-44 overflow-hidden">
                    {product.productPic ? (
                      <img src={product.productPic} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-teal-900/20 flex items-center justify-center">
                        <Package size={40} className="text-teal-800" />
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.color}`}>
                      {cfg.label}
                    </div>
                    {/* Type Badge */}
                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${product.listingType === 'auction' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-teal-500/20 text-teal-400 border-teal-500/30'}`}>
                      {product.listingType === 'auction' ? '🔨 Auction' : '🏷️ Fixed'}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-black text-teal-50 truncate mb-1">{product.title}</h3>
                    <p className="text-teal-700 text-xs line-clamp-2 mb-3">{product.description}</p>
                    <div className="text-2xl font-black text-teal-400 mb-4">₹{price?.toLocaleString('en-IN')}</div>

                    {/* ── Action Buttons (Status-aware) ─────────────────── */}
                    <div className="mt-auto space-y-2">

                      {/* PENDING APPROVAL */}
                      {product.status === 'pending_approval' && (
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition"
                        >
                          <X size={14} /> Cancel Request
                        </button>
                      )}

                      {/* AVAILABLE (Fixed listing) */}
                      {product.status === 'available' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleEditClick(product)} className="flex items-center justify-center gap-1.5 py-2 text-sm font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 rounded-xl transition">
                            <Edit2 size={13} /> Edit
                          </button>
                          <button onClick={() => handleDelete(product._id)} className="flex items-center justify-center gap-1.5 py-2 text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition">
                            <Trash2 size={13} /> Delete
                          </button>
                          <button onClick={() => handleStatusChange(product._id, 'sold')} className="col-span-2 flex items-center justify-center gap-1.5 py-2 text-sm font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition">
                            <CheckCircle2 size={13} /> Mark as Sold
                          </button>
                        </div>
                      )}

                      {/* REMOVED — allow re-submit */}
                      {product.status === 'removed' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleStatusChange(product._id, 'pending_approval')} className="flex items-center justify-center gap-1.5 py-2 text-sm font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 rounded-xl transition">
                            <Send size={13} /> Re-submit
                          </button>
                          <button onClick={() => handleDelete(product._id)} className="flex items-center justify-center gap-1.5 py-2 text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition">
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}

                      {/* ACTIVE AUCTION */}
                      {product.status === 'active_auction' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => window.location.href = `/auction/bidding?id=${product._id}`} className="col-span-2 flex items-center justify-center gap-1.5 py-2 text-sm font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition">
                            <Gavel size={13} /> View Auction
                          </button>
                          <button onClick={() => handleStatusChange(product._id, 'sold')} className="col-span-2 flex items-center justify-center gap-1.5 py-2 text-sm font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition">
                            <CheckCircle2 size={13} /> Mark Auction Sold
                          </button>
                        </div>
                      )}

                      {/* SOLD */}
                      {product.status === 'sold' && (
                        <div className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                          <ShoppingBag size={13} /> Item Sold — Transaction Complete
                        </div>
                      )}

                      {/* PURCHASED */}
                      {product.status === 'purchased' && (
                        <div className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                          <Star size={13} /> Purchased ✓
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg bg-[#050b0f] relative animate-fade-in shadow-[0_0_60px_rgba(0,0,0,0.9)] border-teal-500/30">
            <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 text-teal-600 hover:text-teal-300 transition">
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Edit2 size={20} className="text-teal-400" />
              <h3 className="text-2xl font-black text-teal-100">Edit Listing</h3>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-teal-500 text-sm font-bold mb-1">Title</label>
                <input type="text" name="title" required value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="glass-input" />
              </div>
              <div>
                <label className="block text-teal-500 text-sm font-bold mb-1">Description</label>
                <textarea name="description" required value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="glass-input" rows="3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-teal-500 text-sm font-bold mb-1">Price (₹)</label>
                  <input type="number" name="askingPrice" value={editForm.askingPrice}
                    onChange={e => setEditForm({ ...editForm, askingPrice: e.target.value })}
                    className="glass-input" />
                </div>
                <div>
                  <label className="block text-teal-500 text-sm font-bold mb-1">Original Buying Date</label>
                  <input type="date" name="buyingDate" value={editForm.buyingDate}
                    onChange={e => setEditForm({ ...editForm, buyingDate: e.target.value })}
                    className="glass-input text-teal-100" />
                </div>
              </div>

              <button type="submit" className="glass-button flex items-center justify-center gap-2 mt-4 w-full">
                <Check size={18} /> Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
