/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  created_at: string;
}

export type OrderStatus = 'Draft' | 'Confirmed';

export interface Order {
  id: string;
  customer_id: string;
  customer_name?: string; // Cache for UI
  total_price: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name?: string; // Cache for UI
  price: number;
  quantity: number;
  created_at: string;
}

export interface UserSession {
  id: string;
  email: string;
  isLoggedIn: boolean;
}
