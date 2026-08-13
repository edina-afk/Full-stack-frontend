import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import api from "../../api/axios";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toGregorian, toEthiopian } from "ethiopian-date";

export default function UserManagement() {
  const navigate = useNavigate();
  const { id } = useParams();
  console.log("CUSTOMER ID:", id);

  // State setup
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState(id || null);

  // Modal State for adding/editing purchase
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const today = new Date();

  const [ethYear, ethMonth, ethDay] = toEthiopian(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  const [formData, setFormData] = useState({
    date: {
      year: ethYear,
      month: ethMonth,
      day: ethDay
    },
    receiptNumber: "",
    bankPaymentEntry: "",
    itemType: "",
    quantity: "",
    unitPrice: "",
    paidAmount: "",
  });

  // Modal State for adding individual payments (Payment Calendar/History)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    bankPaymentEntry: "",
  });

  // Keep selectedCustomerId in sync if route param changes
  useEffect(() => {
    if (id) {
      setSelectedCustomerId(id);
    }
  }, [id]);

  // 1. FETCH CUSTOMERS FROM BACKEND ON MOUNT
  useEffect(() => {

    if (id) {
      fetchCustomers();
    }

  }, [id]);
   const fetchCustomers = async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await api.get(`/members/${id}`);

    const customer = response.data;

    console.log("CUSTOMER FROM API:", customer);
    console.log("LEDGERS FROM API:", customer.ledgers);

    const formattedCustomer = {
      id: customer.id,
      customerName: customer.fullName,
      phoneNumber: customer.phone,
      receiptNumber: customer.receiptNo || "-",
      registrationDate: customer.createdAt
        ? (() => {
            const [year, month, day] = String(customer.createdAt).split("T")[0].split("-").map(Number);
            const [ethYear, ethMonth, ethDay] = toEthiopian(year, month, day);
            return `${ethYear}-${String(ethMonth).padStart(2, "0")}-${String(ethDay).padStart(2, "0")}`;
          })()
        : "-",

      purchases: (customer.ledgers || []).map((ledger) => {
        const gDate = new Date(ledger.date);

        const [ethYear, ethMonth, ethDay] = toEthiopian(
          gDate.getUTCFullYear(),
          gDate.getUTCMonth() + 1,
          gDate.getUTCDate()
        );

        const totalPrice = Number(ledger.totalPrice || 0);

        const payments = (ledger.payments || []).map((pay) => ({
          ...pay,
          date: pay.date
            ? pay.date.split("T")[0]
            : "",
          amount: Number(pay.amount || 0),
        }));

        const paidAmount =
          Number(ledger.paidAmount || 0) +
          payments.reduce(
            (sum, payment) => sum + Number(payment.amount || 0),
            0
          );

        return {
          id: ledger.id,

          date: `${ethYear}-${String(ethMonth).padStart(2, "0")}-${String(
            ethDay
          ).padStart(2, "0")}`,

          receiptNumber: ledger.receiptNo || "",

          bankPaymentEntry: ledger.note || "",

          itemType: ledger.itemName || "",

          quantity: Number(ledger.quantity || 0),

          unitPrice: Number(ledger.unitPrice || 0),

          totalPrice,

          paidAmount,

          remainingBalance: Math.max(
            0,
            totalPrice - paidAmount
          ),

          paymentHistory: payments,
        };
      }),
    };

    console.log("FORMATTED CUSTOMER:", formattedCustomer);
    console.log("PURCHASES:", formattedCustomer.purchases);

    setCustomers([formattedCustomer]);
    setSelectedCustomerId(customer.id);

  } catch (error) {
    console.error("FETCH CUSTOMER ERROR:", error);

    setError("Failed to load customer data");
  } finally {
    setLoading(false);
  }
};
  const [receiptStatus, setReceiptStatus] = useState("");
  const [receiptAvailable, setReceiptAvailable] = useState(true);

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


  // Dynamic calculations per customer
  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const purchases = c.purchases || [];
      const totalSpent = purchases.reduce((sum, p) => sum + (Number(p.totalPrice) || 0), 0);
      const totalPaid = purchases.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
      const totalBalance = purchases.reduce((sum, p) => sum + (Number(p.remainingBalance) || 0), 0);
      return {
        ...c,
        totalSpent,
        totalPaid,
        totalBalance,
      };
    });
  }, [customers]);

  const activeCustomer = useMemo(() => {
    return enrichedCustomers.find((c) => String(c.id) === String(selectedCustomerId)) || enrichedCustomers[0];
  }, [enrichedCustomers, selectedCustomerId]);

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

    const today = new Date();

    const [year, month, day] = toEthiopian(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );

    setEditingPurchaseId(null);

    setFormData({
      date: {
        year,
        month,
        day
      },
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

    const [year, month, day] = purchase.date
      ? String(purchase.date).split("-").map(Number)
      : [ethYear, ethMonth, ethDay];

    setFormData({
      date: {
        year,
        month,
        day,
      },
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

  const handleExportCustomerStatementPdf = async () => {
    if (!activeCustomer) return;

    const logoResponse = await fetch("/image.png");
    const logoBlob = await logoResponse.blob();
    const logoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(logoBlob);
    });

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedDate = new Date().toLocaleDateString("en-ET", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    doc.setFillColor(85, 22, 218);
    doc.rect(14, 14, pageWidth - 28, 32, "F");
    doc.addImage(logoDataUrl, "PNG", 20, 18, 18, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Customer Statement", 42, 27);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Mansur Sultan Flour Factory", 42, 35);
    doc.text(`Generated: ${generatedDate}`, pageWidth - 52, 35, { align: "right" });

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Customer Information", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const customerInfo = [
      ["Customer Name", activeCustomer.customerName || "-"],
      ["Phone Number", activeCustomer.phoneNumber || "-"],
      ["Receipt Number", activeCustomer.receiptNumber || activeCustomer.purchases?.[0]?.receiptNumber || "-"],
      ["Registration Date", activeCustomer.registrationDate || "-"],
      ["Total Purchases", `${Number(activeCustomer.totalSpent || 0).toFixed(2)} ETB`],
      ["Total Paid", `${Number(activeCustomer.totalPaid || 0).toFixed(2)} ETB`],
      ["Remaining Balance", `${Number(activeCustomer.totalBalance || 0).toFixed(2)} ETB`],
    ];

    autoTable(doc, {
      startY: 58,
      body: customerInfo,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", cellWidth: 52 },
        1: { cellWidth: 110 },
      },
      margin: { left: 14, right: 14 },
    });

    const purchaseTableBody = (activeCustomer.purchases || []).map((item) => [
      item.date || "-",
      item.itemType || "-",
      String(item.quantity || 0),
      `${Number(item.unitPrice || 0).toFixed(2)}`,
      `${Number(item.totalPrice || 0).toFixed(2)}`,
      `${Number(item.paidAmount || 0).toFixed(2)}`,
      `${Number(item.remainingBalance || 0).toFixed(2)}`,
      item.receiptNumber || "-",
      item.bankPaymentEntry || "-",
    ]);

    let currentY = doc.lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Purchase / Ledger Details", 14, currentY);

    autoTable(doc, {
      startY: currentY + 4,
      head: [["Date", "Item", "Qty", "Unit Price", "Total", "Paid", "Balance", "Receipt", "Bank Ref"]],
      body: purchaseTableBody.length ? purchaseTableBody : [["-", "-", "-", "-", "-", "-", "-", "-", "-"]],
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [85, 22, 218], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      theme: "grid",
      pageBreak: "auto",
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 20, pageHeight - 10, { align: "right" });
      },
    });

    const paymentRows = (activeCustomer.purchases || []).flatMap((item) =>
      (item.paymentHistory || []).map((payment) => [
        item.receiptNumber || "-",
        payment.date || "-",
        payment.bankPaymentEntry || "-",
        `${Number(payment.amount || 0).toFixed(2)}`,
      ])
    );

    if (paymentRows.length) {
      const paymentY = doc.lastAutoTable.finalY + 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Payment Details", 14, paymentY);

      autoTable(doc, {
        startY: paymentY + 4,
        head: [["Receipt", "Payment Date", "Bank Ref", "Amount"]],
        body: paymentRows,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        theme: "grid",
      });
    }

    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(activeCustomer.customerName || "customer").replace(/\s+/g, "-")}-statement.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 2. CREATE OR UPDATE PURCHASE ENTRY IN BACKEND & LOCAL STATE
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


    const saveDate =
      `${gregorianDate[0]}-${String(gregorianDate[1]).padStart(2, "0")}-${String(gregorianDate[2]).padStart(2, "0")}`;
    const totalPrice = qty * price;

    const paid = Math.min(
      parseFloat(formData.paidAmount) || 0,
      totalPrice
    );
    const remainingBalance = Math.max(0, totalPrice - paid);

    const initialPayment = paid > 0 ? [{
      id: `pay_${Date.now()}`,
      date: saveDate, // payment dates must be Gregorian
      amount: paid,
      bankPaymentEntry: formData.bankPaymentEntry || ""
    }] : [];

    try {
      if (editingPurchaseId) {

        const payload = {

          date: saveDate,
          receiptNo:
            formData.receiptNumber,

          note: formData.bankPaymentEntry,

          itemName: formData.itemType,

          quantity: qty,

          unitPrice: price,

          totalPrice,

          paidAmount: paid

        };


        const response = await api.patch(
          `/ledger/${editingPurchaseId}`,
          payload
        );


        const updatedLedger = response.data;


        setCustomers((prevCustomers) =>

          prevCustomers.map((cust) => {

            if (String(cust.id) === String(activeCustomer.id)) {

              return {

                ...cust,

                purchases:

                  cust.purchases.map((p) => {

                    if (p.id === editingPurchaseId) {

                      return {

                        ...p,

                        date:
                          updatedLedger.date.split("T")[0],

                        receiptNumber:
                          updatedLedger.receiptNo,

                        bankPaymentEntry:
                          updatedLedger.note || "",

                        itemType:
                          updatedLedger.itemName || "",

                        quantity:
                          Number(updatedLedger.quantity),

                        unitPrice:
                          Number(updatedLedger.unitPrice),

                        totalPrice:
                          Number(updatedLedger.totalPrice),

                        paidAmount:
                          Number(updatedLedger.paidAmount),

                        remainingBalance:
                          Number(updatedLedger.totalPrice) -
                          Number(updatedLedger.paidAmount),

                      };

                    }

                    return p;

                  })

              };

            }


            return cust;

          })

        );


      }
      else {

        const payload = {

          memberId: activeCustomer.id,

          date: saveDate,
          receiptNo: formData.receiptNumber,

          itemName: formData.itemType,

          note: formData.bankPaymentEntry,

          quantity: qty,

          unitPrice: price,

          paidAmount: paid

        };

        const response = await api.post(
          "/ledger",
          payload
        );


        const ledger = response.data;


        const newPurchase = {

          id: ledger.id,

          date: ledger.date.split("T")[0],

          receiptNumber:
            ledger.receiptNo,

          bankPaymentEntry:
            ledger.note || "",

          itemType:
            ledger.itemName,
          quantity:
            Number(ledger.quantity),

          unitPrice:
            Number(ledger.unitPrice),

          totalPrice:
            Number(ledger.totalPrice),

          paidAmount:
            Number(ledger.paidAmount),

          remainingBalance:
            Number(ledger.totalPrice) -
            Number(ledger.paidAmount),


          paymentHistory:
            initialPayment
        };


        setCustomers((prevCustomers) =>

          prevCustomers.map((cust) => {

            if (String(cust.id) === String(activeCustomer.id)) {

              return {

                ...cust,

                purchases: [
                  newPurchase,
                  ...(cust.purchases || [])
                ]

              };

            }

            return cust;

          })

        );

      }

      setIsModalOpen(false);

      if (editingPurchaseId) {
        navigate(-1);
      }

      Swal.fire({
        icon: "success",
        title: editingPurchaseId
          ? "Updated Successfully!"
          : "Added Successfully!",
        text: editingPurchaseId
          ? "Purchase information updated."
          : "New purchase recorded.",
        timer: 1500,
        showConfirmButton: false,
      });
    }
    catch (err) {

      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Unable to save transaction.",
      });

    }
  };

  // ADD INDIVIDUAL PAYMENT ENTRY (DATE-BASED PAYMENT RECORD)
  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPurchaseForPayment) return;

    const newPaymentAmount = parseFloat(paymentFormData.amount) || 0;
    const [ethYear, ethMonth, ethDay] = paymentFormData.date
      .split("-")
      .map(Number);

     

    const paymentDate = paymentFormData.date;

    const paymentPayload = {

      ledgerId: selectedPurchaseForPayment.id,

      date: paymentDate,

      amount: newPaymentAmount,

      bankPaymentEntry:
        paymentFormData.bankPaymentEntry || ""

    };
    if (newPaymentAmount <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Amount",
        text: "Please enter a valid payment amount.",
      });
      return;
    }

    try {
      const response = await api.post(
        "/payments",
        paymentPayload
      );


      const savedPayment = response.data;
      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) => {
          if (String(cust.id) === String(activeCustomer.id)) {
            return {
              ...cust,
              purchases: cust.purchases.map((p) => {
                if (p.id === selectedPurchaseForPayment.id) {
                  const existingHistory = p.paymentHistory || [];
                  const newHistoryEntry = {
                    id: `pay_${Date.now()}`,
                    date: paymentFormData.date.split("T")[0],
                    amount: newPaymentAmount,
                    bankPaymentEntry: paymentFormData.bankPaymentEntry || "",
                  };
                  const updatedHistory = [...existingHistory, newHistoryEntry];

                  const updatedPaidAmount = updatedHistory.reduce((sum, pay) => sum + pay.amount, 0);
                  const updatedRemainingBalance = Math.max(0, p.totalPrice - updatedPaidAmount);

                  return {
                    ...p,
                    paidAmount: updatedPaidAmount,
                    remainingBalance: updatedRemainingBalance,
                    bankPaymentEntry: paymentFormData.bankPaymentEntry || p.bankPaymentEntry,
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

      Swal.fire({
        icon: "success",
        title: "Payment Recorded!",
        text: "Payment history updated successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchCustomers();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Payment Failed",
        text: "Unable to record payment.",
      });
    }
  };

  // 3. SETTLE BALANCE IN BACKEND & LOCAL STATE

  // 4. DELETE TRANSACTION FROM BACKEND & LOCAL STATE
  const handleDeletePurchase = async (purchaseId) => {

    const result = await Swal.fire({
      title: "Delete Transaction?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;


    try {

      await api.delete(
        `/ledger/${purchaseId}`


      );

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Transaction deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
      setCustomers((prevCustomers) =>

        prevCustomers.map((cust) => {

          if (String(cust.id) === String(activeCustomer.id)) {

            return {

              ...cust,

              purchases:

                cust.purchases.filter(
                  (p) => p.id !== purchaseId
                )

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

     <div className="w-full min-h-screen bg-gray-100 pt-1 px-2 sm:px-4 pb-4 md:pt-2 md:px-6 md:pb-6 font-sans box-border overflow-x-hidden">

      {/* Factory Header Banner (Screen Only) */}
      <div className="bg-[#5516DA] text-white rounded-xl p-3 sm:p-4 mb-4 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 no-print">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-extrabold tracking-wide break-words">
            መንሱር ሱልጣን ዱቄት ፋብሪካ
          </h1>

          <p className="text-[11px] sm:text-xs text-purple-200 break-words">
            Mansur Sultan Flour Factory — Customer Ledger
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="text-xs text-purple-200 hover:text-white underline cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          Back / ተመለስ
        </button>
      </div>


      {/* Full-width Details & History Panel */}
      <div
        id="printable-statement"
        className="space-y-4 mx-auto w-full max-w-5xl min-w-0"
      >

        {/* Printable Header - Visible ONLY in Print Mode */}
        <div className="print-header hidden items-center border-b-2 border-gray-800 pb-4 mb-4">
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
            <p className="font-bold text-gray-800">
              Date / ቀን:
            </p>

            <p>
              {new Date().toISOString().split("T")[0]}
            </p>
          </div>
        </div>


        {activeCustomer && (
          <>

            {/* Profile Banner */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:text-center">

              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                  {activeCustomer.customerName}
                </h2>

                <p className="text-sm text-gray-500 break-words">
                  Phone: {activeCustomer.phoneNumber}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 no-print w-full lg:w-auto">

                <button
                  onClick={handleExportCustomerStatementPdf}
                  className="bg-[#5516DA] hover:bg-[#450ec2] text-white font-semibold text-sm px-3 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                  title="Export customer statement as PDF"
                >
                  Export PDF
                </button>

                <button
                  onClick={openAddModal}
                  className="bg-[#5516DA] hover:bg-[#450ec2] text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                >
                  + Add New Purchase / አዲስ ግዥ
                </button>

              </div>
            </div>


            {/* KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase">
                  Total Purchases
                </p>

                <p className="text-lg sm:text-xl font-extrabold text-gray-800 mt-1 break-words">
                  {activeCustomer.totalSpent.toFixed(2)}{" "}
                  <span className="text-xs text-gray-500 font-normal">
                    ETB
                  </span>
                </p>
              </div>


              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm min-w-0">
                <p className="text-xs font-bold text-green-600 uppercase">
                  Total Paid
                </p>

                <p className="text-lg sm:text-xl font-extrabold text-green-700 mt-1 break-words">
                  {activeCustomer.totalPaid.toFixed(2)}{" "}
                  <span className="text-xs text-gray-500 font-normal">
                    ETB
                  </span>
                </p>
              </div>


              <div
                className={`p-3.5 rounded-xl border shadow-sm min-w-0 ${
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
                  className={`text-lg sm:text-xl font-extrabold mt-1 break-words ${
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
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full min-w-0"
                  >

                    {/* Group Header */}
                    <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">

                      <span className="font-bold text-gray-700 text-xs tracking-wide uppercase break-words">
                        📅 Date: {date}
                      </span>

                      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                        {items.length} item(s)
                      </span>

                    </div>


                    {/* Items Table */}
                    <div className="w-full overflow-x-auto">

                      <table className="w-full min-w-[850px] text-left text-xs border-collapse">

                        <thead className="bg-white text-gray-400 border-b border-gray-100 font-bold uppercase">

                          <tr>
                            <th className="p-2.5 whitespace-nowrap">
                              Receipt
                            </th>

                            <th className="p-2.5 whitespace-nowrap">
                              Item
                            </th>

                            <th className="p-2.5 text-right whitespace-nowrap">
                              Qty
                            </th>

                            <th className="p-2.5 text-right whitespace-nowrap">
                              Price
                            </th>

                            <th className="p-2.5 text-right whitespace-nowrap">
                              Total
                            </th>

                            <th className="p-2.5 text-right whitespace-nowrap">
                              Paid
                            </th>

                            <th className="p-2.5 text-right whitespace-nowrap">
                              Balance
                            </th>

                            <th className="p-2.5 whitespace-nowrap">
                              Bank Ref
                            </th>

                            <th className="p-2.5 text-center no-print whitespace-nowrap">
                              Actions
                            </th>
                          </tr>

                        </thead>


                        <tbody className="divide-y divide-gray-100 text-gray-700">

                          {items.map((item) => (

                            <React.Fragment key={item.id}>

                              <tr className="hover:bg-gray-50/80 transition-colors">

                                <td className="p-2.5 font-semibold text-gray-800 whitespace-nowrap">
                                  {item.receiptNumber}
                                </td>

                                <td className="p-2.5 font-medium max-w-[180px] truncate">
                                  {item.itemType}
                                </td>

                                <td className="p-2.5 text-right whitespace-nowrap">
                                  {item.quantity}
                                </td>

                                <td className="p-2.5 text-right whitespace-nowrap">
                                  {Number(item.unitPrice).toFixed(2)}
                                </td>

                                <td className="p-2.5 text-right font-bold text-gray-900 whitespace-nowrap">
                                  {Number(item.totalPrice).toFixed(2)}
                                </td>

                                <td className="p-2.5 text-right text-green-700 font-semibold whitespace-nowrap">
                                  {Number(item.paidAmount).toFixed(2)}
                                </td>

                                <td
                                  className={`p-2.5 text-right font-bold whitespace-nowrap ${
                                    item.remainingBalance > 0
                                      ? "text-red-600"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {Number(item.remainingBalance).toFixed(2)}
                                </td>

                                <td className="p-2.5 text-gray-400 text-[11px] max-w-[150px] truncate">
                                  {item.bankPaymentEntry || "-"}
                                </td>

                                <td className="p-2.5 text-center no-print">

                                  <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">

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


                              {/* Payment History Detailed Section */}
                              {item.paymentHistory &&
                                item.paymentHistory.length > 0 && (

                                  <tr className="bg-gray-50/50">

                                    <td
                                      colSpan="9"
                                      className="p-2 px-3 sm:px-4 border-t border-dashed border-gray-200"
                                    >

                                      <div className="text-[11px] text-gray-600 font-medium space-y-1">

                                        <p className="font-bold text-gray-700">
                                          📜 Payment History / የክፍያ ታሪክ:
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">

                                          {item.paymentHistory.map((pay) => (

                                            <div
                                              key={pay.id}
                                              className="bg-white p-1.5 rounded border border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-1 shadow-2xs min-w-0"
                                            >

                                              <span className="break-words">
                                                📅{" "}
                                                {typeof pay.date === "object"
                                                  ? `${pay.date.year}-${pay.date.month}-${pay.date.day}`
                                                  : pay.date}
                                              </span>

                                              <span className="font-bold text-green-700 whitespace-nowrap">
                                                {Number(pay.amount).toFixed(2)} ETB
                                              </span>

                                              {pay.bankPaymentEntry && (
                                                <span className="text-[10px] text-gray-400 break-all">
                                                  ({pay.bankPaymentEntry})
                                                </span>
                                              )}

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
      {isModalOpen && (

        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-center items-start sm:items-center p-2 sm:p-4 no-print overflow-y-auto">

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-hidden my-2 sm:my-4">

            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 bg-gray-50 gap-3">

              <h3 className="text-sm sm:text-md font-bold text-gray-800 break-words min-w-0">
                {editingPurchaseId
                  ? "Edit Transaction"
                  : `New Entry for ${activeCustomer.customerName}`}
              </h3>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer flex-shrink-0"
              >
                ✕
              </button>

            </div>


            <form
              onSubmit={handleFormSubmit}
              className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs overflow-y-auto max-h-[calc(95vh-70px)]"
            >

              <div>

                <label className="block mb-1 font-semibold text-gray-600">
                  Date (ቀን) *
                </label>

                {/* Ethiopian Year */}
                <select
                  value={formData.date.year}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date: {
                        ...prev.date,
                        year: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full p-2 border rounded mb-2"
                >
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i} value={2010 + i}>
                      {2010 + i}
                    </option>
                  ))}
                </select>


                {/* Ethiopian Month */}
                <select
                  value={formData.date.month}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date: {
                        ...prev.date,
                        month: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full p-2 border rounded mb-2"
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
                    <option key={index} value={index + 1}>
                      {monthName}
                    </option>
                  ))}
                </select>


                {/* Ethiopian Day */}
                <select
                  value={formData.date.day}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date: {
                        ...prev.date,
                        day: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full p-2 border rounded"
                >
                  {Array.from({ length: 30 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>

              </div>


              <div>

                <label className="block mb-1 font-semibold text-gray-600">
                  Receipt No *
                </label>

                <input
                  type="text"
                  name="receiptNumber"
                  value={formData.receiptNumber}
                  onChange={(e) => {
                    handleFormChange(e);
                    checkReceiptExists(e.target.value);
                  }}
                  required
                  placeholder="REC-..."
                  className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                />

                <p
                  className={`text-sm mt-1 ${
                    receiptAvailable
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {receiptStatus}
                </p>

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


              <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-3 border-t border-gray-100">

                <button
                  type="button"
                  onClick={async () => {

                    const result = await Swal.fire({
                      title: "Cancel?",
                      text: "Your entered data will be lost.",
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonText: "Yes, Cancel",
                      cancelButtonText: "Continue Editing",
                    });

                    if (result.isConfirmed) {
                      setIsModalOpen(false);
                    }

                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer"
                >
                  Cancel / ሰርዝ
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-[#5516DA] text-white rounded-lg hover:bg-[#450ec2] transition-all font-semibold cursor-pointer"
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


      {/* Modal: Add Payment with Date Calendar */}
      {isPaymentModalOpen && selectedPurchaseForPayment && (

        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-center items-start sm:items-center p-2 sm:p-4 no-print overflow-y-auto">

          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-2 sm:my-4">

            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 bg-gray-50 gap-3">

              <div className="min-w-0">

                <h3 className="text-sm sm:text-md font-bold text-gray-800">
                  Record Payment / ክፍያ መዝግብ
                </h3>

                <p className="text-xs text-gray-500">
                  Remaining:{" "}
                  <span className="text-red-600 font-bold">
                    {selectedPurchaseForPayment.remainingBalance.toFixed(2)} ETB
                  </span>
                </p>

              </div>

              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer flex-shrink-0"
              >
                ✕
              </button>

            </div>


            <form
              onSubmit={handleAddPaymentSubmit}
              className="p-3 sm:p-5 flex flex-col gap-3 text-xs"
            >

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
                  Payment Amount (ክፍያ መጠን - ETB) *
                </label>

                <input
                  type="number"
                  name="amount"
                  min="1"
                  max={selectedPurchaseForPayment.remainingBalance}
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={handlePaymentFormChange}
                  required
                  placeholder="e.g. 500"
                  className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                />

              </div>


              <div>

                <label className="block mb-1 font-semibold text-gray-600">
                  Bank Ref / Transaction No (የባንክ ማረጋገጫ)
                </label>

                <input
                  type="text"
                  name="bankPaymentEntry"
                  value={paymentFormData.bankPaymentEntry}
                  onChange={handlePaymentFormChange}
                  placeholder="CBE-..., TELEBIRR-..."
                  className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#5516DA]"
                />

              </div>


              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-3 border-t border-gray-100">

                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer"
                >
                  Cancel / ሰርዝ
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold cursor-pointer"
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