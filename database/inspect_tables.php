<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=importadora_db;charset=utf8mb4', 'root', '');
$tables = ['categorias', 'productos', 'imagenes_producto', 'reservas', 'historial_ventas', 'usuarios', 'tokens_acceso'];
foreach ($tables as $t) {
    echo "=== TABLA: $t ===\n";
    foreach ($pdo->query("DESCRIBE `$t`")->fetchAll(PDO::FETCH_ASSOC) as $c) {
        echo "  - {$c['Field']} ({$c['Type']})\n";
    }
}
