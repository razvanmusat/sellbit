// ...existing code...
package com.sellbit.domain.uploads;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping
    public ResponseEntity<List<UploadDTOs.FileItem>> listFiles(@RequestParam(value = "folder", required = false) String folder) {
        if (folder != null && !folder.isBlank()) {
            return ResponseEntity.ok(uploadService.listFilesInFolder(folder));
        } else {
            return ResponseEntity.ok(uploadService.listFiles());
        }
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadDTOs.FileItem> upload(@RequestParam("file") MultipartFile file,
                                                     @RequestParam(value = "folder", required = false) String folder) {
        return ResponseEntity.ok(uploadService.upload(file, folder));
    }

        @PreAuthorize("hasAnyAuthority('50', '100')")
        @GetMapping("/{fileName:.+}")
        public ResponseEntity<Resource> getFile(@PathVariable("fileName") String fileName,
                                               @RequestParam(value = "folder", required = false) String folder,
                                               @RequestParam(defaultValue = "false") boolean download) {
            System.out.println("[DEBUG][BACKEND] getFile called: fileName=" + fileName + ", folder=" + folder + ", download=" + download);
            try {
                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                System.out.println("[DEBUG][BACKEND] Authenticated user: " + (auth != null ? auth.getName() : "null") + ", authorities: " + (auth != null ? auth.getAuthorities() : "null"));
            } catch (Exception e) {
                System.out.println("[DEBUG][BACKEND] Could not get authentication: " + e);
            }
            Resource resource = uploadService.getResource(fileName, folder);
            String contentType = uploadService.resolveContentType(fileName, folder);
            String downloadName = uploadService.resolveDownloadName(fileName);

            ContentDisposition disposition = ContentDisposition
                    .builder(download ? "attachment" : "inline")
                    .filename(downloadName, StandardCharsets.UTF_8)
                    .build();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                    .body(resource);
        }

    @PreAuthorize("hasAuthority('100')")
    @DeleteMapping("/{fileName:.+}")
    public ResponseEntity<Void> delete(@PathVariable String fileName,
                                       @RequestParam(value = "folder", required = false) String folder) {
        uploadService.delete(fileName, folder);
        return ResponseEntity.noContent().build();
    }
}
