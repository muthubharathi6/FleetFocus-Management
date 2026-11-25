package com.example.demo.exception;

/**
 * Thrown when an operation would violate a uniqueness constraint
 * (e.g. creating a vehicle with a VIN or license plate that already exists).
 * Handled by {@link GlobalExceptionHandler} and mapped to HTTP 409 Conflict.
 */
public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
