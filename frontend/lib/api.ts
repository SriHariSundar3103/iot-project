import axios from "axios";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const authAPI = {
  async authenticateRFID(rfidUid: string) {
    return axios.post(`${apiBase}/api/auth/rfid`, { rfid_uid: rfidUid });
  },

  async login(email: string, password: string) {
    return axios.post(`${apiBase}/api/auth/login`, { email, password });
  },
};

export const adminAPI = {
  async getStaff() {
    return axios.get(`${apiBase}/api/admin/staff`);
  },
  async updateStaff(staffId: string, payload: any) {
    return axios.patch(`${apiBase}/api/admin/staff/${staffId}`, payload);
  },
  async deleteStaff(staffId: string) {
    return axios.delete(`${apiBase}/api/admin/staff/${staffId}`);
  },
  async createStaff(payload: any) {
    return axios.post(`${apiBase}/api/admin/staff`, payload);
  },
};

export const analyticsAPI = {
  async getDashboard() {
    return axios.get(`${apiBase}/api/admin/analytics/dashboard`);
  },
};

export const toolsAPI = {
  async getAll() {
    return axios.get(`${apiBase}/api/tools`);
  },
  async create(payload: any) {
    return axios.post(`${apiBase}/api/tools`, payload);
  },
  async update(toolId: string, payload: any) {
    return axios.patch(`${apiBase}/api/tools/${toolId}`, payload);
  },
  async delete(toolId: string) {
    return axios.delete(`${apiBase}/api/tools/${toolId}`);
  },
};

export const transactionsAPI = {
  async getTakenItems(staffId: string) {
    return axios.get(`${apiBase}/api/staff/${staffId}/taken-items`);
  },

  async take(payload: any) {
    return axios.post(`${apiBase}/api/transactions/take`, payload);
  },
  async deposit(payload: any) {
    return axios.post(`${apiBase}/api/transactions/deposit`, payload);
  },
};

