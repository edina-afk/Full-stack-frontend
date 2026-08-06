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
       <div>
        {children}
      </div>
    </>
  );
}

export default CenterLayout;
