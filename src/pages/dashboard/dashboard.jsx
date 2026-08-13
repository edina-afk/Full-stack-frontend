import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import CenterLayout from "../../component/pageLayout/centerLayout";
import { MdAdd, MdDelete, MdSearch, MdVisibility, MdPictureAsPdf } from "react-icons/md";
import { toEthiopian } from "ethiopian-date";
import api from "../../api/axios";



export default function ManageEvent() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const normalizeRole = (role) => (role || "").toString().toUpperCase().replace(/[^A-Z]/g, "");
  const isSuperAdmin = normalizeRole(storedUser?.role) === "SUPERADMIN";

  const formatEthiopianDate = (date) => {
    if (!date) return "-";

    const dateString = String(date).split("T")[0];
    const [year, month, day] = dateString.split("-").map(Number);

    if (!year || !month || !day) return "-";

    const normalizedYear = Number(year);
    const normalizedMonth = Number(month);
    const normalizedDay = Number(day);

    if (
      Number.isNaN(normalizedYear) ||
      Number.isNaN(normalizedMonth) ||
      Number.isNaN(normalizedDay)
    ) {
      return "-";
    }

    const [ethYear, ethMonth, ethDay] = toEthiopian(
      normalizedYear,
      normalizedMonth,
      normalizedDay
    );

    return `${ethYear}-${String(ethMonth).padStart(2, "0")}-${String(
      ethDay
    ).padStart(2, "0")}`;
  };
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);


    const customerList = customers.map((customer) => ({
  id: customer.id,
  customerName: customer.fullName || "-",
  phoneNumber: customer.phone || "-",

  // Receipt number comes from Member table
  receiptNumber: customer.receiptNo || "-",

  // Registration date comes from Member table
  date: formatEthiopianDate(customer.createdAt),
}));
  // Filter customers by name, phone, or receipt number
   const filteredCustomers = customerList.filter((c) => {
  const search = searchTerm.toLowerCase();

  return (
    String(c.customerName).toLowerCase().includes(search) ||
    String(c.phoneNumber).toLowerCase().includes(search) ||
    String(c.receiptNumber).toLowerCase().includes(search)
  );
});

  // Function to navigate to the view route (/usermanagement)
  const handleViewCustomer = (customer) => {
    navigate(`/usermanagement/${customer.id}`);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/members");
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const actionButtonBase =
    "inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] sm:text-xs font-medium shadow-sm transition-all duration-200 whitespace-nowrap";
  const viewButtonClass = `${actionButtonBase} border-[#5516DA] bg-[#5516DA] text-white hover:opacity-90`;
  const deleteButtonClass = `${actionButtonBase} border-red-500 bg-red-600 text-white hover:bg-red-700 hover:border-red-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60`;

  const handleExportDashboardPdf = async () => {
    const rows = (filteredCustomers.length ? filteredCustomers : customerList).map((customer) => [
      customer.receiptNumber || "-",
      customer.customerName || "-",
      customer.phoneNumber || "-",
      customer.date || "-",
    ]);

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
    const reportDate = new Date().toLocaleDateString("en-ET", {
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
    doc.text("Customer Dashboard Report", 42, 27);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Mansur Sultan Flour Factory", 42, 35);
    doc.text(`Generated: ${reportDate}`, pageWidth - 58, 35, { align: "right" });

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Dashboard Summary", 14, 52);

    const summaryData = [
      ["Total Customers", String(customers.length)],
      ["Filtered View", String(rows.length)],
      ["Receipt Records", String(new Set(customers.map((customer) => customer.receiptNo).filter(Boolean)).size)],
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

    autoTable(doc, {
      startY: 96,
      head: [["Receipt No", "Customer Name", "Phone Number", "Registration Date"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [85, 22, 218], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      theme: "grid",
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 20, pageHeight - 10, { align: "right" });
        doc.text("Mansur Sultan Flour Factory", 20, pageHeight - 10);
      },
    });

    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customer-dashboard-report.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <CenterLayout>
      <div className="w-full min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
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
              style={{ backgroundColor: "#5516DA" }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 hover:opacity-90 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 cursor-pointer"
            >
              <MdAdd className="text-xl" />
              <span>Add Customer / ደንበኛ ጨምር</span>
            </button>

            <button
              onClick={handleExportDashboardPdf}
              className="w-full sm:w-auto bg-[#5516DA] hover:opacity-90 text-white px-5 py-2.5 rounded-lg transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <MdPictureAsPdf className="text-xl" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 mb-6 w-full">
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
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
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
                {filteredCustomers.length > 0 ? (
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