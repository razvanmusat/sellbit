package com.sellbit.domain.uploads;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;

import com.sellbit.domain.security.auth.JwtUtils;

@WebMvcTest(
        controllers = UploadController.class,
        excludeAutoConfiguration = SecurityAutoConfiguration.class
)
class UploadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UploadService uploadService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("GET /api/uploads - Succes: lista fisiere root")
    void listFiles_Success() throws Exception {
        UploadDTOs.FileItem item = new UploadDTOs.FileItem(
                "uuid__a.png",
                "a.png",
                10L,
                Instant.now(),
                true);

        when(uploadService.listFiles()).thenReturn(List.of(item));

        mockMvc.perform(get("/api/uploads"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fileName").value("uuid__a.png"))
                .andExpect(jsonPath("$[0].originalName").value("a.png"));

        verify(uploadService).listFiles();
    }

    @Test
    @DisplayName("GET /api/uploads?folder=... - Succes: lista fisiere pe folder")
    void listFilesInFolder_Success() throws Exception {
        UploadDTOs.FileItem item = new UploadDTOs.FileItem(
                "uuid__menu.jpg",
                "menu.jpg",
                20L,
                Instant.now(),
                true);

        when(uploadService.listFilesInFolder("catalog")).thenReturn(List.of(item));

        mockMvc.perform(get("/api/uploads").param("folder", "catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fileName").value("uuid__menu.jpg"));

        verify(uploadService).listFilesInFolder("catalog");
    }

    @Test
    @DisplayName("POST /api/uploads - Succes: upload fisier cu folder")
    void upload_Success() throws Exception {
        UploadDTOs.FileItem response = new UploadDTOs.FileItem(
                "uuid__logo.png",
                "logo.png",
                3L,
                Instant.now(),
                true);

        when(uploadService.upload(any(MultipartFile.class), eq("catalog"))).thenReturn(response);

        mockMvc.perform(multipart("/api/uploads")
                        .file("file", "abc".getBytes(StandardCharsets.UTF_8))
                        .param("folder", "catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("uuid__logo.png"))
                .andExpect(jsonPath("$.originalName").value("logo.png"));
    }

    @Test
    @DisplayName("GET /api/uploads/{fileName} - Succes: returneaza resource inline")
    void getFile_Success_Inline() throws Exception {
        ByteArrayResource resource = new ByteArrayResource("abc".getBytes(StandardCharsets.UTF_8));

        when(uploadService.getResource("uuid__logo.png", "catalog")).thenReturn(resource);
        when(uploadService.resolveContentType("uuid__logo.png", "catalog")).thenReturn(MediaType.IMAGE_PNG_VALUE);
        when(uploadService.resolveDownloadName("uuid__logo.png")).thenReturn("logo.png");

        mockMvc.perform(get("/api/uploads/uuid__logo.png").param("folder", "catalog"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("inline")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("logo.png")))
                .andExpect(content().contentType(MediaType.IMAGE_PNG_VALUE));
    }

    @Test
    @DisplayName("GET /api/uploads/{fileName}?download=true - Succes: header attachment")
    void getFile_Success_Attachment() throws Exception {
        ByteArrayResource resource = new ByteArrayResource("abc".getBytes(StandardCharsets.UTF_8));

        when(uploadService.getResource("uuid__doc.pdf", null)).thenReturn(resource);
        when(uploadService.resolveContentType("uuid__doc.pdf", null)).thenReturn(MediaType.APPLICATION_PDF_VALUE);
        when(uploadService.resolveDownloadName("uuid__doc.pdf")).thenReturn("doc.pdf");

        mockMvc.perform(get("/api/uploads/uuid__doc.pdf").param("download", "true"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(content().contentType(MediaType.APPLICATION_PDF_VALUE));
    }

    @Test
    @DisplayName("DELETE /api/uploads/{fileName} - Succes")
    void delete_Success() throws Exception {
        doNothing().when(uploadService).delete("uuid__logo.png", "catalog");

        mockMvc.perform(delete("/api/uploads/uuid__logo.png").param("folder", "catalog"))
                .andExpect(status().isNoContent());

        verify(uploadService).delete("uuid__logo.png", "catalog");
    }
}
