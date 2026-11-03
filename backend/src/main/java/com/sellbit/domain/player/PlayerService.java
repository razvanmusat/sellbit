package com.sellbit.domain.player;

import java.io.IOException;
import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Map.Entry;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.player.PlayerDTOs.CommandRequest;
import com.sellbit.domain.player.PlayerDTOs.DefaultItem;
import com.sellbit.domain.player.PlayerDTOs.FileFolderRequest;
import com.sellbit.domain.player.PlayerDTOs.FolderRequest;
import com.sellbit.domain.player.PlayerDTOs.FolderState;
import com.sellbit.domain.player.PlayerDTOs.Party;
import com.sellbit.domain.player.PlayerDTOs.PartyFile;
import com.sellbit.domain.player.PlayerDTOs.Program;
import com.sellbit.domain.player.PlayerDTOs.QuickFile;
import com.sellbit.domain.player.PlayerDTOs.RenameRequest;
import com.sellbit.domain.player.PlayerDTOs.RenameResult;
import com.sellbit.domain.player.PlayerDTOs.SaveResult;
import com.sellbit.domain.player.PlayerDTOs.StopItem;

@Service
public class PlayerService {

    static final String PLAYER_FOLDER = "player";
    static final String PROGRAM_FILE = "program.json";
    static final String PROGRAM_TMP_FILE = ".program.json.tmp";
    // acelasi separator ca in UploadService: fisierele stocate sunt UUID__nume.ext
    private static final String STORED_SEPARATOR = "__";

    private static final Set<String> COMMANDS = Set.of("play", "pause", "stop", "next", "party", "quick");
    private static final int QUICK_MAX_FILES = 50;
    private static final Pattern PARTY_ID = Pattern.compile("^\\d{4}-\\d{2}-\\d{2} ([01]\\d|2[0-3]):[0-5]\\d$");
    private static final Pattern TIME = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");

    private static final int DEFAULT_MAX_ATTEMPTS = 3;
    private static final long DEFAULT_RETRY_DELAY_MILLIS = 700;

    private final Path playerDir;
    private final String agentUrl;
    private final ObjectMapper mapper;
    private final HttpClient http;
    private final int maxAttempts;
    private final long retryDelayMillis;

    @Autowired
    public PlayerService(@Value("${sellbit.uploads.path:/opt/sellbit/uploads}") String uploadPath,
                         @Value("${sellbit.player.agent-url:http://host.docker.internal:18080}") String agentUrl,
                         ObjectMapper mapper) {
        this(uploadPath, agentUrl, mapper, DEFAULT_MAX_ATTEMPTS, DEFAULT_RETRY_DELAY_MILLIS);
    }

    PlayerService(String uploadPath, String agentUrl, ObjectMapper mapper, int maxAttempts, long retryDelayMillis) {
        this.maxAttempts = Math.max(1, maxAttempts);
        this.retryDelayMillis = Math.max(0, retryDelayMillis);
        this.playerDir = Path.of(uploadPath).toAbsolutePath().normalize().resolve(PLAYER_FOLDER).normalize();
        this.agentUrl = agentUrl.endsWith("/") ? agentUrl.substring(0, agentUrl.length() - 1) : agentUrl;
        this.mapper = mapper.copy().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        try {
            Files.createDirectories(playerDir);
        } catch (IOException ignored) {
            // se reincearca la citirea/salvarea programului
        }
    }

    // ---------------------------------------------------------------- program

    public Program getProgram() {
        ensureDirectory();
        Path file = playerDir.resolve(PROGRAM_FILE);
        if (!Files.isRegularFile(file)) {
            return new Program(null, null, null, null, List.of(), List.of());
        }
        try {
            Program program = mapper.readValue(Files.readAllBytes(file), Program.class);
            return new Program(
                    program.open(),
                    program.close(),
                    program.stopImage(),
                    program.stopImages(),
                    program.defaultClips() == null ? List.of() : program.defaultClips(),
                    program.parties() == null ? List.of() : program.parties());
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.PLAYER.PROGRAM_UNREADABLE");
        }
    }

    /**
     * Valideaza, scrie atomic program.json si anunta agentul (POST /sync).
     * O singura salvare la un moment dat.
     */
    public synchronized SaveResult saveProgram(Program input) {
        Program program = validate(input);
        writeProgram(program);

        try {
            sync();
            return new SaveResult(true, null);
        } catch (RuntimeException ex) {
            return new SaveResult(false, ex.getMessage());
        }
    }

    /** Scrie program.json atomic (fisier temporar + mutare). */
    private void writeProgram(Program program) {
        ensureDirectory();

        Path tmp = playerDir.resolve(PROGRAM_TMP_FILE);
        Path target = playerDir.resolve(PROGRAM_FILE);
        try {
            Files.write(tmp, mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(program));
            try {
                Files.move(tmp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException ex) {
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            try {
                Files.deleteIfExists(tmp);
            } catch (IOException ignored) {
                // nimic de facut
            }
            throw new RuntimeException("ERROR.PLAYER.SAVE_FAILED");
        }
    }

    // ------------------------------------------------------------ redenumire

    /**
     * Redenumeste un fisier din folderul player (UUID__nume.ext): pastreaza prefixul UUID si extensia,
     * schimba doar numele, apoi actualizeaza referintele din program.json si anunta agentul.
     * Daca actualizarea programului esueaza, fisierul revine la numele vechi.
     */
    public synchronized RenameResult renameFile(RenameRequest request) {
        if (request == null) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }
        String oldName = cleanStoredName(request.fileName());
        if (PROGRAM_FILE.equals(oldName)) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }
        ensureDirectory();
        Path source = playerDir.resolve(oldName).normalize();
        if (!source.startsWith(playerDir) || !Files.isRegularFile(source)) {
            throw new RuntimeException("ERROR.UPLOAD.NOT_FOUND");
        }

        int separator = oldName.indexOf(STORED_SEPARATOR);
        if (separator <= 0 || separator + STORED_SEPARATOR.length() >= oldName.length()) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }
        String prefix = oldName.substring(0, separator);
        String oldOriginal = oldName.substring(separator + STORED_SEPARATOR.length());
        int dot = oldOriginal.lastIndexOf('.');
        String extension = dot > 0 ? oldOriginal.substring(dot) : "";

        String cleaned = sanitizeLabel(request.newName());
        String base = !extension.isEmpty()
                && cleaned.toLowerCase(Locale.ROOT).endsWith(extension.toLowerCase(Locale.ROOT))
                ? cleaned.substring(0, cleaned.length() - extension.length())
                : cleaned;
        if (base.isBlank() || base.chars().allMatch(c -> c == '.')) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        String newName = prefix + STORED_SEPARATOR + base + extension;
        if (newName.equals(oldName)) {
            return new RenameResult(oldName, false, false, null);
        }
        Path target = playerDir.resolve(newName).normalize();
        if (!target.startsWith(playerDir) || Files.exists(target)) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }

        try {
            try {
                Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException ex) {
                Files.move(source, target);
            }
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.UPLOAD.RENAME_FAILED");
        }

        try {
            moveAssignment(oldName, newName);
        } catch (RuntimeException ignored) {
            // cel mult fisierul apare in "Nesortate"; redenumirea in sine a reusit
        }

        boolean programUpdated;
        try {
            programUpdated = replaceInProgram(oldName, newName);
        } catch (RuntimeException ex) {
            try {
                Files.move(target, source);
            } catch (IOException ignored) {
                // nimic de facut: eroarea originala e mai importanta
            }
            throw ex;
        }
        if (!programUpdated) {
            return new RenameResult(newName, false, false, null);
        }

        try {
            sync();
            return new RenameResult(newName, true, true, null);
        } catch (RuntimeException ex) {
            return new RenameResult(newName, true, false, ex.getMessage());
        }
    }

    /** Inlocuieste numele in program.json (daca exista si il foloseste). Intoarce true daca a scris programul. */
    private boolean replaceInProgram(String oldName, String newName) {
        if (!Files.isRegularFile(playerDir.resolve(PROGRAM_FILE))) {
            return false;
        }
        Program program = getProgram();
        Program renamed = new Program(
                program.open(),
                program.close(),
                Objects.equals(program.stopImage(), oldName) ? newName : program.stopImage(),
                program.stopImages() == null ? null : program.stopImages().stream()
                        .map(item -> new StopItem(Objects.equals(item.file(), oldName) ? newName : item.file(), item.imageSeconds()))
                        .toList(),
                program.defaultClips().stream()
                        .map(item -> new DefaultItem(
                                Objects.equals(item.file(), oldName) ? newName : item.file(),
                                item.days(), item.order(), item.imageSeconds()))
                        .toList(),
                program.parties().stream()
                        .map(party -> new Party(
                                party.date(), party.start(), party.durationMinutes(),
                                party.files() == null ? null : party.files().stream()
                                        .map(file -> new PartyFile(
                                                Objects.equals(file.file(), oldName) ? newName : file.file(),
                                                file.order(), file.imageSeconds()))
                                        .toList()))
                        .toList());
        if (renamed.equals(program)) {
            return false;
        }
        writeProgram(renamed);
        return true;
    }

    private String cleanStoredName(String name) {
        String value = name == null ? "" : name.trim();
        if (value.isBlank() || value.contains("..") || value.contains("/") || value.contains("\\") || value.startsWith(".")) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }
        return value;
    }

    private String sanitizeLabel(String label) {
        String value = label == null ? "" : label.trim();
        if (value.isBlank() || value.contains("..") || value.contains("/") || value.contains("\\")) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }
        return value.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    // ------------------------------------------------------- foldere (organizare)

    static final String FOLDERS_FILE = ".folders.json";
    static final String FOLDERS_TMP_FILE = ".folders.json.tmp";
    private static final int FOLDER_NAME_MAX = 60;
    private static final int FOLDERS_MAX = 200;

    /**
     * Folderele de organizare si atribuirile. Intrarile fara fisier sau folder dispar, iar fisierele fara folder
     * (incarcate pe alta cale) intra in primul folder, cat exista cel putin unul.
     */
    public synchronized FolderState getFolders() {
        ensureDirectory();
        FolderState raw = readFolders();
        FolderState state = normalized(raw);
        if (!state.equals(raw)) {
            writeFolders(state);
        }
        return state;
    }

    public synchronized FolderState createFolder(FolderRequest request) {
        String name = cleanFolderName(request == null ? null : request.name());
        FolderState state = normalized(readFolders());
        requireFolderFree(state.folders(), name, null);
        if (state.folders().size() >= FOLDERS_MAX) {
            throw new RuntimeException("ERROR.PLAYER.FOLDER_NAME_INVALID");
        }
        List<String> folders = new ArrayList<>(state.folders());
        folders.add(name);
        // primul folder preia fisierele existente, care pana atunci nu aveau unde sa stea
        return writeFolders(normalized(new FolderState(folders, state.assignments())));
    }

    public synchronized FolderState renameFolder(FolderRequest request) {
        String oldName = request == null || request.name() == null ? "" : request.name();
        String newName = cleanFolderName(request == null ? null : request.newName());
        FolderState state = normalized(readFolders());
        int index = state.folders().indexOf(oldName);
        if (index < 0) {
            throw new RuntimeException("ERROR.PLAYER.FOLDER_NOT_FOUND");
        }
        requireFolderFree(state.folders(), newName, oldName);
        List<String> folders = new ArrayList<>(state.folders());
        folders.set(index, newName);
        Map<String, String> assignments = new java.util.LinkedHashMap<>();
        for (Entry<String, String> entry : state.assignments().entrySet()) {
            assignments.put(entry.getKey(), entry.getValue().equals(oldName) ? newName : entry.getValue());
        }
        return writeFolders(new FolderState(folders, assignments));
    }

    /** Un folder se sterge doar daca e gol: fisierele nu se sterg si nu raman fara folder. */
    public synchronized FolderState deleteFolder(String name) {
        FolderState state = normalized(readFolders());
        if (name == null || !state.folders().contains(name)) {
            throw new RuntimeException("ERROR.PLAYER.FOLDER_NOT_FOUND");
        }
        if (state.assignments().containsValue(name)) {
            throw new RuntimeException("ERROR.PLAYER.FOLDER_NOT_EMPTY");
        }
        List<String> folders = new ArrayList<>(state.folders());
        folders.remove(name);
        return writeFolders(new FolderState(folders, state.assignments()));
    }

    /** Muta un fisier intr-un folder existent. */
    public synchronized FolderState assignFile(FileFolderRequest request) {
        if (request == null) {
            throw new RuntimeException("ERROR.UPLOAD.INVALID_NAME");
        }
        String file = cleanStoredName(request.fileName());
        ensureDirectory();
        Path path = playerDir.resolve(file).normalize();
        if (PROGRAM_FILE.equals(file) || !path.startsWith(playerDir) || !Files.isRegularFile(path)) {
            throw new RuntimeException("ERROR.UPLOAD.NOT_FOUND");
        }
        String folder = request.folder();
        FolderState state = normalized(readFolders());
        if (folder == null || !state.folders().contains(folder)) {
            throw new RuntimeException("ERROR.PLAYER.FOLDER_NOT_FOUND");
        }
        Map<String, String> assignments = new java.util.LinkedHashMap<>(state.assignments());
        assignments.put(file, folder);
        return writeFolders(new FolderState(state.folders(), assignments));
    }

    /** Dupa redenumirea unui fisier, atribuirea lui de folder trece pe noul nume. */
    private void moveAssignment(String oldName, String newName) {
        FolderState raw = readFolders();
        if (!raw.assignments().containsKey(oldName)) {
            return;
        }
        Map<String, String> assignments = new java.util.LinkedHashMap<>();
        for (Entry<String, String> entry : raw.assignments().entrySet()) {
            assignments.put(entry.getKey().equals(oldName) ? newName : entry.getKey(), entry.getValue());
        }
        writeFolders(new FolderState(raw.folders(), assignments));
    }

    private FolderState readFolders() {
        Path file = playerDir.resolve(FOLDERS_FILE);
        if (!Files.isRegularFile(file)) {
            return new FolderState(List.of(), Map.of());
        }
        try {
            FolderState state = mapper.readValue(Files.readAllBytes(file), FolderState.class);
            return new FolderState(
                    state.folders() == null ? List.of() : state.folders(),
                    state.assignments() == null ? Map.of() : state.assignments());
        } catch (IOException | RuntimeException ex) {
            return new FolderState(List.of(), Map.of()); // fisier stricat: pornim curat, la urmatoarea scriere se rescrie
        }
    }

    /** Scoate din atribuiri fisierele care nu mai exista (sterse din Upload) si folderele inexistente. */
    private FolderState cleaned(FolderState state) {
        List<String> folders = state.folders().stream().distinct().toList();
        Map<String, String> assignments = new java.util.LinkedHashMap<>();
        for (Entry<String, String> entry : state.assignments().entrySet()) {
            Path path = playerDir.resolve(entry.getKey()).normalize();
            if (folders.contains(entry.getValue()) && path.startsWith(playerDir) && Files.isRegularFile(path)) {
                assignments.put(entry.getKey(), entry.getValue());
            }
        }
        return new FolderState(folders, assignments);
    }

    /**
     * Curata, apoi, cat exista cel putin un folder, pune in primul folder fisierele care nu au niciunul
     * (nu numara program.json si fisierele ascunse). Fara foldere nu face nimic: fisierele asteapta primul folder.
     */
    private FolderState normalized(FolderState raw) {
        FolderState state = cleaned(raw);
        if (state.folders().isEmpty()) {
            return state;
        }
        String first = state.folders().get(0);
        Map<String, String> assignments = new java.util.LinkedHashMap<>(state.assignments());
        try (java.util.stream.Stream<Path> stream = Files.list(playerDir)) {
            stream.filter(Files::isRegularFile)
                    .map(path -> path.getFileName().toString())
                    .filter(name -> !name.startsWith(".") && !PROGRAM_FILE.equals(name) && !assignments.containsKey(name))
                    .sorted()
                    .forEach(name -> assignments.put(name, first));
        } catch (IOException ex) {
            // daca folderul nu se poate lista, ramanem cu atribuirile cunoscute
        }
        return new FolderState(state.folders(), assignments);
    }

    private FolderState writeFolders(FolderState state) {
        ensureDirectory();
        Path tmp = playerDir.resolve(FOLDERS_TMP_FILE);
        Path target = playerDir.resolve(FOLDERS_FILE);
        try {
            Files.write(tmp, mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(state));
            try {
                Files.move(tmp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException ex) {
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            try {
                Files.deleteIfExists(tmp);
            } catch (IOException ignored) {
                // nimic de facut
            }
            throw new RuntimeException("ERROR.PLAYER.SAVE_FAILED");
        }
        return state;
    }

    private String cleanFolderName(String name) {
        String value = name == null ? "" : name.trim().replaceAll("\\s+", " ");
        if (value.isEmpty() || value.length() > FOLDER_NAME_MAX || value.chars().anyMatch(Character::isISOControl)) {
            throw new RuntimeException("ERROR.PLAYER.FOLDER_NAME_INVALID");
        }
        return value;
    }

    private void requireFolderFree(List<String> folders, String name, String except) {
        for (String existing : folders) {
            if (existing.equalsIgnoreCase(name) && (except == null || !existing.equals(except))) {
                throw new RuntimeException("ERROR.PLAYER.FOLDER_EXISTS");
            }
        }
    }

    // ------------------------------------------------------------------ agent

    public void command(CommandRequest request) {
        String command = request == null || request.command() == null
                ? ""
                : request.command().trim().toLowerCase(Locale.ROOT);
        if (!COMMANDS.contains(command)) {
            throw new RuntimeException("ERROR.PLAYER.COMMAND_INVALID");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("command", command);
        if ("party".equals(command)) {
            String party = request.party() == null ? "" : request.party().trim();
            if (!PARTY_ID.matcher(party).matches()) {
                throw new RuntimeException("ERROR.PLAYER.COMMAND_INVALID");
            }
            payload.put("party", party);
        } else if ("quick".equals(command)) {
            payload.put("files", quickFiles(request.files()));
        }

        HttpResponse<String> response = callAgent("POST", "/command", toJson(payload), true);
        int status = response.statusCode();
        if (status == 200) {
            return;
        }
        if (status == 409) {
            throw new RuntimeException("ERROR.PLAYER.COMMAND_REJECTED|" + extractMessage(response.body()));
        }
        if (status == 400) {
            throw new RuntimeException("ERROR.PLAYER.COMMAND_INVALID");
        }
        throw new RuntimeException("ERROR.PLAYER.AGENT_ERROR");
    }

    public void sync() {
        HttpResponse<String> response = callAgent("POST", "/sync", "{}", true);
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("ERROR.PLAYER.AGENT_ERROR");
        }
    }

    /** Raspunsul JSON al agentului, neschimbat. */
    public String status() {
        HttpResponse<String> response = callAgent("GET", "/status", null, false);
        if (response.statusCode() != 200) {
            throw new RuntimeException("ERROR.PLAYER.AGENT_ERROR");
        }
        return response.body();
    }

    /**
     * Apeleaza agentul. Cu retryWhenUnreachable, reincearca (de maxAttempts ori) doar cand conexiunea
     * nu s-a stabilit deloc (refuzata sau timeout la conectare): comanda nu a ajuns la agent,
     * deci reincercarea nu o poate executa de doua ori.
     */
    private HttpResponse<String> callAgent(String method, String path, String body, boolean retryWhenUnreachable) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(agentUrl + path))
                .timeout(Duration.ofSeconds(10));
        if ("GET".equals(method)) {
            builder.GET();
        } else {
            builder.header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body == null ? "{}" : body, StandardCharsets.UTF_8));
        }
        HttpRequest request = builder.build();

        int attempt = 1;
        while (true) {
            try {
                return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("ERROR.PLAYER.OFFLINE");
            } catch (IOException ex) {
                boolean neverReachedAgent = ex instanceof ConnectException || ex instanceof HttpConnectTimeoutException;
                if (!retryWhenUnreachable || !neverReachedAgent || attempt >= maxAttempts) {
                    throw new RuntimeException("ERROR.PLAYER.OFFLINE");
                }
                attempt++;
                try {
                    Thread.sleep(retryDelayMillis);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("ERROR.PLAYER.OFFLINE");
                }
            }
        }
    }

    /** Valideaza fisierele rularii rapide (trebuie sa existe in folderul player) si le pregateste pentru agent. */
    private List<Map<String, Object>> quickFiles(List<QuickFile> files) {
        if (files == null || files.isEmpty() || files.size() > QUICK_MAX_FILES) {
            throw new RuntimeException("ERROR.PLAYER.COMMAND_INVALID");
        }
        List<Map<String, Object>> items = new ArrayList<>();
        for (QuickFile file : files) {
            String name = file == null || file.file() == null ? "" : file.file().trim();
            if (name.isEmpty() || name.contains("/") || name.contains("\\") || name.contains("..")
                    || name.startsWith(".") || PROGRAM_FILE.equals(name)) {
                throw new RuntimeException("ERROR.PLAYER.COMMAND_INVALID");
            }
            requireImageSeconds(file.imageSeconds());
            Path path = playerDir.resolve(name).normalize();
            if (!path.startsWith(playerDir) || !Files.isRegularFile(path)) {
                throw new RuntimeException("ERROR.UPLOAD.NOT_FOUND");
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("file", name);
            if (file.imageSeconds() != null) {
                item.put("imageSeconds", file.imageSeconds());
            }
            items.add(item);
        }
        return items;
    }

    private String extractMessage(String body) {
        try {
            JsonNode node = mapper.readTree(body);
            JsonNode message = node == null ? null : node.get("message");
            return message == null || message.isNull() ? "" : message.asText("");
        } catch (IOException | RuntimeException ex) {
            return "";
        }
    }

    private String toJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.PLAYER.SAVE_FAILED");
        }
    }

    // ------------------------------------------------------------- validation

    private Program validate(Program input) {
        if (input == null) {
            throw new RuntimeException("ERROR.PLAYER.PROGRAM_REQUIRED");
        }

        requireTime(input.open());
        requireTime(input.close());

        String stopImage = input.stopImage() == null || input.stopImage().isBlank() ? null : input.stopImage();
        if (stopImage != null) {
            requireFileName(stopImage);
        }

        List<StopItem> stopImages = new ArrayList<>();
        if (input.stopImages() != null) {
            for (StopItem item : input.stopImages()) {
                if (item == null) {
                    throw new RuntimeException("ERROR.PLAYER.INVALID_FILE_NAME");
                }
                requireFileName(item.file());
                requireImageSeconds(item.imageSeconds());
                stopImages.add(new StopItem(item.file(), item.imageSeconds()));
            }
        }
        if (!stopImages.isEmpty()) {
            stopImage = null;   // lista are prioritate; forma veche (stopImage) se pastreaza doar daca lista e goala
        }

        List<DefaultItem> defaults = new ArrayList<>();
        if (input.defaultClips() != null) {
            for (DefaultItem item : input.defaultClips()) {
                if (item == null) {
                    throw new RuntimeException("ERROR.PLAYER.INVALID_FILE_NAME");
                }
                requireFileName(item.file());
                requireImageSeconds(item.imageSeconds());
                defaults.add(new DefaultItem(item.file(), normalizeDays(item.days()), item.order(), item.imageSeconds()));
            }
        }

        List<Party> parties = new ArrayList<>();
        if (input.parties() != null) {
            for (Party party : input.parties()) {
                if (party == null) {
                    throw new RuntimeException("ERROR.PLAYER.INVALID_DATE");
                }
                requireDate(party.date());
                requireTime(party.start());
                if (party.durationMinutes() == null || party.durationMinutes() <= 0) {
                    throw new RuntimeException("ERROR.PLAYER.INVALID_DURATION");
                }
                if (party.files() == null || party.files().isEmpty()) {
                    throw new RuntimeException("ERROR.PLAYER.PARTY_FILES_REQUIRED");
                }
                List<PartyFile> files = new ArrayList<>();
                for (PartyFile file : party.files()) {
                    if (file == null) {
                        throw new RuntimeException("ERROR.PLAYER.INVALID_FILE_NAME");
                    }
                    requireFileName(file.file());
                    requireImageSeconds(file.imageSeconds());
                    files.add(new PartyFile(file.file(), file.order(), file.imageSeconds()));
                }
                parties.add(new Party(party.date(), party.start(), party.durationMinutes(), files));
            }
        }

        return new Program(input.open(), input.close(), stopImage, stopImages.isEmpty() ? null : stopImages, defaults, parties);
    }

    private void requireTime(String value) {
        if (value == null || !TIME.matcher(value).matches()) {
            throw new RuntimeException("ERROR.PLAYER.INVALID_TIME");
        }
    }

    private void requireDate(String value) {
        if (value == null) {
            throw new RuntimeException("ERROR.PLAYER.INVALID_DATE");
        }
        try {
            LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new RuntimeException("ERROR.PLAYER.INVALID_DATE");
        }
    }

    private void requireFileName(String name) {
        if (name == null || name.isBlank() || name.contains("/") || name.startsWith(".")) {
            throw new RuntimeException("ERROR.PLAYER.INVALID_FILE_NAME");
        }
    }

    private void requireImageSeconds(Integer seconds) {
        if (seconds != null && seconds <= 0) {
            throw new RuntimeException("ERROR.PLAYER.INVALID_IMAGE_SECONDS");
        }
    }

    private List<Integer> normalizeDays(List<Integer> days) {
        if (days == null || days.isEmpty()) {
            throw new RuntimeException("ERROR.PLAYER.INVALID_DAYS");
        }
        TreeSet<Integer> sorted = new TreeSet<>();
        for (Integer day : days) {
            if (day == null || day < 1 || day > 7) {
                throw new RuntimeException("ERROR.PLAYER.INVALID_DAYS");
            }
            sorted.add(day);
        }
        return new ArrayList<>(sorted);
    }

    private void ensureDirectory() {
        try {
            Files.createDirectories(playerDir);
        } catch (IOException ex) {
            throw new RuntimeException("ERROR.PLAYER.DIR_NOT_AVAILABLE");
        }
    }
}
