package com.sellbit.domain.player;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.sellbit.domain.player.PlayerDTOs.CommandRequest;
import com.sellbit.domain.player.PlayerDTOs.DefaultItem;
import com.sellbit.domain.player.PlayerDTOs.Program;
import com.sellbit.domain.player.PlayerDTOs.SaveResult;
import com.sellbit.domain.security.auth.JwtUtils;

@WebMvcTest(
        controllers = PlayerController.class,
        excludeAutoConfiguration = SecurityAutoConfiguration.class
)
class PlayerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PlayerService playerService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("GET /api/player/program - Succes: campul se numeste 'default'")
    void getProgram_Success() throws Exception {
        when(playerService.getProgram()).thenReturn(new Program(
                "09:00", "20:00", null,
                List.of(new DefaultItem("a.mp4", List.of(1, 2), 1, null)),
                List.of()));

        mockMvc.perform(get("/api/player/program"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value("09:00"))
                .andExpect(jsonPath("$.default[0].file").value("a.mp4"))
                .andExpect(jsonPath("$.default[0].days[1]").value(2))
                .andExpect(jsonPath("$.parties").isEmpty());
    }

    @Test
    @DisplayName("PUT /api/player/program - Succes: citeste 'default' din body si intoarce rezultatul")
    void saveProgram_Success() throws Exception {
        when(playerService.saveProgram(any())).thenReturn(new SaveResult(true, null));

        String body = """
                {"open":"09:00","close":"20:00","stopImage":"s.jpg",
                 "default":[{"file":"a.mp4","days":[1,2,3],"order":1}],
                 "parties":[{"date":"2026-12-05","start":"15:00","durationMinutes":150,
                             "files":[{"file":"p.mp4","order":1}]}]}
                """;

        mockMvc.perform(put("/api/player/program").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.synced").value(true));

        ArgumentCaptor<Program> captor = ArgumentCaptor.forClass(Program.class);
        verify(playerService).saveProgram(captor.capture());
        Program sent = captor.getValue();
        org.junit.jupiter.api.Assertions.assertEquals("s.jpg", sent.stopImage());
        org.junit.jupiter.api.Assertions.assertEquals("a.mp4", sent.defaultClips().get(0).file());
        org.junit.jupiter.api.Assertions.assertEquals(150, sent.parties().get(0).durationMinutes());
    }

    @Test
    @DisplayName("PUT /api/player/program - programul e salvat dar agentul e offline")
    void saveProgram_NotSynced() throws Exception {
        when(playerService.saveProgram(any())).thenReturn(new SaveResult(false, "ERROR.PLAYER.OFFLINE"));

        mockMvc.perform(put("/api/player/program").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.synced").value(false))
                .andExpect(jsonPath("$.message").value("ERROR.PLAYER.OFFLINE"));
    }

    @Test
    @DisplayName("PUT /api/player/program - validare esuata: 400 cu codul erorii")
    void saveProgram_ValidationError() throws Exception {
        when(playerService.saveProgram(any())).thenThrow(new RuntimeException("ERROR.PLAYER.INVALID_TIME"));

        mockMvc.perform(put("/api/player/program").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("ERROR.PLAYER.INVALID_TIME"));
    }

    @Test
    @DisplayName("PUT /api/player/program - fara body: 400")
    void saveProgram_NoBody() throws Exception {
        mockMvc.perform(put("/api/player/program").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/player/command - Succes: 204")
    void command_Success() throws Exception {
        mockMvc.perform(post("/api/player/command")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"command\":\"stop\"}"))
                .andExpect(status().isNoContent());

        ArgumentCaptor<CommandRequest> captor = ArgumentCaptor.forClass(CommandRequest.class);
        verify(playerService).command(captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals("stop", captor.getValue().command());
    }

    @Test
    @DisplayName("POST /api/player/command - agent offline: 400 cu codul erorii")
    void command_Offline() throws Exception {
        doThrow(new RuntimeException("ERROR.PLAYER.OFFLINE")).when(playerService).command(any());

        mockMvc.perform(post("/api/player/command")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"command\":\"play\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("ERROR.PLAYER.OFFLINE"));
    }

    @Test
    @DisplayName("POST /api/player/command - fara body: 400")
    void command_NoBody() throws Exception {
        mockMvc.perform(post("/api/player/command").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/player/sync - Succes: 204")
    void sync_Success() throws Exception {
        mockMvc.perform(post("/api/player/sync"))
                .andExpect(status().isNoContent());

        verify(playerService).sync();
    }

    @Test
    @DisplayName("POST /api/player/sync - agent offline: 400")
    void sync_Offline() throws Exception {
        doThrow(new RuntimeException("ERROR.PLAYER.OFFLINE")).when(playerService).sync();

        mockMvc.perform(post("/api/player/sync"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("ERROR.PLAYER.OFFLINE"));
    }

    @Test
    @DisplayName("GET /api/player/status - JSON-ul agentului trece neschimbat")
    void status_PassThrough() throws Exception {
        when(playerService.status()).thenReturn("{\"target\":\"none\",\"free_mb\":100}");

        mockMvc.perform(get("/api/player/status"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().json("{\"target\":\"none\",\"free_mb\":100}"));
    }

    @Test
    @DisplayName("GET /api/player/status - agent offline: 400")
    void status_Offline() throws Exception {
        when(playerService.status()).thenThrow(new RuntimeException("ERROR.PLAYER.OFFLINE"));

        mockMvc.perform(get("/api/player/status"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("ERROR.PLAYER.OFFLINE"));
    }

    @Test
    @DisplayName("PUT /api/player/files/rename - Succes: trimite fisierul si numele nou, intoarce rezultatul")
    void renameFile_Success() throws Exception {
        when(playerService.renameFile(any())).thenReturn(new PlayerDTOs.RenameResult("abc__nou.mp4", true, true, null));

        mockMvc.perform(put("/api/player/files/rename")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\":\"abc__vechi.mp4\",\"newName\":\"nou\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("abc__nou.mp4"))
                .andExpect(jsonPath("$.programUpdated").value(true))
                .andExpect(jsonPath("$.synced").value(true));

        ArgumentCaptor<PlayerDTOs.RenameRequest> captor = ArgumentCaptor.forClass(PlayerDTOs.RenameRequest.class);
        verify(playerService).renameFile(captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals("abc__vechi.mp4", captor.getValue().fileName());
        org.junit.jupiter.api.Assertions.assertEquals("nou", captor.getValue().newName());
    }

    @Test
    @DisplayName("POST /api/player/command - party: citeste id-ul petrecerii din body")
    void command_Party() throws Exception {
        mockMvc.perform(post("/api/player/command")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"command\":\"party\",\"party\":\"2026-12-05 14:00\"}"))
                .andExpect(status().isNoContent());

        ArgumentCaptor<CommandRequest> captor = ArgumentCaptor.forClass(CommandRequest.class);
        verify(playerService).command(captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals("party", captor.getValue().command());
        org.junit.jupiter.api.Assertions.assertEquals("2026-12-05 14:00", captor.getValue().party());
    }

    @Test
    @DisplayName("GET /api/player/folders - intoarce folderele si atribuirile")
    void folders_get() throws Exception {
        when(playerService.getFolders()).thenReturn(
                new PlayerDTOs.FolderState(List.of("Poze"), java.util.Map.of("abc__a.mp4", "Poze")));

        mockMvc.perform(get("/api/player/folders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.folders[0]").value("Poze"))
                .andExpect(jsonPath("$.assignments['abc__a.mp4']").value("Poze"));
    }

    @Test
    @DisplayName("POST/PUT/DELETE /api/player/folders - creare, redenumire, stergere")
    void folders_crud() throws Exception {
        when(playerService.createFolder(any())).thenReturn(new PlayerDTOs.FolderState(List.of("Poze"), java.util.Map.of()));
        when(playerService.renameFolder(any())).thenReturn(new PlayerDTOs.FolderState(List.of("Imagini"), java.util.Map.of()));
        when(playerService.deleteFolder("Imagini")).thenReturn(new PlayerDTOs.FolderState(List.of(), java.util.Map.of()));

        mockMvc.perform(post("/api/player/folders").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Poze\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.folders[0]").value("Poze"));
        mockMvc.perform(put("/api/player/folders").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Poze\",\"newName\":\"Imagini\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.folders[0]").value("Imagini"));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/player/folders")
                        .param("name", "Imagini"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.folders").isEmpty());

        ArgumentCaptor<PlayerDTOs.FolderRequest> captor = ArgumentCaptor.forClass(PlayerDTOs.FolderRequest.class);
        verify(playerService).renameFolder(captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals("Poze", captor.getValue().name());
        org.junit.jupiter.api.Assertions.assertEquals("Imagini", captor.getValue().newName());
    }

    @Test
    @DisplayName("PUT /api/player/files/folder - muta un fisier in folder")
    void folders_assignFile() throws Exception {
        when(playerService.assignFile(any())).thenReturn(
                new PlayerDTOs.FolderState(List.of("Poze"), java.util.Map.of("abc__a.mp4", "Poze")));

        mockMvc.perform(put("/api/player/files/folder").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\":\"abc__a.mp4\",\"folder\":\"Poze\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignments['abc__a.mp4']").value("Poze"));

        ArgumentCaptor<PlayerDTOs.FileFolderRequest> captor = ArgumentCaptor.forClass(PlayerDTOs.FileFolderRequest.class);
        verify(playerService).assignFile(captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals("abc__a.mp4", captor.getValue().fileName());
        org.junit.jupiter.api.Assertions.assertEquals("Poze", captor.getValue().folder());
    }

    @Test
    @DisplayName("POST /api/player/command - quick: citeste lista de fisiere din body")
    void command_Quick() throws Exception {
        mockMvc.perform(post("/api/player/command")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"command\":\"quick\",\"files\":[{\"file\":\"abc__a.mp4\"},{\"file\":\"abc__b.jpg\",\"imageSeconds\":30}]}"))
                .andExpect(status().isNoContent());

        ArgumentCaptor<CommandRequest> captor = ArgumentCaptor.forClass(CommandRequest.class);
        verify(playerService).command(captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals("quick", captor.getValue().command());
        org.junit.jupiter.api.Assertions.assertEquals(2, captor.getValue().files().size());
        org.junit.jupiter.api.Assertions.assertEquals("abc__b.jpg", captor.getValue().files().get(1).file());
        org.junit.jupiter.api.Assertions.assertEquals(30, captor.getValue().files().get(1).imageSeconds());
    }
}
