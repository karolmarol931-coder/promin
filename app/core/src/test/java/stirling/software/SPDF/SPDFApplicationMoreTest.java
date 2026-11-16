package stirling.software.SPDF;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.context.event.ApplicationReadyEvent;

import stirling.software.common.configuration.AppConfig;

@ExtendWith(MockitoExtension.class)
class SPDFApplicationMoreTest {

    @Mock private AppConfig appConfig;

    @Test
    void onApplicationReadyUsesRuntimePort() {
        ApplicationReadyEvent event = mock(ApplicationReadyEvent.class, RETURNS_DEEP_STUBS);
        when(event.getApplicationContext().getEnvironment().getProperty("local.server.port"))
                .thenReturn("44444");

        new SPDFApplication(appConfig).onApplicationReady(event);

        assertThat(SPDFApplication.getStaticPort()).isEqualTo("44444");
    }

    @Test
    void desktopStartupUsesConfiguredPort() {
        when(appConfig.getServerPort()).thenReturn("8080");

        new SPDFApplication(appConfig).init();

        assertThat(SPDFApplication.getStaticPort()).isEqualTo("8080");
    }
}
