package com.sellbit.domain.player;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/player")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/program")
    public ResponseEntity<PlayerDTOs.Program> getProgram() {
        return ResponseEntity.ok(playerService.getProgram());
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PutMapping("/program")
    public ResponseEntity<PlayerDTOs.SaveResult> saveProgram(@RequestBody PlayerDTOs.Program program) {
        return ResponseEntity.ok(playerService.saveProgram(program));
    }

    @PreAuthorize("hasAuthority('100')")
    @PutMapping("/files/rename")
    public ResponseEntity<PlayerDTOs.RenameResult> renameFile(@RequestBody PlayerDTOs.RenameRequest request) {
        return ResponseEntity.ok(playerService.renameFile(request));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/folders")
    public ResponseEntity<PlayerDTOs.FolderState> getFolders() {
        return ResponseEntity.ok(playerService.getFolders());
    }

    @PreAuthorize("hasAuthority('100')")
    @PostMapping("/folders")
    public ResponseEntity<PlayerDTOs.FolderState> createFolder(@RequestBody PlayerDTOs.FolderRequest request) {
        return ResponseEntity.ok(playerService.createFolder(request));
    }

    @PreAuthorize("hasAuthority('100')")
    @PutMapping("/folders")
    public ResponseEntity<PlayerDTOs.FolderState> renameFolder(@RequestBody PlayerDTOs.FolderRequest request) {
        return ResponseEntity.ok(playerService.renameFolder(request));
    }

    @PreAuthorize("hasAuthority('100')")
    @DeleteMapping("/folders")
    public ResponseEntity<PlayerDTOs.FolderState> deleteFolder(@RequestParam("name") String name) {
        return ResponseEntity.ok(playerService.deleteFolder(name));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PutMapping("/files/folder")
    public ResponseEntity<PlayerDTOs.FolderState> assignFile(@RequestBody PlayerDTOs.FileFolderRequest request) {
        return ResponseEntity.ok(playerService.assignFile(request));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/command")
    public ResponseEntity<Void> command(@RequestBody PlayerDTOs.CommandRequest request) {
        playerService.command(request);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/sync")
    public ResponseEntity<Void> sync() {
        playerService.sync();
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping(value = "/status", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> status() {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(playerService.status());
    }
}
