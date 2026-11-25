package com.example.demo.controller;

import com.example.demo.entity.SystemUser;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.SystemUserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users")
public class UserController {

    private final SystemUserRepository userRepository;

    public UserController(SystemUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('FLEET_MANAGER')")
    public ResponseEntity<List<SystemUser>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('FLEET_MANAGER')")
    public ResponseEntity<SystemUser> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/technicians")
    @PreAuthorize("hasAnyRole('FLEET_MANAGER', 'MAINTENANCE_TECH', 'ADMIN')")
    public ResponseEntity<List<SystemUser>> getTechnicians() {
        return ResponseEntity.ok(userRepository.findByRole(UserRole.MAINTENANCE_TECH));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        userRepository.deleteById(id);
        return ResponseEntity.ok("User deleted successfully.");
    }
}
