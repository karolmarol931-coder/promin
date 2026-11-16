package stirling.software.proprietary.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import stirling.software.common.model.ApplicationProperties;

class AiEngineRouterTest {

    @Test
    void trimsTheConfiguredEngineUrlAndAddsTheSharedSecret() {
        ApplicationProperties properties = new ApplicationProperties();
        properties.getAiEngine().setUrl("http://localhost:5001///");

        AiEngineTarget target = AiEngineRouter.selfHosted(properties, " secret ").resolve();

        assertThat(target.baseUrl()).isEqualTo("http://localhost:5001");
        assertThat(target.headers()).containsEntry("X-Engine-Auth", "secret");
        assertThat(target.urlFor("/health")).isEqualTo("http://localhost:5001/health");
    }

    @Test
    void blankSharedSecretAddsNoAuthorizationHeader() {
        ApplicationProperties properties = new ApplicationProperties();
        properties.getAiEngine().setUrl("http://localhost:5001");

        AiEngineTarget target = AiEngineRouter.selfHosted(properties, " ").resolve();

        assertThat(target.headers()).isEmpty();
    }
}
