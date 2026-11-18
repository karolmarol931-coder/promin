package stirling.software.SPDF.controller.api;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import stirling.software.SPDF.config.swagger.MultiFileResponse;
import stirling.software.SPDF.model.api.SplitPagesRequest;
import stirling.software.common.annotations.AutoJobPostMapping;
import stirling.software.common.annotations.api.GeneralApi;
import stirling.software.common.enumeration.ResourceWeight;
import stirling.software.common.model.tool.ToolArity;
import stirling.software.common.model.tool.ToolFormat;
import stirling.software.common.model.tool.ToolIO;
import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.util.ExceptionUtils;
import stirling.software.common.util.FormUtils;
import stirling.software.common.util.GeneralUtils;
import stirling.software.common.util.TempFile;
import stirling.software.common.util.TempFileManager;
import stirling.software.common.util.WebResponseUtils;
import stirling.software.jpdfium.PdfDocument;
import stirling.software.jpdfium.PdfSplit;

@GeneralApi
@Slf4j
@RequiredArgsConstructor
public class SplitPDFController {

    private static final Pattern PAGE_NUMBER = Pattern.compile("\\d+");
    private static final Pattern PAGE_RANGE = Pattern.compile("(\\d+)\\s*-\\s*(\\d*)");
    private static final Pattern PAGE_FUNCTION =
            Pattern.compile("\\d*n(?:[+-]\\d+)?", Pattern.CASE_INSENSITIVE);

    private final CustomPDFDocumentFactory pdfDocumentFactory;
    private final TempFileManager tempFileManager;

    @AutoJobPostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            value = "/split-pages",
            resourceWeight = ResourceWeight.MEDIUM_WEIGHT)
    @MultiFileResponse
    @ToolIO(produces = ToolFormat.PDF, arity = ToolArity.SIMO)
    @Operation(
            summary = "Split a PDF file into separate documents",
            description =
                    "This endpoint splits a given PDF file into separate documents based on the"
                            + " specified page numbers or ranges. Users can specify pages using individual"
                            + " numbers, ranges, or 'all' for every page.")
    public ResponseEntity<Resource> splitPdf(@ModelAttribute SplitPagesRequest request)
            throws IOException {

        MultipartFile file = request.getFileInput();
        TempFile outputTempFile = new TempFile(tempFileManager, ".zip");
        try {
            try (TempFile sourceTempFile = new TempFile(tempFileManager, ".pdf")) {
                Files.copy(
                        file.getInputStream(),
                        sourceTempFile.getPath(),
                        StandardCopyOption.REPLACE_EXISTING);

                int totalPages;
                List<Integer> pageNumbers;
                boolean hasForm;
                try (PDDocument document =
                        pdfDocumentFactory.load(sourceTempFile.getFile(), true)) {
                    totalPages = document.getNumberOfPages();
                    pageNumbers = validateSplitPoints(request.getPageNumbers(), totalPages);
                    hasForm = document.getDocumentCatalog().getAcroForm(null) != null;
                }
                if (!pageNumbers.contains(totalPages - 1)) {
                    pageNumbers = new ArrayList<>(pageNumbers);
                    pageNumbers.add(totalPages - 1);
                }

                log.debug(
                        "Splitting PDF into pages: {}",
                        pageNumbers.stream().map(String::valueOf).collect(Collectors.joining(",")));

                String baseFilename = GeneralUtils.removeExtension(file.getOriginalFilename());
                try (ZipOutputStream zipOut =
                        new ZipOutputStream(Files.newOutputStream(outputTempFile.getPath()))) {
                    if (hasForm) {
                        // JPDFium's FPDF_ImportPagesByIndex drops the AcroForm dictionary, which
                        // breaks Fill Forms downstream. Fall back to the PDFBox load-and-remove
                        // path so the AcroForm (with only fields whose widgets remain on kept
                        // pages) is preserved.
                        writeSplitsViaPdfBox(
                                sourceTempFile.getFile(), pageNumbers, baseFilename, zipOut);
                    } else {
                        writeSplitsViaJpdfium(
                                sourceTempFile.getFile(), pageNumbers, baseFilename, zipOut);
                    }
                }
            }

            String zipFilename =
                    GeneralUtils.generateFilename(file.getOriginalFilename(), "_split.zip");
            return WebResponseUtils.zipFileToWebResponse(outputTempFile, zipFilename);
        } catch (Exception e) {
            outputTempFile.close();
            throw e;
        }
    }

    private List<Integer> validateSplitPoints(String requestedPages, int totalPages) {
        String normalized = requestedPages == null ? "" : requestedPages.trim();
        if (normalized.isEmpty()) {
            throw invalidSplitPoints("page numbers must not be empty");
        }

        List<Integer> splitPoints = new ArrayList<>();
        if ("all".equalsIgnoreCase(normalized)) {
            splitPoints = GeneralUtils.parsePageList(normalized, totalPages, false);
        } else {
            int previousPage = -1;
            for (String token : normalized.split(",", -1)) {
                String pageToken = token.trim();
                if (pageToken.isEmpty()) {
                    throw invalidSplitPoints("page numbers contain an empty item");
                }

                Matcher pageNumber = PAGE_NUMBER.matcher(pageToken);
                Matcher pageRange = PAGE_RANGE.matcher(pageToken);
                if (pageNumber.matches()) {
                    requirePageInDocument(parsePageNumber(pageToken), totalPages);
                } else if (pageRange.matches()) {
                    int start = parsePageNumber(pageRange.group(1));
                    int end =
                            pageRange.group(2).isEmpty()
                                    ? totalPages
                                    : parsePageNumber(pageRange.group(2));
                    requirePageInDocument(start, totalPages);
                    requirePageInDocument(end, totalPages);
                    if (end < start) {
                        throw invalidSplitPoints("page ranges must be in ascending order");
                    }
                } else if (!PAGE_FUNCTION.matcher(pageToken).matches()) {
                    throw invalidSplitPoints("page numbers must be numbers, ranges, or functions");
                }

                List<Integer> tokenPages =
                        GeneralUtils.parsePageList(new String[] {pageToken}, totalPages, false);
                if (tokenPages.isEmpty()) {
                    throw invalidSplitPoints("a page number does not exist in this PDF");
                }
                for (int page : tokenPages) {
                    if (page <= previousPage) {
                        throw invalidSplitPoints("page numbers must be unique and ascending");
                    }
                    splitPoints.add(page);
                    previousPage = page;
                }
            }
        }

        if (splitPoints.stream().noneMatch(page -> page < totalPages - 1)) {
            throw invalidSplitPoints("at least one split point must be before the last page");
        }
        return splitPoints;
    }

    private int parsePageNumber(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            throw invalidSplitPoints("page numbers must be whole numbers");
        }
    }

    private void requirePageInDocument(int page, int totalPages) {
        if (page < 1 || page > totalPages) {
            throw invalidSplitPoints("page numbers must be between 1 and " + totalPages);
        }
    }

    private IllegalArgumentException invalidSplitPoints(String reason) {
        return ExceptionUtils.createIllegalArgumentException(
                "error.invalidArgument", "Invalid argument: {0}", "pageNumbers " + reason);
    }

    private void writeSplitsViaJpdfium(
            File source, List<Integer> pageNumbers, String baseFilename, ZipOutputStream zipOut)
            throws IOException {
        try (PdfDocument sourceDoc = PdfDocument.open(source.toPath())) {
            int previousPageNumber = 0;
            for (int splitIndex = 0; splitIndex < pageNumbers.size(); splitIndex++) {
                int splitPoint = pageNumbers.get(splitIndex);
                try (TempFile splitTemp = new TempFile(tempFileManager, ".pdf")) {
                    try (PdfDocument splitDoc =
                            PdfSplit.extractPageRange(sourceDoc, previousPageNumber, splitPoint)) {
                        splitDoc.save(splitTemp.getPath());
                    }
                    writeEntry(zipOut, baseFilename, splitIndex + 1, splitTemp.getPath());
                }
                previousPageNumber = splitPoint + 1;
            }
        }
    }

    private void writeSplitsViaPdfBox(
            File source, List<Integer> pageNumbers, String baseFilename, ZipOutputStream zipOut)
            throws IOException {
        int previousPageNumber = 0;
        for (int splitIndex = 0; splitIndex < pageNumbers.size(); splitIndex++) {
            int splitPoint = pageNumbers.get(splitIndex);
            Set<Integer> keep = new HashSet<>();
            for (int i = previousPageNumber; i <= splitPoint; i++) {
                keep.add(i);
            }
            previousPageNumber = splitPoint + 1;

            try (PDDocument splitDoc = pdfDocumentFactory.load(source)) {
                for (int p = splitDoc.getNumberOfPages() - 1; p >= 0; p--) {
                    if (!keep.contains(p)) {
                        splitDoc.removePage(p);
                    }
                }
                FormUtils.pruneOrphanedFormFields(splitDoc);
                writeEntry(zipOut, baseFilename, splitIndex + 1, splitDoc);
            }
        }
    }

    private void writeEntry(ZipOutputStream zipOut, String baseFilename, int index, Path pdfPath)
            throws IOException {
        zipOut.putNextEntry(new ZipEntry(baseFilename + "_" + index + ".pdf"));
        Files.copy(pdfPath, zipOut);
        zipOut.closeEntry();
    }

    private void writeEntry(ZipOutputStream zipOut, String baseFilename, int index, PDDocument doc)
            throws IOException {
        zipOut.putNextEntry(new ZipEntry(baseFilename + "_" + index + ".pdf"));
        doc.save(zipOut);
        zipOut.closeEntry();
    }
}
