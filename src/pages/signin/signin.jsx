import React, { useState } from 'react';
import api from "../../api/axios";


const GoogleIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.3 14.7 2.3 12 2.3 6.9 2.3 2.7 6.6 2.7 12s4.2 9.7 9.3 9.7c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.1-1.6H12z" />
  </svg>
);
const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <path d="M13.5 21v-7.5h2.5l.4-3H13.5V8.4c0-.87.24-1.46 1.5-1.46h1.6V4.3C16.3 4.27 15.4 4.2 14.3 4.2c-2.3 0-3.9 1.4-3.9 4v2.3H7.9v3h2.5V21h3.1z" />
  </svg>
);
const AppleIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <path d="M16.4 12.4c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7s1.6.7 2.6.6c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.3-.9-2.3-3zM14.5 6c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.8-.4 2.3-1.1z" />
  </svg>
);

const Signin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Forgot password state ---
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {

      const response = await api.post("/auth/signin", {
        email: formData.email,
        password: formData.password,
      });

      console.log("LOGIN RESPONSE:", response.data);

      const user = response.data.user;
      const normalizedRole = (user?.role || '').toString().toUpperCase().replace(/[^A-Z]/g, '');

      if (normalizedRole !== "SUPERADMIN" && normalizedRole !== "ADMIN") {
        setErrors({
          email: "You do not have permission to access the system",
        });
        return;
      }

      const authToken = response.data.access_token;

      localStorage.setItem("token", authToken);

      localStorage.setItem(
        "user",
        JSON.stringify({ ...user, access_token: authToken })
      );

      setSubmitted(true);

      window.location.href = "/dashboard";

    } catch (error) {

      console.log(error.response?.data);

      setErrors({
        email: error.response?.data?.message || "Login failed"
      });

    }
  };
  // --- Forgot password handlers ---
  const openForgotPassword = (e) => {
    e.preventDefault();
    setShowForgotPassword(true);
    setResetSent(false);
    setResetError('');
    setResetEmail(formData.email || '');
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setResetError('');
    setResetSent(false);
  };

  const handleResetChange = (e) => {
    setResetEmail(e.target.value);
    if (resetError) setResetError('');
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError('Email is invalid');
      return;
    }
    setResetError('');
    setResetSent(true);

    console.log('Password reset requested for:', resetEmail);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex w-full max-w-4xl rounded-lg shadow-lg overflow-hidden">
        <div className="w-1/2 bg-white p-8">
          {showForgotPassword ? (
            <>
              <h2 className="text-xl text-center font-bold mb-1">Forgot Password?</h2>
              <p className="text-sm text-gray-600 mb-6 text-center">
                Enter your email and we'll send you a link to reset your password.
              </p>
              {resetSent && (
                <p className="text-green-500 text-center mb-4">
                  If an account exists for {resetEmail}, a reset link has been sent.
                </p>
              )}
              <form onSubmit={handleResetSubmit}>
                <div className="mb-4">
                  <label htmlFor="resetEmail" className="block text-xs font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="resetEmail"
                    name="resetEmail"
                    value={resetEmail}
                    onChange={handleResetChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {resetError && <p className="text-red-500 text-xs mt-1">{resetError}</p>}
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#5516DA] text-white py-2 px-4 rounded-md shadow-sm hover:bg-[#4514B8] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Send reset link
                </button>
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="text-sm text-[#5516DA] font-semibold"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl text-center font-bold mb-1">Welcome Back!</h2>
              <p className="text-sm text-gray-600 mb-6 text-center">Login into your account</p>
              {submitted && <p className="text-green-500 text-center mb-4">Login successful!</p>}
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-xs font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div className="mb-4">
                  <label htmlFor="password" className="block text-xs font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m14.41 14.41L17.41 17.41" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                      Remember me
                    </label>
                  </div>
                  <a
                    href="#"
                    onClick={openForgotPassword}
                    className="text-sm text-[#5516DA] font-semibold"
                  >
                    Forgot password?
                  </a>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#5516DA] text-white py-2 px-4 rounded-md shadow-sm hover:bg-[#4514B8] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Login
                </button>
                <div className="flex justify-center mt-4">
                  <p className="text-sm text-black mr-1">Don't have an account?</p>
                  <a href="/signup" className="text-sm text-[#5516DA] font-semibold">Sign up!</a>
                </div>
              </form>
            </>
          )}
        </div>
        <div className="w-1/2 bg-gradient-to-b from-[#5516DA] to-[#2D0C74] flex flex-col items-center justify-center">
          <img src="/image.png" alt="Ticket" className="w-1/4 max-w-[50px] mb-4" />

          <h1 className="text-white text-3xl font-bold mb-2 text-center px-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
            መንሱር ሱልጣን ዱቄት ፋብሪካ
          </h1>
          <p className="text-white text-center text-sm px-12 mb-8">
            Mensur Sultan Flour Factory — quality flour, milled and delivered you can trust.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signin;