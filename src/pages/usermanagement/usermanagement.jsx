import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import { MdAdd, MdSearch, MdVisibility } from "react-icons/md";
import api from "../../api/axios";
 

export default function ManageEvent() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  
  const customerList = customers.map((customer) => ({
  ...customer,
  customerName: customer.fullName,
  phoneNumber: customer.phone,
  receiptNumber:
    customer.ledgers?.[0]?.receiptNo || "-",
  date:
    customer.ledgers?.[0]?.date?.split("T")[0] || "-",
  }));

  
  // Filter customers by name, phone, or receipt number
  const filteredCustomers = customerList.filter(
  (c) =>
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phoneNumber.includes(searchTerm) ||
    c.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase())
);

  // Function to navigate to the view route (/usermanagement)
   const handleViewCustomer = (customer) => {
  navigate("/usermanagement", {
    state: { customer },
  });
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



  return (
    <CenterLayout>
      <div className="w-full p-6 bg-gray-50 min-h-screen">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Recently Registered Customers / በቅርብ የተመዘገቡ ደንበኞች
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View customer history, payment statuses, and detailed receipts.
            </p>
          </div>
          <button
            onClick={() => navigate("/newevent")}
            style={{ backgroundColor: "#5516DA" }}
            className="flex items-center justify-center gap-2 hover:opacity-90 text-white font-medium px-4 py-2.5 rounded-lg shadow-xs transition-all duration-200 cursor-pointer"
          >
            <MdAdd className="text-xl" />
            <span>Add Customer / ደንበኛ ጨምር</span>
          </button>
        </div>

        {/* Controls: Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 mb-6">
          <div className="relative max-w-md w-full">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search by name, phone, or receipt number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5516DA] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Customer Data Table */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Receipt No</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    return (
                      <tr key={customer.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-gray-900">
                          {customer.receiptNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-800">
                          {customer.customerName}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {customer.phoneNumber}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          {customer.date}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleViewCustomer(customer)}
                            style={{ backgroundColor: "#5516DA" }}
                            className="inline-flex items-center gap-1 hover:opacity-90 text-white font-medium px-3 py-1.5 rounded-md transition-colors text-xs cursor-pointer shadow-xs"
                          >
                            <MdVisibility className="text-base" />
                            <span>View / ዝርዝር</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400">
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