/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { DatabaseService } from '../services/database';
import { Product } from '../types';
import { Plus, Edit2, Trash2, Search, X, Loader2, Landmark, Package } from 'lucide-react';

export default function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(() => {
    const stored = localStorage.getItem('odoo_low_stock_threshold');
    return stored ? parseInt(stored, 10) : 10;
  });

  const handleSetThreshold = (val: number) => {
    const cleanVal = Math.max(0, isNaN(val) ? 0 : val);
    setLowStockThreshold(cleanVal);
    localStorage.setItem('odoo_low_stock_threshold', cleanVal.toString());
  };

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Inputs
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load Products
  const loadProducts = async () => {
    try {
      setLoading(true);
      const list = await DatabaseService.products.list();
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter List
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Open Edit Dialog
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setPrice(p.price.toString());
    setStock(p.stock.toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setStock('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Product name is required');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Price must be a valid positive number');
      return;
    }

    const stockNum = parseInt(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      setFormError('Stock Quantity must be a valid non-negative integer');
      return;
    }

    setSubmitLoading(true);
    setFormError(null);

    try {
      if (editingProduct) {
        await DatabaseService.products.update(editingProduct.id, {
          name,
          price: priceNum,
          stock: stockNum
        });
      } else {
        await DatabaseService.products.create({
          name,
          price: priceNum,
          stock: stockNum
        });
      }
      setIsModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred saving product.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete product
  const handleDelete = async (id: string, prodName: string) => {
    if (confirm(`Are you sure you want to delete product "${prodName}"?`)) {
      try {
        const success = await DatabaseService.products.delete(id);
        if (success) {
          await loadProducts();
        } else {
          alert('Could not delete product. It might be referenced in active sales order items.');
        }
      } catch (err) {
        console.error('Failed to delete product:', err);
        alert('An error occurred deleting this product.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header and Add controllers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Product Catalog</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage trade item details, list prices, and physical warehouse inventory levels.</p>
        </div>

        <button
          id="btn-add-product"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#5d3d54] text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm active:scale-95 text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Product</span>
        </button>
      </div>

      {/* Filter Options and Configuration */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            id="search-product"
            type="text"
            placeholder="Search by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#714B67]"
          />
        </div>

        <div className="flex items-center gap-2.5 bg-slate-50/70 border border-slate-150 rounded-lg px-3 py-1.5 font-sans self-start md:self-auto shrink-0">
          <span className="text-xs font-semibold text-slate-500">Low Stock Threshold:</span>
          <input
            id="low-stock-threshold-input"
            type="number"
            min="0"
            max="1000"
            value={lowStockThreshold}
            onChange={(e) => handleSetThreshold(parseInt(e.target.value, 10))}
            className="w-14 text-center text-xs font-bold bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-800 focus:outline-none focus:border-[#714B67]"
          />
          <span className="text-xs text-slate-400">units</span>
        </div>
      </div>

      {/* Products list box Grid / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="w-7 h-7 text-[#714B67] animate-spin mb-3" />
            <p className="text-sm text-slate-500 font-medium font-sans">Accessing catalog inventory logs...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500 mb-1">No products found</p>
            <p className="text-xs">Introduce custom goods or services into the index for checkout.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-150 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Product Item Model</th>
                  <th className="py-4 px-6 text-right">Standard List Price</th>
                  <th className="py-4 px-6 text-center">In Stock Quantity</th>
                  <th className="py-4 px-6 text-center">Inventory Level Alerts</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.stock === 0;
                  const isLowStock = !isOutOfStock && p.stock <= lowStockThreshold;

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${isOutOfStock ? 'bg-rose-50/20' : ''}`}>
                      <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isOutOfStock ? 'bg-rose-100/50 text-rose-500' : 'bg-slate-100 text-slate-600'}`}>
                          <Package className={`w-4 h-4 ${isOutOfStock ? 'text-rose-500' : 'text-[#714B67]'}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`${isOutOfStock ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{p.name}</span>
                          {isOutOfStock && (
                            <span className="text-[10px] font-bold text-rose-600 mt-0.5 uppercase tracking-wider">
                              ⚠️ Out of Stock (Disabled)
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-4 px-6 text-right font-bold text-slate-900">
                        ${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      
                      <td className={`py-4 px-6 text-center font-bold font-mono ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-705'}`}>
                        {p.stock} units
                      </td>

                      <td className="py-4 px-6 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex px-2.5 py-1 font-extrabold text-[10px] uppercase rounded-full bg-rose-100 border border-rose-200 text-rose-800 shadow-xs animate-pulse">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex px-2.5 py-1 font-extrabold text-[10px] uppercase rounded-full bg-amber-50 border border-amber-200 text-amber-800 shadow-xs">
                            Low Inventory
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 font-bold text-[10px] uppercase rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                            Optimized Stock
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`btn-edit-product-${p.id}`}
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-[#714B67] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            id={`btn-delete-product-${p.id}`}
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up border border-slate-150">
            {/* Modal Header */}
            <div className="bg-[#714B67] text-white px-6 py-4 flex justify-between items-center">
              <h2 className="font-bold text-lg">
                {editingProduct ? 'Modify Product Specifications' : 'Add New Product Option'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-purple-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Product / Item Name *
                </label>
                <input
                  id="product-form-name"
                  type="text"
                  required
                  placeholder="e.g. Ergonomic Standing Desk"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    List Price (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                    <input
                      id="product-form-id-price"
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Physical Stock Count *
                  </label>
                  <input
                    id="product-form-id-stock"
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                  />
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6 font-sans">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="product-form-submit"
                  type="submit"
                  disabled={submitLoading}
                  className="flex items-center gap-1.5 bg-[#714B67] hover:bg-[#5d3d54] text-white px-5 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>Preserve Item</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
