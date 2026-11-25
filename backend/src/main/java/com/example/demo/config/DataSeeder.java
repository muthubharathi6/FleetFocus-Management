package com.example.demo.config;

import com.example.demo.entity.*;
import com.example.demo.repository.*;
import com.example.demo.service.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
public class DataSeeder implements CommandLineRunner {

    private final AuthService authService;
    private final SystemUserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;
    private final MaintenanceLogRepository maintenanceLogRepository;

    public DataSeeder(AuthService authService, SystemUserRepository userRepository,
                      VehicleRepository vehicleRepository, DriverRepository driverRepository,
                      TripRepository tripRepository, MaintenanceLogRepository maintenanceLogRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.driverRepository = driverRepository;
        this.tripRepository = tripRepository;
        this.maintenanceLogRepository = maintenanceLogRepository;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;

        authService.register("manager", "admin123", "manager@fleet.com", UserRole.FLEET_MANAGER);
        authService.register("admin", "admin123", "admin@fleet.com", UserRole.ADMIN);
        authService.register("dispatcher", "admin123", "dispatcher@fleet.com", UserRole.DISPATCHER);
        authService.register("driver1", "driver123", "driver1@fleet.com", UserRole.DRIVER);
        authService.register("tech1", "tech123", "tech1@fleet.com", UserRole.MAINTENANCE_TECH);

        Vehicle v1 = new Vehicle();
        v1.setVin("1HGCM82633A00435");
        v1.setLicensePlate("ABC-1234");
        v1.setModel("Volvo FH16");
        v1.setStatus(VehicleStatus.AVAILABLE);
        v1.setCurrentMileage(15000.0);
        vehicleRepository.save(v1);

        Vehicle v2 = new Vehicle();
        v2.setVin("1FM5K8F85HGA0000");
        v2.setLicensePlate("XYZ-5678");
        v2.setModel("Mercedes-Benz Actros");
        v2.setStatus(VehicleStatus.ON_TRIP);
        v2.setCurrentMileage(45000.0);
        vehicleRepository.save(v2);

        SystemUser driverUser = userRepository.findByUsername("driver1").orElseThrow();
        Driver driver = new Driver();
        driver.setUser(driverUser);
        driver.setLicenseNumber("DL-12345678");
        driver.setStatus(DriverStatus.AVAILABLE);
        driverRepository.save(driver);

        Trip trip = new Trip();
        trip.setVehicle(v2);
        trip.setDriver(driver);
        trip.setStartTime(LocalDateTime.now().minusHours(2));
        trip.setStatus(TripStatus.ACTIVE);
        trip.setDistanceCovered(120.5);
        tripRepository.save(trip);

        SystemUser tech = userRepository.findByUsername("tech1").orElseThrow();
        MaintenanceLog log = new MaintenanceLog();
        log.setVehicle(v1);
        log.setTechnician(tech);
        log.setServiceDate(LocalDate.now());
        log.setDescription("Initial System Check");
        log.setCost(250.0);
        maintenanceLogRepository.save(log);
    }
}
