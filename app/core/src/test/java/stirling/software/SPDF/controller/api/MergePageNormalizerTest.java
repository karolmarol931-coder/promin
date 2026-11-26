package stirling.software.SPDF.controller.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Set;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationWidget;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDTextField;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class MergePageNormalizerTest {
    @TempDir Path tempDir;

    @Test
    void normalizesOversizedPageAndKeepsFormWidgetAndVisibleContent() throws Exception {
        File source = tempDir.resolve("oversized.pdf").toFile();
        File destination = tempDir.resolve("normalized.pdf").toFile();
        createFormPdf(source);

        MergePageNormalizer.normalize(source, destination, Set.of(0), 595.28f, 841.89f);

        try (PDDocument normalized = Loader.loadPDF(destination)) {
            PDPage page = normalized.getPage(0);
            assertThat(page.getMediaBox().getWidth()).isCloseTo(595.28f, within(0.01f));
            assertThat(page.getMediaBox().getHeight()).isCloseTo(841.89f, within(0.01f));
            assertThat(normalized.getDocumentCatalog().getAcroForm()).isNotNull();
            assertThat(normalized.getDocumentCatalog().getAcroForm().getField("client"))
                    .isInstanceOf(PDTextField.class);
            PDAnnotationWidget widget =
                    normalized
                            .getDocumentCatalog()
                            .getAcroForm()
                            .getField("client")
                            .getWidgets()
                            .get(0);
            assertThat(widget.getRectangle().getWidth()).isCloseTo(48.95f, within(0.1f));

            var rendered = new PDFRenderer(normalized).renderImage(0, 1f);
            long nonWhitePixels = 0;
            for (int y = 0; y < rendered.getHeight(); y++) {
                for (int x = 0; x < rendered.getWidth(); x++) {
                    if ((rendered.getRGB(x, y) & 0x00ffffff) != 0x00ffffff) {
                        nonWhitePixels++;
                    }
                }
            }
            assertThat(nonWhitePixels).isGreaterThan(0);
            assertThat(rendered.getWidth()).isBetween(590, 600);
            assertThat(rendered.getHeight()).isBetween(835, 850);
        }
    }

    private static void createFormPdf(File file) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(new PDRectangle(2432, 3440));
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(
                        new org.apache.pdfbox.pdmodel.font.PDType1Font(
                                org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName.HELVETICA),
                        48);
                content.newLineAtOffset(100, 3000);
                content.showText("Visible page content");
                content.endText();
            }

            PDAcroForm form = new PDAcroForm(document);
            document.getDocumentCatalog().setAcroForm(form);
            PDTextField field = new PDTextField(form);
            field.setPartialName("client");
            field.getCOSObject().setString(COSName.V, "Sample value");
            PDAnnotationWidget widget = field.getWidgets().get(0);
            widget.setRectangle(new PDRectangle(200, 2000, 200, 80));
            widget.setPage(page);
            page.getAnnotations().add(widget);
            form.getFields().add(field);
            document.save(file);
        }
    }
}
