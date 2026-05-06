import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function uploadToLocal(fileString: string | null | undefined, folder: string) {
  if (!fileString) return null;
  
  // If it's already a URL (e.g. from existing DB records or previous uploads), just return it
  if (fileString.startsWith('http') || fileString.startsWith('/uploads')) return fileString;

  try {
    // Expected format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
    let base64Data = fileString;
    let extension = 'bin';

    if (fileString.startsWith('data:')) {
      const matches = fileString.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        base64Data = matches[2];
        extension = mimeType.split('/')[1] || 'bin';
        if (extension === 'jpeg') extension = 'jpg';
      } else {
        base64Data = fileString.split(',')[1] || fileString;
      }
    } else {
      // Default to jpg if it's raw base64
      extension = 'jpg';
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
    
    // Create folder path: public/uploads/{folder}
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    
    // Return relative URL for Next.js to serve from /public
    return `/uploads/${folder}/${fileName}`;
  } catch (err) {
    console.error(`Local upload error for ${folder}:`, err);
    return null;
  }
}
