package com.sellbit.domain.player;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.player.PlayerDTOs.CommandRequest;
import com.sellbit.domain.player.PlayerDTOs.DefaultItem;
import com.sellbit.domain.player.PlayerDTOs.Party;
import com.sellbit.domain.player.PlayerDTOs.PartyFile;
import com.sellbit.domain.player.PlayerDTOs.Program;
import com.sellbit.domain.player.PlayerDTOs.SaveResult;
import com.sun.net.httpserver.HttpServer;

class PlayerServiceTest {

    @TempDir
    Path tempDir;

    private final ObjectMapper mapper = new ObjectMapper();

    private HttpServer agent;
    private final List<String> requests = new CopyOnWriteArrayList<>();
    private volatile int commandStatus = 200;
    private volatile String commandBody = "{\"ok\":true,\"message\":\"ok\"}";
    private volatile int syncStatus = 202;
    private volatile int statusStatus = 200;

    private PlayerService service;

    @BeforeEach
    void setUp() throws IOException {
        agent = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        agent.createContext("/command", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            requests.add("POST /command " + body);
            reply(exchange, commandStatus, commandBody);
        });
        agent.createContext("/sync", exchange -> {
            requests.add("POST /sync");
            reply(exchange, syncStatus, "{\"started\":true}");
        });
        agent.createContext("/status", exchange -> {
            requests.add("GET /status");
            reply(exchange, statusStatus, "{\"target\":\"default\",\"playing\":\"a.mp4\"}");
        });
        agent.start();

        service = new PlayerService(tempDir.toString(), "http://127.0.0.1:" + agent.getAddress().getPort(), mapper);
    }

    @AfterEach
    void tearDown() {
        agent.stop(0);
    }

    private static void reply(com.sun.net.httpserver.HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private PlayerService offlineService() {
        return new PlayerService(tempDir.toString(), "http://127.0.0.1:1", mapper, 1, 0);
    }

    private Program validProgram() {
        return new Program(
                "09:00", "20:00", "stop.jpg",
                List.of(new DefaultItem("uuid1__a.mp4", List.of(1, 2, 3), 1, null),
                        new DefaultItem("uuid2__b.jpg", List.of(1), 2, 10)),
                List.of(new Party("2026-12-05", "15:00", 150,
                        List.of(new PartyFile("uuid3__p1.mp4", 1, null),
                                new PartyFile("uuid4__p2.png", 2, 8)))));
    }

    private Program withDefault(DefaultItem item) {
        return new Program("09:00", "20:00", null, List.of(item), List.of());
    }

    private Program withParty(Party party) {
        return new Program("09:00", "20:00", null, List.of(), List.of(party));
    }

    private String errorOf(Runnable action) {
        return assertThrows(RuntimeException.class, action::run).getMessage();
    }

    // ------------------------------------------------------------ folder

    @Test
    @DisplayName("constructor - creeaza folderul player")
    void constructor_CreatesPlayerFolder() {
        assertTrue(Files.isDirectory(tempDir.resolve("player")));
    }

    // ------------------------------------------------------------ getProgram

    @Test
    @DisplayName("getProgram - fara fisier: program gol")
    void getProgram_Missing_ReturnsEmpty() {
        Program program = service.getProgram();

        assertNull(program.open());
        assertNull(program.close());
        assertNull(program.stopImage());
        assertTrue(program.defaultClips().isEmpty());
        assertTrue(program.parties().isEmpty());
    }

    @Test
    @DisplayName("getProgram - citeste ce a scris saveProgram")
    void getProgram_ReadsSaved() {
        service.saveProgram(validProgram());

        Program program = service.getProgram();

        assertEquals("09:00", program.open());
        assertEquals("20:00", program.close());
        assertEquals("stop.jpg", program.stopImage());
        assertEquals(2, program.defaultClips().size());
        assertEquals("uuid2__b.jpg", program.defaultClips().get(1).file());
        assertEquals(10, program.defaultClips().get(1).imageSeconds());
        assertEquals(1, program.parties().size());
        assertEquals(150, program.parties().get(0).durationMinutes());
        assertEquals(8, program.parties().get(0).files().get(1).imageSeconds());
    }

    @Test
    @DisplayName("getProgram - JSON corupt: eroare")
    void getProgram_Corrupt_Throws() throws IOException {
        Files.writeString(tempDir.resolve("player/program.json"), "{ nu e json");

        assertEquals("ERROR.PLAYER.PROGRAM_UNREADABLE", errorOf(() -> service.getProgram()));
    }

    @Test
    @DisplayName("getProgram - ignora campuri necunoscute si completeaza listele lipsa")
    void getProgram_UnknownFieldsAndMissingLists() throws IOException {
        Files.writeString(tempDir.resolve("player/program.json"),
                "{\"open\":\"08:00\",\"close\":\"18:00\",\"altceva\":1}");

        Program program = service.getProgram();

        assertEquals("08:00", program.open());
        assertTrue(program.defaultClips().isEmpty());
        assertTrue(program.parties().isEmpty());
    }

    // ------------------------------------------------------------ saveProgram

    @Test
    @DisplayName("saveProgram - scrie JSON-ul exact cum il asteapta agentul si cheama /sync")
    void saveProgram_WritesAgentFormatAndSyncs() throws IOException {
        SaveResult result = service.saveProgram(validProgram());

        assertTrue(result.synced());
        assertNull(result.message());
        assertTrue(requests.contains("POST /sync"));

        JsonNode json = mapper.readTree(Files.readString(tempDir.resolve("player/program.json")));
        assertEquals("09:00", json.get("open").asText());
        assertEquals("stop.jpg", json.get("stopImage").asText());
        assertTrue(json.has("default"));
        assertFalse(json.has("defaultClips"));
        assertEquals("uuid1__a.mp4", json.get("default").get(0).get("file").asText());
        assertFalse(json.get("default").get(0).has("imageSeconds"));
        assertEquals(10, json.get("default").get(1).get("imageSeconds").asInt());
        assertEquals("2026-12-05", json.get("parties").get(0).get("date").asText());
        assertEquals(150, json.get("parties").get(0).get("durationMinutes").asInt());
        assertEquals("uuid4__p2.png", json.get("parties").get(0).get("files").get(1).get("file").asText());
    }

    @Test
    @DisplayName("saveProgram - nu lasa fisier temporar si suprascrie varianta veche")
    void saveProgram_NoTmpLeftAndOverwrites() throws IOException {
        service.saveProgram(validProgram());
        service.saveProgram(new Program("10:00", "21:00", null, List.of(), List.of()));

        assertFalse(Files.exists(tempDir.resolve("player/.program.json.tmp")));
        JsonNode json = mapper.readTree(Files.readString(tempDir.resolve("player/program.json")));
        assertEquals("10:00", json.get("open").asText());
        assertFalse(json.has("stopImage"));
        assertEquals(0, json.get("default").size());
        assertEquals(0, json.get("parties").size());
    }

    @Test
    @DisplayName("saveProgram - agent offline: programul se salveaza, synced=false")
    void saveProgram_AgentOffline_StillSaves() {
        SaveResult result = offlineService().saveProgram(validProgram());

        assertFalse(result.synced());
        assertEquals("ERROR.PLAYER.OFFLINE", result.message());
        assertTrue(Files.isRegularFile(tempDir.resolve("player/program.json")));
    }

    @Test
    @DisplayName("saveProgram - agentul raspunde cu eroare la /sync: synced=false")
    void saveProgram_AgentSyncError() {
        syncStatus = 500;

        SaveResult result = service.saveProgram(validProgram());

        assertFalse(result.synced());
        assertEquals("ERROR.PLAYER.AGENT_ERROR", result.message());
        assertTrue(Files.isRegularFile(tempDir.resolve("player/program.json")));
    }

    @Test
    @DisplayName("saveProgram - sorteaza si deduplica zilele")
    void saveProgram_NormalizesDays() {
        service.saveProgram(withDefault(new DefaultItem("a.mp4", List.of(5, 1, 5, 3), null, null)));

        assertEquals(List.of(1, 3, 5), service.getProgram().defaultClips().get(0).days());
    }

    @Test
    @DisplayName("saveProgram - lista stopImages se scrie cu secunde si inlocuieste stopImage")
    void saveProgram_StopImagesListWritten() throws Exception {
        service.saveProgram(new Program("09:00", "20:00", "vechi.jpg",
                List.of(new com.sellbit.domain.player.PlayerDTOs.StopItem("a.jpg", 30),
                        new com.sellbit.domain.player.PlayerDTOs.StopItem("b.png", null)),
                List.of(), List.of()));

        JsonNode json = mapper.readTree(Files.readString(tempDir.resolve("player/program.json")));
        assertFalse(json.has("stopImage"));
        assertEquals(2, json.get("stopImages").size());
        assertEquals("a.jpg", json.get("stopImages").get(0).get("file").asText());
        assertEquals(30, json.get("stopImages").get(0).get("imageSeconds").asInt());
        assertFalse(json.get("stopImages").get(1).has("imageSeconds"));
        assertEquals(2, service.getProgram().stopImages().size());
    }

    @Test
    @DisplayName("saveProgram - stopImages respinge nume invalid si secunde <= 0")
    void saveProgram_StopImagesInvalid() {
        assertThrows(RuntimeException.class, () -> service.saveProgram(new Program("09:00", "20:00", null,
                List.of(new com.sellbit.domain.player.PlayerDTOs.StopItem("a/b.jpg", null)), List.of(), List.of())));
        assertThrows(RuntimeException.class, () -> service.saveProgram(new Program("09:00", "20:00", null,
                List.of(new com.sellbit.domain.player.PlayerDTOs.StopItem("a.jpg", 0)), List.of(), List.of())));
    }

    @Test
    @DisplayName("saveProgram - stopImage gol se omite")
    void saveProgram_BlankStopImageOmitted() {
        service.saveProgram(new Program("09:00", "20:00", "  ", List.of(), List.of()));

        assertNull(service.getProgram().stopImage());
    }

    @Test
    @DisplayName("saveProgram - program null")
    void saveProgram_Null() {
        assertEquals("ERROR.PLAYER.PROGRAM_REQUIRED", errorOf(() -> service.saveProgram(null)));
    }

    @Test
    @DisplayName("saveProgram - ore invalide")
    void saveProgram_InvalidTimes() {
        for (String bad : new String[] {null, "", "9:00", "24:00", "12:60", "ab:cd", "09:00:00"}) {
            assertEquals("ERROR.PLAYER.INVALID_TIME",
                    errorOf(() -> service.saveProgram(new Program(bad, "20:00", null, List.of(), List.of()))),
                    "open=" + bad);
            assertEquals("ERROR.PLAYER.INVALID_TIME",
                    errorOf(() -> service.saveProgram(new Program("09:00", bad, null, List.of(), List.of()))),
                    "close=" + bad);
        }
    }

    @Test
    @DisplayName("saveProgram - nume de fisier invalide")
    void saveProgram_InvalidFileNames() {
        for (String bad : new String[] {null, "", "  ", "a/b.mp4", "../x.mp4", ".ascuns.mp4"}) {
            assertEquals("ERROR.PLAYER.INVALID_FILE_NAME",
                    errorOf(() -> service.saveProgram(withDefault(new DefaultItem(bad, List.of(1), null, null)))),
                    "default=" + bad);
            assertEquals("ERROR.PLAYER.INVALID_FILE_NAME",
                    errorOf(() -> service.saveProgram(withParty(
                            new Party("2026-12-05", "15:00", 150, List.of(new PartyFile(bad, null, null)))))),
                    "party=" + bad);
        }
        assertEquals("ERROR.PLAYER.INVALID_FILE_NAME",
                errorOf(() -> service.saveProgram(new Program("09:00", "20:00", "a/b.jpg", List.of(), List.of()))));
    }

    @Test
    @DisplayName("saveProgram - elemente null in liste")
    void saveProgram_NullElements() {
        List<DefaultItem> defaults = new ArrayList<>();
        defaults.add(null);
        assertEquals("ERROR.PLAYER.INVALID_FILE_NAME",
                errorOf(() -> service.saveProgram(new Program("09:00", "20:00", null, defaults, List.of()))));

        List<Party> parties = new ArrayList<>();
        parties.add(null);
        assertEquals("ERROR.PLAYER.INVALID_DATE",
                errorOf(() -> service.saveProgram(new Program("09:00", "20:00", null, List.of(), parties))));

        List<PartyFile> files = new ArrayList<>();
        files.add(null);
        assertEquals("ERROR.PLAYER.INVALID_FILE_NAME",
                errorOf(() -> service.saveProgram(withParty(new Party("2026-12-05", "15:00", 150, files)))));
    }

    @Test
    @DisplayName("saveProgram - zile invalide la clipurile implicite")
    void saveProgram_InvalidDays() {
        List<Integer> withNull = new ArrayList<>();
        withNull.add(null);
        for (List<Integer> bad : java.util.Arrays.asList(null, List.<Integer>of(), List.of(0), List.of(8), List.of(-1), withNull)) {
            assertEquals("ERROR.PLAYER.INVALID_DAYS",
                    errorOf(() -> service.saveProgram(withDefault(new DefaultItem("a.mp4", bad, null, null)))),
                    "days=" + bad);
        }
    }

    @Test
    @DisplayName("saveProgram - imageSeconds trebuie sa fie > 0")
    void saveProgram_InvalidImageSeconds() {
        for (int bad : new int[] {0, -5}) {
            assertEquals("ERROR.PLAYER.INVALID_IMAGE_SECONDS",
                    errorOf(() -> service.saveProgram(withDefault(new DefaultItem("a.jpg", List.of(1), null, bad)))));
            assertEquals("ERROR.PLAYER.INVALID_IMAGE_SECONDS",
                    errorOf(() -> service.saveProgram(withParty(
                            new Party("2026-12-05", "15:00", 150, List.of(new PartyFile("a.jpg", null, bad)))))));
        }
    }

    @Test
    @DisplayName("saveProgram - petrecere: data, ora, durata, fisiere")
    void saveProgram_InvalidParty() {
        List<PartyFile> files = List.of(new PartyFile("a.mp4", 1, null));

        for (String bad : new String[] {null, "", "05-12-2026", "2026-13-01", "2026-02-30"}) {
            assertEquals("ERROR.PLAYER.INVALID_DATE",
                    errorOf(() -> service.saveProgram(withParty(new Party(bad, "15:00", 150, files)))),
                    "date=" + bad);
        }
        assertEquals("ERROR.PLAYER.INVALID_TIME",
                errorOf(() -> service.saveProgram(withParty(new Party("2026-12-05", "25:00", 150, files)))));
        assertEquals("ERROR.PLAYER.INVALID_DURATION",
                errorOf(() -> service.saveProgram(withParty(new Party("2026-12-05", "15:00", null, files)))));
        assertEquals("ERROR.PLAYER.INVALID_DURATION",
                errorOf(() -> service.saveProgram(withParty(new Party("2026-12-05", "15:00", 0, files)))));
        assertEquals("ERROR.PLAYER.INVALID_DURATION",
                errorOf(() -> service.saveProgram(withParty(new Party("2026-12-05", "15:00", -10, files)))));
        assertEquals("ERROR.PLAYER.PARTY_FILES_REQUIRED",
                errorOf(() -> service.saveProgram(withParty(new Party("2026-12-05", "15:00", 150, null)))));
        assertEquals("ERROR.PLAYER.PARTY_FILES_REQUIRED",
                errorOf(() -> service.saveProgram(withParty(new Party("2026-12-05", "15:00", 150, List.of())))));
    }

    @Test
    @DisplayName("saveProgram - program invalid nu atinge fisierul existent si nu cheama /sync")
    void saveProgram_InvalidKeepsOldFile() throws IOException {
        service.saveProgram(validProgram());
        String before = Files.readString(tempDir.resolve("player/program.json"));
        requests.clear();

        assertThrows(RuntimeException.class,
                () -> service.saveProgram(new Program("99:99", "20:00", null, List.of(), List.of())));

        assertEquals(before, Files.readString(tempDir.resolve("player/program.json")));
        assertTrue(requests.isEmpty());
    }

    @Test
    @DisplayName("saveProgram - liste null devin liste goale in fisier")
    void saveProgram_NullListsBecomeEmpty() throws IOException {
        service.saveProgram(new Program("09:00", "20:00", null, null, null));

        JsonNode json = mapper.readTree(Files.readString(tempDir.resolve("player/program.json")));
        assertTrue(json.get("default").isArray());
        assertTrue(json.get("parties").isArray());
    }

    // ------------------------------------------------------------ command

    @Test
    @DisplayName("command - trimite comanda normalizata la agent")
    void command_Success() {
        service.command(new CommandRequest("  PAUSE "));

        assertEquals(List.of("POST /command {\"command\":\"pause\"}"), requests);
    }

    @Test
    @DisplayName("command - toate cele 4 comenzi sunt acceptate")
    void command_AllAccepted() {
        for (String command : new String[] {"play", "pause", "stop", "next"}) {
            service.command(new CommandRequest(command));
        }

        assertEquals(4, requests.size());
    }

    @Test
    @DisplayName("command - comanda necunoscuta sau lipsa: nu ajunge la agent")
    void command_Invalid() {
        for (CommandRequest bad : new CommandRequest[] {null, new CommandRequest(null), new CommandRequest(""),
                new CommandRequest("reboot"), new CommandRequest("play;rm")}) {
            assertEquals("ERROR.PLAYER.COMMAND_INVALID", errorOf(() -> service.command(bad)));
        }
        assertTrue(requests.isEmpty());
    }

    @Test
    @DisplayName("command - agentul refuza (409): mesajul agentului ajunge in eroare")
    void command_Rejected() {
        commandStatus = 409;
        commandBody = "{\"ok\":false,\"message\":\"nu ruleaza nimic\"}";

        assertEquals("ERROR.PLAYER.COMMAND_REJECTED|nu ruleaza nimic",
                errorOf(() -> service.command(new CommandRequest("next"))));
    }

    @Test
    @DisplayName("command - 409 cu corp nevalid: mesaj gol")
    void command_RejectedBadBody() {
        commandStatus = 409;
        commandBody = "nu e json";

        assertEquals("ERROR.PLAYER.COMMAND_REJECTED|",
                errorOf(() -> service.command(new CommandRequest("next"))));
    }

    @Test
    @DisplayName("command - agentul raspunde 400 / 500")
    void command_AgentErrors() {
        commandStatus = 400;
        assertEquals("ERROR.PLAYER.COMMAND_INVALID", errorOf(() -> service.command(new CommandRequest("play"))));

        commandStatus = 500;
        assertEquals("ERROR.PLAYER.AGENT_ERROR", errorOf(() -> service.command(new CommandRequest("play"))));
    }

    @Test
    @DisplayName("command - agent offline")
    void command_Offline() {
        assertEquals("ERROR.PLAYER.OFFLINE",
                errorOf(() -> offlineService().command(new CommandRequest("play"))));
    }

    // ------------------------------------------------------------ sync / status

    @Test
    @DisplayName("sync - cheama /sync")
    void sync_Success() {
        service.sync();

        assertEquals(List.of("POST /sync"), requests);
    }

    @Test
    @DisplayName("sync - offline si eroare agent")
    void sync_Errors() {
        assertEquals("ERROR.PLAYER.OFFLINE", errorOf(() -> offlineService().sync()));

        syncStatus = 500;
        assertEquals("ERROR.PLAYER.AGENT_ERROR", errorOf(() -> service.sync()));
    }

    @Test
    @DisplayName("status - intoarce JSON-ul agentului neschimbat")
    void status_PassThrough() {
        assertEquals("{\"target\":\"default\",\"playing\":\"a.mp4\"}", service.status());
    }

    @Test
    @DisplayName("status - offline si eroare agent")
    void status_Errors() {
        assertEquals("ERROR.PLAYER.OFFLINE", errorOf(() -> offlineService().status()));

        statusStatus = 500;
        assertEquals("ERROR.PLAYER.AGENT_ERROR", errorOf(() -> service.status()));
    }

    // ------------------------------------------------------------ reincercare

    private int freePort() throws IOException {
        try (java.net.ServerSocket socket = new java.net.ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }

    @Test
    @DisplayName("command - agentul nu era pornit la prima incercare: reincearca si comanda ajunge o singura data")
    void command_RetriesWhenAgentUnreachableThenSucceeds() throws Exception {
        int port = freePort();
        java.util.concurrent.atomic.AtomicInteger commands = new java.util.concurrent.atomic.AtomicInteger();
        HttpServer[] holder = new HttpServer[1];
        Thread starter = new Thread(() -> {
            try {
                Thread.sleep(300);
                HttpServer late = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
                late.createContext("/command", exchange -> {
                    commands.incrementAndGet();
                    reply(exchange, 200, "{\"ok\":true,\"message\":\"ok\"}");
                });
                late.start();
                holder[0] = late;
            } catch (Exception ignored) {
                // aserțiunea de mai jos pica daca nu a pornit
            }
        });
        starter.start();

        try {
            PlayerService retrying = new PlayerService(tempDir.toString(), "http://127.0.0.1:" + port, mapper, 10, 200);
            retrying.command(new CommandRequest("next"));

            assertEquals(1, commands.get());
        } finally {
            starter.join();
            if (holder[0] != null) {
                holder[0].stop(0);
            }
        }
    }

    @Test
    @DisplayName("command - agent inaccesibil: se opreste dupa numarul de incercari si da OFFLINE")
    void command_GivesUpAfterMaxAttempts() {
        PlayerService retrying = new PlayerService(tempDir.toString(), "http://127.0.0.1:1", mapper, 3, 100);

        long started = System.nanoTime();
        assertEquals("ERROR.PLAYER.OFFLINE", errorOf(() -> retrying.command(new CommandRequest("play"))));
        long elapsedMillis = (System.nanoTime() - started) / 1_000_000;

        assertTrue(elapsedMillis >= 200, "trebuie sa astepte intre cele 3 incercari, a durat " + elapsedMillis);
    }

    @Test
    @DisplayName("command - raspunsul 409 al agentului nu se reincearca")
    void command_RejectionIsNotRetried() {
        commandStatus = 409;
        commandBody = "{\"ok\":false,\"message\":\"nu ruleaza nimic\"}";
        PlayerService retrying = new PlayerService(tempDir.toString(),
                "http://127.0.0.1:" + agent.getAddress().getPort(), mapper, 5, 50);

        assertThrows(RuntimeException.class, () -> retrying.command(new CommandRequest("next")));

        assertEquals(1, requests.size());
    }

    @Test
    @DisplayName("agentUrl cu slash la final merge la fel")
    void agentUrl_TrailingSlash() {
        PlayerService withSlash = new PlayerService(tempDir.toString(),
                "http://127.0.0.1:" + agent.getAddress().getPort() + "/", mapper);

        withSlash.sync();

        assertEquals(List.of("POST /sync"), requests);
    }

    // ------------------------------------------------------------ redenumire fisiere

    private Path playerDirWith(String... names) throws IOException {
        Path player = tempDir.resolve("player");
        Files.createDirectories(player);
        for (String name : names) {
            Files.write(player.resolve(name), new byte[] {1});
        }
        return player;
    }

    @Test
    @DisplayName("renameFile - pastreaza UUID si extensia, actualizeaza programul si anunta agentul")
    void renameFile_updatesFileAndProgram() throws IOException {
        Path player = playerDirWith("abc__vechi.mp4");
        service.saveProgram(new Program("09:00", "20:00", "abc__vechi.mp4",
                List.of(new DefaultItem("abc__vechi.mp4", List.of(1), 1, null)),
                List.of(new Party("2026-12-05", "15:00", 60, List.of(new PartyFile("abc__vechi.mp4", 1, null))))));
        requests.clear();

        PlayerDTOs.RenameResult result = service.renameFile(new PlayerDTOs.RenameRequest("abc__vechi.mp4", "Nume nou"));

        assertEquals("abc__Nume_nou.mp4", result.fileName());
        assertTrue(result.programUpdated());
        assertTrue(result.synced());
        assertTrue(Files.exists(player.resolve("abc__Nume_nou.mp4")));
        assertFalse(Files.exists(player.resolve("abc__vechi.mp4")));
        JsonNode program = mapper.readTree(Files.readAllBytes(player.resolve("program.json")));
        assertEquals("abc__Nume_nou.mp4", program.get("stopImage").asText());
        assertEquals("abc__Nume_nou.mp4", program.get("default").get(0).get("file").asText());
        assertEquals("abc__Nume_nou.mp4", program.get("parties").get(0).get("files").get(0).get("file").asText());
        assertEquals(List.of("POST /sync"), requests);
    }

    @Test
    @DisplayName("renameFile - extensia tastata nu se dubleaza, iar cea veche se pastreaza")
    void renameFile_keepsOriginalExtension() throws IOException {
        Path player = playerDirWith("abc__vechi.mp4");

        PlayerDTOs.RenameResult result = service.renameFile(new PlayerDTOs.RenameRequest("abc__vechi.mp4", "Clip.MP4"));

        assertEquals("abc__Clip.mp4", result.fileName());
        assertTrue(Files.exists(player.resolve("abc__Clip.mp4")));
    }

    @Test
    @DisplayName("renameFile - fisier nefolosit in program: nu scrie programul si nu cheama agentul")
    void renameFile_unreferencedFile_noSync() throws IOException {
        Path player = playerDirWith("abc__vechi.mp4", "xyz__alt.mp4");
        service.saveProgram(new Program("09:00", "20:00", null,
                List.of(new DefaultItem("xyz__alt.mp4", List.of(1), 1, null)), List.of()));
        requests.clear();
        byte[] before = Files.readAllBytes(player.resolve("program.json"));

        PlayerDTOs.RenameResult result = service.renameFile(new PlayerDTOs.RenameRequest("abc__vechi.mp4", "nou"));

        assertEquals("abc__nou.mp4", result.fileName());
        assertFalse(result.programUpdated());
        assertFalse(result.synced());
        assertTrue(requests.isEmpty());
        assertTrue(java.util.Arrays.equals(before, Files.readAllBytes(player.resolve("program.json"))));
    }

    @Test
    @DisplayName("renameFile - agentul nu raspunde: fisierul si programul sunt redenumite, synced=false")
    void renameFile_agentDown_programStillUpdated() throws IOException {
        Path player = playerDirWith("abc__vechi.mp4");
        service.saveProgram(new Program("09:00", "20:00", null,
                List.of(new DefaultItem("abc__vechi.mp4", List.of(1), 1, null)), List.of()));
        syncStatus = 500;

        PlayerDTOs.RenameResult result = service.renameFile(new PlayerDTOs.RenameRequest("abc__vechi.mp4", "nou"));

        assertTrue(result.programUpdated());
        assertFalse(result.synced());
        assertEquals("ERROR.PLAYER.AGENT_ERROR", result.message());
        assertTrue(Files.exists(player.resolve("abc__nou.mp4")));
    }

    @Test
    @DisplayName("renameFile - nume invalide sau fisier inexistent: eroare, nimic nu se schimba")
    void renameFile_invalidInputs() throws IOException {
        Path player = playerDirWith("abc__vechi.mp4");

        assertEquals("ERROR.UPLOAD.INVALID_NAME", assertThrows(RuntimeException.class,
                () -> service.renameFile(new PlayerDTOs.RenameRequest("../abc__vechi.mp4", "a"))).getMessage());
        assertEquals("ERROR.UPLOAD.INVALID_NAME", assertThrows(RuntimeException.class,
                () -> service.renameFile(new PlayerDTOs.RenameRequest("program.json", "a"))).getMessage());
        assertEquals("ERROR.UPLOAD.INVALID_NAME", assertThrows(RuntimeException.class,
                () -> service.renameFile(new PlayerDTOs.RenameRequest("abc__vechi.mp4", ".."))).getMessage());
        assertEquals("ERROR.UPLOAD.INVALID_NAME", assertThrows(RuntimeException.class,
                () -> service.renameFile(new PlayerDTOs.RenameRequest("abc__vechi.mp4", "   "))).getMessage());
        assertEquals("ERROR.UPLOAD.INVALID_NAME", assertThrows(RuntimeException.class,
                () -> service.renameFile(new PlayerDTOs.RenameRequest("abc__vechi.mp4", "a/b"))).getMessage());
        assertEquals("ERROR.UPLOAD.NOT_FOUND", assertThrows(RuntimeException.class,
                () -> service.renameFile(new PlayerDTOs.RenameRequest("lipsa__x.mp4", "a"))).getMessage());
        assertTrue(Files.exists(player.resolve("abc__vechi.mp4")));
    }

    @Test
    @DisplayName("renameFile - program.json ilizibil: fisierul revine la numele vechi")
    void renameFile_unreadableProgram_rollsBack() throws IOException {
        Path player = playerDirWith("abc__vechi.mp4");
        Files.writeString(player.resolve("program.json"), "nu e json");

        RuntimeException error = assertThrows(RuntimeException.class,
                () -> service.renameFile(new PlayerDTOs.RenameRequest("abc__vechi.mp4", "nou")));

        assertEquals("ERROR.PLAYER.PROGRAM_UNREADABLE", error.getMessage());
        assertTrue(Files.exists(player.resolve("abc__vechi.mp4")));
        assertFalse(Files.exists(player.resolve("abc__nou.mp4")));
    }

    // ------------------------------------------------------------ comanda party

    @Test
    @DisplayName("command party - trimite id-ul petrecerii (data si ora de inceput) la agent")
    void command_Party_Success() {
        service.command(new CommandRequest("party", " 2026-12-05 14:00 "));

        assertEquals(List.of("POST /command {\"command\":\"party\",\"party\":\"2026-12-05 14:00\"}"), requests);
    }

    @Test
    @DisplayName("command party - id lipsa sau invalid: nu ajunge la agent")
    void command_Party_Invalid() {
        for (CommandRequest bad : new CommandRequest[] {new CommandRequest("party"), new CommandRequest("party", ""),
                new CommandRequest("party", "  "), new CommandRequest("party", "2026-12-05"),
                new CommandRequest("party", "2026-12-05 25:00"), new CommandRequest("party", "2026-12-05 14:60"),
                new CommandRequest("party", "x\"y")}) {
            assertEquals("ERROR.PLAYER.COMMAND_INVALID", errorOf(() -> service.command(bad)));
        }
        assertTrue(requests.isEmpty());
    }

    @Test
    @DisplayName("command - argumentul party e ignorat la celelalte comenzi")
    void command_PartyIgnoredForOtherCommands() {
        service.command(new CommandRequest("play", "2026-12-05 14:00"));

        assertEquals(List.of("POST /command {\"command\":\"play\"}"), requests);
    }

    @Test
    @DisplayName("command party - agentul refuza (petrecerea nu e pe player): mesajul ajunge in eroare")
    void command_Party_Rejected() {
        commandStatus = 409;
        commandBody = "{\"ok\":false,\"message\":\"petrecerea nu e in programul de pe player (salveaza programul)\"}";

        assertEquals("ERROR.PLAYER.COMMAND_REJECTED|petrecerea nu e in programul de pe player (salveaza programul)",
                errorOf(() -> service.command(new CommandRequest("party", "2026-12-05 14:00"))));
    }

    // ------------------------------------------------------------ foldere (organizare)

    private static PlayerDTOs.FolderRequest folder(String name) {
        return new PlayerDTOs.FolderRequest(name, null);
    }

    private static PlayerDTOs.FileFolderRequest move(String file, String folder) {
        return new PlayerDTOs.FileFolderRequest(file, folder);
    }

    @Test
    @DisplayName("foldere - fara fisier: lista goala")
    void folders_empty() {
        PlayerDTOs.FolderState state = service.getFolders();

        assertTrue(state.folders().isEmpty());
        assertTrue(state.assignments().isEmpty());
    }

    @Test
    @DisplayName("foldere - creare: ordinea se pastreaza, diacriticele si spatiile sunt permise, se salveaza in .folders.json")
    void folders_create() throws IOException {
        Path player = playerDirWith();

        service.createFolder(folder("Poze"));
        PlayerDTOs.FolderState state = service.createFolder(folder("  Tematică   2026 "));

        assertEquals(List.of("Poze", "Tematică 2026"), state.folders());
        assertEquals(List.of("Poze", "Tematică 2026"), service.getFolders().folders());
        assertTrue(Files.exists(player.resolve(".folders.json")));
        assertFalse(Files.exists(player.resolve("program.json")));
    }

    @Test
    @DisplayName("foldere - nume invalide sau existente (fara diferenta de litere): eroare; „Nesortate” si „Toate” sunt nume obisnuite")
    void folders_createInvalid() {
        service.createFolder(folder("Poze"));

        assertEquals("ERROR.PLAYER.FOLDER_EXISTS", errorOf(() -> service.createFolder(folder("poze"))));
        for (String bad : new String[] {null, "", "   ", "a".repeat(61), "a\u0007b"}) {
            assertEquals("ERROR.PLAYER.FOLDER_NAME_INVALID", errorOf(() -> service.createFolder(folder(bad))), String.valueOf(bad));
        }
        assertEquals("ERROR.PLAYER.FOLDER_NAME_INVALID", errorOf(() -> service.createFolder(null)));
        assertEquals(List.of("Poze", "Nesortate"), service.createFolder(folder("Nesortate")).folders());
        assertEquals(List.of("Poze", "Nesortate", "Toate"), service.createFolder(folder("Toate")).folders());
    }

    @Test
    @DisplayName("foldere - primul folder preia fisierele existente; fara foldere ele asteapta")
    void folders_firstFolderAdoptsExistingFiles() throws IOException {
        playerDirWith("abc__a.mp4", "abc__b.mp4");
        Files.writeString(tempDir.resolve("player").resolve("program.json"), "{}");

        assertTrue(service.getFolders().assignments().isEmpty());

        PlayerDTOs.FolderState state = service.createFolder(folder("Poze"));

        assertEquals(java.util.Map.of("abc__a.mp4", "Poze", "abc__b.mp4", "Poze"), state.assignments());
        assertEquals(state, service.getFolders());
    }

    @Test
    @DisplayName("foldere - fisier aparut fara folder (alta cale de incarcare) intra in primul folder")
    void folders_laterFilesJoinFirstFolder() throws IOException {
        Path player = playerDirWith();
        service.createFolder(folder("Poze"));
        service.createFolder(folder("Petreceri"));

        Files.write(player.resolve("abc__nou.mp4"), new byte[] {1});
        Files.write(player.resolve(".ascuns.tmp"), new byte[] {1});

        assertEquals(java.util.Map.of("abc__nou.mp4", "Poze"), service.getFolders().assignments());
    }

    @Test
    @DisplayName("foldere - mutarea unui fisier intr-un folder")
    void folders_assignFile() throws IOException {
        playerDirWith("abc__a.mp4");
        service.createFolder(folder("Poze"));
        service.createFolder(folder("Petreceri"));

        assertEquals(java.util.Map.of("abc__a.mp4", "Petreceri"), service.assignFile(move("abc__a.mp4", "Petreceri")).assignments());
        assertEquals(java.util.Map.of("abc__a.mp4", "Petreceri"), service.getFolders().assignments());
    }

    @Test
    @DisplayName("foldere - mutare invalida: folder lipsa sau inexistent, fisier inexistent, program.json, cale")
    void folders_assignInvalid() throws IOException {
        playerDirWith("abc__a.mp4");
        service.createFolder(folder("Poze"));
        Files.writeString(tempDir.resolve("player").resolve("program.json"), "{}");

        assertEquals("ERROR.PLAYER.FOLDER_NOT_FOUND", errorOf(() -> service.assignFile(move("abc__a.mp4", "Altceva"))));
        assertEquals("ERROR.PLAYER.FOLDER_NOT_FOUND", errorOf(() -> service.assignFile(move("abc__a.mp4", null))));
        assertEquals("ERROR.PLAYER.FOLDER_NOT_FOUND", errorOf(() -> service.assignFile(move("abc__a.mp4", ""))));
        assertEquals("ERROR.UPLOAD.NOT_FOUND", errorOf(() -> service.assignFile(move("lipsa__x.mp4", "Poze"))));
        assertEquals("ERROR.UPLOAD.NOT_FOUND", errorOf(() -> service.assignFile(move("program.json", "Poze"))));
        assertEquals("ERROR.UPLOAD.INVALID_NAME", errorOf(() -> service.assignFile(move("../abc__a.mp4", "Poze"))));
        assertEquals("ERROR.UPLOAD.INVALID_NAME", errorOf(() -> service.assignFile(null)));
        assertEquals(java.util.Map.of("abc__a.mp4", "Poze"), service.getFolders().assignments());
    }

    @Test
    @DisplayName("foldere - redenumire: atribuirile urmeaza; nume existent sau inexistent: eroare; aceleasi litere cu alt format: ok")
    void folders_rename() throws IOException {
        playerDirWith("abc__a.mp4");
        service.createFolder(folder("poze"));
        service.createFolder(folder("Tematică"));

        PlayerDTOs.FolderState state = service.renameFolder(new PlayerDTOs.FolderRequest("poze", "Poze"));

        assertEquals(List.of("Poze", "Tematică"), state.folders());
        assertEquals(java.util.Map.of("abc__a.mp4", "Poze"), state.assignments());
        assertEquals("ERROR.PLAYER.FOLDER_EXISTS", errorOf(() -> service.renameFolder(new PlayerDTOs.FolderRequest("Poze", "tematică"))));
        assertEquals("ERROR.PLAYER.FOLDER_NOT_FOUND", errorOf(() -> service.renameFolder(new PlayerDTOs.FolderRequest("Nu exista", "X"))));
        assertEquals("ERROR.PLAYER.FOLDER_NAME_INVALID", errorOf(() -> service.renameFolder(new PlayerDTOs.FolderRequest("Poze", " "))));
    }

    @Test
    @DisplayName("foldere - stergere: doar daca e gol; fisierele raman pe disc")
    void folders_delete() throws IOException {
        Path player = playerDirWith("abc__a.mp4", "abc__b.mp4");
        service.createFolder(folder("Poze"));
        service.createFolder(folder("Petreceri"));
        service.assignFile(move("abc__b.mp4", "Petreceri"));

        assertEquals("ERROR.PLAYER.FOLDER_NOT_EMPTY", errorOf(() -> service.deleteFolder("Poze")));
        assertEquals("ERROR.PLAYER.FOLDER_NOT_EMPTY", errorOf(() -> service.deleteFolder("Petreceri")));

        service.assignFile(move("abc__a.mp4", "Petreceri"));
        PlayerDTOs.FolderState state = service.deleteFolder("Poze");

        assertEquals(List.of("Petreceri"), state.folders());
        assertEquals(java.util.Map.of("abc__a.mp4", "Petreceri", "abc__b.mp4", "Petreceri"), state.assignments());
        assertTrue(Files.exists(player.resolve("abc__a.mp4")));
        assertEquals("ERROR.PLAYER.FOLDER_NOT_FOUND", errorOf(() -> service.deleteFolder("Poze")));
        assertEquals("ERROR.PLAYER.FOLDER_NOT_FOUND", errorOf(() -> service.deleteFolder(null)));
    }

    @Test
    @DisplayName("foldere - un folder gol se sterge; ultimul folder nu se poate sterge cat are fisiere")
    void folders_deleteEmptyAndLast() throws IOException {
        playerDirWith("abc__a.mp4");
        service.createFolder(folder("Poze"));
        service.createFolder(folder("Gol"));

        assertEquals(List.of("Poze"), service.deleteFolder("Gol").folders());
        assertEquals("ERROR.PLAYER.FOLDER_NOT_EMPTY", errorOf(() -> service.deleteFolder("Poze")));
    }

    @Test
    @DisplayName("foldere - fisier sters din Upload: atribuirea lui dispare din rezultat")
    void folders_staleAssignmentIgnored() throws IOException {
        Path player = playerDirWith("abc__a.mp4", "abc__b.mp4");
        service.createFolder(folder("Poze"));

        Files.delete(player.resolve("abc__a.mp4"));

        assertEquals(java.util.Map.of("abc__b.mp4", "Poze"), service.getFolders().assignments());
    }

    @Test
    @DisplayName("foldere - redenumirea unui fisier pastreaza folderul lui")
    void folders_followFileRename() throws IOException {
        playerDirWith("abc__vechi.mp4");
        service.createFolder(folder("Poze"));
        service.createFolder(folder("Petreceri"));
        service.assignFile(move("abc__vechi.mp4", "Petreceri"));

        service.renameFile(new PlayerDTOs.RenameRequest("abc__vechi.mp4", "nou"));

        assertEquals(java.util.Map.of("abc__nou.mp4", "Petreceri"), service.getFolders().assignments());
    }

    @Test
    @DisplayName("foldere - fisierul de foldere stricat: pornim curat si merge in continuare")
    void folders_corruptFile() throws IOException {
        Path player = playerDirWith();
        Files.writeString(player.resolve(".folders.json"), "nu e json");

        assertTrue(service.getFolders().folders().isEmpty());
        assertEquals(List.of("Poze"), service.createFolder(folder("Poze")).folders());
    }

    // ------------------------------------------------------------ comanda quick (rulare rapida)

    private static PlayerDTOs.QuickFile quick(String file, Integer seconds) {
        return new PlayerDTOs.QuickFile(file, seconds);
    }

    @Test
    @DisplayName("command quick - trimite fisierele, in ordinea data, la agent")
    void command_Quick_Success() throws IOException {
        playerDirWith("abc__a.mp4", "abc__b.jpg");

        service.command(new CommandRequest("quick", null, List.of(quick("abc__b.jpg", 30), quick(" abc__a.mp4 ", null))));

        assertEquals(List.of("POST /command {\"command\":\"quick\",\"files\":[{\"file\":\"abc__b.jpg\",\"imageSeconds\":30},{\"file\":\"abc__a.mp4\"}]}"), requests);
    }

    @Test
    @DisplayName("command quick - lista goala, prea lunga, nume invalide, fisier inexistent sau secunde invalide: nu ajunge la agent")
    void command_Quick_Invalid() throws IOException {
        playerDirWith("abc__a.mp4", "abc__b.mp4");
        Files.writeString(tempDir.resolve("player").resolve("program.json"), "{}");
        List<PlayerDTOs.QuickFile> tooMany = new ArrayList<>();
        for (int i = 0; i < 51; i++) {
            tooMany.add(quick("abc__a.mp4", null));
        }

        for (CommandRequest bad : new CommandRequest[] {
                new CommandRequest("quick"), new CommandRequest("quick", null, List.of()), new CommandRequest("quick", null, tooMany),
                new CommandRequest("quick", null, java.util.Arrays.asList((PlayerDTOs.QuickFile) null)),
                new CommandRequest("quick", null, List.of(quick(null, null))), new CommandRequest("quick", null, List.of(quick("  ", null))),
                new CommandRequest("quick", null, List.of(quick("../abc__a.mp4", null))), new CommandRequest("quick", null, List.of(quick("a/b.mp4", null))),
                new CommandRequest("quick", null, List.of(quick(".ascuns", null))), new CommandRequest("quick", null, List.of(quick("program.json", null)))}) {
            assertEquals("ERROR.PLAYER.COMMAND_INVALID", errorOf(() -> service.command(bad)));
        }
        assertEquals("ERROR.UPLOAD.NOT_FOUND", errorOf(() -> service.command(new CommandRequest("quick", null, List.of(quick("lipsa__x.mp4", null))))));
        assertEquals("ERROR.PLAYER.INVALID_IMAGE_SECONDS", errorOf(() -> service.command(new CommandRequest("quick", null, List.of(quick("abc__a.mp4", 0))))));
        assertTrue(requests.isEmpty());
    }

    @Test
    @DisplayName("command - lista de fisiere e ignorata la celelalte comenzi")
    void command_QuickFilesIgnoredForOtherCommands() {
        service.command(new CommandRequest("play", null, List.of(quick("oricare.mp4", null))));

        assertEquals(List.of("POST /command {\"command\":\"play\"}"), requests);
    }

    @Test
    @DisplayName("command quick - agentul refuza (409): mesajul lui ajunge in eroare")
    void command_Quick_Rejected() throws IOException {
        playerDirWith("abc__a.mp4");
        commandStatus = 409;
        commandBody = "{\"ok\":false,\"message\":\"nu se poate\"}";

        assertEquals("ERROR.PLAYER.COMMAND_REJECTED|nu se poate",
                errorOf(() -> service.command(new CommandRequest("quick", null, List.of(quick("abc__a.mp4", null))))));
    }
}
