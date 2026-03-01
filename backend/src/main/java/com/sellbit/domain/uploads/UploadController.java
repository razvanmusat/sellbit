// ...existing code...
package com.sellbit.domain.uploads;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
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
        public ResponseEntity<?> getFile(@PathVariable("fileName") String fileName,
                                               @RequestParam(value = "folder", required = false) String folder,
                                               @RequestParam(defaultValue = "false") boolean download,
                                               @RequestHeader HttpHeaders requestHeaders) {
            boolean hasRangeHeader = requestHeaders.getFirst(HttpHeaders.RANGE) != null;
            if (!hasRangeHeader) {
                System.out.println("[DEBUG][BACKEND] getFile called: fileName=" + fileName + ", folder=" + folder + ", download=" + download);
                try {
                    org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                    System.out.println("[DEBUG][BACKEND] Authenticated user: " + (auth != null ? auth.getName() : "null") + ", authorities: " + (auth != null ? auth.getAuthorities() : "null"));
                } catch (Exception e) {
                    System.out.println("[DEBUG][BACKEND] Could not get authentication: " + e);
                }
            }
            Resource resource = uploadService.getResource(fileName, folder);
            String contentType = uploadService.resolveContentType(fileName, folder);
            String downloadName = uploadService.resolveDownloadName(fileName);
            MediaType mediaType;
            try {
                mediaType = MediaType.parseMediaType(contentType);
            } catch (Exception ex) {
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }

            ContentDisposition disposition = ContentDisposition
                    .builder(download ? "attachment" : "inline")
                    .filename(downloadName, StandardCharsets.UTF_8)
                    .build();

            long contentLength;
            try {
                contentLength = resource.contentLength();
            } catch (Exception ex) {
                contentLength = -1;
            }

            String rangeHeader = requestHeaders.getFirst(HttpHeaders.RANGE);
            if (contentLength > 0 && rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                long start = 0;
                long end = contentLength - 1;

                try {
                    String rangeValue = rangeHeader.substring("bytes=".length()).trim();
                    int commaIndex = rangeValue.indexOf(',');
                    if (commaIndex >= 0) {
                        rangeValue = rangeValue.substring(0, commaIndex).trim();
                    }

                    String[] parts = rangeValue.split("-", 2);
                    String startPart = parts.length > 0 ? parts[0].trim() : "";
                    String endPart = parts.length > 1 ? parts[1].trim() : "";

                    if (!startPart.isEmpty()) {
                        start = Long.parseLong(startPart);
                    }

                    if (!endPart.isEmpty()) {
                        end = Long.parseLong(endPart);
                    }

                    if (start < 0) {
                        start = 0;
                    }
                    if (end >= contentLength || end < 0) {
                        end = contentLength - 1;
                    }
                    if (start >= contentLength || end < start) {
                        start = 0;
                        end = contentLength - 1;
                    }

                    long rangeLength = end - start + 1;
                    byte[] body = readRange(resource, start, rangeLength);
                    return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                            .contentType(mediaType)
                            .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                            .header(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + contentLength)
                            .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                            .contentLength(rangeLength)
                            .body(body);
                } catch (Exception ignored) {
                }
            }

            ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString());

            if (contentLength >= 0) {
                responseBuilder.contentLength(contentLength);
            }

            return responseBuilder.body(resource);
        }

    private byte[] readRange(Resource resource, long start, long length) {
        if (length <= 0) {
            return new byte[0];
        }

        if (length > Integer.MAX_VALUE) {
            throw new RuntimeException("ERROR.UPLOAD.READ_FAILED");
        }

        try (InputStream inputStream = resource.getInputStream()) {
            long skipped = 0;
            while (skipped < start) {
                long current = inputStream.skip(start - skipped);
                if (current <= 0) {
                    throw new RuntimeException("ERROR.UPLOAD.READ_FAILED");
                }
                skipped += current;
            }

            byte[] data = inputStream.readNBytes((int) length);
            if (data.length == 0) {
                throw new RuntimeException("ERROR.UPLOAD.READ_FAILED");
            }
            return data;
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.READ_FAILED");
        }
    }

    @PreAuthorize("hasAuthority('100')")
    @DeleteMapping("/{fileName:.+}")
    public ResponseEntity<Void> delete(@PathVariable String fileName,
                                       @RequestParam(value = "folder", required = false) String folder) {
        uploadService.delete(fileName, folder);
        return ResponseEntity.noContent().build();
    }
}
