// EmployeeCreate.jsx - Per-category sale price, commission, delivery method & quantity-based delivery charges
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const EmployeeCreate = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    employeeCategory: '',
    employeeName: '',
    employeeAddress: '',
    employeeMobileNumber: '',
    employeeCommission: []
  });

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock`);
      setStocks(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
      setError('Failed to load stock products.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getUniqueProductNames = () => {
    const names = stocks.map(stock => stock.productName);
    return [...new Set(names)].filter(Boolean).sort();
  };

  // ✅ NEW: Get unique categories for a product name
  const getCategoriesForProduct = (productName) => {
    if (!productName) return [];
    return [...new Set(stocks.filter(s => s.productName === productName).map(s => s.productCategory))].filter(Boolean).sort();
  };

  const getSelectedProductNames = () => {
    return formData.employeeCommission
      .filter(comm => comm.productName)
      .map(comm => comm.productName);
  };

  const getAvailableProductNames = () => {
    const selected = getSelectedProductNames();
    return getUniqueProductNames().filter(name => !selected.includes(name));
  };

  const addCommission = () => {
    const available = getAvailableProductNames();
    if (available.length === 0) {
      setError('All products have been assigned a commission rate.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      employeeCommission: [
        ...prev.employeeCommission,
        {
          productId: '',
          productName: '',
          commissionAmount: '',
          // ✅ NEW: per-category price array
          categoryPrices: [],
          deliveryMethod: '',
          deliveryCharges: [{ minQuantity: 1, maxQuantity: 1, charges: '' }]
        }
      ]
    }));
  };

  const removeCommission = (index) => {
    setFormData(prev => ({
      ...prev,
      employeeCommission: prev.employeeCommission.filter((_, i) => i !== index)
    }));
  };

  const handleCommissionChange = (index, field, value) => {
    const updatedCommissions = [...formData.employeeCommission];
    if (field === 'productName') {
      const selectedStock = stocks.find(stock => stock.productName === value);
      // ✅ NEW: reset categoryPrices and pre-populate categories when product selected
      const cats = getCategoriesForProduct(value);
      updatedCommissions[index] = {
        ...updatedCommissions[index],
        productName: value,
        productId: selectedStock ? selectedStock._id : '',
        categoryPrices: cats.map(cat => ({ productCategory: cat, productSalePrice: '' }))
      };
    } else {
      updatedCommissions[index] = { ...updatedCommissions[index], [field]: value };
    }
    setFormData(prev => ({ ...prev, employeeCommission: updatedCommissions }));
  };

  // ✅ NEW: Handle per-category price change
  const handleCategoryPriceChange = (commissionIndex, catIndex, value) => {
    const updatedCommissions = [...formData.employeeCommission];
    updatedCommissions[commissionIndex].categoryPrices[catIndex] = {
      ...updatedCommissions[commissionIndex].categoryPrices[catIndex],
      productSalePrice: value
    };
    setFormData(prev => ({ ...prev, employeeCommission: updatedCommissions }));
  };

  const addDeliveryTier = (commissionIndex) => {
    const updatedCommissions = [...formData.employeeCommission];
    const tiers = updatedCommissions[commissionIndex].deliveryCharges || [];
    const lastTier = tiers[tiers.length - 1];
    const nextMin = lastTier ? (parseInt(lastTier.maxQuantity) || 0) + 1 : 1;
    updatedCommissions[commissionIndex].deliveryCharges = [
      ...tiers,
      { minQuantity: nextMin, maxQuantity: nextMin, charges: '' }
    ];
    setFormData(prev => ({ ...prev, employeeCommission: updatedCommissions }));
  };

  const removeDeliveryTier = (commissionIndex, tierIndex) => {
    const updatedCommissions = [...formData.employeeCommission];
    updatedCommissions[commissionIndex].deliveryCharges = updatedCommissions[commissionIndex]
      .deliveryCharges.filter((_, i) => i !== tierIndex);
    setFormData(prev => ({ ...prev, employeeCommission: updatedCommissions }));
  };

  const handleDeliveryTierChange = (commissionIndex, tierIndex, field, value) => {
    const updatedCommissions = [...formData.employeeCommission];
    updatedCommissions[commissionIndex].deliveryCharges[tierIndex] = {
      ...updatedCommissions[commissionIndex].deliveryCharges[tierIndex],
      [field]: value
    };
    setFormData(prev => ({ ...prev, employeeCommission: updatedCommissions }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.employeeCategory.trim()) { setError('Employee category is required'); setLoading(false); return; }
      if (!formData.employeeName.trim()) { setError('Employee name is required'); setLoading(false); return; }
      if (!formData.employeeAddress.trim()) { setError('Employee address is required'); setLoading(false); return; }
      if (!formData.employeeMobileNumber.trim()) { setError('Mobile number is required'); setLoading(false); return; }

      const validCommissions = formData.employeeCommission.filter(
        comm => comm.productName && comm.commissionAmount && parseFloat(comm.commissionAmount) > 0
      );

      if (validCommissions.length === 0) {
        setError('Please add at least one commission with valid product and amount');
        setLoading(false);
        return;
      }

      // ✅ NEW: Validate that each category has a valid price
      for (const comm of validCommissions) {
        if (!comm.categoryPrices || comm.categoryPrices.length === 0) {
          setError(`Please add category prices for "${comm.productName}"`);
          setLoading(false);
          return;
        }
        for (const cp of comm.categoryPrices) {
          if (cp.productSalePrice === '' || cp.productSalePrice === null || parseFloat(cp.productSalePrice) < 0) {
            setError(`Please enter valid price for "${comm.productName} - ${cp.productCategory}"`);
            setLoading(false);
            return;
          }
        }
      }

      const submitData = {
        employeeCategory: formData.employeeCategory.trim(),
        employeeName: formData.employeeName.trim(),
        employeeAddress: formData.employeeAddress.trim(),
        employeeMobileNumber: formData.employeeMobileNumber.trim(),
        employeeCommission: validCommissions.map(comm => ({
          productId: comm.productId,
          productName: comm.productName,
          commissionAmount: parseFloat(comm.commissionAmount),
          // ✅ NEW: save per-category prices
          categoryPrices: comm.categoryPrices.map(cp => ({
            productCategory: cp.productCategory,
            productSalePrice: parseFloat(cp.productSalePrice) || 0
          })),
          deliveryMethod: comm.deliveryMethod || '',
          deliveryCharges: (comm.deliveryCharges || [])
            .filter(t => t.charges !== '' && t.charges !== null)
            .map(t => ({
              minQuantity: parseInt(t.minQuantity),
              maxQuantity: parseInt(t.maxQuantity),
              charges: parseFloat(t.charges)
            }))
        }))
      };

      const response = await axios.post(`${API_BASE_URL}/employee`, submitData);
      setSuccess(response.data.message || 'Employee created successfully!');

      setFormData({
        employeeCategory: '',
        employeeName: '',
        employeeAddress: '',
        employeeMobileNumber: '',
        employeeCommission: []
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to create employee.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-5 px-3 sm:px-4 lg:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-1">CREATE EMPLOYEE</h1>
        </div>

        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2">❌</span>
              <p className="text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-3 bg-green-50 border-l-4 border-green-500 p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2">✅</span>
              <p className="text-green-700 flex-1">{success}</p>
              <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600 ml-2">✕</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-white">Employee Registration</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Basic Information */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Basic Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <input type="text" name="employeeCategory" value={formData.employeeCategory}
                    onChange={handleInputChange} required placeholder="e.g., Sales, Manager"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input type="text" name="employeeName" value={formData.employeeName}
                    onChange={handleInputChange} required placeholder="Full name"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile <span className="text-red-500">*</span></label>
                  <input type="tel" name="employeeMobileNumber" value={formData.employeeMobileNumber}
                    onChange={handleInputChange} required placeholder="Mobile number"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
                  <input type="text" name="employeeAddress" value={formData.employeeAddress}
                    onChange={handleInputChange} required placeholder="Address"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Commission Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                <h3 className="text-xs font-semibold text-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Product Commission, Category Prices & Delivery
                </h3>
                <button type="button" onClick={addCommission}
                  disabled={getAvailableProductNames().length === 0}
                  className="inline-flex items-center px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs font-medium w-full sm:w-auto justify-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              </div>

              <div className="mb-2 text-xs text-gray-500">
                {getAvailableProductNames().length} product(s) available
              </div>

              {formData.employeeCommission.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
                  <p className="text-xs text-gray-500">No products added</p>
                  <p className="text-xs text-gray-400">Click "Add Product" to assign commission</p>
                </div>
              )}

              <div className="space-y-2">
                {formData.employeeCommission.map((commission, index) => {
                  const availableForThis = getUniqueProductNames().filter(
                    name => !getSelectedProductNames().includes(name) || name === commission.productName
                  );

                  return (
                    <div key={index} className="bg-gray-50 rounded-md p-3 border border-gray-200 hover:border-blue-300 transition">
                      <div className="flex justify-between items-center mb-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                          {index + 1}
                        </span>
                        <button type="button" onClick={() => removeCommission(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-0.5" title="Remove">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Product <span className="text-red-500">*</span></label>
                          <select value={commission.productName}
                            onChange={(e) => handleCommissionChange(index, 'productName', e.target.value)}
                            required
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500">
                            <option value="">Select product</option>
                            {availableForThis.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Commission/Unit <span className="text-red-500">*</span></label>
                          <input type="number" value={commission.commissionAmount}
                            onChange={(e) => handleCommissionChange(index, 'commissionAmount', e.target.value)}
                            required min="0" step="0.01" placeholder="0.00"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                        </div>

                        {/* ✅ NEW: Per-category price inputs (auto-generated for all categories of this product) */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Sale Price per Category <span className="text-red-500">*</span>
                          </label>
                          {commission.categoryPrices && commission.categoryPrices.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {commission.categoryPrices.map((cp, catIdx) => (
                                <div key={catIdx} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1.5">
                                  <span className="text-xs font-medium text-gray-700 flex-1 truncate">{cp.productCategory}</span>
                                  <input type="number" value={cp.productSalePrice}
                                    onChange={(e) => handleCategoryPriceChange(index, catIdx, e.target.value)}
                                    required min="0" step="0.01" placeholder="0.00"
                                    className="w-24 px-1.5 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Select a product to load its categories</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Method <span className="text-red-500">*</span></label>
                          <select value={commission.deliveryMethod}
                            onChange={(e) => handleCommissionChange(index, 'deliveryMethod', e.target.value)}
                            required
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500">
                            <option value="">Select method</option>
                            <option value="TCS">TCS</option>
                            <option value="M&P">M&P</option>
                            <option value="P/O">P/O</option>
                            <option value="By Hand">By Hand</option>
                          </select>
                        </div>
                      </div>

                      {/* Quantity-based delivery charges tiers */}
                      <div className="mt-3 border-t border-gray-200 pt-2">
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-medium text-gray-700">Delivery Charges by Quantity</label>
                          <button type="button" onClick={() => addDeliveryTier(index)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            + Add Tier
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-1.5">
                          Example: 1-2 qty → 200 Rs, 3-3 qty → 300 Rs, 4+ qty → 500 Rs
                        </p>

                        {commission.deliveryCharges && commission.deliveryCharges.length > 0 ? (
                          <div className="space-y-1.5">
                            {commission.deliveryCharges.map((tier, tierIdx) => (
                              <div key={tierIdx} className="flex items-center gap-1.5">
                                <input type="number" value={tier.minQuantity}
                                  onChange={(e) => handleDeliveryTierChange(index, tierIdx, 'minQuantity', e.target.value)}
                                  placeholder="Min" min="1"
                                  className="w-16 px-1.5 py-1 border border-gray-300 rounded text-xs" />
                                <span className="text-xs text-gray-500">to</span>
                                <input type="number" value={tier.maxQuantity}
                                  onChange={(e) => handleDeliveryTierChange(index, tierIdx, 'maxQuantity', e.target.value)}
                                  placeholder="Max" min="1"
                                  className="w-16 px-1.5 py-1 border border-gray-300 rounded text-xs" />
                                <span className="text-xs text-gray-500">qty →</span>
                                <input type="number" value={tier.charges}
                                  onChange={(e) => handleDeliveryTierChange(index, tierIdx, 'charges', e.target.value)}
                                  placeholder="Charges" min="0" step="0.01"
                                  className="flex-1 px-1.5 py-1 border border-gray-300 rounded text-xs" />
                                <span className="text-xs text-gray-500">Rs.</span>
                                {commission.deliveryCharges.length > 1 && (
                                  <button type="button" onClick={() => removeDeliveryTier(index, tierIdx)}
                                    className="text-red-500 hover:text-red-700">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No delivery charges configured</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading}
                className={`w-full py-2.5 px-4 rounded-md text-white text-sm font-medium transition duration-200 ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-sm'
                }`}>
                {loading ? 'Creating Employee...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCreate;
