import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (email, password, navigate) => { // ✅ Pass navigate
    if (email === "admin@example.com" && password === "123456") {
      setUser({ email });
      navigate("/dashboard"); // ✅ Use navigate from argument
    } else {
      alert("Invalid Credentials!");
    }
  };

  const logout = (navigate) => { // ✅ Pass navigate
    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
