import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import api from "../../api/axios";

export default function CustomerDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer } = location.state || {};
  const { id } = useParams();

  // State setup
  const [customerData, setCustomerData] = useState(customer || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State for adding/editing purchase
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    receiptNumber: "",
    bankPaymentEntry: "",
    itemType: "",
    quantity: "",
    unitPrice: "",
    paidAmount: "",
  });

  // Modal State for adding individual payments (Payment History/Calendar)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    bankPaymentEntry: "",
  });

  // Toggle state to view payment history per purchase item
  const [expandedPaymentHistory, setExpandedPaymentHistory] = useState({});

  // Fetch customer details from API
  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);

      const targetId = id || customer?.id;
      if (!targetId) {
        setLoading(false);
        return;
      }

      const res = await api.get(`/members/${targetId}`);
      setCustomerData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load customer details.");
    } finally {
      setLoading(false);
    }
  };

  // Calculations for KPI summary cards and transformed ledger structure
  const activeCustomer = useMemo(() => {
    if (!customerData) return null;

    const totalSpent = (customerData.ledgers || []).reduce(
      (sum, l) => sum + Number(l.totalPrice || 0),
      0
    );

    const totalPaid = (customerData.ledgers || []).reduce(
      (sum, l) => sum + Number(l.paidAmount || 0),
      0
    );

    const totalBalance = (customerData.ledgers || []).reduce(
      (sum, l) => sum + Number(l.remaining || 0),
      0
    );

    return {
      ...customerData,
      customerName: customerData.fullName || customerData.name || "N/A",
      phoneNumber: customerData.phone || "N/A",

      purchases:
        customerData.ledgers?.map((ledger) => ({
          id: ledger.id,
          date: ledger.date,
          receiptNumber: ledger.receiptNo,
          bankPaymentEntry: ledger.note,
          itemType: ledger.itemName,
          quantity: ledger.quantity,
          unitPrice: ledger.unitPrice,
          totalPrice: ledger.totalPrice,
          paidAmount: ledger.paidAmount,
          remainingBalance: ledger.remaining,
          paymentHistory: ledger.paymentHistory || ledger.payments || [],
        })) || [],

      totalSpent,
      totalPaid,
      totalBalance,
    };
  }, [customerData]);

  // Group purchases by date
  const groupedPurchases = useMemo(() => {
    if (!activeCustomer || !activeCustomer.purchases) return {};
    return activeCustomer.purchases.reduce((groups, purchase) => {
      const date = purchase.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(purchase);
      return groups;
    }, {});
  }, [activeCustomer]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentFormChange = (e) => {
    const { name, value } = e.target;
    setPaymentFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingPurchaseId(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      receiptNumber: "",
      bankPaymentEntry: "",
      itemType: "",
      quantity: "",
      unitPrice: "",
      paidAmount: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (purchase) => {
    setEditingPurchaseId(purchase.id);
    setFormData({
      date: purchase.date,
      receiptNumber: purchase.receiptNumber,
      bankPaymentEntry: purchase.bankPaymentEntry || "",
      itemType: purchase.itemType,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      paidAmount: purchase.paidAmount,
    });
    setIsModalOpen(true);
  };

  const openPaymentModal = (purchase) => {
    setSelectedPurchaseForPayment(purchase);
    setPaymentFormData({
      date: new Date().toISOString().split("T")[0],
      amount: "",
      bankPaymentEntry: "",
    });
    setIsPaymentModalOpen(true);
  };

  const toggleHistoryExpand = (purchaseId) => {
    setExpandedPaymentHistory((prev) => ({
      ...prev,
      [purchaseId]: !prev[purchaseId],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Submit main purchase transaction entry
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const qty = Number(formData.quantity);
    const price = Number(formData.unitPrice);
    const paid = Number(formData.paidAmount);

    try {
      if (editingPurchaseId) {
        await api.patch(`/ledger/${editingPurchaseId}`, {
          quantity: qty,
          unitPrice: price,
          paidAmount: paid,
          note: formData.bankPaymentEntry,
        });
      } else {
        await api.post("/ledger", {
          memberId: customerData.id,
          date: formData.date,
          receiptNo: formData.receiptNumber,
          itemName: formData.itemType,
          quantity: qty,
          unitPrice: price,
          paidAmount: paid,
          note: formData.bankPaymentEntry,
        });
      }

      await fetchCustomer();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save transaction.");
    }
  };

  // Submit payment history installment record
  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPurchaseForPayment) return;

    const newPaymentAmount = parseFloat(paymentFormData.amount) || 0;
    if (newPaymentAmount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      const updatedPaidAmount =
        Number(selectedPurchaseForPayment.paidAmount) + newPaymentAmount;

      await api.post(`/ledger/${selectedPurchaseForPayment.id}/payments`, {
        date: paymentFormData.date,
        amount: newPaymentAmount,
        bankPaymentEntry: paymentFormData.bankPaymentEntry || "",
        paidAmount: updatedPaidAmount,
      });

      await fetchCustomer();
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error(err);
      // Fallback: update main ledger paid amount directly if separate payment endpoint does not exist
      try {
        const updatedPaidAmount =
          Number(selectedPurchaseForPayment.paidAmount) + newPaymentAmount;

        await api.patch(`/ledger/${selectedPurchaseForPayment.id}`, {
          paidAmount: updatedPaidAmount,
          note: paymentFormData.bankPaymentEntry || selectedPurchaseForPayment.bankPaymentEntry,
        });

        await fetchCustomer();
        setIsPaymentModalOpen(false);
      } catch (fallbackErr) {
        console.error(fallbackErr);
        alert("Failed to record payment.");
      }
    }
  };

  // Pay remaining balance in full
  const handleSettleBalance = async (purchase) => {
    if (purchase.remainingBalance <= 0) return;

    if (
      !window.confirm(
        `Are you sure you want to settle the full remaining balance of ${Number(
          purchase.remainingBalance
        ).toFixed(2)} ETB?`
      )
    ) {
      return;
    }

    try {
      await api.patch(`/ledger/${purchase.id}`, {
        quantity: purchase.quantity,
        unitPrice: purchase.unitPrice,
        paidAmount: purchase.totalPrice,
      });

      await fetchCustomer();
    } catch (err) {
      console.error(err);
      alert("Failed to settle balance.");
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    try {
      await api.delete(`/ledger/${purchaseId}`);
      await fetchCustomer();
    } catch (err) {
      console.error(err);
      alert("Failed to delete transaction.");
    }
  };

  if (loading) {
    return (
      <CenterLayout>
        <div className="p-8 text-center text-gray-500 font-semibold">
          Loading customer ledger...
        </div>
      </CenterLayout>
    );
  }

  if (error) {
    return (
      <CenterLayout>
        <div className="p-8 text-center text-red-600 font-semibold">
          {error}
        </div>
      </CenterLayout>
    );
  }

  return (
    <CenterLayout>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-statement, #printable-statement * {
            visibility: visible;
          }
          #printable-statement {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            display: flex !important;
          }
        }
      `}</style>

      <div className="w-full bg-gray-100 min-h-screen pt-1 px-4 pb-4 md:pt-2 md:px-6 md:pb-6 font-sans">
        {/* Factory Header Banner (Screen Only) */}
        <div className="bg-[#5516DA] text-white rounded-xl p-3 mb-4 shadow-sm flex justify-between items-center no-print">
          <div>
            <h1 className="text-lg md:text-xl font-extrabold tracking-wide">
              ቦሌ መንሱር ሱልጣን ዱቄት ፋብሪካ
            </h1>
            <p className="text-xs text-purple-200">
              Bole Mansur Sultan Flour Factory — Customer Ledger
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-purple-200 hover:text-white underline cursor-pointer"
          >
            Back / ተመለስ
          </button>
        </div>

        {/* Full-width Details & History Panel */}
        <div id="printable-statement" className="space-y-4">
          {/* Printable Header */}
          <div className="print-header hidden justify-between items-center border-b-2 border-gray-800 pb-4 mb-4">
            <div className="flex items-center gap-4">
              <img
                src="/image.png"
                alt="Factory Logo"
                className="w-16 h-16 object-contain"
              />
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-wide">
                  መንሱር ሱልጣን ዱቄት ፋብሪካ
                </h1>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                  Mansur Sultan Flour Factory — Customer Statement
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-600">
              <p className="font-bold text-gray-800">Date / ቀን:</p>
              <p>{new Date().toISOString().split("T")[0]}</p>
            </div>
          </div>

          {activeCustomer && (
            <>
              {/* Profile Banner */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {activeCustomer.customerName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Phone: {activeCustomer.phoneNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2 no-print">
                  <button
                    onClick={handlePrint}
                    className="bg-gray-800 hover:bg-gray-900 text-white font-semibold text-sm px-3 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Print or Save PDF Statement"
                  >
                    🖨️ Print / PDF
                  </button>
                  <button
                    onClick={openAddModal}
                    className="bg-[#5516DA] hover:bg-[#450ec2] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    + Add New Purchase / አዲስ ግዥ
                  </button>
                </div>
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase">
                    Total Purchases
                  </p>
                  <p className="text-xl font-extrabold text-gray-800 mt-1">
                    {activeCustomer.totalSpent.toFixed(2)}{" "}
                    <span className="text-xs text-gray-500 font-normal">
                      ETB
                    </span>
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-green-600 uppercase">
                    Total Paid
                  </p>
                  <p className="text-xl font-extrabold text-green-700 mt-1">
                    {activeCustomer.totalPaid.toFixed(2)}{" "}
                    <span className="text-xs text-gray-500 font-normal">
                      ETB
                    </span>
                  </p>
                </div>
                <div
                  className={`p-3.5 rounded-xl border shadow-sm ${
                    activeCustomer.totalBalance > 0
                      ? "bg-red-50 border-red-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <p
                    className={`text-xs font-bold uppercase ${
                      activeCustomer.totalBalance > 0
                        ? "text-red-600"
                        : "text-gray-400"
                    }`}
                  >
                    Remaining Balance
                  </p>
                  <p
                    className={`text-xl font-extrabold mt-1 ${
                      activeCustomer.totalBalance > 0
                        ? "text-red-700"
                        : "text-gray-800"
                    }`}
                  >
                    {activeCustomer.totalBalance.toFixed(2)}{" "}
                    <span className="text-xs text-gray-500 font-normal">
                      ETB
                    </span>
                  </p>
                </div>
              </div>

              {/* Purchases Table Grouped by Date */}
              <div className="space-y-3">
                {Object.keys(groupedPurchases).length === 0 ? (
                  <div className="bg-white p-6 text-center rounded-xl border border-gray-200 text-gray-500">
                    No purchases found for this customer.
                  </div>
                ) : (
                  Object.entries(groupedPurchases).map(([date, items]) => (
                    <div
                      key={date}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                    >
                      {/* Group Header */}
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-700 text-xs tracking-wide uppercase">
                          📅 Date: {date}
                        </span>
                        <span className="text-xs font-medium text-gray-500">
                          {items.length} item(s)
                        </span>
                      </div>

                      {/* Items Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-white text-gray-400 border-b border-gray-100 font-bold uppercase">
                            <tr>
                              <th className="p-2.5">Receipt</th>
                              <th className="p-2.5">Item</th>
                              <th className="p-2.5 text-right">Qty</th>
                              <th className="p-2.5 text-right">Price</th>
                              <th className="p-2.5 text-right">Total</th>
                              <th className="p-2.5 text-right">Paid</th>
                              <th className="p-2.5 text-right">Balance</th>
                              <th className="p-2.5">Bank Ref</th>
                              <th className="p-2.5 text-center no-print">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-700">
                            {items.map((item) => (
                              <React.Fragment key={item.id}>
                                <tr className="hover:bg-gray-50/80 transition-colors">
                                  <td className="p-2.5 font-semibold text-gray-800">
                                    {item.receiptNumber}
                                  </td>
                                  <td className="p-2.5 font-medium">
                                    {item.itemType}
                                  </td>
                                  <td className="p-2.5 text-right">
                                    {item.quantity}
                                  </td>
                                  <td className="p-2.5 text-right">
                                    {Number(item.unitPrice).toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-right font-bold text-gray-900">
                                    {Number(item.totalPrice).toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-right text-green-700 font-semibold">
                                    {Number(item.paidAmount).toFixed(2)}
                                  </td>
                                  <td
                                    className={`p-2.5 text-right font-bold ${
                                      item.remainingBalance > 0
                                        ? "text-red-600"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {Number(item.remainingBalance).toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-gray-400 text-[11px]">
                                    {item.bankPaymentEntry || "-"}
                                  </td>
                                  <td className="p-2.5 text-center no-print">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {item.remainingBalance > 0 && (
                                        <>
                                          <button
                                            onClick={() =>
                                              openPaymentModal(item)
                                            }
                                            title="Add Partial/Dated Payment"
                                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] px-2 py-1 rounded font-bold transition-all cursor-pointer"
                                          >
                                            + Pay
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleSettleBalance(item)
                                            }
                                            title="Settle remaining balance"
                                            className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-[10px] px-2 py-1 rounded font-bold transition-all cursor-pointer"
                                          >
                                            Pay Full
                                          </button>
                                        </>
                                      )}
                                      {item.paymentHistory &&
                                        item.paymentHistory.length > 0 && (
                                          <button
                                            onClick={() =>
                                              toggleHistoryExpand(item.id)
                                            }
                                            title="View Payment Logs"
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-[10px] px-2 py-1 rounded font-medium transition-all cursor-pointer"
                                          >
                                            {expandedPaymentHistory[item.id]
                                              ? "Hide History"
                                              : `History (${item.paymentHistory.length})`}
                                          </button>
                                        )}
                                      <button
                                        onClick={() => openEditModal(item)}
                                        title="Edit Entry"
                                        className="bg-purple-50 hover:bg-purple-100 text-[#5516DA] border border-purple-200 text-[10px] px-2 py-1 rounded font-medium transition-all cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeletePurchase(item.id)
                                        }
                                        title="Delete Entry"
                                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] px-2 py-1 rounded font-medium transition-all cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Payment History Sub-table */}
                                {expandedPaymentHistory[item.id] &&
                                  item.paymentHistory &&
                                  item.paymentHistory.length > 0 && (
                                    <tr className="bg-gray-50/90">
                                      <td colSpan="9" className="p-3">
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs space-y-2">
                                          <p className="font-bold text-gray-700 border-b pb-1">
                                            💳 Payment Log History (Receipt:{" "}
                                            {item.receiptNumber})
                                          </p>
                                          <div className="grid grid-cols-3 font-semibold text-gray-500 uppercase border-b pb-1 text-[11px]">
                                            <span>Date</span>
                                            <span className="text-right">
                                              Amount Paid
                                            </span>
                                            <span className="text-right">
                                              Bank / Ref No
                                            </span>
                                          </div>
                                          {item.paymentHistory.map(
                                            (pay, pIdx) => (
                                              <div
                                                key={pay.id || pIdx}
                                                className="grid grid-cols-3 text-gray-700 text-[11px] py-0.5"
                                              >
                                                <span>{pay.date}</span>
                                                <span className="text-right font-semibold text-green-700">
                                                  {Number(
                                                    pay.amount
                                                  ).toFixed(2)}{" "}
                                                  ETB
                                                </span>
                                                <span className="text-right text-gray-500">
                                                  {pay.bankPaymentEntry ||
                                                    pay.note ||
                                                    "-"}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal: Add/Edit Purchase */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-center items-center p-4 no-print">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-md font-bold text-gray-800">
                  {editingPurchaseId
                    ? "Edit Transaction"
                    : `New Entry for ${activeCustomer.customerName}`}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handleFormSubmit}
                className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
              >
                <div>
                  <label className="block mb-1 font-semibold text-gray-600">
                    Date (ቀን) *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600">
                    Receipt No *
                  </label>
                  <input
                    type="text"
                    name="receiptNumber"
                    value={formData.receiptNumber}
                    onChange={handleFormChange}
                    required
                    placeholder="REC-..."
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-semibold text-gray-600">
                    Item Type (የዱቄት አይነት) *
                  </label>
                  <input
                    type="text"
                    name="itemType"
                    value={formData.itemType}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g. የስንዴ ዱቄት 50ኪ.ግ / ፉስካ..."
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    required
                    placeholder="1"
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600">
                    Unit Price (ETB) *
                  </label>
                  <input
                    type="number"
                    name="unitPrice"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={handleFormChange}
                    required
                    placeholder="0.00"
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600">
                    Paid Amount (ETB) *
                  </label>
                  <input
                    type="number"
                    name="paidAmount"
                    min="0"
                    step="0.01"
                    value={formData.paidAmount}
                    onChange={handleFormChange}
                    required
                    placeholder="0.00"
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-600">
                    Bank Ref / Transaction No
                  </label>
                  <input
                    type="text"
                    name="bankPaymentEntry"
                    value={formData.bankPaymentEntry}
                    onChange={handleFormChange}
                    placeholder="CBE-..., TELEBIRR-..."
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer"
                  >
                    Cancel / ሰርዝ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#5516DA] text-white rounded-lg hover:bg-[#450ec2] transition-all font-semibold cursor-pointer"
                  >
                    {editingPurchaseId
                      ? "Save Changes"
                      : "Add Entry / መዝግብ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Individual Payment Record (Payment Calendar/History) */}
        {isPaymentModalOpen && selectedPurchaseForPayment && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-center items-center p-4 no-print">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                <div>
                  <h3 className="text-md font-bold text-gray-800">
                    Record Payment (ክፍያ መዝግብ)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Receipt #{selectedPurchaseForPayment.receiptNumber} — Remaining:{" "}
                    <span className="font-bold text-red-600">
                      {Number(selectedPurchaseForPayment.remainingBalance).toFixed(2)} ETB
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddPaymentSubmit} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block mb-1 font-semibold text-gray-600">
                    Payment Date (የክፍያ ቀን) *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={paymentFormData.date}
                    onChange={handlePaymentFormChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-gray-600">
                    Amount (የክፍያ መጠን - ETB) *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    max={selectedPurchaseForPayment.remainingBalance}
                    step="0.01"
                    value={paymentFormData.amount}
                    onChange={handlePaymentFormChange}
                    required
                    placeholder="0.00"
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-gray-600">
                    Bank Ref / Payment Method (የባንክ ማረጋገጫ)
                  </label>
                  <input
                    type="text"
                    name="bankPaymentEntry"
                    value={paymentFormData.bankPaymentEntry}
                    onChange={handlePaymentFormChange}
                    placeholder="e.g. CBE-..., TELEBIRR-..., Cash"
                    className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer"
                  >
                    Cancel / ሰርዝ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold cursor-pointer"
                  >
                    Save Payment / ክፍያ መዝግብ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CenterLayout>
  );
}