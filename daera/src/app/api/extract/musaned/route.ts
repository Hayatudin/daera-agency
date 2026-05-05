import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { parseMusanedText } from '@/lib/parsers/musaned';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Read the PDF
    const pdfData = await pdfParse(buffer);
    
    // Debug: Log the raw extracted text
    console.log('=== RAW PDF TEXT ===');
    console.log(pdfData.text);
    console.log('=== END RAW TEXT ===');
    
    // Parse the extracted text
    const extractedData = parseMusanedText(pdfData.text);
    
    // Debug: Log what was extracted
    console.log('=== EXTRACTED DATA ===');
    console.log(JSON.stringify(extractedData, null, 2));
    console.log('=== END EXTRACTED ===');

    return NextResponse.json({
      success: true,
      rawText: pdfData.text,
      data: extractedData
    });

  } catch (error: any) {
    console.error('Error extracting Musaned PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process the PDF document. Please ensure it is a valid Musaned export.' },
      { status: 500 }
    );
  }
}
