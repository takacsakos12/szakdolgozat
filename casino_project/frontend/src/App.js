import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import SlotPage from "./pages/SlotPage";
import "./App.css";
import AuthPage from "./AuthPage";
import GameHistoryPage from "./pages/GameHistoryPage";
import { getCurrentUser, logoutUser } from "./api/authApi";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import RoulettePage from "./pages/RoulettePage";
import BlackjackPage from "./pages/BlackjackPage";
import BaccaraPage from "./pages/BaccaratPage";

function App() {
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function checkCurrentUser() {
      try {
        const response = await getCurrentUser();
        setUser(response.user);
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
      await logoutUser();
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
          path="/games/roulette"
          element={<RoulettePage user={user} onUserChange={setUser} />}
        />
        <Route
          path="/games/history"
          element={<GameHistoryPage user={user} />}
        />
        <Route
          path="/games/blackjack"
          element={<BlackjackPage user={user} onUserChange={setUser} />}
        />
        <Route
          path="/games/baccarat"
          element={<BaccaraPage user={user} onUserChange={setUser} />}
        />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;
