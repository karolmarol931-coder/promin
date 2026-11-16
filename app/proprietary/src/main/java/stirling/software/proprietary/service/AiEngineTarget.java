package stirling.software.proprietary.service;

import java.util.Map;

/** The configured AI engine URL and its auth headers; baseUrl has no trailing slash. */
public record AiEngineTarget(String baseUrl, Map<String, String> headers) {

    public AiEngineTarget {
        headers = Map.copyOf(headers);
    }

    public String urlFor(String path) {
        return baseUrl + path;
    }
}
