import { useLocation, Navigate } from 'react-router-dom';

const VerifyPageGuard = ({ children }) => {
  const location = useLocation();

  // Check for valid registration state
  const isValidState = location.state?.isRegistration && 
                      location.state?.email && 
                      location.state?.managementToken;

  if (!isValidState) {
    return <Navigate to="/auth/register" replace />;
  }

  return children;
};

export default VerifyPageGuard;