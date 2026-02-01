package com.sellbit.domain.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.persistence.EntityNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Prinde erorile aruncate manual de noi în Service (ex: throw new RuntimeException("COD_EROARE"))
     * React va primi JSON-ul: { "message": "ERROR.CATEGORY.DUPLICATE_CODE" }
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(ex.getMessage()));
    }

    /**
     * Handle DB constraint violations (ex: UNIQUE constraint la nivel de SQL)
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleConflict() {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("ERROR.DATABASE.CONFLICT"));
    }

    /**
     * Handle cases where the entity is not found
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound() {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("ERROR.ENTITY.NOT_FOUND"));
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        
        // Extragem doar primul mesaj de eroare definit de tine în DTO
        String errorMessage = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getDefaultMessage())
                .findFirst()
                .orElse("VALIDATION_ERROR");

        errors.put("message", errorMessage);
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
    
    /**
     * Prinde erorile de autentificare (ex: parolă greșită la login)
     */
    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(org.springframework.security.core.AuthenticationException ex) {
        // Dacă eroarea vine din UserDetailsService, ex.getMessage() va fi "ERROR.USER.NOT_FOUND"
        // Dacă e parolă greșită, Spring va zice "Bad credentials", deci punem codul nostru
        String message = ex.getMessage().equals("Bad credentials") ? "ERROR.AUTH.BAD_CREDENTIALS" : ex.getMessage();
        
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(message));
    }

    /**
     * Prinde erorile de autorizare (ex: @PreAuthorize a eșuat - nivel prea mic)
     */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException() {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("ERROR.AUTH.FORBIDDEN"));
    }

    
    //Tratează cazul de stoc insuficient și trimite lista produselor.    
    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientStock(InsufficientStockException ex) {
        Map<String, Object> response = new HashMap<>();
        
        // Mesajul de eroare (codul)
        response.put("message", ex.getMessage());
        
        // Lista cu numele produselor care lipsesc
        response.put("params", ex.getProductNames());
        
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }
}