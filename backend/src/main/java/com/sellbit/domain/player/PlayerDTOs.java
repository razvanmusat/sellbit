package com.sellbit.domain.player;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Structura fisierului program.json, exact cum o asteapta agentul de pe Pi4.
 * Campurile optionale lipsa nu se scriu in JSON.
 */
public class PlayerDTOs {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Program(
            String open,
            String close,
            String stopImage,
            List<StopItem> stopImages,
            @JsonProperty("default") List<DefaultItem> defaultClips,
            List<Party> parties
    ) {
        /** Forma veche, cu o singura poza de fundal (stopImage) si fara lista stopImages. */
        public Program(String open, String close, String stopImage, List<DefaultItem> defaultClips, List<Party> parties) {
            this(open, close, stopImage, null, defaultClips, parties);
        }
    }

    /** Poza de fundal din lista stopImages; imageSeconds = cat sta pe ecran (lipsa = valoarea implicita a agentului). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record StopItem(
            String file,
            Integer imageSeconds
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DefaultItem(
            String file,
            List<Integer> days,
            Integer order,
            Integer imageSeconds
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Party(
            String date,
            String start,
            Integer durationMinutes,
            List<PartyFile> files
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PartyFile(
            String file,
            Integer order,
            Integer imageSeconds
    ) {}

    /**
     * party = id-ul petrecerii ("YYYY-MM-DD HH:MM": data si ora de inceput), folosit doar de comanda "party";
     * files = fisierele rularii rapide, folosite doar de comanda "quick".
     */
    public record CommandRequest(String command, String party, List<QuickFile> files) {
        public CommandRequest(String command) {
            this(command, null, null);
        }

        public CommandRequest(String command, String party) {
            this(command, party, null);
        }
    }

    /** Fisier pentru rularea rapida (comanda "quick"): rulat acum, fara sa fie adaugat in program. */
    public record QuickFile(String file, Integer imageSeconds) {}

    /**
     * synced = true daca agentul a primit /sync. Daca e false, programul este totusi salvat
     * pe VPS, iar agentul il preia singur la urmatoarea conectare; message contine codul erorii.
     */
    public record SaveResult(boolean synced, String message) {}

    public record RenameRequest(String fileName, String newName) {}

    /**
     * Folderele sunt doar organizare in Sellbit: fisierele raman in folderul player. folders = numele folderelor,
     * in ordinea creerii; assignments = numele fisierului stocat -> folder. Cat exista cel putin un folder,
     * fiecare fisier e intr-un folder; fara foldere, fisierele existente asteapta primul folder.
     */
    public record FolderState(List<String> folders, java.util.Map<String, String> assignments) {}

    /** name = folderul vizat; newName = noul nume (doar la redenumire). */
    public record FolderRequest(String name, String newName) {}

    /** folder = folderul in care trece fisierul (obligatoriu). */
    public record FileFolderRequest(String fileName, String folder) {}

    /**
     * fileName = noul nume stocat (UUID__nume.ext); programUpdated = referintele din program.json au fost
     * actualizate; synced = agentul a primit /sync (relevant doar cand programUpdated e true);
     * message = codul erorii cand synced e false.
     */
    public record RenameResult(String fileName, boolean programUpdated, boolean synced, String message) {}
}
