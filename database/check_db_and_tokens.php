<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=importadora_db;charset=utf8mb4', 'root', '');
    echo "DB connection OK\n";
    $tokens = $pdo->query('SELECT * FROM personal_access_tokens')->fetchAll(PDO::FETCH_ASSOC);
    echo "Tokens count: " . count($tokens) . "\n";
    foreach ($tokens as $t) {
        echo "Token ID: {$t['id']} user: {$t['tokenable_id']} created: {$t['created_at']}\n";
    }
} catch (Exception $e) {
    echo "DB Error: " . $e->getMessage() . "\n";
}
