import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CenterLayout from "../../component/pageLayout/centerLayout";
import api from "../../api/axios";
import { toGregorian, toEthiopian } from "ethiopian-date";

export default function NewEvent() {
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [receiptStatus, setReceiptStatus] = useState("");
  const [receiptAvailable, setReceiptAvailable] = useState(false);
  const [isCheckingReceipt, setIsCheckingReceipt] = useState(false);

  // Initialize Ethiopian Date
  const today = new Date();
  const ethToday = toEthiopian(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    ethiopianDate: {
      year: ethToday[0],
      month: ethToday[1],
      day: ethToday[2],
    },
    itemName: "",
    quantity: "",
    unitPrice: "",
    paidAmount: "",
    receiptNumber: "",
    bankPaymentEntry: "",
  });

  // Calculated Values
  const quantity = Number(formData.quantity) || 0;
  const unitPrice = Number(formData.unitPrice) || 0;
  const paidAmount = Number(formData.paidAmount) || 0;
  const totalPrice = quantity * unitPrice;
  const remaining = totalPrice - paidAmount;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Receipt Checker Routine
  const checkReceipt = async (receiptNo) => {
    const value = receiptNo.trim();

    if (!value) {
      setReceiptStatus("");
      setReceiptAvailable(false);
      return false;
    }

    setIsCheckingReceipt(true);
    try {
      const response = await api.get(
        `/members/check-receipt/${encodeURIComponent(value)}`
      );

      if (response.data?.exists) {
        setReceiptAvailable(false);
        setReceiptStatus("❌ This receipt number is already used");
        return false;
      } else {
        setReceiptAvailable(true);
        setReceiptStatus("✅ Receipt number available");
        return true;
      }
    } catch (error) {
      console.error("CHECK RECEIPT ERROR:", error.response?.data || error);
      setReceiptAvailable(false);
      setReceiptStatus("❌ Could not check receipt number");
      return false;
    } finally {
      setIsCheckingReceipt(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // Re-verify receipt on submit if not already validated
    let isReceiptValid = receiptAvailable;
    if (!isReceiptValid) {
      isReceiptValid = await checkReceipt(formData.receiptNumber);
    }

    if (!isReceiptValid) {
      setErrorMsg("Please enter a valid and unused receipt number.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Convert Ethiopian Date to Gregorian ISO String
      const greg = toGregorian(
        formData.ethiopianDate.year,
        formData.ethiopianDate.month,
        formData.ethiopianDate.day
      );
      const saveDate = `${greg[0]}-${String(greg[1]).padStart(2, "0")}-${String(
        greg[2]
      ).padStart(2, "0")}`;

      // 2. Create Member Record
      const memberResponse = await api.post("/members", {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        receiptNo: formData.receiptNumber,
      });

      const member = memberResponse.data;

      // 3. Create Ledger Entry
      await api.post("/ledger", {
        memberId: member.id,
        date: saveDate,
        itemName: formData.itemName,
        receiptNo: formData.receiptNumber,
        quantity,
        unitPrice,
        paidAmount,
        note: `${formData.receiptNumber} ${formData.bankPaymentEntry}`.trim(),
      });

      // Redirect upon success
      navigate("/manageevent");
    } catch (error) {
      console.error("Submit Error:", error);
      const backendMessage =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred while saving.";
      
      setErrorMsg(
        Array.isArray(backendMessage) ? backendMessage.join(", ") : backendMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CenterLayout>
      <div className="w-full min-w-0 box-border p-3 sm:p-4 lg:p-8 bg-white rounded-lg shadow-md font-sans">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800 border-b-2 border-gray-200 pb-2 break-words">
          Add Customer / ደንበኛ መመዝገቢያ
        </h2>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded break-words text-sm">
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {/* Customer Name */}
          <div className="flex flex-col min-w-0">
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
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone Number */}
          <div className="flex flex-col min-w-0">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Phone Number (ስልክ ቁጥር)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="09..."
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Address */}
          <div className="flex flex-col min-w-0">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Address (አድራሻ)
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter customer address"
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Ethiopian Date Selectors */}
          <div className="flex flex-col min-w-0">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Date (ቀን)
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
              <select
                value={formData.ethiopianDate.year}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ethiopianDate: {
                      ...prev.ethiopianDate,
                      year: Number(e.target.value),
                    },
                  }))
                }
                className="w-full min-w-0 p-2 border rounded text-sm sm:text-base bg-white"
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i} value={ethToday[0] - 5 + i}>
                    {ethToday[0] - 5 + i}
                  </option>
                ))}
              </select>

              <select
                value={formData.ethiopianDate.month}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ethiopianDate: {
                      ...prev.ethiopianDate,
                      month: Number(e.target.value),
                    },
                  }))
                }
                className="w-full min-w-0 p-2 border rounded text-sm sm:text-base bg-white"
              >
                {[
                  "መስከረም",
                  "ጥቅምት",
                  "ኅዳር",
                  "ታኅሣሥ",
                  "ጥር",
                  "የካቲት",
                  "መጋቢት",
                  "ሚያዚያ",
                  "ግንቦት",
                  "ሰኔ",
                  "ሐምሌ",
                  "ነሐሴ",
                  "ጳጉሜ",
                ].map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={formData.ethiopianDate.day}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ethiopianDate: {
                      ...prev.ethiopianDate,
                      day: Number(e.target.value),
                    },
                  }))
                }
                className="w-full min-w-0 p-2 border rounded text-sm sm:text-base bg-white"
              >
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bank Payment Entry */}
          <div className="flex flex-col min-w-0">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Bank Payment Entry (የባንክ ክፍያ መመዝገቢያ)
            </label>
            <input
              type="text"
              name="bankPaymentEntry"
              value={formData.bankPaymentEntry}
              onChange={handleChange}
              placeholder="e.g. Ref No / Transaction ID"
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Item Type */}
          <div className="flex flex-col min-w-0">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Item Type (የእቃው አይነት) *
            </label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              required
              placeholder="e.g. የስንዴ ዱቄት 50ኪ.ግ"
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Receipt Number */}
          <div className="flex flex-col min-w-0">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Receipt Number (ደረሰኝ ቁጥር) *
            </label>
            <input
              type="text"
              name="receiptNumber"
              value={formData.receiptNumber}
              onChange={(e) => {
                handleChange(e);
                setReceiptAvailable(false);
                setReceiptStatus("");
              }}
              onBlur={(e) => checkReceipt(e.target.value)}
              required
              placeholder="e.g. REC-1024"
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p
              className={`text-xs sm:text-sm mt-1 font-medium ${
                isCheckingReceipt
                  ? "text-gray-500"
                  : receiptAvailable
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {isCheckingReceipt ? "Checking availability..." : receiptStatus}
            </p>
          </div>

          {/* Quantity */}
          <div className="flex flex-col min-w-0">
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
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Unit Price */}
          <div className="flex flex-col min-w-0">
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
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Total Price (Auto Computed) */}
          <div className="flex flex-col min-w-0">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Total Price (ጠቅላላ ዋጋ) [Auto]
            </label>
            <input
              type="number"
              value={totalPrice.toFixed(2)}
              readOnly
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base bg-gray-100 cursor-not-allowed outline-none font-semibold text-gray-700"
            />
          </div>

          {/* Paid Amount */}
          <div className="flex flex-col min-w-0">
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
              className="w-full min-w-0 p-2.5 rounded border border-gray-300 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Remaining Balance (Auto Computed) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col min-w-0">
            <label className="mb-1.5 text-sm font-semibold text-gray-700">
              Remaining Balance (ቀሪ) [Auto]
            </label>
            <input
              type="number"
              value={remaining.toFixed(2)}
              readOnly
              className={`w-full min-w-0 p-2.5 rounded border border-gray-300 text-base bg-gray-100 cursor-not-allowed outline-none font-bold ${
                remaining > 0 ? "text-red-600" : "text-green-700"
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 mt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-medium px-6 py-3 rounded text-base cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel / ሰርዝ
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isCheckingReceipt}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded text-base cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving... / በመመዝገብ ላይ..." : "Save / መዝግብ"}
            </button>
          </div>
        </form>
      </div>
    </CenterLayout>
  );
}