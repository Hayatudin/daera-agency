const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const mockCandidates = [
  {
    id: 'CND-001',
    shelfId: '1045',
    passportNumber: 'EP4821937',
    surname: 'MOHAMMED',
    givenNames: 'AMINA HASSAN',
    dateOfBirth: new Date('1995-03-15'),
    gender: 'Female',
    nationality: 'Ethiopian',
    issuingCountry: 'Ethiopia',
    dateOfIssue: new Date('2023-01-10'),
    dateOfExpiry: new Date('2028-01-09'),
    placeOfBirth: 'Addis Ababa',
    maritalStatus: 'Single',
    numberOfChildren: 0,
    religion: 'Islam',
    bloodType: 'O+',
    height: '162 cm',
    weight: '55 kg',
    phone: '+251912345678',
    email: 'amina.hassan@email.com',
    address: '123 Bole Road',
    city: 'Addis Ababa',
    state: 'Addis Ababa',
    country: 'Ethiopia',
    educationLevel: 'High School',
    languages: ['Amharic', 'English', 'Arabic'],
    workExperience: '3 years as household helper in Dubai',
    skills: ['Cooking', 'Cleaning', 'Childcare', 'Laundry'],
    medicalStatus: 'Fit',
    biometricStatus: 'Completed',
    medicalDate: new Date('2026-04-18'),
    biometricDate: new Date('2026-04-19'),
    knownConditions: 'None',
    emergencyContactName: 'Hassan Mohammed',
    emergencyContactRelation: 'Father',
    emergencyContactPhone: '+251911234567',
    registeredAt: new Date('2026-04-20T10:30:00Z'),
    status: 'approved',
  }
];

const mockRequests = [
  {
    id: 'req-1',
    contractNumber: '2005095494',
    visaNumber: '1907975147',
    employerName: '1068544269 - MOHAMMED ALOTAIBI',
    employerId: '1068544269',
    candidateName: 'KORSO SIMALE FEYISO',
    job: 'House Maid',
    nationality: 'Ethiopia',
    proName: 'Alshablan Recruitment Company',
    paymentStatus: 'Unpaid',
    creationDate: new Date('2026-04-21 16:54'),
    status: 'EPRO APPROVAL',
    tafweedStatus: 'Verified',
    tafweedDate: new Date('2026-04-22 10:00'),
  }
];

async function main() {
  console.log('Start seeding...');
  
  for (const c of mockCandidates) {
    await prisma.candidate.upsert({
      where: { passportNumber: c.passportNumber },
      update: {},
      create: c,
    });
  }
  
  for (const r of mockRequests) {
    await prisma.employmentRequest.upsert({
      where: { contractNumber: r.contractNumber },
      update: {},
      create: r,
    });
  }
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
