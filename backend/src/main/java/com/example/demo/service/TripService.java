package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.DriverRepository;
import com.example.demo.repository.TripRepository;
import com.example.demo.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TripService {

    private final TripRepository tripRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;

    public TripService(TripRepository tripRepository, VehicleRepository vehicleRepository,
                       DriverRepository driverRepository) {
        this.tripRepository = tripRepository;
        this.vehicleRepository = vehicleRepository;
        this.driverRepository = driverRepository;
    }

    public List<Trip> getAllTrips() {
        return tripRepository.findAll();
    }

    public Trip startTrip(Long vehicleId, Long driverId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + vehicleId));
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + driverId));

        if (vehicle.getStatus() != VehicleStatus.AVAILABLE) {
            throw new IllegalStateException("Vehicle is not available");
        }
        if (driver.getStatus() != DriverStatus.AVAILABLE) {
            throw new IllegalStateException("Driver is not available");
        }

        vehicle.setStatus(VehicleStatus.ON_TRIP);
        driver.setStatus(DriverStatus.ON_TRIP);
        vehicleRepository.save(vehicle);
        driverRepository.save(driver);

        Trip trip = new Trip();
        trip.setVehicle(vehicle);
        trip.setDriver(driver);
        trip.setStartTime(LocalDateTime.now());
        trip.setStatus(TripStatus.ACTIVE);
        trip.setDistanceCovered(0.0);
        return tripRepository.save(trip);
    }

    public Trip endTrip(Long tripId, Double distance) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));

        Vehicle vehicle = trip.getVehicle();
        Driver driver = trip.getDriver();

        vehicle.setStatus(VehicleStatus.AVAILABLE);
        driver.setStatus(DriverStatus.AVAILABLE);
        if (vehicle.getCurrentMileage() == null) vehicle.setCurrentMileage(0.0);
        vehicle.setCurrentMileage(vehicle.getCurrentMileage() + distance);
        vehicleRepository.save(vehicle);
        driverRepository.save(driver);

        trip.setEndTime(LocalDateTime.now());
        trip.setStatus(TripStatus.COMPLETED);
        trip.setDistanceCovered(distance);
        return tripRepository.save(trip);
    }
}
