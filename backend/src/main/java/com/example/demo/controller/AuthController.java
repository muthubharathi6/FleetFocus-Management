package com.example.demo.controller;

import com.example.demo.dto.AuthRequestDto;
import com.example.demo.dto.AuthResponseDto;
import com.example.demo.entity.UserRole;
import com.example.demo.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @SecurityRequirements
    @Operation(summary = "Register a new user")
    public ResponseEntity<String> register(@RequestBody RegisterRequest request) {
        authService.register(request.username(), request.password(), request.email(),
                request.role() != null ? request.role() : UserRole.DRIVER);
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(summary = "Login and get JWT token")
    public ResponseEntity<AuthResponseDto> login(@RequestBody AuthRequestDto request) {
        try {
            return ResponseEntity.ok(authService.authenticate(request));
        } catch (org.springframework.security.core.AuthenticationException e) {
            return ResponseEntity.status(401).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).build();
        }
    }

    public record RegisterRequest(String username, String password, String email, UserRole role) {}
}
