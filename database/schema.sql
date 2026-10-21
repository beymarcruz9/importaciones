-- =============================================================================
-- PROYECTO: IMPORTADORA DE PRODUCTOS (PLANTILLA MARCA BLANCA)
-- MOTOR DE BASE DE DATOS: MySQL 8.0+ / MariaDB 10.4+
-- DESCRIPCIÓN: Estructura relacional completa en ESPAÑOL para gestión de catálogo,
--              reservas con vigencia de 7 días, historial de ventas y contabilidad.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `importadora_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `importadora_db`;

-- Desactivar restricciones de clave foránea temporalmente para inicialización limpia
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `historial_ventas`;
DROP TABLE IF EXISTS `reservas`;
DROP TABLE IF EXISTS `imagenes_producto`;
DROP TABLE IF EXISTS `productos`;
DROP TABLE IF EXISTS `categorias`;
DROP TABLE IF EXISTS `tokens_acceso`;
DROP TABLE IF EXISTS `usuarios`;

-- Tablas heredadas en inglés por compatibilidad si existían previamente
DROP TABLE IF EXISTS `sales_history`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `product_images`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `personal_access_tokens`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. TABLA: usuarios (Administradores del sistema)
-- -----------------------------------------------------------------------------
CREATE TABLE `usuarios` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `correo` VARCHAR(191) NOT NULL UNIQUE,
    `correo_verificado_en` TIMESTAMP NULL DEFAULT NULL,
    `contrasena` VARCHAR(255) NOT NULL,
    `rol` ENUM('admin', 'operador') NOT NULL DEFAULT 'admin',
    `token_recuerdame` VARCHAR(100) NULL DEFAULT NULL,
    `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. TABLA: tokens_acceso (Tokens de sesión API)
-- -----------------------------------------------------------------------------
CREATE TABLE `tokens_acceso` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tipo_entidad` VARCHAR(191) NOT NULL,
    `entidad_id` BIGINT UNSIGNED NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `token` VARCHAR(64) NOT NULL UNIQUE,
    `habilidades` TEXT NULL,
    `ultimo_uso_en` TIMESTAMP NULL DEFAULT NULL,
    `fecha_expiracion` TIMESTAMP NULL DEFAULT NULL,
    `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `tokens_acceso_tipo_entidad_entidad_id_index` (`tipo_entidad`, `entidad_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TABLA: categorias (Categorías de productos)
-- -----------------------------------------------------------------------------
CREATE TABLE `categorias` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL UNIQUE,
    `descripcion` VARCHAR(255) NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_categorias_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. TABLA: productos (Catálogo de productos y control de precios/costos)
-- NOTA: `precio_costo` es confidencial para métricas y contabilidad interna.
-- -----------------------------------------------------------------------------
CREATE TABLE `productos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `categoria_id` BIGINT UNSIGNED NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(220) NOT NULL UNIQUE,
    `descripcion` TEXT NULL,
    `precio_costo` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio de costo interno (oculto al público)',
    `precio_venta` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio de venta al público en Bs',
    `estado` ENUM('disponible', 'reservado', 'vendido') NOT NULL DEFAULT 'disponible',
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `fecha_eliminacion` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_productos_estado` (`estado`),
    INDEX `idx_productos_categoria_id` (`categoria_id`),
    INDEX `idx_productos_activo` (`activo`),
    CONSTRAINT `fk_productos_categoria` 
        FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. TABLA: imagenes_producto (Carrusel de 1 a 3 imágenes por producto)
-- -----------------------------------------------------------------------------
CREATE TABLE `imagenes_producto` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `producto_id` BIGINT UNSIGNED NOT NULL,
    `url_imagen` VARCHAR(500) NOT NULL,
    `orden` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `es_principal` TINYINT(1) NOT NULL DEFAULT 0,
    `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_imagenes_producto_producto_id` (`producto_id`),
    CONSTRAINT `fk_imagenes_producto_producto` 
        FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. TABLA: reservas (Control y expiración automática a 7 días)
-- -----------------------------------------------------------------------------
CREATE TABLE `reservas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `producto_id` BIGINT UNSIGNED NOT NULL,
    `nombre_cliente` VARCHAR(150) NOT NULL COMMENT 'Nombre del cliente',
    `telefono_cliente` VARCHAR(50) NULL DEFAULT NULL,
    `adelanto` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Monto de adelanto en Bs',
    `precio_pactado` DECIMAL(12, 2) NULL DEFAULT NULL COMMENT 'Precio pactado de venta con rebaja en Bs',
    `fecha_reserva` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_expiracion` DATETIME NOT NULL COMMENT 'Vigencia exacta de 7 días',
    `estado` ENUM('activa', 'completada', 'expirada', 'cancelada') NOT NULL DEFAULT 'activa',
    `notas` TEXT NULL,
    `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_reservas_estado_fecha_expiracion` (`estado`, `fecha_expiracion`),
    INDEX `idx_reservas_producto_id` (`producto_id`),
    CONSTRAINT `fk_reservas_producto` 
        FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. TABLA: historial_ventas (Registro contable automático al vender un producto)
-- -----------------------------------------------------------------------------
CREATE TABLE `historial_ventas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `producto_id` BIGINT UNSIGNED NOT NULL,
    `nombre_producto` VARCHAR(200) NOT NULL,
    `precio_costo` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Costo al momento de venta',
    `precio_original` DECIMAL(12, 2) NULL DEFAULT NULL COMMENT 'Precio de lista original antes de rebaja',
    `precio_venta` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio final cobrado al cliente',
    `monto_descuento` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Monto de la rebaja acordada',
    `adelanto` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Adelanto recibido previamente en reserva',
    `ganancia_neta` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'precio_venta - precio_costo',
    `incluir_en_dashboard` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Sumar a métricas del Dashboard, 0 = Excluido',
    `nombre_cliente` VARCHAR(150) NULL DEFAULT NULL,
    `fecha_venta` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notas` TEXT NULL,
    `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_actualizacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_historial_ventas_fecha_venta` (`fecha_venta`),
    INDEX `idx_historial_ventas_incluir` (`incluir_en_dashboard`),
    INDEX `idx_historial_ventas_producto_id` (`producto_id`),
    CONSTRAINT `fk_historial_ventas_producto` 
        FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- DATOS SEMILLA (SEED DATA)
-- -----------------------------------------------------------------------------
INSERT INTO `usuarios` (`id`, `nombre`, `correo`, `contrasena`, `rol`) VALUES
(1, 'Administrador General', 'admin@importadora.com', '$2y$10$5S0oBmx631OWITPII.FtBuQ7NuaTZ3BtvzJV2ChAhuIAyidVeXoTO', 'admin');
