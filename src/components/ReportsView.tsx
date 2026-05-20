/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { DatabaseService } from '../services/database';
import { Order, Product, OrderItem } from '../types';
import { TrendingUp, Award, DollarSign, Calculator, Share2, Printer, Loader2 } from 'lucide-react';

interface ProductStats {
  name: string;
  unitsSold: number;
  totalRevenue: number;
}

export default function ReportsView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [bestSellers, setBestSellers] = useState<ProductStats[]>([]);

  useEffect(() => {
    async function collectReportMetrics() {
      try {
        setLoading(true);
        const [oList, pList] = await Promise.all([
          DatabaseService.orders.list(),
          DatabaseService.products.list()
        ]);
        
        setOrders(oList);
        setProducts(pList);

        // Fetch items from all orders to calculate product sales
        const productStatsMap = new Map<string, { name: string; units: number; revenue: number }>();
        pList.forEach(p => {
          productStatsMap.set(p.id, { name: p.name, units: 0, revenue: 0 });
        });

        const allItemsPromises = oList.map(o => DatabaseService.orders.getOrderItems(o.id));
        const allItemsResults = await Promise.all(allItemsPromises);

        oList.forEach((order, idx) => {
          // Only calculate revenue for CONFIRMED orders
          const isConfirmed = order.status === 'Confirmed';
          const items = allItemsResults[idx];
          
          items.forEach(item => {
            const current = productStatsMap.get(item.product_id);
            if (current) {
              current.units += item.quantity;
              if (isConfirmed) {
                current.revenue += item.price * item.quantity;
              }
            } else {
              // Item might have been deleted, cache general trace
              productStatsMap.set(item.product_id, {
                name: item.product_name || 'Generic Item',
                units: item.quantity,
                revenue: isConfirmed ? item.price * item.quantity : 0
              });
            }
          });
        });

        const statsArray: ProductStats[] = [];
        productStatsMap.forEach((val) => {
          if (val.units > 0) {
            statsArray.push({
              name: val.name,
              unitsSold: val.units,
              totalRevenue: val.revenue
            });
          }
        });

        // Sort by total revenue descending
        statsArray.sort((a, b) => b.totalRevenue - a.totalRevenue);
        setBestSellers(statsArray);

      } catch (err) {
        console.error('Failed to construct transaction report:', err);
      } finally {
        setLoading(false);
      }
    }

    collectReportMetrics();
  }, []);

  // Fundamental KPI variables
  const confirmedOrders = orders.filter(o => o.status === 'Confirmed');
  const draftOrders = orders.filter(o => o.status === 'Draft');

  const confirmedSalesCount = confirmedOrders.length;
  const draftCount = draftOrders.length;
  const totalOrdersCount = orders.length;

  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + o.total_price, 0);
  const draftQuotePotential = draftOrders.reduce((sum, o) => sum + o.total_price, 0);

  // Math equations
  const averageOrderValue = confirmedSalesCount > 0 ? (totalRevenue / confirmedSalesCount) : 0;
  const orderSuccessPercentage = totalOrdersCount > 0 ? Math.round((confirmedSalesCount / totalOrdersCount) * 100) : 0;

  const maxRevenueProdVal = Math.max(...bestSellers.map(b => b.totalRevenue), 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-[#714B67] animate-spin mb-3" />
        <p className="text-slate-500 text-sm font-medium">Calculating corporate sales reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Banner Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Financial Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Commercial performance overview and product checkout statistics.</p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Analysis cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Confirmed Invoice Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Revenue</p>
          <p id="rep-total-revenue" className="text-2xl font-black text-emerald-600 tracking-tight mt-1.5 font-mono">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Generated by <strong>{confirmedSalesCount}</strong> confirmed orders</span>
          </div>
        </div>

        {/* Pipeline Draft Quote potential */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Draft Pipeline Value</p>
          <p id="rep-average-order" className="text-2xl font-black text-amber-600 tracking-tight mt-1.5 font-mono">
            ${draftQuotePotential.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            <Calculator className="w-3.5 h-3.5 text-amber-500" />
            <span>Awaiting confirmation from <strong>{draftCount}</strong> items</span>
          </div>
        </div>

        {/* Average Transaction billing */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Average Order Value</p>
          <p className="text-2xl font-black text-[#714B67] tracking-tight mt-1.5 font-mono">
            ${averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            <Calculator className="w-3.5 h-3.5 text-indigo-500" />
            <span>Confirmed transactions index</span>
          </div>
        </div>

        {/* Funnel hit rates */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Order Conversion Ratio</p>
          <p className="text-2xl font-black text-blue-600 tracking-tight mt-1.5">
            {orderSuccessPercentage}%
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            <Award className="w-3.5 h-3.5 text-blue-500" />
            <span>Success rate of overall pipeline drafts</span>
          </div>
        </div>

      </div>

      {/* Main Analysis Body split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top selling items table bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Product Revenue Distributions</h2>
            <p className="text-xs text-slate-400">Total revenue generated by products based on confirmed sales invoices.</p>
          </div>

          {bestSellers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No products have been successfully confirmed in orders yet. Try confirming draft quotations first!
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              {bestSellers.map((item, idx) => {
                const percentage = Math.round((item.totalRevenue / maxRevenueProdVal) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <div className="flex items-center gap-3 font-mono font-bold text-slate-500">
                        <span>{item.unitsSold} units sold</span>
                        <span className="text-emerald-600">${item.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    {/* SVG Progress bar */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Workflow Pipeline overview */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">Pipeline Inventory Summary</h2>
            <p className="text-xs text-slate-400">Basic breakdown of physical and financial structures.</p>
          </div>

          <div className="space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Total registered orders</span>
              <span className="font-bold text-slate-800 font-mono">{totalOrdersCount} items</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Active confirmed orders</span>
              <span className="font-bold text-slate-800 font-mono text-emerald-600">{confirmedSalesCount} items</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Pipeline quotations (Draft)</span>
              <span className="font-bold text-slate-800 font-mono text-amber-600">{draftCount} items</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Total products catalog index</span>
              <span className="font-bold text-slate-800 font-mono">{products.length} types</span>
            </div>
          </div>



        </div>

      </div>

    </div>
  );
}
