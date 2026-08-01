import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import api from "../../api/axios";


export default function UserManagement() {

  const location = useLocation();
  const navigate = useNavigate();

  const { customer } = location.state || {};


  const [editingId, setEditingId] = useState(null);

  const [editData, setEditData] = useState({});



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



  const handleEdit = (ledger) => {

    setEditingId(ledger.id);

    setEditData({

      quantity: ledger.quantity,

      unitPrice: ledger.unitPrice,

      paidAmount: ledger.paidAmount

    });

  };




  const handleChange = (e) => {

    setEditData({

      ...editData,

      [e.target.name]: e.target.value

    });

  };





  const handleSave = async(id)=>{

    try{

       await api.patch(`/ledger/${id}`,{

        quantity:Number(editData.quantity),

        unitPrice:Number(editData.unitPrice),

        paidAmount:Number(editData.paidAmount)

      });



      setEditingId(null);


      alert("Ledger updated successfully");


    }catch(error){

      console.log(error);

      alert("Update failed");

    }

  };





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
                {customer.address || "-"}
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
              Receipt No
            </th>
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


                  <th className="p-3">
                    Action
                  </th>



                </tr>


              </thead>





              <tbody>



              {
              customer.ledgers?.length > 0 ?


              customer.ledgers.map((ledger)=>(



                <tr
                key={ledger.id}
                className="border-b"
                >




                  <td className="p-3">

                    {new Date(
                      ledger.date
                    ).toLocaleDateString()}

                  </td>





                  <td className="p-3">

                    {ledger.itemName}

                  </td>
             

             <td className="p-3">
  {ledger.receiptNo || "-"}
</td>


      

                  <td className="p-3">


                  {
                    editingId === ledger.id ?


                    <input

                    name="quantity"

                    value={editData.quantity}

                    onChange={handleChange}

                    className="border p-1 w-20"

                    />


                    :

                    ledger.quantity

                  }


                  </td>







                  <td className="p-3">


                  {

                  editingId === ledger.id ?


                  <input

                  name="unitPrice"

                  value={editData.unitPrice}

                  onChange={handleChange}

                  className="border p-1 w-24"

                  />


                  :

                  `ETB ${ledger.unitPrice}`

                  }



                  </td>







                  <td className="p-3">

                    ETB {ledger.totalPrice}

                  </td>







                  <td className="p-3 text-green-600">


                  {

                  editingId === ledger.id ?


                  <input

                  name="paidAmount"

                  value={editData.paidAmount}

                  onChange={handleChange}

                  className="border p-1 w-24"

                  />


                  :

                  `ETB ${ledger.paidAmount}`

                  }



                  </td>







                  <td className="p-3 text-red-600">

                    ETB {ledger.remaining}

                  </td>







                  <td className="p-3">

                    {ledger.note || "-"}

                  </td>







                  <td className="p-3">


                  {

                  editingId === ledger.id ?


                  <button

                  onClick={()=>handleSave(ledger.id)}

                  className="bg-green-600 text-white px-3 py-1 rounded"

                  >

                  Save

                  </button>



                  :



                  <button

                  onClick={()=>handleEdit(ledger)}

                  className="bg-blue-600 text-white px-3 py-1 rounded"

                  >

                  Edit

                  </button>


                  }



                  </td>






                </tr>



              ))



              :



              <tr>

                <td
                colSpan="10"
                className="p-6 text-center text-gray-400"
                >

                No ledger records found

                </td>

              </tr>


              }



              </tbody>




            </table>


          </div>



        </div>





      </div>


    </CenterLayout>

  );

}