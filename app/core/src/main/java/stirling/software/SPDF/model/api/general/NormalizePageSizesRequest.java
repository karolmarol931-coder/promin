package stirling.software.SPDF.model.api.general;

import io.swagger.v3.oas.annotations.media.Schema;

import lombok.Data;
import lombok.EqualsAndHashCode;

import stirling.software.common.model.api.PDFFile;

@Data
@EqualsAndHashCode(callSuper = true)
public class NormalizePageSizesRequest extends PDFFile {

    @Schema(description = "Comma-separated zero-based page indexes to resize.")
    private String pageIndexes;

    @Schema(description = "Common portrait page width in PDF points.")
    private Float portraitWidth;

    @Schema(description = "Common portrait page height in PDF points.")
    private Float portraitHeight;
}
