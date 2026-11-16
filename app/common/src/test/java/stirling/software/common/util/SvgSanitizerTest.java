package stirling.software.common.util;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.common.service.SsrfProtectionService;

class SvgSanitizerTest {

    private SvgSanitizer sanitizer;
    private ApplicationProperties applicationProperties;
    private SsrfProtectionService ssrfProtectionService;

    @BeforeEach
    void setUp() {
        applicationProperties = new ApplicationProperties();
        ssrfProtectionService = mock(SsrfProtectionService.class);
        sanitizer = new SvgSanitizer(ssrfProtectionService, applicationProperties);
    }

    @Test
    void testSanitize_validSvg() throws IOException {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"10\"/></svg>";
        byte[] result = sanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        assertNotNull(result);
        assertTrue(result.length > 0);
        String output = new String(result, StandardCharsets.UTF_8);
        assertTrue(output.contains("circle"));
    }

    @Test
    void testSanitize_removesScriptElement() throws IOException {
        String svg =
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert('xss')</script><circle r=\"10\"/></svg>";
        byte[] result = sanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        String output = new String(result, StandardCharsets.UTF_8);
        assertFalse(output.contains("script"));
        assertTrue(output.contains("circle"));
    }

    @Test
    void testSanitize_removesEventHandler() throws IOException {
        String svg =
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"10\" onclick=\"alert('xss')\"/></svg>";
        byte[] result = sanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        String output = new String(result, StandardCharsets.UTF_8);
        assertFalse(output.contains("onclick"));
    }

    @Test
    void testSanitize_removesJavascriptUrl() throws IOException {
        String svg =
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><a href=\"javascript:alert('xss')\"><circle r=\"10\"/></a></svg>";
        byte[] result = sanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        String output = new String(result, StandardCharsets.UTF_8);
        assertFalse(output.contains("javascript"));
    }

    @Test
    void testSanitize_nullInput() {
        assertThrows(IOException.class, () -> sanitizer.sanitize(null));
    }

    @Test
    void testSanitize_emptyInput() {
        assertThrows(IOException.class, () -> sanitizer.sanitize(new byte[0]));
    }

    @Test
    void testSanitize_disabledByConfig() throws IOException {
        applicationProperties.getSystem().setDisableSanitize(true);
        byte[] input =
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>evil</script></svg>"
                        .getBytes(StandardCharsets.UTF_8);
        byte[] result = sanitizer.sanitize(input);
        assertArrayEquals(input, result);
    }

    @Test
    void testSanitize_offlineModeOverridesDisabledSanitizationAndAllowlist() throws IOException {
        applicationProperties.getSystem().setDisableSanitize(true);
        applicationProperties.getSystem().setOfflineMode(true);
        applicationProperties
                .getSystem()
                .getHtml()
                .getUrlSecurity()
                .getAllowedDomains()
                .add("example.invalid");
        String input =
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><image"
                        + " href=\"https://example.invalid/image.png\"/><script>evil</script>"
                        + "<circle r=\"10\"/></svg>";

        byte[] result = sanitizer.sanitize(input.getBytes(StandardCharsets.UTF_8));

        String output = new String(result, StandardCharsets.UTF_8);
        assertFalse(output.contains("https://example.invalid"));
        assertFalse(output.contains("script"));
        assertTrue(output.contains("circle"));
        verifyNoInteractions(ssrfProtectionService);
    }

    @Test
    void testSanitize_offlineModeRemovesExternalStylesheetProcessingInstruction()
            throws IOException {
        applicationProperties.getSystem().setOfflineMode(true);
        String input =
                "<?xml-stylesheet type=\"text/css\""
                        + " href=\"https://example.invalid/style.css\"?>"
                        + "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"10\"/></svg>";

        byte[] result = sanitizer.sanitize(input.getBytes(StandardCharsets.UTF_8));

        String output = new String(result, StandardCharsets.UTF_8);
        assertFalse(output.contains("xml-stylesheet"));
        assertFalse(output.contains("https://example.invalid"));
        assertTrue(output.contains("circle"));
        verifyNoInteractions(ssrfProtectionService);
    }

    @Test
    void testSanitize_removesForeignObject() throws IOException {
        String svg =
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><foreignObject><body>evil</body></foreignObject><rect width=\"10\" height=\"10\"/></svg>";
        byte[] result = sanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        String output = new String(result, StandardCharsets.UTF_8);
        assertFalse(output.toLowerCase().contains("foreignobject"));
    }

    @Test
    void testSanitize_invalidXml() {
        byte[] invalid = "not xml at all".getBytes(StandardCharsets.UTF_8);
        assertThrows(IOException.class, () -> sanitizer.sanitize(invalid));
    }

    @Test
    void testSanitize_removesRootRelativeLocalPath() throws IOException {
        when(ssrfProtectionService.isUrlAllowed(anyString())).thenReturn(false);
        String svg =
                "<svg xmlns=\"http://www.w3.org/2000/svg\">"
                        + "<image href=\"/tmp/image.png\" width=\"10\" height=\"10\"/></svg>";
        byte[] result = sanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        String output = new String(result, StandardCharsets.UTF_8);
        assertFalse(output.contains("/tmp/image.png"), "Root-relative local path must be stripped");
    }

    @Test
    void testSanitize_removesRelativeLocalPath() throws IOException {
        when(ssrfProtectionService.isUrlAllowed(anyString())).thenReturn(false);
        String svg =
                "<svg xmlns=\"http://www.w3.org/2000/svg\">"
                        + "<image href=\"../../assets/image.png\" width=\"10\" height=\"10\"/></svg>";
        byte[] result = sanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        String output = new String(result, StandardCharsets.UTF_8);
        assertFalse(output.contains("assets/image.png"), "Relative local path must be stripped");
    }

    @Test
    void testSanitize_removesRootRelativeWindowsDrivePath() throws IOException {
        when(ssrfProtectionService.isUrlAllowed(anyString())).thenReturn(false);
        String svg =
                "<svg xmlns=\"http://www.w3.org/2000/svg\" "
                        + "xmlns:xlink=\"http://www.w3.org/1999/xlink\">"
                        + "<image xlink:href=\"/C:/Users/x/external-image.svg\""
                        + " width=\"10\" height=\"10\"/></svg>";
        byte[] result = sanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        String output = new String(result, StandardCharsets.UTF_8);
        assertFalse(
                output.contains("external-image"), "Root-relative Windows path must be stripped");
    }

    @Test
    void testSanitize_keepsInDocumentFragmentReference() throws IOException {
        String svg =
                "<svg xmlns=\"http://www.w3.org/2000/svg\">"
                        + "<use href=\"#gradient\"/><rect width=\"10\" height=\"10\"/></svg>";
        byte[] result = sanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        String output = new String(result, StandardCharsets.UTF_8);
        assertTrue(
                output.contains("#gradient"), "In-document fragment references must be preserved");
    }
}
