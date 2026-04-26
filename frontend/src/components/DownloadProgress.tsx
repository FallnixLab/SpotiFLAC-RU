import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StopCircle } from "lucide-react";
interface DownloadProgressProps {
    progress: number;
    remainingCount: number;
    currentTrack: {
        name: string;
        artists: string;
    } | null;
    onStop: () => void;
}
export function DownloadProgress({ progress, remainingCount = 0, currentTrack, onStop }: DownloadProgressProps) {
    const clampedProgressValue = Math.min(100, Math.max(0, progress));
    const safeRemainingCount = Math.max(0, remainingCount);
    const remainingLabel = safeRemainingCount > 0 
        ? `Осталось: ${safeRemainingCount.toLocaleString()} ${safeRemainingCount === 1 ? "трек" : (safeRemainingCount >= 2 && safeRemainingCount <= 4 ? "трека" : "треков")}` 
        : "";
    return (<div className="w-full space-y-2 mt-4">
      <div className="flex items-center gap-2">
        <Progress value={clampedProgressValue} className="h-2 flex-1"/>
        <Button variant="destructive" size="sm" onClick={onStop} className="gap-1.5">
          <StopCircle className="h-4 w-4"/>
          Остановить
        </Button>
      </div>
      <div className="flex justify-between items-center px-1">
        <p className="text-xs text-muted-foreground">
          {clampedProgressValue}% -{" "}
          {currentTrack
              ? `${currentTrack.name} - ${currentTrack.artists}`
              : "Подготовка..."}
        </p>
        {remainingLabel && <p className="text-xs font-medium text-primary animate-pulse">{remainingLabel}</p>}
      </div>
    </div>);
}
