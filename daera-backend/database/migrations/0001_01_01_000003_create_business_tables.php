<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brokers', function (Blueprint $table) {
            $table->string('id')->primary(); // CUID
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('candidates', function (Blueprint $table) {
            $table->string('id')->primary(); // CUID
            $table->string('shelf_id')->unique();
            $table->string('passport_number')->unique();
            $table->string('surname');
            $table->string('given_names');
            $table->date('date_of_birth')->nullable();
            $table->string('gender')->nullable();
            $table->string('nationality')->nullable();
            $table->string('issuing_country')->nullable();
            $table->date('date_of_issue')->nullable();
            $table->date('date_of_expiry')->nullable();
            $table->string('place_of_birth')->nullable();

            $table->string('id_number')->nullable();
            $table->string('job')->nullable();
            $table->string('marital_status')->nullable();
            $table->integer('number_of_children')->default(0);
            $table->string('religion')->nullable();
            $table->string('blood_type')->nullable();
            $table->string('height')->nullable();
            $table->string('weight')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->nullable();
            $table->string('education_level')->nullable();
            
            $table->json('languages')->nullable();
            $table->text('work_experience')->nullable();
            $table->json('skills')->nullable();

            $table->string('medical_status')->default('Pending');
            $table->string('biometric_status')->default('Pending');
            $table->date('medical_date')->nullable();
            $table->date('biometric_date')->nullable();
            $table->text('known_conditions')->nullable();

            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_relation')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->text('emergency_contact_address')->nullable();
            $table->json('additional_phones')->nullable();

            $table->string('broker_id')->nullable();
            
            $table->string('passport_image_url')->nullable();
            $table->string('face_photo_url')->nullable();
            $table->string('full_body_photo_url')->nullable();
            $table->string('coc_document_url')->nullable();
            $table->string('medical_document_url')->nullable();
            $table->string('candidate_id_image_url')->nullable();
            $table->string('relative_id_image_url')->nullable();
            $table->string('labour_id_url')->nullable();

            $table->boolean('is_requested')->default(false);
            $table->string('visa_or_contract_number')->nullable();
            $table->boolean('is_flagged')->default(false);
            $table->string('video_url')->nullable();

            $table->string('status')->default('pending');
            $table->timestamp('registered_at')->useCurrent();
            $table->date('cv_deadline')->nullable();
            $table->timestamps();

            $table->foreign('broker_id')->references('id')->on('brokers')->nullOnDelete();
        });

        Schema::create('generated_cvs', function (Blueprint $table) {
            $table->string('id')->primary(); // CUID
            $table->string('candidate_id');
            $table->string('template_id');
            $table->string('face_photo_url')->nullable();
            $table->string('full_body_photo_url')->nullable();
            $table->timestamps();

            $table->foreign('candidate_id')->references('id')->on('candidates')->onDelete('cascade');
            $table->unique(['candidate_id', 'template_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generated_cvs');
        Schema::dropIfExists('candidates');
        Schema::dropIfExists('brokers');
    }
};
