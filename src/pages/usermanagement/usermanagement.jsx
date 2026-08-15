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

  // State setup
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for expanding/collapsing individual payment histories
  const [expandedPurchases, setExpandedPurchases] = useState({});

  const togglePurchaseExpand = (purchaseId) => {
    setExpandedPurchases((prev) => ({
      ...prev,
      [purchaseId]: !prev[purchaseId],
    }));
  };

  const parseGregorianDate = (value) => {
    if (!value) return null;

    const dateString = String(value).includes("T")
      ? String(value).split("T")[0]
      : String(value);

    const [year, month, day] = dateString.split("-").map(Number);

    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day)
    ) {
      return null;
    }

    return { year, month, day };
  };

  const formatEthiopianDate = (value) => {
    const gregorianDate = parseGregorianDate(value);

    if (!gregorianDate) return "-";

    const [ethYear, ethMonth, ethDay] = toEthiopian(
      gregorianDate.year,
      gregorianDate.month,
      gregorianDate.day
    );

    return `${ethYear}-${String(ethMonth).padStart(2, "0")}-${String(
      ethDay
    ).padStart(2, "0")}`;
  };

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
      day: ethDay,
    },
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

  // FETCH CUSTOMERS FROM BACKEND ON MOUNT
  useEffect(() => {
    if (id) {
      fetchCustomers();
    }
  }, [id]);


  const fetchCustomers = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/members/${id}`);
      const customer = response.data;

      console.log("CUSTOMER FROM API:", customer);
      console.log("LEDGERS FROM API:", customer.ledgers);

      const formatGregorianToEthiopian = (dateValue) => {
        if (!dateValue) return "-";

        const dateString = String(dateValue).split("T")[0];
        const [year, month, day] = dateString.split("-").map(Number);

        if (!year || !month || !day) return "-";

        const [ethYear, ethMonth, ethDay] = toEthiopian(
          year,
          month,
          day
        );

        return `${ethYear}-${String(ethMonth).padStart(2, "0")}-${String(
          ethDay
        ).padStart(2, "0")}`;
      };

      const formattedCustomer = {
        id: customer.id,
        customerName: customer.fullName || "",
        phoneNumber: customer.phone || "",
        receiptNumber: customer.receiptNo || "-",

        registrationDate: formatGregorianToEthiopian(
          customer.createdAt
        ),

        purchases: (customer.ledgers || []).map((ledger) => {
          const totalPrice = Number(ledger.totalPrice || 0);

          /*
           * IMPORTANT:
           *
           * paidAmount comes from the BACKEND.
           *
           * Do NOT do:
           *
           * ledger.paidAmount + paymentHistory sum
           *
           * because the backend should already update Ledger.paidAmount
           * when a payment is created.
           */
          const paidAmount = Number(ledger.paidAmount || 0);

          const remainingBalance = Math.max(
            0,
            totalPrice - paidAmount
          );

          const paymentHistory = (ledger.payments || []).map((payment) => ({
            id: payment.id,
            date: payment.date
              ? String(payment.date).split("T")[0]
              : "",
            amount: Number(payment.amount || 0),
            bankPaymentEntry:
              payment.bankPaymentEntry ||
              payment.note ||
              "",
          }));

          return {
            id: ledger.id,

            date: formatGregorianToEthiopian(
              ledger.date
            ),

            /*
             * Keep the backend/Gregorian date separately.
             * This is useful when editing.
             */
            gregorianDate: ledger.date
              ? String(ledger.date).split("T")[0]
              : "",

            receiptNumber: ledger.receiptNo || "",

            bankPaymentEntry: ledger.note || "",

            itemType: ledger.itemName || "",

            quantity: Number(ledger.quantity || 0),

            unitPrice: Number(ledger.unitPrice || 0),

            totalPrice,

            paidAmount,

            remainingBalance,

            paymentHistory,
          };
        }),
      };

      console.log(
        "FORMATTED CUSTOMER:",
        formattedCustomer
      );

      setCustomers([formattedCustomer]);
      setSelectedCustomerId(customer.id);

    } catch (error) {
      console.error(
        "FETCH CUSTOMER ERROR:",
        error.response?.data || error
      );

      setError(
        error.response?.data?.message ||
        "Failed to load customer data"
      );
    } finally {
      setLoading(false);
    }
  };

  const [receiptStatus, setReceiptStatus] = useState("");
  const [receiptAvailable, setReceiptAvailable] = useState(true);

  const checkReceiptExists = async (receiptNo, currentLedgerId = null) => {
    const value = String(receiptNo || "").trim();

    if (!value) {
      setReceiptStatus("");
      setReceiptAvailable(true);
      return false;
    }

    try {
      const res = await api.get(
        `/members/check-receipt/${encodeURIComponent(value)}`
      );

      const exists = Boolean(res.data?.exists);

      /*
       * If editing and this is the same ledger,
       * it is allowed to keep the same receipt number.
       */
      if (exists && currentLedgerId) {
        const currentPurchase = activeCustomer?.purchases?.find(
          (purchase) => String(purchase.id) === String(currentLedgerId)
        );

        if (
          currentPurchase &&
          String(currentPurchase.receiptNumber) === value
        ) {
          setReceiptAvailable(true);
          setReceiptStatus("✅ Current receipt number.");
          return false;
        }
      }

      if (exists) {
        setReceiptAvailable(false);
        setReceiptStatus(
          "❌ This receipt number is already used."
        );
        return true;
      }

      setReceiptAvailable(true);
      setReceiptStatus(
        "✅ Receipt number is available."
      );

      return false;

    } catch (err) {
      console.error(
        "CHECK RECEIPT ERROR:",
        err.response?.data || err
      );

      /*
       * Don't pretend that the receipt is available
       * if the backend check failed.
       */
      setReceiptAvailable(false);
      setReceiptStatus(
        "⚠️ Unable to verify receipt number."
      );

      return true;
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

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      date: { ...prev.date, [name]: parseInt(value, 10) || 1 },
    }));
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

    setReceiptStatus("");
    setReceiptAvailable(true);

    setFormData({
      date: {
        year,
        month,
        day,
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

    let ethDate = {
      year: ethYear,
      month: ethMonth,
      day: ethDay,
    };

    /*
     * purchase.date is Ethiopian for display.
     * Convert it directly into numbers.
     */
    if (purchase.date) {
      const parts = String(purchase.date)
        .split("-")
        .map(Number);

      if (
        parts.length === 3 &&
        parts.every((value) => !Number.isNaN(value))
      ) {
        ethDate = {
          year: parts[0],
          month: parts[1],
          day: parts[2],
        };
      }
    }

    setFormData({
      date: ethDate,

      receiptNumber:
        purchase.receiptNumber || "",

      bankPaymentEntry:
        purchase.bankPaymentEntry || "",

      itemType:
        purchase.itemType || "",

      quantity:
        purchase.quantity ?? "",

      unitPrice:
        purchase.unitPrice ?? "",

      /*
       * This is the CURRENT total paid amount.
       */
      paidAmount:
        purchase.paidAmount ?? "",
    });

    setReceiptAvailable(true);
    setReceiptStatus("");

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

    try {
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
      doc.text(`Generated: ${generatedDate}`, pageWidth - 18, 35, { align: "right" });

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Customer Information", 14, 52);

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
        styles: { fontSize: 9, cellPadding: 3 },
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
    } catch (err) {
      console.error("PDF Export Error:", err);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!activeCustomer) {
      Swal.fire({
        icon: "error",
        title: "Customer not found",
        text: "Unable to identify the customer.",
      });

      return;
    }

    const receiptNo = String(
      formData.receiptNumber || ""
    ).trim();

    if (!receiptNo) {
      Swal.fire({
        icon: "warning",
        title: "Receipt Required",
        text: "Please enter a receipt number.",
      });

      return;
    }

    /*
     * Check receipt only when creating,
     * or when the receipt was actually changed while editing.
     */
    const currentPurchase = editingPurchaseId
      ? activeCustomer.purchases?.find(
        (purchase) =>
          String(purchase.id) ===
          String(editingPurchaseId)
      )
      : null;

    const receiptChanged =
      !currentPurchase ||
      String(currentPurchase.receiptNumber) !== receiptNo;

    if (!editingPurchaseId || receiptChanged) {
      const exists = await checkReceiptExists(
        receiptNo,
        editingPurchaseId
      );

      if (exists) {
        return;
      }
    }

    const qty = Number(formData.quantity);

    const price = Number(formData.unitPrice);

    const paid = Number(formData.paidAmount);

    if (!Number.isFinite(qty) || qty <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Quantity",
        text: "Quantity must be greater than zero.",
      });

      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Unit Price",
        text: "Please enter a valid unit price.",
      });

      return;
    }

    if (!Number.isFinite(paid) || paid < 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Paid Amount",
        text: "Please enter a valid paid amount.",
      });

      return;
    }

    const totalPrice = qty * price;

    if (paid > totalPrice) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Payment",
        text: "Paid amount cannot be greater than total price.",
      });

      return;
    }

    /*
     * Ethiopian -> Gregorian
     */
    const gregorianDate = toGregorian(
      Number(formData.date.year),
      Number(formData.date.month),
      Number(formData.date.day)
    );

    const saveDate =
      `${gregorianDate[0]}-${String(gregorianDate[1]).padStart(
        2,
        "0"
      )}-${String(gregorianDate[2]).padStart(2, "0")}`;

    try {
      setLoading(true);

      /*
       * ==========================
       * EDIT EXISTING LEDGER
       * ==========================
       */
      if (editingPurchaseId) {
        const payload = {
          date: saveDate,

          receiptNo: receiptNo,

          note:
            formData.bankPaymentEntry?.trim() || "",

          itemName:
            formData.itemType?.trim() || "",

          quantity: qty,

          unitPrice: price,

          totalPrice: totalPrice,

          paidAmount: paid,
        };

        console.log(
          "UPDATING LEDGER:",
          editingPurchaseId,
          payload
        );

        const response = await api.patch(
          `/ledger/${editingPurchaseId}`,
          payload
        );

        console.log(
          "UPDATED LEDGER:",
          response.data
        );

        /*
         * VERY IMPORTANT:
         *
         * Don't manually modify the customer here.
         * Reload the customer from the database.
         *
         * This guarantees the screen represents
         * the real backend state.
         */
        await fetchCustomers();

        setIsModalOpen(false);

        setEditingPurchaseId(null);

        Swal.fire({
          icon: "success",
          title: "Updated Successfully!",
          text: "Purchase information was updated.",
          timer: 1500,
          showConfirmButton: false,
        });

        return;
      }

      /*
       * ==========================
       * CREATE NEW LEDGER
       * ==========================
       */

      const payload = {
        memberId: activeCustomer.id,

        date: saveDate,

        receiptNo: receiptNo,

        itemName:
          formData.itemType?.trim() || "",

        note:
          formData.bankPaymentEntry?.trim() || "",

        quantity: qty,

        unitPrice: price,

        /*
         * Backend should calculate totalPrice.
         * We send it too because your current DTO/service
         * appears to accept it.
         */
        totalPrice,

        paidAmount: paid,
      };

      console.log(
        "CREATING LEDGER:",
        payload
      );

      const response = await api.post(
        "/ledger",
        payload
      );

      console.log(
        "CREATED LEDGER:",
        response.data
      );

      /*
       * Reload from backend.
       *
       * Do NOT create fake paymentHistory here.
       */
      await fetchCustomers();

      setIsModalOpen(false);

      Swal.fire({
        icon: "success",
        title: "Added Successfully!",
        text: "New purchase recorded.",
        timer: 1500,
        showConfirmButton: false,
      });

    } catch (err) {
      console.error(
        "SAVE LEDGER ERROR:",
        err.response?.data || err
      );

      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text:
          err.response?.data?.message ||
          "Unable to save transaction.",
      });

    } finally {
      setLoading(false);
    }
  };


  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPurchaseForPayment) {
      return;
    }

    const amount = Number(
      paymentFormData.amount
    );

    const remaining = Number(
      selectedPurchaseForPayment.remainingBalance || 0
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Amount",
        text: "Please enter a valid payment amount.",
      });

      return;
    }

    if (amount > remaining) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Amount",
        text:
          "Payment cannot be greater than the remaining balance.",
      });

      return;
    }

    if (!paymentFormData.date) {
      Swal.fire({
        icon: "warning",
        title: "Payment Date Required",
        text: "Please select a payment date.",
      });

      return;
    }

    const paymentPayload = {
      ledgerId:
        selectedPurchaseForPayment.id,

      date:
        paymentFormData.date,

      amount,

      bankPaymentEntry:
        paymentFormData.bankPaymentEntry?.trim() || "",
    };

    try {
      console.log(
        "ADDING PAYMENT:",
        paymentPayload
      );

      const response = await api.post(
        "/payments",
        paymentPayload
      );

      console.log(
        "PAYMENT RESPONSE:",
        response.data
      );

      /*
       * IMPORTANT:
       *
       * Do not manually increase paidAmount here.
       *
       * Backend should:
       *
       * Payment INSERT
       *       ↓
       * Ledger.paidAmount UPDATE
       *       ↓
       * Frontend GET /members/:id
       */
      await fetchCustomers();

      setIsPaymentModalOpen(false);

      setSelectedPurchaseForPayment(null);

      setPaymentFormData({
        date: new Date()
          .toISOString()
          .split("T")[0],

        amount: "",

        bankPaymentEntry: "",
      });

      Swal.fire({
        icon: "success",
        title: "Payment Recorded!",
        text: "Payment was saved successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

    } catch (err) {
      console.error(
        "ADD PAYMENT ERROR:",
        err.response?.data || err
      );

      Swal.fire({
        icon: "error",
        title: "Payment Failed",
        text:
          err.response?.data?.message ||
          "Unable to record payment.",
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
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await api.delete(
        `/ledger/${purchaseId}`
      );

      /*
       * Reload from database.
       */
      await fetchCustomers();

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Transaction deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

    } catch (error) {
      console.error(
        "DELETE LEDGER ERROR:",
        error.response?.data || error
      );

      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error.response?.data?.message ||
          "Unable to delete the transaction.",
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
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { width: 100%; background: white; margin: 0; padding: 0; font-family: Arial, sans-serif; }
          body * { visibility: hidden; }
          #printable-statement, #printable-statement * { visibility: visible; }
          #printable-statement { position: absolute; top: 0; left: 0; right: 0; margin: auto; width: 95%; max-width: 900px; background: white; color: black; padding: 0; box-sizing: border-box; }
          .no-print { display: none !important; }
          .print-header { display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          table { width: 100% !important; border-collapse: collapse; margin: 0 auto; }
          th, td { padding: 8px; border: 1px solid #ccc; font-size: 12px; }
          button { display: none !important; }
        }
      `}</style>

      <div className="w-full min-h-screen bg-gray-100 pt-1 px-2 sm:px-4 pb-4 md:pt-2 md:px-6 md:pb-6 font-sans box-border overflow-x-hidden">
        {/* Factory Header Banner */}
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

        {/* Details & History Panel */}
        <div id="printable-statement" className="space-y-4 mx-auto w-full max-w-5xl min-w-0">
          {/* Printable Header */}
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
              <p>{new Date().toISOString().split("T")[0]}</p>
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
                  <p className="text-xs font-bold text-gray-400 uppercase">Total Purchases</p>
                  <p className="text-lg sm:text-xl font-extrabold text-gray-800 mt-1 break-words">
                    {activeCustomer.totalSpent.toFixed(2)} <span className="text-xs text-gray-500 font-normal">ETB</span>
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm min-w-0">
                  <p className="text-xs font-bold text-green-600 uppercase">Total Paid</p>
                  <p className="text-lg sm:text-xl font-extrabold text-green-700 mt-1 break-words">
                    {activeCustomer.totalPaid.toFixed(2)} <span className="text-xs text-gray-500 font-normal">ETB</span>
                  </p>
                </div>

                <div className={`p-3.5 rounded-xl border shadow-sm min-w-0 ${activeCustomer.totalBalance > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
                  <p className={`text-xs font-bold uppercase ${activeCustomer.totalBalance > 0 ? "text-red-600" : "text-gray-400"}`}>
                    Remaining Balance
                  </p>
                  <p className={`text-lg sm:text-xl font-extrabold mt-1 break-words ${activeCustomer.totalBalance > 0 ? "text-red-700" : "text-gray-800"}`}>
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
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-700 text-sm">Date / ቀን: {date}</span>
                        <span className="text-xs text-gray-500 font-medium">
                          {items.length} {items.length === 1 ? "Item" : "Items"}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-600 border-collapse">
                          <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-[11px]">
                            <tr>
                              <th className="px-3 py-2">Item</th>
                              <th className="px-3 py-2">Qty</th>
                              <th className="px-3 py-2">Unit Price</th>
                              <th className="px-3 py-2">Total</th>
                              <th className="px-3 py-2">Paid</th>
                              <th className="px-3 py-2">Balance</th>
                              <th className="px-3 py-2">Receipt No</th>
                              <th className="px-3 py-2 no-print text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {items.map((purchase) => {
                              const isExpanded = !!expandedPurchases[purchase.id];
                              const hasPayments = purchase.paymentHistory && purchase.paymentHistory.length > 0;

                              return (
                                <React.Fragment key={purchase.id}>
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium text-gray-800">
                                      <div className="flex items-center gap-1.5">
                                        {hasPayments && (
                                          <button
                                            type="button"
                                            onClick={() => togglePurchaseExpand(purchase.id)}
                                            className="text-xs text-purple-600 hover:text-purple-800 font-bold focus:outline-none cursor-pointer no-print"
                                            title="Toggle Paid History Detail"
                                          >
                                            {isExpanded ? "▼" : "▶"}
                                          </button>
                                        )}
                                        <span>{purchase.itemType}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">{purchase.quantity}</td>
                                    <td className="px-3 py-2">{purchase.unitPrice.toFixed(2)}</td>
                                    <td className="px-3 py-2 font-semibold">{purchase.totalPrice.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-green-600 font-semibold">{purchase.paidAmount.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-red-600 font-semibold">{purchase.remainingBalance.toFixed(2)}</td>
                                    <td className="px-3 py-2">{purchase.receiptNumber || "-"}</td>
                                    <td className="px-3 py-2 no-print text-center space-x-2">
                                      <button
                                        onClick={() => openPaymentModal(purchase)}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                                      >
                                        + Payment
                                      </button>
                                      <button
                                        onClick={() => openEditModal(purchase)}
                                        className="text-xs text-amber-600 hover:text-amber-800 font-medium cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeletePurchase(purchase.id)}
                                        className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>

                                  {/* PAID HISTORY DETAIL SECTION */}
                                  {isExpanded && (
                                    <tr className="bg-purple-50/50">
                                      <td colSpan={8} className="p-3">
                                        <div className="bg-white rounded-lg p-3 border border-purple-200 shadow-inner">
                                          <h4 className="text-xs font-bold text-purple-900 mb-2 flex items-center justify-between">
                                            <span>💳 Payment History Details / የክፍያ ታሪክ ዝርዝር</span>
                                            <span className="text-[11px] font-normal text-gray-500">
                                              Receipt: {purchase.receiptNumber || "N/A"}
                                            </span>
                                          </h4>

                                          {hasPayments ? (
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-left text-[11px] border border-gray-200 rounded">
                                                <thead className="bg-purple-100 text-purple-900 font-semibold">
                                                  <tr>
                                                    <th className="px-2 py-1 border-b">Payment Date</th>
                                                    <th className="px-2 py-1 border-b">Amount (ETB)</th>
                                                    <th className="px-2 py-1 border-b">Bank / Reference Note</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                  {purchase.paymentHistory.map((payment, index) => (
                                                    <tr key={payment.id || index} className="hover:bg-gray-50">
                                                      <td className="px-2 py-1 text-gray-700">{payment.date}</td>
                                                      <td className="px-2 py-1 font-bold text-green-700">
                                                        {payment.amount.toFixed(2)}
                                                      </td>
                                                      <td className="px-2 py-1 text-gray-600">
                                                        {payment.bankPaymentEntry || "-"}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          ) : (
                                            <p className="text-xs text-gray-500 italic">No payments recorded for this purchase yet.</p>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
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
      </div>

      {/* ADD / EDIT PURCHASE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative overflow-hidden">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingPurchaseId ? "Edit Purchase / ግዥ ያስተክሉ" : "Add New Purchase / አዲስ ግዥ ይጨምሩ"}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date (Ethiopian)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    name="day"
                    placeholder="Day"
                    value={formData.date.day}
                    onChange={handleDateChange}
                    className="p-2 border rounded text-xs"
                    required
                  />
                  <input
                    type="number"
                    name="month"
                    placeholder="Month"
                    value={formData.date.month}
                    onChange={handleDateChange}
                    className="p-2 border rounded text-xs"
                    required
                  />
                  <input
                    type="number"
                    name="year"
                    placeholder="Year"
                    value={formData.date.year}
                    onChange={handleDateChange}
                    className="p-2 border rounded text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Receipt Number</label>
                <input
                  type="text"
                  name="receiptNumber"
                  value={formData.receiptNumber}
                  onChange={(e) => {
                    handleFormChange(e);

                    /*
                     * Only check immediately for a new purchase.
                     * For editing, handleFormSubmit performs the proper check.
                     */
                    if (!editingPurchaseId) {
                      checkReceiptExists(e.target.value);
                    }
                  }}
                  className="w-full p-2 border rounded text-xs"
                  required
                />
                {receiptStatus && <p className="text-[11px] mt-1 font-medium">{receiptStatus}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Item Description</label>
                <input
                  type="text"
                  name="itemType"
                  value={formData.itemType}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="any"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Paid Amount</label>
                <input
                  type="number"
                  step="any"
                  name="paidAmount"
                  value={formData.paidAmount}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Bank / Reference Note</label>
                <input
                  type="text"
                  name="bankPaymentEntry"
                  value={formData.bankPaymentEntry}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-gray-600 border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!receiptAvailable}
                  className={`w-full sm:w-auto px-4 py-2 text-white rounded-lg transition-all font-semibold cursor-pointer ${receiptAvailable
                      ? "bg-[#5516DA] hover:bg-[#450ec2]"
                      : "bg-gray-400 cursor-not-allowed"
                    }`}
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

      {/* ADD PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Record Payment / ክፍያ መዝግብ</h3>
            <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Date</label>
                <input
                  type="date"
                  name="date"
                  value={paymentFormData.date}
                  onChange={handlePaymentFormChange}
                  className="w-full p-2 border rounded text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (ETB)</label>
                <input
                  type="number"
                  step="any"
                  name="amount"
                  value={paymentFormData.amount}
                  onChange={handlePaymentFormChange}
                  className="w-full p-2 border rounded text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Bank Reference Note</label>
                <input
                  type="text"
                  name="bankPaymentEntry"
                  value={paymentFormData.bankPaymentEntry}
                  onChange={handlePaymentFormChange}
                  className="w-full p-2 border rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-gray-600 border border-gray-300"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded text-xs text-white bg-[#5516DA] hover:bg-[#450ec2]">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CenterLayout>
  );
}