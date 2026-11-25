package com.example.demo.service;

import com.example.demo.entity.MaintenanceLog;
import com.example.demo.entity.VehicleStatus;
import com.example.demo.repository.MaintenanceLogRepository;
import com.example.demo.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MaintenanceService {

    private final MaintenanceLogRepository maintenanceLogRepository;
    private final VehicleRepository vehicleRepository;

    public MaintenanceService(MaintenanceLogRepository maintenanceLogRepository,
                              VehicleRepository vehicleRepository) {
        this.maintenanceLogRepository = maintenanceLogRepository;
        this.vehicleRepository = vehicleRepository;
    }

    public List<MaintenanceLog> getAllLogs() {
        return maintenanceLogRepository.findAll();
    }

    public MaintenanceLog logMaintenance(MaintenanceLog log) {
        log.getVehicle().setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(log.getVehicle());
        return maintenanceLogRepository.save(log);
    }
}
