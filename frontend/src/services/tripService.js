import api from './api';

const tripService = {
  getAll: () =>
    api.get('/trips'),

  start: (data) =>
    api.post('/trips/start', data),

  end: (id, distance) =>
    api.put(`/trips/${id}/end`, { distance }),
};

export default tripService;