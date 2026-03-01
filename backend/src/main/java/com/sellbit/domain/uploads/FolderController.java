package com.sellbit.domain.uploads;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.file.DirectoryNotEmptyException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/uploads/folders")
public class FolderController {
    private final Path uploadRoot = Paths.get("/opt/sellbit/uploads").toAbsolutePath().normalize();

    @PreAuthorize("hasAuthority('100')")
    @PostMapping("/create")
    public ResponseEntity<String> createFolder(@RequestParam String name, @RequestParam(required = false) String parent) {
        try {
            Path folder = parent == null ? uploadRoot.resolve(name) : uploadRoot.resolve(parent).resolve(name);
            Files.createDirectories(folder);
            return ResponseEntity.ok("Folder creat cu succes");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Eroare la creare folder: " + e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('100')")
    @DeleteMapping("/delete")
    public ResponseEntity<String> deleteFolder(@RequestParam String path) {
        try {
            Path folder = uploadRoot.resolve(path).normalize();
            if (!folder.startsWith(uploadRoot)) {
                throw new RuntimeException("ERROR.UPLOAD.INVALID_FOLDER");
            }
            if (!Files.exists(folder) || !Files.isDirectory(folder)) {
                throw new RuntimeException("ERROR.UPLOAD.FOLDER_NOT_FOUND");
            }
            Files.delete(folder);
            return ResponseEntity.ok("Folder șters cu succes");
        } catch (DirectoryNotEmptyException e) {
            return ResponseEntity.badRequest().body("ERROR.UPLOAD.FOLDER_NOT_EMPTY");
        } catch (NoSuchFileException e) {
            return ResponseEntity.badRequest().body("ERROR.UPLOAD.FOLDER_NOT_FOUND");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("ERROR.UPLOAD.FOLDER_DELETE_FAILED");
        }
    }

    @PreAuthorize("hasAuthority('100')")
    @PostMapping("/rename")
    public ResponseEntity<String> renameFolder(@RequestParam String oldPath, @RequestParam String newName) {
        try {
            Path oldFolder = uploadRoot.resolve(oldPath).normalize();
            Path newFolder = oldFolder.getParent().resolve(newName);
            Files.move(oldFolder, newFolder);
            return ResponseEntity.ok("Folder redenumit cu succes");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Eroare la redenumire folder: " + e.getMessage());
        }
    }

    @GetMapping("/list")
    public ResponseEntity<List<String>> listFolders(@RequestParam(required = false) String parent) {
        try {
            Path folder = parent == null ? uploadRoot : uploadRoot.resolve(parent);
            List<String> folders = Files.list(folder)
                    .filter(Files::isDirectory)
                    .map(p -> p.getFileName().toString())
                    .collect(Collectors.toList());
            return ResponseEntity.ok(folders);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(List.of("Eroare la listare: " + e.getMessage()));
        }
    }
}
