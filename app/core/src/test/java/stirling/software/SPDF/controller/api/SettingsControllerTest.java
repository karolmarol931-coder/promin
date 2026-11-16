package stirling.software.SPDF.controller.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import stirling.software.SPDF.config.EndpointConfiguration;

class SettingsControllerTest {

    @Test
    void returnsConfiguredEndpointStatuses() {
        EndpointConfiguration endpoints = mock(EndpointConfiguration.class);
        Map<String, Boolean> expected = Map.of("merge-pdfs", true, "remove-blanks", false);
        when(endpoints.getEndpointStatuses()).thenReturn(expected);

        ResponseEntity<Map<String, Boolean>> response =
                new SettingsController(endpoints).getDisabledEndpoints();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());
    }
}
