import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import SlotPage from "./pages/SlotPage";
import "./App.css";
import AuthPage from "./AuthPage";
import GameHistoryPage from "./pages/GameHistoryPage";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";

const API_URL = "http://localhost:5000/api";

function App() {
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function checkCurrentUser() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setIsCheckingSession(false);
      }
    }

    checkCurrentUser();
  }, []);

  async function handleLogout() {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("A kijelentkezés sikertelen.");
      }

      setUser(null);
    } catch (error) {
      console.error(error.message);
    }
  }

  if (isCheckingSession) {
    return <div className="session-loading">Munkamenet ellenőrzése...</div>;
  }

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/login"
          element={
            <AuthPage mode="login" user={user} onAuthenticated={setUser} />
          }
        />

        <Route
          path="/register"
          element={
            <AuthPage mode="register" user={user} onAuthenticated={setUser} />
          }
        />
        <Route
          path="/games/slot"
          element={<SlotPage user={user} onUserChange={setUser} />}
        />
        <Route
          path="/games/history"
          element={<GameHistoryPage user={user} />}
        />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;
