export type ProductStatus = 'disponible' | 'reservado' | 'vendido';
export type ReservationStatus = 'activa' | 'completada' | 'expirada' | 'cancelada';

export interface Category {
  id: number | string;
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  products_count?: number;
}

export interface ProductImage {
  id?: number | string;
  product_id?: number | string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Product {
  id: number | string;
  category_id?: number | string;
  category?: Category;
  name: string;
  slug: string;
  description?: string;
  cost_price?: number; // Solo visible en panel administrativo
  sale_price: number;
  unit_margin?: number;
  margin_percent?: number;
  status: ProductStatus;
  is_active?: boolean;
  images: ProductImage[];
  primary_image?: string;
  active_reservation?: Reservation;
  created_at?: string;
  updated_at?: string;
}

export interface Reservation {
  id: number | string;
  product_id: number | string;
  customer_name: string;
  customer_phone?: string;
  advance_payment: number; // Monto con el que reserva en Bs
  agreed_price?: number; // Precio pactado de venta (con o sin rebaja)
  pending_balance?: number; // Saldo pendiente (agreed_price - advance_payment)
  reserved_at: string;
  expires_at: string; // Vigencia de 7 días exactos
  status: ReservationStatus;
  is_expired?: boolean;
  days_remaining?: number;
  notes?: string;
  product?: {
    id: number | string;
    name: string;
    sale_price: number;
    status: ProductStatus;
    primary_image?: string;
  };
}

export interface SaleHistory {
  id: number | string;
  product_id: number | string;
  product_name: string;
  cost_price: number;
  original_price?: number; // Precio de lista antes de la rebaja
  sale_price: number; // Precio final cerrado con el cliente
  discount_amount?: number; // Monto de la rebaja
  advance_payment?: number; // Monto que fue adelantado en la reserva
  net_profit: number; // Ganancia neta real (sale_price - cost_price)
  include_in_dashboard?: boolean; // true si se suma a métricas del dashboard, false si se excluye
  customer_name?: string;
  sold_at: string;
  notes?: string;
  product?: Product;
}

export interface DashboardMetrics {
  total_revenue_month: number;
  net_profit_month: number;
  total_sold_month: number;
  total_sold_all_time: number;
  active_reservations: number;
  inventory: {
    disponibles: number;
    reservados: number;
    vendidos: number;
  };
}

export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  chart: ChartData;
}
