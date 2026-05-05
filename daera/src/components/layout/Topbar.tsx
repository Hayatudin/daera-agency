'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, User, FileText, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Topbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/search/candidates?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCandidate = (id: string) => {
    setSearchQuery('');
    setShowResults(false);
    router.push(`/candidates/${id}`);
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/70 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-8">
      {/* Search */}
      <div className="relative w-96" ref={searchRef}>
        <div className="relative group">
          <Search size={16} className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
            searchQuery ? "text-primary" : "text-text-tertiary"
          )} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            placeholder="Search candidates by name or passport..."
            className="w-full pl-12 pr-10 py-2.5 text-sm rounded-2xl border border-border/60 bg-gray-50/50 text-text-primary placeholder:text-text-tertiary/60 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all duration-300"
          />
          {isSearching ? (
            <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" />
          ) : searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setResults([]); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-danger transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (results.length > 0 || searchQuery.length >= 2) && (
          <div className="absolute top-full mt-2 w-full bg-white rounded-2xl border border-border shadow-2xl shadow-primary/10 overflow-hidden animate-slide-in-top z-50">
            {results.length > 0 ? (
              <div className="p-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary px-3 py-2">Quick Results</p>
                {results.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => handleSelectCandidate(candidate.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-primary font-bold overflow-hidden border border-border/50 group-hover:border-primary/30">
                      {candidate.facePhotoUrl ? (
                        <img src={candidate.facePhotoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{candidate.givenNames.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{candidate.givenNames} {candidate.surname}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono font-bold text-text-tertiary px-1.5 py-0.5 bg-gray-100 rounded">{candidate.passportNumber}</span>
                        <span className="text-[10px] text-text-tertiary truncate opacity-60">{candidate.job}</span>
                      </div>
                    </div>
                    <ChevronDown size={14} className="text-text-tertiary -rotate-90 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            ) : !isSearching && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={20} className="text-text-tertiary opacity-20" />
                </div>
                <p className="text-sm font-bold text-text-primary">No results found</p>
                <p className="text-xs text-text-tertiary mt-1">Try a different name or passport</p>
              </div>
            )}
            
            {results.length > 0 && (
              <div className="bg-gray-50/50 p-2 border-t border-border/50">
                <button 
                  onClick={() => router.push(`/candidates?q=${searchQuery}`)}
                  className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-colors"
                >
                  View all results
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notification */}
        <button className="relative p-2.5 rounded-xl hover:bg-primary/5 transition-all duration-200 group">
          <Bell size={20} className="text-text-secondary group-hover:text-primary transition-colors" />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-danger rounded-full ring-4 ring-white" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3 pl-4 border-l border-border/50 cursor-pointer hover:bg-gray-50 rounded-2xl px-4 py-2 transition-all duration-200 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <User size={16} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-tighter text-text-tertiary leading-none mb-1">Super Admin</p>
            <p className="text-sm font-bold text-text-primary leading-none">Melaverse Admin</p>
          </div>
          <ChevronDown size={14} className="text-text-tertiary group-hover:text-primary transition-colors" />
        </div>
      </div>
    </header>
  );
}
