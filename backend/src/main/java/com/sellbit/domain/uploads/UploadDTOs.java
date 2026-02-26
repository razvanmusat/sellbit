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
}
