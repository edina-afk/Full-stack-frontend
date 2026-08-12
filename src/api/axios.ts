import axios from "axios";

const api = axios.create({
  baseURL: "https://api.mensursultan.com",
});

api.interceptors.request.use((config) => {
  const storedUser = window.localStorage.getItem("user");

  if (storedUser) {
    const user = JSON.parse(storedUser);

    if (user?.role) {
      config.headers = config.headers || {};
      config.headers["user-role"] = user.role;
    }
  }

  return config;
});

export default api;