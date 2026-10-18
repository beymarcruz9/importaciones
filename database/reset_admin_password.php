<?php

$pdo = new PDO('mysql:host=127.0.0.1;dbname=importadora_db', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$password = 'password123';
$hash = password_hash($password, PASSWORD_BCRYPT);

$stmt = $pdo->prepare('UPDATE users SET password = :password WHERE email = :email');
$stmt->execute([
    ':password' => $hash,
    ':email'    => 'admin@importadora.com',
]);

echo "Password updated successfully!\n";
echo "Email: admin@importadora.com\n";
echo "Password: password123\n";
echo "Generated Hash: " . $hash . "\n";
echo "Verification test: " . (password_verify('password123', $hash) ? 'VALID' : 'INVALID') . "\n";
