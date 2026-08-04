import { Routes, Route } from "react-router-dom";
import "./App.css";
import Dashboard from "./pages/dashboard/dashboard";
import Newevent from "./pages/newevent/newevent";
import Manageevent from "./pages/manageevent/manageevent";
import User from "./pages/user/user";
import UserManagement from "./pages/usermanagement/usermanagement";
import Signup from "./pages/signup/signup";
import Signin from "./pages/signin/signin";
import Landing from "./pages/landing/landing";

import ProtectedRoute from "./component/ProtectedRoute";


function App() {

  return (

    <Routes>


      {/* Public pages */}

      <Route 
        path="/signin" 
        element={<Signin />} 
      />


      <Route 
        path="/signup" 
        element={<Signup />} 
      />


      <Route 
        path="/landing" 
        element={<Landing />} 
      />



      {/* Protected pages */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />


      <Route
        path="/newevent"
        element={
          <ProtectedRoute>
            <Newevent />
          </ProtectedRoute>
        }
      />


      <Route
        path="/manageevent"
        element={
          <ProtectedRoute>
            <Manageevent />
          </ProtectedRoute>
        }
      />


      <Route
        path="/usermanagement"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />


      <Route
        path="/usermanagement/:id"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />


      <Route
        path="/user"
        element={
          <ProtectedRoute>
            <User />
          </ProtectedRoute>
        }
      />



      {/* Default */}

      <Route
        path="*"
        element={
          localStorage.getItem("token")
          ? <Dashboard />
          : <Signin />
        }
      />


    </Routes>

  );

}


export default App;