import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";

export default function UserManagement() {

  const location = useLocation();
  const navigate = useNavigate();

  const { customer } = location.state || {};

  if (!customer) {
    return (
      <CenterLayout>
        <div className="p-6">
          <h2 className="text-xl font-bold">
            Customer not found
          </h2>

          <button
            onClick={() => navigate("/manageevent")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Back
          </button>
        </div>
      </CenterLayout>
    );
  }


  return (
    <CenterLayout>

      <div className="p-6 bg-gray-50 min-h-screen">

        {/* Customer Information */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">

          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Customer Details
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>
              <p className="text-gray-500">
                Name
              </p>
              <p className="font-semibold">
                {customer.fullName}
              </p>
            </div>


            <div>
              <p className="text-gray-500">
                Phone
              </p>
              <p className="font-semibold">
                {customer.phone}
              </p>
            </div>


            <div>
              <p className="text-gray-500">
                Address
              </p>
              <p className="font-semibold">
                {customer.address}
              </p>
            </div>

          </div>

        </div>



        {/* Ledger Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">

          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">
              Ledger History
            </h2>
          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="bg-gray-100">

                <tr>
                  <th className="p-3">
                    Date
                  </th>

                  <th className="p-3">
                    Item
                  </th>

                  <th className="p-3">
                    Quantity
                  </th>

                  <th className="p-3">
                    Unit Price
                  </th>

                  <th className="p-3">
                    Total
                  </th>

                  <th className="p-3">
                    Paid
                  </th>

                  <th className="p-3">
                    Remaining
                  </th>

                  <th className="p-3">
                    Note
                  </th>

                </tr>

              </thead>


              <tbody>

              {customer.ledgers?.length > 0 ? (

                customer.ledgers.map((ledger)=>(
                  
                  <tr 
                    key={ledger.id}
                    className="border-b"
                  >

                    <td className="p-3">
                      {new Date(ledger.date)
                      .toLocaleDateString()}
                    </td>


                    <td className="p-3">
                      {ledger.itemName}
                    </td>


                    <td className="p-3">
                      {ledger.quantity}
                    </td>


                    <td className="p-3">
                      ETB {ledger.unitPrice}
                    </td>


                    <td className="p-3">
                      ETB {ledger.totalPrice}
                    </td>


                    <td className="p-3 text-green-600">
                      ETB {ledger.paidAmount}
                    </td>


                    <td className="p-3 text-red-600">
                      ETB {ledger.remaining}
                    </td>


                    <td className="p-3">
                      {ledger.note || "-"}
                    </td>


                  </tr>

                ))

              ) : (

                <tr>
                  <td 
                    colSpan="8"
                    className="p-6 text-center text-gray-400"
                  >
                    No ledger records found
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