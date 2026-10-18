<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=importadora_db;charset=utf8mb4', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$salesCols = array_column($pdo->query("SHOW COLUMNS FROM sales_history")->fetchAll(PDO::FETCH_ASSOC), 'Field');

if (!in_array('include_in_dashboard', $salesCols)) {
    $pdo->exec("ALTER TABLE sales_history ADD COLUMN include_in_dashboard TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Suma a métricas y dashboard, 0=Excluido' AFTER net_profit");
    echo "Column include_in_dashboard added to sales_history.\n";
} else {
    echo "Column include_in_dashboard already exists.\n";
}
