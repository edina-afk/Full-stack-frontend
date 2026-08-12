import React, { useState } from "react";
import { Data } from "./sideBarData";
import "../../index.css";
import { useLocation, useNavigate } from "react-router-dom";
import { MdMenu, MdClose } from "react-icons/md";

function SideBar() {
  const location = useLocation();
  const pathName = location.pathname;
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* ================= MOBILE MENU BUTTON ================= */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-[60] md:hidden bg-[#5516DA] text-white p-2 rounded-lg shadow-lg"
      >
        <MdMenu size={26} />
      </button>

      {/* ================= MOBILE OVERLAY ================= */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <div
        className={`
          fixed top-0 bottom-0 left-0 z-50
          flex flex-col
          w-[260px]
          h-full
          font-poppins
          overflow-y-auto
          no-scrollbar

          transition-transform duration-300 ease-in-out

          ${isOpen ? "translate-x-0" : "-translate-x-full"}

          md:translate-x-0
          md:w-[280px]
        `}
        style={{
          background: "linear-gradient(to bottom, #5516DA, #2D0C74)",
        }}
      >
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <img
              src="/image.png"
              alt="Factory Logo"
              className="w-8 h-8 object-contain"
            />

            <h1 className="text-[#C1BBEB] font-bold text-lg sm:text-xl leading-tight">
              መንሱር ሱልጣን
              <br />
              ዱቄት ፋብሪካ
            </h1>
          </div>

          {/* Close button - mobile only */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-white hover:text-[#C1BBEB]"
          >
            <MdClose size={28} />
          </button>
        </div>

        {/* ================= MENU ================= */}
        <div className="flex flex-col pt-3 pb-5 px-2">
          {Data.map((items, index) => {
            const isActive = pathName === items.path;

            return (
              <div
                key={index}
                onClick={() => handleNavigate(items.path)}
                className={`
                  flex items-center
                  cursor-pointer
                  rounded-md
                  transition-all duration-200
                  mb-1

                  ${
                    isActive
                      ? "bg-[#E1DCFF] text-[#5516DA]"
                      : "hover:bg-[#E1DCFF]"
                  }
                `}
              >
                <div
                  className={`
                    flex items-center gap-4
                    w-full
                    px-5 py-3
                    ${
                      isActive
                        ? "text-[#5516DA]"
                        : "text-[#C1BBEB] group-hover:text-[#5516DA]"
                    }
                  `}
                >
                  <items.icon
                    size={23}
                    className={
                      isActive
                        ? "text-[#5516DA]"
                        : "text-[#C1BBEB]"
                    }
                  />

                  <span
                    className={`
                      text-sm font-medium
                      ${
                        isActive
                          ? "text-[#5516DA]"
                          : "text-[#C1BBEB]"
                      }
                    `}
                  >
                    {items.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default SideBar;