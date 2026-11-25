package com.example.demo.repository;

import com.example.demo.entity.Vehicle;
import com.example.demo.entity.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByStatus(VehicleStatus status);
    boolean existsByVin(String vin);
    boolean existsByLicensePlate(String licensePlate);
}
