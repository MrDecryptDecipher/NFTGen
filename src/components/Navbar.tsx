import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GlassCard } from './GlassCard';

interface NavbarProps {
  isWalletConnected: boolean;
  walletAddress: string;
}

export const Navbar: React.FC<NavbarProps> = ({ isWalletConnected, walletAddress }) => {
  const location = useLocation();
  
  // Helper function to determine if a nav link is active
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-black/20 border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-1">
            <Link to="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
              NFTGen
            </Link>
            
            <div className="hidden md:flex items-center ml-10 space-x-1">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-purple-800/50 text-white' 
                    : 'text-gray-300 hover:bg-purple-700/30 hover:text-white'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/create" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/create') 
                    ? 'bg-purple-800/50 text-white' 
                    : 'text-gray-300 hover:bg-purple-700/30 hover:text-white'
                }`}
              >
                Create
              </Link>
              <Link 
                to="/gallery" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/gallery') 
                    ? 'bg-purple-800/50 text-white' 
                    : 'text-gray-300 hover:bg-purple-700/30 hover:text-white'
                }`}
              >
                Gallery
              </Link>
              <Link 
                to="/history" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/history') 
                    ? 'bg-purple-800/50 text-white' 
                    : 'text-gray-300 hover:bg-purple-700/30 hover:text-white'
                }`}
              >
                History
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isWalletConnected ? (
              <GlassCard className="flex items-center space-x-2 py-1.5 px-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-white font-medium">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </GlassCard>
            ) : (
              <GlassCard className="flex items-center space-x-2 py-1.5 px-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-white/80">Not Connected</span>
              </GlassCard>
            )}
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="md:hidden flex justify-center pb-2 space-x-1">
          <Link 
            to="/" 
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive('/') 
                ? 'bg-purple-800/50 text-white' 
                : 'text-gray-300 hover:bg-purple-700/30 hover:text-white'
            }`}
          >
            Home
          </Link>
          <Link 
            to="/create" 
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive('/create') 
                ? 'bg-purple-800/50 text-white' 
                : 'text-gray-300 hover:bg-purple-700/30 hover:text-white'
            }`}
          >
            Create
          </Link>
          <Link 
            to="/gallery" 
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive('/gallery') 
                ? 'bg-purple-800/50 text-white' 
                : 'text-gray-300 hover:bg-purple-700/30 hover:text-white'
            }`}
          >
            Gallery
          </Link>
          <Link 
            to="/history" 
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive('/history') 
                ? 'bg-purple-800/50 text-white' 
                : 'text-gray-300 hover:bg-purple-700/30 hover:text-white'
            }`}
          >
            History
          </Link>
        </div>
      </div>
    </nav>
  );
}; 