// StockCreate.jsx - Compact redesigned component for creating stock entries
import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const StockCreate = () => {
  const [creationMode, setCreationMode] = useState('single');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [singleFormData, setSingleFormData] = useState({
    productName: '',
    productCategory: '',
    productColor: '',
    productPurchasePrice: '',
    productQuantity: ''
  });

  const [bulkStocks, setBulkStocks] = useState([
    { productName: '', productCategory: '', productColor: '', productPurchasePrice: '', productQuantity: '' }
  ]);

  const [csvText, setCsvText] = useState('');
  const [showCsvImport, setShowCsvImport] = useState(false);

  const handleSingleInputChange = (e) => {
    const { name, value } = e.target;
    setSingleFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBulkInputChange = (index, e) => {
    const { name, value } = e.target;
    const updatedStocks = [...bulkStocks];
    updatedStocks[index] = { ...updatedStocks[index], [name]: value };
    setBulkStocks(updatedStocks);
  };

  const addBulkRow = () => {
    setBulkStocks(prev => [
      ...prev,
      { productName: '', productCategory: '', productColor: '', productPurchasePrice: '', productQuantity: '' }
    ]);
  };

  const removeBulkRow = (index) => {
    if (bulkStocks.length > 1) {
      setBulkStocks(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleCsvImport = () => {
    if (!csvText.trim()) { setError('Please paste CSV data'); return; }

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) { setError('CSV must have a header row and at least one data row'); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const headerMap = {
        'productname': 'productName', 'name': 'productName',
        'productcategory': 'productCategory', 'category': 'productCategory',
        'productcolor': 'productColor', 'color': 'productColor',
        'productpurchaseprice': 'productPurchasePrice', 'purchaseprice': 'productPurchasePrice', 'price': 'productPurchasePrice',
        'productquantity': 'productQuantity', 'quantity': 'productQuantity', 'qty': 'productQuantity'
      };

      const importedStocks = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) { setError(`Row ${i + 1} has incorrect number of columns`); return; }
        
        const stock = { productName: '', productCategory: '', productColor: '', productPurchasePrice: '', productQuantity: '' };
        headers.forEach((header, index) => {
          const key = headerMap[header];
          if (key) stock[key] = values[index] || '';
        });
        importedStocks.push(stock);
      }

      setBulkStocks(importedStocks);
      setShowCsvImport(false);
      setCsvText('');
      setSuccess(`Imported ${importedStocks.length} items from CSV`);
    } catch (error) {
      setError('Failed to parse CSV data.');
    }
  };

  const formatStockData = (data) => ({
    productName: data.productName.trim(),
    productCategory: data.productCategory.trim(),
    productColor: data.productColor.trim(),
    productPurchasePrice: parseFloat(data.productPurchasePrice),
    productQuantity: parseInt(data.productQuantity)
  });

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singleFormData.productName || !singleFormData.productCategory || 
        !singleFormData.productColor || !singleFormData.productPurchasePrice || 
        parseFloat(singleFormData.productPurchasePrice) <= 0 || 
        !singleFormData.productQuantity || parseInt(singleFormData.productQuantity) < 0) {
      setError('Please fill all required fields with valid values');
      return;
    }

    setLoading(true); setError(null); setSuccess(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/stock`, formatStockData(singleFormData));
      setSuccess(response.data.message || 'Stock created successfully!');
      setSingleFormData({ productName: '', productCategory: '', productColor: '', productPurchasePrice: '', productQuantity: '' });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create stock.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const hasInvalid = bulkStocks.some(
      s => !s.productName || !s.productCategory || !s.productColor || 
           !s.productPurchasePrice || parseFloat(s.productPurchasePrice) <= 0 || 
           !s.productQuantity || parseInt(s.productQuantity) < 0
    );
    if (hasInvalid) { setError('Please fill all fields with valid values for each item'); return; }

    setLoading(true); setError(null); setSuccess(null);

    try {
      const data = bulkStocks.map(s => formatStockData(s));
      const response = await axios.post(`${API_BASE_URL}/stock`, data);
      setSuccess(response.data.message || `${bulkStocks.length} items created!`);
      setBulkStocks([{ productName: '', productCategory: '', productColor: '', productPurchasePrice: '', productQuantity: '' }]);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create stocks.');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  const getStockStatus = (quantity) => {
    const qty = parseInt(quantity) || 0;
    if (qty === 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (qty <= 10) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">ADD NEW STOCK</h1>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2 shrink-0">❌</span>
              <p className="text-red-700 flex-1 wrap-break">{error}</p>
              <button onClick={clearMessages} className="text-red-400 hover:text-red-600 shrink-0 ml-1">✕</button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-3 bg-green-50 border-l-4 border-green-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2 shrink-0">✅</span>
              <p className="text-green-700 flex-1 wrap-break">{success}</p>
              <button onClick={clearMessages} className="text-green-400 hover:text-green-600 shrink-0 ml-1">✕</button>
            </div>
          </div>
        )}

        {/* Creation Mode Toggle */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2">
            <div className="flex flex-col xs:flex-row xs:space-x-3 space-y-2 xs:space-y-0">
              <button onClick={() => setCreationMode('single')}
                className={`w-full xs:w-auto px-4 py-1.5 rounded-md text-xs font-medium transition ${
                  creationMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/20'
                }`}>
                📦 Single
              </button>
              <button onClick={() => setCreationMode('bulk')}
                className={`w-full xs:w-auto px-4 py-1.5 rounded-md text-xs font-medium transition ${
                  creationMode === 'bulk' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/20'
                }`}>
                📦📦 Bulk
              </button>
            </div>
          </div>
        </div>

        {/* Single Stock Form */}
        {creationMode === 'single' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2">
              <h2 className="text-xs sm:text-sm font-semibold text-white">Add Single Stock Item</h2>
            </div>

            <form onSubmit={handleSingleSubmit} className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                  <input type="text" name="productName" value={singleFormData.productName} onChange={handleSingleInputChange}
                    required placeholder="Product name"
                    className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <input type="text" name="productCategory" value={singleFormData.productCategory} onChange={handleSingleInputChange}
                    required placeholder="e.g., Electronics"
                    className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Color <span className="text-red-500">*</span></label>
                  <input type="text" name="productColor" value={singleFormData.productColor} onChange={handleSingleInputChange}
                    required placeholder="e.g., Red, Blue"
                    className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Purchase Price (Rs.) <span className="text-red-500">*</span></label>
                  <input type="number" name="productPurchasePrice" value={singleFormData.productPurchasePrice} onChange={handleSingleInputChange}
                    required min="0" step="0.01" placeholder="0.00"
                    className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="xs:col-span-2">
                  <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                  <input type="number" name="productQuantity" value={singleFormData.productQuantity} onChange={handleSingleInputChange}
                    required min="0" placeholder="0"
                    className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                  {singleFormData.productQuantity !== '' && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStockStatus(singleFormData.productQuantity).color}`}>
                      {getStockStatus(singleFormData.productQuantity).text}
                    </span>
                  )}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className={`w-full py-2 px-4 rounded-md text-white text-sm font-medium transition ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                }`}>
                {loading ? 'Creating...' : 'Add Stock Item'}
              </button>
            </form>
          </div>
        )}

        {/* Bulk Stock Form */}
        {creationMode === 'bulk' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-xs sm:text-sm font-semibold text-white">Bulk Stock ({bulkStocks.length} items)</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button type="button" onClick={() => setShowCsvImport(true)}
                  className="flex-1 sm:flex-none px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium">
                  📄 CSV
                </button>
                <button type="button" onClick={addBulkRow}
                  className="flex-1 sm:flex-none px-2.5 py-1 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-xs font-medium">
                  + Row
                </button>
              </div>
            </div>

            {/* CSV Import */}
            {showCsvImport && (
              <div className="p-2 sm:p-3 bg-gray-50 border-b">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-medium text-gray-900">Import CSV</h3>
                  <button onClick={() => { setShowCsvImport(false); setCsvText(''); }} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="mb-2 p-2 bg-blue-50 rounded text-xs overflow-x-auto">
                  <code className="text-blue-600 text-xs break-all">productName,productCategory,productColor,productPurchasePrice,productQuantity</code>
                </div>
                <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows="5"
                  placeholder="Paste CSV data..."
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-mono" />
                <div className="flex flex-col xs:flex-row justify-end gap-2 mt-2">
                  <button onClick={() => { setShowCsvImport(false); setCsvText(''); }}
                    className="w-full xs:w-auto px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded-md text-xs">
                    Cancel
                  </button>
                  <button onClick={handleCsvImport}
                    className="w-full xs:w-auto px-3 py-1 bg-green-600 text-white rounded-md text-xs">
                    Import
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleBulkSubmit} className="p-3 sm:p-4">
              <div className="space-y-2 sm:space-y-2.5">
                {bulkStocks.map((stock, index) => (
                  <div key={index} className="bg-gray-50 rounded-md p-2 sm:p-2.5 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-700">#{index + 1}</span>
                      {bulkStocks.length > 1 && (
                        <button type="button" onClick={() => removeBulkRow(index)} className="text-red-500 hover:text-red-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Name *</label>
                        <input type="text" name="productName" value={stock.productName || ''} onChange={(e) => handleBulkInputChange(index, e)}
                          required placeholder="Name" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                      </div>
                      <div>
                        <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Category *</label>
                        <input type="text" name="productCategory" value={stock.productCategory || ''} onChange={(e) => handleBulkInputChange(index, e)}
                          required placeholder="Category" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                      </div>
                      <div>
                        <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Color *</label>
                        <input type="text" name="productColor" value={stock.productColor || ''} onChange={(e) => handleBulkInputChange(index, e)}
                          required placeholder="Color" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                      </div>
                      <div>
                        <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Price (Rs.) *</label>
                        <input type="number" name="productPurchasePrice" value={stock.productPurchasePrice || ''} onChange={(e) => handleBulkInputChange(index, e)}
                          required min="0" step="0.01" placeholder="0.00" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                      </div>
                      <div>
                        <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Qty *</label>
                        <input type="number" name="productQuantity" value={stock.productQuantity || ''} onChange={(e) => handleBulkInputChange(index, e)}
                          required min="0" placeholder="0" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                        {stock.productQuantity !== '' && (
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-xs ${getStockStatus(stock.productQuantity).color}`}>
                            {getStockStatus(stock.productQuantity).text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-center">
                <button type="button" onClick={addBulkRow}
                  className="inline-flex items-center px-3 py-1.5 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 text-xs font-medium">
                  + Add Another Item
                </button>
              </div>

              <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-200">
                <button type="submit" disabled={loading}
                  className={`w-full py-2 px-4 rounded-md text-white text-sm font-medium transition ${
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                  }`}>
                  {loading ? `Creating ${bulkStocks.length} items...` : `Add ${bulkStocks.length} Item${bulkStocks.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Custom CSS for extra small screens */}
      <style jsx='true'>{`
        @media (min-width: 480px) {
          .xs\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .xs\\:col-span-2 {
            grid-column: span 2 / span 2;
          }
          .xs\\:flex-row {
            flex-direction: row;
          }
          .xs\\:w-auto {
            width: auto;
          }
          .xs\\:space-y-0 > * + * {
            margin-top: 0;
          }
          .xs\\:space-x-3 > * + * {
            margin-left: 0.75rem;
          }
          .xs\\:flex-none {
            flex: none;
          }
        }
        .text-2xs {
          font-size: 0.65rem;
        }
      `}</style>
    </div>
  );
};

export default StockCreate;