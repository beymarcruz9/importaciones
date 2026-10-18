-- =============================================================================
-- PROYECTO: IMPORTADORA DE PRODUCTOS (PLANTILLA MARCA BLANCA)
-- ARQUITECTO DE SOFTWARE: Senior Full-Stack Developer
-- MOTOR DE BASE DE DATOS: MySQL 8.0+ / MariaDB 10.4+
-- DESCRIPCIÓN: Estructura relacional completa para gestión de catálogo,
--              reservas con vigencia de 7 días, historial de ventas y contabilidad.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `importadora_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `importadora_db`;

-- Desactivar restricciones de clave foránea temporalmente para inicialización limpia
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `sales_history`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `product_images`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `personal_access_tokens`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. TABLA: users (Administradores con autenticación Laravel Sanctum)
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'operator') NOT NULL DEFAULT 'admin',
    `remember_token` VARCHAR(100) NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. TABLA: personal_access_tokens (Tokens de API para Laravel Sanctum)
-- -----------------------------------------------------------------------------
CREATE TABLE `personal_access_tokens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tokenable_type` VARCHAR(191) NOT NULL,
    `tokenable_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `token` VARCHAR(64) NOT NULL UNIQUE,
    `abilities` TEXT NULL,
    `last_used_at` TIMESTAMP NULL DEFAULT NULL,
    `expires_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`, `tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TABLA: categories (Categorías de productos)
-- -----------------------------------------------------------------------------
CREATE TABLE `categories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. TABLA: products (Catálogo de productos y control de precios/costos)
-- NOTA ARQUITECTÓNICA: `cost_price` es confidencial para métricas y contabilidad.
-- El frontend público NUNCA debe recibir este campo.
-- -----------------------------------------------------------------------------
CREATE TABLE `products` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(220) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `cost_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio de costo interno (oculto al público)',
    `sale_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio de venta al público',
    `status` ENUM('disponible', 'reservado', 'vendido') NOT NULL DEFAULT 'disponible',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_products_status` (`status`),
    INDEX `idx_products_category_id` (`category_id`),
    INDEX `idx_products_is_active` (`is_active`),
    CONSTRAINT `fk_products_category` 
        FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. TABLA: product_images (Carrusel de 1 a 3 imágenes por producto)
-- -----------------------------------------------------------------------------
CREATE TABLE `product_images` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_product_images_product_id` (`product_id`),
    CONSTRAINT `fk_product_images_product` 
        FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. TABLA: reservations (Control y expiración automática a 7 días)
-- -----------------------------------------------------------------------------
CREATE TABLE `reservations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `customer_name` VARCHAR(150) NOT NULL COMMENT 'Nombre del cliente ingresado en el modal',
    `customer_phone` VARCHAR(50) NULL DEFAULT NULL,
    `advance_payment` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Monto de adelanto con el que se reserva en Bs',
    `agreed_price` DECIMAL(12, 2) NULL DEFAULT NULL COMMENT 'Precio pactado de venta con rebaja en Bs',
    `reserved_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` DATETIME NOT NULL COMMENT 'Vigencia exacta de 7 días (reserved_at + 7 days)',
    `status` ENUM('activa', 'completada', 'expirada', 'cancelada') NOT NULL DEFAULT 'activa',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_reservations_status_expires_at` (`status`, `expires_at`),
    INDEX `idx_reservations_product_id` (`product_id`),
    CONSTRAINT `fk_reservations_product` 
        FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. TABLA: sales_history (Registro contable automático al vender un producto)
-- Guarda snapshot histórico de costo, venta y ganancia neta.
-- Soporta rebajas negociadas con el cliente y registro de adelantos.
-- -----------------------------------------------------------------------------
CREATE TABLE `sales_history` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `cost_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Costo al momento de venta',
    `original_price` DECIMAL(12, 2) NULL DEFAULT NULL COMMENT 'Precio de lista original antes de rebaja',
    `sale_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Precio final cerrado/cobrado al cliente',
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Monto de la rebaja acordada',
    `advance_payment` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Adelanto recibido previamente en reserva',
    `net_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'sale_price - cost_price',
    `include_in_dashboard` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Sumar a métricas del Dashboard, 0 = Excluido',
    `customer_name` VARCHAR(150) NULL DEFAULT NULL,
    `sold_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_sales_history_sold_at` (`sold_at`),
    INDEX `idx_sales_history_include` (`include_in_dashboard`),
    INDEX `idx_sales_history_product_id` (`product_id`),
    CONSTRAINT `fk_sales_history_product` 
        FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- DATOS SEMILLA (SEED DATA PARA INICIALIZACIÓN INMEDIATA)
-- -----------------------------------------------------------------------------

-- Admin por defecto: admin@importadora.com / password: password123
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`) VALUES
(1, 'Administrador General', 'admin@importadora.com', '$2y$10$5S0oBmx631OWITPII.FtBuQ7NuaTZ3BtvzJV2ChAhuIAyidVeXoTO', 'admin');
-- Nota: Hash bcrypt verificado para 'password123'

-- Categorías
INSERT INTO `categories` (`id`, `name`, `slug`, `description`) VALUES
(1, 'Electrónica y Gadgets', 'electronica-gadgets', 'Dispositivos tecnológicos, accesorios y novedades'),
(2, 'Hogar y Cocina', 'hogar-cocina', 'Artículos prácticos y modernos para el hogar'),
(3, 'Herramientas y Accesorios', 'herramientas-accesorios', 'Equipamiento y herramientas de importación directa');

-- Productos de demostración con costos y precios de venta
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `description`, `cost_price`, `sale_price`, `status`, `is_active`) VALUES
(1, 1, 'Proyector Portátil Smart 4K UHD Wi-Fi', 'proyector-portatil-smart-4k', 'Proyector compacto con Android TV integrado, parlantes estéreo Hi-Fi y resolución nativa 1080p con soporte 4K. Ideal para cine en casa o presentaciones.', 120.00, 240.00, 'disponible', 1),
(2, 1, 'Smartwatch Deportivo Pro GPS Resistencia 5ATM', 'smartwatch-deportivo-pro-gps', 'Reloj inteligente con monitor cardíaco continuo, SpO2, GPS integrado, autonomía de 14 días y sumergible.', 45.00, 95.00, 'disponible', 1),
(3, 2, 'Cafetera Espresso Automática 20 Bares con Espumador', 'cafetera-espresso-automatica-20-bares', 'Bomba italiana de alta presión de 20 bares, caldera de acero inoxidable y varilla de vapor profesional para capuchinos.', 80.00, 160.00, 'reservado', 1),
(4, 2, 'Aspiradora Inalámbrica Cyclone 25000Pa', 'aspiradora-inalambrica-cyclone', 'Batería de larga duración desmontable, filtro HEPA lavable y accesorios múltiples para auto y alfombras.', 70.00, 145.00, 'disponible', 1),
(5, 3, 'Kit de Taladro Percutor Inalámbrico 21V con 2 Baterías', 'kit-taladro-percutor-inalambrico-21v', 'Motor sin carbones (Brushless), maletín rígido y set de 32 brocas y puntas para trabajo pesado.', 55.00, 110.00, 'vendido', 1);

-- Imágenes de productos (1 a 3 fotos por producto para el carrusel)
INSERT INTO `product_images` (`product_id`, `image_url`, `sort_order`, `is_primary`) VALUES
-- Proyector
(1, 'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=800&q=80', 0, 1),
(1, 'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=800&q=80', 1, 0),
(1, 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80', 2, 0),
-- Smartwatch
(2, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', 0, 1),
(2, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80', 1, 0),
-- Cafetera (Reservada)
(3, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80', 0, 1),
(3, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', 1, 0),
(3, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80', 2, 0),
-- Aspiradora
(4, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80', 0, 1),
(4, 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80', 1, 0),
-- Taladro (Vendido)
(5, 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80', 0, 1);

-- Reserva activa para la Cafetera (vigencia de 7 días exactos)
INSERT INTO `reservations` (`id`, `product_id`, `customer_name`, `customer_phone`, `reserved_at`, `expires_at`, `status`, `notes`) VALUES
(1, 3, 'Carlos Mendoza', '+59172970461', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'activa', 'Reserva iniciada desde botón WhatsApp');

-- Venta registrada en historial para el producto vendido
INSERT INTO `sales_history` (`product_id`, `product_name`, `cost_price`, `sale_price`, `net_profit`, `customer_name`, `sold_at`, `notes`) VALUES
(5, 'Kit de Taladro Percutor Inalámbrico 21V con 2 Baterías', 55.00, 110.00, 55.00, 'Fernando Suárez', NOW(), 'Venta completada');
