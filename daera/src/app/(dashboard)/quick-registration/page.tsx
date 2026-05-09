'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PassportData, CandidatePersonalInfo } from '@/types';
import PassportUploader from '@/components/registration/PassportUploader';
import PassportDataFields from '@/components/registration/PassportDataFields';
import PersonalInfoForm from '@/components/registration/PersonalInfoForm';
import { compressImage } from '@/lib/utils';
import { Save, Loader2 } from 'lucide-react';

const emptyPassportData: PassportData = {
  passportNumber: '', surname: '', givenNames: '', dateOfBirth: '',
  gender: '', nationality: '', issuingCountry: '',
  dateOfIssue: '', dateOfExpiry: '', placeOfBirth: '',
};

const emptyPersonalInfo: CandidatePersonalInfo = {
  idNumber: '', job: '', maritalStatus: '', numberOfChildren: 0, religion: '', bloodType: '',
  height: '', weight: '', phone: '', email: '', address: '', city: '',
  state: '', country: '', educationLevel: '', languages: [],
  workExperience: [], skills: [], medicalStatus: 'Pending', knownConditions: '',
  additionalPhones: [], emergencyContactName: '', emergencyContactRelation: '',
  emergencyContactPhone: '', emergencyContactAddress: '',
};

export default function QuickRegistrationPage() {
  const router = useRouter();
  
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [passportData, setPassportData] = useState<PassportData>(emptyPassportData);
  const [personalInfo, setPersonalInfo] = useState<CandidatePersonalInfo>(emptyPersonalInfo);
  
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrComplete, setOcrComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brokers, setBrokers] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    fetch('/api/brokers')
      .then(res => res.json())
      .then(data => setBrokers(data))
      .catch(err => console.error('Failed to fetch brokers', err));
  }, []);

  const handlePassportUpload = async (imageUrl: string) => {
    setPassportImage(imageUrl);
    setIsOcrProcessing(true);
    setOcrProgress(10);
    setError(null);

    try {
      setOcrProgress(40);
      const response = await fetch('/api/ocr/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageUrl }),
      });

      setOcrProgress(80);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to parse passport data');

      setPassportData(prev => ({ ...prev, ...data }));
      setPersonalInfo(prev => ({ ...prev, idNumber: data.passportNumber || prev.idNumber }));
      setOcrProgress(100);
      setOcrComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to scan passport');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handlePassportChange = (field: keyof PassportData, value: string) => {
    setPassportData(prev => ({ ...prev, [field]: value }));
  };

  const handlePersonalInfoChange = (field: keyof CandidatePersonalInfo, value: any) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!passportData.passportNumber || !passportData.surname || !passportData.givenNames) {
      setError('Passport Number, Surname, and Given Names are required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const compressedPassport = passportImage ? await compressImage(passportImage, 1200, 0.7) : null;

      const cleanPersonalInfo = {
        ...personalInfo,
        numberOfChildren: parseInt(personalInfo.numberOfChildren as any) || 0,
        brokerId: personalInfo.brokerId || null,
      };

      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passportData,
          personalInfo: cleanPersonalInfo,
          passportImageUrl: compressedPassport,
          status: 'pending',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save candidate');
      }

      const data = await response.json();
      
      // Redirect to the specialized preview page
      router.push(`/quick-registration/preview/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Quick Registration</h1>
          <p className="text-text-tertiary mt-2">Instantly scan passports and register walk-in candidates.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2">
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* STEP 1: Scan Passport */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">1. Scan Passport</h2>
        </div>
        <div className="p-6">
          <PassportUploader
            onImageUploaded={handlePassportUpload}
            isProcessing={isOcrProcessing}
            processingComplete={ocrComplete}
            passportImage={passportImage}
            ocrProgress={ocrProgress}
          />
          {passportImage && (
            <div className="mt-6 border-t border-border pt-6">
              <PassportDataFields 
                data={passportData} 
                onChange={handlePassportChange} 
                animatingFields={new Set()} 
                isExtracted={ocrComplete} 
              />
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: Remaining Information */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">2. Additional Information</h2>
        </div>
        <div className="p-6">
          <PersonalInfoForm
            data={personalInfo}
            onChange={handlePersonalInfoChange}
            passportData={passportData}
            onPassportChange={handlePassportChange}
            passportImage={passportImage}
            brokers={brokers}
          />
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-border p-4 z-40 md:pl-64">
        <div className="max-w-4xl mx-auto flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSubmitting || !passportImage}
            className="px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving Candidate...
              </>
            ) : (
              <>
                <Save size={18} />
                Save & Continue to Copy Page
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
