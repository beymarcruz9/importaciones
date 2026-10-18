<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=importadora_db;charset=utf8mb4', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "Applying migration for reservations and sales_history...\n";

// 1. Agregar columnas a reservations si no existen
$resCols = array_column($pdo->query("SHOW COLUMNS FROM reservations")->fetchAll(PDO::FETCH_ASSOC), 'Field');

if (!in_array('advance_payment', $resCols)) {
    $pdo->exec("ALTER TABLE reservations ADD COLUMN advance_payment DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Monto de adelanto con el que se reserva en Bs' AFTER customer_phone");
    echo "Added advance_payment to reservations.\n";
}

if (!in_array('agreed_price', $resCols)) {
    $pdo->exec("ALTER TABLE reservations ADD COLUMN agreed_price DECIMAL(12, 2) NULL DEFAULT NULL COMMENT 'Precio de venta pactado con rebaja en Bs' AFTER advance_payment");
    echo "Added agreed_price to reservations.\n";
}

// 2. Agregar columnas a sales_history si no existen
$salesCols = array_column($pdo->query("SHOW COLUMNS FROM sales_history")->fetchAll(PDO::FETCH_ASSOC), 'Field');

if (!in_array('original_price', $salesCols)) {
    $pdo->exec("ALTER TABLE sales_history ADD COLUMN original_price DECIMAL(12, 2) NULL DEFAULT NULL COMMENT 'Precio de lista original antes de rebaja' AFTER cost_price");
    echo "Added original_price to sales_history.\n";
}

if (!in_array('discount_amount', $salesCols)) {
    $pdo->exec("ALTER TABLE sales_history ADD COLUMN discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Monto de la rebaja concedida en Bs' AFTER sale_price");
    echo "Added discount_amount to sales_history.\n";
}

if (!in_array('advance_payment', $salesCols)) {
    $pdo->exec("ALTER TABLE sales_history ADD COLUMN advance_payment DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Adelanto recibido previamente en reserva' AFTER discount_amount");
    echo "Added advance_payment to sales_history.\n";
}

echo "Migration completed successfully!\n";
