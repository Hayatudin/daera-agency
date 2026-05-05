'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Users, MoreVertical, Loader2, CheckCircle, Trash2, Edit3, Eye } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Candidate } from '@/types';

import { useCandidates } from '@/hooks/useCandidates';

export default function CandidatesPage() {
  const router = useRouter();
  const { candidates, isLoading, error, mutate: setCandidates } = useCandidates();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('new_to_old');
  const [customDate, setCustomDate] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [religionFilter, setReligionFilter] = useState('');
  const [missingFileFilter, setMissingFileFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<string | null>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]')) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Toggle requested
  const toggleRequested = async (id: string, current: boolean) => {
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRequested: !current }),
      });
      if (!res.ok) throw new Error();
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, isRequested: !current } : c));
    } catch { alert('Failed to update status'); }
  };

  // Delete candidate
  const deleteCandidate = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch { alert('Failed to delete candidate'); }
  };

  const uniqueJobs = useMemo(() => {
    const jobs = new Set(candidates.map(c => c.personalInfo.job).filter(Boolean));
    return Array.from(jobs).map(j => ({ value: j as string, label: j as string }));
  }, [candidates]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = candidates.filter((c) => {
      const name = `${c.passportData.givenNames} ${c.passportData.surname}`.toLowerCase();
      const passport = c.passportData.passportNumber.toLowerCase();
      const shelfId = (c.shelfId || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || passport.includes(query) || shelfId.includes(query);
      const matchesStatus = statusFilter ? c.status === statusFilter : true;
      let matchesDate = true;
      if (customDate) matchesDate = c.registeredAt.split('T')[0] === customDate;

      const matchesJob = jobFilter ? c.personalInfo.job === jobFilter : true;
      const matchesGender = genderFilter ? c.passportData.gender?.toLowerCase() === genderFilter.toLowerCase() : true;
      const matchesReligion = religionFilter ? c.personalInfo.religion?.toLowerCase() === religionFilter.toLowerCase() : true;

      let matchesMissingFile = true;
      if (missingFileFilter === 'COC') matchesMissingFile = !c.cocDocumentUrl;
      else if (missingFileFilter === 'Medical') matchesMissingFile = !c.medicalDocumentUrl;
      else if (missingFileFilter === 'Passport') matchesMissingFile = !c.passportImageUrl;
      else if (missingFileFilter === 'FacePhoto') matchesMissingFile = !c.facePhotoUrl;
      else if (missingFileFilter === 'FullBody') matchesMissingFile = !c.fullBodyPhotoUrl;

      return matchesSearch && matchesStatus && matchesDate && matchesJob && matchesGender && matchesReligion && matchesMissingFile;
    });
    result.sort((a, b) => {
      const dA = new Date(a.registeredAt).getTime(), dB = new Date(b.registeredAt).getTime();
      return sortOrder === 'new_to_old' ? dB - dA : dA - dB;
    });
    return result;
  }, [candidates, searchQuery, statusFilter, sortOrder, customDate, jobFilter, genderFilter, religionFilter, missingFileFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-50"><Users size={22} className="text-primary" /></div>
          Candidates Directory
        </h1>
        <p className="text-text-secondary mt-1 ml-12">Manage and track all registered candidates</p>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 space-y-4">
        {/* Top Row: Search and Basic Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-96">
            <Input placeholder="Search by Name, Passport, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="w-full md:w-40"><Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} /></div>
            <div className="w-full md:w-40">
              <Select value={statusFilter} onChange={(v) => setStatusFilter(v)} options={[{ value: '', label: 'All Statuses' }, { value: 'approved', label: 'Approved' }, { value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' }]} />
            </div>
            <div className="w-full md:w-40">
              <Select value={sortOrder} onChange={(v) => setSortOrder(v)} options={[{ value: 'new_to_old', label: 'Newest First' }, { value: 'old_to_new', label: 'Oldest First' }]} />
            </div>
          </div>
        </div>

        {/* Bottom Row: Advanced Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-start border-t border-border pt-4">
          <div className="w-full md:w-48">
            <Select placeholder="All Jobs" value={jobFilter} onChange={setJobFilter} options={[{ value: '', label: 'All Jobs' }, ...uniqueJobs]} searchable={true} />
          </div>
          <div className="w-full md:w-40">
            <Select placeholder="All Genders" value={genderFilter} onChange={setGenderFilter} options={[{ value: '', label: 'All Genders' }, { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} />
          </div>
          <div className="w-full md:w-40">
            <Select placeholder="All Religions" value={religionFilter} onChange={setReligionFilter} options={[{ value: '', label: 'All Religions' }, { value: 'muslim', label: 'Muslim' }, { value: 'christian', label: 'Christian' }, { value: 'other', label: 'Other' }]} />
          </div>
          <div className="w-full md:w-48">
            <Select 
              placeholder="Missing Documents" 
              value={missingFileFilter} 
              onChange={setMissingFileFilter} 
              options={[
                { value: '', label: 'All Documents' },
                { value: 'COC', label: 'Missing COC' },
                { value: 'Medical', label: 'Missing Medical' },
                { value: 'Passport', label: 'Missing Passport' },
                { value: 'FacePhoto', label: 'Missing Face Photo' },
                { value: 'FullBody', label: 'Missing Full Body' }
              ]} 
            />
          </div>
          {(jobFilter || genderFilter || religionFilter || statusFilter || customDate || searchQuery || missingFileFilter) && (
            <button onClick={() => { setJobFilter(''); setGenderFilter(''); setReligionFilter(''); setStatusFilter(''); setCustomDate(''); setSearchQuery(''); setMissingFileFilter(''); }} className="text-sm text-text-tertiary hover:text-danger font-medium px-3 transition-colors">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafaff] border-b border-border/50 text-[11px] uppercase tracking-[0.15em] font-bold text-text-tertiary">
                <th className="px-6 py-4 font-semibold">Shelf ID</th>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 font-semibold">Passport No.</th>
                <th className="px-6 py-4 font-semibold">Job / Skills</th>
                <th className="px-6 py-4 font-semibold">Requested</th>
                <th className="px-6 py-4 font-semibold">COC</th>
                <th className="px-6 py-4 font-semibold">Medical</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center"><div className="flex flex-col items-center gap-3"><Loader2 size={32} className="text-primary animate-spin" /><p className="text-text-tertiary">Loading candidates...</p></div></td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-danger">Error: {error}</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-action-menu]') && !(e.target as HTMLElement).closest('button')) router.push(`/candidates/${candidate.id}`); }}>
                    {/* Shelf ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono font-bold inline-block border border-gray-200 shadow-sm">
                        {candidate.shelfId || 'UNASSIGNED'}
                      </div>
                    </td>

                    {/* Candidate */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold text-sm">{candidate.passportData.givenNames.charAt(0)}{candidate.passportData.surname.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{candidate.passportData.givenNames} {candidate.passportData.surname}</p>
                          <p className="text-xs text-text-tertiary">{candidate.personalInfo.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Passport */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-text-primary">{candidate.passportData.passportNumber}</p>
                      <p className="text-xs text-text-tertiary">Exp: {new Date(candidate.passportData.dateOfExpiry).toLocaleDateString()}</p>
                    </td>

                    {/* Job/Skills */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-text-primary font-medium truncate max-w-[200px]">
                        {Array.isArray(candidate.personalInfo.workExperience) && 
                         candidate.personalInfo.workExperience.some((e: any) => e.experienceStatus === 'Have experience') 
                         ? 'Experienced' : 'Not Experienced'}
                      </p>
                      <p className="text-xs text-text-tertiary truncate max-w-[200px]">{candidate.personalInfo.skills.slice(0, 3).join(', ')}{candidate.personalInfo.skills.length > 3 ? '...' : ''}</p>
                    </td>

                    {/* Requested */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={candidate.isRequested ? 'success' : 'default'}>
                        {candidate.isRequested ? '✓ Requested' : 'Not Requested'}
                      </Badge>
                    </td>

                    {/* COC */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {candidate.cocDocumentUrl ? (
                        <button onClick={() => setViewDoc(candidate.cocDocumentUrl!)} className="text-sm text-primary hover:underline font-medium flex items-center gap-1"><Eye size={14} /> View</button>
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>

                    {/* Medical */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {candidate.medicalDocumentUrl ? (
                        <button onClick={() => setViewDoc(candidate.medicalDocumentUrl!)} className="text-sm text-emerald-600 hover:underline font-medium flex items-center gap-1"><Eye size={14} /> View</button>
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative inline-block" data-action-menu>
                        <button onClick={() => setOpenMenuId(openMenuId === candidate.id ? null : candidate.id)} className="text-text-tertiary hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary-50">
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === candidate.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 animate-fade-in">
                            <button onClick={() => toggleRequested(candidate.id, !!candidate.isRequested)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                              <CheckCircle size={16} className={candidate.isRequested ? 'text-green-500' : 'text-text-tertiary'} />
                              <span>{candidate.isRequested ? 'Remove Requested' : 'Mark as Requested'}</span>
                            </button>
                            <button onClick={() => { setOpenMenuId(null); router.push(`/registration?edit=${candidate.id}`); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                              <Edit3 size={16} className="text-text-tertiary" />
                              <span>Edit</span>
                            </button>
                            <div className="border-t border-border my-1" />
                            <button onClick={() => deleteCandidate(candidate.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left text-red-600">
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-text-tertiary">No candidates found matching your search or filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl max-h-[90vh] w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">Document Preview</h3>
              <button onClick={() => setViewDoc(null)} className="text-text-tertiary hover:text-text-primary text-xl font-bold px-2">✕</button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh]">
              {viewDoc.startsWith('data:image') || (viewDoc.startsWith('http') && !viewDoc.toLowerCase().endsWith('.pdf')) ? (
                <img src={viewDoc} alt="Document" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              ) : viewDoc.startsWith('data:application/pdf') ? (
                <iframe src={viewDoc} className="w-full h-[70vh] rounded-lg" />
              ) : viewDoc.startsWith('http') && viewDoc.toLowerCase().endsWith('.pdf') ? (
                <div className="flex flex-col items-center w-full">
                  <img src={viewDoc.replace(/\.pdf$/i, '.jpg')} alt="Document Preview" className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm border border-border mb-3" />
                  <a href={viewDoc} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Open Original PDF
                  </a>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-text-tertiary mb-2">Cannot preview this document type.</p>
                  <a href={viewDoc} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open in new tab</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
