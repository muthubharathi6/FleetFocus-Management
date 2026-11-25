package com.example.demo.repository;

import com.example.demo.entity.MaintenanceLog;
import com.example.demo.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MaintenanceLogRepository extends JpaRepository<MaintenanceLog, Long> {
    @Transactional
    void deleteByVehicle(Vehicle vehicle);
}
