<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=importadora_db', 'root', '');
$pdo->query("UPDATE imagenes_producto SET url_imagen = REPLACE(url_imagen, 'http://localhost:8000/uploads/', '/uploads/')");
$pdo->query("UPDATE imagenes_producto SET url_imagen = REPLACE(url_imagen, 'http://127.0.0.1:8000/uploads/', '/uploads/')");
echo "Image URLs cleaned successfully.\n";
