package stirling.software.proprietary.security.configuration.ee;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static stirling.software.proprietary.security.configuration.ee.KeygenLicenseVerifier.License;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.proprietary.service.UserLicenseSettingsService;

@ExtendWith(MockitoExtension.class)
class LicenseKeyCheckerTest {

    @Mock private KeygenLicenseVerifier verifier;
    @Mock private UserLicenseSettingsService userLicenseSettingsService;

    @Test
    void premiumDisabled_skipsVerification() {
        ApplicationProperties properties = new ApplicationProperties();
        properties.getPremium().setEnabled(false);
        properties.getPremium().setKey("dummy");

        LicenseKeyChecker checker =
                new LicenseKeyChecker(verifier, properties, userLicenseSettingsService);
        checker.init();

        assertEquals(License.NORMAL, checker.getPremiumLicenseEnabledResult());
        verifyNoInteractions(verifier);
    }

    @Test
    void directKey_verified() {
        ApplicationProperties properties = new ApplicationProperties();
        properties.getPremium().setEnabled(true);
        properties.getPremium().setKey("abc");
        when(verifier.verifyLicense("abc")).thenReturn(License.SERVER);

        LicenseKeyChecker checker =
                new LicenseKeyChecker(verifier, properties, userLicenseSettingsService);
        checker.init();

        assertEquals(License.SERVER, checker.getPremiumLicenseEnabledResult());
        verify(verifier).verifyLicense("abc");
    }

    @Test
    void fileKey_verified(@TempDir Path temp) throws IOException {
        Path file = temp.resolve("license.txt");
        Files.writeString(file, "filekey");
        ApplicationProperties properties = new ApplicationProperties();
        properties.getPremium().setEnabled(true);
        properties.getPremium().setKey("file:" + file);
        when(verifier.verifyLicense("filekey")).thenReturn(License.ENTERPRISE);

        LicenseKeyChecker checker =
                new LicenseKeyChecker(verifier, properties, userLicenseSettingsService);
        checker.init();

        assertEquals(License.ENTERPRISE, checker.getPremiumLicenseEnabledResult());
        verify(verifier).verifyLicense("filekey");
    }

    @Test
    void missingFile_resultsNormal(@TempDir Path temp) {
        ApplicationProperties properties = new ApplicationProperties();
        properties.getPremium().setEnabled(true);
        properties.getPremium().setKey("file:" + temp.resolve("missing.txt"));

        LicenseKeyChecker checker =
                new LicenseKeyChecker(verifier, properties, userLicenseSettingsService);
        checker.init();

        assertEquals(License.NORMAL, checker.getPremiumLicenseEnabledResult());
        verifyNoInteractions(verifier);
    }

    @Test
    void requireProOrEnterprise_normalLicense_throwsWithFeatureName() {
        LicenseKeyChecker checker = checkerWithLicense(License.NORMAL);
        assertThatThrownBy(() -> checker.requireProOrEnterprise("storage.provider=s3"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("storage.provider=s3 requires a Pro or Enterprise license");
    }

    @Test
    void requireProOrEnterprise_serverLicense_passes() {
        LicenseKeyChecker checker = checkerWithLicense(License.SERVER);
        assertThatCode(() -> checker.requireProOrEnterprise("any.feature=true"))
                .doesNotThrowAnyException();
    }

    @Test
    void requireProOrEnterprise_enterpriseLicense_passes() {
        LicenseKeyChecker checker = checkerWithLicense(License.ENTERPRISE);
        assertThatCode(() -> checker.requireProOrEnterprise("any.feature=true"))
                .doesNotThrowAnyException();
    }

    private LicenseKeyChecker checkerWithLicense(License license) {
        ApplicationProperties properties = new ApplicationProperties();
        if (license == License.NORMAL) {
            properties.getPremium().setEnabled(false);
        } else {
            properties.getPremium().setEnabled(true);
            properties.getPremium().setKey("any");
            when(verifier.verifyLicense("any")).thenReturn(license);
        }
        LicenseKeyChecker checker =
                new LicenseKeyChecker(verifier, properties, userLicenseSettingsService);
        checker.init();
        return checker;
    }
}
