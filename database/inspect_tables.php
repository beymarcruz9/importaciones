<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=importadora_db;charset=utf8mb4', 'root', '');
echo "--- RESERVATIONS ---\n";
foreach ($pdo->query('DESCRIBE reservations')->fetchAll(PDO::FETCH_ASSOC) as $c) {
    echo $c['Field'] . ' | ' . $c['Type'] . ' | ' . ($c['Default'] ?? 'NULL') . "\n";
}
echo "--- SALES_HISTORY ---\n";
foreach ($pdo->query('DESCRIBE sales_history')->fetchAll(PDO::FETCH_ASSOC) as $c) {
    echo $c['Field'] . ' | ' . $c['Type'] . ' | ' . ($c['Default'] ?? 'NULL') . "\n";
}
