import api from './api';

const monitoringService = {
  getLiveFleet: () =>
    api.get('/monitoring/live'),
};

export default monitoringService;