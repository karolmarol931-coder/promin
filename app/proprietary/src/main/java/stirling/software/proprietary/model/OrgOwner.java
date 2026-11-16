package stirling.software.proprietary.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

/** Local deployment ownership used to protect the initial administrator account. */
@Entity
@Table(name = "org_owner")
@Getter
@Setter
public class OrgOwner {
    public static final Long SINGLETON_ID = 1L;
    @Id private Long id = SINGLETON_ID;
    private Long ownerUserId;
    private String ownerUsername;
    private LocalDateTime assignedAt;
    private String assignedReason;
}
