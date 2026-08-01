import React, { useState, useRef } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import api from "../../api/axios";


const Signup = () => {
  // --- Signup Form State ---
    const [formData, setFormData] = useState({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
});

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- OTP Flow State ---
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const inputRefs = useRef([]);

  // Handle Form Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Form Validation
  const validate = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'FirstName is required';
    if (!formData.lastName) newErrors.lastName = 'LastName is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    return newErrors;
  };

  // Handle Form Submit -> Triggers OTP step

  const handleSubmit = async (e) => {
  e.preventDefault();

  const validationErrors = validate();

  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  try {
    setErrors({});

    const response = await api.post("/auth/signup", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    });

    console.log(response.data);

    setIsOtpSent(true);

  } catch (error) {
    console.log(error.response?.data);
  }
};
  // --- OTP Input Logic ---
  const handleOtpChange = (index, value) => {
    // Only accept numeric inputs
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Get last typed char
    setOtp(newOtp);

    
    // Auto-focus to next box if value is typed
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Move to previous box on backspace if current is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

 

  const handleVerifyOtp = async (e) => {
  e.preventDefault();

  const otpValue = otp.join("");

  if (otpValue.length !== 6) {
    setOtpError("Please enter the 6-digit OTP");
    return;
  }

  try {
    console.log("VERIFY BUTTON CLICKED");
    console.log("OTP VALUE:", otpValue);

    const response = await api.post("/auth/verify-otp", {
      email: formData.email,
      otp: otpValue,
    });

    console.log("USER FROM BACKEND:", response.data.user);

    localStorage.setItem(
      "token",
      response.data.access_token
    );

    localStorage.setItem(
      "user",
      JSON.stringify(response.data.user)
    );

    setOtpError("");

    // redirect after saving data
    window.location.replace("/dashboard");

  } catch (error) {
    console.log(error.response?.data);
    setOtpError("Invalid OTP");
  }
};

const handleResendOtp = async () => {
  try {
    await api.post("/auth/resend-otp", {
      email: formData.email,
    });

    setOtp(['', '', '', '', '', '']);
    setOtpError('');

    alert("OTP sent again");

  } catch(error) {
    console.log(error.response?.data);
  }
};  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {/* SUCCESS SCREEN AFTER VERIFICATION */}
      {isVerified ? (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Account Verified!</h2>
          <p className="text-gray-600 text-sm">
            Welcome aboard, <span className="font-semibold">{formData.firstName}</span>! Your account with Mensur Sultan Flour Factory is ready.
          </p>
          <a
            href="/"
            className="inline-block w-full bg-[#5516DA] text-white py-2.5 rounded-lg hover:bg-[#4514B8] transition duration-200"
          >
            Go to Login
          </a>
        </div>
      ) : isOtpSent ? (
        /* OTP VERIFICATION MODAL */
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6 border border-gray-100 animate-fade-in">
          {/* Target Icon Header */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-[#5516DA]/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#5516DA] flex items-center justify-center text-[#5516DA] font-extrabold text-xs">
                OTP
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800">Verify OTP</h2>
            <p className="text-xs text-gray-500 mt-2">
              Enter the 6-digit code sent to <br />
              <span className="font-semibold text-gray-700">{formData.email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            {/* 6 Digit Input Boxes */}
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  ref={(el) => (inputRefs.current[index] = el)}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-10 h-12 text-center text-lg font-bold border-2 border-indigo-200 rounded-lg focus:border-[#5516DA] focus:outline-none focus:ring-2 focus:ring-[#5516DA]/20 text-gray-800 transition"
                />
              ))}
            </div>

            {otpError && <p className="text-red-500 text-xs">{otpError}</p>}

            <div className="text-xs text-gray-500">
              Didn't receive code?{' '}
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-[#5516DA] font-semibold hover:underline"
              >
                Resend OTP
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-[#5516DA] text-white py-3 rounded-lg font-medium hover:bg-[#4514B8] shadow-md transition duration-200"
            >
              Verify OTP
            </button>
          </form>

          <button
            onClick={() => setIsOtpSent(false)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            ← Back to Sign Up
          </button>
        </div>
      ) : (
        /* ORIGINAL SIGNUP FORM */
        <div className="flex w-full max-w-4xl rounded-2xl shadow-lg overflow-hidden bg-white">
          {/* Left Side: Branding & Info */}
          <div className="w-1/2 bg-gradient-to-b from-[#5516DA] to-[#2D0C74] flex flex-col items-center justify-center p-8 hidden md:flex">
            <img src="/image.png" alt="Ticket" className="w-1/4 max-w-[50px] mb-4" />

            <h1
              className="text-white text-2xl font-bold mb-2 text-center"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              መንሱር ሱልጣን ዱቄት ፋብሪካ
            </h1>
            <p className="text-white text-center text-sm px-6 mb-8 opacity-90">
              Mensur Sultan Flour Factory — quality flour, milled and delivered you can trust.
            </p>
          </div>

          {/* Right Side: Signup Form */}
          <div className="w-full md:w-1/2 bg-white p-8">
            <h2 className="text-xl mb-2 text-center text-gray-800">
              Create Account with <span className="font-extrabold text-[#5516DA]">Mensur Sultan</span>
            </h2>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Partner with us for premium flour products
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="username" className="block text-xs font-medium text-gray-700">
                  First  Name
                </label>
                <input
                   type="text"
                   name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#5516DA] focus:border-[#5516DA] sm:text-sm"
/> 
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>

   <div className="mb-4">
                <label htmlFor="username" className="block text-xs font-medium text-gray-700">
                  last  Name
                </label>
                <input
  type="text"
  name="lastName"
  value={formData.lastName}
  onChange={handleChange}
     className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#5516DA] focus:border-[#5516DA] sm:text-sm"
/> 
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>

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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#5516DA] focus:border-[#5516DA] sm:text-sm"
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
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#5516DA] focus:border-[#5516DA] sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#5516DA] focus:border-[#5516DA] sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-[#5516DA] text-white py-2.5 px-4 rounded-md shadow-sm hover:bg-[#4514B8] focus:outline-none focus:ring-2 focus:ring-[#5516DA] focus:ring-offset-2 transition-colors font-medium mt-2"
              >
                Sign Up
              </button>
            </form>

            <div className="flex justify-center mt-4">
              <p className="text-sm text-gray-600 mr-1">Already have an account?</p>
              <a href="/" className="text-sm text-[#5516DA] font-semibold hover:underline">
                Sign in
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Signup;