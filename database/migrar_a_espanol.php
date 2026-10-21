<?php
/**
 * MIGRACIÓN DE BASE DE DATOS: INGLÉS -> ESPAÑOL
 * Renombra todas las tablas y columnas de importadora_db al español,
 * preservando el 100% de los datos, relaciones e índices.
 */

$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=importadora_db;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

echo "Iniciando migración a español de 'importadora_db'...\n";

// Desactivar temporalmente revisión de foreign keys
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

function tableExists($pdo, $table) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'importadora_db' AND table_name = :t");
    $stmt->execute([':t' => $table]);
    return (bool)$stmt->fetchColumn();
}

function columnExists($pdo, $table, $column) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'importadora_db' AND table_name = :t AND column_name = :c");
    $stmt->execute([':t' => $table, ':c' => $column]);
    return (bool)$stmt->fetchColumn();
}

function dropFkIfExists($pdo, $table, $fkName) {
    try {
        $pdo->exec("ALTER TABLE `$table` DROP FOREIGN KEY `$fkName`");
        echo "FK $fkName eliminada de $table.\n";
    } catch (Exception $e) {
        // Ignorar si no existe
    }
}

// 1. Eliminar Foreign Keys viejas si existen
dropFkIfExists($pdo, 'products', 'fk_products_category');
dropFkIfExists($pdo, 'productos', 'fk_products_category');
dropFkIfExists($pdo, 'product_images', 'fk_product_images_product');
dropFkIfExists($pdo, 'imagenes_producto', 'fk_product_images_product');
dropFkIfExists($pdo, 'reservations', 'fk_reservations_product');
dropFkIfExists($pdo, 'reservas', 'fk_reservations_product');
dropFkIfExists($pdo, 'sales_history', 'fk_sales_history_product');
dropFkIfExists($pdo, 'historial_ventas', 'fk_sales_history_product');

// 2. Renombrar tablas
if (tableExists($pdo, 'categories') && !tableExists($pdo, 'categorias')) {
    $pdo->exec("ALTER TABLE `categories` RENAME TO `categorias`");
    echo "Tabla 'categories' renombrada a 'categorias'.\n";
}
if (tableExists($pdo, 'products') && !tableExists($pdo, 'productos')) {
    $pdo->exec("ALTER TABLE `products` RENAME TO `productos`");
    echo "Tabla 'products' renombrada a 'productos'.\n";
}
if (tableExists($pdo, 'product_images') && !tableExists($pdo, 'imagenes_producto')) {
    $pdo->exec("ALTER TABLE `product_images` RENAME TO `imagenes_producto`");
    echo "Tabla 'product_images' renombrada a 'imagenes_producto'.\n";
}
if (tableExists($pdo, 'reservations') && !tableExists($pdo, 'reservas')) {
    $pdo->exec("ALTER TABLE `reservations` RENAME TO `reservas`");
    echo "Tabla 'reservations' renombrada a 'reservas'.\n";
}
if (tableExists($pdo, 'sales_history') && !tableExists($pdo, 'historial_ventas')) {
    $pdo->exec("ALTER TABLE `sales_history` RENAME TO `historial_ventas`");
    echo "Tabla 'sales_history' renombrada a 'historial_ventas'.\n";
}
if (tableExists($pdo, 'users') && !tableExists($pdo, 'usuarios')) {
    $pdo->exec("ALTER TABLE `users` RENAME TO `usuarios`");
    echo "Tabla 'users' renombrada a 'usuarios'.\n";
}
if (tableExists($pdo, 'personal_access_tokens') && !tableExists($pdo, 'tokens_acceso')) {
    $pdo->exec("ALTER TABLE `personal_access_tokens` RENAME TO `tokens_acceso`");
    echo "Tabla 'personal_access_tokens' renombrada a 'tokens_acceso'.\n";
}

// 3. Renombrar columnas en 'categorias'
if (tableExists($pdo, 'categorias')) {
    if (columnExists($pdo, 'categorias', 'name')) {
        $pdo->exec("ALTER TABLE `categorias` CHANGE COLUMN `name` `nombre` VARCHAR(100) NOT NULL");
    }
    if (columnExists($pdo, 'categorias', 'description')) {
        $pdo->exec("ALTER TABLE `categorias` CHANGE COLUMN `description` `descripcion` VARCHAR(255) NULL");
    }
    if (columnExists($pdo, 'categorias', 'is_active')) {
        $pdo->exec("ALTER TABLE `categorias` CHANGE COLUMN `is_active` `activo` TINYINT(1) NOT NULL DEFAULT 1");
    }
    if (columnExists($pdo, 'categorias', 'created_at')) {
        $pdo->exec("ALTER TABLE `categorias` CHANGE COLUMN `created_at` `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'categorias', 'updated_at')) {
        $pdo->exec("ALTER TABLE `categorias` CHANGE COLUMN `updated_at` `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }
    echo "Columnas de 'categorias' actualizadas a español.\n";
}

// 4. Renombrar columnas en 'productos'
if (tableExists($pdo, 'productos')) {
    if (columnExists($pdo, 'productos', 'category_id')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `category_id` `categoria_id` BIGINT UNSIGNED NULL");
    }
    if (columnExists($pdo, 'productos', 'name')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `name` `nombre` VARCHAR(200) NOT NULL");
    }
    if (columnExists($pdo, 'productos', 'description')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `description` `descripcion` TEXT NULL");
    }
    if (columnExists($pdo, 'productos', 'cost_price')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `cost_price` `precio_costo` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio de costo interno (oculto al publico)'");
    }
    if (columnExists($pdo, 'productos', 'sale_price')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `sale_price` `precio_venta` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio de venta al publico'");
    }
    if (columnExists($pdo, 'productos', 'status')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `status` `estado` ENUM('disponible', 'reservado', 'vendido') NOT NULL DEFAULT 'disponible'");
    }
    if (columnExists($pdo, 'productos', 'is_active')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `is_active` `activo` TINYINT(1) NOT NULL DEFAULT 1");
    }
    if (columnExists($pdo, 'productos', 'created_at')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `created_at` `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'productos', 'updated_at')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `updated_at` `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'productos', 'deleted_at')) {
        $pdo->exec("ALTER TABLE `productos` CHANGE COLUMN `deleted_at` `fecha_eliminacion` TIMESTAMP NULL DEFAULT NULL");
    }
    echo "Columnas de 'productos' actualizadas a español.\n";
}

// 5. Renombrar columnas en 'imagenes_producto'
if (tableExists($pdo, 'imagenes_producto')) {
    if (columnExists($pdo, 'imagenes_producto', 'product_id')) {
        $pdo->exec("ALTER TABLE `imagenes_producto` CHANGE COLUMN `product_id` `producto_id` BIGINT UNSIGNED NOT NULL");
    }
    if (columnExists($pdo, 'imagenes_producto', 'image_url')) {
        $pdo->exec("ALTER TABLE `imagenes_producto` CHANGE COLUMN `image_url` `url_imagen` VARCHAR(500) NOT NULL");
    }
    if (columnExists($pdo, 'imagenes_producto', 'sort_order')) {
        $pdo->exec("ALTER TABLE `imagenes_producto` CHANGE COLUMN `sort_order` `orden` TINYINT UNSIGNED NOT NULL DEFAULT 0");
    }
    if (columnExists($pdo, 'imagenes_producto', 'is_primary')) {
        $pdo->exec("ALTER TABLE `imagenes_producto` CHANGE COLUMN `is_primary` `es_principal` TINYINT(1) NOT NULL DEFAULT 0");
    }
    if (columnExists($pdo, 'imagenes_producto', 'created_at')) {
        $pdo->exec("ALTER TABLE `imagenes_producto` CHANGE COLUMN `created_at` `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'imagenes_producto', 'updated_at')) {
        $pdo->exec("ALTER TABLE `imagenes_producto` CHANGE COLUMN `updated_at` `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }
    echo "Columnas de 'imagenes_producto' actualizadas a español.\n";
}

// 6. Renombrar columnas en 'reservas'
if (tableExists($pdo, 'reservas')) {
    if (columnExists($pdo, 'reservas', 'product_id')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `product_id` `producto_id` BIGINT UNSIGNED NOT NULL");
    }
    if (columnExists($pdo, 'reservas', 'customer_name')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `customer_name` `nombre_cliente` VARCHAR(150) NOT NULL");
    }
    if (columnExists($pdo, 'reservas', 'customer_phone')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `customer_phone` `telefono_cliente` VARCHAR(50) NULL DEFAULT NULL");
    }
    if (columnExists($pdo, 'reservas', 'advance_payment')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `advance_payment` `adelanto` DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
    }
    if (columnExists($pdo, 'reservas', 'agreed_price')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `agreed_price` `precio_pactado` DECIMAL(12, 2) NULL DEFAULT NULL");
    }
    if (columnExists($pdo, 'reservas', 'reserved_at')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `reserved_at` `fecha_reserva` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'reservas', 'expires_at')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `expires_at` `fecha_expiracion` DATETIME NOT NULL");
    }
    if (columnExists($pdo, 'reservas', 'status')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `status` `estado` ENUM('activa', 'completada', 'expirada', 'cancelada') NOT NULL DEFAULT 'activa'");
    }
    if (columnExists($pdo, 'reservas', 'notes')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `notes` `notas` TEXT NULL");
    }
    if (columnExists($pdo, 'reservas', 'created_at')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `created_at` `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'reservas', 'updated_at')) {
        $pdo->exec("ALTER TABLE `reservas` CHANGE COLUMN `updated_at` `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }
    echo "Columnas de 'reservas' actualizadas a español.\n";
}

// 7. Renombrar columnas en 'historial_ventas'
if (tableExists($pdo, 'historial_ventas')) {
    if (columnExists($pdo, 'historial_ventas', 'product_id')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `product_id` `producto_id` BIGINT UNSIGNED NOT NULL");
    }
    if (columnExists($pdo, 'historial_ventas', 'product_name')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `product_name` `nombre_producto` VARCHAR(200) NOT NULL");
    }
    if (columnExists($pdo, 'historial_ventas', 'cost_price')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `cost_price` `precio_costo` DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
    }
    if (columnExists($pdo, 'historial_ventas', 'original_price')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `original_price` `precio_original` DECIMAL(12, 2) NULL DEFAULT NULL");
    }
    if (columnExists($pdo, 'historial_ventas', 'sale_price')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `sale_price` `precio_venta` DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
    }
    if (columnExists($pdo, 'historial_ventas', 'discount_amount')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `discount_amount` `monto_descuento` DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
    }
    if (columnExists($pdo, 'historial_ventas', 'advance_payment')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `advance_payment` `adelanto` DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
    }
    if (columnExists($pdo, 'historial_ventas', 'net_profit')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `net_profit` `ganancia_neta` DECIMAL(12, 2) NOT NULL DEFAULT 0.00");
    }
    if (columnExists($pdo, 'historial_ventas', 'include_in_dashboard')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `include_in_dashboard` `incluir_en_dashboard` TINYINT(1) NOT NULL DEFAULT 1");
    }
    if (columnExists($pdo, 'historial_ventas', 'customer_name')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `customer_name` `nombre_cliente` VARCHAR(150) NULL DEFAULT NULL");
    }
    if (columnExists($pdo, 'historial_ventas', 'sold_at')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `sold_at` `fecha_venta` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'historial_ventas', 'notes')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `notes` `notas` TEXT NULL");
    }
    if (columnExists($pdo, 'historial_ventas', 'created_at')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `created_at` `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'historial_ventas', 'updated_at')) {
        $pdo->exec("ALTER TABLE `historial_ventas` CHANGE COLUMN `updated_at` `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }
    echo "Columnas de 'historial_ventas' actualizadas a español.\n";
}

// 8. Renombrar columnas en 'usuarios'
if (tableExists($pdo, 'usuarios')) {
    if (columnExists($pdo, 'usuarios', 'name')) {
        $pdo->exec("ALTER TABLE `usuarios` CHANGE COLUMN `name` `nombre` VARCHAR(150) NOT NULL");
    }
    if (columnExists($pdo, 'usuarios', 'email')) {
        $pdo->exec("ALTER TABLE `usuarios` CHANGE COLUMN `email` `correo` VARCHAR(191) NOT NULL");
    }
    if (columnExists($pdo, 'usuarios', 'email_verified_at')) {
        $pdo->exec("ALTER TABLE `usuarios` CHANGE COLUMN `email_verified_at` `correo_verificado_en` TIMESTAMP NULL DEFAULT NULL");
    }
    if (columnExists($pdo, 'usuarios', 'password')) {
        $pdo->exec("ALTER TABLE `usuarios` CHANGE COLUMN `password` `contrasena` VARCHAR(255) NOT NULL");
    }
    if (columnExists($pdo, 'usuarios', 'role')) {
        $pdo->exec("ALTER TABLE `usuarios` CHANGE COLUMN `role` `rol` ENUM('admin', 'operador') NOT NULL DEFAULT 'admin'");
    }
    if (columnExists($pdo, 'usuarios', 'remember_token')) {
        $pdo->exec("ALTER TABLE `usuarios` CHANGE COLUMN `remember_token` `token_recuerdame` VARCHAR(100) NULL DEFAULT NULL");
    }
    if (columnExists($pdo, 'usuarios', 'created_at')) {
        $pdo->exec("ALTER TABLE `usuarios` CHANGE COLUMN `created_at` `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'usuarios', 'updated_at')) {
        $pdo->exec("ALTER TABLE `usuarios` CHANGE COLUMN `updated_at` `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }
    echo "Columnas de 'usuarios' actualizadas a español.\n";
}

// 9. Renombrar columnas en 'tokens_acceso'
if (tableExists($pdo, 'tokens_acceso')) {
    if (columnExists($pdo, 'tokens_acceso', 'tokenable_type')) {
        $pdo->exec("ALTER TABLE `tokens_acceso` CHANGE COLUMN `tokenable_type` `tipo_entidad` VARCHAR(191) NOT NULL");
    }
    if (columnExists($pdo, 'tokens_acceso', 'tokenable_id')) {
        $pdo->exec("ALTER TABLE `tokens_acceso` CHANGE COLUMN `tokenable_id` `entidad_id` BIGINT UNSIGNED NOT NULL");
    }
    if (columnExists($pdo, 'tokens_acceso', 'name')) {
        $pdo->exec("ALTER TABLE `tokens_acceso` CHANGE COLUMN `name` `nombre` VARCHAR(191) NOT NULL");
    }
    if (columnExists($pdo, 'tokens_acceso', 'abilities')) {
        $pdo->exec("ALTER TABLE `tokens_acceso` CHANGE COLUMN `abilities` `habilidades` TEXT NULL");
    }
    if (columnExists($pdo, 'tokens_acceso', 'last_used_at')) {
        $pdo->exec("ALTER TABLE `tokens_acceso` CHANGE COLUMN `last_used_at` `ultimo_uso_en` TIMESTAMP NULL DEFAULT NULL");
    }
    if (columnExists($pdo, 'tokens_acceso', 'expires_at')) {
        $pdo->exec("ALTER TABLE `tokens_acceso` CHANGE COLUMN `expires_at` `fecha_expiracion` TIMESTAMP NULL DEFAULT NULL");
    }
    if (columnExists($pdo, 'tokens_acceso', 'created_at')) {
        $pdo->exec("ALTER TABLE `tokens_acceso` CHANGE COLUMN `created_at` `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
    }
    if (columnExists($pdo, 'tokens_acceso', 'updated_at')) {
        $pdo->exec("ALTER TABLE `tokens_acceso` CHANGE COLUMN `updated_at` `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }
    echo "Columnas de 'tokens_acceso' actualizadas a español.\n";
}

// 10. Recrear restricciones de clave foránea (Foreign Keys) en español
echo "Recreando Foreign Keys en español...\n";
dropFkIfExists($pdo, 'productos', 'fk_productos_categoria');
dropFkIfExists($pdo, 'imagenes_producto', 'fk_imagenes_producto_producto');
dropFkIfExists($pdo, 'reservas', 'fk_reservas_producto');
dropFkIfExists($pdo, 'historial_ventas', 'fk_historial_ventas_producto');

$pdo->exec("ALTER TABLE `productos` ADD CONSTRAINT `fk_productos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE");
$pdo->exec("ALTER TABLE `imagenes_producto` ADD CONSTRAINT `fk_imagenes_producto_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE");
$pdo->exec("ALTER TABLE `reservas` ADD CONSTRAINT `fk_reservas_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE");
$pdo->exec("ALTER TABLE `historial_ventas` ADD CONSTRAINT `fk_historial_ventas_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE");

// Reactivar revisión de foreign keys
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

echo "\n¡MIGRACIÓN A ESPAÑOL COMPLETADA CON ÉXITO!\n";
