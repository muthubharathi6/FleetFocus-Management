import api from './api';

const maintenanceService = {
  getAll: () =>
    api.get('/maintenance'),

  log: (data) =>
    api.post('/maintenance/log', data),
};

export default maintenanceService;