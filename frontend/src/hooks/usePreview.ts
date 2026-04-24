import { useState, useEffect } from "react";
import { GetPreviewURL } from "@/../wailsjs/go/main/App";
import { SPOTIFY_PREVIEW_VOLUME } from "@/lib/preview";
import { toast } from "sonner";
export function usePreview() {
    const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [playingTrack, setPlayingTrack] = useState<string | null>(null);
    useEffect(() => {
        return () => {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
        };
    }, [currentAudio]);
    const playPreview = async (trackId: string, trackName: string) => {
        try {
            if (playingTrack === trackId && currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                setPlayingTrack(null);
                setCurrentAudio(null);
                return;
            }
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                setCurrentAudio(null);
                setPlayingTrack(null);
            }
            setLoadingPreview(trackId);
            const previewURL = await GetPreviewURL(trackId);
            if (!previewURL) {
                toast.error("Предпрослушивание недоступно", {
                    description: `Предпрослушивание для "${trackName}" не найдено`,
                });
                setLoadingPreview(null);
                return;
            }
            const audio = new Audio(previewURL);
            audio.volume = SPOTIFY_PREVIEW_VOLUME;
            audio.addEventListener("loadeddata", () => {
                setLoadingPreview(null);
                setPlayingTrack(trackId);
            });
            audio.addEventListener("ended", () => {
                setPlayingTrack(null);
                setCurrentAudio(null);
            });
            audio.addEventListener("error", () => {
                toast.error("Не удалось воспроизвести предпрослушивание", {
                    description: `Не удалось воспроизвести "${trackName}"`,
                });
                setLoadingPreview(null);
                setPlayingTrack(null);
                setCurrentAudio(null);
            });
            setCurrentAudio(audio);
            await audio.play();
        }
        catch (error: any) {
            console.error("Preview error:", error);
            toast.error("Предпрослушивание недоступно", {
                description: error?.message || `Не удалось загрузить предпрослушивание для "${trackName}"`,
            });
            setLoadingPreview(null);
            setPlayingTrack(null);
        }
    };
    const stopPreview = () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            setCurrentAudio(null);
            setPlayingTrack(null);
        }
    };
    return {
        playPreview,
        stopPreview,
        loadingPreview,
        playingTrack,
    };
}
