import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { SOCKET_URL } from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import io from 'socket.io-client';
import { Clock, Gavel, History, TrendingUp, AlertCircle } from 'lucide-react';

const AuctionRoom = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const id = queryParams.get('id');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!id) {
    console.error("No Auction ID provided in URL.");
    window.location.href = '/auctions';
    return null;
  }

  const [product, setProduct] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [history, setHistory] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  // 1. Initialize Socket Connection
  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('join_room', { roomId: id, userId: user._id, type: 'auction' });

    newSocket.on('bid_history', (data) => setHistory(data));
    newSocket.on('bid_updated', (data) => {
      setProduct(prev => ({ ...prev, currentHighestBid: data.currentHighestBid, highestBidder: { name: data.highestBidderName } }));
      setHistory(data.history);
      setError('');
    });
    newSocket.on('broadcast_received', (data) => {
      setBroadcasts(prev => [data, ...prev].slice(0, 5));
    });
    newSocket.on('bid_error', (data) => setError(data.message));

    return () => newSocket.close();
  }, [id, user]);

  // 2. Fetch Product Context
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        if (res.data.success) {
          setProduct(res.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProduct();
  }, [id]);

  // 3. Timer Logic
  useEffect(() => {
    if (!product || !product.auctionEndTime) return;

    const timer = setInterval(() => {
      const diff = +new Date(product.auctionEndTime) - +new Date();
      if (diff <= 0) {
        setTimeLeft('ENDED');
        clearInterval(timer);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [product]);

  const handleBid = (e) => {
    e.preventDefault();
    if (!bidAmount || isNaN(bidAmount)) return;

    const amount = Number(bidAmount);
    if (amount <= product.currentHighestBid) {
      setError(`Bid must be higher than ₹${product.currentHighestBid}`);
      return;
    }

    socket.emit('place_bid', {
      productId: id,
      bidderId: user._id,
      bidAmount: amount
    });
    setBidAmount('');
  };

  const handleContactSeller = async () => {
    try {
      const { data } = await api.post('/messages/init', {
        sellerId: product.seller._id,
        productId: product._id
      });
      if (data.success) {
        navigate(`/chat?id=${data.data._id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start chat with seller.');
    }
  };

  if (!product) return <div className="text-teal-400 mt-20 text-center animate-pulse">Entering the Arena...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">

      {/* Left Column: Product Details */}
      <div className="lg:col-span-7 space-y-6">
        <div className="glass-card p-0 overflow-hidden border-teal-500/20">
          <div className="w-full h-[320px] relative overflow-hidden group">
            <img
              src={product.productPic}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              alt={product.title}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030a0d] to-transparent opacity-60"></div>
          </div>
          <div className="p-8">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-4xl font-black text-teal-100">{product.title}</h1>
              <span className="bg-teal-500 text-[#030a0d] px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">Live Auction</span>
            </div>
            <p className="text-teal-100/60 leading-relaxed mb-6 text-lg">{product.description}</p>
            <div className="flex items-center gap-6 border-t border-teal-900/30 pt-6">
              <div>
                <span className="text-[10px] text-teal-500 font-black uppercase block mb-1">Starting Price</span>
                <span className="text-2xl font-bold text-teal-100 italic">₹{product.startingBid}</span>
              </div>
              <div className="w-px h-10 bg-teal-900/30"></div>
              <div>
                <span className="text-[10px] text-teal-500 font-black uppercase block mb-1">Verified Seller</span>
                <span className="text-lg font-bold text-teal-200">{product.seller?.name || 'IITP Member'}</span>
              </div>
              <div className="ml-auto">
                <button
                  onClick={handleContactSeller}
                  className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 px-6 py-2 rounded-xl text-sm font-black transition-all"
                >
                  Contact Seller
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Broadcast Messages */}
        {broadcasts.map((b, i) => (
          <div key={i} className="glass-card border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-4 animate-fade-in">
            <div className="bg-amber-500 text-[#030a0d] px-2 py-0.5 rounded text-[8px] font-black uppercase mt-1">Admin</div>
            <p className="text-amber-100 font-bold italic">"{b.text}"</p>
          </div>
        ))}
      </div>

      {/* Right Column: Bid Board */}
      <div className="lg:col-span-5 space-y-6">

        {/* Status Header */}
        <div className="glass-card bg-rose-500/5 border-rose-500/20 flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <Clock className="text-rose-400 animate-pulse" size={24} />
            <span className="text-rose-100 font-black uppercase tracking-wider text-sm">Time Remaining</span>
          </div>
          <span className="text-3xl font-black text-rose-400 font-mono">{timeLeft}</span>
        </div>

        {/* The Leader */}
        <div className="glass-card border-green-500/30 bg-green-500/5 p-8 text-center relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -top-4 text-green-500/10" size={120} />
          <span className="text-teal-500 font-black uppercase tracking-[0.2em] text-[10px] block mb-2">Current Highest Bid</span>
          <div className="text-6xl font-black text-green-400 mb-2 drop-shadow-[0_0_20px_rgba(74,224,161,0.3)]">
            ₹{product.currentHighestBid || product.startingBid}
          </div>
          <p className="text-teal-100 font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-2">
            <span>Now Belongs to: <span className="text-white text-sm">{product.highestBidder?.name || 'No Bids Yet'}</span></span>
            {product.highestBidder && <span className="text-rose-400 animate-pulse mt-1">Bid more to get this product! 🏹</span>}
          </p>
        </div>

        {/* Action Area */}
        <div className="glass-card p-8 border-teal-400/20">
          {product.seller?._id === user?._id ? (
            <div className="space-y-4">
              <span className="text-teal-400 font-black tracking-widest text-[10px] uppercase block mb-2">Seller Command Center</span>
              <textarea
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Broadcast a message to all bidders (e.g. '5 minutes left! Bid now!')"
                className="glass-input h-24 text-sm"
              />
              <button
                onClick={() => {
                  socket.emit('seller_broadcast', { productId: id, text: broadcastText });
                  setBroadcastText('');
                }}
                className="w-full bg-teal-500 text-[#030a0d] font-black py-3 rounded-xl transition-all hover:bg-teal-400"
              >
                Send Broadcast
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3 text-sm font-bold">
                  <AlertCircle size={20} /> {error}
                </div>
              )}
              <form onSubmit={handleBid} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 font-black">₹</span>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Enter more than ₹${product.currentHighestBid}`}
                    className="glass-input pl-10 h-16 text-xl font-black"
                    required
                  />
                </div>
                <button type="submit" className="glass-button h-16 text-lg flex items-center justify-center gap-2">
                  <Gavel size={24} /> Place Bid
                </button>
              </form>
              <p className="text-[10px] text-teal-500 text-center mt-4 font-black uppercase tracking-widest opacity-50">Minimum increment: ₹1</p>
            </>
          )}
        </div>

        {/* Live Feed */}
        <div className="glass-card p-0 overflow-hidden border-teal-900/30 flex flex-col h-[300px]">
          <div className="p-4 border-b border-teal-900/30 flex items-center gap-2 bg-[#030a0d]/50">
            <History size={18} className="text-teal-400" />
            <span className="text-xs font-black uppercase tracking-widest text-teal-100">Live Bid Feed</span>
          </div>
          <div className="flex-grow overflow-y-auto custom-scrollbar p-0">
            {history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-teal-900 font-black uppercase text-xs tracking-widest">No history yet</div>
            ) : (
              history.map((bid, i) => (
                <div key={bid._id} className={`p-4 flex items-center justify-between border-b border-teal-900/10 animate-fade-in ${i === 0 ? 'bg-teal-500/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-900/50 flex items-center justify-center text-[10px] font-black text-teal-400">
                      {bid.bidder.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-teal-100">{bid.bidder.name}</p>
                      <p className="text-[9px] text-teal-500 font-black uppercase">{new Date(bid.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-teal-400">₹{bid.amount}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionRoom;
