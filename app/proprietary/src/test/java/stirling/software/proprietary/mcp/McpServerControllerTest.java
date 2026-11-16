package stirling.software.proprietary.mcp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.proprietary.mcp.catalog.McpToolCatalog;
import stirling.software.proprietary.mcp.tools.DescribeOperationTool;
import stirling.software.proprietary.mcp.tools.McpOperationExecutor;
import stirling.software.proprietary.mcp.tools.StirlingAiTool;
import stirling.software.proprietary.mcp.tools.StirlingConvertTool;
import stirling.software.proprietary.mcp.tools.StirlingMiscTool;
import stirling.software.proprietary.mcp.tools.StirlingPagesTool;
import stirling.software.proprietary.mcp.tools.StirlingSecurityTool;
import stirling.software.proprietary.service.AiEngineClient;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class McpServerControllerTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final McpServerController controller = buildController();

    @SuppressWarnings("unchecked")
    private McpServerController buildController() {
        ObjectProvider<McpToolCatalog> catalog = mock(ObjectProvider.class);
        ObjectProvider<McpOperationExecutor> executor = mock(ObjectProvider.class);
        ObjectProvider<AiEngineClient> engine = mock(ObjectProvider.class);
        List<McpTool> tools =
                List.of(
                        new DescribeOperationTool(mapper, catalog),
                        new StirlingConvertTool(mapper, catalog, executor),
                        new StirlingPagesTool(mapper, catalog, executor),
                        new StirlingMiscTool(mapper, catalog, executor),
                        new StirlingSecurityTool(mapper, catalog, executor),
                        new StirlingAiTool(mapper, catalog, engine));
        return new McpServerController(mapper, new ApplicationProperties(), tools);
    }

    @Test
    void toolsListReturnsSixTools() {
        JsonNode body = handle("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}");

        assertEquals(6, body.get("result").get("tools").size());
    }

    @Test
    void initializeReturnsServerInfoAndProtocolVersion() {
        JsonNode body =
                handle(
                        "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\","
                                + "\"params\":{\"protocolVersion\":\"2025-03-26\"}}");

        assertEquals("2025-03-26", body.get("result").get("protocolVersion").asText());
        assertEquals("Promin", body.get("result").get("serverInfo").get("title").asText());
    }

    @Test
    void pingReturnsAnEmptyResult() {
        JsonNode body = handle("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"ping\"}");

        assertNotNull(body.get("result"));
        assertEquals(0, body.get("result").size());
    }

    @Test
    void notificationsReturnNoContent() {
        ResponseEntity<?> response =
                controller.handle(
                        read("{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}"));

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
    }

    @Test
    void malformedJsonRpcShapeReturnsBadRequest() {
        ResponseEntity<?> response = controller.handle(read("{}"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    private JsonNode handle(String json) {
        return mapper.valueToTree(controller.handle(read(json)).getBody());
    }

    private JsonNode read(String json) {
        return mapper.readTree(json);
    }
}
