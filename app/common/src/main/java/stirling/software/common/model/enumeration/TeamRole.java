package stirling.software.common.model.enumeration;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Team membership roles: leaders manage membership and settings; members have standard access. */
@Getter
@RequiredArgsConstructor
public enum TeamRole {
    LEADER("LEADER"),
    MEMBER("MEMBER");

    private final String roleName;

    public static TeamRole fromString(String roleName) {
        for (TeamRole role : TeamRole.values()) {
            if (role.getRoleName().equalsIgnoreCase(roleName)) {
                return role;
            }
        }
        throw new IllegalArgumentException("No TeamRole defined for name: " + roleName);
    }
}
