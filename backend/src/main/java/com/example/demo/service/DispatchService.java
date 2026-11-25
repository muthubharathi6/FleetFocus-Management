package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.exception.BusinessValidationException;
import com.example.demo.repository.DriverRepository;
import com.example.demo.repository.TripRepository;
import com.example.demo.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class DispatchService {

    private final TripRepository tripRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;

    public DispatchService(TripRepository tripRepository, VehicleRepository vehicleRepository,
                           DriverRepository driverRepository) {
        this.tripRepository = tripRepository;
        this.vehicleRepository = vehicleRepository;
        this.driverRepository = driverRepository;
    }

    public Trip createTrip(Long vehicleId, Long driverId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new BusinessValidationException("Vehicle not found: " + vehicleId));
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new BusinessValidationException("Driver not found: " + driverId));

        if (vehicle.getStatus() != VehicleStatus.AVAILABLE) {
            throw new BusinessValidationException("Vehicle is not available for dispatch");
        }
        if (driver.getStatus() != DriverStatus.AVAILABLE) {
            throw new BusinessValidationException("Driver is not available for dispatch");
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

    public Trip endTrip(Long tripId, Double finalDistance) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new BusinessValidationException("Trip not found: " + tripId));

        if (trip.getStatus() != TripStatus.ACTIVE) {
            throw new BusinessValidationException("Trip is not active");
        }

        Vehicle vehicle = trip.getVehicle();
        Driver driver = trip.getDriver();

        vehicle.setStatus(VehicleStatus.AVAILABLE);
        driver.setStatus(DriverStatus.AVAILABLE);
        if (vehicle.getCurrentMileage() == null) vehicle.setCurrentMileage(0.0);
        vehicle.setCurrentMileage(vehicle.getCurrentMileage() + finalDistance);
        vehicleRepository.save(vehicle);
        driverRepository.save(driver);

        trip.setEndTime(LocalDateTime.now());
        trip.setStatus(TripStatus.COMPLETED);
        trip.setDistanceCovered(finalDistance);
        return tripRepository.save(trip);
    }
}
