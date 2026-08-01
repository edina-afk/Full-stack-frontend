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


          <div className="flex justify-center items-center gap-2.5">


            <div className="flex flex-col justify-center items-end">

              <span className="text-xs font-semibold text-gray-800">
                {user.firstName || "Guest"} {user.lastName || ""}
              </span>


              <span className="text-[10px] text-gray-500">
                Admin
              </span>

            </div>



            <div
              className="flex justify-center items-center h-8 w-8 rounded-full bg-custom cursor-pointer"
              onClick={() => setShowDropdown(!showDropdown)}
            >

              <FaUser 
                size={14} 
                color="#5516DA"
              />

            </div>



            {showDropdown && (

              <div className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-xl p-4 w-56">


                <p className="font-semibold text-[#5516DA]">
                  {user.firstName} {user.lastName}
                </p>


                <p className="text-sm text-gray-500 break-all">
                  {user.email}
                </p>



                <button

                  onClick={handleLogout}

                  className="
                  w-full 
                  mt-4 
                  bg-[#E1DCFF]
                  hover:bg-[#5516DA]
                  hover:text-white
                  py-2
                  rounded-lg
                  transition
                  "

                >
                  Logout

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