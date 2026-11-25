package com.example.demo.service;

import com.example.demo.dto.AuthRequestDto;
import com.example.demo.dto.AuthResponseDto;
import com.example.demo.entity.Driver;
import com.example.demo.entity.DriverStatus;
import com.example.demo.entity.SystemUser;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.DriverRepository;
import com.example.demo.repository.SystemUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuthService {

    private final SystemUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Autowired(required = false)
    private DriverRepository driverRepository;

    // Backward-compatible original constructor for existing unit tests
    public AuthService(SystemUserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, @Lazy AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponseDto authenticate(AuthRequestDto request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        SystemUser user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        String token = jwtService.generateToken(user);
        return new AuthResponseDto(token, user.getUsername(), user.getRole().name());
    }

    public void register(String username, String password, String email, UserRole role) {
        SystemUser user = new SystemUser(username, passwordEncoder.encode(password), email, role);
        SystemUser savedUser = userRepository.save(user);

        // When a user registers with DRIVER role, create Driver entity if repository is present
        if (role == UserRole.DRIVER && driverRepository != null) {
            Driver driver = new Driver();
            driver.setUser(savedUser);
            driver.setLicenseNumber("DL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            driver.setStatus(DriverStatus.AVAILABLE);
            driverRepository.save(driver);
        }
    }
}
