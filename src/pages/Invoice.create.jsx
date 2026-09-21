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
  const customerMobile2Ref = useRef(null);
  const customerAddressRef = useRef(null);
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
  const uniqueProductNames = useMemo(() => {
    const names = stocks.map(stock => stock.productName);
    return [...new Set(names)].filter(Boolean).sort();
  }, [stocks]);

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

  const stockItemMap = useMemo(() => {
    const map = {};
    stocks.forEach(stock => {
      const key = `${stock.productName}|||${stock.productCategory}|||${stock.productColor}`;
      map[key] = stock;
    });
    return map;
  }, [stocks]);

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
          productQuantity: '',
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
          productQuantity: '',
          productTotalAmount: 0
        };
      } else if (field === 'productCategory') {
        updatedProducts[index] = {
          ...updatedProducts[index],
          productCategory: safeValue,
          productColor: '',
          productSalePrice: '',
          productQuantity: '',
          productTotalAmount: 0
        };
      } else if (field === 'productColor') {
        updatedProducts[index] = {
          ...updatedProducts[index],
          productColor: safeValue,
          productSalePrice: '',
          productQuantity: '',
          productTotalAmount: 0
        };
      } else if (field === 'productSalePrice') {
        const numValue = parseFloat(safeValue) || 0;
        const qty = parseInt(updatedProducts[index].productQuantity) || 0;
        updatedProducts[index] = {
          ...updatedProducts[index],
          productSalePrice: safeValue,
          productTotalAmount: numValue * qty
        };
      } else if (field === 'productQuantity') {
        const numValue = parseInt(safeValue) || 0;
        const price = parseFloat(updatedProducts[index].productSalePrice) || 0;
        updatedProducts[index] = {
          ...updatedProducts[index],
          productQuantity: safeValue,
          productTotalAmount: price * numValue
        };
      } else {
        updatedProducts[index] = {
          ...updatedProducts[index],
          [field]: safeValue
        };
      }

      return { ...prev, products: updatedProducts };
    });
  }, []);

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

      setLastInvoice({
        ...invoiceData,
        createdAt: new Date().toISOString(),
        invoiceId: response.data?.data?._id || response.data?.invoice?._id || null
      });
      setShowLastInvoice(true);

      setSuccess(response.data.message || 'Invoice created successfully!');

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

      setTimeout(() => customerNameRef.current?.focus(), 100);
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

  // ===== KEYBOARD SHORTCUTS =====
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Enter = Submit (only when not in textarea and not in a product input)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const target = e.target;
        const isTextarea = target.tagName === 'TEXTAREA';
        const isProductInput = target.closest('[data-product-input]');
        
        if (!isTextarea && !isProductInput) {
          e.preventDefault();
          document.querySelector('form')?.requestSubmit();
        }
      }
      // Ctrl+A = Add product (prevent select all)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        addProduct();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addProduct]);

  // ===== CUSTOMER TAB CYCLE =====
  const handleCustomerTab = useCallback((e, currentField) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const fields = ['customerName', 'customerMobile1', 'customerMobile2', 'customerAddress'];
      const currentIndex = fields.indexOf(currentField);
      const nextIndex = (currentIndex + 1) % fields.length;
      
      const refs = {
        customerName: customerNameRef,
        customerMobile1: customerMobile1Ref,
        customerMobile2: customerMobile2Ref,
        customerAddress: customerAddressRef
      };
      
      const nextRef = refs[fields[nextIndex]];
      if (nextRef?.current) {
        nextRef.current.focus();
      }
    }
  }, []);

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 py-4 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Sticky Employee Header */}
        {selectedEmployee && (
          <div className="sticky top-0 z-50 mb-4 animate-slide-down">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-lg shadow-lg px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white font-bold text-sm">
                    {(selectedEmployee.employeeName || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-white/70 font-medium">Selected Employee</p>
                  <p className="text-sm font-bold text-white">{selectedEmployee.employeeName}</p>
                </div>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-medium backdrop-blur-sm">
                  {selectedEmployee.employeeCategory}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {lastInvoice && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                    <span className="text-[10px] text-white/70">Last Customer:</span>
                    <span className="text-xs font-semibold text-white">{lastInvoice.customerName}</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedEmployee(null);
                    setFormData(prev => ({
                      ...prev,
                      employeeCategory: '',
                      employeeName: '',
                      employeeAddress: '',
                      employeeMobileNumber: ''
                    }));
                  }}
                  className="text-white/60 hover:text-white transition-colors p-1"
                  title="Change employee"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            CREATE INVOICE
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[9px] shadow-sm">Enter</kbd>
              <span>Submit</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[9px] shadow-sm">Ctrl+A</kbd>
              <span>Add Product</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[9px] shadow-sm">Tab</kbd>
              <span>Navigate Customer Fields</span>
            </span>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 p-3 rounded-lg flex justify-between items-center shadow-sm animate-slide-down">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={clearMessages} className="text-red-400 hover:text-red-600 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="mb-3 bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex justify-between items-center shadow-sm animate-slide-down">
            <p className="text-sm text-emerald-700">{success}</p>
            <button onClick={clearMessages} className="text-emerald-400 hover:text-emerald-600 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Last Invoice Summary */}
        {showLastInvoice && lastInvoice && (
          <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3 flex justify-between items-center shadow-sm animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-indigo-600 font-medium">Last Invoice Created</p>
                <p className="text-sm font-bold text-indigo-900">{lastInvoice.customerName}</p>
              </div>
              <span className="text-[10px] text-indigo-500 bg-white/60 px-2 py-0.5 rounded-full">
                {lastInvoice.products.length} item(s)
              </span>
              <span className="text-sm font-bold text-indigo-700">
                {formatCurrency(lastInvoice.grandTotalAmount)}
              </span>
            </div>
            <button onClick={() => setShowLastInvoice(false)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Employee Selection Panel */}
        {!selectedEmployee && (
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-4 py-2.5 flex justify-between items-center">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Select Employee
                </h2>
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg text-gray-900 placeholder-gray-300 bg-white/20 backdrop-blur-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 w-40 sm:w-56 transition-all"
                />
              </div>

              <div className="p-4">
                {fetchLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">No employees available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {filteredEmployees.map((employee) => (
                      <button
                        key={employee._id}
                        type="button"
                        onClick={() => handleSelectEmployee(employee)}
                        className={`group text-center p-3 rounded-xl transition-all duration-200 ${
                          selectedEmployee?._id === employee._id
                            ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-400 ring-2 ring-indigo-200 shadow-md'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                            selectedEmployee?._id === employee._id
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-md'
                              : 'bg-gradient-to-r from-gray-300 to-gray-400 group-hover:from-indigo-400 group-hover:to-purple-400'
                          }`}>
                            <span className="text-white font-bold text-sm">
                              {(employee.employeeName || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 w-full">
                            <p className="text-xs font-semibold text-gray-800 truncate text-center">
                              {employee.employeeName}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate text-center mt-0.5">
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
        )}

        {/* Invoice Form */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-4 py-2.5 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Invoice Details
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-white/70 hover:text-white underline transition-colors"
            >
              Reset Form
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            {/* Employee Information (Auto-filled) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="h-5 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></span>
                Employee Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1 uppercase tracking-wider">Employee Name</label>
                  <input type="text" value={formData.employeeName || ''} readOnly
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1 uppercase tracking-wider">Category</label>
                  <input type="text" value={formData.employeeCategory || ''} readOnly
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1 uppercase tracking-wider">Mobile Number</label>
                  <input type="text" value={formData.employeeMobileNumber || ''} readOnly
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1 uppercase tracking-wider">Address</label>
                  <input type="text" value={formData.employeeAddress || ''} readOnly
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs font-medium" />
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="h-5 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
                Customer Information
              </h3>
              <div className="space-y-3">
                {/* Row 1: Customer Name + Mobile 1 + Mobile 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="customerName" className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={customerNameRef}
                      type="text" id="customerName" name="customerName"
                      value={formData.customerName || ''}
                      onChange={handleInputChange} required placeholder="Enter customer name"
                      onKeyDown={(e) => handleCustomerTab(e, 'customerName')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-300 bg-white shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="customerMobileNumber1" className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                      Mobile Number 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={customerMobile1Ref}
                      type="tel" id="customerMobileNumber1" name="customerMobileNumber1"
                      value={formData.customerMobileNumber1 || ''}
                      onChange={handleInputChange} required placeholder="Primary mobile number"
                      onKeyDown={(e) => handleCustomerTab(e, 'customerMobile1')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-300 bg-white shadow-sm" />
                  </div>
                  <div>
                    <label htmlFor="customerMobileNumber2" className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                      Mobile Number 2
                    </label>
                    <input
                      ref={customerMobile2Ref}
                      type="tel" id="customerMobileNumber2" name="customerMobileNumber2"
                      value={formData.customerMobileNumber2 || ''}
                      onChange={handleInputChange} placeholder="Secondary mobile number"
                      onKeyDown={(e) => handleCustomerTab(e, 'customerMobile2')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-300 bg-white shadow-sm" />
                  </div>
                </div>
                {/* Row 2: Customer Address (Full Width) */}
                <div>
                  <label htmlFor="customerAddress" className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                    Customer Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    ref={customerAddressRef}
                    id="customerAddress" name="customerAddress"
                    value={formData.customerAddress || ''}
                    onChange={handleInputChange} required rows="2"
                    placeholder="Enter complete customer address"
                    onKeyDown={(e) => handleCustomerTab(e, 'customerAddress')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-300 bg-white shadow-sm resize-none" />
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span className="h-5 w-1 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></span>
                  Products
                  {totalItems > 0 && (
                    <span className="ml-2 text-[10px] bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">
                      {totalItems} item{totalItems > 1 ? 's' : ''}
                    </span>
                  )}
                </h3>
                <button
                  ref={addProductBtnRef}
                  type="button" onClick={addProduct}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 text-xs font-semibold shadow-sm w-full sm:w-auto justify-center">
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                  <span className="ml-2 text-[9px] opacity-70 hidden sm:inline">(Ctrl+A)</span>
                </button>
              </div>

              {formData.products.length === 0 && (
                <div className="text-center py-10 bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-xl border-2 border-dashed border-gray-200">
                  <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-sm text-gray-400 font-medium">No products added yet</p>
                  <p className="text-xs text-gray-300 mt-1">Click "Add Product" or press Ctrl+A to add items</p>
                </div>
              )}

              <div className="space-y-3">
                {formData.products.map((product, index) => {
                  const categories = getCategoriesForProduct(product.productName);
                  const colorStocks = getColorsForProduct(product.productName, product.productCategory);
                  const selectedStock = getStockItem(product.productName, product.productCategory, product.productColor);

                  return (
                    <div key={index} data-product-input className="bg-gradient-to-br from-gray-50 to-indigo-50/20 rounded-xl border border-gray-100 p-3 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                          {product.productName && (
                            <span className="text-[10px] text-gray-400 truncate max-w-[200px]">
                              {product.productName}
                              {product.productCategory && ` › ${product.productCategory}`}
                              {product.productColor && ` › ${product.productColor}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => duplicateProduct(index)}
                            title="Duplicate product"
                            className="text-indigo-500 hover:text-indigo-700 transition-colors p-1.5 hover:bg-indigo-50 rounded-lg">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button type="button" onClick={() => removeProduct(index)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {/* Product Name */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Product Name <span className="text-red-500">*</span></label>
                          <select
                            value={product.productName || ''}
                            onChange={(e) => handleProductChange(index, 'productName', e.target.value)}
                            required
                            className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white shadow-sm"
                          >
                            <option value="">Select</option>
                            {uniqueProductNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Category */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Category <span className="text-red-500">*</span></label>
                          <select
                            value={product.productCategory || ''}
                            onChange={(e) => handleProductChange(index, 'productCategory', e.target.value)}
                            required
                            disabled={!product.productName}
                            className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">{product.productName ? 'Select' : '—'}</option>
                            {categories.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>

                        {/* Color */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Color <span className="text-red-500">*</span></label>
                          <select
                            value={product.productColor || ''}
                            onChange={(e) => handleProductChange(index, 'productColor', e.target.value)}
                            required
                            disabled={!product.productCategory}
                            className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Price <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            value={product.productSalePrice || ''}
                            onChange={(e) => handleProductChange(index, 'productSalePrice', e.target.value)}
                            required
                            min="0"
                            placeholder="0"
                            className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-300 bg-white shadow-sm"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="col-span-1">
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Qty <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            value={product.productQuantity || ''}
                            onChange={(e) => handleProductChange(index, 'productQuantity', e.target.value)}
                            required
                            min="1"
                            placeholder="0"
                            className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-300 bg-white shadow-sm"
                          />
                        </div>

                        {/* Total */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Total</label>
                          <input
                            type="text"
                            value={formatCurrency(product.productTotalAmount || 0)}
                            readOnly
                            className="w-full px-2 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 text-xs font-semibold"
                          />
                        </div>
                      </div>

                      {/* Stock Status Line */}
                      {selectedStock && (
                        <div className="mt-2 flex items-center gap-2 text-[10px]">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            selectedStock.productQuantity === 0
                              ? 'bg-red-100 text-red-700'
                              : selectedStock.productQuantity <= 10
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            Stock: {selectedStock.productQuantity}
                          </span>
                          {parseInt(product.productQuantity) > selectedStock.productQuantity && (
                            <span className="text-red-600 font-semibold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Exceeds available stock!
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
            <div className="border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="deliveryCharges" className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                    Delivery Charges
                  </label>
                  <input
                    type="number" id="deliveryCharges" name="deliveryCharges"
                    value={formData.deliveryCharges || 0} onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-300 bg-white shadow-sm" />
                </div>
                <div className="flex items-end">
                  <div className="w-full bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(productsSubtotal)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-end">
                  <div className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 p-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-600">Grand Total:</span>
                      <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
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
                className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all duration-200 ${
                  loading ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-lg hover:shadow-xl'
                }`}>
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Invoice...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Create Invoice
                    <span className="ml-2 text-[10px] opacity-70 hidden sm:inline">(Press Enter)</span>
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add animation styles */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default InvoiceCreate;
