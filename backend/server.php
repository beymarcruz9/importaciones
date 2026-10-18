<?php
/**
 * IMPORTADORA DE PRODUCTOS - SERVIDOR API RESTful
 * Servidor PHP autónomo y optimizado conectado a MySQL (importadora_db).
 * Provee compatibilidad 100% con las rutas y contratos de Laravel Sanctum.
 */

// -----------------------------------------------------------------------------
// 1. CONFIGURACIÓN DE CORS Y CABECERAS HTTP
// -----------------------------------------------------------------------------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// -----------------------------------------------------------------------------
// 2. CONEXIÓN A BASE DE DATOS MYSQL (importadora_db)
// -----------------------------------------------------------------------------
$dbHost = '127.0.0.1';
$dbName = 'importadora_db';
$dbUser = 'root';
$dbPass = '';

try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'message' => 'Error de conexión a la base de datos MySQL (importadora_db). Asegúrate de que XAMPP MySQL esté iniciado.',
        'error'   => $e->getMessage(),
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// 3. UTILIDADES DE ENRUTAMIENTO Y HELPERS
// -----------------------------------------------------------------------------
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// Servir archivos subidos estáticos directamente (/uploads/...)
if (strpos($uri, '/uploads/') === 0) {
    $filename = basename($uri);
    $filepath = __DIR__ . '/uploads/' . $filename;
    if (file_exists($filepath) && is_file($filepath)) {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $mimes = [
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'webp' => 'image/webp',
            'gif'  => 'image/gif',
        ];
        $contentType = $mimes[$ext] ?? 'application/octet-stream';
        header("Content-Type: {$contentType}");
        header('Cache-Control: public, max-age=86400');
        readfile($filepath);
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['message' => 'Imagen no encontrada']);
        exit;
    }
}

function getBearerToken(): ?string {
    $auth = '';
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $key => $val) {
            if (strtolower($key) === 'authorization') {
                $auth = $val;
                break;
            }
        }
    }
    if (empty($auth)) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    }
    if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function authenticate(PDO $pdo): ?array {
    $token = getBearerToken();
    if (!$token) return null;

    $stmt = $pdo->prepare('SELECT u.* FROM users u INNER JOIN personal_access_tokens pat ON pat.tokenable_id = u.id WHERE pat.token = :token LIMIT 1');
    $stmt->execute([':token' => hash('sha256', $token)]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function requireAuth(PDO $pdo): array {
    $user = authenticate($pdo);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['message' => 'No autenticado. Token ausente o expirado.']);
        exit;
    }
    return $user;
}

// Helper para adjuntar imágenes a productos
function attachImagesToProducts(PDO $pdo, array $products): array {
    if (empty($products)) return [];
    $productIds = array_column($products, 'id');
    $inClause = implode(',', array_fill(0, count($productIds), '?'));

    $stmt = $pdo->prepare("SELECT * FROM product_images WHERE product_id IN ($inClause) ORDER BY sort_order ASC");
    $stmt->execute($productIds);
    $images = $stmt->fetchAll();

    $imagesByProduct = [];
    foreach ($images as $img) {
        $imagesByProduct[$img['product_id']][] = [
            'id'         => (int)$img['id'],
            'image_url'  => $img['image_url'],
            'is_primary' => (bool)$img['is_primary'],
            'sort_order' => (int)$img['sort_order'],
        ];
    }

    foreach ($products as &$p) {
        $p['id'] = (int)$p['id'];
        $p['sale_price'] = (float)$p['sale_price'];
        if (isset($p['cost_price'])) {
            $p['cost_price'] = (float)$p['cost_price'];
        }
        $p['images'] = $imagesByProduct[$p['id']] ?? [];
        $p['primary_image'] = $p['images'][0]['image_url'] ?? 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=600&q=80';
        if (isset($p['category_name'])) {
            $p['category'] = [
                'id'   => $p['category_id'] ? (int)$p['category_id'] : null,
                'name' => $p['category_name'],
            ];
            unset($p['category_name']);
        }
    }
    return $products;
}

// -----------------------------------------------------------------------------
// 4. RUTAS DE AUTENTICACIÓN (LOGIN, LOGOUT, ME)
// -----------------------------------------------------------------------------
if ($uri === '/api/auth/login' && $method === 'POST') {
    $email = trim($body['email'] ?? '');
    $password = trim($body['password'] ?? '');

    if (empty($email) || empty($password)) {
        http_response_code(422);
        echo json_encode(['message' => 'El correo y la contraseña son obligatorios.']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(422);
        echo json_encode([
            'message' => 'Las credenciales proporcionadas son incorrectas.',
            'errors'  => ['email' => ['Correo o contraseña incorrectos.']],
        ]);
        exit;
    }

    // Generar token Sanctum
    $rawToken = bin2hex(random_bytes(32));
    $hashedToken = hash('sha256', $rawToken);

    $stmt = $pdo->prepare('INSERT INTO personal_access_tokens (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at) VALUES (:type, :id, :name, :token, :abilities, NOW(), NOW())');
    $stmt->execute([
        ':type'      => 'App\\Models\\User',
        ':id'        => $user['id'],
        ':name'      => 'admin-token',
        ':token'     => $hashedToken,
        ':abilities' => '["*"]',
    ]);

    echo json_encode([
        'message' => 'Autenticación exitosa',
        'token'   => $rawToken,
        'user'    => [
            'id'    => (int)$user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ],
    ]);
    exit;
}

if ($uri === '/api/auth/logout' && $method === 'POST') {
    $token = getBearerToken();
    if ($token) {
        $stmt = $pdo->prepare('DELETE FROM personal_access_tokens WHERE token = :token');
        $stmt->execute([':token' => hash('sha256', $token)]);
    }
    echo json_encode(['message' => 'Sesión cerrada correctamente.']);
    exit;
}

if ($uri === '/api/auth/me' && $method === 'GET') {
    $user = requireAuth($pdo);
    unset($user['password'], $user['remember_token']);
    echo json_encode(['user' => $user]);
    exit;
}

// -----------------------------------------------------------------------------
// 5. MÓDULO 1: RUTAS PÚBLICAS (CLIENTES)
// -----------------------------------------------------------------------------
// Catálogo público de productos (oculta 'vendido' y oculta 'cost_price')
if ($uri === '/api/public/products' && $method === 'GET') {
    $where = ["p.is_active = 1", "p.status != 'vendido'", "p.deleted_at IS NULL"];
    $params = [];

    if (!empty($_GET['category_id'])) {
        $where[] = "p.category_id = :category_id";
        $params[':category_id'] = $_GET['category_id'];
    }

    if (!empty($_GET['search'])) {
        $where[] = "p.name LIKE :search";
        $params[':search'] = '%' . $_GET['search'] . '%';
    }

    if (!empty($_GET['status']) && in_array($_GET['status'], ['disponible', 'reservado'])) {
        $where[] = "p.status = :status";
        $params[':status'] = $_GET['status'];
    }

    $sql = "SELECT p.id, p.category_id, p.name, p.slug, p.description, p.sale_price, p.status, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON c.id = p.category_id 
            WHERE " . implode(' AND ', $where) . " ORDER BY p.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();

    $products = attachImagesToProducts($pdo, $products);

    echo json_encode(['data' => $products]);
    exit;
}

// Detalle público de producto
if (preg_match('#^/api/public/products/([^/]+)$#', $uri, $matches) && $method === 'GET') {
    $slugOrId = $matches[1];
    $stmt = $pdo->prepare("SELECT p.id, p.category_id, p.name, p.slug, p.description, p.sale_price, p.status, c.name as category_name 
                           FROM products p 
                           LEFT JOIN categories c ON c.id = p.category_id 
                           WHERE (p.id = :val OR p.slug = :val) AND p.status != 'vendido' AND p.is_active = 1 LIMIT 1");
    $stmt->execute([':val' => $slugOrId]);
    $product = $stmt->fetch();

    if (!$product) {
        http_response_code(404);
        echo json_encode(['message' => 'Producto no encontrado o ya no está disponible.']);
        exit;
    }

    $products = attachImagesToProducts($pdo, [$product]);
    echo json_encode(['data' => $products[0]]);
    exit;
}

// Lista pública de categorías
if ($uri === '/api/public/categories' && $method === 'GET') {
    $sql = "SELECT c.*, COUNT(CASE WHEN p.is_active = 1 AND p.status != 'vendido' THEN 1 END) as products_count 
            FROM categories c 
            LEFT JOIN products p ON p.category_id = c.id 
            WHERE c.is_active = 1 
            GROUP BY c.id 
            ORDER BY c.name ASC";
    $stmt = $pdo->query($sql);
    $categories = $stmt->fetchAll();
    echo json_encode(['data' => $categories]);
    exit;
}

// Crear reserva pública (vigencia exacta de 7 días, con monto de adelanto opcional)
if (preg_match('#^/api/public/products/(\d+)/reserve$#', $uri, $matches) && $method === 'POST') {
    $productId = (int)$matches[1];
    $customerName = trim($body['customer_name'] ?? '');
    $customerPhone = trim($body['customer_phone'] ?? '');
    $advancePayment = isset($body['advance_payment']) ? max(0, (float)$body['advance_payment']) : 0.00;
    $agreedPrice = isset($body['agreed_price']) && (float)$body['agreed_price'] > 0 ? (float)$body['agreed_price'] : null;
    $notes = trim($body['notes'] ?? 'Reserva solicitada desde modal WhatsApp');

    if (empty($customerName)) {
        http_response_code(422);
        echo json_encode(['message' => 'El nombre del cliente es obligatorio.']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id AND is_active = 1 LIMIT 1");
    $stmt->execute([':id' => $productId]);
    $product = $stmt->fetch();

    if (!$product) {
        http_response_code(404);
        echo json_encode(['message' => 'Producto no encontrado.']);
        exit;
    }

    if ($product['status'] === 'reservado') {
        http_response_code(422);
        echo json_encode(['message' => 'Este producto ya cuenta con una reserva activa.']);
        exit;
    }

    if ($product['status'] === 'vendido') {
        http_response_code(422);
        echo json_encode(['message' => 'El producto ya fue vendido.']);
        exit;
    }

    // Calcular vigencia exacta de 7 días
    $reservedAt = date('Y-m-d H:i:s');
    $expiresAt  = date('Y-m-d H:i:s', strtotime('+7 days'));
    $finalAgreed = $agreedPrice ?: (float)$product['sale_price'];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO reservations (product_id, customer_name, customer_phone, advance_payment, agreed_price, reserved_at, expires_at, status, notes) VALUES (:pid, :name, :phone, :adv, :agreed, :res_at, :exp_at, 'activa', :notes)");
        $stmt->execute([
            ':pid'    => $productId,
            ':name'   => $customerName,
            ':phone'  => $customerPhone,
            ':adv'    => $advancePayment,
            ':agreed' => $finalAgreed,
            ':res_at' => $reservedAt,
            ':exp_at' => $expiresAt,
            ':notes'  => $notes,
        ]);
        $reservationId = $pdo->lastInsertId();

        $stmt = $pdo->prepare("UPDATE products SET status = 'reservado' WHERE id = :pid");
        $stmt->execute([':pid' => $productId]);

        $pdo->commit();

        echo json_encode([
            'message'     => 'Reserva registrada exitosamente por 7 días.',
            'reservation' => [
                'id'              => (int)$reservationId,
                'product_id'      => $productId,
                'customer_name'   => $customerName,
                'customer_phone'  => $customerPhone,
                'advance_payment' => $advancePayment,
                'agreed_price'    => $finalAgreed,
                'pending_balance' => max(0, $finalAgreed - $advancePayment),
                'reserved_at'     => $reservedAt,
                'expires_at'      => $expiresAt,
                'status'          => 'activa',
            ],
            'expires_at'  => $expiresAt,
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Error al registrar la reserva.', 'error' => $e->getMessage()]);
    }
    exit;
}

// -----------------------------------------------------------------------------
// 6. MÓDULOS 2 Y 3: RUTAS ADMINISTRATIVAS PROTEGIDAS
// -----------------------------------------------------------------------------

// Dashboard & Contabilidad (4 KPIs + Gráfico de Barras mensual)
if ($uri === '/api/admin/dashboard' && $method === 'GET') {
    requireAuth($pdo);

    $startMonth = date('Y-m-01 00:00:00');
    $endMonth   = date('Y-m-t 23:59:59');

    // 1. Ingresos totales del mes (solo ventas computables)
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(sale_price), 0) FROM sales_history WHERE include_in_dashboard = 1 AND sold_at BETWEEN :start AND :end");
    $stmt->execute([':start' => $startMonth, ':end' => $endMonth]);
    $revenueMonth = (float)$stmt->fetchColumn();

    // 2. Ganancia neta del mes (Venta - Costo de ventas computables)
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(net_profit), 0) FROM sales_history WHERE include_in_dashboard = 1 AND sold_at BETWEEN :start AND :end");
    $stmt->execute([':start' => $startMonth, ':end' => $endMonth]);
    $profitMonth = (float)$stmt->fetchColumn();

    // 3. Total productos vendidos computables en el mes
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM sales_history WHERE include_in_dashboard = 1 AND sold_at BETWEEN :start AND :end");
    $stmt->execute([':start' => $startMonth, ':end' => $endMonth]);
    $soldMonth = (int)$stmt->fetchColumn();

    $stmt = $pdo->query("SELECT COUNT(*) FROM sales_history WHERE include_in_dashboard = 1");
    $soldAllTime = (int)$stmt->fetchColumn();

    // 4. Reservas activas (< 7 días)
    $stmt = $pdo->query("SELECT COUNT(*) FROM reservations WHERE status = 'activa' AND expires_at > NOW()");
    $activeReservations = (int)$stmt->fetchColumn();

    // Inventario
    $stmt = $pdo->query("SELECT 
        COUNT(CASE WHEN status = 'disponible' AND is_active = 1 THEN 1 END) as disponibles,
        COUNT(CASE WHEN status = 'reservado' THEN 1 END) as reservados,
        COUNT(CASE WHEN status = 'vendido' THEN 1 END) as vendidos
        FROM products WHERE deleted_at IS NULL");
    $inv = $stmt->fetch();

    // Gráfico de barras mensual (últimos 6 meses, solo ventas computables)
    $labels = [];
    $revenueData = [];
    $profitData = [];
    $months = [
        1 => 'Ene', 2 => 'Feb', 3 => 'Mar', 4 => 'Abr', 5 => 'May', 6 => 'Jun',
        7 => 'Jul', 8 => 'Ago', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dic'
    ];

    for ($i = 5; $i >= 0; $i--) {
        $timestamp = strtotime("-{$i} month");
        $mNum = (int)date('n', $timestamp);
        $year = date('Y', $timestamp);
        $label = $months[$mNum] . ' ' . $year;
        $labels[] = $label;

        $mStart = date('Y-m-01 00:00:00', $timestamp);
        $mEnd   = date('Y-m-t 23:59:59', $timestamp);

        $stmt = $pdo->prepare("SELECT COALESCE(SUM(sale_price), 0) as rev, COALESCE(SUM(net_profit), 0) as prof FROM sales_history WHERE include_in_dashboard = 1 AND sold_at BETWEEN :s AND :e");
        $stmt->execute([':s' => $mStart, ':e' => $mEnd]);
        $res = $stmt->fetch();

        $revenueData[] = round((float)$res['rev'], 2);
        $profitData[]  = round((float)$res['prof'], 2);
    }

    echo json_encode([
        'metrics' => [
            'total_revenue_month' => $revenueMonth,
            'net_profit_month'    => $profitMonth,
            'total_sold_month'    => $soldMonth,
            'total_sold_all_time' => $soldAllTime,
            'active_reservations' => $activeReservations,
            'inventory'           => [
                'disponibles' => (int)$inv['disponibles'],
                'reservados'  => (int)$inv['reservados'],
                'vendidos'    => (int)$inv['vendidos'],
            ],
        ],
        'chart' => [
            'labels'   => $labels,
            'datasets' => [
                ['label' => 'Ingresos Totales (Venta)', 'data' => $revenueData],
                ['label' => 'Ganancia Neta (Utilidad)', 'data' => $profitData],
            ],
        ],
    ]);
    exit;
}

// CRUD de Productos (Listado Admin con costo confidencial y margen)
if ($uri === '/api/admin/products' && $method === 'GET') {
    requireAuth($pdo);

    $where = ["p.deleted_at IS NULL"];
    $params = [];

    if (!empty($_GET['status'])) {
        $where[] = "p.status = :status";
        $params[':status'] = $_GET['status'];
    }

    if (!empty($_GET['search'])) {
        $where[] = "p.name LIKE :search";
        $params[':search'] = '%' . $_GET['search'] . '%';
    }

    $sql = "SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON c.id = p.category_id 
            WHERE " . implode(' AND ', $where) . " ORDER BY p.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();
    $products = attachImagesToProducts($pdo, $products);

    echo json_encode(['data' => $products]);
    exit;
}

// Subir imagen desde la computadora o galería de celular
if ($uri === '/api/admin/upload-image' && $method === 'POST') {
    requireAuth($pdo);

    $uploadedUrl = null;
    $uploadsDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0777, true);
    }

    // 1. Archivo subido vía FormData ($_FILES)
    if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $tmpName = $_FILES['image']['tmp_name'];
        $origName = $_FILES['image']['name'];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        if (!in_array($ext, $allowedExts)) {
            http_response_code(422);
            echo json_encode(['message' => 'Formato no permitido. Solo se aceptan JPG, PNG, WEBP o GIF.']);
            exit;
        }

        $newName = 'img_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (move_uploaded_file($tmpName, $uploadsDir . $newName)) {
            $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $uploadedUrl = "{$scheme}://{$host}/uploads/{$newName}";
        }
    }
    // 2. Archivo subido vía Base64 JSON
    elseif (!empty($body['image_base64'])) {
        $base64Data = $body['image_base64'];
        if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
            $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
            $ext = strtolower($type[1]);
            if ($ext === 'jpeg') $ext = 'jpg';
            $decoded = base64_decode($base64Data);

            if ($decoded !== false) {
                $newName = 'img_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                file_put_contents($uploadsDir . $newName, $decoded);
                $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
                $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $uploadedUrl = "{$scheme}://{$host}/uploads/{$newName}";
            }
        }
    }

    if ($uploadedUrl) {
        echo json_encode([
            'message' => 'Imagen subida exitosamente.',
            'url'     => $uploadedUrl,
        ]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['message' => 'No se recibió ninguna imagen válida para subir.']);
    exit;
}

// -----------------------------------------------------------------------------
// GESTIÓN DE CATEGORÍAS (ADMIN)
// -----------------------------------------------------------------------------

// Listar categorías para el administrador (con conteo total de productos)
if ($uri === '/api/admin/categories' && $method === 'GET') {
    requireAuth($pdo);

    $sql = "SELECT c.*, COUNT(p.id) as products_count 
            FROM categories c 
            LEFT JOIN products p ON p.category_id = c.id AND p.deleted_at IS NULL
            GROUP BY c.id 
            ORDER BY c.name ASC";
    $stmt = $pdo->query($sql);
    $categories = $stmt->fetchAll();
    echo json_encode(['data' => $categories]);
    exit;
}

// Crear nueva categoría
if ($uri === '/api/admin/categories' && $method === 'POST') {
    requireAuth($pdo);

    $name = trim($body['name'] ?? '');
    $description = trim($body['description'] ?? '');

    if (empty($name)) {
        http_response_code(422);
        echo json_encode(['message' => 'El nombre de la categoría es obligatorio.']);
        exit;
    }

    $baseSlug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
    $slug = $baseSlug . '-' . substr(bin2hex(random_bytes(2)), 0, 4);

    try {
        $stmt = $pdo->prepare("INSERT INTO categories (name, slug, description, is_active, created_at, updated_at) VALUES (:name, :slug, :desc, 1, NOW(), NOW())");
        $stmt->execute([
            ':name' => $name,
            ':slug' => $slug,
            ':desc' => $description,
        ]);
        $newId = (int)$pdo->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'message'  => 'Categoría creada exitosamente.',
            'category' => [
                'id'             => $newId,
                'name'           => $name,
                'slug'           => $slug,
                'description'    => $description,
                'products_count' => 0,
            ],
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error al guardar la categoría.', 'error' => $e->getMessage()]);
    }
    exit;
}

// Editar categoría
if (preg_match('#^/api/admin/categories/(\d+)$#', $uri, $matches) && $method === 'PUT') {
    requireAuth($pdo);
    $catId = (int)$matches[1];

    $name = trim($body['name'] ?? '');
    $description = trim($body['description'] ?? '');

    if (empty($name)) {
        http_response_code(422);
        echo json_encode(['message' => 'El nombre de la categoría es obligatorio.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE categories SET name = :name, description = :desc, updated_at = NOW() WHERE id = :id");
        $stmt->execute([
            ':name' => $name,
            ':desc' => $description,
            ':id'   => $catId,
        ]);

        echo json_encode(['message' => 'Categoría actualizada exitosamente.']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error al actualizar categoría.', 'error' => $e->getMessage()]);
    }
    exit;
}

// Eliminar categoría
if (preg_match('#^/api/admin/categories/(\d+)$#', $uri, $matches) && $method === 'DELETE') {
    requireAuth($pdo);
    $catId = (int)$matches[1];

    $pdo->beginTransaction();
    try {
        // Desvincular productos para no dejarlos huérfanos
        $stmtProd = $pdo->prepare("UPDATE products SET category_id = NULL WHERE category_id = :id");
        $stmtProd->execute([':id' => $catId]);

        // Eliminar la categoría
        $stmtDel = $pdo->prepare("DELETE FROM categories WHERE id = :id");
        $stmtDel->execute([':id' => $catId]);

        $pdo->commit();
        echo json_encode([
            'message' => 'Categoría eliminada exitosamente. Los productos que pertenecían a ella se conservaron sin categoría asignada.',
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Error al eliminar la categoría.', 'error' => $e->getMessage()]);
    }
    exit;
}

// Crear producto con 1 a 3 imágenes
if ($uri === '/api/admin/products' && $method === 'POST') {
    requireAuth($pdo);

    $name = trim($body['name'] ?? '');
    $categoryId = !empty($body['category_id']) ? (int)$body['category_id'] : null;
    $description = trim($body['description'] ?? '');
    $costPrice = (float)($body['cost_price'] ?? 0);
    $salePrice = (float)($body['sale_price'] ?? 0);
    $status = in_array($body['status'] ?? '', ['disponible', 'reservado', 'vendido']) ? $body['status'] : 'disponible';
    $imagesInput = $body['images'] ?? [];
    if (is_string($imagesInput)) {
        $imagesInput = [$imagesInput];
    }
    $images = is_array($imagesInput) ? array_values(array_filter($imagesInput)) : [];

    if (empty($name) || empty($images)) {
        http_response_code(422);
        echo json_encode(['message' => 'Nombre y al menos una imagen son obligatorios.']);
        exit;
    }

    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name))) . '-' . substr(bin2hex(random_bytes(3)), 0, 5);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO products (category_id, name, slug, description, cost_price, sale_price, status, is_active, created_at, updated_at) VALUES (:cat, :name, :slug, :desc, :cost, :sale, :stat, 1, NOW(), NOW())");
        $stmt->execute([
            ':cat'  => $categoryId,
            ':name' => $name,
            ':slug' => $slug,
            ':desc' => $description,
            ':cost' => $costPrice,
            ':sale' => $salePrice,
            ':stat' => $status,
        ]);
        $productId = $pdo->lastInsertId();

        $stmtImg = $pdo->prepare("INSERT INTO product_images (product_id, image_url, sort_order, is_primary) VALUES (:pid, :url, :order, :primary)");
        foreach (array_values(array_slice($images, 0, 3)) as $idx => $url) {
            $stmtImg->execute([
                ':pid'     => $productId,
                ':url'     => $url,
                ':order'   => $idx,
                ':primary' => ($idx === 0) ? 1 : 0,
            ]);
        }

        // Si se crea directamente como vendido, registrar en sales_history
        if ($status === 'vendido') {
            $stmtSale = $pdo->prepare("INSERT INTO sales_history (product_id, product_name, cost_price, sale_price, net_profit, sold_at, notes) VALUES (:pid, :name, :cost, :sale, :prof, NOW(), 'Venta inicial registrada')");
            $stmtSale->execute([
                ':pid'  => $productId,
                ':name' => $name,
                ':cost' => $costPrice,
                ':sale' => $salePrice,
                ':prof' => ($salePrice - $costPrice),
            ]);
        }

        $pdo->commit();
        echo json_encode(['message' => 'Producto creado exitosamente.', 'id' => $productId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Error al guardar producto.', 'error' => $e->getMessage()]);
    }
    exit;
}

// Actualizar producto
if (preg_match('#^/api/admin/products/(\d+)$#', $uri, $matches) && $method === 'PUT') {
    requireAuth($pdo);
    $productId = (int)$matches[1];

    $stmtOld = $pdo->prepare("SELECT * FROM products WHERE id = :id");
    $stmtOld->execute([':id' => $productId]);
    $oldProduct = $stmtOld->fetch();

    if (!$oldProduct) {
        http_response_code(404);
        echo json_encode(['message' => 'Producto no encontrado.']);
        exit;
    }

    $name = trim($body['name'] ?? $oldProduct['name']);
    $categoryId = !empty($body['category_id']) ? (int)$body['category_id'] : $oldProduct['category_id'];
    $description = $body['description'] ?? $oldProduct['description'];
    $costPrice = isset($body['cost_price']) ? (float)$body['cost_price'] : (float)$oldProduct['cost_price'];
    $salePrice = isset($body['sale_price']) ? (float)$body['sale_price'] : (float)$oldProduct['sale_price'];
    $imagesInput = $body['images'] ?? [];
    if (is_string($imagesInput)) {
        $imagesInput = [$imagesInput];
    }
    $images = is_array($imagesInput) ? array_values(array_filter($imagesInput)) : [];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("UPDATE products SET category_id = :cat, name = :name, description = :desc, cost_price = :cost, sale_price = :sale, status = :stat, updated_at = NOW() WHERE id = :id");
        $stmt->execute([
            ':cat'  => $categoryId,
            ':name' => $name,
            ':desc' => $description,
            ':cost' => $costPrice,
            ':sale' => $salePrice,
            ':stat' => $newStatus,
            ':id'   => $productId,
        ]);

        if (!empty($images)) {
            $pdo->prepare("DELETE FROM product_images WHERE product_id = :pid")->execute([':pid' => $productId]);
            $stmtImg = $pdo->prepare("INSERT INTO product_images (product_id, image_url, sort_order, is_primary) VALUES (:pid, :url, :order, :primary)");
            foreach (array_values(array_slice($images, 0, 3)) as $idx => $url) {
                $stmtImg->execute([
                    ':pid'     => $productId,
                    ':url'     => $url,
                    ':order'   => $idx,
                    ':primary' => ($idx === 0) ? 1 : 0,
                ]);
            }
        }

        // TRIGGER AUTOMÁTICO: Si cambió a vendido, registrar en sales_history
        if ($oldProduct['status'] !== 'vendido' && $newStatus === 'vendido') {
            $includeInDashboard = isset($body['include_in_dashboard']) ? ((bool)$body['include_in_dashboard'] ? 1 : 0) : 1;
            $stmtSale = $pdo->prepare("INSERT INTO sales_history (product_id, product_name, cost_price, original_price, sale_price, discount_amount, advance_payment, net_profit, include_in_dashboard, sold_at, notes) VALUES (:pid, :name, :cost, :orig, :sale, 0.00, 0.00, :prof, :inc, NOW(), 'Venta registrada automáticamente al editar producto a Vendido.')");
            $stmtSale->execute([
                ':pid'  => $productId,
                ':name' => $name,
                ':cost' => $costPrice,
                ':orig' => $salePrice,
                ':sale' => $salePrice,
                ':prof' => ($salePrice - $costPrice),
                ':inc'  => $includeInDashboard,
            ]);

            $pdo->prepare("UPDATE reservations SET status = 'completada' WHERE product_id = :pid AND status = 'activa'")->execute([':pid' => $productId]);
        }

        $pdo->commit();
        echo json_encode(['message' => 'Producto actualizado exitosamente.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Error actualizando producto.', 'error' => $e->getMessage()]);
    }
    exit;
}

// Cambio rápido de estado
if (preg_match('#^/api/admin/products/(\d+)/status$#', $uri, $matches) && $method === 'PATCH') {
    requireAuth($pdo);
    $productId = (int)$matches[1];
    $newStatus = $body['status'] ?? '';

    if (!in_array($newStatus, ['disponible', 'reservado', 'vendido'])) {
        http_response_code(422);
        echo json_encode(['message' => 'Estado inválido.']);
        exit;
    }

    $stmtOld = $pdo->prepare("SELECT * FROM products WHERE id = :id");
    $stmtOld->execute([':id' => $productId]);
    $product = $stmtOld->fetch();

    if (!$product) {
        http_response_code(404);
        echo json_encode(['message' => 'Producto no encontrado.']);
        exit;
    }

    $pdo->prepare("UPDATE products SET status = :status WHERE id = :id")->execute([':status' => $newStatus, ':id' => $productId]);

    if ($product['status'] !== 'vendido' && $newStatus === 'vendido') {
        $cost = (float)$product['cost_price'];
        $orig = (float)$product['sale_price'];
        $sale = isset($body['final_sale_price']) && (float)$body['final_sale_price'] > 0
            ? (float)$body['final_sale_price']
            : $orig;
        $disc = max(0, $orig - $sale);
        $prof = $sale - $cost;
        $cust = trim($body['customer_name'] ?? '');
        $notes = trim($body['notes'] ?? ($disc > 0 ? "Venta cerrada con rebaja de Bs " . number_format($disc, 2) : "Venta directa registrada al cambiar a Vendido."));
        $includeInDashboard = isset($body['include_in_dashboard']) ? ((bool)$body['include_in_dashboard'] ? 1 : 0) : 1;

        if (!empty($body['update_catalog_price'])) {
            $pdo->prepare("UPDATE products SET sale_price = :sp WHERE id = :id")->execute([':sp' => $sale, ':id' => $productId]);
        }

        $stmtSale = $pdo->prepare("INSERT INTO sales_history (product_id, product_name, cost_price, original_price, sale_price, discount_amount, advance_payment, net_profit, include_in_dashboard, customer_name, sold_at, notes) VALUES (:pid, :name, :cost, :orig, :sale, :disc, 0.00, :prof, :inc, :cust, NOW(), :notes)");
        $stmtSale->execute([
            ':pid'  => $productId,
            ':name' => $product['name'],
            ':cost' => $cost,
            ':orig' => $orig,
            ':sale' => $sale,
            ':disc' => $disc,
            ':prof' => $prof,
            ':inc'  => $includeInDashboard,
            ':cust' => !empty($cust) ? $cust : null,
            ':notes'=> $notes,
        ]);
        $pdo->prepare("UPDATE reservations SET status = 'completada' WHERE product_id = :pid AND status = 'activa'")->execute([':pid' => $productId]);
    }

    echo json_encode(['message' => 'Estado actualizado.', 'status' => $newStatus]);
    exit;
}

// Eliminar producto
if (preg_match('#^/api/admin/products/(\d+)$#', $uri, $matches) && $method === 'DELETE') {
    requireAuth($pdo);
    $productId = (int)$matches[1];
    $pdo->prepare("UPDATE products SET deleted_at = NOW() WHERE id = :id")->execute([':id' => $productId]);
    echo json_encode(['message' => 'Producto eliminado correctamente.']);
    exit;
}

// Gestión de Reservas (7 días)
if ($uri === '/api/admin/reservations' && $method === 'GET') {
    requireAuth($pdo);

    $where = ["1=1"];
    $params = [];

    if (!empty($_GET['status'])) {
        $where[] = "r.status = :status";
        $params[':status'] = $_GET['status'];
    }

    if (!empty($_GET['search'])) {
        $where[] = "(r.customer_name LIKE :s OR r.customer_phone LIKE :s OR p.name LIKE :s)";
        $params[':s'] = '%' . $_GET['search'] . '%';
    }

    $sql = "SELECT r.*, p.name as product_name, p.sale_price as product_price, p.status as product_status,
            (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as primary_image
            FROM reservations r
            INNER JOIN products p ON p.id = r.product_id
            WHERE " . implode(' AND ', $where) . " ORDER BY r.reserved_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $reservations = $stmt->fetchAll();

    $now = time();
    $data = array_map(function ($r) use ($now) {
        $expiresTs = strtotime($r['expires_at']);
        $diffDays = max(0, (int)ceil(($expiresTs - $now) / 86400));
        $prodPrice = (float)$r['product_price'];
        $advance = (float)($r['advance_payment'] ?? 0);
        $agreed = !empty($r['agreed_price']) && (float)$r['agreed_price'] > 0 ? (float)$r['agreed_price'] : $prodPrice;
        $pending = max(0, $agreed - $advance);

        return [
            'id'              => (int)$r['id'],
            'product_id'      => (int)$r['product_id'],
            'customer_name'   => $r['customer_name'],
            'customer_phone'  => $r['customer_phone'],
            'advance_payment' => $advance,
            'agreed_price'    => $agreed,
            'pending_balance' => $pending,
            'reserved_at'     => $r['reserved_at'],
            'expires_at'      => $r['expires_at'],
            'status'          => $r['status'],
            'is_expired'      => ($expiresTs <= $now),
            'days_remaining'  => $diffDays,
            'notes'           => $r['notes'],
            'product'         => [
                'id'            => (int)$r['product_id'],
                'name'          => $r['product_name'],
                'sale_price'    => $prodPrice,
                'status'        => $r['product_status'],
                'primary_image' => $r['primary_image'] ?? 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=400&q=80',
            ],
        ];
    }, $reservations);

    echo json_encode(['data' => $data]);
    exit;
}

// Crear reserva manual por el administrador (con monto de reserva y precio acordado)
if ($uri === '/api/admin/reservations' && $method === 'POST') {
    requireAuth($pdo);
    $productId = (int)($body['product_id'] ?? 0);
    $customerName = trim($body['customer_name'] ?? '');
    $customerPhone = trim($body['customer_phone'] ?? '');
    $advancePayment = max(0, (float)($body['advance_payment'] ?? 0));
    $agreedPrice = isset($body['agreed_price']) && (float)$body['agreed_price'] > 0 ? (float)$body['agreed_price'] : null;
    $notes = trim($body['notes'] ?? 'Reserva registrada manualmente por administrador');

    if (empty($customerName) || $productId <= 0) {
        http_response_code(422);
        echo json_encode(['message' => 'El producto y el nombre del cliente son obligatorios.']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id AND deleted_at IS NULL LIMIT 1");
    $stmt->execute([':id' => $productId]);
    $product = $stmt->fetch();

    if (!$product) {
        http_response_code(404);
        echo json_encode(['message' => 'Producto no encontrado.']);
        exit;
    }

    if ($product['status'] === 'vendido') {
        http_response_code(422);
        echo json_encode(['message' => 'El producto ya está marcado como vendido.']);
        exit;
    }

    $reservedAt = date('Y-m-d H:i:s');
    $expiresDays = max(1, (int)($body['expires_days'] ?? 7));
    $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expiresDays} days"));
    $finalAgreed = $agreedPrice ?: (float)$product['sale_price'];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO reservations (product_id, customer_name, customer_phone, advance_payment, agreed_price, reserved_at, expires_at, status, notes) VALUES (:pid, :name, :phone, :adv, :agreed, :res_at, :exp_at, 'activa', :notes)");
        $stmt->execute([
            ':pid'    => $productId,
            ':name'   => $customerName,
            ':phone'  => $customerPhone,
            ':adv'    => $advancePayment,
            ':agreed' => $finalAgreed,
            ':res_at' => $reservedAt,
            ':exp_at' => $expiresAt,
            ':notes'  => $notes,
        ]);
        $resId = (int)$pdo->lastInsertId();

        $pdo->prepare("UPDATE products SET status = 'reservado' WHERE id = :pid")->execute([':pid' => $productId]);
        $pdo->commit();

        echo json_encode([
            'message' => 'Reserva creada exitosamente.',
            'id'      => $resId,
            'advance_payment' => $advancePayment,
            'agreed_price'    => $finalAgreed,
            'pending_balance' => max(0, $finalAgreed - $advancePayment),
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Error al crear la reserva.', 'error' => $e->getMessage()]);
    }
    exit;
}

// Modificar datos / monto de reserva / precio acordado de una reserva
if (preg_match('#^/api/admin/reservations/(\d+)$#', $uri, $matches) && $method === 'PUT') {
    requireAuth($pdo);
    $resId = (int)$matches[1];

    $stmt = $pdo->prepare("SELECT * FROM reservations WHERE id = :id");
    $stmt->execute([':id' => $resId]);
    $res = $stmt->fetch();

    if (!$res) {
        http_response_code(404);
        echo json_encode(['message' => 'Reserva no encontrada.']);
        exit;
    }

    $updFields = [];
    $params = [':id' => $resId];

    if (isset($body['customer_name']) && trim($body['customer_name']) !== '') {
        $updFields[] = "customer_name = :cname";
        $params[':cname'] = trim($body['customer_name']);
    }
    if (isset($body['customer_phone'])) {
        $updFields[] = "customer_phone = :cphone";
        $params[':cphone'] = trim($body['customer_phone']);
    }
    if (isset($body['advance_payment'])) {
        $updFields[] = "advance_payment = :adv";
        $params[':adv'] = max(0, (float)$body['advance_payment']);
    }
    if (isset($body['agreed_price'])) {
        $updFields[] = "agreed_price = :agreed";
        $params[':agreed'] = max(0, (float)$body['agreed_price']);
    }
    if (isset($body['notes'])) {
        $updFields[] = "notes = :notes";
        $params[':notes'] = trim($body['notes']);
    }

    if (!empty($updFields)) {
        $updFields[] = "updated_at = NOW()";
        $sql = "UPDATE reservations SET " . implode(', ', $updFields) . " WHERE id = :id";
        $pdo->prepare($sql)->execute($params);
    }

    echo json_encode(['message' => 'Reserva actualizada correctamente.']);
    exit;
}

// Cancelar reserva (libera producto a Disponible)
if (preg_match('#^/api/admin/reservations/(\d+)/cancel$#', $uri, $matches) && $method === 'POST') {
    requireAuth($pdo);
    $resId = (int)$matches[1];

    $stmt = $pdo->prepare("SELECT * FROM reservations WHERE id = :id");
    $stmt->execute([':id' => $resId]);
    $res = $stmt->fetch();

    if ($res) {
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE reservations SET status = 'cancelada' WHERE id = :id")->execute([':id' => $resId]);
        $pdo->prepare("UPDATE products SET status = 'disponible' WHERE id = :pid AND status = 'reservado'")->execute([':pid' => $res['product_id']]);
        $pdo->commit();
    }

    echo json_encode(['message' => 'Reserva cancelada y producto liberado a disponible.']);
    exit;
}

// Concretar reserva (marca producto como vendido con precio final cerrado / rebaja)
if (preg_match('#^/api/admin/reservations/(\d+)/complete$#', $uri, $matches) && $method === 'POST') {
    requireAuth($pdo);
    $resId = (int)$matches[1];

    $stmt = $pdo->prepare("SELECT r.*, p.cost_price, p.sale_price, p.name as product_name FROM reservations r INNER JOIN products p ON p.id = r.product_id WHERE r.id = :id");
    $stmt->execute([':id' => $resId]);
    $res = $stmt->fetch();

    if (!$res) {
        http_response_code(404);
        echo json_encode(['message' => 'Reserva no encontrada.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $cost = (float)$res['cost_price'];
        $catalogPrice = (float)$res['sale_price'];
        $advancePayment = (float)$res['advance_payment'];

        // Precio final cerrado acordado con el cliente (con rebaja si corresponde)
        $finalSalePrice = isset($body['final_sale_price']) && (float)$body['final_sale_price'] > 0
            ? (float)$body['final_sale_price']
            : (!empty($res['agreed_price']) && (float)$res['agreed_price'] > 0 ? (float)$res['agreed_price'] : $catalogPrice);

        $discountAmount = max(0, $catalogPrice - $finalSalePrice);
        $netProfit = $finalSalePrice - $cost;

        $customNotes = trim($body['notes'] ?? '');
        $defaultNotes = $discountAmount > 0
            ? "Venta completada desde reserva con rebaja de Bs " . number_format($discountAmount, 2) . " (Adelanto recibido: Bs " . number_format($advancePayment, 2) . ")"
            : "Venta completada desde reserva (Adelanto recibido: Bs " . number_format($advancePayment, 2) . ")";
        $notes = !empty($customNotes) ? $customNotes : $defaultNotes;

        // 1. Marcar reserva como completada y guardar precio final pactado
        $pdo->prepare("UPDATE reservations SET status = 'completada', agreed_price = :agreed, updated_at = NOW() WHERE id = :id")->execute([
            ':agreed' => $finalSalePrice,
            ':id'     => $resId,
        ]);

        // 2. Marcar producto como vendido
        $pdo->prepare("UPDATE products SET status = 'vendido' WHERE id = :pid")->execute([':pid' => $res['product_id']]);

        // Si el admin solicitó actualizar el precio de venta en catálogo
        if (!empty($body['update_catalog_price'])) {
            $pdo->prepare("UPDATE products SET sale_price = :sp WHERE id = :pid")->execute([
                ':sp'  => $finalSalePrice,
                ':pid' => $res['product_id'],
            ]);
        }

        // 3. Registrar venta en sales_history con el precio final cerrado y ganancia neta real
        $includeInDashboard = isset($body['include_in_dashboard']) ? ((bool)$body['include_in_dashboard'] ? 1 : 0) : 1;

        $stmtSale = $pdo->prepare("INSERT INTO sales_history 
            (product_id, product_name, cost_price, original_price, sale_price, discount_amount, advance_payment, net_profit, include_in_dashboard, customer_name, sold_at, notes) 
            VALUES (:pid, :name, :cost, :orig, :sale, :disc, :adv, :prof, :inc, :cust, NOW(), :notes)");
        $stmtSale->execute([
            ':pid'  => $res['product_id'],
            ':name' => $res['product_name'],
            ':cost' => $cost,
            ':orig' => $catalogPrice,
            ':sale' => $finalSalePrice,
            ':disc' => $discountAmount,
            ':adv'  => $advancePayment,
            ':prof' => $netProfit,
            ':inc'  => $includeInDashboard,
            ':cust' => $res['customer_name'],
            ':notes'=> $notes,
        ]);

        $pdo->commit();

        echo json_encode([
            'message'              => 'Venta concretada exitosamente con el precio cerrado.',
            'final_sale_price'     => $finalSalePrice,
            'advance_payment'      => $advancePayment,
            'pending_collected'    => max(0, $finalSalePrice - $advancePayment),
            'discount_amount'      => $discountAmount,
            'net_profit'           => $netProfit,
            'include_in_dashboard' => (bool)$includeInDashboard,
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Error al concretar la venta.', 'error' => $e->getMessage()]);
    }
    exit;
}

// Alternar inclusión de una venta en métricas del Dashboard (1-click toggle)
if (preg_match('#^/api/admin/sales-history/(\d+)/toggle-metrics$#', $uri, $matches) && in_array($method, ['PATCH', 'POST'])) {
    requireAuth($pdo);
    $saleId = (int)$matches[1];

    $stmt = $pdo->prepare("SELECT id, include_in_dashboard FROM sales_history WHERE id = :id");
    $stmt->execute([':id' => $saleId]);
    $sale = $stmt->fetch();

    if (!$sale) {
        http_response_code(404);
        echo json_encode(['message' => 'Registro de venta no encontrado.']);
        exit;
    }

    $currentVal = (int)($sale['include_in_dashboard'] ?? 1);
    $newVal = isset($body['include_in_dashboard'])
        ? ((bool)$body['include_in_dashboard'] ? 1 : 0)
        : ($currentVal === 1 ? 0 : 1);

    $pdo->prepare("UPDATE sales_history SET include_in_dashboard = :inc WHERE id = :id")->execute([
        ':inc' => $newVal,
        ':id'  => $saleId,
    ]);

    echo json_encode([
        'message'              => $newVal === 1 ? 'Venta incluida en las métricas del Dashboard.' : 'Venta excluida de las métricas del Dashboard.',
        'id'                   => $saleId,
        'include_in_dashboard' => (bool)$newVal,
    ]);
    exit;
}

// Historial Contable de Ventas (con soporte de precio original, rebaja, adelanto e inclusión en dashboard)
if ($uri === '/api/admin/sales-history' && $method === 'GET') {
    requireAuth($pdo);

    $where = ["1=1"];
    $params = [];

    if (!empty($_GET['search'])) {
        $where[] = "(product_name LIKE :s OR customer_name LIKE :s)";
        $params[':s'] = '%' . $_GET['search'] . '%';
    }

    if (!empty($_GET['start_date']) && !empty($_GET['end_date'])) {
        $where[] = "sold_at BETWEEN :start AND :end";
        $params[':start'] = $_GET['start_date'] . ' 00:00:00';
        $params[':end']   = $_GET['end_date'] . ' 23:59:59';
    }

    $sql = "SELECT * FROM sales_history WHERE " . implode(' AND ', $where) . " ORDER BY sold_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $sales = $stmt->fetchAll();

    $totalRev = 0;
    $totalProf = 0;
    foreach ($sales as &$s) {
        $s['id'] = (int)$s['id'];
        $s['cost_price'] = (float)$s['cost_price'];
        $s['original_price'] = isset($s['original_price']) ? (float)$s['original_price'] : (float)$s['sale_price'];
        $s['sale_price'] = (float)$s['sale_price'];
        $s['discount_amount'] = isset($s['discount_amount']) ? (float)$s['discount_amount'] : 0.0;
        $s['advance_payment'] = isset($s['advance_payment']) ? (float)$s['advance_payment'] : 0.0;
        $s['net_profit'] = (float)$s['net_profit'];
        $s['include_in_dashboard'] = isset($s['include_in_dashboard']) ? (bool)$s['include_in_dashboard'] : true;

        if ($s['include_in_dashboard']) {
            $totalRev += $s['sale_price'];
            $totalProf += $s['net_profit'];
        }
    }

    echo json_encode([
        'data'    => $sales,
        'summary' => [
            'total_revenue' => $totalRev,
            'total_profit'  => $totalProf,
        ],
    ]);
    exit;
}

// Ruta no encontrada
http_response_code(404);
echo json_encode(['message' => 'Ruta no encontrada', 'uri' => $uri]);
