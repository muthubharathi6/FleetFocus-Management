package com.example.demo.service;

import com.example.demo.entity.Vehicle;
import com.example.demo.entity.VehicleStatus;
import com.example.demo.exception.DuplicateResourceException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final TelemetryDataRepository telemetryDataRepository;
    private final TripRepository tripRepository;
    private final MaintenanceLogRepository maintenanceLogRepository;
    private final AlertRepository alertRepository;

    public VehicleService(VehicleRepository vehicleRepository,
                          TelemetryDataRepository telemetryDataRepository,
                          TripRepository tripRepository,
                          MaintenanceLogRepository maintenanceLogRepository,
                          AlertRepository alertRepository) {
        this.vehicleRepository = vehicleRepository;
        this.telemetryDataRepository = telemetryDataRepository;
        this.tripRepository = tripRepository;
        this.maintenanceLogRepository = maintenanceLogRepository;
        this.alertRepository = alertRepository;
    }

    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    public Page<Vehicle> getAllVehicles(Pageable pageable) {
        return vehicleRepository.findAll(pageable);
    }

    public Vehicle getVehicleById(Long id) {
        return vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));
    }

    public Vehicle createVehicle(Vehicle vehicle) {
        if (vehicle.getStatus() == null) vehicle.setStatus(VehicleStatus.AVAILABLE);
        if (vehicle.getCurrentMileage() == null) vehicle.setCurrentMileage(0.0);
        if (vehicle.getVin() != null && vehicleRepository.existsByVin(vehicle.getVin())) {
            throw new DuplicateResourceException("VIN already exists");
        }
        if (vehicle.getLicensePlate() != null && vehicleRepository.existsByLicensePlate(vehicle.getLicensePlate())) {
            throw new DuplicateResourceException("License plate already exists");
        }
        return vehicleRepository.save(vehicle);
    }

    public Vehicle updateVehicle(Long id, Vehicle vehicleDetails) {
        Vehicle vehicle = getVehicleById(id);
        if (vehicleDetails.getVin() != null && !vehicleDetails.getVin().equals(vehicle.getVin())
                && vehicleRepository.existsByVin(vehicleDetails.getVin())) {
            throw new DuplicateResourceException("VIN already exists");
        }
        if (vehicleDetails.getLicensePlate() != null && !vehicleDetails.getLicensePlate().equals(vehicle.getLicensePlate())
                && vehicleRepository.existsByLicensePlate(vehicleDetails.getLicensePlate())) {
            throw new DuplicateResourceException("License plate already exists");
        }
        vehicle.setVin(vehicleDetails.getVin());
        vehicle.setLicensePlate(vehicleDetails.getLicensePlate());
        vehicle.setModel(vehicleDetails.getModel());
        vehicle.setStatus(vehicleDetails.getStatus());
        vehicle.setCurrentMileage(vehicleDetails.getCurrentMileage());
        return vehicleRepository.save(vehicle);
    }

    @Transactional
    public void deleteVehicle(Long id) {
        Vehicle vehicle = getVehicleById(id);
        telemetryDataRepository.deleteByVehicle(vehicle);
        tripRepository.deleteByVehicle(vehicle);
        maintenanceLogRepository.deleteByVehicle(vehicle);
        alertRepository.deleteByVehicle(vehicle);
        vehicleRepository.delete(vehicle);
    }
}
