import React, { useState } from "react";
import { FaUser } from "react-icons/fa";
import i18n from "./i18n";

function NavigationBar() {

  const savedLanguage = localStorage.getItem("language") || "am";

  const [showDropdown, setShowDropdown] = useState(false);

  const [language, setLanguage] = useState(savedLanguage);

  i18n.changeLanguage(savedLanguage);


  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
    i18n.changeLanguage(lang);
  };


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
    <div className="p-0 m-0 fixed top-0 right-0 left-0 z-10">

      <div className="flex items-center justify-end py-1.5 px-6 bg-custom">

        <div
          className="flex rounded-full justify-between items-center gap-4 h-11 px-4 relative"
          style={{ backgroundColor:"#E1DCFF" }}
        >


          <div className="flex justify-center items-center gap-2.5 relative">


            {/* User Name */}
            <div className="flex flex-col justify-center items-end leading-tight">

              <span className="text-xs font-semibold text-gray-900">
                {user.firstName || "Guest"} {user.lastName || ""}
              </span>


              <span className="text-[10px] text-[#A098AE]">
                ፋብሪካ አስተዳዳሪ (Admin)
              </span>

            </div>

         {/* Language Switch */}
<div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 text-[11px] font-semibold">

  <button
    onClick={() => changeLanguage("am")}
    className={`px-2 py-1 rounded-full ${
      language === "am"
        ? "bg-[#5516DA] text-white"
        : "text-gray-500"
    }`}
  >
    አማ
  </button>


  <button
    onClick={() => changeLanguage("en")}
    className={`px-2 py-1 rounded-full ${
      language === "en"
        ? "bg-[#5516DA] text-white"
        : "text-gray-500"
    }`}
  >
    EN
  </button>

</div>

            {/* Profile Icon */}
            <div
              className="flex justify-center items-center h-8 w-8 rounded-full bg-custom cursor-pointer relative"
              onClick={toggleDropdown}
            >

              <FaUser 
                size={14} 
                color="#5516DA"
              />

            </div>



            {/* Dropdown */}
            {showDropdown && (

              <div className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-xl p-3 w-52 text-xs z-50 border border-gray-100">


                <p className="text-[#5516DA] font-semibold mb-0.5">
                  {user.firstName} {user.lastName}
                </p>


                <p className="text-[#A098AE] mb-0.5 text-[11px]">
                  መንሱር ሱልጣን ዱቄት ፋብሪካ
                </p>


                <p className="text-[#5516DA] mb-2 text-[11px] break-all">
                  {user.email}
                </p>



                <hr className="my-1.5 border-gray-100" />



                <button

                  onClick={handleLogout}

                  className="
                  w-full 
                  bg-[#E1DCFF]
                  text-[#5516DA]
                  py-1.5
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