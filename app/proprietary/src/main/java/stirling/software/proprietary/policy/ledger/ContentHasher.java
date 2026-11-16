package stirling.software.proprietary.policy.ledger;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class ContentHasher {

    private static final String ALGORITHM = "SHA-256";
    private static final int BUFFER_SIZE = 64 * 1024;

    private ContentHasher() {}

    public static String sha256(Path file) throws IOException {
        MessageDigest digest = newDigest();
        try (InputStream raw = Files.newInputStream(file);
                DigestInputStream in = new DigestInputStream(raw, digest)) {
            byte[] buf = new byte[BUFFER_SIZE];
            while (in.read(buf) != -1) {}
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    public static String sha256(byte[] bytes) {
        return HexFormat.of().formatHex(newDigest().digest(bytes));
    }

    public static MessageDigest newSha256() {
        return newDigest();
    }

    public static String toHex(byte[] digest) {
        return HexFormat.of().formatHex(digest);
    }

    private static MessageDigest newDigest() {
        try {
            return MessageDigest.getInstance(ALGORITHM);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(ALGORITHM + " unavailable", e);
        }
    }
}
