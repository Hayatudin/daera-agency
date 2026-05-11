<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Candidate extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'shelf_id', 'passport_number', 'surname', 'given_names',
        'date_of_birth', 'gender', 'nationality', 'issuing_country',
        'date_of_issue', 'date_of_expiry', 'place_of_birth', 'id_number',
        'job', 'marital_status', 'number_of_children', 'religion',
        'blood_type', 'height', 'weight', 'phone', 'email', 'address',
        'city', 'state', 'country', 'education_level', 'languages',
        'work_experience', 'skills', 'medical_status', 'biometric_status',
        'medical_date', 'biometric_date', 'known_conditions',
        'emergency_contact_name', 'emergency_contact_relation',
        'emergency_contact_phone', 'emergency_contact_address',
        'additional_phones', 'broker_id', 'passport_image_url',
        'face_photo_url', 'full_body_photo_url', 'coc_document_url',
        'medical_document_url', 'candidate_id_image_url',
        'relative_id_image_url', 'labour_id_url', 'is_requested', 'visa_status',
        'visa_or_contract_number', 'is_flagged', 'video_url', 'status',
        'cv_deadline', 'registered_at'
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'date_of_issue' => 'date',
        'date_of_expiry' => 'date',
        'medical_date' => 'date',
        'biometric_date' => 'date',
        'cv_deadline' => 'date',
        'registered_at' => 'datetime',
        'languages' => 'json',
        'skills' => 'json',
        'work_experience' => 'json',
        'additional_phones' => 'json',
        'is_requested' => 'boolean',
        'is_flagged' => 'boolean',
        'number_of_children' => 'integer',
    ];

    public function broker()
    {
        return $this->belongsTo(Broker::class);
    }

    public function generatedCVs()
    {
        return $this->hasMany(GeneratedCV::class);
    }
}
