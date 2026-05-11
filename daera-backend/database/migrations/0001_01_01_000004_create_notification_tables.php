<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->string('id')->primary(); // CUID
            $table->string('title');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->string('type')->default('info');
            $table->string('link')->nullable();
            $table->timestamps();
        });

        Schema::create('quick_registrations', function (Blueprint $table) {
            $table->string('id')->primary(); // CUID
            $table->string('passport_number')->nullable();
            $table->string('surname')->nullable();
            $table->string('given_names')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('gender')->nullable();
            $table->string('nationality')->nullable();
            $table->date('date_of_expiry')->nullable();
            $table->string('issuing_country')->nullable();
            $table->string('place_of_birth')->nullable();
            $table->string('education_level')->nullable();
            $table->string('job_experience')->nullable();
            $table->string('marital_status')->nullable();
            $table->integer('number_of_children')->default(0);
            $table->string('passport_image_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quick_registrations');
        Schema::dropIfExists('notifications');
    }
};
