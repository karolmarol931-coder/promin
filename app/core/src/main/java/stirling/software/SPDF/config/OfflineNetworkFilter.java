package stirling.software.SPDF.config;

import java.io.IOException;
import java.util.List;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import stirling.software.common.model.ApplicationProperties;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class OfflineNetworkFilter extends OncePerRequestFilter {
    private static final List<String> NETWORK_ENDPOINTS =
            List.of(
                    "/api/v1/convert/url/pdf",
                    "/api/v1/security/timestamp-pdf",
                    "/api/v1/form/form-detection-model/install");

    private static final List<String> NETWORK_PREFIXES =
            List.of(
                    "/api/v1/ai",
                    "/api/v1/mcp",
                    "/api/v1/storage",
                    "/api/v1/share",
                    "/api/v1/sharing",
                    "/api/v1/signing",
                    "/api/v1/automation",
                    "/api/v1/pipeline",
                    "/api/v1/policies",
                    "/api/v1/integration",
                    "/api/v1/integrations",
                    "/api/v1/proprietary",
                    "/api/v1/auth",
                    "/api/v1/admin/license",
                    "/api/v1/ui-data/tessdata");

    private final ApplicationProperties applicationProperties;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !applicationProperties.getSystem().isOfflineMode()
                || !isNetworkDependentPath(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"This operation is disabled in offline mode\"}");
    }

    static boolean isNetworkDependentPath(String path) {
        return NETWORK_ENDPOINTS.stream().anyMatch(endpoint -> matchesPath(path, endpoint))
                || NETWORK_PREFIXES.stream().anyMatch(prefix -> matchesPath(path, prefix));
    }

    private static boolean matchesPath(String path, String prefix) {
        return path.equals(prefix) || path.startsWith(prefix + "/");
    }
}
