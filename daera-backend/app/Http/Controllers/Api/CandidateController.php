<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Services\UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CandidateController extends Controller
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
            $dbCandidates = Candidate::with(['generatedCVs:id,candidate_id,template_id'])
                ->orderBy('registered_at', 'desc')
                ->get();

            $candidates = $dbCandidates->map(function ($c) {
                return $this->formatCandidate($c);
            });

            return response()->json($candidates);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch candidates: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch candidates'], 500);
        }
    }

    public function show(string $id)
    {
        try {
            $c = Candidate::with(['broker', 'generatedCVs' => fn($q) => $q->orderBy('created_at', 'desc')->limit(1)])
                ->find($id);

            if (!$c) {
                return response()->json(['error' => 'Not found'], 404);
            }

            $result = $this->formatCandidate($c);
            $result['broker'] = $c->broker;
            $result['latestCVTemplate'] = $c->generatedCVs->first()?->template_id ?? null;

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $body = $request->all();

            \Log::info('Starting candidate registration process');
            
            $passportImageUrl   = $this->upload->upload(data_get($body, 'passportImageUrl'), 'passports');
            $facePhotoUrl       = $this->upload->upload(data_get($body, 'facePhotoUrl'), 'faces');
            $fullBodyPhotoUrl   = $this->upload->upload(data_get($body, 'fullBodyPhotoUrl'), 'fullbody');
            $cocDocumentUrl     = $this->upload->upload(data_get($body, 'personalInfo.cocDocumentUrl'), 'coc');
            $medicalDocumentUrl = $this->upload->upload(data_get($body, 'personalInfo.medicalDocumentUrl'), 'medical');
            $candidateIdImageUrl = $this->upload->upload(data_get($body, 'personalInfo.candidateIdImageUrl'), 'candidate-id');
            $relativeIdImageUrl = $this->upload->upload(data_get($body, 'personalInfo.relativeIdImageUrl'), 'relative-id');
            $labourIdUrl        = $this->upload->upload(data_get($body, 'personalInfo.labourIdUrl'), 'labour-id');

            \Log::info('Image uploads completed');

            $maxShelfId = Candidate::max('shelf_id');
            $nextShelfId = $body['shelfId'] ?? str_pad((int)$maxShelfId + 1, 3, '0', STR_PAD_LEFT);
            
            \Log::info('Shelf ID generated: ' . $nextShelfId);

            $brokerId = data_get($body, 'personalInfo.brokerId');
            if ($brokerId && $brokerId !== 'undefined' && !\App\Models\Broker::where('id', $brokerId)->exists()) {
                \Log::warning('Broker ID does not exist: ' . $brokerId);
                $brokerId = null;
            }

            $candidate = Candidate::create([
                'id'              => Str::random(25),
                'shelf_id'        => $nextShelfId,
                'passport_number' => data_get($body, 'passportData.passportNumber', ''),
                'surname'         => data_get($body, 'passportData.surname', ''),
                'given_names'     => data_get($body, 'passportData.givenNames', ''),
                'date_of_birth'   => !empty(data_get($body, 'passportData.dateOfBirth')) ? data_get($body, 'passportData.dateOfBirth') : null,
                'gender'          => data_get($body, 'passportData.gender'),
                'nationality'     => data_get($body, 'passportData.nationality'),
                'issuing_country' => data_get($body, 'passportData.issuingCountry'),
                'date_of_issue'   => !empty(data_get($body, 'passportData.dateOfIssue')) ? data_get($body, 'passportData.dateOfIssue') : null,
                'date_of_expiry'  => !empty(data_get($body, 'passportData.dateOfExpiry')) ? data_get($body, 'passportData.dateOfExpiry') : null,
                'place_of_birth'  => data_get($body, 'passportData.placeOfBirth'),

                'id_number'       => data_get($body, 'personalInfo.idNumber'),
                'job'             => data_get($body, 'personalInfo.job'),
                'marital_status'  => data_get($body, 'personalInfo.maritalStatus'),
                'number_of_children' => (int)data_get($body, 'personalInfo.numberOfChildren', 0),
                'religion'        => data_get($body, 'personalInfo.religion'),
                'blood_type'      => data_get($body, 'personalInfo.bloodType'),
                'height'          => data_get($body, 'personalInfo.height'),
                'weight'          => data_get($body, 'personalInfo.weight'),
                'phone'           => data_get($body, 'personalInfo.phone'),
                'email'           => data_get($body, 'personalInfo.email'),
                'address'         => data_get($body, 'personalInfo.address'),
                'city'            => data_get($body, 'personalInfo.city'),
                'state'           => data_get($body, 'personalInfo.state'),
                'country'         => data_get($body, 'personalInfo.country'),
                'education_level' => data_get($body, 'personalInfo.educationLevel'),
                'languages'       => data_get($body, 'personalInfo.languages'),
                'work_experience' => data_get($body, 'personalInfo.workExperience'),
                'skills'          => data_get($body, 'personalInfo.skills'),
                'medical_status'  => data_get($body, 'personalInfo.medicalStatus', 'Pending'),
                'biometric_status' => data_get($body, 'personalInfo.biometricStatus', 'Pending'),
                'medical_date'    => !empty(data_get($body, 'personalInfo.medicalDate')) ? data_get($body, 'personalInfo.medicalDate') : null,
                'biometric_date'  => !empty(data_get($body, 'personalInfo.biometricDate')) ? data_get($body, 'personalInfo.biometricDate') : null,
                'known_conditions' => data_get($body, 'personalInfo.knownConditions'),
                'emergency_contact_name'     => data_get($body, 'personalInfo.emergencyContactName'),
                'emergency_contact_relation' => data_get($body, 'personalInfo.emergencyContactRelation'),
                'emergency_contact_phone'    => data_get($body, 'personalInfo.emergencyContactPhone'),
                'emergency_contact_address'  => data_get($body, 'personalInfo.emergencyContactAddress'),
                'additional_phones' => data_get($body, 'personalInfo.additionalPhones', []),
                'broker_id'       => $brokerId,

                'passport_image_url'    => $passportImageUrl,
                'face_photo_url'        => $facePhotoUrl,
                'full_body_photo_url'   => $fullBodyPhotoUrl,
                'coc_document_url'      => $cocDocumentUrl,
                'medical_document_url'  => $medicalDocumentUrl,
                'candidate_id_image_url' => $candidateIdImageUrl,
                'relative_id_image_url' => $relativeIdImageUrl,
                'labour_id_url'         => $labourIdUrl,
                'video_url'             => data_get($body, 'videoUrl'),
                'status'                => data_get($body, 'status', 'pending'),
                'visa_status'           => 'Pending',
                'registered_at'         => now(),
            ]);

            \Log::info('Candidate record created successfully: ' . $candidate->id);
            return response()->json($candidate, 201);
        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('Registration SQL error: ' . $e->getMessage());
            if (isset($e->errorInfo) && $e->errorInfo[1] == 1062) {
                return response()->json(['error' => 'A candidate with this Passport Number already exists.'], 400);
            }
            return response()->json(['error' => 'Database error: ' . $e->getMessage()], 500);
        } catch (\Exception $e) {
            \Log::error('Registration general error: ' . $e->getMessage());
            return response()->json(['error' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, string $id)
    {
        try {
            $body = $request->all();

            $passportImageUrl   = $this->upload->upload($body['passportImageUrl'] ?? null, 'passports');
            $facePhotoUrl       = $this->upload->upload($body['facePhotoUrl'] ?? null, 'faces');
            $fullBodyPhotoUrl   = $this->upload->upload($body['fullBodyPhotoUrl'] ?? null, 'fullbody');
            $cocDocumentUrl     = $this->upload->upload($body['personalInfo']['cocDocumentUrl'] ?? null, 'coc');
            $medicalDocumentUrl = $this->upload->upload($body['personalInfo']['medicalDocumentUrl'] ?? null, 'medical');
            $candidateIdImageUrl = $this->upload->upload($body['personalInfo']['candidateIdImageUrl'] ?? null, 'candidate-id');
            $relativeIdImageUrl = $this->upload->upload($body['personalInfo']['relativeIdImageUrl'] ?? null, 'relative-id');
            $labourIdUrl        = $this->upload->upload($body['personalInfo']['labourIdUrl'] ?? null, 'labour-id');

            $data = [
                'passport_number' => $body['passportData']['passportNumber'] ?? '',
                'surname'         => $body['passportData']['surname'] ?? '',
                'given_names'     => $body['passportData']['givenNames'] ?? '',
                'date_of_birth'   => !empty($body['passportData']['dateOfBirth']) ? $body['passportData']['dateOfBirth'] : null,
                'gender'          => $body['passportData']['gender'] ?? null,
                'nationality'     => $body['passportData']['nationality'] ?? null,
                'issuing_country' => $body['passportData']['issuingCountry'] ?? null,
                'date_of_issue'   => !empty($body['passportData']['dateOfIssue']) ? $body['passportData']['dateOfIssue'] : null,
                'date_of_expiry'  => !empty($body['passportData']['dateOfExpiry']) ? $body['passportData']['dateOfExpiry'] : null,
                'place_of_birth'  => $body['passportData']['placeOfBirth'] ?? null,

                'id_number'       => $body['personalInfo']['idNumber'] ?? null,
                'job'             => $body['personalInfo']['job'] ?? null,
                'marital_status'  => $body['personalInfo']['maritalStatus'] ?? null,
                'number_of_children' => $body['personalInfo']['numberOfChildren'] ?? 0,
                'religion'        => $body['personalInfo']['religion'] ?? null,
                'blood_type'      => $body['personalInfo']['bloodType'] ?? null,
                'height'          => $body['personalInfo']['height'] ?? null,
                'weight'          => $body['personalInfo']['weight'] ?? null,
                'phone'           => $body['personalInfo']['phone'] ?? null,
                'email'           => $body['personalInfo']['email'] ?? null,
                'address'         => $body['personalInfo']['address'] ?? null,
                'city'            => $body['personalInfo']['city'] ?? null,
                'state'           => $body['personalInfo']['state'] ?? null,
                'country'         => $body['personalInfo']['country'] ?? null,
                'education_level' => $body['personalInfo']['educationLevel'] ?? null,
                'languages'       => $body['personalInfo']['languages'] ?? null,
                'work_experience' => $body['personalInfo']['workExperience'] ?? null,
                'skills'          => $body['personalInfo']['skills'] ?? null,
                'medical_status'  => $body['personalInfo']['medicalStatus'] ?? 'Pending',
                'biometric_status' => $body['personalInfo']['biometricStatus'] ?? 'Pending',
                'medical_date'    => !empty($body['personalInfo']['medicalDate']) ? $body['personalInfo']['medicalDate'] : null,
                'biometric_date'  => !empty($body['personalInfo']['biometricDate']) ? $body['personalInfo']['biometricDate'] : null,
                'known_conditions' => $body['personalInfo']['knownConditions'] ?? null,
                'emergency_contact_name'     => $body['personalInfo']['emergencyContactName'] ?? null,
                'emergency_contact_relation' => $body['personalInfo']['emergencyContactRelation'] ?? null,
                'emergency_contact_phone'    => $body['personalInfo']['emergencyContactPhone'] ?? null,
                'emergency_contact_address'  => $body['personalInfo']['emergencyContactAddress'] ?? null,
                'additional_phones' => $body['personalInfo']['additionalPhones'] ?? [],
                'broker_id'       => (!empty($body['personalInfo']['brokerId']) && $body['personalInfo']['brokerId'] !== 'undefined') ? $body['personalInfo']['brokerId'] : null,
                'visa_status'     => $body['personalInfo']['visaStatus'] ?? 'Pending',
                'video_url'       => $body['videoUrl'] ?? null,
            ];

            if ($passportImageUrl) $data['passport_image_url'] = $passportImageUrl;
            if ($facePhotoUrl) $data['face_photo_url'] = $facePhotoUrl;
            if ($fullBodyPhotoUrl) $data['full_body_photo_url'] = $fullBodyPhotoUrl;
            if ($cocDocumentUrl) $data['coc_document_url'] = $cocDocumentUrl;
            if ($medicalDocumentUrl) $data['medical_document_url'] = $medicalDocumentUrl;
            if ($candidateIdImageUrl) $data['candidate_id_image_url'] = $candidateIdImageUrl;
            if ($relativeIdImageUrl) $data['relative_id_image_url'] = $relativeIdImageUrl;
            if ($labourIdUrl) $data['labour_id_url'] = $labourIdUrl;

            $candidate = Candidate::findOrFail($id);
            $candidate->update($data);

            return response()->json($candidate);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->errorInfo[1] == 1062) {
                return response()->json(['error' => 'A candidate with this Passport Number already exists.'], 400);
            }
            return response()->json(['error' => $e->getMessage()], 500);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function patch(Request $request, string $id)
    {
        try {
            $body = $request->all();

            $keyMap = [
                'isRequested'         => 'is_requested',
                'visaStatus'          => 'visa_status',
                'isFlagged'           => 'is_flagged',
                'medicalStatus'       => 'medical_status',
                'biometricStatus'     => 'biometric_status',
                'visaOrContractNumber' => 'visa_or_contract_number',
                'status'              => 'status',
                'shelfId'             => 'shelf_id',
            ];

            $data = [];
            foreach ($body as $key => $value) {
                $snakeKey = $keyMap[$key] ?? Str::snake($key);
                $data[$snakeKey] = $value;
            }

            // Automatic visa_status logic
            if (isset($data['is_requested'])) {
                if ($data['is_requested'] === true) {
                    $data['visa_status'] = 'Selected';
                } else {
                    $data['visa_status'] = 'Cancelled';
                }
            }

            // If marking as Unfit, delete their CV record
            if (($data['medical_status'] ?? null) === 'Unfit') {
                \App\Models\GeneratedCV::where('candidate_id', $id)->delete();
            }

            // If restoring from Unfit, reset medical status if is_requested is being set to false
            if (isset($data['is_requested']) && $data['is_requested'] === false) {
                $current = Candidate::where('id', $id)->first();
                if ($current && $current->medical_status === 'Unfit') {
                    $data['medical_status'] = 'Pending';
                }
            }

            \Log::info("Patching candidate {$id} with data: " . json_encode($data));
            $candidate = Candidate::findOrFail($id);
            
            // Explicitly set key fields to ensure they are updated
            if (isset($data['is_requested'])) {
                $candidate->is_requested = (bool)$data['is_requested'];
            }
            if (isset($data['visa_status'])) {
                $candidate->visa_status = $data['visa_status'];
            }
            if (array_key_exists('visa_or_contract_number', $data)) {
                $candidate->visa_or_contract_number = $data['visa_or_contract_number'];
            }
            if (isset($data['medical_status'])) {
                $candidate->medical_status = $data['medical_status'];
            }
            if (isset($data['is_flagged'])) {
                $candidate->is_flagged = (bool)$data['is_flagged'];
            }
            
            // Fill any other fields from data
            $candidate->fill($data);
            $candidate->save();

            \Log::info("Candidate {$id} updated successfully. New status: " . ($candidate->is_requested ? 'Selected' : 'Pending'));

            return response()->json($this->formatCandidate($candidate));
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function updateDeadline(Request $request, string $id)
    {
        try {
            $deadline = $request->input('deadline');
            $candidate = Candidate::findOrFail($id);
            $candidate->update([
                'cv_deadline' => $deadline ? new \DateTime($deadline) : null,
            ]);

            return response()->json(['success' => true, 'cvDeadline' => $candidate->cv_deadline]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update deadline', 'details' => $e->getMessage()], 500);
        }
    }

    public function destroy(string $id)
    {
        try {
            Candidate::findOrFail($id)->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function search(Request $request)
    {
        try {
            $query = $request->query('q');
            if (!$query) {
                return response()->json([]);
            }

            $dbCandidates = Candidate::where('passport_number', 'like', "%{$query}%")
                ->orWhere('surname', 'like', "%{$query}%")
                ->orWhere('given_names', 'like', "%{$query}%")
                ->orWhere('job', 'like', "%{$query}%")
                ->orWhere('phone', 'like', "%{$query}%")
                ->limit(10)
                ->get();

            $candidates = $dbCandidates->map(function ($c) {
                return $this->formatCandidate($c);
            });

            return response()->json($candidates);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Search failed'], 500);
        }
    }

    private function formatCandidate(Candidate $c): array
    {
        return [
            'id'       => $c->id,
            'shelfId'  => $c->shelf_id,
            'cvDeadline' => $c->cv_deadline?->format('Y-m-d'),
            'passportData' => [
                'passportNumber' => $c->passport_number,
                'surname'        => $c->surname,
                'givenNames'     => $c->given_names,
                'dateOfBirth'    => $c->date_of_birth?->format('Y-m-d'),
                'gender'         => $c->gender,
                'nationality'    => $c->nationality,
                'issuingCountry' => $c->issuing_country,
                'dateOfIssue'    => $c->date_of_issue?->format('Y-m-d'),
                'dateOfExpiry'   => $c->date_of_expiry?->format('Y-m-d'),
                'placeOfBirth'   => $c->place_of_birth,
            ],
            'personalInfo' => [
                'idNumber'       => $c->id_number ?: $c->passport_number,
                'job'            => $c->job ?? '',
                'maritalStatus'  => $c->marital_status,
                'numberOfChildren' => $c->number_of_children,
                'religion'       => $c->religion,
                'bloodType'      => $c->blood_type,
                'height'         => $c->height,
                'weight'         => $c->weight,
                'phone'          => $c->phone,
                'email'          => $c->email,
                'address'        => $c->address,
                'city'           => $c->city,
                'state'          => $c->state,
                'country'        => $c->country,
                'educationLevel' => $c->education_level,
                'languages'      => $c->languages,
                'workExperience' => $c->work_experience ?? [],
                'skills'         => $c->skills,
                'medicalStatus'  => $c->medical_status,
                'biometricStatus' => $c->biometric_status,
                'medicalDate'    => $c->medical_date?->format('Y-m-d'),
                'biometricDate'  => $c->biometric_date?->format('Y-m-d'),
                'knownConditions' => $c->known_conditions,
                'emergencyContactName'     => $c->emergency_contact_name,
                'emergencyContactRelation' => $c->emergency_contact_relation,
                'emergencyContactPhone'    => $c->emergency_contact_phone,
                'emergencyContactAddress'  => $c->emergency_contact_address,
                'additionalPhones' => $c->additional_phones,
                'brokerId'       => $c->broker_id ?? '',
            ],
            'brokerId'           => $c->broker_id,
            'passportImageUrl'   => $c->passport_image_url ?? '',
            'facePhotoUrl'       => $c->face_photo_url ?? '',
            'fullBodyPhotoUrl'   => $c->full_body_photo_url ?? '',
            'cocDocumentUrl'     => $c->coc_document_url ?? '',
            'medicalDocumentUrl' => $c->medical_document_url ?? '',
            'candidateIdImageUrl' => $c->candidate_id_image_url ?? '',
            'relativeIdImageUrl' => $c->relative_id_image_url ?? '',
            'labourIdUrl'        => $c->labour_id_url ?? '',
            'isRequested'        => $c->is_requested ?? false,
            'visaStatus'         => $c->visa_status ?? ($c->is_requested ? 'Selected' : 'Pending'),
            'visaOrContractNumber' => $c->visa_or_contract_number,
            'isFlagged'          => $c->is_flagged ?? false,
            'videoUrl'           => $c->video_url,
            'registeredAt'       => $c->registered_at?->toIso8601String(),
            'status'             => $c->status,
            'generatedCVs'       => $c->generatedCVs?->pluck('template_id')->toArray() ?? [],
        ];
    }
}
