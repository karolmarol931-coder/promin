package stirling.software.SPDF.controller.api;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSArray;
import org.apache.pdfbox.cos.COSBase;
import org.apache.pdfbox.cos.COSFloat;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.cos.COSNumber;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.common.PDStream;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;

final class MergePageNormalizer {
    private static final Set<String> PAIR_COORDINATE_KEYS =
            Set.of("QuadPoints", "Vertices", "L", "CL");

    private MergePageNormalizer() {}

    static void normalize(
            File source,
            File destination,
            Set<Integer> pageIndexes,
            float portraitWidth,
            float portraitHeight)
            throws IOException {
        if (!Float.isFinite(portraitWidth)
                || !Float.isFinite(portraitHeight)
                || portraitWidth <= 0
                || portraitHeight <= 0) {
            throw new IOException("Invalid target page size for merge normalization.");
        }

        try (PDDocument document = Loader.loadPDF(source)) {
            for (int pageIndex : pageIndexes) {
                if (pageIndex < 0 || pageIndex >= document.getNumberOfPages()) {
                    throw new IOException("Merge normalization page index is out of range.");
                }
                normalizePage(document.getPage(pageIndex), document, portraitWidth, portraitHeight);
            }
            document.save(destination);
        }
    }

    private static void normalizePage(
            PDPage page, PDDocument document, float portraitWidth, float portraitHeight)
            throws IOException {
        PDRectangle sourceBox = page.getCropBox();
        float userUnit = page.getUserUnit();
        if (!Float.isFinite(userUnit) || userUnit <= 0) userUnit = 1;

        boolean rotated = Math.floorMod(page.getRotation(), 180) != 0;
        float displayWidth = rotated ? sourceBox.getHeight() : sourceBox.getWidth();
        float displayHeight = rotated ? sourceBox.getWidth() : sourceBox.getHeight();
        boolean landscape = displayWidth > displayHeight;
        float targetDisplayWidth = landscape ? portraitHeight : portraitWidth;
        float targetDisplayHeight = landscape ? portraitWidth : portraitHeight;
        float targetWidth = (rotated ? targetDisplayHeight : targetDisplayWidth) / userUnit;
        float targetHeight = (rotated ? targetDisplayWidth : targetDisplayHeight) / userUnit;
        float scale =
                Math.min(targetWidth / sourceBox.getWidth(), targetHeight / sourceBox.getHeight());
        float offsetX = (targetWidth - sourceBox.getWidth() * scale) / 2;
        float offsetY = (targetHeight - sourceBox.getHeight() * scale) / 2;
        float translateX = offsetX - sourceBox.getLowerLeftX() * scale;
        float translateY = offsetY - sourceBox.getLowerLeftY() * scale;

        transformContents(page, document, scale, translateX, translateY);
        for (PDAnnotation annotation : page.getAnnotations()) {
            transformAnnotation(annotation, scale, translateX, translateY);
        }

        PDRectangle targetBox = new PDRectangle(targetWidth, targetHeight);
        page.setMediaBox(targetBox);
        page.setCropBox(targetBox);
        page.setBleedBox(targetBox);
        page.setTrimBox(targetBox);
        page.setArtBox(targetBox);
    }

    private static void transformContents(
            PDPage page, PDDocument document, float scale, float translateX, float translateY)
            throws IOException {
        PDStream transformed = new PDStream(document);
        String prefix =
                "q\n" + scale + " 0 0 " + scale + " " + translateX + " " + translateY + " cm\n";
        try (OutputStream output = transformed.createOutputStream()) {
            output.write(prefix.getBytes(StandardCharsets.US_ASCII));
            try (InputStream input = page.getContents()) {
                if (input != null) input.transferTo(output);
            }
            output.write("\nQ\n".getBytes(StandardCharsets.US_ASCII));
        }
        page.setContents(transformed);
    }

    private static void transformAnnotation(
            PDAnnotation annotation, float scale, float translateX, float translateY)
            throws IOException {
        PDRectangle rectangle = annotation.getRectangle();
        if (rectangle != null) {
            annotation.setRectangle(
                    new PDRectangle(
                            rectangle.getLowerLeftX() * scale + translateX,
                            rectangle.getLowerLeftY() * scale + translateY,
                            rectangle.getWidth() * scale,
                            rectangle.getHeight() * scale));
        }

        for (String key : PAIR_COORDINATE_KEYS) {
            COSBase value = annotation.getCOSObject().getDictionaryObject(COSName.getPDFName(key));
            if (value instanceof COSArray points) {
                transformCoordinatePairs(points, scale, translateX, translateY);
            }
        }

        COSBase inkList =
                annotation.getCOSObject().getDictionaryObject(COSName.getPDFName("InkList"));
        if (inkList instanceof COSArray strokes) {
            for (int i = 0; i < strokes.size(); i++) {
                COSBase stroke = strokes.getObject(i);
                if (stroke instanceof COSArray points) {
                    transformCoordinatePairs(points, scale, translateX, translateY);
                }
            }
        }
    }

    private static void transformCoordinatePairs(
            COSArray coordinates, float scale, float translateX, float translateY) {
        for (int i = 0; i + 1 < coordinates.size(); i += 2) {
            COSBase xValue = coordinates.getObject(i);
            COSBase yValue = coordinates.getObject(i + 1);
            if (xValue instanceof COSNumber x && yValue instanceof COSNumber y) {
                coordinates.set(i, new COSFloat(x.floatValue() * scale + translateX));
                coordinates.set(i + 1, new COSFloat(y.floatValue() * scale + translateY));
            }
        }
    }
}
