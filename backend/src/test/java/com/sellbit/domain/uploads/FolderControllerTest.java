package com.sellbit.domain.uploads;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.sellbit.domain.security.auth.JwtUtils;

@WebMvcTest(
        controllers = FolderController.class,
        excludeAutoConfiguration = SecurityAutoConfiguration.class
)
class FolderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("DELETE /api/uploads/folders/delete - Eroare: path traversal")
    void deleteFolder_Fail_PathTraversal() throws Exception {
        mockMvc.perform(delete("/api/uploads/folders/delete").param("path", ".."))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("ERROR.UPLOAD.INVALID_FOLDER"));
    }

    @Test
    @DisplayName("DELETE /api/uploads/folders/delete - Eroare: folder inexistent")
    void deleteFolder_Fail_NotFound() throws Exception {
        mockMvc.perform(delete("/api/uploads/folders/delete").param("path", "missing-folder-for-test"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("ERROR.UPLOAD.FOLDER_NOT_FOUND"));
    }

    @Test
    @DisplayName("POST /api/uploads/folders/rename - Eroare: folder sursa lipsa")
    void renameFolder_Fail_SourceMissing() throws Exception {
        mockMvc.perform(post("/api/uploads/folders/rename")
                        .param("oldPath", "missing-folder-for-test")
                        .param("newName", "renamed"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(Matchers.containsString("Eroare la redenumire folder")));
    }

    @Test
    @DisplayName("GET /api/uploads/folders/list - Eroare: parent inexistent")
    void listFolders_Fail_InvalidParent() throws Exception {
        mockMvc.perform(get("/api/uploads/folders/list").param("parent", "missing-folder-for-test"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(Matchers.containsString("Eroare la listare")));
    }
}
