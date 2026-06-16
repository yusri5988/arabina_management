<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProcessLog extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'context' => 'array',
    ];

    /**
     * Get the parent related model (morphTo).
     */
    public function related(): MorphTo
    {
        return $this->morphTo();
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
