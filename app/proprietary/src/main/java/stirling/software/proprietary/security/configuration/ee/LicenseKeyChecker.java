package stirling.software.proprietary.security.configuration.ee;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

import lombok.extern.slf4j.Slf4j;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.common.util.GeneralUtils;
import stirling.software.proprietary.security.configuration.ee.KeygenLicenseVerifier.License;
import stirling.software.proprietary.service.UserLicenseSettingsService;

@Slf4j
@Component
public class LicenseKeyChecker {

    private static final String FILE_PREFIX = "file:";

    private final KeygenLicenseVerifier licenseService;

    private final ApplicationProperties applicationProperties;

    private final UserLicenseSettingsService licenseSettingsService;

    // Licence refreshes and request threads share these snapshots.
    private volatile License premiumEnabledResult = License.NORMAL;

    /** The verified tier from the installed license key. */
    private volatile License licenseKeyResult = License.NORMAL;

    public LicenseKeyChecker(
            KeygenLicenseVerifier licenseService,
            ApplicationProperties applicationProperties,
            @Lazy UserLicenseSettingsService licenseSettingsService) {
        this.licenseService = licenseService;
        this.applicationProperties = applicationProperties;
        this.licenseSettingsService = licenseSettingsService;
    }

    @PostConstruct
    public void init() {
        evaluateLicense();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        synchronizeLicenseSettings();
    }

    @Scheduled(initialDelay = 604800000, fixedRate = 604800000) // 7 days in milliseconds
    public void checkLicensePeriodically() {
        try {
            evaluateLicense();
        } catch (RuntimeException e) {
            log.error(
                    "Periodic license check failed after all retries: {}. Keeping existing license"
                            + " status.",
                    e.getMessage());
        }
        synchronizeLicenseSettings();
    }

    private void evaluateLicense() {
        licenseKeyResult = verifyLicenseKey();
        premiumEnabledResult = licenseKeyResult;
    }

    private License verifyLicenseKey() {
        if (!applicationProperties.getPremium().isEnabled()) {
            return License.NORMAL;
        }
        String licenseKey = getLicenseKeyContent(applicationProperties.getPremium().getKey());
        if (licenseKey == null) {
            log.error("Failed to obtain license key content.");
            return License.NORMAL;
        }
        License verified = licenseService.verifyLicense(licenseKey);
        if (License.ENTERPRISE == verified) {
            log.info("License key is Enterprise.");
        } else if (License.SERVER == verified) {
            log.info("License key is Server.");
        } else {
            log.info("License key is invalid, defaulting to non pro license.");
        }
        return verified;
    }

    private void synchronizeLicenseSettings() {
        licenseSettingsService.updateLicenseMaxUsers();
    }

    private String getLicenseKeyContent(String keyOrFilePath) {
        if (keyOrFilePath == null || keyOrFilePath.trim().isEmpty()) {
            log.error("License key is not specified");
            return null;
        }

        // Check if it's a file reference
        if (keyOrFilePath.startsWith(FILE_PREFIX)) {
            String filePath = keyOrFilePath.substring(FILE_PREFIX.length());
            try {
                Path path = Path.of(filePath);
                if (!Files.exists(path)) {
                    log.error("License file does not exist: {}", filePath);
                    return null;
                }
                log.info("Reading license from file: {}", filePath);
                return Files.readString(path);
            } catch (IOException e) {
                log.error("Failed to read license file: {}", e.getMessage());
                return null;
            }
        }

        // It's a direct license key
        return keyOrFilePath;
    }

    public void updateLicenseKey(String newKey) throws IOException {
        applicationProperties.getPremium().setKey(newKey);
        GeneralUtils.saveKeyToSettings("premium.key", newKey);
        evaluateLicense();
        synchronizeLicenseSettings();
    }

    /** Rechecks the installed license key. */
    public void resyncLicense() {
        evaluateLicense();
        synchronizeLicenseSettings();
    }

    public License premiumTier() {
        return premiumEnabledResult;
    }

    public License getPremiumLicenseEnabledResult() {
        return premiumEnabledResult;
    }

    /** Effective admission limit enforced on this instance. */
    public int maxAllowedUsers() {
        return licenseSettingsService.calculateMaxAllowedUsers();
    }

    /** Installed-key tier only; use it for seat arithmetic, not feature gates. */
    public License getLicenseKeyResult() {
        return licenseKeyResult;
    }

    /** Validates paid startup configuration. */
    public void requireProOrEnterprise(String configuredAs) {
        License tier = premiumTier();
        if (tier != License.SERVER && tier != License.ENTERPRISE) {
            throw new IllegalStateException(configuredAs + " requires a Pro or Enterprise license");
        }
    }
}
