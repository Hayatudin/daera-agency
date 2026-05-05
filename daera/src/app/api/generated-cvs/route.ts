import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(fileString: string | null | undefined, folder: string) {
  if (!fileString || !fileString.startsWith('data:image')) return fileString;
  try {
    const result = await cloudinary.uploader.upload(fileString, {
      folder: `daera/${folder}`,
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (err) {
    console.error(`Cloudinary upload error for ${folder}:`, err);
    return null;
  }
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const generatedCVs = await prisma.generatedCV.findMany({
      include: {
        candidate: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(generatedCVs);
  } catch (error) {
    console.error('Error fetching generated CVs:', error);
    return NextResponse.json({ error: 'Failed to fetch generated CVs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { candidateId, templateId, facePhotoUrl, fullBodyPhotoUrl } = await request.json();
    
    if (!candidateId || !templateId) {
      return NextResponse.json({ error: 'Missing candidateId or templateId' }, { status: 400 });
    }
    
    // Check if candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });
    
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Check if the candidate already has a CV in the target template
    const duplicateCV = await prisma.generatedCV.findFirst({
      where: {
        candidateId: candidateId,
        templateId: templateId
      }
    });

    if (duplicateCV) {
      return NextResponse.json({ error: 'Candidate already generated in that template' }, { status: 409 });
    }
    
    // Upload photos to Cloudinary if they are base64
    const [faceUrl, fullBodyUrl] = await Promise.all([
      uploadToCloudinary(facePhotoUrl, 'faces'),
      uploadToCloudinary(fullBodyPhotoUrl, 'fullbody')
    ]);

    // Create new generated CV record
    const generatedCV = await prisma.generatedCV.create({
      data: {
        candidateId,
        templateId,
        facePhotoUrl: faceUrl,
        fullBodyPhotoUrl: fullBodyUrl
      }
    });
    
    return NextResponse.json(generatedCV);
  } catch (error) {
    console.error('Error saving generated CV:', error);
    return NextResponse.json({ error: 'Failed to save generated CV' }, { status: 500 });
  }
}
