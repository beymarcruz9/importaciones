<?php
/**
 * IMPORTADORA DE PRODUCTOS - SERVIDOR API RESTful
 * Servidor PHP autónomo y optimizado conectado a MySQL (importadora_db).
 * Tablas y columnas en ESPAÑOL con total compatibilidad de API para el Frontend.
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
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
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
        header('Access-Control-Allow-Origin: *');
        readfile($filepath);
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['message' => 'Imagen no encontrada']);
        exit;
    }
}

function getBearerToken(): ?string {
    $headers = [];
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    }
    $auth = '';
    if (!empty($headers)) {
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

    $stmt = $pdo->prepare('SELECT u.id, u.nombre as name, u.correo as email, u.rol as role 
                           FROM usuarios u 
                           INNER JOIN tokens_acceso pat ON pat.entidad_id = u.id 
                           WHERE pat.token = :token LIMIT 1');
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

    $stmt = $pdo->prepare("SELECT id, producto_id, url_imagen, orden, es_principal 
                           FROM imagenes_producto 
                           WHERE producto_id IN ($inClause) 
                           ORDER BY orden ASC");
    $stmt->execute($productIds);
    $images = $stmt->fetchAll();

    $imagesByProduct = [];
    foreach ($images as $img) {
        $url = $img['url_imagen'];
        if (preg_match('#https?://(?:localhost|127\.0\.0\.1):8000(/uploads/.*)#', $url, $m)) {
            $url = $m[1];
        }
        $imagesByProduct[$img['producto_id']][] = [
            'id'         => (int)$img['id'],
            'image_url'  => $url,
            'is_primary' => (bool)$img['es_principal'],
            'sort_order' => (int)$img['orden'],
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
                'id'   => !empty($p['category_id']) ? (int)$p['category_id'] : null,
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

    $stmt = $pdo->prepare('SELECT id, nombre, correo, contrasena, rol FROM usuarios WHERE correo = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['contrasena'])) {
        http_response_code(422);
        echo json_encode([
            'message' => 'Las credenciales proporcionadas son incorrectas.',
            'errors'  => ['email' => ['Correo o contraseña incorrectos.']],
        ]);
        exit;
    }

    // Generar token
    $rawToken = bin2hex(random_bytes(32));
    $hashedToken = hash('sha256', $rawToken);

    $stmt = $pdo->prepare('INSERT INTO tokens_acceso (tipo_entidad, entidad_id, nombre, token, habilidades, fecha_creacion, fecha_actualizacion) VALUES (:type, :id, :name, :token, :abilities, NOW(), NOW())');
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
            'name'  => $user['nombre'],
            'email' => $user['correo'],
            'role'  => $user['rol'],
        ],
    ]);
    exit;
}

if ($uri === '/api/auth/logout' && $method === 'POST') {
    $token = getBearerToken();
    if ($token) {
        $stmt = $pdo->prepare('DELETE FROM tokens_acceso WHERE token = :token');
        $stmt->execute([':token' => hash('sha256', $token)]);
    }
    echo json_encode(['message' => 'Sesión cerrada correctamente.']);
    exit;
}

if ($uri === '/api/auth/me' && $method === 'GET') {
    $user = requireAuth($pdo);
    echo json_encode(['user' => $user]);
    exit;
}

// -----------------------------------------------------------------------------
// 5. MÓDULO 1: RUTAS PÚBLICAS (CLIENTES)
// -----------------------------------------------------------------------------
// Catálogo público de productos (oculta 'vendido' y oculta 'precio_costo')
if ($uri === '/api/public/products' && $method === 'GET') {
    $where = ["p.activo = 1", "p.estado != 'vendido'", "p.fecha_eliminacion IS NULL"];
    $params = [];

    if (!empty($_GET['category_id'])) {
        $where[] = "p.categoria_id = :category_id";
        $params[':category_id'] = $_GET['category_id'];
    }

    if (!empty($_GET['search'])) {
        $where[] = "p.nombre LIKE :search";
        $params[':search'] = '%' . $_GET['search'] . '%';
    }

    if (!empty($_GET['status']) && in_array($_GET['status'], ['disponible', 'reservado'])) {
        $where[] = "p.estado = :status";
        $params[':status'] = $_GET['status'];
    }

    $sql = "SELECT p.id, p.categoria_id as category_id, p.nombre as name, p.slug, p.descripcion as description, p.precio_venta as sale_price, p.estado as status, c.nombre as category_name 
            FROM productos p 
            LEFT JOIN categorias c ON c.id = p.categoria_id 
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
    $stmt = $pdo->prepare("SELECT p.id, p.categoria_id as category_id, p.nombre as name, p.slug, p.descripcion as description, p.precio_venta as sale_price, p.estado as status, c.nombre as category_name 
                           FROM productos p 
                           LEFT JOIN categorias c ON c.id = p.categoria_id 
                           WHERE (p.id = :val OR p.slug = :val) AND p.estado != 'vendido' AND p.activo = 1 LIMIT 1");
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
    $sql = "SELECT c.id, c.nombre as name, c.slug, c.descripcion as description, c.activo as is_active, 
            COUNT(CASE WHEN p.activo = 1 AND p.estado != 'vendido' AND p.fecha_eliminacion IS NULL THEN 1 END) as products_count 
            FROM categorias c 
            LEFT JOIN productos p ON p.categoria_id = c.id 
            WHERE c.activo = 1 
            GROUP BY c.id 
            ORDER BY c.nombre ASC";
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

    $stmt = $pdo->prepare("SELECT * FROM productos WHERE id = :id AND activo = 1 AND fecha_eliminacion IS NULL LIMIT 1");
    $stmt->execute([':id' => $productId]);
    $product = $stmt->fetch();

    if (!$product) {
        http_response_code(404);
        echo json_encode(['message' => 'Producto no encontrado.']);
        exit;
    }

    if ($product['estado'] === 'reservado') {
        http_response_code(422);
        echo json_encode(['message' => 'Este producto ya cuenta con una reserva activa.']);
        exit;
    }

    if ($product['estado'] === 'vendido') {
        http_response_code(422);
        echo json_encode(['message' => 'El producto ya fue vendido.']);
        exit;
    }

    // Calcular vigencia exacta de 7 días
    $reservedAt = date('Y-m-d H:i:s');
    $expiresAt  = date('Y-m-d H:i:s', strtotime('+7 days'));
    $finalAgreed = $agreedPrice ?: (float)$product['precio_venta'];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO reservas (producto_id, nombre_cliente, telefono_cliente, adelanto, precio_pactado, fecha_reserva, fecha_expiracion, estado, notas, fecha_creacion, fecha_actualizacion) 
                               VALUES (:pid, :name, :phone, :adv, :agreed, :res_at, :exp_at, 'activa', :notes, NOW(), NOW())");
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

        $stmt = $pdo->prepare("UPDATE productos SET estado = 'reservado', fecha_actualizacion = NOW() WHERE id = :pid");
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
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(precio_venta), 0) FROM historial_ventas WHERE incluir_en_dashboard = 1 AND fecha_venta BETWEEN :start AND :end");
    $stmt->execute([':start' => $startMonth, ':end' => $endMonth]);
    $revenueMonth = (float)$stmt->fetchColumn();

    // 2. Ganancia neta del mes (Venta - Costo de ventas computables)
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(ganancia_neta), 0) FROM historial_ventas WHERE incluir_en_dashboard = 1 AND fecha_venta BETWEEN :start AND :end");
    $stmt->execute([':start' => $startMonth, ':end' => $endMonth]);
    $profitMonth = (float)$stmt->fetchColumn();

    // 3. Total productos vendidos computables en el mes
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM historial_ventas WHERE incluir_en_dashboard = 1 AND fecha_venta BETWEEN :start AND :end");
    $stmt->execute([':start' => $startMonth, ':end' => $endMonth]);
    $soldMonth = (int)$stmt->fetchColumn();

    $stmt = $pdo->query("SELECT COUNT(*) FROM historial_ventas WHERE incluir_en_dashboard = 1");
    $soldAllTime = (int)$stmt->fetchColumn();

    // 4. Reservas activas (< 7 días)
    $stmt = $pdo->query("SELECT COUNT(*) FROM reservas WHERE estado = 'activa' AND fecha_expiracion > NOW()");
    $activeReservations = (int)$stmt->fetchColumn();

    // Inventario
    $stmt = $pdo->query("SELECT 
        COUNT(CASE WHEN estado = 'disponible' AND activo = 1 THEN 1 END) as disponibles,
        COUNT(CASE WHEN estado = 'reservado' THEN 1 END) as reservados,
        COUNT(CASE WHEN estado = 'vendido' THEN 1 END) as vendidos
        FROM productos WHERE fecha_eliminacion IS NULL");
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

        $stmt = $pdo->prepare("SELECT COALESCE(SUM(precio_venta), 0) as rev, COALESCE(SUM(ganancia_neta), 0) as prof FROM historial_ventas WHERE incluir_en_dashboard = 1 AND fecha_venta BETWEEN :s AND :e");
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

    $where = ["p.fecha_eliminacion IS NULL"];
    $params = [];

    if (!empty($_GET['status'])) {
        $where[] = "p.estado = :status";
        $params[':status'] = $_GET['status'];
    }

    if (!empty($_GET['search'])) {
        $where[] = "p.nombre LIKE :search";
        $params[':search'] = '%' . $_GET['search'] . '%';
    }

    $sql = "SELECT p.id, p.categoria_id as category_id, p.nombre as name, p.slug, p.descripcion as description, 
                   p.precio_costo as cost_price, p.precio_venta as sale_price, p.estado as status, 
                   p.activo as is_active, p.fecha_creacion as created_at, p.fecha_actualizacion as updated_at, 
                   c.nombre as category_name 
            FROM productos p 
            LEFT JOIN categorias c ON c.id = p.categoria_id 
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
            $uploadedUrl = "/uploads/{$newName}";
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
                $uploadedUrl = "/uploads/{$newName}";
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

    $sql = "SELECT c.id, c.nombre as name, c.slug, c.descripcion as description, c.activo as is_active, 
            COUNT(p.id) as products_count 
            FROM categorias c 
            LEFT JOIN productos p ON p.categoria_id = c.id AND p.fecha_eliminacion IS NULL
            GROUP BY c.id 
            ORDER BY c.nombre ASC";
    $stmt = $pdo->query($sql);
    $categories = $stmt->fetchAll();
    echo json_encode(['data' => $categories]);
    exit;
}

// Crear nueva categoría
if ($uri === '/api/admin/categories' && $method === 'POST') {
    requireAuth($pdo);

    $name = trim($body['name'] ?? $body['nombre'] ?? '');
    $description = trim($body['description'] ?? $body['descripcion'] ?? '');

    if (empty($name)) {
        http_response_code(422);
        echo json_encode(['message' => 'El nombre de la categoría es obligatorio.']);
        exit;
    }

    $baseSlug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
    $slug = $baseSlug . '-' . substr(bin2hex(random_bytes(2)), 0, 4);

    try {
        $stmt = $pdo->prepare("INSERT INTO categorias (nombre, slug, descripcion, activo, fecha_creacion, fecha_actualizacion) 
                               VALUES (:name, :slug, :desc, 1, NOW(), NOW())");
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

    $name = trim($body['name'] ?? $body['nombre'] ?? '');
    $description = trim($body['description'] ?? $body['descripcion'] ?? '');

    if (empty($name)) {
        http_response_code(422);
        echo json_encode(['message' => 'El nombre de la categoría es obligatorio.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE categorias SET nombre = :name, descripcion = :desc, fecha_actualizacion = NOW() WHERE id = :id");
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
        $stmtProd = $pdo->prepare("UPDATE productos SET categoria_id = NULL WHERE categoria_id = :id");
        $stmtProd->execute([':id' => $catId]);

        // Eliminar la categoría
        $stmtDel = $pdo->prepare("DELETE FROM categorias WHERE id = :id");
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

    $name = trim($body['name'] ?? $body['nombre'] ?? '');
    $categoryId = !empty($body['category_id']) ? (int)$body['category_id'] : (!empty($body['categoria_id']) ? (int)$body['categoria_id'] : null);
    $description = trim($body['description'] ?? $body['descripcion'] ?? '');
    $costPrice = (float)($body['cost_price'] ?? $body['precio_costo'] ?? 0);
    $salePrice = (float)($body['sale_price'] ?? $body['precio_venta'] ?? 0);
    $statusInput = $body['status'] ?? $body['estado'] ?? 'disponible';
    $status = in_array($statusInput, ['disponible', 'reservado', 'vendido']) ? $statusInput : 'disponible';
    
    $imagesInput = $body['images'] ?? $body['imagenes'] ?? [];
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
        $stmt = $pdo->prepare("INSERT INTO productos (categoria_id, nombre, slug, descripcion, precio_costo, precio_venta, estado, activo, fecha_creacion, fecha_actualizacion) 
                               VALUES (:cat, :name, :slug, :desc, :cost, :sale, :stat, 1, NOW(), NOW())");
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

        $stmtImg = $pdo->prepare("INSERT INTO imagenes_producto (producto_id, url_imagen, orden, es_principal, fecha_creacion, fecha_actualizacion) 
                                  VALUES (:pid, :url, :order, :primary, NOW(), NOW())");
        foreach (array_values(array_slice($images, 0, 3)) as $idx => $url) {
            $stmtImg->execute([
                ':pid'     => $productId,
                ':url'     => $url,
                ':order'   => $idx,
                ':primary' => ($idx === 0) ? 1 : 0,
            ]);
        }

        // Si se crea directamente como vendido, registrar en historial_ventas
        if ($status === 'vendido') {
            $stmtSale = $pdo->prepare("INSERT INTO historial_ventas (producto_id, nombre_producto, precio_costo, precio_venta, ganancia_neta, fecha_venta, notas, fecha_creacion, fecha_actualizacion) 
                                       VALUES (:pid, :name, :cost, :sale, :prof, NOW(), 'Venta inicial registrada', NOW(), NOW())");
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

    $stmtOld = $pdo->prepare("SELECT * FROM productos WHERE id = :id");
    $stmtOld->execute([':id' => $productId]);
    $oldProduct = $stmtOld->fetch();

    if (!$oldProduct) {
        http_response_code(404);
        echo json_encode(['message' => 'Producto no encontrado.']);
        exit;
    }

    $name = trim($body['name'] ?? $body['nombre'] ?? $oldProduct['nombre']);
    $categoryId = !empty($body['category_id']) ? (int)$body['category_id'] : (!empty($body['categoria_id']) ? (int)$body['categoria_id'] : $oldProduct['categoria_id']);
    $description = $body['description'] ?? $body['descripcion'] ?? $oldProduct['descripcion'];
    $costPrice = isset($body['cost_price']) ? (float)$body['cost_price'] : (isset($body['precio_costo']) ? (float)$body['precio_costo'] : (float)$oldProduct['precio_costo']);
    $salePrice = isset($body['sale_price']) ? (float)$body['sale_price'] : (isset($body['precio_venta']) ? (float)$body['precio_venta'] : (float)$oldProduct['precio_venta']);
    $newStatus = in_array($body['status'] ?? $body['estado'] ?? '', ['disponible', 'reservado', 'vendido']) ? ($body['status'] ?? $body['estado']) : $oldProduct['estado'];

    $imagesInput = $body['images'] ?? $body['imagenes'] ?? [];
    if (is_string($imagesInput)) {
        $imagesInput = [$imagesInput];
    }
    $images = is_array($imagesInput) ? array_values(array_filter($imagesInput)) : [];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("UPDATE productos 
                               SET categoria_id = :cat, nombre = :name, descripcion = :desc, precio_costo = :cost, precio_venta = :sale, estado = :stat, fecha_actualizacion = NOW() 
                               WHERE id = :id");
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
            $pdo->prepare("DELETE FROM imagenes_producto WHERE producto_id = :pid")->execute([':pid' => $productId]);
            $stmtImg = $pdo->prepare("INSERT INTO imagenes_producto (producto_id, url_imagen, orden, es_principal, fecha_creacion, fecha_actualizacion) 
                                      VALUES (:pid, :url, :order, :primary, NOW(), NOW())");
            foreach (array_values(array_slice($images, 0, 3)) as $idx => $url) {
                $stmtImg->execute([
                    ':pid'     => $productId,
                    ':url'     => $url,
                    ':order'   => $idx,
                    ':primary' => ($idx === 0) ? 1 : 0,
                ]);
            }
        }

        // TRIGGER AUTOMÁTICO: Si cambió a vendido, registrar en historial_ventas
        if ($oldProduct['estado'] !== 'vendido' && $newStatus === 'vendido') {
            $includeInDashboard = isset($body['include_in_dashboard']) ? ((bool)$body['include_in_dashboard'] ? 1 : 0) : 1;
            $stmtSale = $pdo->prepare("INSERT INTO historial_ventas (producto_id, nombre_producto, precio_costo, precio_original, precio_venta, monto_descuento, adelanto, ganancia_neta, incluir_en_dashboard, fecha_venta, notas, fecha_creacion, fecha_actualizacion) 
                                       VALUES (:pid, :name, :cost, :orig, :sale, 0.00, 0.00, :prof, :inc, NOW(), 'Venta registrada automáticamente al editar producto a Vendido.', NOW(), NOW())");
            $stmtSale->execute([
                ':pid'  => $productId,
                ':name' => $name,
                ':cost' => $costPrice,
                ':orig' => $salePrice,
                ':sale' => $salePrice,
                ':prof' => ($salePrice - $costPrice),
                ':inc'  => $includeInDashboard,
            ]);

            $pdo->prepare("UPDATE reservas SET estado = 'completada', fecha_actualizacion = NOW() WHERE producto_id = :pid AND estado = 'activa'")->execute([':pid' => $productId]);
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
    $newStatus = $body['status'] ?? $body['estado'] ?? '';

    if (!in_array($newStatus, ['disponible', 'reservado', 'vendido'])) {
        http_response_code(422);
        echo json_encode(['message' => 'Estado inválido.']);
        exit;
    }

    $stmtOld = $pdo->prepare("SELECT * FROM productos WHERE id = :id");
    $stmtOld->execute([':id' => $productId]);
    $product = $stmtOld->fetch();

    if (!$product) {
        http_response_code(404);
        echo json_encode(['message' => 'Producto no encontrado.']);
        exit;
    }

    $pdo->prepare("UPDATE productos SET estado = :status, fecha_actualizacion = NOW() WHERE id = :id")->execute([':status' => $newStatus, ':id' => $productId]);

    if ($product['estado'] !== 'vendido' && $newStatus === 'vendido') {
        $cost = (float)$product['precio_costo'];
        $orig = (float)$product['precio_venta'];
        $sale = isset($body['final_sale_price']) && (float)$body['final_sale_price'] > 0
            ? (float)$body['final_sale_price']
            : $orig;
        $disc = max(0, $orig - $sale);
        $prof = $sale - $cost;
        $cust = trim($body['customer_name'] ?? '');
        $notes = trim($body['notes'] ?? ($disc > 0 ? "Venta cerrada con rebaja de Bs " . number_format($disc, 2) : "Venta directa registrada al cambiar a Vendido."));
        $includeInDashboard = isset($body['include_in_dashboard']) ? ((bool)$body['include_in_dashboard'] ? 1 : 0) : 1;

        if (!empty($body['update_catalog_price'])) {
            $pdo->prepare("UPDATE productos SET precio_venta = :sp, fecha_actualizacion = NOW() WHERE id = :id")->execute([':sp' => $sale, ':id' => $productId]);
        }

        $stmtSale = $pdo->prepare("INSERT INTO historial_ventas (producto_id, nombre_producto, precio_costo, precio_original, precio_venta, monto_descuento, adelanto, ganancia_neta, incluir_en_dashboard, nombre_cliente, fecha_venta, notas, fecha_creacion, fecha_actualizacion) 
                                   VALUES (:pid, :name, :cost, :orig, :sale, :disc, 0.00, :prof, :inc, :cust, NOW(), :notes, NOW(), NOW())");
        $stmtSale->execute([
            ':pid'  => $productId,
            ':name' => $product['nombre'],
            ':cost' => $cost,
            ':orig' => $orig,
            ':sale' => $sale,
            ':disc' => $disc,
            ':prof' => $prof,
            ':inc'  => $includeInDashboard,
            ':cust' => !empty($cust) ? $cust : null,
            ':notes'=> $notes,
        ]);
        $pdo->prepare("UPDATE reservas SET estado = 'completada', fecha_actualizacion = NOW() WHERE producto_id = :pid AND estado = 'activa'")->execute([':pid' => $productId]);
    }

    echo json_encode(['message' => 'Estado actualizado.', 'status' => $newStatus]);
    exit;
}

// Eliminar producto
if (preg_match('#^/api/admin/products/(\d+)$#', $uri, $matches) && $method === 'DELETE') {
    requireAuth($pdo);
    $productId = (int)$matches[1];
    $pdo->prepare("UPDATE productos SET fecha_eliminacion = NOW() WHERE id = :id")->execute([':id' => $productId]);
    echo json_encode(['message' => 'Producto eliminado correctamente.']);
    exit;
}

// Gestión de Reservas (7 días)
if ($uri === '/api/admin/reservations' && $method === 'GET') {
    requireAuth($pdo);

    $where = ["1=1"];
    $params = [];

    if (!empty($_GET['status'])) {
        $where[] = "r.estado = :status";
        $params[':status'] = $_GET['status'];
    }

    if (!empty($_GET['search'])) {
        $where[] = "(r.nombre_cliente LIKE :s OR r.telefono_cliente LIKE :s OR p.nombre LIKE :s)";
        $params[':s'] = '%' . $_GET['search'] . '%';
    }

    $sql = "SELECT r.id, r.producto_id, r.nombre_cliente, r.telefono_cliente, r.adelanto, r.precio_pactado, 
                   r.fecha_reserva, r.fecha_expiracion, r.estado, r.notas,
                   p.nombre as product_name, p.precio_venta as product_price, p.estado as product_status,
                   (SELECT url_imagen FROM imagenes_producto WHERE producto_id = p.id ORDER BY es_principal DESC, orden ASC LIMIT 1) as primary_image
            FROM reservas r
            INNER JOIN productos p ON p.id = r.producto_id
            WHERE " . implode(' AND ', $where) . " ORDER BY r.fecha_reserva DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $reservations = $stmt->fetchAll();

    $now = time();
    $data = array_map(function ($r) use ($now) {
        $expiresTs = strtotime($r['fecha_expiracion']);
        $diffDays = max(0, (int)ceil(($expiresTs - $now) / 86400));
        $prodPrice = (float)$r['product_price'];
        $advance = (float)($r['adelanto'] ?? 0);
        $agreed = !empty($r['precio_pactado']) && (float)$r['precio_pactado'] > 0 ? (float)$r['precio_pactado'] : $prodPrice;
        $pending = max(0, $agreed - $advance);

        return [
            'id'              => (int)$r['id'],
            'product_id'      => (int)$r['producto_id'],
            'customer_name'   => $r['nombre_cliente'],
            'customer_phone'  => $r['telefono_cliente'],
            'advance_payment' => $advance,
            'agreed_price'    => $agreed,
            'pending_balance' => $pending,
            'reserved_at'     => $r['fecha_reserva'],
            'expires_at'      => $r['fecha_expiracion'],
            'status'          => $r['estado'],
            'is_expired'      => ($expiresTs <= $now),
            'days_remaining'  => $diffDays,
            'notes'           => $r['notas'],
            'product'         => [
                'id'            => (int)$r['producto_id'],
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

// Crear reserva manual por el administrador
if ($uri === '/api/admin/reservations' && $method === 'POST') {
    requireAuth($pdo);
    $productId = (int)($body['product_id'] ?? $body['producto_id'] ?? 0);
    $customerName = trim($body['customer_name'] ?? $body['nombre_cliente'] ?? '');
    $customerPhone = trim($body['customer_phone'] ?? $body['telefono_cliente'] ?? '');
    $advancePayment = max(0, (float)($body['advance_payment'] ?? $body['adelanto'] ?? 0));
    $agreedPrice = isset($body['agreed_price']) && (float)$body['agreed_price'] > 0 ? (float)$body['agreed_price'] : (isset($body['precio_pactado']) && (float)$body['precio_pactado'] > 0 ? (float)$body['precio_pactado'] : null);
    $notes = trim($body['notes'] ?? $body['notas'] ?? 'Reserva registrada manualmente por administrador');

    if (empty($customerName) || $productId <= 0) {
        http_response_code(422);
        echo json_encode(['message' => 'El producto y el nombre del cliente son obligatorios.']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM productos WHERE id = :id AND fecha_eliminacion IS NULL LIMIT 1");
    $stmt->execute([':id' => $productId]);
    $product = $stmt->fetch();

    if (!$product) {
        http_response_code(404);
        echo json_encode(['message' => 'Producto no encontrado.']);
        exit;
    }

    if ($product['estado'] === 'vendido') {
        http_response_code(422);
        echo json_encode(['message' => 'El producto ya está marcado como vendido.']);
        exit;
    }

    $reservedAt = date('Y-m-d H:i:s');
    $expiresDays = max(1, (int)($body['expires_days'] ?? 7));
    $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expiresDays} days"));
    $finalAgreed = $agreedPrice ?: (float)$product['precio_venta'];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO reservas (producto_id, nombre_cliente, telefono_cliente, adelanto, precio_pactado, fecha_reserva, fecha_expiracion, estado, notas, fecha_creacion, fecha_actualizacion) 
                               VALUES (:pid, :name, :phone, :adv, :agreed, :res_at, :exp_at, 'activa', :notes, NOW(), NOW())");
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

        $pdo->prepare("UPDATE productos SET estado = 'reservado', fecha_actualizacion = NOW() WHERE id = :pid")->execute([':pid' => $productId]);
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

// Modificar datos de una reserva
if (preg_match('#^/api/admin/reservations/(\d+)$#', $uri, $matches) && $method === 'PUT') {
    requireAuth($pdo);
    $resId = (int)$matches[1];

    $stmt = $pdo->prepare("SELECT * FROM reservas WHERE id = :id");
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
        $updFields[] = "nombre_cliente = :cname";
        $params[':cname'] = trim($body['customer_name']);
    } elseif (isset($body['nombre_cliente']) && trim($body['nombre_cliente']) !== '') {
        $updFields[] = "nombre_cliente = :cname";
        $params[':cname'] = trim($body['nombre_cliente']);
    }

    if (isset($body['customer_phone'])) {
        $updFields[] = "telefono_cliente = :cphone";
        $params[':cphone'] = trim($body['customer_phone']);
    } elseif (isset($body['telefono_cliente'])) {
        $updFields[] = "telefono_cliente = :cphone";
        $params[':cphone'] = trim($body['telefono_cliente']);
    }

    if (isset($body['advance_payment'])) {
        $updFields[] = "adelanto = :adv";
        $params[':adv'] = max(0, (float)$body['advance_payment']);
    } elseif (isset($body['adelanto'])) {
        $updFields[] = "adelanto = :adv";
        $params[':adv'] = max(0, (float)$body['adelanto']);
    }

    if (isset($body['agreed_price'])) {
        $updFields[] = "precio_pactado = :agreed";
        $params[':agreed'] = max(0, (float)$body['agreed_price']);
    } elseif (isset($body['precio_pactado'])) {
        $updFields[] = "precio_pactado = :agreed";
        $params[':agreed'] = max(0, (float)$body['precio_pactado']);
    }

    if (isset($body['notes'])) {
        $updFields[] = "notas = :notes";
        $params[':notes'] = trim($body['notes']);
    } elseif (isset($body['notas'])) {
        $updFields[] = "notas = :notes";
        $params[':notes'] = trim($body['notas']);
    }

    if (!empty($updFields)) {
        $updFields[] = "fecha_actualizacion = NOW()";
        $sql = "UPDATE reservas SET " . implode(', ', $updFields) . " WHERE id = :id";
        $pdo->prepare($sql)->execute($params);
    }

    echo json_encode(['message' => 'Reserva actualizada correctamente.']);
    exit;
}

// Cancelar reserva (libera producto a Disponible)
if (preg_match('#^/api/admin/reservations/(\d+)/cancel$#', $uri, $matches) && $method === 'POST') {
    requireAuth($pdo);
    $resId = (int)$matches[1];

    $stmt = $pdo->prepare("SELECT * FROM reservas WHERE id = :id");
    $stmt->execute([':id' => $resId]);
    $res = $stmt->fetch();

    if ($res) {
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE reservas SET estado = 'cancelada', fecha_actualizacion = NOW() WHERE id = :id")->execute([':id' => $resId]);
        $pdo->prepare("UPDATE productos SET estado = 'disponible', fecha_actualizacion = NOW() WHERE id = :pid AND estado = 'reservado'")->execute([':pid' => $res['producto_id']]);
        $pdo->commit();
    }

    echo json_encode(['message' => 'Reserva cancelada y producto liberado a disponible.']);
    exit;
}

// Concretar reserva (marca producto como vendido con precio final cerrado / rebaja)
if (preg_match('#^/api/admin/reservations/(\d+)/complete$#', $uri, $matches) && $method === 'POST') {
    requireAuth($pdo);
    $resId = (int)$matches[1];

    $stmt = $pdo->prepare("SELECT r.id, r.producto_id, r.nombre_cliente, r.telefono_cliente, r.adelanto, r.precio_pactado, 
                                  p.precio_costo, p.precio_venta, p.nombre as product_name 
                           FROM reservas r 
                           INNER JOIN productos p ON p.id = r.producto_id 
                           WHERE r.id = :id");
    $stmt->execute([':id' => $resId]);
    $res = $stmt->fetch();

    if (!$res) {
        http_response_code(404);
        echo json_encode(['message' => 'Reserva no encontrada.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $cost = (float)$res['precio_costo'];
        $catalogPrice = (float)$res['precio_venta'];
        $advancePayment = (float)$res['adelanto'];

        $finalSalePrice = isset($body['final_sale_price']) && (float)$body['final_sale_price'] > 0
            ? (float)$body['final_sale_price']
            : (!empty($res['precio_pactado']) && (float)$res['precio_pactado'] > 0 ? (float)$res['precio_pactado'] : $catalogPrice);

        $discountAmount = max(0, $catalogPrice - $finalSalePrice);
        $netProfit = $finalSalePrice - $cost;

        $customNotes = trim($body['notes'] ?? $body['notas'] ?? '');
        $defaultNotes = $discountAmount > 0
            ? "Venta completada desde reserva con rebaja de Bs " . number_format($discountAmount, 2) . " (Adelanto recibido: Bs " . number_format($advancePayment, 2) . ")"
            : "Venta completada desde reserva (Adelanto recibido: Bs " . number_format($advancePayment, 2) . ")";
        $notes = !empty($customNotes) ? $customNotes : $defaultNotes;

        // 1. Marcar reserva como completada y guardar precio final pactado
        $pdo->prepare("UPDATE reservas SET estado = 'completada', precio_pactado = :agreed, fecha_actualizacion = NOW() WHERE id = :id")->execute([
            ':agreed' => $finalSalePrice,
            ':id'     => $resId,
        ]);

        // 2. Marcar producto como vendido
        $pdo->prepare("UPDATE productos SET estado = 'vendido', fecha_actualizacion = NOW() WHERE id = :pid")->execute([':pid' => $res['producto_id']]);

        // Si el admin solicitó actualizar el precio de venta en catálogo
        if (!empty($body['update_catalog_price'])) {
            $pdo->prepare("UPDATE productos SET precio_venta = :sp, fecha_actualizacion = NOW() WHERE id = :pid")->execute([
                ':sp'  => $finalSalePrice,
                ':pid' => $res['producto_id'],
            ]);
        }

        // 3. Registrar venta en historial_ventas
        $includeInDashboard = isset($body['include_in_dashboard']) ? ((bool)$body['include_in_dashboard'] ? 1 : 0) : 1;

        $stmtSale = $pdo->prepare("INSERT INTO historial_ventas 
            (producto_id, nombre_producto, precio_costo, precio_original, precio_venta, monto_descuento, adelanto, ganancia_neta, incluir_en_dashboard, nombre_cliente, fecha_venta, notas, fecha_creacion, fecha_actualizacion) 
            VALUES (:pid, :name, :cost, :orig, :sale, :disc, :adv, :prof, :inc, :cust, NOW(), :notes, NOW(), NOW())");
        $stmtSale->execute([
            ':pid'  => $res['producto_id'],
            ':name' => $res['product_name'],
            ':cost' => $cost,
            ':orig' => $catalogPrice,
            ':sale' => $finalSalePrice,
            ':disc' => $discountAmount,
            ':adv'  => $advancePayment,
            ':prof' => $netProfit,
            ':inc'  => $includeInDashboard,
            ':cust' => $res['nombre_cliente'],
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

    $stmt = $pdo->prepare("SELECT id, incluir_en_dashboard FROM historial_ventas WHERE id = :id");
    $stmt->execute([':id' => $saleId]);
    $sale = $stmt->fetch();

    if (!$sale) {
        http_response_code(404);
        echo json_encode(['message' => 'Registro de venta no encontrado.']);
        exit;
    }

    $currentVal = (int)($sale['incluir_en_dashboard'] ?? 1);
    $newVal = isset($body['include_in_dashboard'])
        ? ((bool)$body['include_in_dashboard'] ? 1 : 0)
        : ($currentVal === 1 ? 0 : 1);

    $pdo->prepare("UPDATE historial_ventas SET incluir_en_dashboard = :inc, fecha_actualizacion = NOW() WHERE id = :id")->execute([
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

// Historial Contable de Ventas
if ($uri === '/api/admin/sales-history' && $method === 'GET') {
    requireAuth($pdo);

    $where = ["1=1"];
    $params = [];

    if (!empty($_GET['search'])) {
        $where[] = "(nombre_producto LIKE :s OR nombre_cliente LIKE :s)";
        $params[':s'] = '%' . $_GET['search'] . '%';
    }

    if (!empty($_GET['start_date']) && !empty($_GET['end_date'])) {
        $where[] = "fecha_venta BETWEEN :start AND :end";
        $params[':start'] = $_GET['start_date'] . ' 00:00:00';
        $params[':end']   = $_GET['end_date'] . ' 23:59:59';
    }

    $sql = "SELECT id, producto_id as product_id, nombre_producto as product_name, 
                   precio_costo as cost_price, precio_original as original_price, 
                   precio_venta as sale_price, monto_descuento as discount_amount, 
                   adelanto as advance_payment, ganancia_neta as net_profit, 
                   incluir_en_dashboard as include_in_dashboard, nombre_cliente as customer_name, 
                   fecha_venta as sold_at, notas as notes 
            FROM historial_ventas 
            WHERE " . implode(' AND ', $where) . " ORDER BY fecha_venta DESC";
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
