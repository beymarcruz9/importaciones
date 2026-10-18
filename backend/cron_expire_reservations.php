<?php
/**
 * CRON JOB / TAREA PROGRAMADA: Expiración de reservas de 7 días
 * Ejecución directa: php backend/cron_expire_reservations.php
 */

$pdo = new PDO('mysql:host=127.0.0.1;dbname=importadora_db;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

echo "[" . date('Y-m-d H:i:s') . "] Verificando reservas con vigencia > 7 días cumplida...\n";

// Buscar reservas activas cuya fecha límite ya pasó
$stmt = $pdo->prepare("SELECT r.*, p.name as product_name, p.status as product_status 
                       FROM reservations r 
                       INNER JOIN products p ON p.id = r.product_id 
                       WHERE r.status = 'activa' AND r.expires_at <= NOW()");
$stmt->execute();
$expired = $stmt->fetchAll();

if (empty($expired)) {
    echo "No hay reservas vencidas pendientes de liberar.\n";
    exit(0);
}

$count = 0;
foreach ($expired as $res) {
    $pdo->beginTransaction();
    try {
        // 1. Marcar reserva como expirada
        $pdo->prepare("UPDATE reservations SET status = 'expirada', notes = CONCAT(COALESCE(notes, ''), '\nExpirada automáticamente tras 7 días.') WHERE id = :id")
            ->execute([':id' => $res['id']]);

        // 2. Liberar producto de 'reservado' a 'disponible'
        if ($res['product_status'] === 'reservado') {
            $pdo->prepare("UPDATE products SET status = 'disponible' WHERE id = :pid")
                ->execute([':pid' => $res['product_id']]);
            echo "-> Producto liberado: [ID {$res['product_id']}] {$res['product_name']} pasó a DISPONIBLE.\n";
        }

        $pdo->commit();
        $count++;
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "Error procesando reserva #{$res['id']}: " . $e->getMessage() . "\n";
    }
}

echo "Proceso finalizado. Total de reservas expiradas procesadas: {$count}.\n";
