package com.sellbit.domain.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class UtilsTest {

    @Test
    @DisplayName("formatUsername - Elimină diacritice, spații și forțează lowercase")
    void formatUsername_Sanitization() {
        assertEquals("stefan.popescu", Utils.formatUsername(" Ștefan.POPESCU "));
        assertEquals("scoala.auto", Utils.formatUsername("Școala.Auto"));
        assertEquals("", Utils.formatUsername(null));
        assertEquals("", Utils.formatUsername("   "));
    }

    @ParameterizedTest
    @CsvSource({
        "prenume.nume, true",
        "p.n, true",
        "username, false",   // Nu are punct
        ".username, false",  // Începe cu punct
        "username., false",  // Se termină cu punct
        "null, false"        // Cazul null (transmis ca string aici pentru test)
    })
    @DisplayName("isValidUsernameFormat - Verificare structură punct")
    void isValidUsernameFormat_Validation(String input, boolean expected) {
        String actualInput = input.equals("null") ? null : input;
        assertEquals(expected, Utils.isValidUsernameFormat(actualInput));
    }

    @Test
    @DisplayName("formatFullName - Prima literă mare, restul mici, păstrează diacriticele")
    void formatFullName_Formatting() {
        // Corecție: Ș rămâne Ș în Full Name conform codului tău
        assertEquals("Popescu Ion Ștefan", Utils.formatFullName("  POPESCU ion șTEFAN  "));
        assertEquals("Popescu", Utils.formatFullName("popescu"));
        assertEquals("Ăîâșț", Utils.formatFullName("ăîâșț"));
        assertEquals("", Utils.formatFullName(null));
        assertEquals("", Utils.formatFullName("   "));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Pass123!", "Strong#1", "Admin.2026"})
    @DisplayName("isValidPassword - Parole valide")
    void isValidPassword_Valid(String password) {
        assertTrue(Utils.isValidPassword(password));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "12345",         // Prea scurtă (< 6)
        "parolafara",    // Nu are cifră, mare, simbol
        "PAROLA123",     // Nu are literă mică sau simbol
        "Parola123",     // Nu are simbol
        "   "            // Gol
    })
    @DisplayName("isValidPassword - Parole invalide")
    void isValidPassword_Invalid(String password) {
        assertFalse(Utils.isValidPassword(password));
    }

    @Test
    @DisplayName("isValidPhoneNumber - Verificare RO și Internațional")
    void isValidPhoneNumber_Validation() {
        // Valide România
        assertTrue(Utils.isValidPhoneNumber("0712345678"));
        assertTrue(Utils.isValidPhoneNumber(" 0712345678 ")); // trim()

        // Valide Internațional
        assertTrue(Utils.isValidPhoneNumber("+40712345678"));
        assertTrue(Utils.isValidPhoneNumber("+12345"));

        // Invalide România
        assertFalse(Utils.isValidPhoneNumber("071234567"));  // Prea scurt
        assertFalse(Utils.isValidPhoneNumber("0211234567")); // Nu începe cu 07
        assertFalse(Utils.isValidPhoneNumber("07123456789"));// Prea lung

        // Invalide general
        assertFalse(Utils.isValidPhoneNumber(null));
        assertFalse(Utils.isValidPhoneNumber("abc"));
        assertFalse(Utils.isValidPhoneNumber("+123"));      // Internațional sub 5 caractere
    }
}