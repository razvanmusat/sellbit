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

        // Mock universal pentru save - returneaza mereu obiectul primit ca sa evitam NullPointerException
        lenient().when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
    }

    // --- TESTE CREATE ---

    @Test
    @DisplayName("Create: Succes cu formatare username si nume")
    void create_Success() {
        CreateUserDTO dto = new CreateUserDTO("USER.New", "Password123!", "nume TEST", 1, "ro");
        
        when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));
        when(userRepository.existsByUsername("user.new")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");

        UserResponseDTO result = userService.create(dto);

        assertEquals("user.new", result.username());
        assertEquals("Nume Test", result.fullName());
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Create: Fail daca username-ul exista deja")
    void create_Fail_Duplicate() {
        CreateUserDTO dto = new CreateUserDTO("admin.test", "Password123!", "Nume", 1, "ro");
        when(userRepository.existsByUsername("admin.test")).thenReturn(true);

        assertThrows(RuntimeException.class, () -> userService.create(dto));
    }

    // --- TESTE UPDATE ---

    @Test
    @DisplayName("Update: Succes cu schimbare date si formatare")
    void update_Success() {
        UpdateUserDTO dto = new UpdateUserDTO("ADMIN.mod", "nume MODIFICAT", 1, "en");
        
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        when(roleRepository.findById(1)).thenReturn(Optional.of(adminRole));
        when(userRepository.existsByUsername("admin.mod")).thenReturn(false);

        UserResponseDTO result = userService.update(1, dto);

        assertEquals("admin.mod", result.username());
        assertEquals("Nume Modificat", result.fullName());
    }

    // --- TESTE TOGGLE STATUS ---

    @Test
    @DisplayName("ToggleStatus: Succes dezactivare (cand mai exista admini)")
    void toggleStatus_Deactivate_Success() {
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        when(userRepository.countByRole_AuthorityLevelAndIsActiveTrue(100)).thenReturn(2L);

        UserResponseDTO result = userService.toggleStatus(1);

        assertFalse(result.isActive());
        assertFalse(adminUser.isActive());
    }

    @Test
    @DisplayName("ToggleStatus: Succes reactivare")
    void toggleStatus_Activate_Success() {
        adminUser.setActive(false);
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));

        UserResponseDTO result = userService.toggleStatus(1);

        assertTrue(result.isActive());
        assertTrue(adminUser.isActive());
    }

    @Test
    @DisplayName("ToggleStatus: Fail la ultimul admin")
    void toggleStatus_Fail_LastAdmin() {
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        when(userRepository.countByRole_AuthorityLevelAndIsActiveTrue(100)).thenReturn(1L);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> userService.toggleStatus(1));
        assertEquals("ERROR.USER.CANNOT_DEACTIVATE_LAST_ADMIN", ex.getMessage());
    }

    // --- TESTE CHANGE PASSWORD ---

    @Test
    @DisplayName("ChangePassword: Fail la parola slaba")
    void changePassword_Fail_Weak() {
        ChangePasswordDTO dto = new ChangePasswordDTO("123");
        // Nu are nevoie de mock-uri pentru ca validarea din Utils e prima care pica
        assertThrows(RuntimeException.class, () -> userService.changePassword(1, dto));
    }

    @Test
    @DisplayName("ChangePassword: Succes")
    void changePassword_Success() {
        ChangePasswordDTO dto = new ChangePasswordDTO("ValidPassword123!");
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.encode(anyString())).thenReturn("new_hash");

        userService.changePassword(1, dto);

        assertEquals("new_hash", adminUser.getPasswordHash());
        verify(userRepository).save(adminUser);
    }

    // --- TESTE LISTARE ---

    @Test
    @DisplayName("Listare: Useri Activi")
    void getAllActive_Success() {
        when(userRepository.findAllByIsActiveTrue()).thenReturn(List.of(adminUser));
        List<UserResponseDTO> result = userService.getAllActive();
        assertFalse(result.isEmpty());
    }

    @Test
    @DisplayName("Listare: Useri Inactivi")
    void getAllInactive_Success() {
        when(userRepository.findAllByIsActiveFalse()).thenReturn(List.of());
        List<UserResponseDTO> result = userService.getAllInactive();
        assertTrue(result.isEmpty());
    }
    
    @Test
    @DisplayName("Update: Fail când încercăm să schimbăm rolul singurului Admin activ")
    void update_Fail_ChangeRoleOfLastAdmin() {
        // GIVEN: Avem un user care e Admin
        when(userRepository.findById(1)).thenReturn(Optional.of(adminUser));
        
        // Rolul nou (Casier) are authority level mic (ex: 10)
        UserRole cashierRole = UserRole.builder().id(2).authorityLevel(10).code("CASHIER").build();
        when(roleRepository.findById(2)).thenReturn(Optional.of(cashierRole));
        
        // Simulăm că în bază este doar 1 admin activ
        when(userRepository.countByRole_AuthorityLevelAndIsActiveTrue(100)).thenReturn(1L);

        // DTO pentru update care vrea să schimbe rolul în ID 2 (Casier)
        UpdateUserDTO dto = new UpdateUserDTO("admin.master", "Administrator Principal", 2, "ro");

        // WHEN & THEN
        RuntimeException ex = assertThrows(RuntimeException.class, () -> userService.update(1, dto));
        assertEquals("ERROR.USER.CANNOT_DEACTIVATE_LAST_ADMIN", ex.getMessage());
        
        // Verificăm că NU s-a apelat save, deci nu am stricat nimic
        verify(userRepository, never()).save(any());
    }
}