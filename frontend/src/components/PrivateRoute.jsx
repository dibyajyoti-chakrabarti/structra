import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  // Check if access token exists
  const isAuthenticated = !!localStorage.getItem('access');

  // If authenticated, render child routes (Outlet)
  // If not, redirect to Login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;