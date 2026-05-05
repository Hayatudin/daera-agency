'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { DownloadFormat, Candidate } from '@/types';
import CandidateSelector from '@/components/cv-generator/CandidateSelector';
import FileUpload from '@/components/ui/FileUpload';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle2, User, Camera, Calendar, Bell, Printer, Download, ChevronDown, FileDown, Image as ImageIcon } from 'lucide-react';
import TemplateGrid from '@/components/cv-generator/TemplateGrid';
import ALMTemplate from '@/components/cv/templates/ALMTemplate';
import KA7Template from '@/components/cv/templates/KA7Template';
import KU2Template from '@/components/cv/templates/KU2Template';
import MATemplate from '@/components/cv/templates/MATemplate';
import RATemplate from '@/components/cv/templates/RATemplate';
import AlShablanTemplate from '@/components/cv/templates/AlShablanTemplate';
import UssusTemplate from '@/components/cv/templates/UssusTemplate';
import Button from '@/components/ui/Button';

const TEMPLATES: any[] = [
  { id: 'ussus', name: 'USSUS Layout', category: 'minimal', description: 'USSUS template layout', thumbnail: '/Ussus.png' },
  { id: 'al-shablan', name: 'AL-Shablan', category: 'elegant', description: 'AL-Shablan template layout', thumbnail: '/Al-shablan.png' },
  { id: 'alm', name: 'ALM Agency', category: 'classic', description: 'Standard ALM CV layout', thumbnail: '/header.png' },
  { id: 'ka7', name: 'KA-7 Layout', category: 'professional', description: 'KA-7 template format', thumbnail: '/KA-7.png' },
  { id: 'ku2', name: 'KU-2 Format', category: 'minimal', description: 'Clean KU-2 design', thumbnail: '/KU2.png' },
  { id: 'ma', name: 'MA Standard', category: 'modern', description: 'Modern MA CV style', thumbnail: '/MA.png' },
  { id: 'ra', name: 'RA Custom', category: 'elegant', description: 'Elegant RA layout', thumbnail: '/RA-1.png' },
];

import { useCandidates } from '@/hooks/useCandidates';

export default function CVGeneratorPage() {
  const searchParams = useSearchParams();
  const urlCandidateId = searchParams.get('candidateId');

  const { candidates, isLoading, mutate: setCandidates } = useCandidates();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(urlCandidateId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('alm');
  const [fullBodyPhoto, setFullBodyPhoto] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string>('');
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Ref for the CV container to print or capture
  const cvRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Auto-select if candidateId was passed via URL and exists in data
    if (urlCandidateId && candidates.length > 0 && !selectedCandidateId) {
      if (candidates.some((c: Candidate) => c.id === urlCandidateId)) {
        setSelectedCandidateId(urlCandidateId);
      }
    }
  }, [urlCandidateId, candidates, selectedCandidateId]);

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId) || null;

  React.useEffect(() => {
    if (selectedCandidate) {
      setDeadline(selectedCandidate.cvDeadline || '');
    } else {
      setDeadline('');
    }
  }, [selectedCandidate]);

  // Auto-pull face photo from the selected candidate's passport image
  const facePhoto = selectedCandidate?.facePhotoUrl || selectedCandidate?.passportImageUrl || null;

  const handleBodyUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setFullBodyPhoto(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Only update local state on change — don't save yet (calendar navigation fires onChange too)
  const handleDeadlineChange = (newDeadline: string) => {
    setDeadline(newDeadline);
  };

  // Save to DB only when user finishes picking (on blur) or when a valid date is confirmed
  const saveDeadline = async (dateValue: string) => {
    if (!selectedCandidateId) return;
    
    // Only save if we have a complete, valid YYYY-MM-DD date string
    if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return;
    
    // Don't re-save if the value hasn't changed from what's already in the DB
    const currentCandidate = candidates.find(c => c.id === selectedCandidateId);
    if (currentCandidate?.cvDeadline === dateValue) return;
    
    setIsSavingDeadline(true);
    try {
      const res = await fetch(`/api/candidates/${selectedCandidateId}/deadline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: dateValue }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || 'Failed to save deadline');
      }
      
      // Update local candidates state so it persists if we switch back and forth
      setCandidates(prev => prev.map(c => 
        c.id === selectedCandidateId ? { ...c, cvDeadline: dateValue } : c
      ));
      
      setToast('Deadline saved successfully');
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error('Error saving deadline:', err);
      setToast(err instanceof Error ? err.message : 'Failed to save deadline');
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsSavingDeadline(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'jpg' | 'doc') => {
    if (!cvRef.current || !selectedCandidate) return;

    setIsDownloading(true);
    setIsDownloadOpen(false);

    try {
      const htmlToImage = await import('html-to-image');
      
      // Fix: Ensure surname is safely extracted and sanitized for filename
      const rawSurname = selectedCandidate.passportData?.surname || 'Candidate';
      const safeSurname = rawSurname.replace(/[^a-zA-Z0-9]/g, '');
      const fileName = `CV_${safeSurname}_${selectedTemplateId.toUpperCase()}`;

      // Temporarily expand container to capture full height
      const originalHeight = cvRef.current.style.height;
      const originalOverflow = cvRef.current.style.overflow;
      cvRef.current.style.height = 'auto';
      cvRef.current.style.overflow = 'visible';

      const dataUrl = await htmlToImage.toJpeg(cvRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // High resolution
      });

      // Restore styles
      cvRef.current.style.height = originalHeight;
      cvRef.current.style.overflow = originalOverflow;

      // Helper function for safe blob download
      const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Critical: Delay cleanup so browser download manager has time to read the 'download' attribute
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 2000);
      };

      if (format === 'jpg') {
        // Convert large dataUrl to blob to avoid Chrome URL length limits which break the 'download' attribute
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        downloadBlob(blob, `${fileName}.jpg`);
        setToast('CV Downloaded as JPG');
      } 
      else if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(dataUrl);
        const ratio = imgProps.width / pdfWidth;
        const totalHeightInMm = imgProps.height / ratio;

        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, totalHeightInMm);

        if (totalHeightInMm > pdfHeight + 10) {
          pdf.addPage();
          pdf.addImage(dataUrl, 'JPEG', 0, -297, pdfWidth, totalHeightInMm);
        }
        
        const pdfBlob = pdf.output('blob');
        downloadBlob(pdfBlob, `${fileName}.pdf`);
        setToast('CV Downloaded as PDF');
      }
      else if (format === 'doc') {
        const payload = {
          candidateId: selectedCandidateId,
          templateId: `tmpl-${selectedTemplateId}`,
          format: 'doc',
          deadline,
          facePhoto,
          fullBodyPhoto
        };

        const response = await fetch('/api/cv/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to generate DOCX');

        const blob = await response.blob();
        downloadBlob(blob, `${fileName}.docx`);
        setToast('Editable DOCX Downloaded!');
      }
      
      // Auto-save the generated CV to the database
      try {
        const saveRes = await fetch('/api/generated-cvs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: selectedCandidateId,
            templateId: selectedTemplateId,
            facePhotoUrl: facePhoto,
            fullBodyPhotoUrl: fullBodyPhoto
          })
        });
        
        if (saveRes.status === 409) {
          setToast('Candidate already generated in that template');
        } else if (!saveRes.ok) {
           const errText = await saveRes.text();
           throw new Error(`Status ${saveRes.status}: ${errText}`);
        }
      } catch (saveErr) {
        console.error('Failed to auto-save generated CV:', saveErr);
        // Don't show error to user since download succeeded
      }
      
    } catch (err) {
      console.error('Download Error:', err);
      alert('Failed to generate file. Please try again.');
    } finally {
      setIsDownloading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const isReady = selectedCandidate !== null;

  return (
    <div className="print:bg-white print:m-0 print:p-0">
      {/* Hide everything except CV when printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cv-print-area, #cv-print-area * {
            visibility: visible !important;
          }
          #cv-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50">
              <FileText size={22} className="text-primary" />
            </div>
            CV Generator
          </h1>
          <p className="text-text-secondary mt-1 ml-12">Generate professional CVs using your Word templates</p>
        </div>
        {isReady && (
          <div className="relative print:hidden">
            <Button 
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              className="flex items-center gap-2"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {isDownloading ? 'Generating...' : 'Download CV'}
              <ChevronDown size={16} className={cn("transition-transform", isDownloadOpen && "rotate-180")} />
            </Button>

            {isDownloadOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => handleDownload('pdf')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors text-left text-sm font-medium text-text-primary"
                >
                  <FileText size={16} className="text-red-500" />
                  Download as PDF
                </button>
                <button
                  onClick={() => handleDownload('jpg')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors text-left text-sm font-medium text-text-primary border-t border-border"
                >
                  <ImageIcon size={16} className="text-emerald-500" />
                  Download as JPG
                </button>
                <button
                  onClick={() => handleDownload('doc')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors text-left text-sm font-medium text-text-primary border-t border-border"
                >
                  <FileDown size={16} className="text-blue-500" />
                  Download as DOCX
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Panel - Controls */}
        <div className="xl:col-span-2 space-y-6 print:hidden">
          {/* Candidate Selection Card */}
          <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-primary" />
              <h2 className="font-semibold text-text-primary">Candidate</h2>
            </div>
            <CandidateSelector
              candidates={candidates}
              selectedId={selectedCandidateId}
              onSelect={setSelectedCandidateId}
            />
          </div>

          {/* Photo Upload Card */}
          <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Camera size={16} className="text-primary" />
              <h2 className="font-semibold text-text-primary">Photos</h2>
            </div>
            
            {/* Face photo auto-pulled from profile */}
            {facePhoto && (
              <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-700 font-medium mb-2">✓ Face photo loaded from profile</p>
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-200 mx-auto">
                  <img src={facePhoto} alt="Face" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            <FileUpload
              label="Full Body Photo"
              onFileSelect={handleBodyUpload}
              preview={fullBodyPhoto}
              onClear={() => setFullBodyPhoto(null)}
              compact
              helperText="Standing pose"
            />
          </div>

          {/* Application Details Card */}
          <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-primary" />
              <h2 className="font-semibold text-text-primary">Application Settings</h2>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-2">CV Deadline</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                value={deadline}
                onChange={(e) => handleDeadlineChange(e.target.value)}
                onBlur={(e) => saveDeadline(e.target.value)}
                disabled={isSavingDeadline}
              />
              {isSavingDeadline && (
                <p className="text-xs text-text-tertiary mt-1 animate-pulse">Saving deadline...</p>
              )}
              {deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) && !isSavingDeadline && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <Bell size={14} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">
                    System will notify via Telegram regarding this CV application on <strong>{new Date(deadline + 'T00:00:00').toLocaleDateString()}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Template Selection Card */}
          <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <TemplateGrid
              templates={TEMPLATES}
              selectedId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
          </div>
        </div>

        {/* Right Panel - CV Preview */}
        <div className="xl:col-span-3">
          <div className="bg-surface rounded-[1.5rem] border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text-primary">Live CV Layout Preview</h2>
              {isReady && (
                <span className="px-2.5 py-0.5 bg-success-light text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ready
                </span>
              )}
            </div>

            <div className="border border-border rounded-xl overflow-hidden shadow-inner bg-gray-100 p-4">
              <div className="max-w-[800px] mx-auto shadow-2xl overflow-hidden">
                <div id="cv-print-area" ref={cvRef}>
                  {selectedCandidate ? (
                    <>
                      {selectedTemplateId === 'ussus' && <UssusTemplate candidate={selectedCandidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />}
                      {selectedTemplateId === 'al-shablan' && <AlShablanTemplate candidate={selectedCandidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />}
                      {selectedTemplateId === 'alm' && <ALMTemplate candidate={selectedCandidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />}
                      {selectedTemplateId === 'ka7' && <KA7Template candidate={selectedCandidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />}
                      {selectedTemplateId === 'ku2' && <KU2Template candidate={selectedCandidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />}
                      {selectedTemplateId === 'ma' && <MATemplate candidate={selectedCandidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />}
                      {selectedTemplateId === 'ra' && <RATemplate candidate={selectedCandidate} facePhoto={facePhoto} fullBodyPhoto={fullBodyPhoto} />}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white min-h-[700px] print:hidden">
                      <div className="w-20 h-20 rounded-2xl bg-lavender-dark flex items-center justify-center mb-4">
                        <FileText size={32} className="text-primary/40" />
                      </div>
                      <h3 className="text-lg font-medium text-text-primary mb-1">Select a Candidate</h3>
                      <p className="text-sm text-text-tertiary max-w-sm px-10">
                        Choose a candidate from the left to generate their perfect CV template.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast print:hidden">
          <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl">
            <CheckCircle2 size={18} className="text-success" />
            <span className="text-sm font-medium">{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
