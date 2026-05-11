<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'title',
        'message',
        'is_read',
        'type',
        'link',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];
}
