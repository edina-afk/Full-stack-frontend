import React, { useState } from "react";
import { FaUser } from "react-icons/fa";

function NavigationBar() {
  const [showDropdown, setShowDropdown] = useState(false);

  const [user] = useState(() => {
    const storedUser = localStorage.getItem("user");

    try {
      return storedUser && storedUser !== "undefined"
        ? JSON.parse(storedUser)
        : {};
    } catch (error) {
      console.log("Invalid user data");
      localStorage.removeItem("user");
      return {};
    }
  });

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/signin";
  };

  return (
    <div
      className="
        fixed
        top-0
        right-0
        left-0
        md:left-[280px]
        z-30
        p-0
        m-0
      "
    >
      <div
        className="
          flex
          items-center
          justify-end
          py-2
          px-3
          sm:px-4
          md:px-6
          bg-custom
        "
      >
        <div
          className="
            flex
            rounded-full
            justify-between
            items-center
            gap-2
            sm:gap-4
            h-10
            sm:h-11
            px-2
            sm:px-4
            relative
          "
          style={{ backgroundColor: "#E1DCFF" }}
        >
          <div className="flex justify-center items-center gap-2 sm:gap-2.5 relative">

            {/* User Name */}
            <div className="flex flex-col justify-center items-end leading-tight">
              <span className="text-[11px] sm:text-xs font-semibold text-gray-900">
                {user.firstName || "Guest"} {user.lastName || ""}
              </span>

              <span className="text-[9px] sm:text-[10px] text-[#A098AE]">
                ፋብሪካ አስተዳዳሪ (Admin)
              </span>
            </div>

            {/* Profile Icon */}
            <button
              type="button"
              onClick={toggleDropdown}
              className="
                flex
                justify-center
                items-center
                h-8
                w-8
                rounded-full
                bg-custom
                cursor-pointer
                relative
                flex-shrink-0
              "
            >
              <FaUser size={14} color="#5516DA" />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div
                className="
                  absolute
                  right-0
                  top-full
                  mt-2
                  bg-white
                  shadow-xl
                  rounded-xl
                  p-3
                  w-52
                  max-w-[calc(100vw-24px)]
                  text-xs
                  z-50
                  border
                  border-gray-100
                "
              >
                <p className="text-[#5516DA] font-semibold mb-0.5">
                  {user.firstName || "Guest"} {user.lastName || ""}
                </p>

                <p className="text-[#A098AE] mb-0.5 text-[11px]">
                  መንሱር ሱልጣን ዱቄት ፋብሪካ
                </p>

                <p className="text-[#5516DA] mb-2 text-[11px] break-all">
                  {user.email || ""}
                </p>

                <hr className="my-1.5 border-gray-100" />

                <button
                  onClick={handleLogout}
                  className="
                    w-full
                    bg-[#E1DCFF]
                    text-[#5516DA]
                    py-2
                    rounded-md
                    hover:bg-[#5516DA]
                    hover:text-white
                    transition-colors
                    text-[11px]
                    font-semibold
                  "
                >
                  ወጣ (Logout)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NavigationBar;