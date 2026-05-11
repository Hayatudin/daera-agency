<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GeneratedCV extends Model
{
    protected $table = 'generated_cvs';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'candidate_id',
        'template_id',
        'face_photo_url',
        'full_body_photo_url',
    ];

    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }
}
