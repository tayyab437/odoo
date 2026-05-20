/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { DatabaseService } from '../services/database';
import { Order, Customer, Product, OrderItem } from '../types';
import { 
  ShoppingBag, Plus, Search, FileText, CheckCircle, Clock, 
  Trash2, Eye, X, PlusCircle, ArrowLeft, Loader2, Info 
} from 'lucide-react';

interface NewOrderItem {
  productId: string;
  quantity: number;
}

export default function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Active Screen
  // 'list' or 'create'
  const [screen, setScreen] = useState<'list' | 'create'>('list');

  // Selection state for detail modal
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingOrderItems, setViewingOrderItems] = useState<OrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Low Stock Alert config
  const [lowStockThreshold] = useState<number>(() => {
    const stored = localStorage.getItem('odoo_low_stock_threshold');
    return stored ? parseInt(stored, 10) : 10;
  });

  // New Order Creation Form Inputs
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newItems, setNewItems] = useState<NewOrderItem[]>([{ productId: '', quantity: 1 }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Refresh lists
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [oList, cList, pList] = await Promise.all([
        DatabaseService.orders.list(),
        DatabaseService.customers.list(),
        DatabaseService.products.list()
      ]);
      setOrders(oList);
      setCustomers(cList);
      setProducts(pList);
    } catch (err) {
      console.error('Failed to load orders screen data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const custName = o.customer_name || '';
    return o.id.toLowerCase().includes(search.toLowerCase()) || 
           custName.toLowerCase().includes(search.toLowerCase());
  });

  // Load Order details
  const handleViewOrderDetails = async (order: Order) => {
    setViewingOrder(order);
    setItemsLoading(true);
    setIsConfirming(false);
    setConfirmError(null);
    try {
      const itemsList = await DatabaseService.orders.getOrderItems(order.id);
      setViewingOrderItems(itemsList);
    } catch (err) {
      console.error('Failed to resolve order lines:', err);
    } finally {
      setItemsLoading(false);
    }
  };

  // Convert Status
  const handleConfirmOrder = async (orderId: string) => {
    try {
      const success = await DatabaseService.orders.confirmOrder(orderId);
      if (success) {
        // Refresh local cache & modal state
        await loadAllData();
        if (viewingOrder && viewingOrder.id === orderId) {
          setViewingOrder(prev => prev ? { ...prev, status: 'Confirmed' } : null);
        }
        setIsConfirming(false);
        setConfirmError(null);
      } else {
        setConfirmError('Failed to confirm order. Please verify database connection or stock levels.');
      }
    } catch (err: any) {
      console.error('Error confirming quote:', err);
      setConfirmError(err.message || 'Error occurred confirming order.');
    }
  };

  // Delete Order
  const handleDeleteOrder = async (id: string) => {
    if (confirm(`Cancel and delete order ref ${id}? This cannot be undone.`)) {
      try {
        const success = await DatabaseService.orders.delete(id);
        if (success) {
          setViewingOrder(null);
          await loadAllData();
        }
      } catch (err) {
        console.error('Error canceling order:', err);
      }
    }
  };

  // Line calculations for new orders
  const calculateDraftTotal = () => {
    return newItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return sum;
      return sum + (prod.price * item.quantity);
    }, 0);
  };

  // Handle Multi-item Lines modifications
  const addLineItem = () => {
    setNewItems([...newItems, { productId: '', quantity: 1 }]);
  };

  const removeLineItem = (index: number) => {
    if (newItems.length === 1) return;
    setNewItems(newItems.filter((_, idx) => idx !== index));
  };

  const updateLineProduct = (index: number, prodId: string) => {
    const updated = [...newItems];
    updated[index].productId = prodId;
    setNewItems(updated);
  };

  const updateLineQty = (index: number, qty: number) => {
    const updated = [...newItems];
    updated[index].quantity = Math.max(1, qty);
    setNewItems(updated);
  };

  // Save new order
  const handleCreateOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCustomerId) {
      setFormError('Please select a Customer');
      return;
    }

    const filteredDraftItems = newItems.filter(item => item.productId !== '');
    if (filteredDraftItems.length === 0) {
      setFormError('Please select at least one product with valid specifications.');
      return;
    }

    // Verify stock checks
    for (const item of filteredDraftItems) {
      const prod = products.find(p => p.id === item.productId);
      if (prod && prod.stock < item.quantity) {
        setFormError(`Insufficient stock for "${prod.name}". Available: ${prod.stock} units.`);
        return;
      }
    }

    setSubmitLoading(true);
    try {
      const dbItemsListArgs = filteredDraftItems.map(item => {
        const prod = products.find(p => p.id === item.productId)!;
        return {
          productId: item.productId,
          price: prod.price,
          quantity: item.quantity
        };
      });

      await DatabaseService.orders.create(selectedCustomerId, dbItemsListArgs);
      
      // Reset form variables
      setSelectedCustomerId('');
      setNewItems([{ productId: '', quantity: 1 }]);
      setScreen('list');
      await loadAllData();
    } catch (err: any) {
      setFormError(err.message || 'Could not instantiate order invoice.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {screen === 'list' ? (
        // ==========================================
        // MAIN ORDERS LISTING SCREEN
        // ==========================================
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sales Orders</h1>
              <p className="text-slate-500 text-sm mt-0.5">Quotations and formal commercial order workflows.</p>
            </div>

            <button
              id="btn-goto-create-order"
              onClick={() => {
                setSelectedCustomerId('');
                setNewItems([{ productId: '', quantity: 1 }]);
                setFormError(null);
                setScreen('create');
              }}
              className="flex items-center gap-2 bg-[#714B67] hover:bg-[#5d3d54] text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm active:scale-95 text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Order</span>
            </button>
          </div>

          {/* Search bar options */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center lg:max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="search-orders"
                type="text"
                placeholder="Search by ID or customer name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#714B67]"
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16">
                <Loader2 className="w-7 h-7 text-[#714B67] animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-medium">Downloading pipeline orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500 mb-1">No orders discovered</p>
                <p className="text-xs">Create a draft quotation to log a potential transaction.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 border-b border-slate-150 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-6">Order Ref</th>
                      <th className="py-4 px-6">Customer</th>
                      <th className="py-4 px-6">Creation Date</th>
                      <th className="py-4 px-6 text-right">Invoice Total</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900">{o.id}</td>
                        <td className="py-4 px-6 font-medium text-slate-800">{o.customer_name || 'Individual Client'}</td>
                        <td className="py-4 px-6 text-slate-500">
                          {new Date(o.created_at).toLocaleDateString(undefined, { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-slate-900">
                          ${o.total_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            o.status === 'Confirmed' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {o.status === 'Confirmed' ? (
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 mr-1" />
                            )}
                            {o.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              id={`btn-vieworder-${o.id}`}
                              onClick={() => handleViewOrderDetails(o)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#714B67] hover:underline hover:text-[#5c3e54] cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(o.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                              title="Delete Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        // ==========================================
        // CREATE ORDER WIZARD FORM W/ ROLLING TOTALS
        // ==========================================
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in max-w-3xl">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setScreen('list')}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-bold text-slate-800 text-base">New Quotation Invoice</h2>
                <p className="text-xs text-slate-400">Deploy transaction metrics to quotation list.</p>
              </div>
            </div>
            <span className="text-xs bg-purple-50 text-[#714B67] border border-purple-100 font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Draft Mode
            </span>
          </div>

          <form onSubmit={handleCreateOrderSubmit} className="p-6 space-y-6">
            {formError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs leading-relaxed">
                <strong>Validation failure:</strong> {formError}
              </div>
            )}

            {/* Select Customer */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">
                Select Customer Directory entry *
              </label>
              {customers.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  No registered active customers found. Please go back to Customers and create one first!
                </div>
              ) : (
                <select
                  id="order-form-customer-select"
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                >
                  <option value="">-- Choose registered customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Add Dynamic Lines items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-sans">
                  Itemized Line Specifications *
                </label>
                <button
                  id="btn-add-line-spec"
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center gap-1 text-xs text-[#714B67] hover:underline font-semibold cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Line item</span>
                </button>
              </div>

              {products.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  No catalog items found. Please define Products before creating checkout orders.
                </div>
              ) : (
                <div className="space-y-3">
                  {newItems.map((line, index) => {
                    const activeProdObj = products.find(p => p.id === line.productId);
                    const lineUnitCost = activeProdObj ? activeProdObj.price : 0.00;
                    const maxQtyLimit = activeProdObj ? activeProdObj.stock : 0;
                    const lineTotalCost = lineUnitCost * line.quantity;

                    return (
                      <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-3.5 rounded-xl border border-slate-150 relative">
                        {/* Select product */}
                        <div className="w-full sm:flex-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Product</label>
                          <select
                            id={`order-form-prod-select-${index}`}
                            required
                            value={line.productId}
                            onChange={(e) => updateLineProduct(index, e.target.value)}
                            className="bg-white w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                          >
                            <option value="">-- Choose Product --</option>
                            {products.filter(p => p.stock > 0 || p.id === line.productId).map(p => (
                              <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                {p.name} (${p.price.toFixed(2)}) {p.stock <= 0 ? '[Sold Out]' : `[In stock: ${p.stock}]`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Input Quantity */}
                        <div className="w-32">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qty</label>
                          <input
                            id={`order-form-qty-input-${index}`}
                            type="number"
                            min="1"
                            max={maxQtyLimit > 0 ? maxQtyLimit : 9999}
                            required
                            value={line.quantity}
                            onChange={(e) => updateLineQty(index, parseInt(e.target.value))}
                            className="bg-white w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                          />
                        </div>

                        {/* Subtotal Display */}
                        <div className="w-32 text-left sm:text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subtotal</span>
                          <span className="text-sm font-bold text-slate-800 font-mono inline-block pt-1">
                            ${lineTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Delete single Line Button */}
                        {newItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded bg-white border border-slate-200 absolute top-2 right-2 sm:static self-end sm:self-auto cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rolling Quote Totals summary card */}
            <div className="bg-[#714B67]/5 p-5 rounded-xl border border-[#714B67]/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 items-start">
                <Info className="w-5 h-5 text-[#714B67] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Real-time checkout calculates quote totals as you change line products or itemized quantities. Stocks will lock temporarily as Draft and decrease officially once order moves into confirmatory state.
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="text-xs uppercase font-bold text-slate-400">Rolling Grand Total</p>
                <p id="order-creation-dynamic-total" className="text-2xl font-black text-[#714B67] tracking-tight font-mono mt-0.5">
                  ${calculateDraftTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setScreen('list')}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                id="btn-submit-save-order"
                type="submit"
                disabled={submitLoading || products.length === 0 || customers.length === 0}
                className="flex items-center gap-1.5 bg-[#714B67] hover:bg-[#5d3d54] text-white px-5 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                <span>Create Draft Invoice</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ==========================================
          ORDER DETAILS MODAL SCREEN WITH CONFIRM BUTTON
          ========================================== */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scale-up border border-slate-200">
            
            {/* Modal Title bar */}
            <div className="bg-[#714B67] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <span className="text-slate-100/70 font-mono text-xs uppercase font-semibold">Order ID Reference</span>
                <h2 className="font-extrabold text-lg -mt-0.5">{viewingOrder.id}</h2>
              </div>
              <button 
                onClick={() => setViewingOrder(null)}
                className="text-purple-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Details Grid */}
            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold mb-0.5">Customer Name</p>
                  <p className="font-semibold text-slate-800">{viewingOrder.customer_name || 'Individual client'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold mb-0.5">Billing Transaction Period</p>
                  <p className="font-semibold text-slate-800">
                    {new Date(viewingOrder.created_at).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold mb-0.5">Workflow Status</p>
                  <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold leading-5 ${
                    viewingOrder.status === 'Confirmed' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {viewingOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold mb-0.5">Gross Total Invoiced</p>
                  <p className="font-black text-rose-600 text-base font-mono">
                    ${viewingOrder.total_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Order line items table */}
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-150 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Itemized Line Details
                </div>

                {itemsLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#714B67] mb-2" />
                    Calculating transaction costs...
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-150">
                      <tr>
                        <th className="py-2.5 px-4">Catalog Product</th>
                        <th className="py-2.5 px-4 text-right">Unit Price</th>
                        <th className="py-2.5 px-4 text-center">Amount</th>
                        <th className="py-2.5 px-4 text-right">Sum total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {viewingOrderItems.map(item => {
                        const matchingProd = products.find(p => p.id === item.product_id);
                        const currentStock = matchingProd ? matchingProd.stock : null;
                        const subtotal = item.price * item.quantity;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/55 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900">{item.product_name || 'Unresolved product'}</span>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium tracking-tight">
                                    ID: {item.product_id}
                                  </span>
                                  {currentStock !== null && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                                      currentStock > lowStockThreshold 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                        : currentStock > 0 
                                          ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                          : 'bg-rose-50 text-rose-700 border border-rose-150'
                                    }`}>
                                      Stock: {currentStock} avail.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              ${item.price.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-bold text-slate-800 font-mono">{item.quantity}</span>
                                <span className="text-[10px] text-slate-400">units</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-[#714B67] font-mono">
                                  ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                  ({item.quantity} × ${item.price.toFixed(2)})
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Subtotal row footer */}
                      <tr className="bg-slate-50/80 font-semibold text-slate-900 border-t border-slate-150">
                        <td colSpan={3} className="py-3.5 px-4 text-right font-bold text-xs text-slate-600">Invoiced Sum total:</td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-sm font-mono text-[#714B67]">
                          ${viewingOrder.total_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Bottom control bar with Interactive Confirmation flow */}
              <div className="border-t border-slate-150 pt-5">
                {isConfirming ? (
                  <div className="bg-[#714B67]/5 border border-[#714B67]/20 rounded-xl p-4.5 space-y-3.5 animate-fade-in">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4.5 h-4.5 text-[#714B67] mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Order Status Alignment Process</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Approving this invoice will officially subtract stock from the active warehouse index and freeze final total pricing at <strong className="text-rose-600 font-mono">${viewingOrder.total_price.toFixed(2)}</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Stock validation overview */}
                    <div className="bg-white border border-slate-150 rounded-lg p-3 space-y-2 text-xs">
                      <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider block">Warehouse Check</span>
                      {viewingOrderItems.map(item => {
                        const prod = products.find(p => p.id === item.product_id);
                        const available = prod ? prod.stock : 0;
                        const hasSufficient = available >= item.quantity;

                        return (
                          <div key={item.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-100 last:border-0">
                            <span className="font-medium text-slate-700">{item.product_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-[10px] font-mono">Qty: {item.quantity} / Avail: {available}</span>
                              {hasSufficient ? (
                                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-100">✅ Sufficient</span>
                              ) : (
                                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-rose-100">❌ Insufficient Stock</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {confirmError && (
                      <p className="text-xs font-bold text-rose-600 leading-relaxed bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                        ⚠️ {confirmError}
                      </p>
                    )}

                    <div className="flex justify-end gap-2.5 pt-1">
                      <button
                        onClick={() => {
                          setIsConfirming(false);
                          setConfirmError(null);
                        }}
                        className="px-3.5 py-1.5 border border-slate-250 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Abort Confirmation
                      </button>
                      <button
                        onClick={() => {
                          const insufficient = viewingOrderItems.some(item => {
                            const prod = products.find(p => p.id === item.product_id);
                            return !prod || prod.stock < item.quantity;
                          });
                          if (insufficient) {
                            setConfirmError("Cannot approve invoice. Some products have insufficient warehouse inventory.");
                            return;
                          }
                          handleConfirmOrder(viewingOrder.id);
                        }}
                        className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5d3d54] text-white font-bold rounded-lg text-xs shadow-sm cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
                        <span>Approve & Deduct Stock</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-between items-center">
                    <button
                      onClick={() => handleDeleteOrder(viewingOrder.id)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-500 hover:text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Cancel Order</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingOrder(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Close Directory view
                      </button>

                      {viewingOrder.status === 'Draft' && (
                        <button
                          id="btn-confirm-order-action"
                          onClick={() => {
                            setIsConfirming(true);
                            setConfirmError(null);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d54] text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4 text-amber-400" />
                          <span>Confirm Sale (Approve Invoice)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
