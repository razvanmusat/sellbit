package com.sellbit.domain.uploads;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class UploadService {
    public List<UploadDTOs.FileItem> listFilesInFolder(String folder) {
        createUploadDirectoryIfNeeded();
        if (folder == null || folder.isBlank()) {
            return List.of();
        }
        String safeFolder = folder.trim().replaceAll("[^a-zA-Z0-9._-]", "_");
        Path folderPath = uploadRoot.resolve(safeFolder).normalize();
        if (!folderPath.startsWith(uploadRoot) || !Files.isDirectory(folderPath)) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_FOLDER");
        }
        try (Stream<Path> stream = Files.list(folderPath)) {
            return stream
                    .filter(Files::isRegularFile)
                    .map(this::toFileItem)
                    .sorted(Comparator.comparing(UploadDTOs.FileItem::lastModified).reversed())
                    .toList();
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.LIST_FAILED");
        }
    }

    private static final String SEPARATOR = "__";

        private static final Set<String> FORBIDDEN_EXTENSIONS = Set.of("exe");

    private final Path uploadRoot;

    public UploadService(@Value("${sellbit.uploads.path:/opt/sellbit/uploads}") String uploadPath) {
        this.uploadRoot = Path.of(uploadPath).toAbsolutePath().normalize();
        createUploadDirectoryIfNeeded();
    }

    public List<UploadDTOs.FileItem> listFiles() {
        createUploadDirectoryIfNeeded();

        try (Stream<Path> stream = Files.list(uploadRoot)) {
            return stream
                    .filter(Files::isRegularFile)
                    .map(this::toFileItem)
                    .sorted(Comparator.comparing(UploadDTOs.FileItem::lastModified).reversed())
                    .toList();
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.LIST_FAILED");
        }
    }

    public UploadDTOs.FileItem upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("ERROR.UPLOAD.EMPTY_FILE");
        }

        String originalName = sanitizeOriginalName(file.getOriginalFilename());
        validateExtension(originalName);

        String storedName = UUID.randomUUID() + SEPARATOR + originalName;
        Path target = resolveSafePath(storedName);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            return toFileItem(target);
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.SAVE_FAILED");
        }
    }

    public UploadDTOs.FileItem upload(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("ERROR.UPLOAD.EMPTY_FILE");
        }

        String originalName = sanitizeOriginalName(file.getOriginalFilename());
        validateExtension(originalName);

        // VALIDARE folder
        String safeFolder = null;
        if (folder != null && !folder.isBlank()) {
            String value = folder.trim();
            if (value.contains("..") || value.contains("/") || value.contains(",") || value.contains("\\") || value.contains(" ")) {
                throw new RuntimeException("ERROR.UPLOAD.INVALID_FOLDER");
            }
            safeFolder = value.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (safeFolder.isBlank()) {
                throw new RuntimeException("ERROR.UPLOAD.INVALID_FOLDER");
            }
        }

        String storedName = UUID.randomUUID() + SEPARATOR + originalName;
        Path target = safeFolder == null
            ? resolveSafePath(storedName)
            : uploadRoot.resolve(safeFolder).resolve(storedName);

        try (InputStream inputStream = file.getInputStream()) {
            Files.createDirectories(target.getParent());
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            return toFileItem(target);
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.SAVE_FAILED");
        }
    }

    public void delete(String fileName) {
        Path file = resolveSafePath(fileName);

        try {
            if (!Files.exists(file) || !Files.isRegularFile(file)) {
                throw new RuntimeException("ERROR.UPLOAD.NOT_FOUND");
            }
            Files.delete(file);
        } catch (RuntimeException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.DELETE_FAILED");
        }
    }

    public void delete(String fileName, String folder) {
        Path file = resolveSafePath(fileName, folder);

        try {
            if (!Files.exists(file) || !Files.isRegularFile(file)) {
                throw new RuntimeException("ERROR.UPLOAD.NOT_FOUND");
            }
            Files.delete(file);
        } catch (RuntimeException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.DELETE_FAILED");
        }
    }

    public Resource getResource(String fileName) {
        Path file = resolveSafePath(fileName);

        try {
            if (!Files.exists(file) || !Files.isRegularFile(file)) {
                throw new RuntimeException("ERROR.UPLOAD.NOT_FOUND");
            }
            return new UrlResource(file.toUri());
        } catch (MalformedURLException ex) {
            throw new RuntimeException("ERROR.UPLOAD.READ_FAILED");
        }
    }

    public Resource getResource(String fileName, String folder) {
        Path file = resolveSafePath(fileName, folder);

        try {
            if (!Files.exists(file) || !Files.isRegularFile(file)) {
                throw new RuntimeException("ERROR.UPLOAD.NOT_FOUND");
            }
            return new UrlResource(file.toUri());
        } catch (MalformedURLException ex) {
            throw new RuntimeException("ERROR.UPLOAD.READ_FAILED");
        }
    }

    public String resolveContentType(String fileName) {
        Path file = resolveSafePath(fileName);

        try {
            String detected = Files.probeContentType(file);
            return detected != null ? detected : "application/octet-stream";
        } catch (IOException ex) {
            return "application/octet-stream";
        }
    }

    public String resolveContentType(String fileName, String folder) {
        Path file = resolveSafePath(fileName, folder);

        try {
            String detected = Files.probeContentType(file);
            return detected != null ? detected : "application/octet-stream";
        } catch (IOException ex) {
            return "application/octet-stream";
        }
    }

    public String resolveDownloadName(String fileName) {
        String clean = cleanSimpleFileName(fileName);
        return extractOriginalName(clean);
    }

    private UploadDTOs.FileItem toFileItem(Path file) {
        String stored = file.getFileName().toString();

        try {
            long size = Files.size(file);
            Instant lastModified = Files.getLastModifiedTime(file).toInstant();
            String contentType = Files.probeContentType(file);
            boolean image = contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("image/");

            return new UploadDTOs.FileItem(
                    stored,
                    extractOriginalName(stored),
                    size,
                    lastModified,
                    image
            );
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.LIST_FAILED");
        }
    }

    private void createUploadDirectoryIfNeeded() {
        try {
            Files.createDirectories(uploadRoot);
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.DIR_NOT_AVAILABLE");
        }
    }

    private Path resolveSafePath(String fileName) {
        String clean = cleanSimpleFileName(fileName);
        Path resolved = uploadRoot.resolve(clean).normalize();

        if (!resolved.startsWith(uploadRoot)) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        return resolved;
    }

    private Path resolveSafePath(String fileName, String folder) {
        String cleanFileName = cleanSimpleFileName(fileName);

        if (folder == null || folder.isBlank()) {
            return resolveSafePath(cleanFileName);
        }

        String safeFolder = sanitizeFolderName(folder);
        Path resolved = uploadRoot.resolve(safeFolder).resolve(cleanFileName).normalize();

        if (!resolved.startsWith(uploadRoot)) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        return resolved;
    }

    private String sanitizeFolderName(String folder) {
        String value = Objects.toString(folder, "").trim();
        if (value.isBlank() || value.contains("..") || value.contains("/") || value.contains("\\") || value.contains(",") || value.contains(" ")) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_FOLDER");
        }

        String safeFolder = value.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (safeFolder.isBlank()) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_FOLDER");
        }

        return safeFolder;
    }

    private String cleanSimpleFileName(String fileName) {
        String clean = StringUtils.cleanPath(Objects.toString(fileName, "")).trim();

        if (clean.isBlank() || clean.contains("..") || clean.contains("/") || clean.contains("\\")) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        return clean;
    }

    private String sanitizeOriginalName(String originalName) {
        String value = StringUtils.cleanPath(Objects.toString(originalName, "")).trim();

        if (value.isBlank() || value.contains("..") || value.contains("/") || value.contains("\\")) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        String sanitized = value.replaceAll("[^a-zA-Z0-9._-]", "_");

        if (sanitized.isBlank()) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        return sanitized;
    }

    private void validateExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex <= 0 || dotIndex == fileName.length() - 1) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_TYPE");
        }

        String extension = fileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        if (FORBIDDEN_EXTENSIONS.contains(extension)) {
            throw new RuntimeException("ERROR.UPLOAD.FORBIDDEN_TYPE");
        }
    }

    private String extractOriginalName(String storedName) {
        int separatorIndex = storedName.indexOf(SEPARATOR);
        if (separatorIndex < 0 || separatorIndex + SEPARATOR.length() >= storedName.length()) {
            return storedName;
        }

        return storedName.substring(separatorIndex + SEPARATOR.length());
    }
}
