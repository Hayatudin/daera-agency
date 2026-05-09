'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Copy, Check, ChevronLeft, User, Briefcase, FileText } from 'lucide-react';
import Link from 'next/link';

// Reusable component for a copyable field
const CopyField = ({ label, value }: { label: string, value: string | null | undefined }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!value) return null;

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-border rounded-xl hover:border-primary/30 transition-colors group">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-text-tertiary mb-1">{label}</span>
        <span className="text-sm font-medium text-text-primary">{value}</span>
      </div>
      <button
        onClick={handleCopy}
        className={`p-2 rounded-lg transition-all ${
          copied 
            ? 'bg-success/10 text-success' 
            : 'bg-surface text-text-tertiary hover:bg-primary/10 hover:text-primary'
        }`}
        title="Copy to clipboard"
      >
        {copied ? <Check size={16} /> : <Copy size={16} className="group-hover:scale-110 transition-transform" />}
      </button>
    </div>
  );
};

export default function QuickRegistrationPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [candidate, setCandidate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/candidates/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch candidate');
        return res.json();
      })
      .then(data => {
        setCandidate(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (error || !candidate) {
    return <div className="text-center text-red-500 py-10">{error || 'Candidate not found'}</div>;
  }

  // Format dates nicely
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-GB'); // DD/MM/YYYY format is common
    } catch {
      return dateString;
    }
  };

  const experienceYears = candidate.workExperience?.reduce((total: number, exp: any) => {
    return total + (parseInt(exp.yearsOfExperience) || 0);
  }, 0) || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push('/quick-registration')}
          className="p-2 hover:bg-surface rounded-xl transition-colors border border-transparent hover:border-border"
        >
          <ChevronLeft size={24} className="text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Copy Data for Musaned</h1>
          <p className="text-text-tertiary text-sm mt-1">Click the copy icon next to any field to instantly copy it to your clipboard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Passport Data Section */}
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-border px-5 py-3 flex items-center gap-2">
            <User size={18} className="text-primary" />
            <h2 className="font-semibold text-text-primary">Passport Information</h2>
          </div>
          <div className="p-5 space-y-3">
            <CopyField label="Passport Number" value={candidate.passportNumber} />
            <CopyField label="First Name (Given Names)" value={candidate.givenNames} />
            <CopyField label="Surname" value={candidate.surname} />
            <CopyField label="Date of Birth" value={formatDate(candidate.dateOfBirth)} />
            <CopyField label="Gender" value={candidate.gender} />
            <CopyField label="Nationality" value={candidate.nationality} />
            <CopyField label="Place of Birth" value={candidate.placeOfBirth} />
            <CopyField label="Date of Issue" value={formatDate(candidate.dateOfIssue)} />
            <CopyField label="Date of Expiry" value={formatDate(candidate.dateOfExpiry)} />
            <CopyField label="Issuing Country" value={candidate.issuingCountry} />
            <CopyField label="ID Number (National ID)" value={candidate.idNumber} />
          </div>
        </div>

        {/* Personal & Experience Data Section */}
        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-border px-5 py-3 flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h2 className="font-semibold text-text-primary">Personal Details</h2>
            </div>
            <div className="p-5 space-y-3">
              <CopyField label="Marital Status" value={candidate.maritalStatus} />
              <CopyField label="Number of Children" value={candidate.numberOfChildren?.toString()} />
              <CopyField label="Religion" value={candidate.religion} />
              <CopyField label="Education Level" value={candidate.educationLevel} />
              <CopyField label="Height" value={candidate.height} />
              <CopyField label="Weight" value={candidate.weight} />
              <CopyField label="Blood Type" value={candidate.bloodType} />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-border px-5 py-3 flex items-center gap-2">
              <Briefcase size={18} className="text-primary" />
              <h2 className="font-semibold text-text-primary">Skills & Experience</h2>
            </div>
            <div className="p-5 space-y-3">
              <CopyField label="Total Years of Experience" value={experienceYears > 0 ? experienceYears.toString() : '0'} />
              <CopyField label="Languages" value={candidate.languages?.join(', ')} />
              <CopyField label="Skills" value={candidate.skills?.join(', ')} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <Link 
          href="/quick-registration"
          className="px-6 py-3 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors"
        >
          Register Another Candidate
        </Link>
      </div>
    </div>
  );
}
