<?php
App\Models\User::where('email', 'hayuuj0@gmail.com')->update(['role' => 'super_admin']);
echo "Updated successfully.\n";
