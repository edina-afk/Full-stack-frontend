import axios from "axios";

const baseUrl = "https://api.mensursultan.com";

const api = axios.create({
  baseURL: baseUrl,
});

api.interceptors.request.use(
  (config) => {
    const storedUser = window.localStorage.getItem("user");
    const token = window.localStorage.getItem("token");

    const authToken = token || (storedUser ? JSON.parse(storedUser)?.access_token : null);

    if (authToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        if (user?.role) {
          config.headers = config.headers || {};
          delete config.headers["user-role"];
        }
      } catch (error) {
        console.error("Invalid stored user data:", error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;