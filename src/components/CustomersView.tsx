/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { DatabaseService } from '../services/database';
import { Customer } from '../types';
import { UserPlus, Edit2, Trash2, Search, X, Loader2, Sparkles } from 'lucide-react';

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Form Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form Inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load Customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const list = await DatabaseService.customers.list();
      setCustomers(list);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter list
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  // Edit action
  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone);
    setCompany(c.company);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Create action
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save changes
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Customer name is required');
      return;
    }

    setSubmitLoading(true);
    setFormError(null);

    try {
      if (editingCustomer) {
        // Edit Customer
        await DatabaseService.customers.update(editingCustomer.id, {
          name,
          email,
          phone,
          company
        });
      } else {
        // Create Customer
        await DatabaseService.customers.create({
          name,
          email,
          phone,
          company
        });
      }
      setIsModalOpen(false);
      await loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to preserve customer.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Action
  const handleDelete = async (id: string, customerName: string) => {
    if (confirm(`Are you sure you want to delete customer "${customerName}"?`)) {
      try {
        const success = await DatabaseService.customers.delete(id);
        if (success) {
          await loadCustomers();
        } else {
          alert('Could not delete customer. They might be referenced in orders.');
        }
      } catch (err) {
        console.error('Customer deletion failed:', err);
        alert('An error occurred while deleting customer.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search Header and Addition controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Customers Directory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage customer credentials and client company profiles.</p>
        </div>
        
        <button
          id="btn-add-customer"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#5d3d54] text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm active:scale-95 text-sm cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center lg:max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            id="search-customer"
            type="text"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#714B67]"
          />
        </div>
      </div>

      {/* Customers Data Frame */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="w-8 h-8 text-[#714B67] animate-spin mb-3" />
            <p className="text-sm text-slate-500 font-medium">Synchronizing client folder...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500 mb-1">No customers found</p>
            <p className="text-xs">Create a brand new customer directory entry to launch sales orders!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-150 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Company</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Phone Number</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                        {c.company || 'Individual'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600">{c.email || '—'}</td>
                    <td className="py-4 px-6 text-slate-500">{c.phone || '—'}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          id={`btn-edit-customer-${c.id}`}
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-[#714B67] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-customer-${c.id}`}
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Customer Form Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up border border-slate-150">
            {/* Modal Header */}
            <div className="bg-[#714B67] text-white px-6 py-4 flex justify-between items-center">
              <h2 className="font-bold text-lg">
                {editingCustomer ? 'Modify Customer Profile' : 'Add New Customer'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-purple-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Customer Name *
                </label>
                <input
                  id="customer-form-name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Company / Organization
                </label>
                <input
                  id="customer-form-company"
                  type="text"
                  placeholder="e.g. Acme Industries"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    id="customer-form-email"
                    type="email"
                    placeholder="john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="customer-form-phone"
                    type="text"
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#714B67]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="customer-form-submit"
                  type="submit"
                  disabled={submitLoading}
                  className="flex items-center gap-1.5 bg-[#714B67] hover:bg-[#5d3d54] text-white px-5 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>Save Profile</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
