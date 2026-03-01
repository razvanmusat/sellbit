package com.sellbit.domain.uploads;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class UploadServiceTest {

    @TempDir
    Path tempDir;

    private UploadService uploadService;

    @BeforeEach
    void setUp() {
        uploadService = new UploadService(tempDir.toString());
    }

    @Test
    @DisplayName("upload - Succes: salveaza fisierul si normalizeaza originalName")
    void upload_Success() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "my image.png",
                "image/png",
                "abc".getBytes(StandardCharsets.UTF_8));

        UploadDTOs.FileItem result = uploadService.upload(file);

        assertEquals("my_image.png", result.originalName());
        assertTrue(result.fileName().contains("__my_image.png"));
        assertEquals(3, result.size());
    }

    @Test
    @DisplayName("upload - Eroare: extensie interzisa")
    void upload_Fail_ForbiddenExtension() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "virus.exe",
                "application/octet-stream",
                "danger".getBytes(StandardCharsets.UTF_8));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> uploadService.upload(file));
        assertEquals("ERROR.UPLOAD.FORBIDDEN_TYPE", ex.getMessage());
    }

    @Test
    @DisplayName("upload(folder) - Eroare: folder invalid")
    void uploadWithFolder_Fail_InvalidFolder() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "image.png",
                "image/png",
                "abc".getBytes(StandardCharsets.UTF_8));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> uploadService.upload(file, "bad folder"));
        assertEquals("ERROR.UPLOAD.INVALID_FOLDER", ex.getMessage());
    }

    @Test
    @DisplayName("upload(folder)+listFilesInFolder - Succes: listeaza fisierele din folder")
    void uploadWithFolder_AndListInFolder_Success() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "menu.jpg",
                "image/jpeg",
                "abc".getBytes(StandardCharsets.UTF_8));

        UploadDTOs.FileItem uploaded = uploadService.upload(file, "catalog");
        List<UploadDTOs.FileItem> files = uploadService.listFilesInFolder("catalog");

        assertFalse(files.isEmpty());
        assertEquals(1, files.size());
        assertEquals(uploaded.fileName(), files.get(0).fileName());
        assertTrue(files.get(0).image());
    }

    @Test
    @DisplayName("listFilesInFolder - Eroare: folder inexistent")
    void listFilesInFolder_Fail_InvalidFolder() {
        RuntimeException ex = assertThrows(RuntimeException.class, () -> uploadService.listFilesInFolder("missing"));
        assertEquals("ERROR.UPLOAD.INVALID_FOLDER", ex.getMessage());
    }

    @Test
    @DisplayName("delete(folder) - Succes: sterge fisierul")
    void deleteWithFolder_Success() throws IOException {
        Path folder = tempDir.resolve("catalog");
        Files.createDirectories(folder);
        Path file = folder.resolve("123__photo.png");
        Files.writeString(file, "x", StandardCharsets.UTF_8);

        uploadService.delete("123__photo.png", "catalog");

        assertFalse(Files.exists(file));
    }

    @Test
    @DisplayName("delete(folder) - Eroare: fisier inexistent")
    void deleteWithFolder_Fail_NotFound() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> uploadService.delete("missing.png", "catalog"));
        assertEquals("ERROR.UPLOAD.NOT_FOUND", ex.getMessage());
    }

    @Test
    @DisplayName("resolveDownloadName - Succes: extrage numele original")
    void resolveDownloadName_Success() {
        String downloadName = uploadService.resolveDownloadName("550e8400-e29b-41d4-a716-446655440000__logo.png");
        assertEquals("logo.png", downloadName);
    }
}
