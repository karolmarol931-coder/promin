package stirling.software.SPDF.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.FilterChain;

import stirling.software.common.model.ApplicationProperties;

class OfflineNetworkFilterTest {

    private final ApplicationProperties properties = new ApplicationProperties();
    private final FilterChain chain = mock(FilterChain.class);
    private final OfflineNetworkFilter filter = new OfflineNetworkFilter(properties);

    @BeforeEach
    void setUp() {
        properties.getSystem().setOfflineMode(true);
    }

    @Test
    void rejectsMultipartNetworkRequestsWithoutStartingAnErrorDispatch() throws Exception {
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/api/v1/convert/url/pdf");
        request.setServletPath("/api/v1/convert/url/pdf");
        request.setContentType("multipart/form-data; boundary=unused");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(403, response.getStatus());
        assertEquals("application/json", response.getContentType());
        assertEquals(
                "{\"error\":\"This operation is disabled in offline mode\"}",
                response.getContentAsString());
        assertNull(response.getErrorMessage());
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void keepsLocalPdfOperationsAvailable() throws Exception {
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/api/v1/general/merge-pdfs");
        request.setServletPath("/api/v1/general/merge-pdfs");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        verify(chain).doFilter(any(), any());
    }

    @Test
    void allowsNetworkOperationsOutsideOfflineMode() throws Exception {
        properties.getSystem().setOfflineMode(false);
        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/api/v1/security/timestamp-pdf");
        request.setServletPath("/api/v1/security/timestamp-pdf");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        verify(chain).doFilter(any(), any());
    }

    @Test
    void blocksOperationsThatCanReachExternalServices() {
        assertTrue(OfflineNetworkFilter.isNetworkDependentPath("/api/v1/convert/url/pdf"));
        assertTrue(OfflineNetworkFilter.isNetworkDependentPath("/api/v1/security/timestamp-pdf"));
        assertTrue(
                OfflineNetworkFilter.isNetworkDependentPath("/api/v1/ui-data/tessdata/download"));
        assertTrue(OfflineNetworkFilter.isNetworkDependentPath("/api/v1/ai/orchestrate"));
        assertTrue(OfflineNetworkFilter.isNetworkDependentPath("/api/v1/storage/files"));
        assertTrue(
                OfflineNetworkFilter.isNetworkDependentPath(
                        "/api/v1/form/form-detection-model/install"));
    }

    @Test
    void identifiesLocalPdfOperationsAsOfflineSafe() {
        assertFalse(OfflineNetworkFilter.isNetworkDependentPath("/api/v1/general/merge-pdfs"));
        assertFalse(OfflineNetworkFilter.isNetworkDependentPath("/api/v1/misc/compress-pdf"));
        assertFalse(OfflineNetworkFilter.isNetworkDependentPath("/api/v1/convert/pdf/img"));
    }
}
