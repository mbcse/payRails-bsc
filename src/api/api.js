import axios from "axios";

// const BASE_URL = 'http://localhost:8080';
const BASE_URL = "https://cerebro.s9y-sandbox.gg";
// const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

axios.defaults.baseURL = BASE_URL;
axios.defaults.headers["x-api-key"] = process.env.NEXT_PUBLIC_CLIENT_API_KEY;

const api = {
  get(url, headers = {}) {
    return axios.get(url, { headers });
  },
  post(url, payload = {}) {
    return axios.post(url, payload.body);
  },
  put(url, payload = {}) {
    return axios.put(url, payload.body);
  },
};

export default api;
