package stirling.software.proprietary.security.controller.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.common.model.api.security.UserSummaryDTO;
import stirling.software.proprietary.model.Team;
import stirling.software.proprietary.security.database.repository.UserRepository;
import stirling.software.proprietary.security.model.User;
import stirling.software.proprietary.security.model.api.user.UsernameAndPass;
import stirling.software.proprietary.security.repository.TeamRepository;
import stirling.software.proprietary.security.service.EmailService;
import stirling.software.proprietary.security.service.LoginAttemptService;
import stirling.software.proprietary.security.service.TeamMembershipService;
import stirling.software.proprietary.security.service.TeamService;
import stirling.software.proprietary.security.service.UserService;
import stirling.software.proprietary.security.session.SessionPersistentRegistry;
import stirling.software.proprietary.service.UserLicenseSettingsService;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Mock private UserService userService;
    @Mock private SessionPersistentRegistry sessionRegistry;
    @Mock private TeamRepository teamRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmailService emailService;
    @Mock private UserLicenseSettingsService licenseSettingsService;
    @Mock private LoginAttemptService loginAttemptService;
    @Mock private TeamMembershipService teamMembershipService;

    private ApplicationProperties applicationProperties;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        applicationProperties = new ApplicationProperties();
        applicationProperties.getPremium().setMaxUsers(10);
        applicationProperties.getMail().setEnabled(true);

        UserController controller =
                new UserController(
                        userService,
                        sessionRegistry,
                        applicationProperties,
                        teamRepository,
                        userRepository,
                        Optional.of(emailService),
                        licenseSettingsService,
                        loginAttemptService,
                        teamMembershipService,
                        org.mockito.Mockito.mock(
                                stirling.software.proprietary.service.OrgOwnerService.class));
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void registerRejectsExistingUser() throws Exception {
        UsernameAndPass payload = new UsernameAndPass();
        payload.setUsername("existing@example.com");
        payload.setPassword("pw");
        when(userService.usernameExistsIgnoreCase("existing@example.com")).thenReturn(true);

        mockMvc.perform(
                        post("/api/v1/user/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("User already exists"));

        verify(userService, never()).saveUserCore(any());
    }

    @Test
    void registerCreatesUserWhenValid() throws Exception {
        UsernameAndPass payload = new UsernameAndPass();
        payload.setUsername("new@example.com");
        payload.setPassword("pw");
        Team defaultTeam = new Team();
        defaultTeam.setName(TeamService.DEFAULT_TEAM_NAME);

        when(userService.usernameExistsIgnoreCase("new@example.com")).thenReturn(false);
        when(userService.isUsernameValid("new@example.com")).thenReturn(true);
        when(licenseSettingsService.wouldExceedLimit(1)).thenReturn(false);
        when(teamRepository.findFirstByNameOrderByIdAsc(TeamService.DEFAULT_TEAM_NAME))
                .thenReturn(Optional.of(defaultTeam));

        User savedUser = new User();
        savedUser.setUsername("new@example.com");
        savedUser.setEnabled(false);
        when(userService.saveUserCore(any())).thenReturn(savedUser);

        mockMvc.perform(
                        post("/api/v1/user/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.username").value("new@example.com"));
    }

    @Test
    void changeUserEnabledPreventsSelfDisable() throws Exception {
        User user = new User();
        user.setUsername("admin");
        when(userService.usernameExistsIgnoreCase("admin")).thenReturn(true);
        when(userService.findByUsernameIgnoreCase("admin")).thenReturn(Optional.of(user));
        Authentication authentication = new UsernamePasswordAuthenticationToken("admin", "pw");

        mockMvc.perform(
                        post("/api/v1/user/admin/changeUserEnabled/admin")
                                .param("enabled", "false")
                                .principal(authentication))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Cannot disable your own account."));
    }

    @Test
    void changePasswordRejectsMissingUser() throws Exception {
        Authentication authentication = new UsernamePasswordAuthenticationToken("ghost", "pw");
        when(userService.usernameExistsIgnoreCase("ghost")).thenReturn(false);

        mockMvc.perform(post("/api/v1/user/admin/deleteUser/ghost").principal(authentication))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("User not found."));
    }

    @Test
    void unlockUserCallsResetAttemptsAndReturnsOk() throws Exception {
        mockMvc.perform(post("/api/v1/user/admin/unlockUser/lockeduser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User account unlocked successfully"));

        verify(loginAttemptService).resetAttempts("lockeduser");
    }

    @Test
    void changeUsernameRejectsCaseVariantOfAnotherAccount() throws Exception {
        User caller = user(1L, "bob", true, null);
        when(userService.isUsernameValid("stirling-pdf-backend-api-user")).thenReturn(true);
        when(userService.findByUsername("bob")).thenReturn(Optional.of(caller));
        when(userService.isPasswordCorrect(caller, "pw")).thenReturn(true);
        when(userService.isUsernameTakenByOtherUser("stirling-pdf-backend-api-user", 1L))
                .thenReturn(true);

        mockMvc.perform(
                        post("/api/v1/user/change-username")
                                .principal(auth("bob"))
                                .param("currentPasswordChangeUsername", "pw")
                                .param("newUsername", "stirling-pdf-backend-api-user"))
                .andExpect(status().isConflict());

        verify(userService, never()).changeUsername(any(), any());
    }

    @Test
    void changeUsernameAllowsChangingCaseOfOwnName() throws Exception {
        User caller = user(1L, "bob", true, null);
        when(userService.isUsernameValid("Bob")).thenReturn(true);
        when(userService.findByUsername("bob")).thenReturn(Optional.of(caller));
        when(userService.isPasswordCorrect(caller, "pw")).thenReturn(true);
        when(userService.isUsernameTakenByOtherUser("Bob", 1L)).thenReturn(false);

        mockMvc.perform(
                        post("/api/v1/user/change-username")
                                .principal(auth("bob"))
                                .param("currentPasswordChangeUsername", "pw")
                                .param("newUsername", "Bob"))
                .andExpect(status().isOk());

        verify(userService).changeUsername(caller, "Bob");
    }

    private static User user(long id, String username, boolean enabled, Team team) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        u.setEnabled(enabled);
        u.setTeam(team);
        return u;
    }

    private static Team team(long id, String name) {
        Team t = new Team();
        t.setId(id);
        t.setName(name);
        return t;
    }

    private static Authentication auth(String username) {
        return new UsernamePasswordAuthenticationToken(username, "pw");
    }

    private static UserSummaryDTO summary(long id, String username, String teamName) {
        return new UserSummaryDTO(id, username, username, teamName, true);
    }

    @Test
    void listUsersReturnsInstallationWideSigningRecipients() throws Exception {
        Team alpha = team(1L, "alpha");
        when(userService.findByUsernameIgnoreCase("a@alpha.com"))
                .thenReturn(Optional.of(user(1L, "a@alpha.com", true, alpha)));
        when(userRepository.findEnabledSigningUsers())
                .thenReturn(
                        List.of(
                                summary(1L, "a@alpha.com", "alpha"),
                                summary(2L, "b@beta.com", "beta")));

        mockMvc.perform(get("/api/v1/user/users").principal(auth("a@alpha.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].username").value("a@alpha.com"))
                .andExpect(jsonPath("$[1].username").value("b@beta.com"));

        verify(userRepository, never()).findEnabledSigningUsersByTeamId(any());
    }

    @Test
    void listUsersMissingCallerReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/v1/user/users").principal(auth("missing")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        verify(userRepository, never()).findEnabledSigningUsers();
        verify(userRepository, never()).findEnabledSigningUsersByTeamId(any());
    }

    @Test
    void listUsersDisabledCallerCannotEnumerateUsers() throws Exception {
        when(userService.findByUsernameIgnoreCase("disabled"))
                .thenReturn(Optional.of(user(1L, "disabled", false, null)));

        mockMvc.perform(get("/api/v1/user/users").principal(auth("disabled")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        verify(userRepository, never()).findEnabledSigningUsers();
        verify(userRepository, never()).findEnabledSigningUsersByTeamId(any());
    }

    @Test
    void listUsersRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/user/users")).andExpect(status().isUnauthorized());

        verify(userRepository, never()).findEnabledSigningUsers();
        verify(userRepository, never()).findEnabledSigningUsersByTeamId(any());
    }
}
