import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import api from "../../api/axios";
import Swal from "sweetalert2";
import { toGregorian, toEthiopian } from "ethiopian-date";

export default function UserManagement() {
  const navigate = useNavigate();
  const { id } = useParams();

  const getTodayEthiopian = () => {
    const today = new Date();
    const [year, month, day] = toEthiopian(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );
    return { year, month, day };
  };

  // Convert Gregorian date (YYYY-MM-DD or ISO) -> Ethiopian string (YYYY-MM-DD)
  const formatEthiopianDate = (date) => {
    if (!date) return "";

    // If already an Ethiopian date object
    if (typeof date === "object" && date.year && date.month && date.day) {
      return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
    }

    // If string in YYYY-MM-DD format
    const dateString = String(date).split("T")[0];
    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return "";

    const ethDate = toEthiopian(year, month, day);
    return `${ethDate.year}-${String(ethDate.month).padStart(2, "0")}-${String(ethDate.day).padStart(2, "0")}`;
  };

  // State setup
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(id || null);

  // Modal State for adding/editing purchase
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);

  const todayEth = getTodayEthiopian();

  const [formData, setFormData] = useState({
    date: todayEth,
    receiptNumber: "",
    bankPaymentEntry: "",
    itemType: "",
    quantity: "",
    unitPrice: "",
    paidAmount: "",
  });

  // Modal State for adding individual payments
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState(null);

  const [paymentFormData, setPaymentFormData] = useState({
    date: todayEth,
    amount: "",
    bankPaymentEntry: "",
  });

  const [receiptStatus, setReceiptStatus] = useState("");
  const [, setReceiptAvailable] = useState(true);

  useEffect(() => {
    if (id) setSelectedCustomerId(id);
  }, [id]);

  useEffect(() => {
    if (id) fetchCustomers();
  }, [id]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/members/${id}`);
      const customer = response.data;

      const formattedCustomer = {
        id: customer.id,
        customerName: customer.fullName,
        phoneNumber: customer.phone,
        purchases:
          customer.ledgers?.map((ledger) => {
            const totalPrice = Number(ledger.totalPrice || 0);

            const payments = (ledger.payments || []).map((pay) => ({
              ...pay,
              date: formatEthiopianDate(pay.date),
            }));

            const paidAmount = payments.reduce(
              (sum, p) => sum + Number(p.amount || 0),
              Number(ledger.paidAmount || 0)
            );

            return {
              id: ledger.id,
              date: formatEthiopianDate(ledger.date),
              receiptNumber: ledger.receiptNo,
              bankPaymentEntry: ledger.note || "",
              itemType: ledger.itemName || "",
              quantity: Number(ledger.quantity || 0),
              unitPrice: Number(ledger.unitPrice || 0),
              totalPrice,
              paidAmount,
              remainingBalance: Math.max(0, totalPrice - paidAmount),
              paymentHistory: payments,
            };
          }) || [],
      };

      setCustomers([formattedCustomer]);
      setSelectedCustomerId(customer.id);
    } catch (err) {
      console.error(err);
      setError("Failed to load customer data");
    } finally {
      setLoading(false);
    }
  };

  const checkReceiptExists = async (receiptNo) => {
    if (!receiptNo) {
      setReceiptStatus("");
      setReceiptAvailable(true);
      return false;
    }

    try {
      const res = await api.get(`/members/check-receipt/${receiptNo}`);
      if (res.data.exists) {
        setReceiptAvailable(false);
        setReceiptStatus("❌ This receipt number is already used.");
        return true;
      } else {
        setReceiptAvailable(true);
        setReceiptStatus("✅ Receipt number is available.");
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const purchases = c.purchases || [];
      const totalSpent = purchases.reduce((sum, p) => sum + (Number(p.totalPrice) || 0), 0);
      const totalPaid = purchases.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
      const totalBalance = purchases.reduce((sum, p) => sum + (Number(p.remainingBalance) || 0), 0);
      return { ...c, totalSpent, totalPaid, totalBalance };
    });
  }, [customers]);

  const activeCustomer = useMemo(() => {
    return enrichedCustomers.find((c) => String(c.id) === String(selectedCustomerId)) || enrichedCustomers[0];
  }, [enrichedCustomers, selectedCustomerId]);

  const groupedPurchases = useMemo(() => {
    if (!activeCustomer || !activeCustomer.purchases) return {};
    return activeCustomer.purchases.reduce((groups, purchase) => {
      const date = purchase.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(purchase);
      return groups;
    }, {});
  }, [activeCustomer]);

  const openAddModal = () => {
    setEditingPurchaseId(null);
    setFormData({
      date: getTodayEthiopian(),
      receiptNumber: "",
      bankPaymentEntry: "",
      itemType: "",
      quantity: "",
      unitPrice: "",
      paidAmount: "",
    });
    setIsModalOpen(true);
  };

  // FIX: Parse Ethiopian date string directly to avoid Gregorian double-conversion
  const openEditModal = (purchase) => {
    setEditingPurchaseId(purchase.id);

    let ethDateObj = getTodayEthiopian();
    if (purchase.date) {
      const [y, m, d] = purchase.date.split("-").map(Number);
      if (y && m && d) {
        ethDateObj = { year: y, month: m, day: d };
      }
    }

    setFormData({
      date: ethDateObj,
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
      date: getTodayEthiopian(),
      amount: "",
      bankPaymentEntry: "",
    });
    setIsPaymentModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!activeCustomer) return;

    if (!editingPurchaseId) {
      const exists = await checkReceiptExists(formData.receiptNumber);
      if (exists) return;
    }

    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.unitPrice) || 0;

    const gregorianDate = toGregorian(
      formData.date.year,
      formData.date.month,
      formData.date.day
    );

    const saveDate = `${gregorianDate[0]}-${String(gregorianDate[1]).padStart(2, "0")}-${String(gregorianDate[2]).padStart(2, "0")}`;
    const totalPrice = qty * price;
    const paid = Math.min(parseFloat(formData.paidAmount) || 0, totalPrice);

    const initialPayment = paid > 0 ? [{
      id: `pay_${Date.now()}`,
      date: formatEthiopianDate(formData.date),
      amount: paid,
      bankPaymentEntry: formData.bankPaymentEntry || ""
    }] : [];

    try {
      if (editingPurchaseId) {
        const payload = {
          date: saveDate,
          receiptNo: formData.receiptNumber,
          note: formData.bankPaymentEntry,
          itemName: formData.itemType,
          quantity: qty,
          unitPrice: price,
          totalPrice,
          paidAmount: paid,
        };

        const response = await api.patch(`/ledger/${editingPurchaseId}`, payload);
        const updatedLedger = response.data;

        setCustomers((prevCustomers) =>
          prevCustomers.map((cust) => {
            if (String(cust.id) === String(activeCustomer.id)) {
              return {
                ...cust,
                purchases: cust.purchases.map((p) => {
                  if (p.id === editingPurchaseId) {
                    return {
                      ...p,
                      date: formatEthiopianDate(updatedLedger.date),
                      receiptNumber: updatedLedger.receiptNo,
                      bankPaymentEntry: updatedLedger.note || "",
                      itemType: updatedLedger.itemName || "",
                      quantity: Number(updatedLedger.quantity),
                      unitPrice: Number(updatedLedger.unitPrice),
                      totalPrice: Number(updatedLedger.totalPrice),
                      paidAmount: Number(updatedLedger.paidAmount),
                      remainingBalance: Number(updatedLedger.totalPrice) - Number(updatedLedger.paidAmount),
                    };
                  }
                  return p;
                }),
              };
            }
            return cust;
          })
        );
      } else {
        const payload = {
          memberId: activeCustomer.id,
          date: saveDate,
          receiptNo: formData.receiptNumber,
          itemName: formData.itemType,
          note: formData.bankPaymentEntry,
          quantity: qty,
          unitPrice: price,
          paidAmount: paid,
        };

        const response = await api.post("/ledger", payload);
        const ledger = response.data;

        const newPurchase = {
          id: ledger.id,
          date: formatEthiopianDate(ledger.date),
          receiptNumber: ledger.receiptNo,
          bankPaymentEntry: ledger.note || "",
          itemType: ledger.itemName,
          quantity: Number(ledger.quantity),
          unitPrice: Number(ledger.unitPrice),
          totalPrice: Number(ledger.totalPrice),
          paidAmount: Number(ledger.paidAmount),
          remainingBalance: Number(ledger.totalPrice) - Number(ledger.paidAmount),
          paymentHistory: initialPayment,
        };

        setCustomers((prevCustomers) =>
          prevCustomers.map((cust) => {
            if (String(cust.id) === String(activeCustomer.id)) {
              return {
                ...cust,
                purchases: [newPurchase, ...(cust.purchases || [])],
              };
            }
            return cust;
          })
        );
      }

      setIsModalOpen(false);
      Swal.fire({
        icon: "success",
        title: editingPurchaseId ? "Updated Successfully!" : "Added Successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Unable to save transaction.",
      });
    }
  };

  // FIX: Normalize payment date format to string upon recording
  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPurchaseForPayment) return;

    const newPaymentAmount = parseFloat(paymentFormData.amount) || 0;
    const remainingBalance = Number(selectedPurchaseForPayment.remainingBalance) || 0;

    if (newPaymentAmount <= 0 || newPaymentAmount > remainingBalance) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Amount",
        text: `Enter an amount between 1 and ${remainingBalance.toFixed(2)} ETB.`,
      });
      return;
    }

    const gregorianPaymentDate = toGregorian(
      paymentFormData.date.year,
      paymentFormData.date.month,
      paymentFormData.date.day
    );

    const paymentDate = `${gregorianPaymentDate[0]}-${String(gregorianPaymentDate[1]).padStart(2, "0")}-${String(gregorianPaymentDate[2]).padStart(2, "0")}`;

    try {
      const response = await api.post("/payments", {
        ledgerId: selectedPurchaseForPayment.id,
        date: paymentDate,
        amount: newPaymentAmount,
        bankPaymentEntry: paymentFormData.bankPaymentEntry || "",
      });

      const savedPayment = response.data;
      const formattedDateStr = `${paymentFormData.date.year}-${String(paymentFormData.date.month).padStart(2, "0")}-${String(paymentFormData.date.day).padStart(2, "0")}`;

      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) => {
          if (String(cust.id) === String(activeCustomer.id)) {
            return {
              ...cust,
              purchases: cust.purchases.map((p) => {
                if (p.id === selectedPurchaseForPayment.id) {
                  const existingHistory = p.paymentHistory || [];
                  const newHistoryEntry = {
                    id: savedPayment?.id || `pay_${Date.now()}`,
                    date: formattedDateStr,
                    amount: newPaymentAmount,
                    bankPaymentEntry: paymentFormData.bankPaymentEntry || "",
                  };

                  const updatedHistory = [...existingHistory, newHistoryEntry];
                  const updatedPaidAmount = updatedHistory.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);

                  return {
                    ...p,
                    paidAmount: updatedPaidAmount,
                    remainingBalance: Math.max(0, Number(p.totalPrice) - updatedPaidAmount),
                    paymentHistory: updatedHistory,
                  };
                }
                return p;
              }),
            };
          }
          return cust;
        })
      );

      setIsPaymentModalOpen(false);
      setSelectedPurchaseForPayment(null);

      Swal.fire({
        icon: "success",
        title: "Payment Recorded!",
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchCustomers();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Payment Failed",
        text: err.response?.data?.message || "Unable to record payment.",
      });
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    const result = await Swal.fire({
      title: "Delete Transaction?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/ledger/${purchaseId}`);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        timer: 1500,
        showConfirmButton: false,
      });
      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) => {
          if (String(cust.id) === String(activeCustomer.id)) {
            return {
              ...cust,
              purchases: cust.purchases.filter((p) => p.id !== purchaseId),
            };
          }
          return cust;
        })
      );
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: "Unable to delete the transaction.",
      });
    }
  };
  if (loading) {
    return (
      <CenterLayout>
        <div className="p-4 text-center text-gray-600 font-semibold">
          Loading customer records... / እባክዎ ትንሽ ይጠብቁ...
        </div>
      </CenterLayout>
    );
  }

  return (
    <CenterLayout>
      {/* CSS Rules to format the printable PDF statement */}
      <style>{`
@media print {

  @page {
    size: A4 portrait;
    margin: 12mm;
  }

  html,
  body {
    width: 100%;
    background: white;
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
  }

  body * {
    visibility: hidden;
  }

  #printable-statement,
  #printable-statement * {
    visibility: visible;
  }

  #printable-statement {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    margin: auto;
    width: 95%;
    max-width: 900px;
    background: white;
    color: black;
    padding: 0;
    box-sizing: border-box;
  }

  .no-print {
    display: none !important;
  }

  .print-header {
    display: flex !important;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  table {
    width: 100% !important;
    border-collapse: collapse;
    margin: 0 auto;
  }

  th,
  td {
    padding: 8px;
    border: 1px solid #ccc;
    font-size: 12px;
  }

  img {
    max-width: 100%;
  }

  .bg-white,
  .bg-gray-50,
  .bg-gray-100,
  .bg-red-50,
  .shadow-sm,
  .rounded-xl {
    background: white !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }

  button {
    display: none !important;
  }
}
`}</style>

      <div className="w-full bg-gray-100 min-h-screen pt-1 px-4 pb-4 md:pt-2 md:px-6 md:pb-6 font-sans">
        {/* Factory Header Banner (Screen Only) */}
        <div className="bg-[#5516DA] text-white rounded-xl p-3 mb-4 shadow-sm flex justify-between items-center no-print">
          <div>
            <h1 className="text-lg md:text-xl font-extrabold tracking-wide">
              መንሱር ሱልጣን ዱቄት ፋብሪካ
            </h1>
            <p className="text-xs text-purple-200">Mansur Sultan Flour Factory — Customer Ledger</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-purple-200 hover:text-white underline cursor-pointer"
          >
            Back / ተመለስ
          </button>
        </div>

        {/* Full-width Details & History Panel */}
        <div
          id="printable-statement"
          className="space-y-4 mx-auto max-w-5xl"
        >
          {/* Printable Header - Visible ONLY in Print Mode */}
          <div className="print-header hidden items-center border-b-2 border-gray-800 pb-4 mb-4">
            <div className="flex items-center gap-4">
              <img src="/image.png" alt="Factory Logo" className="w-16 h-16 object-contain" />
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
              <p>
                {(() => {
                  const today = getTodayEthiopian();
                  return `${today.year}-${String(today.month).padStart(2, "0")}-${String(
                    today.day
                  ).padStart(2, "0")}`;
                })()}
              </p>
            </div>
          </div>

          {activeCustomer && (
            <>
              {/* Profile Banner */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:text-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{activeCustomer.customerName}</h2>
                  <p className="text-sm text-gray-500">Phone: {activeCustomer.phoneNumber}</p>
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
                  <p className="text-xs font-bold text-gray-400 uppercase">Total Purchases</p>
                  <p className="text-xl font-extrabold text-gray-800 mt-1">
                    {activeCustomer.totalSpent.toFixed(2)} <span className="text-xs text-gray-500 font-normal">ETB</span>
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-green-600 uppercase">Total Paid</p>
                  <p className="text-xl font-extrabold text-green-700 mt-1">
                    {activeCustomer.totalPaid.toFixed(2)} <span className="text-xs text-gray-500 font-normal">ETB</span>
                  </p>
                </div>
                <div className={`p-3.5 rounded-xl border shadow-sm ${activeCustomer.totalBalance > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
                  <p className={`text-xs font-bold uppercase ${activeCustomer.totalBalance > 0 ? "text-red-600" : "text-gray-400"}`}>
                    Remaining Balance
                  </p>
                  <p className={`text-xl font-extrabold mt-1 ${activeCustomer.totalBalance > 0 ? "text-red-700" : "text-gray-800"}`}>
                    {activeCustomer.totalBalance.toFixed(2)} <span className="text-xs text-gray-500 font-normal">ETB</span>
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
                    <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                              <th className="p-2.5 text-center no-print">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-700">
                            {items.map((item) => (
                              <React.Fragment key={item.id}>
                                <tr className="hover:bg-gray-50/80 transition-colors">
                                  <td className="p-2.5 font-semibold text-gray-800">{item.receiptNumber}</td>
                                  <td className="p-2.5 font-medium">{item.itemType}</td>
                                  <td className="p-2.5 text-right">{item.quantity}</td>
                                  <td className="p-2.5 text-right">{Number(item.unitPrice).toFixed(2)}</td>
                                  <td className="p-2.5 text-right font-bold text-gray-900">{Number(item.totalPrice).toFixed(2)}</td>
                                  <td className="p-2.5 text-right text-green-700 font-semibold">{Number(item.paidAmount).toFixed(2)}</td>
                                  <td className={`p-2.5 text-right font-bold ${item.remainingBalance > 0 ? "text-red-600" : "text-gray-400"}`}>
                                    {Number(item.remainingBalance).toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-gray-400 text-[11px]">{item.bankPaymentEntry || "-"}</td>
                                  <td className="p-2.5 text-center no-print">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {item.remainingBalance > 0 && (
                                        <button
                                          onClick={() => openPaymentModal(item)}
                                          title="Record Partial Payment with Date"
                                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] px-2 py-1 rounded font-bold transition-all cursor-pointer"
                                        >
                                          + Pay Entry
                                        </button>
                                      )}

                                      <button
                                        onClick={() => {
                                          console.log("EDIT ITEM:", item);
                                          openEditModal(item);
                                        }}
                                        title="Edit Entry"
                                        className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-[10px] px-2 py-1 rounded font-bold transition-all cursor-pointer"
                                      >
                                        Edit
                                      </button>

                                      <button
                                        onClick={() => handleDeletePurchase(item.id)}
                                        title="Delete Entry"
                                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] px-2 py-1 rounded font-medium transition-all cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Payment History Detailed Section */}
                                {item.paymentHistory && item.paymentHistory.length > 0 && (
                                  <tr className="bg-gray-50/50">
                                    <td colSpan="9" className="p-2 px-4 border-t border-dashed border-gray-200">
                                      <div className="text-[11px] text-gray-600 font-medium space-y-1">
                                        <p className="font-bold text-gray-700">📜 Payment History / የክፍያ ታሪክ:</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                                          {item.paymentHistory.map((pay) => (
                                            <div key={pay.id} className="bg-white p-1.5 rounded border border-gray-200 flex justify-between items-center shadow-2xs">
                                              <span>
                                                📅 {pay.date}

                                              </span>
                                              <span className="font-bold text-green-700">{Number(pay.amount).toFixed(2)} ETB</span>
                                              {pay.bankPaymentEntry && <span className="text-[10px] text-gray-400">({pay.bankPaymentEntry})</span>}
                                            </div>
                                          ))}
                                        </div>
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
        {/* Modal: Add Payment */}
        {isPaymentModalOpen &&
          selectedPurchaseForPayment && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-center items-center p-4 no-print">

              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">

                  <div>
                    <h3 className="text-md font-bold text-gray-800">
                      Record Payment / ክፍያ መዝግብ
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      Purchase payment information
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setSelectedPurchaseForPayment(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
                  >
                    ✕
                  </button>

                </div>


                <form
                  onSubmit={handleAddPaymentSubmit}
                  className="p-5 flex flex-col gap-4 text-xs"
                >

                  {/* PURCHASE INFORMATION */}

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">

                    <h4 className="font-bold text-gray-700 mb-3 text-sm">
                      Purchase Information / የግዢ መረጃ
                    </h4>

                    <div className="grid grid-cols-2 gap-3">

                      {/* Receipt */}
                      <div>
                        <p className="text-gray-400 font-semibold">
                          Receipt No
                        </p>

                        <p className="font-bold text-gray-800 mt-1">
                          {selectedPurchaseForPayment.receiptNumber ||
                            "-"}
                        </p>
                      </div>


                      {/* Item */}
                      <div>
                        <p className="text-gray-400 font-semibold">
                          Item Type / የዱቄት አይነት
                        </p>

                        <p className="font-bold text-gray-800 mt-1">
                          {selectedPurchaseForPayment.itemType ||
                            "-"}
                        </p>
                      </div>


                      {/* Quantity */}
                      <div>
                        <p className="text-gray-400 font-semibold">
                          Quantity / ብዛት
                        </p>

                        <p className="font-bold text-gray-800 mt-1">
                          {selectedPurchaseForPayment.quantity}
                        </p>
                      </div>


                      {/* Unit Price */}
                      <div>
                        <p className="text-gray-400 font-semibold">
                          Unit Price / የአንዱ ዋጋ
                        </p>

                        <p className="font-bold text-gray-800 mt-1">
                          {Number(
                            selectedPurchaseForPayment.unitPrice
                          ).toFixed(2)}{" "}
                          ETB
                        </p>
                      </div>


                      {/* Total */}
                      <div>
                        <p className="text-gray-400 font-semibold">
                          Total Price / ጠቅላላ ዋጋ
                        </p>

                        <p className="font-bold text-gray-900 mt-1">
                          {Number(
                            selectedPurchaseForPayment.totalPrice
                          ).toFixed(2)}{" "}
                          ETB
                        </p>
                      </div>


                      {/* Paid */}
                      <div>
                        <p className="text-gray-400 font-semibold">
                          Already Paid / የተከፈለ
                        </p>

                        <p className="font-bold text-green-700 mt-1">
                          {Number(
                            selectedPurchaseForPayment.paidAmount
                          ).toFixed(2)}{" "}
                          ETB
                        </p>
                      </div>

                    </div>


                    {/* Remaining */}
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">

                      <p className="text-red-600 font-semibold">
                        Remaining Balance / ቀሪ ሂሳብ
                      </p>

                      <p className="text-xl font-extrabold text-red-700 mt-1">
                        {Number(
                          selectedPurchaseForPayment.remainingBalance
                        ).toFixed(2)}{" "}
                        ETB
                      </p>

                    </div>

                  </div>


                  {/* PAYMENT INFORMATION */}

                  <div className="border-t border-gray-200 pt-4">

                    <h4 className="font-bold text-gray-700 mb-3 text-sm">
                      New Payment / አዲስ ክፍያ
                    </h4>


                    {/* Ethiopian Date */}

                    <div>

                      <label className="block mb-1 font-semibold text-gray-600">
                        Payment Date / የክፍያ ቀን *
                      </label>

                      <div className="grid grid-cols-3 gap-2">

                        {/* Year */}
                        <select
                          value={paymentFormData.date.year}
                          onChange={(e) =>
                            setPaymentFormData((prev) => ({
                              ...prev,
                              date: {
                                ...prev.date,
                                year: Number(
                                  e.target.value
                                ),
                              },
                            }))
                          }
                          required
                          className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                        >
                          {Array.from(
                            { length: 20 },
                            (_, i) => {
                              const currentYear =
                                getTodayEthiopian().year;

                              return (
                                <option
                                  key={i}
                                  value={currentYear - 10 + i}
                                >
                                  {currentYear - 10 + i}
                                </option>
                              );
                            }
                          )}
                        </select>


                        {/* Month */}
                        <select
                          value={paymentFormData.date.month}
                          onChange={(e) =>
                            setPaymentFormData((prev) => ({
                              ...prev,
                              date: {
                                ...prev.date,
                                month: Number(
                                  e.target.value
                                ),
                              },
                            }))
                          }
                          required
                          className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                        >
                          {[
                            "መስከረም",
                            "ጥቅምት",
                            "ኅዳር",
                            "ታኅሣሥ",
                            "ጥር",
                            "የካቲት",
                            "መጋቢት",
                            "ሚያዚያ",
                            "ግንቦት",
                            "ሰኔ",
                            "ሐምሌ",
                            "ነሐሴ",
                            "ጳጉሜ",
                          ].map((monthName, index) => (
                            <option
                              key={index}
                              value={index + 1}
                            >
                              {monthName}
                            </option>
                          ))}
                        </select>


                        {/* Day */}
                        <select
                          value={paymentFormData.date.day}
                          onChange={(e) =>
                            setPaymentFormData((prev) => ({
                              ...prev,
                              date: {
                                ...prev.date,
                                day: Number(
                                  e.target.value
                                ),
                              },
                            }))
                          }
                          required
                          className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                        >
                          {Array.from(
                            { length: 30 },
                            (_, i) => (
                              <option
                                key={i}
                                value={i + 1}
                              >
                                {i + 1}
                              </option>
                            )
                          )}
                        </select>

                      </div>

                    </div>


                    {/* Payment Amount */}

                    <div className="mt-3">

                      <label className="block mb-1 font-semibold text-gray-600">
                        New Payment Amount / የክፍያ መጠን *
                      </label>

                      <input
                        type="number"
                        name="amount"
                        min="1"
                        max={
                          selectedPurchaseForPayment.remainingBalance
                        }
                        step="0.01"
                        value={paymentFormData.amount}
                        onChange={handlePaymentFormChange}
                        required
                        placeholder="e.g. 500"
                        className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                      />

                      <p className="text-[11px] text-gray-400 mt-1">
                        Maximum:
                        {" "}
                        {Number(
                          selectedPurchaseForPayment.remainingBalance
                        ).toFixed(2)}{" "}
                        ETB
                      </p>

                    </div>


                    {/* Bank Reference */}

                    <div className="mt-3">

                      <label className="block mb-1 font-semibold text-gray-600">
                        Bank Ref / Transaction No
                      </label>

                      <input
                        type="text"
                        name="bankPaymentEntry"
                        value={
                          paymentFormData.bankPaymentEntry
                        }
                        onChange={handlePaymentFormChange}
                        placeholder="CBE-..., TELEBIRR-..."
                        className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                      />

                    </div>

                  </div>


                  {/* BUTTONS */}

                  <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-gray-100">

                    <button
                      type="button"
                      onClick={() => {
                        setIsPaymentModalOpen(false);
                        setSelectedPurchaseForPayment(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer"
                    >
                      Cancel / ሰርዝ
                    </button>

                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#5516DA] text-white rounded-lg hover:bg-[#450ec2] transition-all font-semibold cursor-pointer"
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