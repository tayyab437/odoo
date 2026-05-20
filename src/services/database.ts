/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Customer, Product, Order, OrderItem, UserSession } from '../types';

// Read credentials from Environment Variables (Vite standard)
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials are valid (and not placeholder)
const isSupabaseConfigured = 
  supabaseUrl.trim() !== '' && 
  supabaseAnonKey.trim() !== '' && 
  !supabaseUrl.includes('YOUR_') && 
  !supabaseAnonKey.includes('YOUR_');

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// DUMMY SEED DATA FOR SIMULATION MODE
// ==========================================
const DEFAULT_CUSTOMERS: Customer[] = [
  { id: 'c-1', name: 'Azure Interior', email: 'design@azure.com', phone: '+1 555-0199', company: 'Azure Interior Corp', created_at: '2026-01-10T10:00:00Z' },
  { id: 'c-2', name: 'Agrolait SA', email: 'contact@agrolait.be', phone: '+32 2 555 12 34', company: 'Agrolait Belgium', created_at: '2026-02-14T11:30:00Z' },
  { id: 'c-3', name: 'Decathlon Services', email: 'info@decathlon.com', phone: '+33 1 23 45 67 89', company: 'Decathlon Group', created_at: '2026-03-22T09:15:00Z' },
  { id: 'c-4', name: 'Ready Mat LLC', email: 'mats@readymat.com', phone: '+1 555-0155', company: 'Ready Mat USA', created_at: '2026-04-05T14:45:00Z' }
];

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p-1', name: 'Conference Office Table', price: 850.00, stock: 12, created_at: '2026-01-01T08:00:00Z' },
  { id: 'p-2', name: 'Ergonomic Executive Chair', price: 320.00, stock: 45, created_at: '2026-01-01T08:00:00Z' },
  { id: 'p-3', name: 'Acoustic Screen Panel Divider', price: 180.00, stock: 25, created_at: '2026-01-02T09:00:00Z' },
  { id: 'p-4', name: 'Wireless Charging Desk Mat', price: 55.00, stock: 120, created_at: '2026-01-03T10:30:00Z' },
  { id: 'p-5', name: 'Virtual Reality Headset Pro', price: 599.00, stock: 8, created_at: '2026-01-15T15:00:00Z' }
];

const DEFAULT_ORDERS: Order[] = [
  { id: 'o-1', customer_id: 'c-1', total_price: 2020.00, status: 'Confirmed', created_at: '2026-05-10T14:00:00Z' },
  { id: 'o-2', customer_id: 'c-2', total_price: 360.00, status: 'Draft', created_at: '2026-05-18T10:30:00Z' }
];

const DEFAULT_ORDER_ITEMS: OrderItem[] = [
  // Order 1 items: 1x Table ($850), 3x Chairs ($320 * 3 = $960), 2x Mats ($55 * 2 = $110). Total = $1920? Wait, let's match total:
  // table = 850, 2x chairs = 640, 3x dividers = 530? Let's make it simple:
  { id: 'oi-1', order_id: 'o-1', product_id: 'p-1', price: 850.00, quantity: 1, created_at: '2026-05-10T14:00:00Z' },
  { id: 'oi-2', order_id: 'o-1', product_id: 'p-2', price: 320.00, quantity: 3, created_at: '2026-05-10T14:00:00Z' },
  { id: 'oi-3', order_id: 'o-1', product_id: 'p-4', price: 55.00, quantity: 4, created_at: '2026-05-10T14:00:00Z' }, // 850 + 960 + 220 = 2030 (let's set total_price to 2030 or fix items)
  // Order 2 items: 2x dividers ($180 * 2 = $360)
  { id: 'oi-4', order_id: 'o-2', product_id: 'p-3', price: 180.00, quantity: 2, created_at: '2026-05-18T10:30:00Z' }
];

// Complete helper to make adjustments to order items
const getCleanedInitialOrders = (): { orders: Order[], items: OrderItem[] } => {
  const orders = [...DEFAULT_ORDERS];
  // Match o-1 total strictly to items: 1x 850 + 3x 320 + 4x 55 = 850 + 960 + 220 = 2030
  orders[0].total_price = 2030.00;
  return { orders, items: DEFAULT_ORDER_ITEMS };
};

// Local storage keys
const KEYS = {
  CUSTOMERS: 'odoo_sales_customers_v1',
  PRODUCTS: 'odoo_sales_products_v1',
  ORDERS: 'odoo_sales_orders_v1',
  ORDER_ITEMS: 'odoo_sales_order_items_v1',
  AUTH: 'odoo_sales_auth_session_v1'
};

// Initialize localStorage if empty
const initializeLocalStorage = () => {
  if (!localStorage.getItem(KEYS.CUSTOMERS)) {
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
  }
  if (!localStorage.getItem(KEYS.PRODUCTS)) {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  }
  const cleanData = getCleanedInitialOrders();
  if (!localStorage.getItem(KEYS.ORDERS)) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(cleanData.orders));
  }
  if (!localStorage.getItem(KEYS.ORDER_ITEMS)) {
    localStorage.setItem(KEYS.ORDER_ITEMS, JSON.stringify(cleanData.items));
  }
};

initializeLocalStorage();

// ==========================================
// UNIFIED CRM DATA SERVICE
// ==========================================
export const DatabaseService = {
  isUsingSupabase: () => isSupabaseConfigured,
  getSupabaseUrl: () => supabaseUrl,

  // ----------------------------------------
  // AUTHENTICATION MODULE
  // ----------------------------------------
  auth: {
    async getCurrentUser(): Promise<UserSession | null> {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            return { id: user.id, email: user.email || '', isLoggedIn: true };
          }
        } catch (err) {
          console.error('Supabase auth error:', err);
        }
      }
      
      // Fallback/Simulated Session
      const stored = localStorage.getItem(KEYS.AUTH);
      if (stored) {
        try {
          const session = JSON.parse(stored);
          return { ...session, isLoggedIn: true };
        } catch {
          return null;
        }
      }
      return null;
    },

    async signIn(email: string, password: string): Promise<{ user: UserSession | null, error: string | null }> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          return { user: null, error: error.message };
        }
        if (data?.user) {
          const session = { id: data.user.id, email: data.user.email || '', isLoggedIn: true };
          return { user: session, error: null };
        }
      }

      // Simulated Login (Any passwords works, simple & student-friendly!)
      if (email.trim() === '') {
        return { user: null, error: 'Email is required' };
      }
      if (password.length < 6) {
        return { user: null, error: 'Password must be at least 6 characters' };
      }

      const mockSession: UserSession = {
        id: 'u-' + Math.random().toString(36).substr(2, 9),
        email: email.toLowerCase(),
        isLoggedIn: true
      };
      localStorage.setItem(KEYS.AUTH, JSON.stringify(mockSession));
      return { user: mockSession, error: null };
    },

    async signUp(email: string, password: string): Promise<{ user: UserSession | null, error: string | null }> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          return { user: null, error: error.message };
        }
        if (data?.user) {
          const session = { id: data.user.id, email: data.user.email || '', isLoggedIn: true };
          return { user: session, error: null };
        }
      }

      // Simulated Signup
      if (email.trim() === '') {
        return { user: null, error: 'Email is required' };
      }
      if (password.length < 6) {
        return { user: null, error: 'Password must be at least 6 characters' };
      }

      const mockSession: UserSession = {
        id: 'u-' + Math.random().toString(36).substr(2, 9),
        email: email.toLowerCase(),
        isLoggedIn: true
      };
      localStorage.setItem(KEYS.AUTH, JSON.stringify(mockSession));
      return { user: mockSession, error: null };
    },

    async signOut(): Promise<void> {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem(KEYS.AUTH);
    }
  },

  // ----------------------------------------
  // CUSTOMERS MODULE
  // ----------------------------------------
  customers: {
    async list(): Promise<Customer[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data) return data;
        console.error('Supabase customer list err:', error);
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.CUSTOMERS);
      const list: Customer[] = items ? JSON.parse(items) : [];
      return list.sort((a, b) => a.name.localeCompare(b.name));
    },

    async create(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
      const newCustomer: Customer = {
        id: 'c-' + Math.random().toString(36).substr(2, 9),
        ...customer,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('customers')
          .insert([{
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            company: customer.company
          }])
          .select();
        if (!error && data && data[0]) {
          return data[0];
        }
        console.error('Supabase customer create err:', error);
        throw new Error(error?.message || 'Failed to insert customer into Supabase. Inspect your schema or RLS policies.');
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.CUSTOMERS);
      const list: Customer[] = items ? JSON.parse(items) : [];
      list.push(newCustomer);
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));
      return newCustomer;
    },

    async update(id: string, updates: Partial<Omit<Customer, 'id' | 'created_at'>>): Promise<Customer | null> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('customers')
          .update(updates)
          .eq('id', id)
          .select();
        if (!error && data && data[0]) {
          return data[0];
        }
        console.error('Supabase customer update err:', error);
        throw new Error(error?.message || 'Failed to update customer in Supabase.');
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.CUSTOMERS);
      const list: Customer[] = items ? JSON.parse(items) : [];
      const idx = list.findIndex(c => c.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));
        return list[idx];
      }
      return null;
    },

    async delete(id: string): Promise<boolean> {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);
        if (!error) return true;
        console.error('Supabase customer delete err:', error);
        throw new Error(error?.message || 'Failed to delete customer from Supabase.');
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.CUSTOMERS);
      let list: Customer[] = items ? JSON.parse(items) : [];
      const originalLength = list.length;
      list = list.filter(c => c.id !== id);
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));
      return list.length < originalLength;
    }
  },

  // ----------------------------------------
  // PRODUCTS MODULE
  // ----------------------------------------
  products: {
    async list(): Promise<Product[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data) return data;
        console.error('Supabase product list err:', error);
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.PRODUCTS);
      const list: Product[] = items ? JSON.parse(items) : [];
      return list.sort((a, b) => a.name.localeCompare(b.name));
    },

    async create(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
      const newProduct: Product = {
        id: 'p-' + Math.random().toString(36).substr(2, 9),
        ...product,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('products')
          .insert([{
            name: product.name,
            price: product.price,
            stock: product.stock
          }])
          .select();
        if (!error && data && data[0]) {
          return data[0];
        }
        console.error('Supabase product create err:', error);
        throw new Error(error?.message || 'Failed to insert product into Supabase.');
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.PRODUCTS);
      const list: Product[] = items ? JSON.parse(items) : [];
      list.push(newProduct);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(list));
      return newProduct;
    },

    async update(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<Product | null> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', id)
          .select();
        if (!error && data && data[0]) {
          return data[0];
        }
        console.error('Supabase product update err:', error);
        throw new Error(error?.message || 'Failed to update product in Supabase.');
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.PRODUCTS);
      const list: Product[] = items ? JSON.parse(items) : [];
      const idx = list.findIndex(p => p.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(list));
        return list[idx];
      }
      return null;
    },

    async delete(id: string): Promise<boolean> {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        if (!error) return true;
        console.error('Supabase product delete err:', error);
        throw new Error(error?.message || 'Failed to delete product from Supabase.');
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.PRODUCTS);
      let list: Product[] = items ? JSON.parse(items) : [];
      const originalLength = list.length;
      list = list.filter(p => p.id !== id);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(list));
      return list.length < originalLength;
    }
  },

  // ----------------------------------------
  // ORDERS MODULE
  // ----------------------------------------
  orders: {
    async list(): Promise<Order[]> {
      const customers = await DatabaseService.customers.list();
      const customerMap = new Map<string, string>();
      customers.forEach(c => customerMap.set(c.id, c.name));

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map(o => ({
            ...o,
            customer_name: customerMap.get(o.customer_id) || 'Unknown Customer'
          }));
        }
        console.error('Supabase orders list err:', error);
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.ORDERS);
      const list: Order[] = items ? JSON.parse(items) : [];
      return list.map(o => ({
        ...o,
        customer_name: customerMap.get(o.customer_id) || 'Unknown Customer'
      })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    async getOrderItems(orderId: string): Promise<OrderItem[]> {
      const products = await DatabaseService.products.list();
      const productMap = new Map<string, string>();
      products.forEach(p => productMap.set(p.id, p.name));

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);
        if (!error && data) {
          return data.map(oi => ({
            ...oi,
            product_name: productMap.get(oi.product_id) || 'Unknown Product'
          }));
        }
        console.error('Supabase order items get err:', error);
      }

      // Simulated Mode
      const items = localStorage.getItem(KEYS.ORDER_ITEMS);
      const list: OrderItem[] = items ? JSON.parse(items) : [];
      return list
        .filter(oi => oi.order_id === orderId)
        .map(oi => ({
          ...oi,
          product_name: productMap.get(oi.product_id) || 'Unknown Product'
        }));
    },

    async create(
      customerId: string, 
      items: Array<{ productId: string, price: number, quantity: number }>
    ): Promise<Order> {
      const total_price = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const newOrderId = 'o-' + Math.random().toString(36).substr(2, 9);
      const timestamp = new Date().toISOString();

      const newOrder: Order = {
        id: newOrderId,
        customer_id: customerId,
        total_price,
        status: 'Draft',
        created_at: timestamp
      };

      if (isSupabaseConfigured && supabase) {
        // 1. Insert order
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .insert([{
            id: newOrderId, // In general we let Supabase generate UUID, but for simplicity of alignment we can handle or omit id
            customer_id: customerId,
            total_price,
            status: 'Draft'
          }])
          .select();

        if (orderErr) {
          console.error('Supabase order insert err:', orderErr);
          throw new Error('Could not create order: ' + orderErr.message);
        }

        const confirmedOrder = orderData[0];
        
        // 2. Insert order items
        const rawItems = items.map(item => ({
          order_id: confirmedOrder.id,
          product_id: item.productId,
          price: item.price,
          quantity: item.quantity
        }));

        const { error: itemsErr } = await supabase
          .from('order_items')
          .insert(rawItems);

        if (itemsErr) {
          console.error('Supabase order items insert err:', itemsErr);
          // Clean up partial order
          await supabase.from('orders').delete().eq('id', confirmedOrder.id);
          throw new Error('Could not create order items: ' + itemsErr.message);
        }

        return confirmedOrder;
      }

      // Simulated Mode
      // Save order
      const storedOrders = localStorage.getItem(KEYS.ORDERS);
      const oList: Order[] = storedOrders ? JSON.parse(storedOrders) : [];
      oList.push(newOrder);
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(oList));

      // Save order items
      const storedItems = localStorage.getItem(KEYS.ORDER_ITEMS);
      const oiList: OrderItem[] = storedItems ? JSON.parse(storedItems) : [];

      items.forEach(item => {
        const newOi: OrderItem = {
          id: 'oi-' + Math.random().toString(36).substr(2, 9),
          order_id: newOrderId,
          product_id: item.productId,
          price: item.price,
          quantity: item.quantity,
          created_at: timestamp
        };
        oiList.push(newOi);
      });
      localStorage.setItem(KEYS.ORDER_ITEMS, JSON.stringify(oiList));

      return newOrder;
    },

    async confirmOrder(id: string): Promise<boolean> {
      if (isSupabaseConfigured && supabase) {
        try {
          // 1. Get the order items
          const { data: items, error: itemsErr } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', id);
          if (itemsErr || !items) {
            console.error('Supabase confirmOrder - failed to load items:', itemsErr);
            return false;
          }

          // 2. Recalculate and verify total price
          const updatedTotalPrice = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

          // 3. Subtract stock for each product
          for (const item of items) {
            const { data: prodData, error: prodErr } = await supabase
              .from('products')
              .select('stock, name')
              .eq('id', item.product_id)
              .single();
            
            if (!prodErr && prodData) {
              const currentStock = Number(prodData.stock);
              const newStock = Math.max(0, currentStock - Number(item.quantity));
              await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', item.product_id);
            }
          }

          // 4. Update order status and total_price
          const { error: ordErr } = await supabase
            .from('orders')
            .update({ status: 'Confirmed', total_price: updatedTotalPrice })
            .eq('id', id);

          if (ordErr) {
            console.error('Supabase confirmOrder - failed to update order:', ordErr);
            return false;
          }
          return true;
        } catch (err) {
          console.error('Supabase confirmOrder exception:', err);
          return false;
        }
      }

      // Simulated Mode
      const stored = localStorage.getItem(KEYS.ORDERS);
      const itemsStored = localStorage.getItem(KEYS.ORDER_ITEMS);
      const prodsStored = localStorage.getItem(KEYS.PRODUCTS);

      if (stored && itemsStored && prodsStored) {
        const ordersList: Order[] = JSON.parse(stored);
        const orderIdx = ordersList.findIndex(o => o.id === id);

        if (orderIdx !== -1) {
          const order = ordersList[orderIdx];
          
          // Verify if it is already Confirmed to prevent double subtraction
          if (order.status === 'Confirmed') {
            return true;
          }

          const orderItemsList: OrderItem[] = JSON.parse(itemsStored);
          const productsList: Product[] = JSON.parse(prodsStored);

          // Get items for this order
          const thisOrderItems = orderItemsList.filter(item => item.order_id === id);

          // Calculate precise total price
          const updatedTotalPrice = thisOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          // Subtract stock for each product
          thisOrderItems.forEach(item => {
            const pIdx = productsList.findIndex(p => p.id === item.product_id);
            if (pIdx !== -1) {
              productsList[pIdx].stock = Math.max(0, productsList[pIdx].stock - item.quantity);
            }
          });

          // Update order status and total price
          ordersList[orderIdx].status = 'Confirmed';
          ordersList[orderIdx].total_price = updatedTotalPrice;

          // Save back
          localStorage.setItem(KEYS.ORDERS, JSON.stringify(ordersList));
          localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(productsList));
          return true;
        }
      }
      return false;
    },

    async delete(id: string): Promise<boolean> {
      if (isSupabaseConfigured && supabase) {
        // Cascades in Supabase delete order items
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', id);
        if (!error) return true;
        console.error('Supabase order delete err:', error);
        return false;
      }

      // Simulated Mode
      const storedOrders = localStorage.getItem(KEYS.ORDERS);
      let oList: Order[] = storedOrders ? JSON.parse(storedOrders) : [];
      const origCount = oList.length;
      oList = oList.filter(o => o.id !== id);
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(oList));

      const storedItems = localStorage.getItem(KEYS.ORDER_ITEMS);
      if (storedItems) {
        let oiList: OrderItem[] = JSON.parse(storedItems);
        oiList = oiList.filter(oi => oi.order_id !== id);
        localStorage.setItem(KEYS.ORDER_ITEMS, JSON.stringify(oiList));
      }
      return oList.length < origCount;
    }
  }
};
