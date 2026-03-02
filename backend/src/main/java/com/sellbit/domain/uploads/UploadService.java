package com.sellbit.domain.uploads;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
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
import java.nio.file.StandardOpenOption;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class UploadService {
    private static final int MAX_CHUNKS = 20000;
    private static final long ABANDONED_UPLOAD_TTL_MILLIS = Duration.ofHours(24).toMillis();

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
    private final Path uploadChunksRoot;

    public UploadService(@Value("${sellbit.uploads.path:/opt/sellbit/uploads}") String uploadPath) {
        this.uploadRoot = Path.of(uploadPath).toAbsolutePath().normalize();
        this.uploadChunksRoot = this.uploadRoot.resolve(".chunks").normalize();
        createUploadDirectoryIfNeeded();
    }

    @PostConstruct
    public void runCleanupAtStartup() {
        cleanupAbandonedChunkUploads();
    }

    public UploadDTOs.ChunkUploadResponse uploadChunk(MultipartFile chunk,
                                                      String uploadId,
                                                      int chunkIndex,
                                                      int totalChunks,
                                                      String fileName,
                                                      String folder) {
        cleanupAbandonedChunkUploads();

        if (chunk == null || chunk.isEmpty()) {
            throw new RuntimeException("ERROR.UPLOAD.EMPTY_FILE");
        }

        validateChunkRequest(uploadId, chunkIndex, totalChunks, fileName);

        String safeUploadId = sanitizeUploadId(uploadId);
        String safeOriginalName = sanitizeOriginalName(fileName);
        validateExtension(safeOriginalName);
        String safeFolder = normalizeOptionalFolder(folder);

        Path uploadSessionDir = resolveChunkUploadDir(safeUploadId);
        Path chunkFile = uploadSessionDir.resolve(chunkIndex + ".part");

        try {
            Files.createDirectories(uploadSessionDir);
            Files.writeString(uploadSessionDir.resolve("meta.name"), safeOriginalName, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            Files.writeString(uploadSessionDir.resolve("meta.total"), Integer.toString(totalChunks), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            Files.writeString(uploadSessionDir.resolve("meta.folder"), safeFolder == null ? "" : safeFolder, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            try (InputStream inputStream = chunk.getInputStream()) {
                Files.copy(inputStream, chunkFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.SAVE_FAILED");
        }

        long uploadedChunks = countUploadedChunks(uploadSessionDir);
        return new UploadDTOs.ChunkUploadResponse(safeUploadId, chunkIndex, totalChunks, uploadedChunks, uploadedChunks == totalChunks);
    }

    public UploadDTOs.FileItem completeChunkUpload(String uploadId,
                                                   int totalChunks,
                                                   String fileName,
                                                   String folder) {
        cleanupAbandonedChunkUploads();

        validateChunkRequest(uploadId, 0, totalChunks, fileName);

        String safeUploadId = sanitizeUploadId(uploadId);
        String safeOriginalName = sanitizeOriginalName(fileName);
        validateExtension(safeOriginalName);

        String safeFolder = normalizeOptionalFolder(folder);
        Path sessionDir = resolveChunkUploadDir(safeUploadId);

        if (!Files.isDirectory(sessionDir)) {
            throw new RuntimeException("ERROR.UPLOAD.NOT_FOUND");
        }

        ensureAllChunksExist(sessionDir, totalChunks);

        String storedName = UUID.randomUUID() + SEPARATOR + safeOriginalName;
        Path target = safeFolder == null
                ? resolveSafePath(storedName)
                : uploadRoot.resolve(safeFolder).resolve(storedName).normalize();

        if (!target.startsWith(uploadRoot)) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        try {
            Files.createDirectories(target.getParent());
            mergeChunksToTarget(sessionDir, target, totalChunks);
            deleteDirectoryRecursively(sessionDir);
            return toFileItem(target);
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.SAVE_FAILED");
        }
    }

    @Scheduled(fixedDelay = 3_600_000L)
    public void cleanupAbandonedChunkUploads() {
        createUploadDirectoryIfNeeded();

        if (!Files.exists(uploadChunksRoot) || !Files.isDirectory(uploadChunksRoot)) {
            return;
        }

        long now = System.currentTimeMillis();
        try (Stream<Path> sessions = Files.list(uploadChunksRoot)) {
            sessions
                    .filter(Files::isDirectory)
                    .forEach(path -> {
                        try {
                            long lastModified = Files.getLastModifiedTime(path).toMillis();
                            if ((now - lastModified) > ABANDONED_UPLOAD_TTL_MILLIS) {
                                deleteDirectoryRecursively(path);
                            }
                        } catch (Exception ignored) {
                        }
                    });
        } catch (IOException ignored) {
        }
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
            Files.createDirectories(uploadChunksRoot);
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.DIR_NOT_AVAILABLE");
        }
    }

    private void validateChunkRequest(String uploadId, int chunkIndex, int totalChunks, String fileName) {
        if (uploadId == null || uploadId.isBlank()) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        if (totalChunks <= 0 || totalChunks > MAX_CHUNKS) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        if (chunkIndex < 0 || chunkIndex >= totalChunks) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        if (fileName == null || fileName.isBlank()) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }
    }

    private Path resolveChunkUploadDir(String uploadId) {
        Path dir = uploadChunksRoot.resolve(uploadId).normalize();
        if (!dir.startsWith(uploadChunksRoot)) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }
        return dir;
    }

    private String sanitizeUploadId(String uploadId) {
        String clean = StringUtils.cleanPath(Objects.toString(uploadId, "")).trim();
        if (clean.isBlank() || clean.contains("..") || clean.contains("/") || clean.contains("\\") || !clean.matches("[a-zA-Z0-9_-]{8,128}")) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }
        return clean;
    }

    private String normalizeOptionalFolder(String folder) {
        if (folder == null || folder.isBlank()) {
            return null;
        }
        return sanitizeFolderName(folder);
    }

    private long countUploadedChunks(Path sessionDir) {
        try (Stream<Path> files = Files.list(sessionDir)) {
            return files
                    .filter(Files::isRegularFile)
                    .map(path -> path.getFileName().toString())
                    .filter(name -> name.endsWith(".part"))
                    .count();
        } catch (IOException ex) {
            return 0;
        }
    }

    private void ensureAllChunksExist(Path sessionDir, int totalChunks) {
        for (int index = 0; index < totalChunks; index++) {
            Path partFile = sessionDir.resolve(index + ".part");
            if (!Files.exists(partFile) || !Files.isRegularFile(partFile)) {
                throw new RuntimeException("ERROR.UPLOAD.NOT_FOUND");
            }
        }
    }

    private void mergeChunksToTarget(Path sessionDir, Path target, int totalChunks) throws IOException {
        try (var output = Files.newOutputStream(target, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE)) {
            for (int index = 0; index < totalChunks; index++) {
                Path partFile = sessionDir.resolve(index + ".part");
                try (InputStream input = Files.newInputStream(partFile, StandardOpenOption.READ)) {
                    input.transferTo(output);
                }
            }
        }
    }

    private void deleteDirectoryRecursively(Path directory) throws IOException {
        if (!Files.exists(directory)) {
            return;
        }

        try (Stream<Path> walk = Files.walk(directory)) {
            walk.sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ignored) {
                        }
                    });
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
