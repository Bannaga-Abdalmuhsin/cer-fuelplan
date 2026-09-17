(() => {
  "use strict";

  const SUPABASE_URL = "https://ecsfeoicioqbfolnljwm.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc2Zlb2ljaW9xYmZvbG5sandtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTk1MzAsImV4cCI6MjA5ODI5NTUzMH0.x4P0_-jFF304fYvnoQP7RklYvv23yfF32Nv96TKeAd0";
  const USER_EMAILS = {
    "bm.admin": "bm.admin@cer-fuelplan.local",
  };

  function setError(message) {
    const error = document.getElementById("loginError");
    if (!error) return;
    error.textContent = message;
    error.style.display = "block";
  }

  function setSubmitting(isSubmitting) {
    const button = document.querySelector("#loginForm button[type='submit']");
    if (!button) return;
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Signing In..." : "Sign In";
  }

  async function signIn(username, password) {
    const email = USER_EMAILS[username.toLowerCase()];
    if (!email) throw new Error("Invalid username or password");

    const response = await fetch(
      SUPABASE_URL + "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      },
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.access_token) {
      throw new Error("Invalid username or password");
    }

    sessionStorage.setItem("supabaseAccessToken", result.access_token);
    sessionStorage.setItem("supabaseRefreshToken", result.refresh_token || "");
    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("username", username);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const username =
          document.getElementById("username")?.value.trim() || "";
        const password = document.getElementById("password")?.value || "";

        if (!username || !password) {
          setError("Please enter both username and password");
          return;
        }

        setSubmitting(true);
        try {
          await signIn(username, password);
          window.location.reload();
        } catch (error) {
          sessionStorage.removeItem("isLoggedIn");
          sessionStorage.removeItem("username");
          sessionStorage.removeItem("supabaseAccessToken");
          sessionStorage.removeItem("supabaseRefreshToken");
          setError(error.message || "Unable to sign in. Please try again.");
          const passwordInput = document.getElementById("password");
          if (passwordInput) passwordInput.value = "";
          setSubmitting(false);
        }
      },
      true,
    );
  });
})();
