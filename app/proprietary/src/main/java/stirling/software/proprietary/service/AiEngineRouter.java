package stirling.software.proprietary.service;

import java.util.Map;

import org.springframework.stereotype.Service;

import stirling.software.common.model.ApplicationProperties;

@Service
public class AiEngineRouter {

    static final String HEADER_ENGINE_AUTH = "X-Engine-Auth";

    private final ApplicationProperties applicationProperties;
    private final String engineSharedSecret;

    public AiEngineRouter(ApplicationProperties applicationProperties) {
        this(applicationProperties, System.getenv("STIRLING_ENGINE_SHARED_SECRET"));
    }

    private AiEngineRouter(ApplicationProperties applicationProperties, String engineSharedSecret) {
        this.applicationProperties = applicationProperties;
        this.engineSharedSecret = engineSharedSecret;
    }

    public static AiEngineRouter selfHosted(
            ApplicationProperties applicationProperties, String engineSharedSecret) {
        return new AiEngineRouter(applicationProperties, engineSharedSecret);
    }

    public AiEngineTarget resolve() {
        String secret = engineSharedSecret == null ? "" : engineSharedSecret.strip();
        return new AiEngineTarget(
                trimTrailingSlashes(applicationProperties.getAiEngine().getUrl()),
                secret.isEmpty() ? Map.of() : Map.of(HEADER_ENGINE_AUTH, secret));
    }

    private static String trimTrailingSlashes(String value) {
        return value == null ? "" : value.strip().replaceAll("/+$", "");
    }
}
