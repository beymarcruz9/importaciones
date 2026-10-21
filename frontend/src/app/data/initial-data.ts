import { Category, Product, Reservation, SaleHistory } from '../models/product.model';

export const INITIAL_CATEGORIES: Category[] = [
  {
    "id": "1",
    "name": "Electrónica y Gadgets",
    "slug": "electronica-gadgets",
    "description": "Dispositivos tecnológicos, accesorios y novedades",
    "is_active": true
  },
  {
    "id": "2",
    "name": "Hogar y Cocina",
    "slug": "hogar-cocina",
    "description": "Artículos prácticos y modernos para el hogar",
    "is_active": true
  },
  {
    "id": "3",
    "name": "Herramientas y Accesorios",
    "slug": "herramientas-accesorios",
    "description": "Equipamiento y herramientas de importación directa",
    "is_active": true
  },
  {
    "id": "6",
    "name": "ELECTRODOMESTCOS",
    "slug": "electrodomestcos-f0a3",
    "description": "articulos de cocina y preparacion de productos",
    "is_active": true
  },
  {
    "id": "7",
    "name": "Herramientas Especiales",
    "slug": "herramientas-especiales-cc53",
    "description": "Articulos importados para taller",
    "is_active": true
  },
  {
    "id": "8",
    "name": "musica",
    "slug": "musica-0e7d",
    "description": "articulos relacionados con la musica",
    "is_active": true
  },
  {
    "id": "9",
    "name": "TECNOLOGICOS",
    "slug": "tecnologicos-bdb3",
    "description": "Equipos tecnologicos",
    "is_active": true
  },
  {
    "id": "10",
    "name": "cosmeticos",
    "slug": "cosmeticos-bfb4",
    "description": "articulos para mujeres",
    "is_active": true
  },
  {
    "id": "11",
    "name": "Deportivos",
    "slug": "deportivos-5bd0",
    "description": "productos relacionados con los deportes",
    "is_active": true
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    "id": "1",
    "category_id": "1",
    "category": {
      "id": "1",
      "name": "Electrónica y Gadgets",
      "slug": "electronica-gadgets"
    },
    "name": "Proyector Portátil Smart 4K UHD Wi-Fi",
    "slug": "proyector-portatil-smart-4k",
    "description": "Proyector compacto con Android TV integrado, parlantes estí®reo Hi-Fi y resolución nativa 1080p con soporte 4K. Ideal para cine en casa o presentaciones.",
    "cost_price": 120,
    "sale_price": 240,
    "unit_margin": 120,
    "margin_percent": 100,
    "status": "disponible",
    "is_active": true,
    "images": [
      {
        "id": "1",
        "product_id": "1",
        "image_url": "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=800&q=80",
        "is_primary": true,
        "sort_order": 0
      },
      {
        "id": "2",
        "product_id": "1",
        "image_url": "https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=800&q=80",
        "is_primary": false,
        "sort_order": 1
      },
      {
        "id": "3",
        "product_id": "1",
        "image_url": "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80",
        "is_primary": false,
        "sort_order": 2
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-10-14 16:18:01",
    "updated_at": "2026-10-14 16:18:01"
  },
  {
    "id": "2",
    "category_id": "1",
    "category": {
      "id": "1",
      "name": "Electrónica y Gadgets",
      "slug": "electronica-gadgets"
    },
    "name": "Smartwatch Deportivo Pro GPS Resistencia 5ATM",
    "slug": "smartwatch-deportivo-pro-gps",
    "description": "Reloj inteligente con monitor cardíaco continuo, SpO2, GPS integrado, autonomía de 14 días y sumergible.",
    "cost_price": 45,
    "sale_price": 95,
    "unit_margin": 50,
    "margin_percent": 111,
    "status": "disponible",
    "is_active": true,
    "images": [
      {
        "id": "4",
        "product_id": "2",
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
        "is_primary": true,
        "sort_order": 0
      },
      {
        "id": "5",
        "product_id": "2",
        "image_url": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80",
        "is_primary": false,
        "sort_order": 1
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-10-14 16:18:01",
    "updated_at": "2026-10-14 16:18:01"
  },
  {
    "id": "3",
    "category_id": "2",
    "category": {
      "id": "2",
      "name": "Hogar y Cocina",
      "slug": "hogar-cocina"
    },
    "name": "Cafetera Espresso Automática 20 Bares con Espumador",
    "slug": "cafetera-espresso-automatica-20-bares",
    "description": "Bomba italiana de alta presión de 20 bares, caldera de acero inoxidable y varilla de vapor profesional para capuchinos.",
    "cost_price": 80,
    "sale_price": 160,
    "unit_margin": 80,
    "margin_percent": 100,
    "status": "reservado",
    "is_active": true,
    "images": [
      {
        "id": "6",
        "product_id": "3",
        "image_url": "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80",
        "is_primary": true,
        "sort_order": 0
      },
      {
        "id": "7",
        "product_id": "3",
        "image_url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
        "is_primary": false,
        "sort_order": 1
      },
      {
        "id": "8",
        "product_id": "3",
        "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
        "is_primary": false,
        "sort_order": 2
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-10-14 16:18:01",
    "updated_at": "2026-10-14 16:18:01"
  },
  {
    "id": "4",
    "category_id": "2",
    "category": {
      "id": "2",
      "name": "Hogar y Cocina",
      "slug": "hogar-cocina"
    },
    "name": "Aspiradora Inalámbrica Cyclone 25000Pa",
    "slug": "aspiradora-inalambrica-cyclone",
    "description": "Batería de larga duración desmontable, filtro HEPA lavable y accesorios múltiples para auto y alfombras.",
    "cost_price": 70,
    "sale_price": 145,
    "unit_margin": 75,
    "margin_percent": 107,
    "status": "vendido",
    "is_active": true,
    "images": [
      {
        "id": "9",
        "product_id": "4",
        "image_url": "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80",
        "is_primary": true,
        "sort_order": 0
      },
      {
        "id": "10",
        "product_id": "4",
        "image_url": "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80",
        "is_primary": false,
        "sort_order": 1
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-10-14 16:18:01",
    "updated_at": "2026-10-14 19:15:07"
  },
  {
    "id": "5",
    "category_id": "3",
    "category": {
      "id": "3",
      "name": "Herramientas y Accesorios",
      "slug": "herramientas-accesorios"
    },
    "name": "Kit de Taladro Percutor Inalámbrico 21V con 2 Baterías",
    "slug": "kit-taladro-percutor-inalambrico-21v",
    "description": "Motor sin carbones (Brushless), maletín rígido y set de 32 brocas y puntas para trabajo pesado.",
    "cost_price": 55,
    "sale_price": 110,
    "unit_margin": 55,
    "margin_percent": 100,
    "status": "vendido",
    "is_active": true,
    "images": [
      {
        "id": "11",
        "product_id": "5",
        "image_url": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-10-14 16:18:01",
    "updated_at": "2026-10-14 16:18:01"
  },
  {
    "id": "6",
    "category_id": "6",
    "category": {
      "id": "6",
      "name": "ELECTRODOMESTCOS",
      "slug": "electrodomestcos-f0a3"
    },
    "name": "LICUADORA",
    "slug": "licuadora-d27c9",
    "description": "licuadora automática marca nueva",
    "cost_price": 80,
    "sale_price": 100,
    "unit_margin": 20,
    "margin_percent": 25,
    "status": "vendido",
    "is_active": false,
    "images": [
      {
        "id": "12",
        "product_id": "6",
        "image_url": "/uploads/img_1792017979_a3590f83.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792017979_a3590f83.jpg",
    "created_at": "2026-10-14 18:46:29",
    "updated_at": "2026-10-20 19:50:21"
  },
  {
    "id": "7",
    "category_id": "6",
    "category": {
      "id": "6",
      "name": "ELECTRODOMESTCOS",
      "slug": "electrodomestcos-f0a3"
    },
    "name": "LICUADORA 2026",
    "slug": "licuadora-2026-30a9e",
    "description": "nueva ideal para preparar en la cocina",
    "cost_price": 60,
    "sale_price": 100,
    "unit_margin": 40,
    "margin_percent": 67,
    "status": "disponible",
    "is_active": true,
    "images": [
      {
        "id": "13",
        "product_id": "7",
        "image_url": "/uploads/img_1792038692_d6583f25.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792038692_d6583f25.jpg",
    "created_at": "2026-10-15 00:32:30",
    "updated_at": "2026-10-15 00:32:30"
  },
  {
    "id": "8",
    "name": "Producto Test Sistema",
    "slug": "producto-test-sistema-e885d",
    "description": "Descripcion de prueba",
    "cost_price": 50,
    "sale_price": 90,
    "unit_margin": 40,
    "margin_percent": 80,
    "status": "disponible",
    "is_active": false,
    "images": [
      {
        "id": "14",
        "product_id": "8",
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
    "created_at": "2026-10-17 20:47:11",
    "updated_at": "2026-10-17 20:47:11"
  },
  {
    "id": "9",
    "category_id": "6",
    "category": {
      "id": "6",
      "name": "ELECTRODOMESTCOS",
      "slug": "electrodomestcos-f0a3"
    },
    "name": "Jarra",
    "slug": "jarra-f4e66",
    "description": "Bonito",
    "cost_price": 80,
    "sale_price": 100,
    "unit_margin": 20,
    "margin_percent": 25,
    "status": "disponible",
    "is_active": false,
    "images": [
      {
        "id": "15",
        "product_id": "9",
        "image_url": "/uploads/img_1792298783_58ee94f1.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792298783_58ee94f1.jpg",
    "created_at": "2026-10-18 00:46:25",
    "updated_at": "2026-10-20 19:50:36"
  },
  {
    "id": "10",
    "name": "Producto Prueba",
    "slug": "producto-prueba-9921e",
    "description": "Probando",
    "cost_price": 20,
    "sale_price": 50,
    "unit_margin": 30,
    "margin_percent": 150,
    "status": "disponible",
    "is_active": false,
    "images": [
      {
        "id": "16",
        "product_id": "10",
        "image_url": "/uploads/img_1792038692_d6583f25.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792038692_d6583f25.jpg",
    "created_at": "2026-10-20 19:12:46",
    "updated_at": "2026-10-20 19:13:02"
  },
  {
    "id": "11",
    "category_id": "8",
    "category": {
      "id": "8",
      "name": "musica",
      "slug": "musica-0e7d"
    },
    "name": "parlante portatil",
    "slug": "parlante-portatil-7ca78",
    "description": "parlante recargable, portatil, con una duracion de bateria de 1 dia",
    "cost_price": 75,
    "sale_price": 110,
    "unit_margin": 35,
    "margin_percent": 47,
    "status": "disponible",
    "is_active": true,
    "images": [
      {
        "id": "17",
        "product_id": "11",
        "image_url": "/uploads/img_1792540308_b15e169f.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792540308_b15e169f.jpg",
    "created_at": "2026-10-20 19:53:23",
    "updated_at": "2026-10-20 19:53:23"
  },
  {
    "id": "12",
    "category_id": "9",
    "category": {
      "id": "9",
      "name": "TECNOLOGICOS",
      "slug": "tecnologicos-bdb3"
    },
    "name": "Alexa",
    "slug": "alexa-bdc8a",
    "description": "asistente inteligente, ideal para comunicarse en la casa, contiene varias funciones",
    "cost_price": 400,
    "sale_price": 780,
    "unit_margin": 380,
    "margin_percent": 95,
    "status": "disponible",
    "is_active": true,
    "images": [
      {
        "id": "18",
        "product_id": "12",
        "image_url": "/uploads/img_1792540425_1ec75459.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792540425_1ec75459.jpg",
    "created_at": "2026-10-20 19:57:49",
    "updated_at": "2026-10-20 19:57:49"
  },
  {
    "id": "13",
    "category_id": "10",
    "category": {
      "id": "10",
      "name": "cosmeticos",
      "slug": "cosmeticos-bfb4"
    },
    "name": "delineador de ojos",
    "slug": "delineador-de-ojos-af8fd",
    "description": "delineadores , ideales para manejar",
    "cost_price": 30,
    "sale_price": 55,
    "unit_margin": 25,
    "margin_percent": 83,
    "status": "vendido",
    "is_active": true,
    "images": [
      {
        "id": "19",
        "product_id": "13",
        "image_url": "/uploads/img_1792540685_058efbdd.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792540685_058efbdd.jpg",
    "created_at": "2026-10-20 19:59:31",
    "updated_at": "2026-10-20 23:31:51"
  },
  {
    "id": "14",
    "name": "tomatodo",
    "slug": "tomatodo-40c59",
    "description": "ideales para trajinables",
    "cost_price": 30,
    "sale_price": 60,
    "unit_margin": 30,
    "margin_percent": 100,
    "status": "disponible",
    "is_active": true,
    "images": [
      {
        "id": "20",
        "product_id": "14",
        "image_url": "/uploads/img_1792540791_5fa0f356.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792540791_5fa0f356.jpg",
    "created_at": "2026-10-20 20:02:44",
    "updated_at": "2026-10-20 20:02:44"
  },
  {
    "id": "15",
    "category_id": "11",
    "category": {
      "id": "11",
      "name": "Deportivos",
      "slug": "deportivos-5bd0"
    },
    "name": "mochila",
    "slug": "mochila-f3057",
    "description": "mochilas para caminatas",
    "cost_price": 80,
    "sale_price": 130,
    "unit_margin": 50,
    "margin_percent": 63,
    "status": "disponible",
    "is_active": true,
    "images": [
      {
        "id": "21",
        "product_id": "15",
        "image_url": "/uploads/img_1792540974_e08be836.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792540974_e08be836.jpg",
    "created_at": "2026-10-20 20:05:48",
    "updated_at": "2026-10-20 20:05:48"
  },
  {
    "id": "16",
    "category_id": "10",
    "category": {
      "id": "10",
      "name": "cosmeticos",
      "slug": "cosmeticos-bfb4"
    },
    "name": "maquillaje",
    "slug": "maquillaje-062ad",
    "description": "maquillaje para mujeres",
    "cost_price": 45,
    "sale_price": 65,
    "unit_margin": 20,
    "margin_percent": 44,
    "status": "disponible",
    "is_active": true,
    "images": [
      {
        "id": "22",
        "product_id": "16",
        "image_url": "/uploads/img_1792541156_f1f3aba2.png",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792541156_f1f3aba2.png",
    "created_at": "2026-10-20 20:07:03",
    "updated_at": "2026-10-20 20:07:03"
  },
  {
    "id": "17",
    "category_id": "6",
    "category": {
      "id": "6",
      "name": "ELECTRODOMESTCOS",
      "slug": "electrodomestcos-f0a3"
    },
    "name": "cepillo electrico",
    "slug": "cepillo-electrico-1b4b4",
    "description": "cepillo ideal para aseo general",
    "cost_price": 50,
    "sale_price": 70,
    "unit_margin": 20,
    "margin_percent": 40,
    "status": "disponible",
    "is_active": true,
    "images": [
      {
        "id": "23",
        "product_id": "17",
        "image_url": "/uploads/img_1792541932_8cacc5e4.jpg",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "primary_image": "/uploads/img_1792541932_8cacc5e4.jpg",
    "created_at": "2026-10-20 20:19:53",
    "updated_at": "2026-10-20 20:19:53"
  }
];

export const INITIAL_RESERVATIONS: Reservation[] = [
  {
    "id": "1",
    "product_id": "3",
    "customer_name": "Carlos Mendoza",
    "customer_phone": "+59172970461",
    "advance_payment": 0,
    "pending_balance": 0,
    "reserved_at": "2026-10-14 16:18:01",
    "expires_at": "2026-10-21 16:18:01",
    "status": "activa",
    "notes": "Reserva iniciada desde botón WhatsApp"
  },
  {
    "id": "2",
    "product_id": "6",
    "customer_name": "beymar cruz",
    "customer_phone": "7554496",
    "advance_payment": 0,
    "pending_balance": 0,
    "reserved_at": "2026-10-15 00:50:56",
    "expires_at": "2026-10-22 00:50:56",
    "status": "completada",
    "notes": "Reserva desde botón WhatsApp"
  },
  {
    "id": "3",
    "product_id": "4",
    "customer_name": "Roberto Mamani",
    "customer_phone": "72012345",
    "advance_payment": 30,
    "agreed_price": 80,
    "pending_balance": 50,
    "reserved_at": "2026-10-15 01:15:07",
    "expires_at": "2026-10-22 01:15:07",
    "status": "completada",
    "notes": "Apartado con anticipo de Bs 30"
  }
];

export const INITIAL_SALES: SaleHistory[] = [
  {
    "id": "1",
    "product_id": "5",
    "product_name": "Kit de Taladro Percutor Inalámbrico 21V con 2 Baterías",
    "cost_price": 55,
    "sale_price": 110,
    "discount_amount": 0,
    "advance_payment": 0,
    "net_profit": 55,
    "include_in_dashboard": true,
    "customer_name": "Fernando Suárez",
    "sold_at": "2026-10-14 16:18:01",
    "notes": "Venta completada"
  },
  {
    "id": "2",
    "product_id": "6",
    "product_name": "LICUADORA",
    "cost_price": 80,
    "sale_price": 100,
    "discount_amount": 0,
    "advance_payment": 0,
    "net_profit": 20,
    "include_in_dashboard": true,
    "customer_name": "beymar cruz",
    "sold_at": "2026-10-14 18:52:47",
    "notes": "Venta completada desde reserva"
  },
  {
    "id": "3",
    "product_id": "4",
    "product_name": "Aspiradora Inalámbrica Cyclone 25000Pa",
    "cost_price": 70,
    "original_price": 145,
    "sale_price": 80,
    "discount_amount": 65,
    "advance_payment": 30,
    "net_profit": 10,
    "include_in_dashboard": true,
    "customer_name": "Roberto Mamani",
    "sold_at": "2026-10-14 19:15:07",
    "notes": "Cerrado con rebaja acordada de Bs 15"
  },
  {
    "id": "4",
    "product_id": "13",
    "product_name": "delineador de ojos",
    "cost_price": 30,
    "original_price": 55,
    "sale_price": 50,
    "discount_amount": 5,
    "advance_payment": 0,
    "net_profit": 20,
    "include_in_dashboard": true,
    "customer_name": "NELIDA QUISPE CHAMBI",
    "sold_at": "2026-10-20 23:31:51",
    "notes": "rebaja con menos 5 bs"
  }
];
