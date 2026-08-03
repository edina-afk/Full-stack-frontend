import React from "react";
import NavigationBar from "../navigationBar/navigationBar";
import SideBar from "../sideBar/sideBar";
import "../../index.css";
import RightLayout from "./rightLayout";
function CenterLayout({ children }) {
  return (
    <>
      <NavigationBar />
      <SideBar />
       <div
        className="
          no-scrollbar
          ml-64
          mr-8
          pt-20
          min-h-screen
          relative
          z-0
        "
      >
        {children}
      </div>
    </>
  );
}

export default CenterLayout;
