// InvoiceCreate.jsx - Auto-fills per-category sale price, delivery method & charges from employee
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const InvoiceCreate = () => {
  const [employees, setEmployees] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employeeCategory: '',
    employeeName: '',
    employeeAddress: '',
    employeeMobileNumber: '',
    customerName: '',
    customerMobileNumber1: '',
    customerMobileNumber2: '',
    customerAddress: '',
    deliveredThrough: '',
    products: [],
    deliveryCharges: 0
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

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setFormData(prev => ({
      ...prev,
      employeeCategory: employee.employeeCategory || '',
      employeeName: employee.employeeName || '',
      employeeAddress: employee.employeeAddress || '',
      employeeMobileNumber: employee.employeeMobileNumber || ''
    }));
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || '' }));
  };

  const addProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, {
        productName: '', productCategory: '', productColor: '',
        productSalePrice: '', productQuantity: 1, productTotalAmount: 0
      }]
    }));
  };

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const getUniqueProductNames = () => {
    const names = stocks.map(stock => stock.productName);
    return [...new Set(names)].filter(Boolean);
  };

  const getCategoriesForProduct = (productName) => {
    if (!productName) return [];
    return [...new Set(stocks.filter(s => s.productName === productName).map(s => s.productCategory))].filter(Boolean);
  };

  const getColorsForProduct = (productName, productCategory) => {
    if (!productName || !productCategory) return [];
    return stocks.filter(s => s.productName === productName && s.productCategory === productCategory);
  };

  const getEmployeeCommissionRecord = (productName) => {
    if (!selectedEmployee?.employeeCommission) return null;
    return selectedEmployee.employeeCommission.find(c => c.productName === productName);
  };

  // ✅ NEW: Lookup per-category price from employee
  const getEmployeeCategoryPrice = (productName, productCategory) => {
    const record = getEmployeeCommissionRecord(productName);
    if (!record?.categoryPrices) return null;
    const cp = record.categoryPrices.find(c => c.productCategory === productCategory);
    return cp?.productSalePrice ?? null;
  };

  const getAutoDeliveryCharges = (productName, quantity) => {
    const record = getEmployeeCommissionRecord(productName);
    if (!record?.deliveryCharges?.length) return null;
    const qty = parseInt(quantity) || 0;
    const tier = record.deliveryCharges.find(t => qty >= t.minQuantity && qty <= t.maxQuantity);
    if (tier) return tier.charges;
    return record.deliveryCharges[record.deliveryCharges.length - 1]?.charges ?? null;
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    const safeValue = value ?? '';

    if (field === 'productName') {
      updatedProducts[index] = {
        ...updatedProducts[index],
        productName: safeValue || '',
        productCategory: '',
        productColor: '',
        productSalePrice: '',
        productQuantity: 1,
        productTotalAmount: 0
      };
    } else if (field === 'productCategory') {
      // ✅ NEW: When category changes, auto-fill the per-category price from employee
      const catPrice = getEmployeeCategoryPrice(updatedProducts[index].productName, safeValue);
      updatedProducts[index] = {
        ...updatedProducts[index],
        productCategory: safeValue || '',
        productColor: '',
        productSalePrice: catPrice !== null ? String(catPrice) : '',
        productTotalAmount: catPrice !== null ? (catPrice * (parseInt(updatedProducts[index].productQuantity) || 1)) : 0
      };

      // Auto-fill delivery method from employee's product-level config
      const empRec = getEmployeeCommissionRecord(updatedProducts[index].productName);
      if (empRec?.deliveryMethod && !formData.deliveredThrough) {
        setFormData(prev => ({ ...prev, deliveredThrough: empRec.deliveryMethod }));
      }
    } else if (field === 'productColor') {
      updatedProducts[index] = { ...updatedProducts[index], productColor: safeValue || '' };
    } else if (field === 'productSalePrice') {
      const numValue = parseFloat(safeValue) || 0;
      updatedProducts[index] = {
        ...updatedProducts[index],
        productSalePrice: safeValue,
        productTotalAmount: numValue * (parseInt(updatedProducts[index].productQuantity) || 0)
      };
    } else if (field === 'productQuantity') {
      const numValue = parseInt(safeValue) || 0;
      updatedProducts[index] = {
        ...updatedProducts[index],
        productQuantity: safeValue,
        productTotalAmount: (parseFloat(updatedProducts[index].productSalePrice) || 0) * numValue
      };
    }

    // Recalculate auto delivery charges
    const autoCharges = updatedProducts.reduce((sum, p) => {
      const charges = getAutoDeliveryCharges(p.productName, p.productQuantity);
      return sum + (charges || 0);
    }, 0);

    setFormData(prev => ({
      ...prev,
      products: updatedProducts,
      deliveryCharges: autoCharges > 0 ? autoCharges : prev.deliveryCharges
    }));
  };

  const calculateGrandTotal = () => {
    const productsTotal = formData.products.reduce((sum, p) => sum + (parseFloat(p.productTotalAmount) || 0), 0);
    return productsTotal + (parseFloat(formData.deliveryCharges) || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!selectedEmployee) { setError('Please select an employee'); setLoading(false); return; }
      if (formData.products.length === 0) { setError('Please add at least one product'); setLoading(false); return; }

      const hasInvalidProduct = formData.products.some(
        p => !p.productName || !p.productCategory || !p.productColor ||
             !p.productQuantity || p.productQuantity < 1 ||
             !p.productSalePrice || parseFloat(p.productSalePrice) <= 0
      );
      if (hasInvalidProduct) {
        setError('Please fill all product fields (Name, Category, Color, Price, Quantity)');
        setLoading(false);
        return;
      }

      const formattedProducts = formData.products.map(p => ({
        productName: p.productName,
        productCategory: p.productCategory,
        productColor: p.productColor,
        productSalePrice: parseFloat(p.productSalePrice),
        productQuantity: parseInt(p.productQuantity),
        productTotalAmount: parseFloat(p.productSalePrice) * parseInt(p.productQuantity)
      }));

      const invoiceData = {
        employeeCategory: formData.employeeCategory,
        employeeName: formData.employeeName,
        employeeAddress: formData.employeeAddress,
        employeeMobileNumber: formData.employeeMobileNumber,
        customerName: formData.customerName,
        customerMobileNumber1: formData.customerMobileNumber1,
        customerMobileNumber2: formData.customerMobileNumber2 || '',
        customerAddress: formData.customerAddress,
        deliveredThrough: formData.deliveredThrough || '',
        products: formattedProducts,
        deliveryCharges: parseFloat(formData.deliveryCharges) || 0,
        grandTotalAmount: calculateGrandTotal()
      };

      const response = await axios.post(`${API_BASE_URL}/invoice`, invoiceData);
      setSuccess(response.data.message || 'Invoice created successfully!');

      setFormData({
        employeeCategory: '', employeeName: '', employeeAddress: '', employeeMobileNumber: '',
        customerName: '', customerMobileNumber1: '', customerMobileNumber2: '', customerAddress: '',
        deliveredThrough: '', products: [], deliveryCharges: 0
      });
      setSelectedEmployee(null);
    } catch (error) {
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to create invoice.');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(amount || 0);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-900">CREATE INVOICE</h1>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded flex justify-between items-center">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={clearMessages} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 p-3 rounded flex justify-between items-center">
            <p className="text-sm text-green-700">{success}</p>
            <button onClick={clearMessages} className="text-green-400 hover:text-green-600">✕</button>
          </div>
        )}

        {/* Employee Selection */}
        <div className="mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Select Employee</h2>
            </div>
            <div className="p-3">
              {fetchLoading ? (
                <div className="flex justify-center items-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
              ) : employees.length === 0 ? (
                <div className="text-center py-6"><p className="text-xs text-gray-500">No employees available</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 justify-center">
                  {employees.map((employee) => (
                    <button key={employee._id} onClick={() => handleSelectEmployee(employee)}
                      className={`text-left p-2 rounded transition duration-200 text-sm ${
                        selectedEmployee?._id === employee._id ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                      }`}>
                      <div className="flex items-center space-x-2">
                        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          selectedEmployee?._id === employee._id ? 'bg-linear-to-r from-blue-500 to-cyan-500' : 'bg-linear-to-r from-gray-400 to-gray-500'
                        }`}>
                          <span className="text-white font-medium text-xs">{employee.employeeName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{employee.employeeName}</p>
                          <p className="text-xs text-gray-500 truncate">{employee.employeeCategory}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Form */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Invoice Details</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Employee Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Employee Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Employee Name</label>
                    <input type="text" value={formData.employeeName} readOnly className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                    <input type="text" value={formData.employeeCategory} readOnly className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number</label>
                    <input type="text" value={formData.employeeMobileNumber} readOnly className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                    <input type="text" value={formData.employeeAddress} readOnly className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name *</label>
                    <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} required placeholder="Enter customer name"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number 1 *</label>
                    <input type="tel" name="customerMobileNumber1" value={formData.customerMobileNumber1} onChange={handleInputChange} required placeholder="Primary mobile"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number 2</label>
                    <input type="tel" name="customerMobileNumber2" value={formData.customerMobileNumber2} onChange={handleInputChange} placeholder="Secondary mobile"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Delivered Through</label>
                    <select name="deliveredThrough" value={formData.deliveredThrough} onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900">
                      <option value="">Select delivery method</option>
                      <option value="TCS">TCS</option>
                      <option value="M&P">M&P</option>
                      <option value="P/O">P/O</option>
                      <option value="By Hand">By Hand</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Customer Address *</label>
                    <textarea name="customerAddress" value={formData.customerAddress} onChange={handleInputChange} required rows="2" placeholder="Enter customer address"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none" />
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                  <h3 className="text-sm font-medium text-gray-900">Products</h3>
                  <button type="button" onClick={addProduct}
                    className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium w-full sm:w-auto justify-center">
                    + Add Product
                  </button>
                </div>

                {formData.products.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500">No products added yet</p>
                  </div>
                )}

                <div className="space-y-3">
                  {formData.products.map((product, index) => {
                    const categories = getCategoriesForProduct(product.productName);
                    const colorStocks = getColorsForProduct(product.productName, product.productCategory);
                    const autoCharges = getAutoDeliveryCharges(product.productName, product.productQuantity);
                    const empCatPrice = getEmployeeCategoryPrice(product.productName, product.productCategory);

                    return (
                      <div key={index} className="bg-gray-50 rounded border border-gray-200 p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-700">Product #{index + 1}</span>
                          <button type="button" onClick={() => removeProduct(index)} className="text-red-600 hover:text-red-800">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
                            <select value={product.productName} onChange={(e) => handleProductChange(index, 'productName', e.target.value)} required
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900">
                              <option value="">Select product</option>
                              {getUniqueProductNames().map((name) => (<option key={name} value={name}>{name}</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                            <select value={product.productCategory} onChange={(e) => handleProductChange(index, 'productCategory', e.target.value)} required disabled={!product.productName}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100">
                              <option value="">{product.productName ? 'Select category' : 'Select product first'}</option>
                              {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Color *</label>
                            <select value={product.productColor} onChange={(e) => handleProductChange(index, 'productColor', e.target.value)} required disabled={!product.productCategory}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100">
                              <option value="">{product.productCategory ? 'Select color' : 'Select category first'}</option>
                              {colorStocks.map((s) => (<option key={s._id} value={s.productColor}>{s.productColor} ({s.productQuantity})</option>))}
                            </select>
                          </div>
                          {/* ✅ Sale Price — auto-filled from employee per-category price, editable */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Sale Price (PKR) *</label>
                            <input type="number" value={product.productSalePrice} onChange={(e) => handleProductChange(index, 'productSalePrice', e.target.value)} required min="0" step="0.01"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900" />
                            {empCatPrice !== null && (
                              <p className="mt-0.5 text-[10px] text-blue-600">
                                Employee default ({product.productCategory}): {formatCurrency(empCatPrice)}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                            <input type="number" value={product.productQuantity} onChange={(e) => handleProductChange(index, 'productQuantity', e.target.value)} required min="1"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900" />
                            {autoCharges !== null && (
                              <p className="mt-0.5 text-[10px] text-green-600">Auto delivery: {formatCurrency(autoCharges)}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Total Amount</label>
                            <input type="text" value={formatCurrency(product.productTotalAmount)} readOnly
                              className="w-full px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-gray-700 text-xs font-medium" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Charges & Grand Total */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Charges (PKR)</label>
                    <input type="number" name="deliveryCharges" value={formData.deliveryCharges} onChange={handleInputChange} min="0" step="0.01"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-900" />
                    <p className="mt-0.5 text-[10px] text-gray-500">Auto-calculated from employee data; edit to override</p>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full bg-linear-to-r from-blue-50 to-cyan-50 rounded border border-blue-200 p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">Grand Total:</span>
                        <span className="text-lg font-bold text-blue-600">{formatCurrency(calculateGrandTotal())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loading}
                  className={`w-full py-2 px-4 rounded text-white font-medium text-sm transition duration-200 ${
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                  }`}>
                  {loading ? 'Creating Invoice...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreate;
