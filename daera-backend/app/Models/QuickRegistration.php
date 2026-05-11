<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuickRegistration extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'passport_number',
        'surname',
        'given_names',
        'date_of_birth',
        'gender',
        'nationality',
        'date_of_expiry',
        'issuing_country',
        'place_of_birth',
        'education_level',
        'job_experience',
        'marital_status',
        'number_of_children',
        'passport_image_url',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'date_of_expiry' => 'date',
        'number_of_children' => 'integer',
    ];
}
