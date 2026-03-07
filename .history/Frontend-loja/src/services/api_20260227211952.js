import axios from "axios";

const api = axios.create({
  baseURL: `http://${window.location.hostname}:3000`,
});

export default api;