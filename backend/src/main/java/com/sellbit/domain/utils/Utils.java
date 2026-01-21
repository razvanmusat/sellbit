package com.sellbit.domain.utils;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class Utils {

    private static final String TEMP_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    // Minim 6 caractere, litera mica, litera mare, semn punctiatie, cifra
    private static final String PASSWORD_PATTERN = 
        "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{6,}$";

    /**
     * Formateaza username-ul: litere mici si verifica structura cuvant.cuvant
     */
    public static String formatUsername(String username) {
        if (username == null) return "";
        
        // Convertim in lowercase si eliminam diacriticele pentru siguranta sistemului
        String normalized = Normalizer.normalize(username.trim().toLowerCase(), Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String result = pattern.matcher(normalized).replaceAll("");

        // Verificam daca are punct. Daca nu are, logica din Service va trebui sa arunce eroare.
        return result;
    }

    /**
     * Verifica daca username-ul contine cel putin un punct (forma prenume.nume)
     */
    public static boolean isValidUsernameFormat(String username) {
        return username != null && username.contains(".") && !username.startsWith(".") && !username.endsWith(".");
    }

    /**
     * Formateaza Full Name: Prima Litera Mare, restul mici pentru fiecare cuvant
     */
    public static String formatFullName(String name) {
        if (name == null || name.isBlank()) return "";
        return Arrays.stream(name.trim().toLowerCase().split("\\s+"))
                .filter(s -> !s.isEmpty())
                .map(s -> Character.toUpperCase(s.charAt(0)) + s.substring(1))
                .collect(Collectors.joining(" "));
    }

    /**
     * Validare parola conform cerintelor
     */
    public static boolean isValidPassword(String password) {
        if (password == null) return false;
        return Pattern.compile(PASSWORD_PATTERN).matcher(password).matches();
    }
    
    public static boolean isValidPhoneNumber(String phone) {
        if (phone == null || phone.isBlank()) {
            return false;
        }

        String cleanPhone = phone.trim();

        // 1. Verificare pentru numere internaționale
        if (cleanPhone.startsWith("+")) {
            return cleanPhone.length() >= 5; // Minim 5 caractere pentru un nr internațional valid
        }

        // 2. Verificare strictă pentru România (07... + încă 8 cifre = 10 total)
        return cleanPhone.matches("^07[0-9]{8}$");
    }

    public static String generateTempPassword() {
        StringBuilder sb = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            sb.append(TEMP_CHARS.charAt(RANDOM.nextInt(TEMP_CHARS.length())));
        }
        return sb.toString();
    }
}