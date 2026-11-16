package stirling.software.proprietary.policy.controller;

import org.springframework.web.servlet.HandlerMapping;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Policy execute-route namespace under {@code /api/v1/policies} - the paths that actually run an
 * automation ({@code /run}, {@code /run/stream}, {@code /{id}/run}, {@code /{id}/trigger}).
 *
 * <p>The match is exact and segment-anchored so read/list routes aren't treated as execution.
 */
public final class PolicyRunRoutes {

    private static final String BASE = "/api/v1/policies";

    private PolicyRunRoutes() {}

    /**
     * True when the request resolved to a policy execute endpoint. Prefers the matched route
     * pattern (context-path independent, set by Spring MVC) and falls back to the raw request URI.
     */
    public static boolean matches(HttpServletRequest request) {
        Object pattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String path = pattern instanceof String s ? s : request.getRequestURI();
        String rel = relativeToBase(path);
        return rel != null && isExecuteRoute(rel);
    }

    /**
     * The path relative to {@code /api/v1/policies}, or null if the request isn't under that base.
     * Segment-anchored (the char after the base must be {@code /} or end-of-string) so a sibling
     * like {@code /api/v1/policies-x/...} never matches; tolerates a leading context path.
     */
    private static String relativeToBase(String path) {
        if (path == null) {
            return null;
        }
        int base = path.indexOf(BASE);
        if (base < 0) {
            return null;
        }
        int end = base + BASE.length();
        if (end < path.length() && path.charAt(end) != '/') {
            return null;
        }
        return path.substring(end);
    }

    /**
     * The execute routes only: {@code /run}, {@code /run/stream}, and the single-segment {@code
     * /{id}/run} / {@code /{id}/trigger} (template or concrete id). Read/list/CRUD routes - {@code
     * /run/{runId}}, {@code /runs}, {@code /overview}, {@code /triggers}, {@code /{id}}, {@code
     * /order}, {@code /{id}/processed-history}, the base list/create - are all excluded.
     */
    private static boolean isExecuteRoute(String rel) {
        return rel.equals("/run")
                || rel.equals("/run/stream")
                || isSingleIdRoute(rel, "run")
                || isSingleIdRoute(rel, "trigger");
    }

    /**
     * True for exactly {@code /{oneSegment}/<verb>} (the id being a template or a concrete value).
     */
    private static boolean isSingleIdRoute(String rel, String verb) {
        String suffix = "/" + verb;
        if (!rel.endsWith(suffix)) {
            return false;
        }
        String idSegment = rel.substring(0, rel.length() - suffix.length());
        return idSegment.length() > 1
                && idSegment.charAt(0) == '/'
                && idSegment.indexOf('/', 1) < 0;
    }
}
