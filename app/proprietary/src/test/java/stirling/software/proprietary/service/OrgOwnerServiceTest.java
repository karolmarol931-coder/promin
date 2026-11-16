package stirling.software.proprietary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import stirling.software.common.model.enumeration.Role;
import stirling.software.proprietary.security.database.repository.UserRepository;
import stirling.software.proprietary.security.model.Authority;
import stirling.software.proprietary.security.model.User;
import stirling.software.proprietary.security.repository.OrgOwnerRepository;
import stirling.software.proprietary.security.service.DatabaseServiceInterface;

@DataJpaTest(properties = "spring.jpa.show-sql=false")
@Import(OrgOwnerService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class OrgOwnerServiceTest {

    @Autowired private OrgOwnerService owners;
    @Autowired private OrgOwnerRepository ownerRepository;
    @Autowired private UserRepository users;
    @Autowired private PlatformTransactionManager transactions;

    @BeforeEach
    void clear() {
        new TransactionTemplate(transactions)
                .executeWithoutResult(
                        status -> {
                            ownerRepository.deleteAll();
                            users.deleteAll();
                        });
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    private User user(String name, String role, boolean firstLogin, boolean enabled) {
        User user = new User();
        user.setUsername(name);
        user.setEnabled(enabled);
        user.setFirstLogin(firstLogin);
        user.addAuthority(new Authority(role, user));
        return users.saveAndFlush(user);
    }

    private UsernamePasswordAuthenticationToken auth(User user) {
        return new UsernamePasswordAuthenticationToken(
                user.getUsername(), "", user.getAuthorities());
    }

    @Test
    void readsNeverElectAndReconcilePrefersActivatedAdmin() {
        user("bootstrap", Role.ADMIN.getRoleId(), true, true);
        user("disabled", Role.ADMIN.getRoleId(), false, false);
        User human = user("human", Role.ADMIN.getRoleId(), false, true);

        assertTrue(owners.ownerId().isEmpty());
        assertEquals(0, ownerRepository.count());
        owners.resolveOwner();
        assertEquals(Optional.of(human.getId()), owners.ownerId());
        owners.resolveOwner();
        assertEquals(1, ownerRepository.count());
    }

    @Test
    void transferPromotesTargetAndProtectsOnlyNewOwner() {
        User first = user("first", Role.ADMIN.getRoleId(), false, true);
        User second = user("second", Role.USER.getRoleId(), false, true);
        owners.resolveOwner();

        assertThrows(ResponseStatusException.class, () -> owners.protect(first.getId(), false));
        owners.transfer(second.getId(), auth(first));

        assertEquals(Optional.of(second.getId()), owners.ownerId());
        assertEquals(
                Role.ADMIN.getRoleId(),
                users.findById(second.getId()).orElseThrow().getRolesAsString());
        assertEquals(
                Role.ADMIN.getRoleId(),
                users.findById(first.getId()).orElseThrow().getRolesAsString());
        owners.protect(first.getId(), false);
        assertThrows(ResponseStatusException.class, () -> owners.protect(second.getId(), false));
    }

    @Test
    void renamePreservesOwnerAndRestoreMismatchReconciles() {
        User first = user("first", Role.ADMIN.getRoleId(), false, true);
        User second = user("second", Role.ADMIN.getRoleId(), false, true);
        owners.resolveOwner();
        owners.transfer(second.getId(), auth(first));
        new TransactionTemplate(transactions)
                .executeWithoutResult(
                        status -> {
                            owners.renamed(second.getId(), "renamed");
                            users.findById(second.getId()).orElseThrow().setUsername("renamed");
                        });

        assertEquals(Optional.of(second.getId()), owners.ownerId());
        new TransactionTemplate(transactions)
                .executeWithoutResult(
                        status ->
                                users.findById(second.getId())
                                        .orElseThrow()
                                        .setUsername("restored-other-person"));
        assertTrue(owners.ownerId().isEmpty());
        owners.resolveOwner();
        assertEquals(Optional.of(first.getId()), owners.ownerId());
    }

    @Test
    void refusesInvalidTargetsAndStaleCaller() {
        User first = user("first", Role.ADMIN.getRoleId(), false, true);
        User pending = user("pending", Role.USER.getRoleId(), true, true);
        User disabled = user("disabled", Role.USER.getRoleId(), false, false);
        User internal = user("internal", Role.INTERNAL_API_USER.getRoleId(), false, true);
        owners.resolveOwner();

        for (User target : java.util.List.of(first, pending, disabled, internal)) {
            assertThrows(
                    ResponseStatusException.class,
                    () -> owners.transfer(target.getId(), auth(first)));
        }
        assertThrows(
                ResponseStatusException.class, () -> owners.transfer(first.getId(), auth(pending)));
        assertEquals(Optional.of(first.getId()), owners.ownerId());
    }

    @SpringBootConfiguration
    @EntityScan(
            basePackages = {
                "stirling.software.proprietary.security.model",
                "stirling.software.proprietary.model"
            })
    @EnableJpaRepositories(
            basePackages = {
                "stirling.software.proprietary.security.database.repository",
                "stirling.software.proprietary.security.repository"
            })
    static class TestApp {
        @Bean
        AuditService auditService() {
            return mock(AuditService.class);
        }

        @Bean
        DatabaseServiceInterface databaseService() {
            return mock(DatabaseServiceInterface.class);
        }
    }
}
