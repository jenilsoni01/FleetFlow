import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
});

// Attach accessToken from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → try to refresh, then retry once
let refreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  );
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      refreshing = true;

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_SERVER_URL}/auth/refresh-token`,
          {},
          { withCredentials: true },
        );
        const newToken = res.data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem("accessToken", newToken);
          api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
