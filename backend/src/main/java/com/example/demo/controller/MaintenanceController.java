package com.example.demo.controller;

import com.example.demo.entity.MaintenanceLog;
import com.example.demo.entity.SystemUser;
import com.example.demo.entity.Vehicle;
import com.example.demo.repository.MaintenanceLogRepository;
import com.example.demo.repository.SystemUserRepository;
import com.example.demo.repository.VehicleRepository;
import com.example.demo.service.MaintenanceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/maintenance")
@Tag(name = "Maintenance")
public class MaintenanceController {

    private final MaintenanceLogRepository maintenanceLogRepository;
    private final VehicleRepository vehicleRepository;
    private final SystemUserRepository userRepository;
    private final MaintenanceService maintenanceService;

    public MaintenanceController(MaintenanceLogRepository maintenanceLogRepository,
                                 VehicleRepository vehicleRepository,
                                 SystemUserRepository userRepository,
                                 MaintenanceService maintenanceService) {
        this.maintenanceLogRepository = maintenanceLogRepository;
        this.vehicleRepository = vehicleRepository;
        this.userRepository = userRepository;
        this.maintenanceService = maintenanceService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'MAINTENANCE_TECH')")
    public ResponseEntity<List<MaintenanceLog>> getAllLogs() {
        return ResponseEntity.ok(maintenanceLogRepository.findAll());
    }

    @PostMapping("/log")
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'MAINTENANCE_TECH')")
    public ResponseEntity<?> logMaintenance(@RequestBody MaintenanceRequest request) {
        Long vehicleId = request.vehicle() != null ? request.vehicle().id() : null;
        Long technicianId = request.technician() != null ? request.technician().id() : null;

        if (vehicleId == null) return ResponseEntity.badRequest().body("Vehicle is required");
        if (technicianId == null) return ResponseEntity.badRequest().body("Technician is required");

        Vehicle vehicle = vehicleRepository.findById(vehicleId).orElse(null);
        if (vehicle == null) return ResponseEntity.badRequest().body("Vehicle not found");

        SystemUser tech = userRepository.findById(technicianId).orElse(null);
        if (tech == null) return ResponseEntity.badRequest().body("Technician not found");

        MaintenanceLog log = new MaintenanceLog();
        log.setVehicle(vehicle);
        log.setTechnician(tech);
        log.setServiceDate(request.serviceDate() != null ? request.serviceDate() : LocalDate.now());
        log.setDescription(request.description());
        log.setCost(request.cost());
        log.setMileageAtService(vehicle.getCurrentMileage() != null ? vehicle.getCurrentMileage() : 0.0);

        return ResponseEntity.ok(maintenanceService.logMaintenance(log));
    }

    public record MaintenanceRequest(RefId vehicle, RefId technician,
                                     LocalDate serviceDate, String description, Double cost) {
        public record RefId(Long id) {}
    }
}
