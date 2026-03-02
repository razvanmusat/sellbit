package com.sellbit.domain.uploads;

import java.time.Instant;

public class UploadDTOs {

    public record FileItem(
            String fileName,
            String originalName,
            long size,
            Instant lastModified,
            boolean image
    ) {}

        public record ChunkUploadResponse(
            String uploadId,
            int chunkIndex,
            int totalChunks,
            long uploadedChunks,
            boolean readyToComplete
        ) {}
}
