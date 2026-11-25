import api from './api';

const driverService = {
  getAll: () =>
    api.get('/drivers'),

  getById: (id) =>
    api.get(`/drivers/${id}`),

  getAvailable: () =>
    api.get('/drivers/available'),

  create: (data) =>
    api.post('/drivers', data),

  update: (id, data) =>
    api.put(`/drivers/${id}`, data),

  delete: (id) =>
    api.delete(`/drivers/${id}`),
};

export default driverService;
