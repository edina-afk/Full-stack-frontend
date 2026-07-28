import React, { useState } from "react";
import CenterLayout from "../../component/pageLayout/centerLayout";
import {
  FaUser,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaBirthdayCake,
  FaBriefcase,
  FaSignOutAlt,
  FaEdit,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { GiWheat } from "react-icons/gi";

function User() {
  const [editing, setEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    fullName: "መሐመድ አሊ",
    address: "አዲስ አበባ",
    phone: "0911234567",
    email: "admin@mensursultan.com",
    dateOfBirth: "ጥር 1, 1990",
    occupation: "ፋብሪካ አስተዳዳሪ (Factory Admin)",
  });

  const handleChange = (e) => {
    setUserInfo({
      ...userInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = () => {
    setEditing(false);
  };

  const handleLogout = () => {
    console.log("Logged out");
  };

  return (
    <CenterLayout>
      <div className="w-full max-w-4xl mx-auto my-6 p-6 sm:p-8 bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-8">
        
        {/* Left Section: Avatar & Divider */}
        <div className="flex flex-col md:flex-row items-center gap-6 shrink-0 self-stretch">
          <div className="flex flex-col items-center">
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-[#5516DA] rounded-full flex items-center justify-center shadow-inner ring-4 ring-[#E1DCFF]">
              <FaUser className="text-5xl text-white" />
            </div>
            <span className="mt-3 px-3 py-1 bg-purple-50 text-[#5516DA] text-xs font-medium rounded-full">
              {userInfo.occupation.split(" ")[0]}
            </span>
          </div>

          {/* Vertical Divider for Desktop / Horizontal for Mobile */}
          <div className="hidden md:block w-px bg-gray-200 self-stretch my-2"></div>
          <div className="block md:hidden w-full h-px bg-gray-200"></div>
        </div>

        {/* Right Section: Form Content */}
        <div className="flex-1 w-full space-y-5">
          
          {/* Header Title */}
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <GiWheat className="text-3xl text-[#5516DA] shrink-0" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#5516DA] leading-tight">
                መንሱር ሱልጣን ዱቄት ፋብሪካ
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                የተጠቃሚ ፕሮፋይል (User Profile)
              </p>
            </div>
          </div>

          {/* User Info Form Grid */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  ሙሉ ስም (Full Name)
                </label>
                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:border-[#5516DA] focus-within:bg-white transition-all">
                  <FaUser className="text-[#5516DA] text-base shrink-0" />
                  <input
                    type="text"
                    name="fullName"
                    value={userInfo.fullName}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full bg-transparent focus:outline-none text-gray-800 disabled:text-gray-600 text-sm"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  ስልክ ቁጥር (Phone Number)
                </label>
                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:border-[#5516DA] focus-within:bg-white transition-all">
                  <FaPhoneAlt className="text-[#5516DA] text-base shrink-0" />
                  <input
                    type="text"
                    name="phone"
                    value={userInfo.phone}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full bg-transparent focus:outline-none text-gray-800 disabled:text-gray-600 text-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  አድራሻ (Address)
                </label>
                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:border-[#5516DA] focus-within:bg-white transition-all">
                  <FaMapMarkerAlt className="text-[#5516DA] text-base shrink-0" />
                  <input
                    type="text"
                    name="address"
                    value={userInfo.address}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full bg-transparent focus:outline-none text-gray-800 disabled:text-gray-600 text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  ኢሜይል (Email)
                </label>
                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:border-[#5516DA] focus-within:bg-white transition-all">
                  <FaEnvelope className="text-[#5516DA] text-base shrink-0" />
                  <input
                    type="email"
                    name="email"
                    value={userInfo.email}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full bg-transparent focus:outline-none text-gray-800 disabled:text-gray-600 text-sm"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  የትውልድ ቀን (Date of Birth)
                </label>
                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:border-[#5516DA] focus-within:bg-white transition-all">
                  <FaBirthdayCake className="text-[#5516DA] text-base shrink-0" />
                  <input
                    type="text"
                    name="dateOfBirth"
                    value={userInfo.dateOfBirth}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full bg-transparent focus:outline-none text-gray-800 disabled:text-gray-600 text-sm"
                  />
                </div>
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  የሥራ ድርሻ (Occupation)
                </label>
                <div className="flex items-center gap-2.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:border-[#5516DA] focus-within:bg-white transition-all">
                  <FaBriefcase className="text-[#5516DA] text-base shrink-0" />
                  <input
                    type="text"
                    name="occupation"
                    value={userInfo.occupation}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full bg-transparent focus:outline-none text-gray-800 disabled:text-gray-600 text-sm"
                  />
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-[#5516DA] text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#4310b5] transition-all cursor-pointer shadow-xs"
                  >
                    <FaCheck /> አስቀምጥ (Save)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-2 bg-[#E1DCFF] text-[#5516DA] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#d1c8ff] transition-all cursor-pointer"
                  >
                    <FaTimes /> ሰርዝ (Cancel)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 bg-[#5516DA] text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#4310b5] transition-all cursor-pointer shadow-xs"
                  >
                    <FaEdit /> ፕሮፋይል አስተካክል (Edit)
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-red-100 transition-all cursor-pointer"
                  >
                    <FaSignOutAlt /> ወጣ (Logout)
                  </button>
                </>
              )}
            </div>
          </form>

        </div>
      </div>
    </CenterLayout>
  );
}

export default User;