import { useState, useRef } from "react";
import { downloadLyrics } from "@/lib/api";
import { getSettings, parseTemplate, type TemplateData } from "@/lib/settings";
import { toastWithSound as toast } from "@/lib/toast-with-sound";
import { joinPath, sanitizePath, getFirstArtist } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { TrackMetadata } from "@/types/api";
const GetTrackISRC = (spotifyId: string): Promise<string> => (window as any)["go"]["main"]["App"]["GetTrackISRC"](spotifyId);
async function resolveTemplateISRC(settings: {
    folderTemplate?: string;
    filenameTemplate?: string;
    existingFileCheckMode?: string;
}, spotifyId?: string): Promise<string> {
    if (!spotifyId) {
        return "";
    }
    const folderTemplate = settings.folderTemplate || "";
    const filenameTemplate = settings.filenameTemplate || "";
    const shouldResolveISRC = settings.existingFileCheckMode === "isrc" ||
        folderTemplate.includes("{isrc}") ||
        filenameTemplate.includes("{isrc}");
    if (!shouldResolveISRC) {
        return "";
    }
    try {
        return await GetTrackISRC(spotifyId);
    }
    catch {
        return "";
    }
}
export function useLyrics() {
    const [downloadingLyricsTrack, setDownloadingLyricsTrack] = useState<string | null>(null);
    const [downloadedLyrics, setDownloadedLyrics] = useState<Set<string>>(new Set());
    const [failedLyrics, setFailedLyrics] = useState<Set<string>>(new Set());
    const [skippedLyrics, setSkippedLyrics] = useState<Set<string>>(new Set());
    const [isBulkDownloadingLyrics, setIsBulkDownloadingLyrics] = useState(false);
    const [lyricsDownloadProgress, setLyricsDownloadProgress] = useState(0);
    const stopBulkDownloadRef = useRef(false);
    const handleDownloadLyrics = async (spotifyId: string, trackName: string, artistName: string, albumName?: string, playlistName?: string, position?: number, albumArtist?: string, releaseDate?: string, discNumber?: number, isAlbum?: boolean) => {
        if (!spotifyId) {
            toast.error("Не найден Spotify ID для этого трека");
            return;
        }
        logger.info(`downloading lyrics: ${trackName} - ${artistName}`);
        const settings = getSettings();
        setDownloadingLyricsTrack(spotifyId);
        try {
            const os = settings.operatingSystem;
            let outputDir = settings.downloadPath;
            const placeholder = "__SLASH_PLACEHOLDER__";
            const yearValue = releaseDate?.substring(0, 4);
            const displayArtist = settings.useFirstArtistOnly && artistName ? getFirstArtist(artistName) : artistName;
            const displayAlbumArtist = settings.useFirstArtistOnly && albumArtist ? getFirstArtist(albumArtist) : albumArtist;
            const resolvedTemplateISRC = await resolveTemplateISRC(settings, spotifyId);
            const templateData: TemplateData = {
                artist: displayArtist?.replace(/\//g, placeholder),
                album: albumName?.replace(/\//g, placeholder),
                album_artist: displayAlbumArtist?.replace(/\//g, placeholder) || displayArtist?.replace(/\//g, placeholder),
                title: trackName?.replace(/\//g, placeholder),
                isrc: resolvedTemplateISRC?.replace(/\//g, placeholder),
                track: position,
                year: yearValue,
                date: releaseDate,
                playlist: playlistName?.replace(/\//g, placeholder),
            };
            const folderTemplate = settings.folderTemplate || "";
            const useAlbumSubfolder = folderTemplate.includes("{album}") || folderTemplate.includes("{album_artist}") || folderTemplate.includes("{playlist}");
            if (settings.createPlaylistFolder && playlistName && (!isAlbum || !useAlbumSubfolder)) {
                outputDir = joinPath(os, outputDir, sanitizePath(playlistName.replace(/\//g, " "), os));
            }
            if (settings.folderTemplate) {
                const folderPath = parseTemplate(settings.folderTemplate, templateData);
                if (folderPath) {
                    const parts = folderPath.split("/").filter((p: string) => p.trim());
                    for (const part of parts) {
                        const sanitizedPart = part.replace(new RegExp(placeholder, "g"), " ");
                        outputDir = joinPath(os, outputDir, sanitizePath(sanitizedPart, os));
                    }
                }
            }
            const useAlbumTrackNumber = settings.folderTemplate?.includes("{album}") || false;
            const response = await downloadLyrics({
                spotify_id: spotifyId,
                track_name: trackName,
                artist_name: displayArtist,
                album_name: albumName,
                album_artist: displayAlbumArtist,
                release_date: releaseDate,
                isrc: resolvedTemplateISRC || undefined,
                output_dir: outputDir,
                filename_format: settings.filenameTemplate || "{title}",
                track_number: settings.trackNumber,
                position: position || 0,
                use_album_track_number: useAlbumTrackNumber,
                disc_number: discNumber,
            });
            if (response.success) {
                if (response.already_exists) {
                    toast.info("Файл с текстом песни уже существует");
                    setSkippedLyrics((prev) => new Set(prev).add(spotifyId));
                }
                else {
                    toast.success("Текст песни успешно скачан");
                    setDownloadedLyrics((prev) => new Set(prev).add(spotifyId));
                }
                setFailedLyrics((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(spotifyId);
                    return newSet;
                });
            }
            else {
                toast.error(response.error || "Ошибка скачивания текста песни");
                setFailedLyrics((prev) => new Set(prev).add(spotifyId));
            }
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : "Ошибка скачивания текста песни");
            setFailedLyrics((prev) => new Set(prev).add(spotifyId));
        }
        finally {
            setDownloadingLyricsTrack(null);
        }
    };
    const handleDownloadAllLyrics = async (tracks: TrackMetadata[], playlistName?: string, _isArtistDiscography?: boolean, isAlbum?: boolean) => {
        const tracksWithSpotifyId = tracks.filter((track) => track.spotify_id);
        if (tracksWithSpotifyId.length === 0) {
            toast.error("Нет треков с Spotify ID для скачивания текстов");
            return;
        }
        const settings = getSettings();
        setIsBulkDownloadingLyrics(true);
        setLyricsDownloadProgress(0);
        stopBulkDownloadRef.current = false;
        let completed = 0;
        let success = 0;
        let failed = 0;
        let skipped = 0;
        const total = tracksWithSpotifyId.length;
        for (let i = 0; i < tracksWithSpotifyId.length; i++) {
            const track = tracksWithSpotifyId[i];
            if (stopBulkDownloadRef.current) {
                toast.info("Скачивание текстов остановлено");
                break;
            }
            const id = track.spotify_id!;
            setDownloadingLyricsTrack(id);
            setLyricsDownloadProgress(Math.round((completed / total) * 100));
            try {
                const os = settings.operatingSystem;
                let outputDir = settings.downloadPath;
                const placeholder = "__SLASH_PLACEHOLDER__";
                const useAlbumTrackNumber = settings.folderTemplate?.includes("{album}") || false;
                const trackPosition = useAlbumTrackNumber ? (track.track_number || i + 1) : (i + 1);
                const yearValue = track.release_date?.substring(0, 4);
                const displayArtist = settings.useFirstArtistOnly && track.artists ? getFirstArtist(track.artists) : track.artists;
                const displayAlbumArtist = settings.useFirstArtistOnly && track.album_artist ? getFirstArtist(track.album_artist) : track.album_artist;
                const resolvedTemplateISRC = await resolveTemplateISRC(settings, id);
                const templateData: TemplateData = {
                    artist: displayArtist?.replace(/\//g, placeholder),
                    album: track.album_name?.replace(/\//g, placeholder),
                    album_artist: displayAlbumArtist?.replace(/\//g, placeholder) || displayArtist?.replace(/\//g, placeholder),
                    title: track.name?.replace(/\//g, placeholder),
                    isrc: resolvedTemplateISRC?.replace(/\//g, placeholder),
                    track: trackPosition,
                    year: yearValue,
                    date: track.release_date,
                    playlist: playlistName?.replace(/\//g, placeholder),
                };
                const folderTemplate = settings.folderTemplate || "";
                const useAlbumSubfolder = folderTemplate.includes("{album}") || folderTemplate.includes("{album_artist}") || folderTemplate.includes("{playlist}");
                if (settings.createPlaylistFolder && playlistName && (!isAlbum || !useAlbumSubfolder)) {
                    outputDir = joinPath(os, outputDir, sanitizePath(playlistName.replace(/\//g, " "), os));
                }
                if (settings.folderTemplate) {
                    const folderPath = parseTemplate(settings.folderTemplate, templateData);
                    if (folderPath) {
                        const parts = folderPath.split("/").filter((p: string) => p.trim());
                        for (const part of parts) {
                            const sanitizedPart = part.replace(new RegExp(placeholder, "g"), " ");
                            outputDir = joinPath(os, outputDir, sanitizePath(sanitizedPart, os));
                        }
                    }
                }
                const response = await downloadLyrics({
                    spotify_id: id,
                    track_name: track.name,
                    artist_name: displayArtist,
                    album_name: track.album_name,
                    album_artist: displayAlbumArtist,
                    release_date: track.release_date,
                    isrc: resolvedTemplateISRC || undefined,
                    output_dir: outputDir,
                    filename_format: settings.filenameTemplate || "{title}",
                    track_number: settings.trackNumber,
                    position: trackPosition,
                    use_album_track_number: useAlbumTrackNumber,
                    disc_number: track.disc_number,
                });
                if (response.success) {
                    if (response.already_exists) {
                        skipped++;
                        setSkippedLyrics((prev) => new Set(prev).add(id));
                    }
                    else {
                        success++;
                        setDownloadedLyrics((prev) => new Set(prev).add(id));
                    }
                    setFailedLyrics((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(id);
                        return newSet;
                    });
                }
                else {
                    failed++;
                    setFailedLyrics((prev) => new Set(prev).add(id));
                }
            }
            catch (err) {
                failed++;
                logger.error(`error downloading lyrics: ${track.name} - ${err}`);
                setFailedLyrics((prev) => new Set(prev).add(id));
            }
            completed++;
        }
        setDownloadingLyricsTrack(null);
        setIsBulkDownloadingLyrics(false);
        setLyricsDownloadProgress(0);
        if (!stopBulkDownloadRef.current) {
            toast.success(`Тексты: ${success} скачано, ${skipped} пропущено, ${failed} ошибок`);
        }
    };
    const handleStopLyricsDownload = () => {
        logger.info("lyrics download stopped by user");
        stopBulkDownloadRef.current = true;
        toast.info("Остановка скачивания текстов...");
    };
    const resetLyricsState = () => {
        setDownloadedLyrics(new Set());
        setFailedLyrics(new Set());
        setSkippedLyrics(new Set());
    };
    return {
        downloadingLyricsTrack,
        downloadedLyrics,
        failedLyrics,
        skippedLyrics,
        isBulkDownloadingLyrics,
        lyricsDownloadProgress,
        handleDownloadLyrics,
        handleDownloadAllLyrics,
        handleStopLyricsDownload,
        resetLyricsState,
    };
}
