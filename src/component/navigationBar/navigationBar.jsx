import React, { useState } from "react";
import { IoIosSearch } from "react-icons/io";
import { FaUser } from "react-icons/fa"; 

function NavigationBar() {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <div className="p-0 m-0 fixed top-0 right-0 left-0 z-10">
      {/* Container aligned nicely to balance left and right spacing */}
      <div className="flex items-center py-3 px-36 bg-custom">

        <div 
          className="flex rounded-3xl justify-between items-center gap-6 h-16 px-6 ml-auto mr-8" 
          style={{ backgroundColor: '#E1DCFF' }}
        >
          {/* Search Bar */}
          <div className="relative flex items-center rounded-3xl h-12 w-[380px] bg-custom">
            <IoIosSearch size={24} color="#5516DA" className="absolute left-4" />
            <input
              type="text"
              placeholder="እዚህ ይፈልጉ (Search here)..."
              className="text-[#A098AE] outline-none border-none placeholder:text-[#A098AE] pl-12 pr-4 rounded-3xl h-full w-full bg-custom"
            />
          </div>

          {/* User Profile Area */}
          <div className="flex justify-center items-center gap-3 relative">
            <div className="flex flex-col justify-center items-end">
              <span className="text-base font-semibold">መሐመድ አሊ</span>
              <span className="text-sm text-[#A098AE]">ፋብሪካ አስተዳዳሪ (Admin)</span>
            </div>

            <div 
              className="flex justify-center items-center h-12 w-12 rounded-full bg-custom cursor-pointer relative" 
              onClick={toggleDropdown}
            >
              <FaUser size={22} color="#5516DA" />

              {showDropdown && (
                <div className="absolute right-0 mt-40 bg-white shadow-lg rounded-md p-3 w-52 text-sm z-50">
                  <p className="text-[#5516DA] font-semibold mb-1">መሐመድ አሊ</p>
                  <p className="text-[#A098AE] mb-1">መንሱር ሱልጣን ዱቄት ፋብሪካ</p>
                  <p className="text-[#5516DA] mb-1">admin@mensursultan.com</p>
                  <p className="text-[#5516DA] mb-2">+251 91 123 4567</p>
                  <button
                    onClick={() => console.log('Logging out...')}
                    className="mt-2 w-full bg-[#E1DCFF] text-[#5516DA] p-1 rounded hover:bg-[#d0c8ff] text-xs font-semibold"
                  >
                    ወጣ (Logout)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default NavigationBar;