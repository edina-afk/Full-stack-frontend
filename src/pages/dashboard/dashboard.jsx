import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import CenterLayout from "../../component/pageLayout/centerLayout";
import {
  MdAdd,
  MdDelete,
  MdSearch,
  MdVisibility,
  MdPictureAsPdf,
  MdOutlineRefresh,
} from "react-icons/md";
import { toEthiopian } from "ethiopian-date";
import api from "../../api/axios";

export default function ManageEvent() {
  const navigate = useNavigate();

  // Auth / Role context
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const normalizeRole = (role) => (role || "").toString().toUpperCase().replace(/[^A-Z]/g, "");
  const isSuperAdmin = normalizeRole(storedUser?.role) === "SUPERADMIN";

  // State Management
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Safe Ethiopian Date Formatter
  const formatEthiopianDate = (date) => {
    if (!date) return "-";
    try {
      const dateString = String(date).split("T")[0];
      const [year, month, day] = dateString.split("-").map(Number);

      if (!year || !month || !day) return "-";

      const [ethYear, ethMonth, ethDay] = toEthiopian(year, month, day);

      return `${ethYear}-${String(ethMonth).padStart(2, "0")}-${String(ethDay).padStart(2, "0")}`;
    } catch (err) {
      console.error("Ethiopian Date Conversion Error:", err);
      return "-";
    }
  };

  // Fetch data
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/members");
      setCustomers(res.data || []);
    } catch (err) {
      console.error("Fetch Customers Error:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to load data",
        text: err?.response?.data?.message || "Could not retrieve customer records.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Memoized customer mapping
  const customerList = useMemo(() => {
    return customers.map((customer) => ({
      id: customer.id,
      customerName: customer.fullName || "-",
      phoneNumber: customer.phone || "-",
      receiptNumber: customer.receiptNo || "-",
      date: formatEthiopianDate(customer.createdAt),
    }));
  }, [customers]);

  // Memoized search filtering
  const filteredCustomers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return customerList;

    return customerList.filter((c) =>
      String(c.customerName).toLowerCase().includes(search) ||
      String(c.phoneNumber).toLowerCase().includes(search) ||
      String(c.receiptNumber).toLowerCase().includes(search)
    );
  }, [customerList, searchTerm]);

  // Navigation handlers
  const handleViewCustomer = (customer) => {
    navigate(`/usermanagement/${customer.id}`);
  };

  // Delete handler
  const handleDeleteCustomer = async (customer) => {
    const result = await Swal.fire({
      title: `Delete ${customer.customerName}?`,
      text: "This will permanently remove the customer and all related purchases and payments.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingId(customer.id);
      Swal.fire({
        title: "Deleting...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      await api.delete(`/members/${customer.id}`);
      setCustomers((prev) => prev.filter((item) => String(item.id) !== String(customer.id)));

      Swal.close();
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Customer removed successfully.",
      });
    } catch (err) {
      Swal.close();
      const message = err?.response?.data?.message || err?.message || "Delete failed";
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: message,
      });
    } finally {
      setDeletingId(null);
    }
  };

  // PDF Export Function
  const handleExportDashboardPdf = async () => {
    const rows = (filteredCustomers.length ? filteredCustomers : customerList).map((customer) => [
      customer.receiptNumber || "-",
      customer.customerName || "-",
      customer.phoneNumber || "-",
      customer.date || "-",
    ]);

    // Load logo safely with fallback
    let logoDataUrl = null;
    try {
      const logoResponse = await fetch("/image.png");
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        logoDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoBlob);
        });
      }
    } catch (e) {
      console.warn("Logo image could not be loaded for PDF header:", e);
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const reportDate = new Date().toLocaleDateString("en-ET", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // Header Banner
    doc.setFillColor(85, 22, 218);
    doc.rect(14, 14, pageWidth - 28, 32, "F");

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 20, 18, 18, 18);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Customer Dashboard Report", logoDataUrl ? 42 : 20, 27);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Mansur Sultan Flour Factory", logoDataUrl ? 42 : 20, 35);
    doc.text(`Generated: ${reportDate}`, pageWidth - 20, 35, { align: "right" });

    // Dashboard Summary Section
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Dashboard Summary", 14, 52);

    const summaryData = [
      ["Total Customers", String(customers.length)],
      ["Filtered View", String(rows.length)],
      ["Receipt Records", String(new Set(customers.map((c) => c.receiptNo).filter(Boolean)).size)],
      ["Last Updated", reportDate],
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    summaryData.forEach(([label, value], index) => {
      const x = 14 + (index % 2) * 92;
      const y = 60 + Math.floor(index / 2) * 12;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, 82, 10, 2, 2, "F");
      doc.setTextColor(75, 85, 99);
      doc.text(label, x + 4, y + 6.5);
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.text(String(value), x + 58, y + 6.5);
      doc.setFont("helvetica", "normal");
    });

    // Main Table
    autoTable(doc, {
      startY: 96,
      head: [["Receipt No", "Customer Name", "Phone Number", "Registration Date"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [85, 22, 218], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      theme: "grid",
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
          pageWidth - 20,
          pageHeight - 10,
          { align: "right" }
        );
        doc.text("Mansur Sultan Flour Factory", 20, pageHeight - 10);
      },
    });

    doc.save(`customer-dashboard-report-${Date.now()}.pdf`);
  };

  const actionButtonBase =
    "inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] sm:text-xs font-medium shadow-xs transition-all duration-200 whitespace-nowrap cursor-pointer";
  const viewButtonClass = `${actionButtonBase} border-[#5516DA] bg-[#5516DA] text-white hover:opacity-90`;
  const deleteButtonClass = `${actionButtonBase} border-red-500 bg-red-600 text-white hover:bg-red-700 hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-60`;

  return (
    <CenterLayout>
      <div className="w-full min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">
              Recently Registered Customers / በቅርብ የተመዘገቡ ደንበኞች
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              View customer history, payment statuses, and detailed receipts.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-shrink-0">
            <button
              onClick={() => navigate("/newevent")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#5516DA] hover:opacity-90 text-white font-medium px-4 py-2.5 rounded-lg shadow-xs transition-all duration-200 cursor-pointer text-sm"
            >
              <MdAdd className="text-xl" />
              <span>Add Customer / ደንበኛ ጨምር</span>
            </button>

            <button
              onClick={handleExportDashboardPdf}
              className="w-full sm:w-auto bg-[#5516DA] hover:opacity-90 text-white px-5 py-2.5 rounded-lg transition cursor-pointer shadow-xs flex items-center justify-center gap-2 text-sm font-medium"
            >
              <MdPictureAsPdf className="text-xl" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Search & Refresh Toolbar */}
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xs border border-gray-200 mb-6 w-full flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search by name, phone, or receipt number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5516DA] focus:bg-white transition-all"
            />
          </div>

          <button
            onClick={fetchCustomers}
            title="Refresh List"
            className="p-2 text-gray-500 hover:text-[#5516DA] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <MdOutlineRefresh className="text-xl" />
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Receipt No</th>
                  <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Customer Name</th>
                  <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Phone Number</th>
                  <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Date</th>
                  <th className="py-3 px-3 sm:py-3.5 sm:px-4 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#5516DA] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-medium">Loading customer records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="py-3 px-3 sm:py-3.5 sm:px-4 font-medium text-gray-900 whitespace-nowrap">
                        {customer.receiptNumber}
                      </td>

                      <td className="py-3 px-3 sm:py-3.5 sm:px-4 font-medium text-gray-800 whitespace-nowrap">
                        {customer.customerName}
                      </td>

                      <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-gray-600 whitespace-nowrap">
                        {customer.phoneNumber}
                      </td>

                      <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-gray-500 whitespace-nowrap">
                        {customer.date}
                      </td>

                      <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewCustomer(customer)}
                            className={viewButtonClass}
                          >
                            <MdVisibility className="text-base" />
                            <span>View / ዝርዝር</span>
                          </button>

                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteCustomer(customer)}
                              disabled={deletingId === customer.id}
                              className={deleteButtonClass}
                            >
                              <MdDelete className="text-base" />
                              <span>{deletingId === customer.id ? "Deleting..." : "Delete"}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 px-4 text-center text-gray-400">
                      No matching records found / ምንም መረጃ አልተገኘም
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CenterLayout>
  );
}