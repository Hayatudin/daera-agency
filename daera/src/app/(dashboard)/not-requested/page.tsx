'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Loader2, MoreVertical, CheckCircle, Trash2, Edit3, Eye, Search, UserCheck, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { Candidate } from '@/types';

import { useCandidates } from '@/hooks/useCandidates';

export default function NotRequestedPage() {
  const router = useRouter();
  const { candidates: allCandidates, isLoading, mutate } = useCandidates();
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<string | null>(null);
  const [visaModalId, setVisaModalId] = useState<string | null>(null);
  const [visaNumberInput, setVisaNumberInput] = useState('');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]')) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const candidates = allCandidates.filter(c => !c.isRequested);

  const [isUpdating, setIsUpdating] = useState(false);

  const markAsVisaSelected = async (id: string, visaNum: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRequested: true, visaOrContractNumber: visaNum }),
      });
      
      if (!res.ok) throw new Error();

      // Successfully updated in DB, now refresh the UI
      mutate(prev => prev.map(c => 
        c.id === id ? { ...c, isRequested: true, visaOrContractNumber: visaNum } : c
      ));
      
      setOpenMenuId(null);
      setVisaModalId(null);
      setVisaNumberInput('');
    } catch (err) {
      alert('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCandidate = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      mutate(prev => prev.filter(c => c.id !== id));
    } catch { alert('Failed to delete candidate'); }
  };

  const filtered = candidates.filter(c => {
    const name = `${c.passportData.givenNames} ${c.passportData.surname}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || c.passportData.passportNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-50"><ClipboardList size={22} className="text-amber-600" /></div>
          Not Requested Candidates
        </h1>
        <p className="text-text-secondary mt-1 ml-12">Candidates who have not been requested yet</p>
      </div>

      <div className="w-full md:w-96">
        <Input placeholder="Search by name or passport..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                <th className="px-6 py-4 font-semibold">Shelf ID</th>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold">Passport No.</th>
                <th className="px-6 py-4 font-semibold">Job / Skills</th>
                <th className="px-6 py-4 font-semibold">Visa Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center"><div className="flex flex-col items-center gap-3"><Loader2 size={32} className="text-primary animate-spin" /><p className="text-text-tertiary">Loading...</p></div></td></tr>
              ) : filtered.length > 0 ? (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">{c.shelfId || 'UNASSIGNED'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                          <span className="text-amber-600 font-bold text-sm">{c.passportData.givenNames.charAt(0)}{c.passportData.surname.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{c.passportData.givenNames} {c.passportData.surname}</p>
                          <p className="text-xs text-text-tertiary">{c.personalInfo.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-text-primary">{c.passportData.passportNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-text-primary font-medium">{c.personalInfo.job || 'N/A'}</p>
                      <p className="text-xs text-text-tertiary truncate max-w-[180px]">{c.personalInfo.skills.slice(0, 3).join(', ')}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="default">Pending Visa</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative inline-block" data-action-menu>
                        <button onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} className="text-text-tertiary hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary-50">
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === c.id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                            <button onClick={() => setVisaModalId(c.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                              <UserCheck size={16} className="text-green-500" />
                              <span>Visa Selected</span>
                            </button>
                            <div className="border-t border-border my-1" />
                            <button onClick={() => deleteCandidate(c.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600">
                              <Trash2 size={16} /><span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-text-tertiary">No candidates found in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Visa Selection Modal */}
      {visaModalId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Mark as Visa Selected</h2>
              <button onClick={() => setVisaModalId(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Enter the Visa or Contract Number for this candidate to move them to the Requested list.</p>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Visa / Contract Number</label>
                <input
                  autoFocus
                  value={visaNumberInput}
                  onChange={e => setVisaNumberInput(e.target.value)}
                  placeholder="e.g. 2005095494"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  onKeyDown={e => e.key === 'Enter' && visaNumberInput && markAsVisaSelected(visaModalId, visaNumberInput)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setVisaModalId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!visaNumberInput || isUpdating}
                  onClick={() => markAsVisaSelected(visaModalId, visaNumberInput)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Confirm Selection'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
