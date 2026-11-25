package com.example.demo.controller;

import com.example.demo.entity.Driver;
import com.example.demo.entity.DriverStatus;
import com.example.demo.entity.SystemUser;
import com.example.demo.repository.DriverRepository;
import com.example.demo.repository.SystemUserRepository;
import com.example.demo.repository.TripRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drivers")
@Tag(name = "Drivers")
public class DriverController {

    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;
    private final SystemUserRepository userRepository;

    public DriverController(DriverRepository driverRepository,
                            TripRepository tripRepository,
                            SystemUserRepository userRepository) {
        this.driverRepository = driverRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DISPATCHER', 'ADMIN')")
    public ResponseEntity<List<Driver>> getAllDrivers() {
        return ResponseEntity.ok(driverRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DISPATCHER', 'ADMIN')")
    public ResponseEntity<Driver> getDriverById(@PathVariable Long id) {
        return driverRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/available")
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'DISPATCHER')")
    public ResponseEntity<List<Driver>> getAvailableDrivers() {
        return ResponseEntity.ok(driverRepository.findByStatus(DriverStatus.AVAILABLE));
    }

    @PostMapping
    @PreAuthorize("hasRole('FLEET_MANAGER')")
    public ResponseEntity<?> createDriver(@RequestBody DriverRequest request) {
        SystemUser user = userRepository.findById(request.userId()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        Driver driver = new Driver();
        driver.setUser(user);
        driver.setLicenseNumber(request.licenseNumber());
        driver.setStatus(request.status() != null ? request.status() : DriverStatus.AVAILABLE);
        return ResponseEntity.status(HttpStatus.CREATED).body(driverRepository.save(driver));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('FLEET_MANAGER')")
    public ResponseEntity<?> updateDriver(@PathVariable Long id, @RequestBody DriverUpdateRequest request) {
        return driverRepository.findById(id).map(driver -> {
            if (request.licenseNumber() != null) driver.setLicenseNumber(request.licenseNumber());
            if (request.status() != null) driver.setStatus(request.status());
            return ResponseEntity.ok(driverRepository.save(driver));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('FLEET_MANAGER')")
    @Transactional
    public ResponseEntity<String> deleteDriver(@PathVariable Long id) {
        return driverRepository.findById(id).map(driver -> {
            tripRepository.findAll().stream()
                    .filter(t -> t.getDriver().getId().equals(id))
                    .forEach(tripRepository::delete);
            driverRepository.delete(driver);
            return ResponseEntity.ok("Driver deleted successfully.");
        }).orElse(ResponseEntity.notFound().build());
    }

    public record DriverRequest(Long userId, String licenseNumber, DriverStatus status) {}
    public record DriverUpdateRequest(String licenseNumber, DriverStatus status) {}
}
