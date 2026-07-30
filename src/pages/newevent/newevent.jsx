import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import api from "../../api/axios";

export default function NewEvent() {
  const navigate = useNavigate();

  // Loading & Error States for API integration
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
   const [formData,setFormData] = useState({

 fullName:"",
 phone:"",
 address:"",

 date:new Date().toISOString().split("T")[0],

 itemName:"",
 quantity:"",
 unitPrice:"",
 paidAmount:"",

 receiptNumber:"",
 bankPaymentEntry:""

});

  // Dynamic calculations on render
  
 
const quantity = Number(formData.quantity) || 0;

const unitPrice = Number(formData.unitPrice) || 0;

const paidAmount = Number(formData.paidAmount) || 0;


const totalPrice = quantity * unitPrice;

const remaining = totalPrice - paidAmount;

  const handleChange=(e)=>{

 const {name,value}=e.target;

 setFormData(prev=>({

  ...prev,

  [name]:value

 }));

};

const handleSubmit = async(e)=>{

e.preventDefault();

setIsSubmitting(true);
setErrorMsg("");

try{


// CREATE MEMBER
 const memberResponse = await api.post("/members", {
  fullName: formData.fullName,
  phone: formData.phone,
  address: formData.address,
});

const member = memberResponse.data;

// CREATE LEDGER
await api.post("/ledger", {
  memberId: member.id,
  date: formData.date,
  itemName: formData.itemName,
  quantity,
  unitPrice,
  paidAmount,
  note: `${formData.receiptNumber} ${formData.bankPaymentEntry}`,
});

// SUCCESS

navigate("/manageevent");


}catch(error){

console.log(error);

setErrorMsg(error.message);


}finally{

setIsSubmitting(false);

}

};  
 
    
  return (
    <CenterLayout>
      <div className="w-full box-border p-8 bg-white rounded-lg shadow-md font-sans">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b-2 border-gray-200 pb-2">
          Add Customer / ደንበኛ መመዝገቢያ
        </h2>

        {/* Display Error Alert if API fails */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Customer Name */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Customer Name (የደንበኛ ስም) *
            </label>
            <input
               type="text"
               name="fullName"
               value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Enter customer name"
              className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Phone Number */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Phone Number (ስልክ ቁጥር) *
            </label>
               <input
type="tel"
name="phone"
value={formData.phone}
onChange={handleChange}
required
placeholder="09..."

              className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Address */}
<div className="flex flex-col">
  <label className="mb-1.5 text-sm font-semibold text-gray-700">
    Address (አድራሻ)
  </label>

  <input
    type="text"
    name="address"
    value={formData.address}
    onChange={handleChange}
    placeholder="Enter customer address"
    className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
</div>

          {/* Date */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Date (ቀን) *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Bank Payment Entry */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Bank Payment Entry (የባንክ ክፍያ መመዝገቢያ)
            </label>
            <input
              type="text"
              name="bankPaymentEntry"
              value={formData.bankPaymentEntry}
              onChange={handleChange}
              placeholder="e.g. Ref No / Transaction ID"
              className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Item Type */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Item Type (የእቃው አይነት) *
            </label>
           <input
type="text"
name="itemName"
value={formData.itemName}
onChange={handleChange}
required
placeholder="e.g. Cement, Rebar, Paint"
className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
            
          </div>

          {/* Receipt Number */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Receipt Number (ደረሰኝ ቁጥር) *
            </label>
            <input
              type="text"
              name="receiptNumber"
              value={formData.receiptNumber}
              onChange={handleChange}
              required
              placeholder="e.g. REC-1024"
              className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quantity */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Quantity (ብዛት) *
            </label>
            <input
              type="number"
              name="quantity"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
              required
              placeholder="0"
              className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Unit Price */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Unit Price (የአንዱ ዋጋ) *
            </label>
            <input
              type="number"
              name="unitPrice"
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={handleChange}
              required
              placeholder="0.00"
              className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Total Price (Auto Calculated) */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Total Price (ጠቅላላ ዋጋ) [Auto]
            </label>
            <input
              type="number"
              value={totalPrice.toFixed(2)}
              readOnly
              className="p-2.5 rounded border border-gray-300 text-base bg-gray-100 cursor-not-allowed outline-none"
            />
          </div>

          {/* Paid Amount */}
          <div className="flex flex-col">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Paid Amount (የተከፈለው) *
            </label>
            <input
              type="number"
              name="paidAmount"
              min="0"
              step="0.01"
              value={formData.paidAmount}
              onChange={handleChange}
              required
              placeholder="0.00"
              className="p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Remaining Balance (Auto Calculated) */}
          <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Remaining Balance (ቀሪ) [Auto]
            </label>
            <input
              type="number"
             value={remaining.toFixed(2)}
              readOnly
              className={`p-2.5 rounded border border-gray-300 text-base bg-gray-100 cursor-not-allowed outline-none font-bold ${
                 remaining > 0 ? "text-red-600" : "text-green-700"
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end gap-4 mt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium px-6 py-3 rounded text-base cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel / ሰርዝ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded text-base cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving... / በመመዝገብ ላይ..." : "Save / መዝግብ"}
            </button>
          </div>

        </form>
      </div>
    </CenterLayout>
  );
}