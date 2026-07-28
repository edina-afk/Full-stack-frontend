import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import api from "../../api/axios";

import {
  MdAdd,
  MdSearch,
  MdVisibility,
  MdPeople,
  MdAttachMoney,
  MdAccountBalanceWallet,
} from "react-icons/md";
 
 
  
 
export default function ManageEvent() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Load stored customers on mount
  
useEffect(() => {
  fetchMembers();
}, []);

const fetchMembers = async () => {
  try {
    const res = await api.get("/members");
    setCustomers(res.data);
  } catch (err) {
    console.log(err.response?.data || err.message);
  }
};

  // Calculate Dashboard Metrics
  
  // Calculate Dashboard Metrics
const totalCustomersCount = customers.length;

const totalRevenue = customers.reduce(
  (sum, customer) =>
    sum +
    customer.ledgers?.reduce(
      (ledgerSum, ledger) =>
        ledgerSum + Number(ledger.totalPrice || 0),
      0
    ),
  0
);

const totalCollected = customers.reduce(
  (sum, customer) =>
    sum +
    customer.ledgers?.reduce(
      (ledgerSum, ledger) =>
        ledgerSum + Number(ledger.paidAmount || 0),
      0
    ),
  0
);

const totalPendingBalance = customers.reduce(
  (sum, customer) =>
    sum +
    customer.ledgers?.reduce(
      (ledgerSum, ledger) =>
        ledgerSum + Number(ledger.remaining || 0),
      0
    ),
  0
);
  // Search filter
const filteredCustomers = customers
  .filter(
    (c) =>
      c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm)
  )
  .sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );

  // Navigation handler for View button
  const handleViewCustomer = (customer) => {
    navigate("/usermanagement", { state: { customer } });
  };

  return (
    <CenterLayout>
      {/* Container stretch fixes applied here */}
      <div className="w-full max-w-full p-4 sm:p-6 bg-gray-50 min-h-screen box-border">
        
        {/* Dashboard Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 w-full">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Customer Dashboard / የደንበኞች ዳሽቦርድ
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track sales, recent customer registrations, and outstanding balances.
            </p>
          </div>
          <button
            onClick={() => navigate("/newevent")}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-xs transition-all duration-200 cursor-pointer shrink-0"
          >
            <MdAdd className="text-xl" />
            <span>Add Customer / ደንበኛ ጨምር</span>
          </button>
        </div>

        {/* Dashboard Key Metrics Cards - Expanded grid columns to take full width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 w-full">
          {/* Card 1: Total Customers */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Customers
              </p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">
                {totalCustomersCount}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <MdPeople className="text-2xl" />
            </div>
          </div>

          {/* Card 2: Total Sales Volume */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Sales Value
              </p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-1">
                ETB {totalRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <MdAttachMoney className="text-2xl" />
            </div>
          </div>

          {/* Card 3: Total Cash Collected */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Collected
              </p>
              <h3 className="text-2xl font-extrabold text-green-700 mt-1">
                ETB {totalCollected.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <MdAccountBalanceWallet className="text-2xl" />
            </div>
          </div>

          {/* Card 4: Outstanding Credit Balance */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Pending Balance
              </p>
              <h3 className="text-2xl font-extrabold text-red-600 mt-1">
                ETB {totalPendingBalance.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <MdAccountBalanceWallet className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Search Bar - Full-width search input */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 mb-6 w-full">
          <div className="relative w-full">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search by name, phone, or receipt number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Recent Customers Table */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden w-full">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Recent Transactions</h2>
            <span className="text-xs font-medium text-gray-500">
              Showing {filteredCustomers.length} entries
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
  <tr>
    <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
    <th className="py-3.5 px-4 whitespace-nowrap">Phone Number</th>
    <th className="py-3.5 px-4 whitespace-nowrap">Address</th>
    <th className="py-3.5 px-4 text-center whitespace-nowrap">Action</th>
  </tr>
</thead>
              <tbody className="divide-y divide-gray-100">
  {filteredCustomers.length > 0 ? (
    filteredCustomers.map((customer, index) => (
      <tr
        key={customer.id || index}
        className="hover:bg-gray-50 transition-colors"
      >
        <td className="py-3.5 px-4 font-medium text-gray-800 whitespace-nowrap">
           {customer.fullName}
        </td>

        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
        {customer.phone}
        </td>

        <td className="py-3.5 px-4 font-semibold text-gray-800 whitespace-nowrap">
         {customer.address}
        </td>

        <td className="py-3.5 px-4 text-center whitespace-nowrap">
          <button
            onClick={() => handleViewCustomer(customer)}
            className="inline-flex items-center gap-1 bg-gray-100 hover:bg-blue-50 text-blue-600 font-medium px-3 py-1.5 rounded-md border border-gray-200 transition-colors text-xs cursor-pointer"
          >
            <MdVisibility className="text-base" />
            <span>View / ዝርዝር</span>
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="4" className="py-8 text-center text-gray-400">
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