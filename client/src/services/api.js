import { API_URL } from "../config/constant";
const api = {
    request: async (endpoint, options = {}) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Request failed');
        return data;
    },

    auth: {
        register: (userData) => api.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        }),
        login: (credentials) => api.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }),
        logout: () => api.request('/auth/logout', { method: 'POST' }),
    },

    rooms: {
        getAll: () => api.request('/rooms'),
        create: (roomData) => api.request('/rooms/create', {
            method: 'POST',
            body: JSON.stringify(roomData),
        }),
        get: (roomId) => api.request(`/rooms/${roomId}`),
        delete: (roomId) => api.request(`/rooms/${roomId}`, {
            method: 'DELETE',
        }),
    },
};

export default api;