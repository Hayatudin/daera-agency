<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadService
{
    protected Cloudinary $cloudinary;
    protected bool $isLocal;

    public function __construct()
    {
        $this->isLocal = config('services.cloudinary.storage_mode', env('STORAGE_MODE', 'local')) === 'local';
        
        if (!$this->isLocal) {
            $this->cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => config('services.cloudinary.cloud_name', env('CLOUDINARY_CLOUD_NAME')),
                    'api_key'    => config('services.cloudinary.api_key', env('CLOUDINARY_API_KEY')),
                    'api_secret' => config('services.cloudinary.api_secret', env('CLOUDINARY_API_SECRET')),
                ],
            ]);
        }
    }

    public function upload(?string $fileString, string $folder): ?string
    {
        if (!$fileString) {
            return null;
        }

        if (Str::startsWith($fileString, ['http', '/uploads'])) {
            return $fileString;
        }

        if ($this->isLocal) {
            return $this->uploadToLocalDisk($fileString, $folder);
        }

        return $this->uploadToCloudinary($fileString, $folder);
    }

    protected function uploadToCloudinary(string $fileString, string $folder): ?string
    {
        try {
            $dataUri = $fileString;
            if (!Str::startsWith($fileString, 'data:')) {
                $dataUri = "data:image/jpeg;base64,{$fileString}";
            }

            $result = $this->cloudinary->uploadApi()->upload($dataUri, [
                'folder'        => "daera/{$folder}",
                'resource_type' => 'auto',
            ]);

            return $result['secure_url'] ?? null;
        } catch (\Exception $e) {
            \Log::error("Cloudinary upload error for {$folder}: " . $e->getMessage());
            return null;
        }
    }

    protected function uploadToLocalDisk(string $fileString, string $folder): ?string
    {
        try {
            $base64Data = $fileString;
            $extension = 'bin';

            if (Str::startsWith($fileString, 'data:')) {
                if (preg_match('/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.+)$/', $fileString, $matches)) {
                    $mimeType = $matches[1];
                    $base64Data = $matches[2];
                    $extension = explode('/', $mimeType)[1] ?? 'bin';
                    if ($extension === 'jpeg') $extension = 'jpg';
                } else {
                    $parts = explode(',', $fileString);
                    $base64Data = $parts[1] ?? $fileString;
                }
            } else {
                $extension = 'jpg';
            }

            $buffer = base64_decode($base64Data);
            $fileName = Str::random(32) . '.' . $extension;

            $path = "uploads/{$folder}/{$fileName}";
            Storage::disk('public')->put($path, $buffer);

            return "/storage/uploads/{$folder}/{$fileName}";
        } catch (\Exception $e) {
            \Log::error("Local upload error for {$folder}: " . $e->getMessage());
            return null;
        }
    }
}
