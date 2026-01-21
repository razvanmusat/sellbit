package com.sellbit.domain.security.user;

import com.sellbit.domain.lookup.userrole.UserRole;
import com.sellbit.domain.lookup.userrole.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserRoleRepository roleRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private UserRole adminRole;
    private User adminUser;

    @BeforeEach
    void setUp() {
        // Setup entitati de baza pentru teste
        adminRole = UserRole.builder()
                .id(1)
                .authorityLevel(100)
                .code("ADMIN")
                .label("Administrator Sistem")
                .build();

        adminUser = User.builder()
                .id(1)
                .username("admin.test")
                .fullName("Admin Test")
                .role(adminRole)
                .isActive(true)
                .passwordHash("old_hash")
                .build();

        // Mock universal pentru save (unde e cazul)
        lenient().when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
    }

    // --- TESTE CREATE ---

    @Test
    @DisplayName("Create: Succes cu generare parolă temporară")
    void create_Success() {
        // Create DTO nu mai are parolă
        UserDTOs.Create dto = new UserDTOs.Create("USER.New", "nume TEST", 1, "ro");
        
        when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));
        when(userRepository.existsByUsername("user.new")).thenReturn(false);
        // La creare, service-ul generează parola și face encode
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_temp_pass");

        UserDTOs.Response result = userService.create(dto);

        assertEquals("user.new", result.username());
        assertEquals("Nume Test", result.fullName());
        
        // Verificăm că am primit o parolă temporară de 4 caractere
        assertNotNull(result.tempPassword());
        assertEquals(4, result.tempPassword().length());
        
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Create: Fail daca username-ul exista deja")
    void create_Fail_Duplicate() {
        UserDTOs.Create dto = new UserDTOs.Create("admin.test", "Nume", 1, "ro");
        when(userRepository.existsByUsername("admin.test")).thenReturn(true);

        assertThrows(RuntimeException.class, () -> userService.create(dto));
    }

    // --- TESTE UPDATE ---

    @Test
    @DisplayName("Update: Succes cu schimbare date si formatare")
    void update_Success() {
        UserDTOs.Update dto = new UserDTOs.Update("ADMIN.mod", "nume MODIFICAT", 1, "en");
        
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));
        when(userRepository.existsByUsername("admin.mod")).thenReturn(false);

        UserDTOs.Response result = userService.update(1, dto);

        assertEquals("admin.mod", result.username());
        assertEquals("Nume Modificat", result.fullName());
    }

    @Test
    @DisplayName("Update: Fail când încercăm să schimbăm rolul singurului Admin activ")
    void update_Fail_ChangeRoleOfLastAdmin() {
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        
        UserRole cashierRole = UserRole.builder().id(2).authorityLevel(10).code("CASHIER").build();
        when(roleRepository.findById(2)).thenReturn(Optional.of(cashierRole));
        
        when(userRepository.countByRole_AuthorityLevelAndIsActiveTrue(100)).thenReturn(1L);

        UserDTOs.Update dto = new UserDTOs.Update("admin.master", "Administrator Principal", 2, "ro");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> userService.update(1, dto));
        assertEquals("ERROR.USER.CANNOT_DEACTIVATE_LAST_ADMIN", ex.getMessage());
        
        verify(userRepository, never()).save(any());
    }

    // --- TESTE TOGGLE STATUS ---

    @Test
    @DisplayName("ToggleStatus: Succes dezactivare")
    void toggleStatus_Deactivate_Success() {
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        when(userRepository.countByRole_AuthorityLevelAndIsActiveTrue(100)).thenReturn(2L);

        UserDTOs.Response result = userService.toggleStatus(1);

        assertFalse(result.isActive());
        assertFalse(adminUser.isActive());
    }

    @Test
    @DisplayName("ToggleStatus: Fail la ultimul admin")
    void toggleStatus_Fail_LastAdmin() {
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        when(userRepository.countByRole_AuthorityLevelAndIsActiveTrue(100)).thenReturn(1L);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> userService.toggleStatus(1));
        assertEquals("ERROR.USER.CANNOT_DEACTIVATE_LAST_ADMIN", ex.getMessage());
    }

    // --- TESTE RESET PASSWORD (ADMIN) ---

    @Test
    @DisplayName("ResetPassword: Succes generare parolă nouă")
    void resetPassword_Success() {
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.encode(anyString())).thenReturn("new_random_hash");

        UserDTOs.Response result = userService.resetPassword(1);

        // Verificăm că parola hash-uită s-a schimbat în user
        assertEquals("new_random_hash", adminUser.getPasswordHash());
        
        // Verificăm că parola returnată în clar are 4 caractere
        assertNotNull(result.tempPassword());
        assertEquals(4, result.tempPassword().length());
        
        verify(userRepository).save(adminUser);
    }

    // --- TESTE CHANGE OWN PASSWORD (USER) ---

    @Test
    @DisplayName("ChangeOwnPassword: Succes")
    void changeOwnPassword_Success() {
        UserDTOs.ChangeOwnPassword dto = new UserDTOs.ChangeOwnPassword("oldPass", "StrongPass1!");
        
        when(userRepository.findByUsername("admin.test")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("oldPass", "old_hash")).thenReturn(true);
        when(passwordEncoder.encode("StrongPass1!")).thenReturn("final_hash");

        userService.changeOwnPassword("admin.test", dto);

        assertEquals("final_hash", adminUser.getPasswordHash());
        verify(userRepository).save(adminUser);
    }

    @Test
    @DisplayName("ChangeOwnPassword: Fail parolă veche greșită")
    void changeOwnPassword_Fail_WrongOld() {
        UserDTOs.ChangeOwnPassword dto = new UserDTOs.ChangeOwnPassword("wrongOld", "StrongPass1!");
        
        when(userRepository.findByUsername("admin.test")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("wrongOld", "old_hash")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> 
            userService.changeOwnPassword("admin.test", dto));
            
        assertEquals("ERROR.AUTH.WRONG_OLD_PASSWORD", ex.getMessage());
    }

    @Test
    @DisplayName("ChangeOwnPassword: Fail parolă nouă slabă")
    void changeOwnPassword_Fail_WeakNew() {
        UserDTOs.ChangeOwnPassword dto = new UserDTOs.ChangeOwnPassword("oldPass", "weak");
        
        when(userRepository.findByUsername("admin.test")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("oldPass", "old_hash")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> 
            userService.changeOwnPassword("admin.test", dto));
            
        assertEquals("ERROR.USER.INVALID_PASSWORD_STRENGTH", ex.getMessage());
    }

    // --- TESTE LISTARE ---

    @Test
    @DisplayName("Listare: Useri Activi")
    void getAllActive_Success() {
        when(userRepository.findAllByIsActiveTrue()).thenReturn(List.of(adminUser));
        List<UserDTOs.Response> result = userService.getAllActive();
        assertFalse(result.isEmpty());
    }

    @Test
    @DisplayName("Listare: Useri Inactivi")
    void getAllInactive_Success() {
        when(userRepository.findAllByIsActiveFalse()).thenReturn(List.of());
        List<UserDTOs.Response> result = userService.getAllInactive();
        assertTrue(result.isEmpty());
    }
}