import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AuthGate = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-[#FDD405] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return children;
};

export default AuthGate;
