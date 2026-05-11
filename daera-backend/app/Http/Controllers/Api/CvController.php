<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use Illuminate\Http\Request;
use Spatie\Browsershot\Browsershot;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CvController extends Controller
{
    private const TEMPLATE_MAP = [
        'tmpl-alm'        => 'CV ALM.docx',
        'tmpl-ka7'        => 'CV KA-7.docx',
        'tmpl-ku2'        => 'CV KU2.docx',
        'tmpl-ma'         => 'CV MA.docx',
        'tmpl-ra'         => 'CV RA.docx',
        'tmpl-al-shablan' => 'CV AL-Shablan.docx',
        'tmpl-ussus'      => 'CV USSUS.docx',
    ];

    public function generate(Request $request)
    {
        $candidateId = $request->input('candidateId');
        $templateId = $request->input('templateId');
        $format = $request->input('format'); // doc, pdf, jpg
        $facePhoto = $request->input('facePhoto');
        $fullBodyPhoto = $request->input('fullBodyPhoto');

        if (!$candidateId || !$templateId) {
            return response()->json(['error' => 'Missing required fields'], 400);
        }

        $candidate = Candidate::find($candidateId);
        if (!$candidate) {
            return response()->json(['error' => 'Candidate not found'], 404);
        }

        $templateFileName = self::TEMPLATE_MAP[$templateId] ?? 'CV ALM.docx';
        
        $templatePath = $this->resolveTemplatePath($templateFileName);
        
        // Graceful fallback: If specific template is missing, use ALM instead of erroring out
        if (!$templatePath) {
            \Log::warning("Template missing: {$templateFileName}. Falling back to CV ALM.docx");
            $templateFileName = 'CV ALM.docx';
            $templatePath = $this->resolveTemplatePath($templateFileName);
            
            if (!$templatePath) {
                return response()->json(['error' => "Base template file not found: CV ALM.docx"], 404);
            }
        }

        try {
            $data = $this->prepareTemplateData($candidate, $facePhoto, $fullBodyPhoto);
            
            $tempId = Str::random(10);
            $inputJsonPath = storage_path("app/temp_cv_input_{$tempId}.json");
            $outputDocxPath = storage_path("app/temp_cv_output_{$tempId}.docx");
            $outputPdfPath = storage_path("app/temp_cv_output_{$tempId}.pdf");
            $outputJpgPath = storage_path("app/temp_cv_output_{$tempId}.jpg");
            
            $templatePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $templatePath);
            $inputJsonPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $inputJsonPath);
            $outputDocxPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $outputDocxPath);

            file_put_contents($inputJsonPath, json_encode([
                'templatePath' => $templatePath,
                'outputPath' => $outputDocxPath,
                'templateId' => $templateId,
                'data' => $data
            ]));

            $scriptPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, base_path('scripts/generate_cv.cjs'));
            
            // Try to find node path or use default
            $nodePath = 'node';
            if (PHP_OS_FAMILY === 'Windows') {
                $possiblePaths = [
                    'C:\Program Files\nodejs\node.exe',
                    'C:\Program Files (x86)\nodejs\node.exe',
                ];
                foreach ($possiblePaths as $path) {
                    if (file_exists($path)) {
                        $nodePath = "\"$path\"";
                        break;
                    }
                }
            }
            
            $command = "{$nodePath} \"{$scriptPath}\" \"{$inputJsonPath}\"";
            \Log::info("Running command: {$command}");
            
            $process = \Illuminate\Support\Facades\Process::run($command);
            
            if (!$process->successful()) {
                \Log::error('Node CV Gen Error: ' . $process->errorOutput());
                return response()->json([
                    'error' => 'Generation Failed', 
                    'message' => 'Node.js process failed',
                    'details' => $process->errorOutput()
                ], 500);
            }

            \Log::info('Node CV Gen Success: ' . $process->output());

            if ($format === 'doc') {
                return response()->download($outputDocxPath, "CV_{$candidate->surname}.docx")->deleteFileAfterSend(true);
            }

            $htmlContent = file_get_contents(storage_path("app/temp_cv_output_{$tempId}.html"));
            
            $styledHtml = "
                <html>
                  <head>
                    <style>
                      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 50px; line-height: 1.6; color: #333; max-width: 800px; margin: auto; }
                      table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #ddd; }
                      th, td { text-align: left; padding: 12px; border: 1px solid #ddd; }
                      th { background-color: #f8f9fa; font-weight: 600; }
                      .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                      h1 { color: #2563eb; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                      img { max-width: 150px; height: auto; border-radius: 8px; border: 1px solid #ddd; }
                    </style>
                  </head>
                  <body>{$htmlContent}</body>
                </html>
            ";

            if ($format === 'pdf') {
                Browsershot::html($styledHtml)
                    ->format('A4')
                    ->showBackground()
                    ->save($outputPdfPath);
                    
                return response()->download($outputPdfPath, "CV_{$candidate->surname}.pdf")->deleteFileAfterSend(true);
            } else {
                Browsershot::html($styledHtml)
                    ->fullPage()
                    ->save($outputJpgPath);
                    
                return response()->download($outputJpgPath, "CV_{$candidate->surname}.jpg")->deleteFileAfterSend(true);
            }
            
        } catch (\Exception $e) {
            \Log::error('CV Generation Error Details: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate CV', 'details' => $e->getMessage()], 500);
        } finally {
            @unlink($inputJsonPath);
            @unlink(str_replace('.docx', '.html', $outputDocxPath));
            // Let deleteFileAfterSend handle the primary output files (docx, pdf, jpg)
        }
    }

    private function prepareTemplateData($candidate, $facePhoto, $fullBodyPhoto)
    {
        $skillsArray = is_array($candidate->skills) ? $candidate->skills : [];
        $langsArray = is_array($candidate->languages) ? $candidate->languages : [];

        $hasSkill = fn($keyword) => collect($skillsArray)->contains(fn($s) => Str::contains(strtolower($s), strtolower($keyword))) ? 'Yes' : 'No';
        $hasLang = fn($keyword) => collect($langsArray)->contains(fn($l) => Str::contains(strtolower($l), strtolower($keyword))) ? 'Yes' : 'No';

        $facePhotoData = $this->fetchImageAsBase64($facePhoto ?: $candidate->passport_image_url);
        $fullBodyPhotoData = $this->fetchImageAsBase64($fullBodyPhoto ?: $candidate->full_body_photo_url);
        $passportPhotoData = $this->fetchImageAsBase64($candidate->passport_image_url);

        // Generate QR Code: using passport number or full name
        $qrData = "Candidate: " . trim(($candidate->given_names ?? '') . ' ' . ($candidate->surname ?? '')) . " | Passport: " . ($candidate->passport_number ?? '');
        $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . urlencode($qrData);
        $qrCodeData = $this->fetchImageAsBase64($qrUrl);

        return [
            'givenNames' => $candidate->given_names ?? '',
            'surname' => $candidate->surname ?? '',
            'fullName' => trim(($candidate->given_names ?? '') . ' ' . ($candidate->surname ?? '')),
            'passportNumber' => $candidate->passport_number ?? '',
            'dateOfBirth' => $candidate->date_of_birth ? $candidate->date_of_birth->format('Y-m-d') : '',
            'gender' => $candidate->gender ?? '',
            'nationality' => $candidate->nationality ?? '',
            'issuingCountry' => $candidate->issuing_country ?? '',
            'dateOfIssue' => $candidate->date_of_issue ? $candidate->date_of_issue->format('Y-m-d') : '',
            'dateOfExpiry' => $candidate->date_of_expiry ? $candidate->date_of_expiry->format('Y-m-d') : '',
            'placeOfBirth' => $candidate->place_of_birth ?? '',
            'maritalStatus' => $candidate->marital_status ?? '',
            'numberOfChildren' => $candidate->number_of_children ?? '',
            'religion' => $candidate->religion ?? '',
            'bloodType' => $candidate->blood_type ?? '',
            'height' => $candidate->height ?? '',
            'weight' => $candidate->weight ?? '',
            'phone' => $candidate->phone ?? '',
            'email' => $candidate->email ?? '',
            'address' => $candidate->address ?? '',
            'city' => $candidate->city ?? '',
            'state' => $candidate->state ?? '',
            'country' => $candidate->country ?? '',
            'educationLevel' => $candidate->education_level ?? '',
            'languages' => implode(', ', $langsArray),
            'workExperience' => $candidate->work_experience ?? '',
            'skills' => implode(', ', $skillsArray),
            'medicalStatus' => $candidate->medical_status ?? '',
            'knownConditions' => $candidate->known_conditions ?? '',

            'canDoIroning' => $hasSkill('iron'),
            'canClean' => $hasSkill('clean'),
            'canDoCleaning' => $hasSkill('clean'),
            'canCook' => $hasSkill('cook'),
            'canDoCoocking' => $hasSkill('cook'),
            'canDoArabic Coocking' => $hasSkill('arabic'),
            'canWash' => $hasSkill('wash') ?: $hasSkill('laundry'),
            'canDoWashing' => $hasSkill('wash') ?: $hasSkill('laundry'),
            'canCareForBaby' => $hasSkill('baby') ?: $hasSkill('child'),
            'canDoBabySitting' => $hasSkill('baby'),
            'canDoChildrenCare' => $hasSkill('child'),
            'canCareForElderly' => $hasSkill('elder') ?: $hasSkill('old'),
            'canDrive' => $hasSkill('driv'),
            'canDoSewing' => $hasSkill('sew'),
            'haveComputerKnowledge' => $hasSkill('computer'),
            'canDoTutoring' => $hasSkill('tutor'),
            'haveOtherSkills' => $hasSkill('other'),

            'canSpeakEnglish' => $hasLang('english'),
            'canSpeakArabic' => $hasLang('arabic'),
            'canSpeakAmharic' => $hasLang('amharic'),

            'facePhoto' => $facePhotoData,
            'photo' => $facePhotoData,
            'fullBodyPhoto' => $fullBodyPhotoData,
            'passportPhoto' => $passportPhotoData,
            'passport image' => $passportPhotoData,
            'qrCode' => $qrCodeData,

            'deadline' => now()->addDays(30)->format('n/j/Y'),
            'generatedAt' => now()->format('n/j/Y'),

            'FULL_NAME' => trim(($candidate->given_names ?? '') . ' ' . ($candidate->surname ?? '')),
            'NAME_AR' => 'الاسم الكامل',
            'PASSPORT_NO' => $candidate->passport_number ?? '',
            'DOB' => $candidate->date_of_birth ? $candidate->date_of_birth->format('Y-m-d') : '',
            'NATIONALITY' => $candidate->nationality ?? '',
            'GENDER' => $candidate->gender ?? '',
            'PHONE' => $candidate->phone ?? '',
            'phoneNumber' => $candidate->phone ?? '',
            'HEIGHT' => $candidate->height ?? '',
            'WEIGHT' => $candidate->weight ?? '',
            'EXPERIENCE' => $candidate->work_experience ?? '',
            'workPeriod' => ($candidate->work_experience ?? '') ? 'Experienced' : 'Fresher',
            'position' => $candidate->job ?? '',
            'salary' => '',
            'SKILLS' => implode(', ', $skillsArray),
            'PLACE_OF_BIRTH' => $candidate->place_of_birth ?? '',
            'AGE' => $candidate->date_of_birth ? $candidate->date_of_birth->diffInYears(now()) : '',
        ];
    }

    private function resolveTemplatePath($fileName)
    {
        $paths = [
            storage_path('app/templates/' . $fileName),
            base_path('../daera/templates/' . $fileName),
            base_path('templates/' . $fileName),
        ];

        foreach ($paths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    private function fetchImageAsBase64($url)
    {
        if (!$url) return '';
        
        // Normalize the URL: if it contains the app URL, remove it to get the path
        $appUrl = config('app.url');
        if (Str::startsWith($url, $appUrl)) {
            $url = Str::after($url, $appUrl);
        }

        // Handle local storage paths (e.g. /storage/uploads/... or storage/uploads/...)
        $storagePattern = '/storage/';
        if (Str::contains($url, $storagePattern)) {
            try {
                $relativePath = Str::after($url, $storagePattern);
                $fullPath = storage_path('app/public/' . $relativePath);
                if (file_exists($fullPath)) {
                    $content = file_get_contents($fullPath);
                    return base64_encode($content);
                }
                \Log::warning("Local image file not found: " . $fullPath);
            } catch (\Exception $e) {
                \Log::error("Error reading local image: " . $e->getMessage());
            }
        }

        // Handle raw base64 data
        if (Str::contains($url, 'base64,')) {
            $parts = explode(',', $url);
            return $parts[1] ?? $url;
        }

        // Fallback for remote URLs
        if (Str::startsWith($url, 'http')) {
            try {
                // Use a timeout to avoid hanging
                $response = Http::timeout(5)->get($url);
                if ($response->successful()) {
                    return base64_encode($response->body());
                }
            } catch (\Exception $e) {
                \Log::warning("Failed to fetch remote image: " . $url);
            }
        }

        return '';
    }
}
