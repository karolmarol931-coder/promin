package stirling.software.SPDF;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableScheduling;

import jakarta.annotation.PostConstruct;

import lombok.extern.slf4j.Slf4j;

import stirling.software.common.configuration.AppConfig;
import stirling.software.common.configuration.ConfigInitializer;
import stirling.software.common.configuration.InstallationPathConfig;

@Slf4j
@EnableScheduling
@SpringBootApplication(
        scanBasePackages = {
            "stirling.software.SPDF",
            "stirling.software.common",
            "stirling.software.proprietary"
        })
public class SPDFApplication {

    private static String serverPortStatic;

    private final AppConfig appConfig;

    public SPDFApplication(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    public static void main(String[] args) throws IOException, InterruptedException {
        SpringApplication app = new SpringApplication(SPDFApplication.class);

        Properties props = new Properties();

        app.setAdditionalProfiles(getActiveProfile(args));

        ConfigInitializer initializer = new ConfigInitializer();
        try {
            initializer.ensureConfigExists();
        } catch (IOException | URISyntaxException e) {
            log.error("Error initialising configuration", e);
        }
        Map<String, String> propertyFiles = new HashMap<>();

        // External config files
        Path settingsPath = Path.of(InstallationPathConfig.getSettingsPath());
        log.info("Settings file: {}", settingsPath.toString());
        if (Files.exists(settingsPath)) {
            propertyFiles.put(
                    "spring.config.additional-location", "file:" + settingsPath.toString());
        } else {
            log.warn("External configuration file '{}' does not exist.", settingsPath.toString());
        }

        Path customSettingsPath = Path.of(InstallationPathConfig.getCustomSettingsPath());
        log.info("Custom settings file: {}", customSettingsPath.toString());
        if (Files.exists(customSettingsPath)) {
            String existingLocation =
                    propertyFiles.getOrDefault("spring.config.additional-location", "");
            if (!existingLocation.isEmpty()) {
                existingLocation += ",";
            }
            propertyFiles.put(
                    "spring.config.additional-location",
                    existingLocation + "file:" + customSettingsPath.toString());
        } else {
            log.warn(
                    "Custom configuration file '{}' does not exist.",
                    customSettingsPath.toString());
        }
        Properties finalProps = new Properties();

        if (!propertyFiles.isEmpty()) {
            finalProps.putAll(
                    Collections.singletonMap(
                            "spring.config.additional-location",
                            propertyFiles.get("spring.config.additional-location")));
        }

        if (!props.isEmpty()) {
            finalProps.putAll(props);
        }
        app.setDefaultProperties(finalProps);

        app.run(args);

        // Ensure directories are created
        try {
            Files.createDirectories(Path.of(InstallationPathConfig.getTemplatesPath()));
            Files.createDirectories(Path.of(InstallationPathConfig.getStaticPath()));
        } catch (IOException e) {
            log.error("Error creating directories: {}", e.getMessage());
        }
    }

    @PostConstruct
    public void init() {
        String serverPort = appConfig.getServerPort();
        serverPortStatic = serverPort;

        // Log Tauri mode information
        if (Boolean.parseBoolean(System.getProperty("STIRLING_PDF_TAURI_MODE", "false"))) {
            String parentPid = System.getenv("TAURI_PARENT_PID");
            log.info(
                    "Running in Tauri mode. Parent process PID: {}",
                    parentPid != null ? parentPid : "not set");
        }
    }

    public static void setServerPortStatic(String port) {
        if ("auto".equalsIgnoreCase(port)) {
            // Use Spring Boot's automatic port assignment (server.port=0)
            SPDFApplication.serverPortStatic =
                    "0"; // This will let Spring Boot assign an available port
        } else {
            SPDFApplication.serverPortStatic = port;
        }
    }

    @EventListener
    public void onApplicationReady(ApplicationReadyEvent event) {
        String port =
                event.getApplicationContext().getEnvironment().getProperty("local.server.port");
        if (port != null) {
            serverPortStatic = port;
        }
        // Log the actual runtime port for Tauri to parse
        log.info("Promin running on port: {}", serverPortStatic);
    }

    private static String[] getActiveProfile(String[] args) {
        // 1. Check for explicitly passed profiles
        if (args != null) {
            for (String arg : args) {
                if (arg.startsWith("--spring.profiles.active=")) {
                    String[] provided = arg.substring(arg.indexOf('=') + 1).split(",");
                    if (provided.length > 0) {
                        return provided;
                    }
                }
            }
        }

        // 2. Detect classpath shape and pick the matching profile chain.
        boolean hasSecurity =
                isClassPresent(
                        "stirling.software.proprietary.security.configuration.SecurityConfiguration");

        if (hasSecurity) {
            log.info("Additional features in jar");
            return new String[] {"security"};
        }
        log.info("Without additional features in jar");
        return new String[] {"default"};
    }

    private static boolean isClassPresent(String className) {
        try {
            Class.forName(className, false, SPDFApplication.class.getClassLoader());
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }

    public static String getStaticPort() {
        return serverPortStatic;
    }
}
