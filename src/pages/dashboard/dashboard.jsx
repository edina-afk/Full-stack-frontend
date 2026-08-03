import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../api/axios";
import Swal from "sweetalert2";

import {
  MdAdd,
  MdSearch,
  MdVisibility,
  MdPeople,
  MdAttachMoney,
  MdAccountBalanceWallet,
} from "react-icons/md";
import { MdDelete } from "react-icons/md";



export default function ManageEvent() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // Options: "all", "balance", "paid"


  
  useEffect(() => {
    fetchMembers();
  }, []);


  const fetchMembers = async () => {

    try {

      const res = await api.get("/members");

      console.log("MEMBERS RESPONSE:", res.data);
      console.log("IS ARRAY:", Array.isArray(res.data));


      setCustomers(
        Array.isArray(res.data)
          ? res.data
          : []
      );


    } catch (err) {

      console.log(
        err.response?.data || err.message
      );

      setCustomers([]);

    }

  };

  // Dashboard calculations

  const totalCustomersCount = customers.length;

   // Status breakdown counts
  const countPaid = customers.filter((c) => Number(c.remainingBalance || 0) <= 0).length;
  const countBalance = customers.filter((c) => Number(c.remainingBalance || 0) > 0).length;




  const  totalPurchases = customers.reduce(
    (sum, customer) => {

      const ledgers = Array.isArray(customer.ledgers)
        ? customer.ledgers
        : [];


      return (
        sum +
        ledgers.reduce(
          (ledgerSum, ledger) =>
            ledgerSum + Number(ledger.totalPrice || 0),
          0
        )
      );

    },
    0
  );




  const totalPaid = customers.reduce(
    (sum, customer) => {

      const ledgers = Array.isArray(customer.ledgers)
        ? customer.ledgers
        : [];


      return (
        sum +
        ledgers.reduce(
          (ledgerSum, ledger) =>
            ledgerSum + Number(ledger.paidAmount || 0),
          0
        )
      );

    },
    0
  );




  const  remainingBalance = customers.reduce(
    (sum, customer) => {

      const ledgers = Array.isArray(customer.ledgers)
        ? customer.ledgers
        : [];


      return (
        sum +
        ledgers.reduce(
          (ledgerSum, ledger) =>
            ledgerSum + Number(ledger.remaining || 0),
          0
        )
      );

    },
    0
  );



  // Search

 const filteredCustomers = customers
  .filter(
    (customer) =>
      customer.fullName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())

      ||

      customer.phone
        ?.includes(searchTerm)

      ||

       customer.ledgers?.some((ledger) =>
         ledger.receiptNo
    ?.toLowerCase()
    .includes(searchTerm.toLowerCase())
)

      ||

      customer.ledgers?.some((ledger) =>
        ledger.date
          ?.toString()
          .includes(searchTerm)
      )
  )
  .sort(
    (a, b) =>
      a.fullName.localeCompare(b.fullName)
  );

// Navigation handler for View button
  const handleViewCustomer = (customer) => {
    navigate("/usermanagement", { state: { customer } });
  };

   const exportPDF = () => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Customer Report", 14, 20);

   const tableData = filteredCustomers.map((customer) => {
  const latestLedger = customer.ledgers?.[0];

  return [
    latestLedger?.receiptNo || "-",
    customer.fullName,
    customer.phone,
    latestLedger?.date
      ? new Date(latestLedger.date).toLocaleDateString()
      : "-",
    customer.address || "-",
      ];
   });


  autoTable(doc, {
  head: [
    [
      "Receipt No",
      "Customer Name",
      "Phone",
      "Date",
      "Address"
    ]
  ],
  body: tableData,
  startY: 30,
});

  doc.save("customers-report.pdf");
};

 
const handleDelete = async (id) => {

  const result = await Swal.fire({
    title: "Are you sure?",
    text: "This customer will be permanently deleted!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#5516DA",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel"
  });


  if (!result.isConfirmed) return;


  try {

    await api.delete(`/members/${id}`);

    fetchMembers();


    Swal.fire({
      title: "Deleted!",
      text: "Customer deleted successfully.",
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });


  } catch (err) {

    console.error(err);

    Swal.fire({
      title: "Error!",
      text: "Failed to delete customer.",
      icon: "error"
    });

  }
};


   return (
    <CenterLayout>
      <div className="w-full max-w-full p-4 sm:p-6 bg-stone-50 min-h-screen box-border">
        
        {/* Dashboard Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 w-full">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              መንሱር ሱልጣን ዱቄት ፋብሪካ / Customer Dashboard
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Track sales, recent customer registrations, and outstanding balances.
            </p>
          </div>

                 <button
    onClick={exportPDF}
    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow transition"
  >
    📄 Export PDF
  </button>
          
          <button
            onClick={() => navigate("/newevent")}
            style={{ backgroundColor: "#5516DA" }}
            className="flex items-center justify-center gap-2 hover:opacity-90 text-white font-semibold px-5 py-2.5 rounded-lg shadow-xs transition-all duration-200 cursor-pointer shrink-0"
          >
            <MdAdd className="text-xl" />
            <span>Add Customer / ደንበኛ ጨምር</span>
          </button>
        </div>

        {/* Dashboard Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 w-full">
          {/* Card 1: Total Customers */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Customers
              </p>
              <h3 className="text-2xl font-extrabold text-stone-800 mt-1">
                {totalCustomersCount}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 text-[#5516DA] rounded-lg">
              <MdPeople className="text-2xl" />
            </div>
          </div>

          {/* Card 2: Total Purchases */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Purchases
              </p>
              <h3 className="text-2xl font-extrabold text-stone-800 mt-1">
                ETB {totalPurchases.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-purple-100 text-[#5516DA] rounded-lg">
              <MdAttachMoney className="text-2xl" />
            </div>
          </div>

          {/* Card 3: Total Paid */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Total Paid
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">
                ETB {totalPaid.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <MdAccountBalanceWallet className="text-2xl" />
            </div>
          </div>

          {/* Card 4: Remaining Balance */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Remaining Balance
              </p>
              <h3 className="text-2xl font-extrabold text-red-600 mt-1">
                ETB {remainingBalance.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <MdAccountBalanceWallet className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Search Bar & Filter Controls */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-stone-200 mb-6 w-full flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-1/2">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xl" />
            <input
              type="text"
              placeholder="Search by name, phone, or receipt number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5516DA] focus:bg-white transition-all"
            />
          </div>

          {/* Filter Tabs: All, Has Balance, Fully Paid */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg w-full md:w-auto shrink-0">
            <button
              onClick={() => setStatusFilter("all")}
              style={statusFilter === "all" ? { backgroundColor: "#5516DA" } : {}}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setStatusFilter("balance")}
              style={statusFilter === "balance" ? { backgroundColor: "#5516DA" } : {}}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                statusFilter === "balance"
                  ? "text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              }`}
            >
              Has Balance / ዕዳ ያለበት ({countBalance})
            </button>
            <button
              onClick={() => setStatusFilter("paid")}
              style={statusFilter === "paid" ? { backgroundColor: "#5516DA" } : {}}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                statusFilter === "paid"
                  ? "text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              }`}
            >
              Fully Paid / የተከፈለ ({countPaid})
            </button>
          </div>
        </div>

        {/* Recent Customers Table */}
        <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden w-full">
          <div className="p-4 border-b border-stone-200 bg-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-800">Recent Transactions</h2>
            <span className="text-xs font-medium text-stone-500">
              Showing {filteredCustomers.length} entries
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-stone-600">
              <thead className="bg-stone-200 text-stone-800 font-semibold border-b border-stone-300">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Receipt No</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Phone Number</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, index) => {
                      const latestLedger = customer.ledgers?.[0];
                    return (
                      <tr key={customer.id || index} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-stone-900 whitespace-nowrap">
                          {latestLedger?.receiptNo || index + 1}
                         </td>
                        <td className="py-3.5 px-4 font-medium text-stone-800 whitespace-nowrap">
                          {customer.fullName}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 whitespace-nowrap">
                          {customer.phone}
                        </td>
                       <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap">
                           {latestLedger?.date
                         ? new Date(latestLedger.date).toLocaleDateString()
                          : "-"
  }
</td>
                     <td className="py-3.5 px-4 text-center whitespace-nowrap">
  <div className="flex items-center justify-center gap-2">
    <button
      onClick={() => handleViewCustomer(customer)}
      style={{ backgroundColor: "#5516DA" }}
      className="inline-flex items-center gap-1 text-white px-3 py-1.5 rounded-md"
    >
      <MdVisibility />
      <span>View</span>
    </button>

    <button
      onClick={() => handleDelete(customer.id)}
      className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md"
    >
      <MdDelete />
      <span>Delete</span>
    </button>
  </div>
</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-stone-400">
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
