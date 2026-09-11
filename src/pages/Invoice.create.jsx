// InvoiceCreate.jsx - Advanced Component (High Speed & High Accuracy)
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const InvoiceCreate = () => {
  const [employees, setEmployees] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [lastInvoice, setLastInvoice] = useState(null);
  const [showLastInvoice, setShowLastInvoice] = useState(false);

  // Refs for fast keyboard navigation
  const customerNameRef = useRef(null);
  const customerMobile1Ref = useRef(null);
  const addProductBtnRef = useRef(null);

  const [formData, setFormData] = useState({
    employeeCategory: '',
    employeeName: '',
    employeeAddress: '',
    employeeMobileNumber: '',
    customerName: '',
    customerMobileNumber1: '',
    customerMobileNumber2: '',
    customerAddress: '',
    products: [],
    deliveryCharges: 0
  });

  // ===== Fetch Data =====
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
      setError('Failed to load employees. Please try again later.');
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

  // ===== MEMOIZED LOOKUPS (High Speed) =====
  // Unique product names - memoized
  const uniqueProductNames = useMemo(() => {
    const names = stocks.map(stock => stock.productName);
    return [...new Set(names)].filter(Boolean).sort();
  }, [stocks]);

  // Product name -> categories map - memoized (O(1) lookup)
  const categoriesMap = useMemo(() => {
    const map = {};
    stocks.forEach(stock => {
      if (!stock.productName || !stock.productCategory) return;
      if (!map[stock.productName]) map[stock.productName] = new Set();
      map[stock.productName].add(stock.productCategory);
    });
    const result = {};
    Object.keys(map).forEach(key => {
      result[key] = [...map[key]].filter(Boolean).sort();
    });
    return result;
  }, [stocks]);

  // (productName + category) -> colors array map - memoized (O(1) lookup)
  const colorsMap = useMemo(() => {
    const map = {};
    stocks.forEach(stock => {
      if (!stock.productName || !stock.productCategory) return;
      const key = `${stock.productName}|||${stock.productCategory}`;
      if (!map[key]) map[key] = [];
      map[key].push(stock);
    });
    return map;
  }, [stocks]);

  // (productName + category + color) -> stock item map - memoized (O(1) lookup)
  const stockItemMap = useMemo(() => {
    const map = {};
    stocks.forEach(stock => {
      const key = `${stock.productName}|||${stock.productCategory}|||${stock.productColor}`;
      map[key] = stock;
    });
    return map;
  }, [stocks]);

  // Filtered employees based on search - memoized
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase().trim();
    return employees.filter(emp =>
      (emp.employeeName || '').toLowerCase().includes(q) ||
      (emp.employeeCategory || '').toLowerCase().includes(q) ||
      (emp.employeeMobileNumber || '').toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  // ===== FAST LOOKUP HELPERS =====
  const getCategoriesForProduct = useCallback((productName) => {
    if (!productName) return [];
    return categoriesMap[productName] || [];
  }, [categoriesMap]);

  const getColorsForProduct = useCallback((productName, productCategory) => {
    if (!productName || !productCategory) return [];
    const key = `${productName}|||${productCategory}`;
    return colorsMap[key] || [];
  }, [colorsMap]);

  const getStockItem = useCallback((productName, productCategory, productColor) => {
    const key = `${productName}|||${productCategory}|||${productColor}`;
    return stockItemMap[key];
  }, [stockItemMap]);

  // ===== EMPLOYEE SELECTION =====
  const handleSelectEmployee = useCallback((employee) => {
    setSelectedEmployee(employee);
    setFormData(prev => ({
      ...prev,
      employeeCategory: employee.employeeCategory || '',
      employeeName: employee.employeeName || '',
      employeeAddress: employee.employeeAddress || '',
      employeeMobileNumber: employee.employeeMobileNumber || ''
    }));
    setError(null);
    // Focus customer name for fast flow
    setTimeout(() => customerNameRef.current?.focus(), 50);
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value ?? ''
    }));
  }, []);

  // ===== PRODUCT MANAGEMENT =====
  const addProduct = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      products: [
        ...prev.products,
        {
          productName: '',
          productCategory: '',
          productColor: '',
          productSalePrice: '',
          productQuantity: 1,
          productTotalAmount: 0
        }
      ]
    }));
  }, []);

  const removeProduct = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  }, []);

  const duplicateProduct = useCallback((index) => {
    setFormData(prev => {
      const productToCopy = prev.products[index];
      if (!productToCopy) return prev;
      const newProducts = [...prev.products];
      newProducts.splice(index + 1, 0, { ...productToCopy });
      return { ...prev, products: newProducts };
    });
  }, []);

  const handleProductChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const updatedProducts = [...prev.products];
      const safeValue = value ?? '';

      if (field === 'productName') {
        updatedProducts[index] = {
          ...updatedProducts[index],
          productName: safeValue,
          productCategory: '',
          productColor: '',
          productSalePrice: '',
          productQuantity: 1,
          productTotalAmount: 0
        };
      } else if (field === 'productCategory') {
        updatedProducts[index] = {
          ...updatedProducts[index],
          productCategory: safeValue,
          productColor: '',
          productSalePrice: '',
          productQuantity: 1,
          productTotalAmount: 0
        };
      } else if (field === 'productColor') {
        const selectedStock = getStockItem(
          updatedProducts[index].productName,
          updatedProducts[index].productCategory,
          safeValue
        );
        const price = selectedStock ? (selectedStock.productPurchasePrice || '') : (updatedProducts[index].productSalePrice || '');
        const qty = parseInt(updatedProducts[index].productQuantity) || 1;
        updatedProducts[index] = {
          ...updatedProducts[index],
          productColor: safeValue,
          productSalePrice: price,
          productTotalAmount: (parseFloat(price) || 0) * qty
        };
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
      } else {
        updatedProducts[index] = {
          ...updatedProducts[index],
          [field]: safeValue
        };
      }

      return { ...prev, products: updatedProducts };
    });
  }, [getStockItem]);

  // ===== TOTALS =====
  const grandTotal = useMemo(() => {
    const productsTotal = formData.products.reduce(
      (sum, product) => sum + (parseFloat(product.productTotalAmount) || 0), 0
    );
    return productsTotal + (parseFloat(formData.deliveryCharges) || 0);
  }, [formData.products, formData.deliveryCharges]);

  const productsSubtotal = useMemo(() => {
    return formData.products.reduce(
      (sum, product) => sum + (parseFloat(product.productTotalAmount) || 0), 0
    );
  }, [formData.products]);

  const totalItems = useMemo(() => {
    return formData.products.reduce(
      (sum, p) => sum + (parseInt(p.productQuantity) || 0), 0
    );
  }, [formData.products]);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }, []);

  // ===== SUBMIT =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!selectedEmployee) {
        setError('Please select an employee from the list');
        setLoading(false);
        return;
      }
      if (formData.products.length === 0) {
        setError('Please add at least one product to the invoice');
        setLoading(false);
        return;
      }

      const hasInvalidProduct = formData.products.some(
        product => !product.productName || !product.productCategory ||
          !product.productColor || !product.productQuantity ||
          product.productQuantity < 1 ||
          !product.productSalePrice ||
          parseFloat(product.productSalePrice) <= 0
      );

      if (hasInvalidProduct) {
        setError('Please fill all product fields with valid values (Name, Category, Color, Price, and Quantity)');
        setLoading(false);
        return;
      }

      const formattedProducts = formData.products.map(product => ({
        productName: product.productName,
        productCategory: product.productCategory,
        productColor: product.productColor,
        productSalePrice: parseFloat(product.productSalePrice),
        productQuantity: parseInt(product.productQuantity),
        productTotalAmount: parseFloat(product.productSalePrice) * parseInt(product.productQuantity)
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
        products: formattedProducts,
        deliveryCharges: parseFloat(formData.deliveryCharges) || 0,
        grandTotalAmount: grandTotal
      };

      const response = await axios.post(`${API_BASE_URL}/invoice`, invoiceData);

      // Save last invoice for quick view
      setLastInvoice({
        ...invoiceData,
        createdAt: new Date().toISOString(),
        invoiceId: response.data?.data?._id || response.data?.invoice?._id || null
      });
      setShowLastInvoice(true);

      setSuccess(response.data.message || 'Invoice created successfully!');

      // Reset form but keep employee selected for fast repeated invoices
      setFormData(prev => ({
        employeeCategory: prev.employeeCategory,
        employeeName: prev.employeeName,
        employeeAddress: prev.employeeAddress,
        employeeMobileNumber: prev.employeeMobileNumber,
        customerName: '',
        customerMobileNumber1: '',
        customerMobileNumber2: '',
        customerAddress: '',
        products: [],
        deliveryCharges: 0
      }));

      // Refocus customer name for next invoice
      setTimeout(() => customerNameRef.current?.focus(), 100);

      // Auto-hide success after 4s
      setTimeout(() => setSuccess(null), 4000);
    } catch (error) {
      console.error('Error creating invoice:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to create invoice. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleReset = () => {
    setFormData({
      employeeCategory: '',
      employeeName: '',
      employeeAddress: '',
      employeeMobileNumber: '',
      customerName: '',
      customerMobileNumber1: '',
      customerMobileNumber2: '',
      customerAddress: '',
      products: [],
      deliveryCharges: 0
    });
    setSelectedEmployee(null);
    setError(null);
    setSuccess(null);
  };

  // ===== KEYBOARD SHORTCUTS (High Speed) =====
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter = Submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.querySelector('form')?.requestSubmit();
      }
      // Ctrl/Cmd + K = Add product
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        addProduct();
      }
      // Ctrl/Cmd + Shift + R = Reset form
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addProduct]);

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">CREATE INVOICE</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="hidden sm:inline">Shortcuts:</span>
            <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">Ctrl+Enter</kbd>
            <span>Submit</span>
            <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">Ctrl+K</kbd>
            <span>Add</span>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 p-3 rounded flex justify-between items-center">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={clearMessages} className="text-red-400 hover:text-red-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="mb-3 bg-green-50 border border-green-200 p-3 rounded flex justify-between items-center">
            <p className="text-sm text-green-700">{success}</p>
            <button onClick={clearMessages} className="text-green-400 hover:text-green-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Last Invoice Summary */}
        {showLastInvoice && lastInvoice && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-3 flex justify-between items-center">
            <div className="text-xs text-blue-800">
              <span className="font-semibold">Last Invoice:</span> {lastInvoice.customerName} — {lastInvoice.products.length} item(s) — {formatCurrency(lastInvoice.grandTotalAmount)}
            </div>
            <button onClick={() => setShowLastInvoice(false)} className="text-blue-400 hover:text-blue-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Employee Selection Panel */}
        <div className="mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">Select Employee</h2>
              <input
                type="text"
                placeholder="Search employee..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="px-2 py-1 text-xs rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white w-40 sm:w-56"
              />
            </div>

            <div className="p-3">
              {fetchLoading ? (
                <div className="flex justify-center items-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500">No employees available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {filteredEmployees.map((employee) => (
                    <button
                      key={employee._id}
                      type="button"
                      onClick={() => handleSelectEmployee(employee)}
                      className={`text-left p-2 rounded transition duration-200 text-sm ${
                        selectedEmployee?._id === employee._id
                          ? 'bg-blue-50 border border-blue-300 ring-1 ring-blue-400'
                          : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                          selectedEmployee?._id === employee._id
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            : 'bg-gradient-to-r from-gray-400 to-gray-500'
                        }`}>
                          <span className="text-white font-medium text-xs">
                            {(employee.employeeName || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {employee.employeeName}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {employee.employeeCategory}
                          </p>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white">Invoice Details</h2>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-white/80 hover:text-white underline"
            >
              Reset Form
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Employee Information (Auto-filled) */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Employee Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Employee Name</label>
                  <input type="text" value={formData.employeeName || ''} readOnly
                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <input type="text" value={formData.employeeCategory || ''} readOnly
                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number</label>
                  <input type="text" value={formData.employeeMobileNumber || ''} readOnly
                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                  <input type="text" value={formData.employeeAddress || ''} readOnly
                    className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Customer Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="customerName" className="block text-xs font-medium text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={customerNameRef}
                    type="text" id="customerName" name="customerName"
                    value={formData.customerName || ''}
                    onChange={handleInputChange} required placeholder="Enter customer name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        customerMobile1Ref.current?.focus();
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <label htmlFor="customerMobileNumber1" className="block text-xs font-medium text-gray-700 mb-1">
                    Mobile Number 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={customerMobile1Ref}
                    type="tel" id="customerMobileNumber1" name="customerMobileNumber1"
                    value={formData.customerMobileNumber1 || ''}
                    onChange={handleInputChange} required placeholder="Primary mobile number"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addProductBtnRef.current?.focus();
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <label htmlFor="customerMobileNumber2" className="block text-xs font-medium text-gray-700 mb-1">
                    Mobile Number 2
                  </label>
                  <input type="tel" id="customerMobileNumber2" name="customerMobileNumber2"
                    value={formData.customerMobileNumber2 || ''}
                    onChange={handleInputChange} placeholder="Secondary mobile number"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <label htmlFor="customerAddress" className="block text-xs font-medium text-gray-700 mb-1">
                    Customer Address <span className="text-red-500">*</span>
                  </label>
                  <textarea id="customerAddress" name="customerAddress"
                    value={formData.customerAddress || ''}
                    onChange={handleInputChange} required rows="1" placeholder="Enter customer address"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400 resize-none" />
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="border-t border-gray-200 pt-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                <h3 className="text-sm font-medium text-gray-900 flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Products
                  {totalItems > 0 && (
                    <span className="ml-2 text-[10px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium">
                      {totalItems} item{totalItems > 1 ? 's' : ''}
                    </span>
                  )}
                </h3>
                <button
                  ref={addProductBtnRef}
                  type="button" onClick={addProduct}
                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 text-xs font-medium w-full sm:w-auto justify-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              </div>

              {formData.products.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300">
                  <p className="text-xs text-gray-500">No products added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Add Product" to add items</p>
                </div>
              )}

              <div className="space-y-2">
                {formData.products.map((product, index) => {
                  const categories = getCategoriesForProduct(product.productName);
                  const colorStocks = getColorsForProduct(product.productName, product.productCategory);
                  const selectedStock = getStockItem(product.productName, product.productCategory, product.productColor);

                  return (
                    <div key={index} className="bg-gray-50 rounded border border-gray-200 p-2.5">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border">
                            #{index + 1}
                          </span>
                          {product.productName && (
                            <span className="text-[10px] text-gray-500 truncate max-w-[200px]">
                              {product.productName}
                              {product.productCategory && ` › ${product.productCategory}`}
                              {product.productColor && ` › ${product.productColor}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => duplicateProduct(index)}
                            title="Duplicate product"
                            className="text-blue-600 hover:text-blue-800 transition duration-200 p-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button type="button" onClick={() => removeProduct(index)}
                            className="text-red-600 hover:text-red-800 transition duration-200 p-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {/* Product Name */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-medium text-gray-700 mb-1">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={product.productName || ''}
                            onChange={(e) => handleProductChange(index, 'productName', e.target.value)}
                            required
                            className="w-full px-1.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900"
                          >
                            <option value="">Select</option>
                            {uniqueProductNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Category */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-medium text-gray-700 mb-1">
                            Category <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={product.productCategory || ''}
                            onChange={(e) => handleProductChange(index, 'productCategory', e.target.value)}
                            required
                            disabled={!product.productName}
                            className="w-full px-1.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">{product.productName ? 'Select' : '—'}</option>
                            {categories.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>

                        {/* Color */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-medium text-gray-700 mb-1">
                            Color <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={product.productColor || ''}
                            onChange={(e) => handleProductChange(index, 'productColor', e.target.value)}
                            required
                            disabled={!product.productCategory}
                            className="w-full px-1.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">{product.productCategory ? 'Select' : '—'}</option>
                            {colorStocks.map((stock) => (
                              <option key={stock._id} value={stock.productColor}>
                                {stock.productColor} {stock.productQuantity > 0 ? `(${stock.productQuantity})` : '(Out)'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Sale Price */}
                        <div className="col-span-1">
                          <label className="block text-[10px] font-medium text-gray-700 mb-1">
                            Price <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={product.productSalePrice || ''}
                            onChange={(e) => handleProductChange(index, 'productSalePrice', e.target.value)}
                            required
                            min="0"
                            className="w-full px-1.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="col-span-1">
                          <label className="block text-[10px] font-medium text-gray-700 mb-1">
                            Qty <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={product.productQuantity || 1}
                            onChange={(e) => handleProductChange(index, 'productQuantity', e.target.value)}
                            required
                            min="1"
                            className="w-full px-1.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400"
                          />
                        </div>

                        {/* Total */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-medium text-gray-700 mb-1">
                            Total
                          </label>
                          <input
                            type="text"
                            value={formatCurrency(product.productTotalAmount || 0)}
                            readOnly
                            className="w-full px-1.5 py-1.5 bg-gray-100 border border-gray-300 rounded text-gray-700 text-xs font-medium"
                          />
                        </div>
                      </div>

                      {/* Stock Status Line */}
                      {selectedStock && (
                        <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded-full ${
                            selectedStock.productQuantity === 0
                              ? 'bg-red-100 text-red-700'
                              : selectedStock.productQuantity <= 10
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                          }`}>
                            Stock: {selectedStock.productQuantity}
                          </span>
                          {parseInt(product.productQuantity) > selectedStock.productQuantity && (
                            <span className="text-red-600 font-medium">
                              ⚠ Exceeds available stock!
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery Charges and Grand Total */}
            <div className="border-t border-gray-200 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="deliveryCharges" className="block text-xs font-medium text-gray-700 mb-1">
                    Delivery Charges
                  </label>
                  <input
                    type="number" id="deliveryCharges" name="deliveryCharges"
                    value={formData.deliveryCharges || 0} onChange={handleInputChange}
                    min="0"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400" />
                </div>
                <div className="flex items-end">
                  <div className="w-full bg-white rounded border border-gray-200 p-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(productsSubtotal)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-end">
                  <div className="w-full bg-gradient-to-r from-blue-50 to-cyan-50 rounded border border-blue-200 p-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-700">Grand Total:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button type="submit" disabled={loading}
                className={`w-full py-2.5 px-4 rounded text-white font-medium text-sm transition duration-200 ${
                  loading ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}>
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Invoice...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Create Invoice
                    <span className="ml-2 text-[10px] opacity-75 hidden sm:inline">(Ctrl+Enter)</span>
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreate;
