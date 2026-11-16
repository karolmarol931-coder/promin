package stirling.software.proprietary.mcp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import stirling.software.proprietary.mcp.security.McpSecurityConfig;
import stirling.software.proprietary.mcp.tools.DescribeOperationTool;
import stirling.software.proprietary.mcp.tools.StirlingAiTool;
import stirling.software.proprietary.mcp.tools.StirlingConvertTool;
import stirling.software.proprietary.mcp.tools.StirlingMiscTool;
import stirling.software.proprietary.mcp.tools.StirlingPagesTool;
import stirling.software.proprietary.mcp.tools.StirlingSecurityTool;

/** Verifies MCP beans are gated behind {@code @ConditionalOnProperty(name="mcp.enabled")}. */
class McpConditionalTest {

    @Test
    void serverController_isGatedByMcpEnabled() {
        assertGatedByEnabled(McpServerController.class);
    }

    @Test
    void securityConfig_isGatedByMcpEnabled() {
        assertGatedByEnabled(McpSecurityConfig.class);
    }

    @Test
    void categoryToolsAndDescribeOperation_doNotNeedOwnGate() {
        // The tool beans are only wired into the gated controller; sanity-check their signatures.
        Class<?>[] tools = {
            DescribeOperationTool.class,
            StirlingConvertTool.class,
            StirlingPagesTool.class,
            StirlingMiscTool.class,
            StirlingSecurityTool.class,
            StirlingAiTool.class
        };
        for (Class<?> t : tools) {
            assertTrue(
                    McpTool.class.isAssignableFrom(t),
                    t.getSimpleName() + " must implement McpTool");
            assertNotNull(
                    t.getAnnotation(org.springframework.stereotype.Component.class),
                    t.getSimpleName() + " must be @Component");
        }
    }

    private static void assertGatedByEnabled(Class<?> beanClass) {
        ConditionalOnProperty conditional = beanClass.getAnnotation(ConditionalOnProperty.class);
        assertNotNull(conditional, beanClass.getSimpleName() + " missing @ConditionalOnProperty");
        assertTrue(
                Arrays.asList(conditional.name()).contains("mcp.enabled")
                        || Arrays.asList(conditional.value()).contains("mcp.enabled"),
                beanClass.getSimpleName() + " must gate on mcp.enabled");
        assertEquals(
                "true",
                conditional.havingValue(),
                beanClass.getSimpleName() + " must require mcp.enabled=true");
    }
}
