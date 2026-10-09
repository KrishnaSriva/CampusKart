import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShoppingCart, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="w-full bg-[#030a0d]/90 backdrop-blur-xl border-b border-teal-900/50 sticky top-0 z-50 flex justify-between items-center px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      {/* Left side: Logo */}
      <div className="flex items-center gap-6">
        <Link to="/" className="text-2xl font-black tracking-tight text-white flex items-center gap-2 transition-all hover:text-teal-400">
          <ShoppingCart size={28} className="text-teal-400" />
          Campus Kart
        </Link>
      </div>
      
      {/* Right side: Authenticated Links or Auth Buttons */}
      <div className="flex items-center gap-5">
        {!user && null}

        {user && (
          <>
            {user.role === 'admin' && (
              <Link to="/admin" className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors px-2 py-1 border-b-2 border-transparent hover:border-yellow-400">
                Admin Panel
              </Link>
            )}
            <Link to="/sell" className="text-teal-50 hover:text-teal-300 transition-colors px-2 py-1 tracking-wide font-medium border-b-2 border-transparent hover:border-teal-400">
              Sell
            </Link>
            <Link to="/products" className="text-teal-50 hover:text-teal-300 transition-colors px-2 py-1 tracking-wide font-medium border-b-2 border-transparent hover:border-teal-400">
              Marketplace
            </Link>
            <Link to="/auctions" className="text-teal-50 hover:text-teal-300 transition-colors px-2 py-1 tracking-wide font-medium border-b-2 border-transparent hover:border-teal-400">
              Auctions
            </Link>
            <Link to="/chat" className="text-teal-50 hover:text-teal-300 transition-colors px-2 py-1 tracking-wide font-medium border-b-2 border-transparent hover:border-teal-400">
              Chat
            </Link>
            <div className="w-px h-6 bg-teal-900/50 mx-2"></div>
            <Link to="/profile" className="flex items-center gap-2 text-teal-400 hover:text-teal-200 transition-colors px-2 py-1 font-bold">
              <User size={20} />
              Profile
            </Link>
            <button onClick={handleLogout} className="ml-2 flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl px-4 py-2 transition-all shadow-md">
              <LogOut size={18} />
              Log out
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
