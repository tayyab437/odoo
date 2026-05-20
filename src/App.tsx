/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { DatabaseService } from './services/database';
import { UserSession } from './types';
import DashboardView from './components/DashboardView';
import CustomersView from './components/CustomersView';
import ProductsView from './components/ProductsView';
import OrdersView from './components/OrdersView';
import ReportsView from './components/ReportsView';
import { 
  Users, Package, ShoppingBag, BarChart3, Database, 
  LayoutDashboard, Menu, X, ShieldAlert, Sparkles 
} from 'lucide-react';

export default function App() {
  const [session] = useState<UserSession>({
    email: 'admin@odoo-sales.com',
    isLoggedIn: true,
    token: 'simulated-sandbox-token-id'
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<{ customers: number; products: number; orders: number } | null>(null);

  // Read status from database
  const isSupabaseConfigured = DatabaseService.isUsingSupabase();

  // Load database workspace statistics on active tab shifts to keep sidebar counts synchronized
  useEffect(() => {
    async function loadStats() {
      try {
        const [cList, pList, oList] = await Promise.all([
          DatabaseService.customers.list(),
          DatabaseService.products.list(),
          DatabaseService.orders.list()
        ]);
        setStats({
          customers: cList.length,
          products: pList.length,
          orders: oList.length
        });
      } catch (err) {
        console.error('Error fetching sidebar indicators:', err);
      }
    }
    loadStats();
  }, [activeTab]);

  // Define sidebar items following Odoo layout
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Sales Orders', icon: ShoppingBag },
    { id: 'reports', label: 'Reports Analysis', icon: BarChart3 },
  ];

  // Active module loader
  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'customers':
        return <CustomersView />;
      case 'products':
        return <ProductsView />;
      case 'orders':
        return <OrdersView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col md:flex-row font-sans text-slate-700 selection:bg-purple-100 selection:text-purple-700">
      
      {/* ==========================================
          MOBILE NAV TOP BAR 
          ========================================== */}
      <div className="bg-[#714B67] md:hidden text-white h-16 flex items-center justify-between px-4 z-40 shrink-0 select-none shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center font-bold text-[#714B67] text-sm">O</div>
          <span className="text-white font-semibold text-base tracking-tight">Odoo Sales</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ==========================================
          SIDEBAR NAVIGATION (DESKTOP & MOBILE TRANSITIONS)
          ========================================== */}
      <div 
        className={`fixed top-16 md:top-0 bottom-0 left-0 w-64 bg-[#714B67] text-white md:static z-30 transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between shadow-xl`}
      >
        <div className="flex flex-col">
          {/* Logo Brand Header (Desktop Only) */}
          <div className="hidden md:flex items-center gap-3 h-16 px-6 bg-[#603e57] text-white border-b border-white/5 select-none">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-[#714B67] text-base">O</div>
            <span className="text-white font-semibold text-lg tracking-tight">Odoo Sales</span>
          </div>

          {/* Sidebar Menu Buttons */}
          <nav className="p-0 py-3 space-y-0.5 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`sidebar-item-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-6 py-3 text-sm font-medium transition-colors group cursor-pointer ${
                    isActive 
                      ? 'bg-white/10 text-white border-l-4 border-white' 
                      : 'text-white/75 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-white/40 group-hover:text-white/80'
                  }`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Session Section (No Log Out) */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs font-bold">JD</div>
            <div>
              <p className="text-xs text-white font-semibold">Jane Doe</p>
              <p className="text-[10px] text-white/50">Administrator</p>
            </div>
          </div>
        </div>

      </div>

      {/* Backdrop for Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-xs"
        ></div>
      )}

      {/* ==========================================
          MAIN CONTENT WORKSPACE CONTAINER 
          ========================================== */}
      <main className="flex-1 overflow-y-auto px-4 py-8 md:p-8">
        <div className="max-w-7xl mx-auto">
          {renderActiveModule()}
        </div>
      </main>

    </div>
  );
}
