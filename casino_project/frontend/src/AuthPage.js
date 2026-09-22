import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./AuthPage.css";

const API_URL = "http://localhost:5000/api";

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

function AuthPage({ mode, user, onAuthenticated }) {
  const isLogin = mode === "login";

  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverMessage, setServerMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

    setFieldErrors({});
    setServerMessage("");

    if (!isLogin) {
      setSuccessMessage("");
    }
  }, [isLogin]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));

    setServerMessage("");
  }

  function validateForm() {
    const errors = {};
    const username = formData.username.trim();

    if (!username) {
      errors.username = "Add meg a felhasználóneved.";
    } else if (username.length < 3) {
      errors.username =
        "A felhasználónév legalább 3 karakter legyen.";
    } else if (username.length > 30) {
      errors.username =
        "A felhasználónév legfeljebb 30 karakter lehet.";
    }

    if (!isLogin) {
      const email = formData.email.trim();

      if (!email) {
        errors.email = "Add meg az e-mail-címed.";
      } else if (!validateEmail(email)) {
        errors.email = "Adj meg egy érvényes e-mail-címet.";
      }
    }

    if (!formData.password) {
      errors.password = "Add meg a jelszavad.";
    } else if (
      !isLogin &&
      !validatePassword(formData.password)
    ) {
      errors.password =
        "Legalább 8 karakter, kisbetű, nagybetű és szám szükséges.";
    }

    if (!isLogin) {
      if (!formData.confirmPassword) {
        errors.confirmPassword = "Írd be újra a jelszavad.";
      } else if (
        formData.password !== formData.confirmPassword
      ) {
        errors.confirmPassword = "A két jelszó nem egyezik.";
      }
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setServerMessage("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    const requestBody = isLogin
      ? {
          username: formData.username.trim(),
          password: formData.password,
        }
      : {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
        };

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `${API_URL}/auth/${isLogin ? "login" : "register"}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "A művelet nem sikerült."
        );
      }

      if (isLogin) {
        onAuthenticated(data.user);
        navigate("/", { replace: true });
        return;
      }

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Sikeres regisztráció. Most már bejelentkezhetsz.",
        },
      });
    } catch (error) {
      setServerMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-introduction">
        <Link className="auth-back-link" to="/">
          <span aria-hidden="true">←</span>
          Vissza a főoldalra
        </Link>

        <span className="eyebrow">
          {isLogin ? "Felhasználói fiók" : "Új felhasználó"}
        </span>

        <h1>
          {isLogin ? (
            <>
              Üdv újra
              <span> az oldalon</span>
            </>
          ) : (
            <>
              Hozd létre
              <span> a fiókodat</span>
            </>
          )}
        </h1>

        <p>
          {isLogin
            ? "Jelentkezz be a felhasználóneveddel, hogy elérd a fiókodhoz kapcsolódó adatokat és eredményeket."
            : "A regisztráció után bejelentkezhetsz, és később elérheted a mentett eredményeidet."}
        </p>

        <div className="auth-security-information">
          <strong>Biztonságos adatkezelés</strong>

          <p>
            A jelszavakat az alkalmazás nem olvasható formában,
            hanem biztonságos hashként tárolja.
          </p>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-heading">
          <span className="eyebrow">
            {isLogin ? "Belépés" : "Regisztráció"}
          </span>

          <h2>
            {isLogin ? "Bejelentkezés" : "Fiók létrehozása"}
          </h2>

          <p>
            {isLogin
              ? "Add meg a felhasználónevedet és a jelszavadat."
              : "Töltsd ki az alábbi mezőket a regisztrációhoz."}
          </p>
        </div>

        {successMessage && (
          <div className="auth-message auth-message-success">
            {successMessage}
          </div>
        )}

        {serverMessage && (
          <div className="auth-message auth-message-error">
            {serverMessage}
          </div>
        )}

        <form
          className="auth-page-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="form-field">
            <label htmlFor="username">Felhasználónév</label>

            <input
              className={
                fieldErrors.username ? "input-error" : ""
              }
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              autoComplete="username"
              placeholder={
                isLogin
                  ? "Add meg a felhasználóneved"
                  : "Legalább 3 karakter"
              }
            />

            {fieldErrors.username && (
              <span className="field-error">
                {fieldErrors.username}
              </span>
            )}
          </div>

          {!isLogin && (
            <div className="form-field">
              <label htmlFor="email">E-mail-cím</label>

              <input
                className={
                  fieldErrors.email ? "input-error" : ""
                }
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                placeholder="pelda@email.hu"
              />

              {fieldErrors.email && (
                <span className="field-error">
                  {fieldErrors.email}
                </span>
              )}
            </div>
          )}

          <div className="form-field">
            <label htmlFor="password">Jelszó</label>

            <input
              className={
                fieldErrors.password ? "input-error" : ""
              }
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete={
                isLogin ? "current-password" : "new-password"
              }
              placeholder="Add meg a jelszavad"
            />

            {fieldErrors.password && (
              <span className="field-error">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {!isLogin && (
            <div className="form-field">
              <label htmlFor="confirmPassword">
                Jelszó megerősítése
              </label>

              <input
                className={
                  fieldErrors.confirmPassword
                    ? "input-error"
                    : ""
                }
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
                placeholder="Írd be újra a jelszavad"
              />

              {fieldErrors.confirmPassword && (
                <span className="field-error">
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>
          )}

          <button
            className="button button-primary auth-page-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Feldolgozás..."
              : isLogin
                ? "Bejelentkezés"
                : "Regisztráció"}
          </button>
        </form>

        <div className="auth-alternative">
          <span>
            {isLogin ? "Még nincs fiókod?" : "Már van fiókod?"}
          </span>

          <Link to={isLogin ? "/register" : "/login"}>
            {isLogin ? "Regisztráció" : "Bejelentkezés"}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;