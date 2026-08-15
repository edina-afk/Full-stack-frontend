import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import { MdAdd, MdSearch, MdVisibility, MdOutlineRefresh } from "react-icons/md";
import { toEthiopian } from "ethiopian-date";
import api from "../../api/axios";
import Swal from "sweetalert2";

export default function ManageEvent() {
  const navigate = useNavigate();

  // User details & permission
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const normalizeRole = (role) => (role || "").toString().toUpperCase().replace(/[^A-Z]/g, "");
  const isSuperAdmin = normalizeRole(storedUser?.role) === "SUPERADMIN";

  // Component States
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Helper function to safely parse and convert Ethiopian Date
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

  // Fetch customers from backend
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/members");
      setCustomers(res.data || []);
    } catch (err) {
      console.error("Fetch Customers Error:", err);
      Swal.fire({
        icon: "error",
        title: "Error Loading Data",
        text: err?.response?.data?.message || "Failed to fetch customer records.",
      });
    } fontally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Format customer objects for table display (Memoized for performance)
  const customerList = useMemo(() => {
    return customers.map((customer) => ({
      id: customer.id,
      customerName: customer.fullName || "-",
      phoneNumber: customer.phone || "-",
      receiptNumber: customer.receiptNo || "-",
      date: formatEthiopianDate(customer.createdAt),
    }));
  }, [customers]);

  // Filter customers based on search input (Memoized for performance)
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
    const confirm = await Swal.fire({
      title: `Delete ${customer.customerName}?`,
      text: "This action will permanently remove the customer and associated records.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirm.isConfirmed) return;

    try {
      setDeletingId(customer.id);
      Swal.fire({
        title: "Deleting...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      await api.delete(`/members/${customer.id}`);

      // Optimistically remove from state
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));

      Swal.close();
      await Swal.fire("Deleted!", "Customer removed successfully.", "success");
    } catch (err) {
      Swal.close();
      console.error("Delete Error:", err);
      const msg = err?.response?.data?.message || err.message || "Delete failed";
      await Swal.fire("Error", msg, "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <CenterLayout>
      <div className="w-full min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">
              Recently Registered Customers / በቅርብ የተመዘገቡ ደንበኞች
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              View customer history, payment statuses, and detailed receipts.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <button
              onClick={() => navigate("/newevent")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#5516DA] hover:bg-[#4514B8] text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer text-sm"
            >
              <MdAdd className="text-xl" />
              <span>Add Customer / ደንበኛ ጨምር</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => navigate("/create-admin")}
                className="w-full sm:w-auto bg-[#5516DA] hover:bg-[#4514B8] text-white font-medium px-5 py-2.5 rounded-lg transition-all cursor-pointer text-sm"
              >
                Add Admin
              </button>
            )}
          </div>
        </div>

        {/* Search Control */}
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
            title="Refresh list"
            className="p-2.5 text-gray-500 hover:text-[#5516DA] hover:bg-gray-100 rounded-lg transition-all"
          >
            <MdOutlineRefresh className="text-xl" />
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Receipt No</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Phone Number</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Action</th>
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
                      <td className="py-3.5 px-4 font-medium text-gray-900 whitespace-nowrap">
                        {customer.receiptNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800 whitespace-nowrap">
                        {customer.customerName}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                        {customer.phoneNumber}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        {customer.date}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="inline-flex items-center justify-center gap-1 bg-[#5516DA] hover:bg-[#4514B8] text-white font-medium px-3 py-1.5 rounded-md transition-colors text-xs cursor-pointer shadow-xs"
                        >
                          <MdVisibility className="text-base" />
                          <span>View / ዝርዝር</span>
                        </button>

                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            disabled={deletingId === customer.id}
                            className="ml-2 inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-md transition-colors text-xs cursor-pointer"
                          >
                            <span>{deletingId === customer.id ? "Deleting..." : "Delete"}</span>
                          </button>
                        )}
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