package com.example.demo.controller;

import com.example.demo.entity.Trip;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.DriverRepository;
import com.example.demo.repository.SystemUserRepository;
import com.example.demo.repository.TripRepository;
import com.example.demo.service.TripService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
@Tag(name = "Trips")
public class TripController {

    private final TripService tripService;
    private final TripRepository tripRepository;
    private final SystemUserRepository userRepository;
    private final DriverRepository driverRepository;

    public TripController(TripService tripService, TripRepository tripRepository,
                          SystemUserRepository userRepository, DriverRepository driverRepository) {
        this.tripService = tripService;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.driverRepository = driverRepository;
    }

    @GetMapping
    public ResponseEntity<List<Trip>> getAllTrips(Authentication authentication) {
        var user = userRepository.findByUsername(authentication.getName()).orElseThrow();
        if (user.getRole() == UserRole.DRIVER) {
            var driver = driverRepository.findAll().stream()
                    .filter(d -> d.getUser().getId().equals(user.getId()))
                    .findFirst();
            if (driver.isPresent()) {
                // Return the driver's full trip history (ACTIVE, COMPLETED, CANCELLED),
                // not just their currently-active trip, so their trip log is complete.
                return ResponseEntity.ok(tripRepository.findByDriverId(driver.get().getId()));
            }
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(tripService.getAllTrips());
    }

    @PostMapping("/start")
    public ResponseEntity<Trip> startTrip(@RequestBody StartTripRequest body) {
        return ResponseEntity.ok(tripService.startTrip(body.vehicleId(), body.driverId()));
    }

    @PutMapping("/{id}/end")
    public ResponseEntity<Trip> endTrip(@PathVariable Long id, @RequestBody EndTripRequest body) {
        return ResponseEntity.ok(tripService.endTrip(id, body.distance()));
    }

    public record StartTripRequest(Long vehicleId, Long driverId) {}
    public record EndTripRequest(Double distance) {}
}
