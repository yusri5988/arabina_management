<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::dropIfExists('bookings');
            Schema::create('bookings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('restaurant_id')->constrained()->onDelete('cascade');
                $table->date('booking_date');
                $table->string('customer_name');
                $table->string('customer_phone');
                $table->integer('child_qty')->default(0);
                $table->integer('adult_qty')->default(0);
                $table->integer('senior_qty')->default(0);
                $table->decimal('price_child_snapshot', 8, 2);
                $table->decimal('price_adult_snapshot', 8, 2);
                $table->decimal('price_senior_snapshot', 8, 2);
                $table->decimal('total_amount', 10, 2);
                $table->enum('status', ['pending', 'confirmed', 'cancelled'])->default('pending');
                $table->timestamps();
            });
            return;
        }

        Schema::table('bookings', function (Blueprint $table) {
            // Drop old columns if they exist
            if (Schema::hasColumn('bookings', 'tenant_id')) {
                $table->dropForeign(['tenant_id']);
                $table->dropColumn('tenant_id');
            }
            if (Schema::hasColumn('bookings', 'booking_ref')) {
                $table->dropColumn('booking_ref');
            }
            if (Schema::hasColumn('bookings', 'pax')) {
                $table->dropColumn('pax');
            }
            if (Schema::hasColumn('bookings', 'visit_date')) {
                $table->dropColumn('visit_date');
            }
            if (Schema::hasColumn('bookings', 'status')) {
                $table->dropColumn('status');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            // Add new columns
            $table->foreignId('restaurant_id')->after('id')->constrained()->onDelete('cascade');
            $table->date('booking_date')->after('restaurant_id');
            $table->string('customer_name')->after('booking_date');
            $table->string('customer_phone')->after('customer_name');
            $table->integer('child_qty')->default(0)->after('customer_phone');
            $table->integer('adult_qty')->default(0)->after('child_qty');
            $table->integer('senior_qty')->default(0)->after('adult_qty');
            $table->decimal('price_child_snapshot', 8, 2)->after('senior_qty');
            $table->decimal('price_adult_snapshot', 8, 2)->after('price_child_snapshot');
            $table->decimal('price_senior_snapshot', 8, 2)->after('price_adult_snapshot');
            $table->decimal('total_amount', 10, 2)->after('price_senior_snapshot');
            $table->enum('status', ['pending', 'confirmed', 'cancelled'])->default('pending')->after('total_amount');
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::dropIfExists('bookings');
            Schema::create('bookings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
                $table->string('booking_ref')->unique();
                $table->string('name');
                $table->string('phone');
                $table->date('visit_date');
                $table->integer('pax');
                $table->enum('status', ['pending', 'confirmed', 'cancelled', 'checked_in'])->default('pending');
                $table->timestamps();
            });
            return;
        }

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['restaurant_id']);
            $table->dropColumn([
                'restaurant_id',
                'booking_date',
                'customer_name',
                'customer_phone',
                'child_qty',
                'adult_qty',
                'senior_qty',
                'price_child_snapshot',
                'price_adult_snapshot',
                'price_senior_snapshot',
                'total_amount',
                'status',
            ]);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('booking_ref')->unique();
            $table->date('visit_date');
            $table->integer('pax');
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'checked_in'])->default('pending');
        });
    }
};
