package com.sellbit;

import java.util.TimeZone;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import jakarta.annotation.PostConstruct;

@SpringBootApplication
public class BackendApplication {

	@PostConstruct
	public void init() {
		TimeZone.setDefault(TimeZone.getTimeZone("Europe/Bucharest"));
	}

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}
	@Bean
public CommandLineRunner debugPassword(PasswordEncoder passwordEncoder) {
    return args -> {
        String rawPassword = "123";
        String encodedPassword = passwordEncoder.encode(rawPassword);
        
        System.out.println("\n=================================================");
        System.out.println("DEBUG PASSWORD GENERATOR (BCrypt)");
        System.out.println("Raw: " + rawPassword);
        System.out.println("Hash: " + encodedPassword);
        
        // Testăm dacă encoderul recunoaște propriul hash generat
        boolean matches = passwordEncoder.matches(rawPassword, encodedPassword);
        System.out.println("Verification test: " + (matches ? "PASSED" : "FAILED"));
        System.out.println("=================================================\n");
    };
}
}
