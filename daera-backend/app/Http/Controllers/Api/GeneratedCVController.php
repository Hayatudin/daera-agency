<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\GeneratedCV;
use App\Services\UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GeneratedCVController extends Controller
{
    protected UploadService $upload;

    public function __construct(UploadService $upload)
    {
        $this->upload = $upload;
        
        // Self-healing migration check: Ensure visa_status column exists
        try {
            if (!\Illuminate\Support\Facades\Schema::hasColumn('candidates', 'visa_status')) {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE candidates ADD COLUMN visa_status VARCHAR(255) DEFAULT 'Pending' AFTER is_requested");
                \Log::info('Database updated: Added visa_status column to candidates table');
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to auto-add visa_status column: ' . $e->getMessage());
        }
    }

    public function index()
    {
        try {
            $generatedCVs = GeneratedCV::with('candidate')
                ->orderBy('created_at', 'desc')
                ->get();
            
            return response()->json($generatedCVs->map(fn($cv) => $this->formatCV($cv)));
        } catch (\Exception $e) {
            \Log::error('Error fetching generated CVs: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch generated CVs'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $candidateId = $request->input('candidateId');
            $templateId = $request->input('templateId');
            $facePhotoUrl = $request->input('facePhotoUrl');
            $fullBodyPhotoUrl = $request->input('fullBodyPhotoUrl');
            
            if (!$candidateId || !$templateId) {
                return response()->json(['error' => 'Missing candidateId or templateId'], 400);
            }
            
            $candidate = Candidate::find($candidateId);
            if (!$candidate) {
                return response()->json(['error' => 'Candidate not found'], 404);
            }

            $duplicateCV = GeneratedCV::where('candidate_id', $candidateId)->first();
            if ($duplicateCV) {
                return response()->json([
                    'error' => 'Candidate already generated', 
                    'templateId' => $duplicateCV->template_id 
                ], 409);
            }
            
            $faceUrl = $this->upload->upload($facePhotoUrl, 'faces');
            $fullBodyUrl = $this->upload->upload($fullBodyPhotoUrl, 'fullbody');

            $deadline = now()->addDays(30);

            \DB::beginTransaction();
            try {
                $generatedCV = GeneratedCV::create([
                    'id' => Str::random(25),
                    'candidate_id' => $candidateId,
                    'template_id' => $templateId,
                    'face_photo_url' => $faceUrl,
                    'full_body_photo_url' => $fullBodyUrl
                ]);

                $candidate->update(['cv_deadline' => $deadline]);
                \DB::commit();

                return response()->json($this->formatCV($generatedCV), 201);
            } catch (\Exception $e) {
                \DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            \Log::error('Error saving generated CV: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save generated CV'], 500);
        }
    }

    public function update(Request $request, string $id)
    {
        try {
            $templateId = $request->input('templateId');
            
            if (!$templateId) {
                return response()->json(['error' => 'Missing templateId'], 400);
            }
            
            $existingCV = GeneratedCV::find($id);
            if (!$existingCV) {
                return response()->json(['error' => 'Generated CV not found'], 404);
            }

            $duplicateCV = GeneratedCV::where('candidate_id', $existingCV->candidate_id)
                ->where('template_id', $templateId)
                ->where('id', '!=', $id)
                ->first();

            if ($duplicateCV) {
                return response()->json(['error' => 'Candidate already generated in that template'], 409);
            }

            $existingCV->update(['template_id' => $templateId]);
            
            return response()->json($this->formatCV($existingCV));
        } catch (\Exception $e) {
            \Log::error('Error updating generated CV: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update generated CV'], 500);
        }
    }

    public function destroy(string $id)
    {
        try {
            GeneratedCV::where('id', $id)->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            \Log::error('Error deleting generated CV: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete generated CV'], 500);
        }
    }

    private function formatCV(GeneratedCV $cv): array
    {
        $c = $cv->candidate;
        return [
            'id' => $cv->id,
            'candidateId' => $cv->candidate_id,
            'templateId' => $cv->template_id,
            'facePhotoUrl' => $cv->face_photo_url,
            'fullBodyPhotoUrl' => $cv->full_body_photo_url,
            'createdAt' => $cv->created_at?->toIso8601String(),
            'updatedAt' => $cv->updated_at?->toIso8601String(),
            'candidate' => $c ? [
                'id' => $c->id,
                'givenNames' => $c->given_names,
                'surname' => $c->surname,
                'passportNumber' => $c->passport_number,
                'isRequested' => (bool)$c->is_requested,
                'visaStatus' => $c->visa_status ?? ($c->is_requested ? 'Selected' : 'Pending'),
                'medicalStatus' => $c->medical_status,
                'facePhotoUrl' => $c->face_photo_url,
                'passportImageUrl' => $c->passport_image_url,
                'fullBodyPhotoUrl' => $c->full_body_photo_url,
                'religion' => $c->religion,
            ] : null
        ];
    }
}
