import React, { useState } from "react";
import logo from "/ticket.png";
import { Link as ScrollLink } from "react-scroll";
import { FaBars, FaXmark } from "react-icons/fa6";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navItems = [
    { path: "home", link: "Home" },
    { path: "features", link: "Features" },
    { path: "how", link: "How it Works" },
    { path: "aboutus", link: "About Us" },
    { path: "testimonial", link: "Testimonial" },
  ];

  return (
    <header className="bg-[#5516DA] text-white fixed top-0 left-0 right-0 z-50">

      {/* Navbar */}
      <nav className="px-4 sm:px-6 py-3 sm:py-4 max-w-[1400px] mx-auto flex items-center w-full">

        {/* Logo */}
        <div className="mr-auto">
          <ScrollLink
            to="home"
            spy={true}
            smooth={true}
            duration={500}
            className="flex items-center cursor-pointer"
          >
            <img
              src={logo}
              alt="Logo"
              className="h-7 sm:h-8 w-auto"
            />

            <span className="text-lg sm:text-xl font-semibold text-white ml-2">
              EVENTIO
            </span>
          </ScrollLink>
        </div>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex gap-6 lg:gap-10 xl:gap-12 text-sm lg:text-base xl:text-lg items-center justify-center">
          {navItems.map(({ path, link }) => (
            <li
              className="text-white relative"
              key={path}
            >
              <ScrollLink
                activeClass="active"
                to={path}
                spy={true}
                smooth={true}
                duration={500}
                className="cursor-pointer group"
              >
                {link}

                <span
                  className="
                    absolute
                    left-0
                    -bottom-1
                    h-[2px]
                    w-full
                    bg-white
                    scale-x-0
                    transition-transform
                    duration-200
                    ease-in-out
                    group-hover:scale-x-100
                  "
                />
              </ScrollLink>
            </li>
          ))}
        </ul>

        {/* Desktop Buttons */}
        <div className="hidden lg:flex gap-3 xl:gap-4 items-center ml-auto">

          <Link to="/get-app">
            <button
              className="
                bg-[#7C4DFF]
                px-6 xl:px-8
                py-2
                font-medium
                rounded-3xl
                hover:bg-[#35313e]
                transition-all
                duration-200
              "
            >
              Get the app
            </button>
          </Link>

          <Link to="/signin">
            <button
              className="
                bg-[#7C4DFF]
                px-8 xl:px-12
                py-2
                font-medium
                rounded-3xl
                hover:bg-[#35313e]
                transition-all
                duration-200
              "
            >
              Sign In
            </button>
          </Link>

        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden ml-auto z-[60]">

          <button
            onClick={toggleMenu}
            className="p-2 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? (
              <FaXmark className="w-6 h-6" />
            ) : (
              <FaBars className="w-6 h-6" />
            )}
          </button>

        </div>

      </nav>

      {/* Mobile Overlay */}
      {isMenuOpen && (
        <div
          className="
            md:hidden
            fixed
            inset-0
            bg-black/40
            z-40
          "
          onClick={closeMenu}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`
          md:hidden
          fixed
          top-0
          right-0
          h-screen
          w-[280px]
          max-w-[85vw]
          bg-[#5516DA]
          shadow-2xl
          transition-transform
          duration-300
          ease-in-out
          z-50
          ${
            isMenuOpen
              ? "translate-x-0"
              : "translate-x-full"
          }
        `}
      >

        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/20">

          <div className="flex items-center">
            <img
              src={logo}
              alt="Logo"
              className="h-7 w-auto"
            />

            <span className="text-lg font-semibold ml-2">
              EVENTIO
            </span>
          </div>

          <button
            onClick={closeMenu}
            className="p-2"
            aria-label="Close Menu"
          >
            <FaXmark className="w-6 h-6" />
          </button>

        </div>

        {/* Mobile Links */}
        <ul className="flex flex-col gap-2 p-6">

          {navItems.map(({ path, link }) => (
            <li key={path}>

              <ScrollLink
                activeClass="active"
                to={path}
                spy={true}
                smooth={true}
                duration={500}
                className="
                  block
                  py-3
                  px-4
                  rounded-lg
                  cursor-pointer
                  hover:bg-white/10
                  transition-colors
                "
                onClick={closeMenu}
              >
                {link}
              </ScrollLink>

            </li>
          ))}

          {/* Get App */}
          <li className="mt-4">

            <Link
              to="/get-app"
              onClick={closeMenu}
            >
              <button
                className="
                  bg-[#7C4DFF]
                  px-4
                  py-2.5
                  w-full
                  text-white
                  rounded-3xl
                  hover:bg-[#35313e]
                  transition-all
                "
              >
                Get the app
              </button>
            </Link>

          </li>

          {/* Sign In */}
          <li>

            <Link
              to="/signin"
              onClick={closeMenu}
            >
              <button
                className="
                  bg-[#7C4DFF]
                  px-4
                  py-2.5
                  w-full
                  text-white
                  rounded-3xl
                  hover:bg-[#35313e]
                  transition-all
                "
              >
                Sign In
              </button>
            </Link>

          </li>

        </ul>

      </div>

    </header>
  );
};

export default Navbar;