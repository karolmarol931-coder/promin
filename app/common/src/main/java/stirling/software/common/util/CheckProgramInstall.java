package stirling.software.common.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import stirling.software.common.util.ProcessExecutor.ProcessExecutorResult;

public class CheckProgramInstall {

    private static final List<String> PYTHON_COMMANDS = Arrays.asList("python3", "python");
    private static boolean pythonAvailableChecked = false;
    private static String availablePythonCommand = null;
    private static boolean ffmpegAvailableChecked = false;
    private static boolean ffmpegAvailable = false;

    /**
     * Checks which Python command is available and returns it.
     *
     * @return The available Python command ("python3" or "python"), or null if neither is
     *     available.
     */
    public static String getAvailablePythonCommand() {
        if (!pythonAvailableChecked) {
            availablePythonCommand =
                    PYTHON_COMMANDS.stream()
                            .filter(CheckProgramInstall::checkPythonVersion)
                            .findFirst()
                            .orElse(null);
            pythonAvailableChecked = true;
        }
        return availablePythonCommand;
    }

    /**
     * Checks if the specified command is available by running the command with --version.
     *
     * @param pythonCommand The Python command to check.
     * @return true if the command is available, false otherwise.
     */
    private static boolean checkPythonVersion(String pythonCommand) {
        // Apple's Python launcher opens a system install prompt when a desktop app probes it.
        if (isApplePythonLauncher(pythonCommand)) {
            return false;
        }
        try {
            ProcessExecutorResult result =
                    ProcessExecutor.getInstance(ProcessExecutor.Processes.PYTHON_OPENCV)
                            .runCommandWithOutputHandling(
                                    Arrays.asList(pythonCommand, "--version"));
            return result.getRc() == 0 && result.getMessages().contains("Python");
        } catch (IOException | InterruptedException e) {
            return false; // Command failed, Python is not available
        }
    }

    private static boolean isApplePythonLauncher(String pythonCommand) {
        if (!"true".equalsIgnoreCase(System.getProperty("STIRLING_PDF_TAURI_MODE"))
                || !System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("mac")) {
            return false;
        }

        String path = System.getenv("PATH");
        if (path == null) {
            return false;
        }

        for (String directory :
                path.split(java.util.regex.Pattern.quote(java.io.File.pathSeparator))) {
            if (directory.isBlank()) {
                continue;
            }
            Path executable = Path.of(directory, pythonCommand);
            if (!Files.isExecutable(executable) || Files.isDirectory(executable)) {
                continue;
            }
            try {
                Path resolved = executable.toRealPath();
                return isApplePythonPath(executable) || isApplePythonPath(resolved);
            } catch (IOException ignored) {
                return false;
            }
        }
        return false;
    }

    static boolean isApplePythonPath(Path path) {
        Path normalized = path.toAbsolutePath().normalize();
        return normalized.equals(Path.of("/usr/bin/python3"))
                || normalized.equals(Path.of("/usr/bin/python"));
    }

    /**
     * Checks if any Python command is available.
     *
     * @return true if any Python command is available, false otherwise.
     */
    public static boolean isPythonAvailable() {
        return getAvailablePythonCommand() != null;
    }

    /**
     * Checks if FFmpeg is available on the system.
     *
     * @return true if FFmpeg is installed and accessible, false otherwise.
     */
    public static boolean isFfmpegAvailable() {
        if (!ffmpegAvailableChecked) {
            try {
                ProcessExecutorResult result =
                        ProcessExecutor.getInstance(ProcessExecutor.Processes.FFMPEG)
                                .runCommandWithOutputHandling(Arrays.asList("ffmpeg", "-version"));
                ffmpegAvailable = true;
            } catch (IOException | InterruptedException e) {
                ffmpegAvailable = false;
            } finally {
                ffmpegAvailableChecked = true;
            }
        }
        return ffmpegAvailable;
    }
}
