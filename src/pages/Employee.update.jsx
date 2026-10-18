// EmployeeUpdate.jsx - Per-category sale price, commission, delivery method & quantity-based delivery charges
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const EmployeeUpdate = () => {
  const [employees, setEmployees] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employeeCategory: '',
    employeeName: '',
    employeeAddress: '',
    employeeMobileNumber: '',
    employeeCommission: []
  });

  useEffect(() => {
    fetchEmployees();
    fetchStocks();
  }, []);

  const fetchEmployees = async () => {
    try {
      setFetchLoading(true);
      const response = await axios.get(`${API_BASE_URL}/employee`);
      setEmployees(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees.');
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock`);
      setStocks(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
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

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      employeeCategory: employee.employeeCategory || '',
      employeeName: employee.employeeName || '',
      employeeAddress: employee.employeeAddress || '',
      employeeMobileNumber: employee.employeeMobileNumber || '',
      employeeCommission: employee.employeeCommission ? employee.employeeCommission.map(comm => ({
        productId: comm.productId || '',
        productName: comm.productName || '',
        commissionAmount: comm.commissionAmount || '',
        // ✅ NEW: categoryPrices (backward-safe: if old record had productSalePrice, seed it into matching category)
        categoryPrices: comm.categoryPrices && comm.categoryPrices.length > 0
          ? comm.categoryPrices.map(cp => ({
              productCategory: cp.productCategory || '',
              productSalePrice: cp.productSalePrice ?? ''
            }))
          : getCategoriesForProduct(comm.productName).map(cat => ({
              productCategory: cat,
              productSalePrice: comm.productSalePrice ?? '' // fallback for legacy data
            })),
        deliveryMethod: comm.deliveryMethod || '',
        deliveryCharges: comm.deliveryCharges && comm.deliveryCharges.length > 0
          ? comm.deliveryCharges.map(t => ({
              minQuantity: t.minQuantity || 1,
              maxQuantity: t.maxQuantity || 1,
              charges: t.charges ?? ''
            }))
          : [{ minQuantity: 1, maxQuantity: 1, charges: '' }]
      })) : []
    });
    setError(null);
    setSuccess(null);
    setTimeout(() => {
      document.getElementById('updateForm')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          productId: '', productName: '', commissionAmount: '',
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
      // ✅ NEW: reset & pre-populate categories when product changes
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

  // ✅ NEW: per-category price change
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

  const hasChanges = () => {
    if (!selectedEmployee) return false;
    // Simple always-true for commission changes (deep-compare skipped for brevity)
    return true;
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) { setError('Please select an employee'); return; }

    const validCommissions = formData.employeeCommission.filter(
      comm => comm.productName && comm.commissionAmount && parseFloat(comm.commissionAmount) > 0
    );

    // ✅ NEW: Validate category prices
    for (const comm of validCommissions) {
      if (!comm.categoryPrices || comm.categoryPrices.length === 0) {
        setError(`Please add category prices for "${comm.productName}"`);
        return;
      }
      for (const cp of comm.categoryPrices) {
        if (cp.productSalePrice === '' || cp.productSalePrice === null || parseFloat(cp.productSalePrice) < 0) {
          setError(`Please enter valid price for "${comm.productName} - ${cp.productCategory}"`);
          return;
        }
      }
    }

    setUpdateLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData = {
        employeeCategory: formData.employeeCategory,
        employeeName: formData.employeeName,
        employeeAddress: formData.employeeAddress,
        employeeMobileNumber: formData.employeeMobileNumber,
        employeeCommission: validCommissions.map(comm => ({
          productId: comm.productId,
          productName: comm.productName,
          commissionAmount: parseFloat(comm.commissionAmount),
          // ✅ NEW: per-category prices
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

      const response = await axios.put(`${API_BASE_URL}/employee/${selectedEmployee._id}`, updateData);
      setSuccess(response.data.message || 'Employee updated successfully!');
      setEmployees(prev => prev.map(emp => emp._id === selectedEmployee._id ? response.data.data : emp));
      setSelectedEmployee(response.data.data);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update employee.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancelUpdate = () => {
    setSelectedEmployee(null);
    setFormData({ employeeCategory: '', employeeName: '', employeeAddress: '', employeeMobileNumber: '', employeeCommission: [] });
    setError(null); setSuccess(null);
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-5 px-3 sm:px-4 lg:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-1">UPDATE EMPLOYEE</h1>
        </div>

        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2.5 rounded-r-lg text-xs">
            <div className="flex"><span className="mr-2">❌</span><p className="text-red-700 flex-1">{error}</p><button onClick={clearMessages} className="text-red-400 hover:text-red-600">✕</button></div>
          </div>
        )}
        {success && (
          <div className="mb-3 bg-green-50 border-l-4 border-green-500 p-2.5 rounded-r-lg text-xs">
            <div className="flex"><span className="mr-2">✅</span><p className="text-green-700 flex-1">{success}</p><button onClick={clearMessages} className="text-green-400 hover:text-green-600">✕</button></div>
          </div>
        )}

        {/* Employee Selection */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Select Employee</h2>
            <button onClick={fetchEmployees} className="px-2.5 py-1 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-xs font-medium w-full sm:w-auto">🔄 Refresh</button>
          </div>
          <div className="p-2.5">
            {fetchLoading ? (
              <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
            ) : employees.length === 0 ? (
              <div className="text-center py-6"><span className="text-2xl">👥</span><p className="mt-1 text-xs text-gray-500">No employees available</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {employees.map((employee) => (
                  <button key={employee._id} onClick={() => handleSelectEmployee(employee)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-left transition duration-150 ${
                      selectedEmployee?._id === employee._id ? 'bg-blue-50 border-2 border-blue-500 shadow-sm' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}>
                    <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                      selectedEmployee?._id === employee._id ? 'bg-linear-to-r from-blue-500 to-cyan-500' : 'bg-linear-to-r from-gray-400 to-gray-500'
                    }`}>
                      <span className="text-white font-bold text-xs">{employee.employeeName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${selectedEmployee?._id === employee._id ? 'text-blue-900' : 'text-gray-900'}`}>{employee.employeeName}</p>
                      <p className="text-xs text-gray-500 truncate">{employee.employeeCategory}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Update Form */}
        <div id="updateForm">
          {!selectedEmployee ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="text-center py-12"><span className="text-3xl">✏️</span><h3 className="mt-2 text-sm font-medium text-gray-900">No Employee Selected</h3><p className="mt-1 text-xs text-gray-500">Select an employee above to update.</p></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">Update Employee</h2>
                  <p className="text-blue-100 text-xs">Editing: {selectedEmployee.employeeName}</p>
                </div>
                <button onClick={handleCancelUpdate} className="px-2.5 py-1 bg-white text-gray-700 rounded-md hover:bg-gray-100 text-xs font-medium w-full sm:w-auto">Cancel</button>
              </div>

              <form onSubmit={handleUpdateEmployee} className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                    <input type="text" name="employeeCategory" value={formData.employeeCategory} onChange={handleInputChange} required
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" name="employeeName" value={formData.employeeName} onChange={handleInputChange} required
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mobile *</label>
                    <input type="tel" name="employeeMobileNumber" value={formData.employeeMobileNumber} onChange={handleInputChange} required
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
                    <input type="text" name="employeeAddress" value={formData.employeeAddress} onChange={handleInputChange} required
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>

                {/* Commission Section */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-700">Commission, Category Prices & Delivery</h3>
                      <p className="text-xs text-gray-400">{getAvailableProductNames().length} products available</p>
                    </div>
                    <button type="button" onClick={addCommission} disabled={getAvailableProductNames().length === 0}
                      className="inline-flex items-center px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs font-medium w-full sm:w-auto justify-center">
                      + Add Product
                    </button>
                  </div>

                  {formData.employeeCommission.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
                      <p className="text-xs text-gray-500">No commission rates added</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.employeeCommission.map((commission, index) => {
                        const availableForThis = getUniqueProductNames().filter(
                          name => !getSelectedProductNames().includes(name) || name === commission.productName
                        );
                        return (
                          <div key={index} className="bg-gray-50 rounded-md p-2.5 border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">{index + 1}</span>
                              <button type="button" onClick={() => removeCommission(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-0.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Product *</label>
                                <select value={commission.productName} onChange={(e) => handleCommissionChange(index, 'productName', e.target.value)} required
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500">
                                  <option value="">Select product</option>
                                  {availableForThis.map((name) => (<option key={name} value={name}>{name}</option>))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Commission/Unit *</label>
                                <input type="number" value={commission.commissionAmount} onChange={(e) => handleCommissionChange(index, 'commissionAmount', e.target.value)} required min="0" step="0.01"
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                              </div>

                              {/* ✅ NEW: per-category prices */}
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">Delivery Method *</label>
                                <select value={commission.deliveryMethod} onChange={(e) => handleCommissionChange(index, 'deliveryMethod', e.target.value)} required
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500">
                                  <option value="">Select method</option>
                                  <option value="TCS">TCS</option>
                                  <option value="M&P">M&P</option>
                                  <option value="P/O">P/O</option>
                                  <option value="By Hand">By Hand</option>
                                </select>
                              </div>
                            </div>

                            {/* Delivery charges tiers */}
                            <div className="mt-3 border-t border-gray-200 pt-2">
                              <div className="flex justify-between items-center mb-1.5">
                                <label className="text-xs font-medium text-gray-700">Delivery Charges by Quantity</label>
                                <button type="button" onClick={() => addDeliveryTier(index)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Tier</button>
                              </div>
                              {commission.deliveryCharges && commission.deliveryCharges.length > 0 ? (
                                <div className="space-y-1.5">
                                  {commission.deliveryCharges.map((tier, tierIdx) => (
                                    <div key={tierIdx} className="flex items-center gap-1.5">
                                      <input type="number" value={tier.minQuantity} onChange={(e) => handleDeliveryTierChange(index, tierIdx, 'minQuantity', e.target.value)} min="1" placeholder="Min" className="w-16 px-1.5 py-1 border border-gray-300 rounded text-xs" />
                                      <span className="text-xs text-gray-500">to</span>
                                      <input type="number" value={tier.maxQuantity} onChange={(e) => handleDeliveryTierChange(index, tierIdx, 'maxQuantity', e.target.value)} min="1" placeholder="Max" className="w-16 px-1.5 py-1 border border-gray-300 rounded text-xs" />
                                      <span className="text-xs text-gray-500">qty →</span>
                                      <input type="number" value={tier.charges} onChange={(e) => handleDeliveryTierChange(index, tierIdx, 'charges', e.target.value)} min="0" step="0.01" placeholder="Charges" className="flex-1 px-1.5 py-1 border border-gray-300 rounded text-xs" />
                                      <span className="text-xs text-gray-500">Rs.</span>
                                      {commission.deliveryCharges.length > 1 && (
                                        <button type="button" onClick={() => removeDeliveryTier(index, tierIdx)} className="text-red-500 hover:text-red-700">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (<p className="text-xs text-gray-400 italic">No delivery charges configured</p>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-1">
                  <button type="button" onClick={handleCancelUpdate} disabled={updateLoading}
                    className="py-2 px-3 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-medium disabled:opacity-50 w-full sm:flex-1">Cancel</button>
                  <button type="submit" disabled={updateLoading || !hasChanges()}
                    className={`py-2 px-3 rounded-md text-white text-xs font-medium transition w-full sm:flex-1 ${
                      updateLoading || !hasChanges() ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                    }`}>{updateLoading ? 'Updating...' : 'Update Employee'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeUpdate;
