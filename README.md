# Odoo-Inspired Sales Manager 🍇

Welcome to the **Odoo-Inspired Sales Manager**! This is a beginner-friendly, clean, and lightweight corporate web application designed as a student learning resource. It models a traditional commercial workflow (quotations, catalog adjustments, and final sales confirmations) with Odoo-classic purple layouts, clean responsive forms, and robust relational constraints.

The project features a **dual-database setup**:
1. **Simulation Mode (Default):** Runs immediately in the browser using `localStorage`. Seeded with authentic corporate Odoo dummy data so the app is instantly usable, interactive, and full-featured in preview mode!
2. **Real Database Mode:** Connects to your live cloud **Supabase PostgreSQL** database instance instantly upon providing your environment variables.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React + Vite (Fast compilation, instant loading)
- **Styling:** Tailwind CSS (Modern, highly readable utility layout framework)
- **Routing & State:** Clean declarative view-switching via standard React state (simplifies debugging for beginners)
- **Database/SDK:** Supabase (`@supabase/supabase-js` public SDK)
- **Icons:** Lucide React (Clean feather-style vector indicators)

---

## 📖 Module Structure Breakdown

### 1. 🔐 Login Module (`LoginView.tsx`)
- Standard input form for email and password.
- Triggers live authentication checks on Supabase when configured.
- Includes a prominent **"Launch with Demo Access"** shortcut. In simulation mode, this logs you in immediately as an administrator (`admin@odoo-sales.com`) with a simulated sandbox token.

### 2. 📊 CRM Dashboard (`DashboardView.tsx`)
- Displays core key performance indicators (KPIs) with deep analysis counters:
  - **Total Customers Directory** count
  - **Warehouse Product Catalog** volume metrics
  - **Funnel Sales Orders** transactions tracker
  - **Invoiced Gross Revenue** aggregates (calculated dynamically based on *Confirmed* orders)
- Implements a handcrafted, fully responsive, sharp SVG vector Area/Bar chart showcasing monthly sales progress without external graphing library bloat.
- Renders a reactive "workflow distribution" comparing Draft quotations to Confirmed invoice pipelines.

### 3. 👥 Customer Directory (`CustomersView.tsx`)
- Complete CRUD listing displaying client directory entries.
- Search filter instantly parses customer names, company names, or emails.
- Form handles Customer details: **Name, Email, Phone, Company**.

### 4. 📦 Product Catalog & Warehouse Inventory (`ProductsView.tsx`)
- Direct access to item details: **Product Name, List Price (USD), Stock Quantity**.
- Monitors stock thresholds dynamically and displays visual alerts:
  - `Optimized Stock` (greater than 10 units in stock)
  - `Low Inventory` (1 to 10 units in stock)
  - `Out of Stock` (0 items in stock - disables checkout selections to prevent negative billing)

### 5. 🛒 Sales Checkout Funnel (`OrdersView.tsx`)
- Creates sales order entries using a multi-item line wizard checkout.
- Automatically calculates itemized decimals and rolling grand totals line-by-line as products or quantity variables change.
- Multi-item line rows check with warehouse inventories. It prevents booking a quantity larger than currently in stock!
- Clicking on an individual order launches a detailed modal with Odoo's primary **"Confirm Sale"** option, transitioning standard draft quotes to verified financial invoices.

### 6. 📈 Executive Revenue Reports (`ReportsView.tsx`)
- Complete accounting summary: Confirmed Revenue vs. Draft Quotation Pipeline value.
- Tracks metrics like **Average Order Size** and client **Sales Funnel Conversion Rates**.
- Analyzes which individual products generate the highest relative income, rendered using beautiful progress tracking layouts.

### 7. 🔌 Database Setup Guide (`DatabaseConfigView.tsx`)
- Detailed instructions for setting up Supabase, database relationships, and copying the SQL schema. Accessible inside the workspace.

---

## 🔗 Database Relationships Guide

This application models typical relational tables. The relationship tree connects as follows:

```
  ┌───────────────┐               ┌───────────────┐
  │   customers   │               │   products    │
  │  (Customers)  │               │ (Catalog Items│
  └───────┬───────┘               └───────┬───────┘
          │ (1)                           │ (1)
          │                               │
          │ (N)                           │ (N)
  ┌───────▼───────┐               ┌───────▼───────┐
  │    orders     │ (1)       (N) │  order_items  │
  │ (Quotations)  ├───────────────► (Order Lines) │
  └───────────────┘               └───────────────┘
```

1. **`customers` (1) ───► `orders` (N):** A customer can request multiple orders. An order must link back to a valid customer entry (`customer_id` is a Foreign Key referencing `customers.id`).
2. **`orders` (1) ───► `order_items` (N):** An order contains multiple specific lines. If an order reference is deleted, an `ON DELETE CASCADE` rule triggers on the database to automatically remove all associated line items from the `order_items` table.
3. **`products` (1) ───► `order_items` (N):** A catalog item can be included in multiple order lines across different clients. The item tracks price and stock variables.

---

## 🚀 How to Set Up Supabase (Real Database Integration)

1. **Sign Up:** Go to [Supabase](https://supabase.com) and create a free project.
2. **Execute Schema:** Go to the **SQL Editor** in the left menu. Click "New Query," paste the SQL schema script below, and hit **RUN**.
3. **Handle Row Level Security (RLS) for public access:** By default, new projects enable RLS, which blocks insertions from the frontend anon key. Run this SQL in a New Query to turn off RLS for sandboxed student testing:
   ```sql
   ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
   ```
   *Alternatively, if you want security policies enabled:*
   ```sql
   CREATE POLICY "Enable read/write for all" ON public.customers FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Enable read/write for all" ON public.products FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Enable read/write for all" ON public.orders FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Enable read/write for all" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
   ```
4. **Copy Keys:** Go to Settings -> API to copy your project `URL` and `anon public` key.
5. **Define Variables:** In AI Studio, open the secrets panel (or the `.env` settings) and assign them to:
   ```env
   VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
   VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
   ```
6. **Auto-Transition:** The application automatically senses the keys, establishes connection, and switches from browser `localStorage` to your remote live database tables seamlessly!

---

## 📄 Complete Supabase SQL Schema Blueprint

```sql
-- Create CUSTOMERS Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY DEFAULT 'c-' || substr(md5(random()::text), 1, 9),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create PRODUCTS Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT 'p-' || substr(md5(random()::text), 1, 9),
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create ORDERS Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT 'o-' || substr(md5(random()::text), 1, 9),
    customer_id TEXT REFERENCES public.customers(id) ON DELETE RESTRICT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create ORDER_ITEMS Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY DEFAULT 'oi-' || substr(md5(random()::text), 1, 9),
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Initial Data
INSERT INTO public.customers (id, name, email, phone, company) VALUES
('c-1', 'Azure Interior', 'design@azure.com', '+1 555-0199', 'Azure Interior Corp'),
('c-2', 'Agrolait SA', 'contact@agrolait.be', '+32 2 555 12 34', 'Agrolait Belgium'),
('c-3', 'Decathlon Services', 'info@decathlon.com', '+33 1 23 45 67 89', 'Decathlon Group')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, price, stock) VALUES
('p-1', 'Conference Office Table', 850.00, 12),
('p-2', 'Ergonomic Executive Chair', 320.00, 45),
('p-3', 'Acoustic Screen Panel Divider', 180.00, 25),
('p-4', 'Wireless Charging Desk Mat', 55.00, 120)
ON CONFLICT (id) DO NOTHING;
```
