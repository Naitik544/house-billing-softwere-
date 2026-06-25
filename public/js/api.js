const API_BASE = '/api';

// Helper to make authenticated requests
async function request(url, options = {}) {
  const token = localStorage.getItem('jwtToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Session expired or invalid
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userProfile');
    showLoginView();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.msg || 'Something went wrong');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Authentication API methods
const authApi = {
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('jwtToken', data.token);
    localStorage.setItem('userProfile', JSON.stringify(data.user));
    return data;
  },
  
  async register(name, email, password) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    localStorage.setItem('jwtToken', data.token);
    localStorage.setItem('userProfile', JSON.stringify(data.user));
    return data;
  },

  async getProfile() {
    return request('/auth/profile');
  },

  async updateProfile(profileData) {
    const data = await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    localStorage.setItem('userProfile', JSON.stringify(data));
    return data;
  },

  logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userProfile');
    showLoginView();
  },

  isLoggedIn() {
    return !!localStorage.getItem('jwtToken');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('userProfile')) || {};
    } catch {
      return {};
    }
  }
};

// Tenant API methods
const tenantApi = {
  async getAll() {
    return request('/tenants');
  },

  async getById(id) {
    return request(`/tenants/${id}`);
  },

  async create(tenantData) {
    return request('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData)
    });
  },

  async update(id, tenantData) {
    return request(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData)
    });
  },

  async delete(id) {
    return request(`/tenants/${id}`, {
      method: 'DELETE'
    });
  }
};

// Bill API methods
const billApi = {
  async getAll() {
    return request('/bills');
  },

  async getById(id) {
    return request(`/bills/${id}`);
  },

  async create(billData) {
    return request('/bills', {
      method: 'POST',
      body: JSON.stringify(billData)
    });
  },

  async update(id, billData) {
    return request(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(billData)
    });
  },

  async delete(id) {
    return request(`/bills/${id}`, {
      method: 'DELETE'
    });
  },

  async getSuggestDues(tenantId) {
    return request(`/bills/suggest-dues/${tenantId}`);
  }
};

// Payment API methods
const paymentApi = {
  async getAll() {
    return request('/payments');
  },

  async getById(id) {
    return request(`/payments/${id}`);
  },

  async create(paymentData) {
    return request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },

  async update(id, paymentData) {
    return request(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData)
    });
  },

  async delete(id) {
    return request(`/payments/${id}`, {
      method: 'DELETE'
    });
  }
};

// Dashboard API methods
const dashboardApi = {
  async getStats() {
    return request('/dashboard/stats');
  }
};
