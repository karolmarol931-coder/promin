package stirling.software.SPDF;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import stirling.software.common.configuration.AppConfig;

@ExtendWith(MockitoExtension.class)
public class SPDFApplicationTest {

    @InjectMocks private SPDFApplication sPDFApplication;

    @Mock private AppConfig appConfig;

    @BeforeEach
    public void setUp() {
        SPDFApplication.setServerPortStatic("8080");
    }

    @Test
    public void testSetServerPortStatic() {
        SPDFApplication.setServerPortStatic("9090");
        assertEquals("9090", SPDFApplication.getStaticPort());
    }

    @Test
    public void testGetStaticPort() {
        assertEquals("8080", SPDFApplication.getStaticPort());
    }

    @Test
    public void testSetServerPortStaticAuto() {
        SPDFApplication.setServerPortStatic("auto");
        assertEquals("0", SPDFApplication.getStaticPort());
    }

    @Test
    public void testInit() {
        when(appConfig.getServerPort()).thenReturn("8080");

        sPDFApplication.init();

        assertEquals("8080", SPDFApplication.getStaticPort());
    }

    // Tests for getActiveProfile removed - method is now private
}
