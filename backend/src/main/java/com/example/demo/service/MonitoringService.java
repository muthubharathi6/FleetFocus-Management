package com.example.demo.service;

import com.example.demo.entity.TelemetryData;
import com.example.demo.entity.Vehicle;
import com.example.demo.repository.TelemetryRepository;
import com.example.demo.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class MonitoringService {

    private final VehicleRepository vehicleRepository;
    private final TelemetryRepository telemetryRepository;

    public MonitoringService(VehicleRepository vehicleRepository, TelemetryRepository telemetryRepository) {
        this.vehicleRepository = vehicleRepository;
        this.telemetryRepository = telemetryRepository;
    }

    public List<Map<String, Object>> getLiveFleetStatus() {
        List<Vehicle> vehicles = vehicleRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Vehicle vehicle : vehicles) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("vehicleId", vehicle.getId());
            entry.put("vin", vehicle.getVin());
            entry.put("licensePlate", vehicle.getLicensePlate());
            entry.put("model", vehicle.getModel());
            entry.put("status", vehicle.getStatus());
            Optional<TelemetryData> telemetry = telemetryRepository.findTopByVehicleIdOrderByRecordedAtDesc(vehicle.getId());
            if (telemetry.isPresent()) {
                TelemetryData t = telemetry.get();
                entry.put("latitude", t.getLatitude());
                entry.put("longitude", t.getLongitude());
                entry.put("speed", t.getSpeed());
                entry.put("fuelLevel", t.getFuelLevel());
            } else {
                entry.put("latitude", null);
                entry.put("longitude", null);
                entry.put("speed", null);
                entry.put("fuelLevel", null);
            }
            result.add(entry);
        }
        return result;
    }
}
