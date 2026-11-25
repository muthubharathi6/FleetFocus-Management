import api from './api';

const vehicleService = {
  getAll: (page = 0, size = 10) =>
    api.get(`/vehicles?page=${page}&size=${size}`),

  getAvailable: () =>
    api.get('/vehicles/available'),

  getById: (id) =>
    api.get(`/vehicles/${id}`),

  create: (data) =>
    api.post('/vehicles', data),

  update: (id, data) =>
    api.put(`/vehicles/${id}`, data),

  delete: (id) =>
    api.delete(`/vehicles/${id}`),
};

export default vehicleService;