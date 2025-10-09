import React, { createContext, useContext, useEffect, useState } from "react";

import { getCurrentUser } from "../lib/appwrite.js";

const GlobalContext = createContext();
export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState({}); // Track follow status across the app

  useEffect(() => {
    // Check if getCurrentUser is available
    if (typeof getCurrentUser !== 'function') {
      console.error('getCurrentUser is not a function:', getCurrentUser);
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((res) => {
        if (res) {
          setIsLogged(true);
          setUser(res);
        } else {
          setIsLogged(false);
          setUser(null);
        }
      })
      .catch((error) => {
        console.error('Error getting current user:', error);
        setIsLogged(false);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Function to update follow status
  const updateFollowStatus = (targetUserId, isFollowing) => {
    setFollowStatus(prev => ({
      ...prev,
      [targetUserId]: isFollowing
    }));
  };

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        setIsLogged,
        user,
        setUser,
        loading,
        followStatus,
        updateFollowStatus,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
