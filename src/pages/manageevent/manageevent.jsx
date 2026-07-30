import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import { MdAdd, MdSearch, MdVisibility } from "react-icons/md";
import api from "../../api/axios";

export default function ManageEvent() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

   

  return (
    <CenterLayout>
      <div className="w-full p-6 bg-gray-50 min-h-screen">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Recently Registered Customers
            </h1>
            <p className="text-gray-500">
              Customer List
            </p>
          </div>

          <button
            onClick={() => navigate("/newevent")}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
          >
            <MdAdd />
            Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-md">
            <MdSearch className="absolute left-3 top-3 text-gray-400" />

            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded pl-10 py-2"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Customer Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Address</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredCustomers.length > 0 ? (

                filteredCustomers.map((customer) => (

                  <tr
                    key={customer.id}
                    className="border-t"
                  >

                    <td className="p-3">
                      {customer.fullName}
                    </td>

                    <td className="p-3">
                      {customer.phone}
                    </td>

                    <td className="p-3">
                      {customer.address || "-"}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleViewCustomer(customer)}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        <MdVisibility />
                        View
                      </button>
                    </td>

                  </tr>

                ))

              ) : (

                <tr>
                  <td
                    colSpan="4"
                    className="text-center p-5"
                  >
                    No customers found.
                  </td>
                </tr>

              )}

            </tbody>

          </table>
        </div>

      </div>
    </CenterLayout>
  );
}