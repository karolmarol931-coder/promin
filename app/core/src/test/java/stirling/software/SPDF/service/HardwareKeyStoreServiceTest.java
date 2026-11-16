package stirling.software.SPDF.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.parallel.ResourceAccessMode;
import org.junit.jupiter.api.parallel.ResourceLock;

import jakarta.servlet.http.HttpServletRequest;

import stirling.software.SPDF.model.api.security.HardwareSigningCapabilities;

/** Unit tests for the gating / allowlist logic that protects the hardware signing paths. */
@ResourceLock(value = "STIRLING_PDF_TAURI_MODE", mode = ResourceAccessMode.READ_WRITE)
class HardwareKeyStoreServiceTest {

    private static final String PKCS11_PROP = "stirling.pkcs11.libraries";

    private HardwareKeyStoreService service() {
        return new HardwareKeyStoreService();
    }

    @Test
    void isDesktop_falseOutsideTauri() {
        String previous = System.getProperty("STIRLING_PDF_TAURI_MODE");
        try {
            System.clearProperty("STIRLING_PDF_TAURI_MODE");
            assertFalse(service().isDesktop());
        } finally {
            if (previous == null) {
                System.clearProperty("STIRLING_PDF_TAURI_MODE");
            } else {
                System.setProperty("STIRLING_PDF_TAURI_MODE", previous);
            }
        }
    }

    @Test
    void isDesktop_trueInTauriModeEvenWithoutClientMachineType() {
        // The Tauri bundle sets STIRLING_PDF_TAURI_MODE=true while machineType stays Server-jar.
        String previous = System.getProperty("STIRLING_PDF_TAURI_MODE");
        try {
            System.setProperty("STIRLING_PDF_TAURI_MODE", "true");
            assertTrue(service().isDesktop());
        } finally {
            if (previous == null) {
                System.clearProperty("STIRLING_PDF_TAURI_MODE");
            } else {
                System.setProperty("STIRLING_PDF_TAURI_MODE", previous);
            }
        }
    }

    @Test
    void capabilities_notDesktop_reportsUnavailable() {
        String previous = System.getProperty("STIRLING_PDF_TAURI_MODE");
        try {
            System.clearProperty("STIRLING_PDF_TAURI_MODE");
            HardwareSigningCapabilities caps = service().capabilities();
            assertFalse(caps.desktop());
            assertFalse(caps.windowsStoreSupported());
            assertFalse(caps.pkcs11Supported());
            assertTrue(caps.detectedLibraries().isEmpty());
        } finally {
            if (previous == null) {
                System.clearProperty("STIRLING_PDF_TAURI_MODE");
            } else {
                System.setProperty("STIRLING_PDF_TAURI_MODE", previous);
            }
        }
    }

    @Test
    void capabilities_desktop_reportsOsName() {
        String previous = System.getProperty("STIRLING_PDF_TAURI_MODE");
        try {
            System.setProperty("STIRLING_PDF_TAURI_MODE", "true");
            HardwareSigningCapabilities caps = service().capabilities();
            assertTrue(caps.desktop());
            assertFalse(caps.osName().isBlank());
        } finally {
            if (previous == null) {
                System.clearProperty("STIRLING_PDF_TAURI_MODE");
            } else {
                System.setProperty("STIRLING_PDF_TAURI_MODE", previous);
            }
        }
    }

    @Test
    void assertLocalDesktop_rejectsNonDesktop() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        String previous = System.getProperty("STIRLING_PDF_TAURI_MODE");
        try {
            System.clearProperty("STIRLING_PDF_TAURI_MODE");
            assertThrows(
                    IllegalArgumentException.class, () -> service().assertLocalDesktop(request));
        } finally {
            if (previous == null) {
                System.clearProperty("STIRLING_PDF_TAURI_MODE");
            } else {
                System.setProperty("STIRLING_PDF_TAURI_MODE", previous);
            }
        }
    }

    @Test
    void assertLocalDesktop_rejectsRemoteCallerEvenOnDesktop() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        // 203.0.113.0/24 is TEST-NET-3 (RFC 5737) - never a real local interface address.
        when(request.getRemoteAddr()).thenReturn("203.0.113.5");
        assertThrows(IllegalArgumentException.class, () -> service().assertLocalDesktop(request));
    }

    @Test
    void assertLocalDesktop_allowsLoopbackOnDesktop() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        String previous = System.getProperty("STIRLING_PDF_TAURI_MODE");
        try {
            System.setProperty("STIRLING_PDF_TAURI_MODE", "true");
            assertDoesNotThrow(() -> service().assertLocalDesktop(request));
            assertDoesNotThrow(() -> service().assertLocalDesktop(null));
        } finally {
            if (previous == null) {
                System.clearProperty("STIRLING_PDF_TAURI_MODE");
            } else {
                System.setProperty("STIRLING_PDF_TAURI_MODE", previous);
            }
        }
    }

    @Test
    void isLocalRequest_acceptsLoopbackForms_rejectsRemote() {
        assertTrue(HardwareKeyStoreService.isLocalRequest("127.0.0.1"));
        assertTrue(HardwareKeyStoreService.isLocalRequest("::1"));
        assertTrue(HardwareKeyStoreService.isLocalRequest("0:0:0:0:0:0:0:1"));
        // IPv4-mapped IPv6 loopback - what Tomcat reports for the desktop webview.
        assertTrue(HardwareKeyStoreService.isLocalRequest("::ffff:127.0.0.1"));
        assertFalse(HardwareKeyStoreService.isLocalRequest("203.0.113.5"));
        assertFalse(HardwareKeyStoreService.isLocalRequest(null));
    }

    @Test
    void validateLibraryAllowed_blankPath_throws() {
        assertThrows(IllegalArgumentException.class, () -> service().validateLibraryAllowed("   "));
    }

    @Test
    void validateLibraryAllowed_unknownPath_throws() {
        assertThrows(
                IllegalArgumentException.class,
                () -> service().validateLibraryAllowed("/definitely/not/a/real/driver.so"));
    }

    @Test
    void validateLibraryAllowed_configuredPath_isAllowed(@TempDir Path tempDir) throws Exception {
        Path fakeDriver = Files.createFile(tempDir.resolve("fake-pkcs11.so"));
        String previous = System.getProperty(PKCS11_PROP);
        try {
            System.setProperty(PKCS11_PROP, fakeDriver.toString());
            System.setProperty("STIRLING_PDF_TAURI_MODE", "true");
            HardwareKeyStoreService service = service();
            assertDoesNotThrow(() -> service.validateLibraryAllowed(fakeDriver.toString()));
            assertTrue(
                    service.detectPkcs11Libraries().stream()
                            .anyMatch(l -> l.path().equals(fakeDriver.toString())));
        } finally {
            if (previous == null) {
                System.clearProperty(PKCS11_PROP);
            } else {
                System.setProperty(PKCS11_PROP, previous);
            }
        }
    }
}
