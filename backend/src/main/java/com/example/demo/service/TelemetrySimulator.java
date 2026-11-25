package com.example.demo.service;

import com.example.demo.entity.TelemetryData;
import com.example.demo.entity.Vehicle;
import com.example.demo.entity.VehicleStatus;
import com.example.demo.repository.TelemetryDataRepository;
import com.example.demo.repository.VehicleRepository;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.security.SecureRandom;

@Component
@EnableScheduling
public class TelemetrySimulator {

    private final VehicleRepository vehicleRepository;
    private final TelemetryDataRepository telemetryDataRepository;
    private final SecureRandom random = new SecureRandom();

    public TelemetrySimulator(VehicleRepository vehicleRepository,
                               TelemetryDataRepository telemetryDataRepository) {
        this.vehicleRepository = vehicleRepository;
        this.telemetryDataRepository = telemetryDataRepository;
    }

    @Scheduled(fixedRate = 5000)
    public void simulateTelemetry() {
        List<Vehicle> activeVehicles = vehicleRepository.findByStatus(VehicleStatus.ON_TRIP);
        for (Vehicle vehicle : activeVehicles) {
            TelemetryData data = new TelemetryData();
            data.setVehicle(vehicle);
            data.setLatitude(10.0 + random.nextDouble() * 10);
            data.setLongitude(77.0 + random.nextDouble() * 10);
            data.setSpeed(40.0 + random.nextDouble() * 80);
            data.setFuelLevel(20.0 + random.nextDouble() * 80);
            data.setEngineTemp(70.0 + random.nextDouble() * 30);
            data.setRecordedAt(LocalDateTime.now());
            telemetryDataRepository.save(data);
        }
    }
}
