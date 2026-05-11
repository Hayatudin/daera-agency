<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QuickRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class QuickRegistrationController extends Controller
{
    protected $upload;

    public function __construct(\App\Services\UploadService $upload)
    {
        $this->upload = $upload;
    }

    public function index()
    {
        try {
            $registrations = QuickRegistration::orderBy('created_at', 'desc')->get();
            return response()->json($registrations->map(fn($r) => $this->formatRegistration($r)));
        } catch (\Exception $e) {
            \Log::error('Failed to fetch quick registrations: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch quick registrations'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $body = $request->all();

            $passportImageUrl = null;
            if (!empty($body['passportImageUrl'])) {
                $passportImageUrl = $this->upload->upload($body['passportImageUrl'], 'quick-passports');
            }

            $registration = QuickRegistration::create([
                'id' => Str::random(25),
                'passport_number' => $body['passportNumber'] ?? '',
                'surname' => $body['surname'] ?? '',
                'given_names' => $body['givenNames'] ?? '',
                'date_of_birth' => !empty($body['dateOfBirth']) ? $body['dateOfBirth'] : null,
                'gender' => $body['gender'] ?? null,
                'nationality' => $body['nationality'] ?? null,
                'date_of_expiry' => !empty($body['dateOfExpiry']) ? $body['dateOfExpiry'] : null,
                'issuing_country' => $body['issuingCountry'] ?? null,
                'place_of_birth' => $body['placeOfBirth'] ?? null,
                'education_level' => $body['educationLevel'] ?? null,
                'job_experience' => $body['jobExperience'] ?? null,
                'marital_status' => $body['maritalStatus'] ?? null,
                'number_of_children' => isset($body['numberOfChildren']) ? (int)$body['numberOfChildren'] : 0,
                'passport_image_url' => $passportImageUrl,
            ]);

            return response()->json($this->formatRegistration($registration), 201);
        } catch (\Exception $e) {
            \Log::error('Failed to create quick registration: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function show(string $id)
    {
        try {
            $registration = QuickRegistration::find($id);

            if (!$registration) {
                return response()->json(['error' => 'Not found'], 404);
            }

            return response()->json($this->formatRegistration($registration));
        } catch (\Exception $e) {
            \Log::error('Failed to fetch quick registration: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch quick registration'], 500);
        }
    }

    private function formatRegistration(QuickRegistration $r): array
    {
        return [
            'id' => $r->id,
            'passportNumber' => $r->passport_number,
            'surname' => $r->surname,
            'givenNames' => $r->given_names,
            'dateOfBirth' => $r->date_of_birth?->format('Y-m-d'),
            'gender' => $r->gender,
            'nationality' => $r->nationality,
            'dateOfExpiry' => $r->date_of_expiry?->format('Y-m-d'),
            'issuingCountry' => $r->issuing_country,
            'placeOfBirth' => $r->place_of_birth,
            'educationLevel' => $r->education_level,
            'jobExperience' => $r->job_experience,
            'maritalStatus' => $r->marital_status,
            'numberOfChildren' => $r->number_of_children,
            'passportImageUrl' => $r->passport_image_url,
            'createdAt' => $r->created_at?->toIso8601String(),
            'updatedAt' => $r->updated_at?->toIso8601String(),
        ];
    }
}
