import api from './api';

const userService = {
  getAll: () =>
    api.get('/users'),

  getById: (id) =>
    api.get(`/users/${id}`),

  getTechnicians: () =>
    api.get('/users/technicians'),

  delete: (id) =>
    api.delete(`/users/${id}`),
};

export default userService;
