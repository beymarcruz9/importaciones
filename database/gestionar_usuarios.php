<?php
/**
 * Herramienta para gestionar administradores de la Importadora
 * Uso:
 *   php database/gestionar_usuarios.php listar
 *   php database/gestionar_usuarios.php agregar "Nombre" "correo@ejemplo.com" "miclave123"
 *   php database/gestionar_usuarios.php cambiar-clave "correo@ejemplo.com" "nuevaclave123"
 */

try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=importadora_db;charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Exception $e) {
    die("Error conectando a MySQL: " . $e->getMessage() . "\n");
}

$action = $argv[1] ?? 'listar';

if ($action === 'listar') {
    echo "\n=== USUARIOS ADMINISTRADORES REGISTRADOS ===\n";
    $users = $pdo->query("SELECT id, name, email, role, created_at FROM users")->fetchAll();
    foreach ($users as $u) {
        echo "ID: {$u['id']} | Nombre: {$u['name']} | Correo: {$u['email']} | Rol: {$u['role']}\n";
    }
    echo "============================================\n\n";
    exit;
}

if ($action === 'agregar') {
    $name = $argv[2] ?? '';
    $email = $argv[3] ?? '';
    $password = $argv[4] ?? '';

    if (empty($name) || empty($email) || empty($password)) {
        die("Uso: php database/gestionar_usuarios.php agregar \"Nombre\" \"correo@dominio.com\" \"contraseña\"\n");
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES (:name, :email, :pass, 'admin', NOW(), NOW())");
    try {
        $stmt->execute([':name' => $name, ':email' => $email, ':pass' => $hash]);
        echo "¡Administrador '{$name}' ({$email}) creado exitosamente!\n";
    } catch (Exception $e) {
        echo "Error: El correo ya existe o hubo un error: " . $e->getMessage() . "\n";
    }
    exit;
}

if ($action === 'cambiar-clave') {
    $email = $argv[2] ?? '';
    $password = $argv[3] ?? '';

    if (empty($email) || empty($password)) {
        die("Uso: php database/gestionar_usuarios.php cambiar-clave \"correo@dominio.com\" \"nueva_contraseña\"\n");
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password = :pass, updated_at = NOW() WHERE email = :email");
    $stmt->execute([':pass' => $hash, ':email' => $email]);

    if ($stmt->rowCount() > 0) {
        echo "¡Contraseña actualizada correctamente para {$email}!\n";
    } else {
        echo "No se encontró ningún usuario con el correo {$email}.\n";
    }
    exit;
}
