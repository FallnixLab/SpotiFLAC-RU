import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Search, ArrowUpDown, XCircle } from "lucide-react";
interface SearchAndSortProps {
    searchQuery: string;
    sortBy: string;
    onSearchChange: (value: string) => void;
    onSortChange: (value: string) => void;
}
export function SearchAndSort({ searchQuery, sortBy, onSearchChange, onSortChange, }: SearchAndSortProps) {
    return (<div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input placeholder="Поиск треков..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="pl-10 pr-8"/>
        {searchQuery && (<button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => onSearchChange("")}>
            <XCircle className="h-4 w-4"/>
          </button>)}
      </div>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[200px] gap-1.5">
          <ArrowUpDown className="h-4 w-4"/>
          <SelectValue placeholder="Сортировка"/>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">По умолчанию</SelectItem>
          <SelectItem value="title-asc">Название (А-Я)</SelectItem>
          <SelectItem value="title-desc">Название (Я-А)</SelectItem>
          <SelectItem value="artist-asc">Исполнитель (А-Я)</SelectItem>
          <SelectItem value="artist-desc">Исполнитель (Я-А)</SelectItem>
          <SelectItem value="duration-asc">Продолжительность (меньше)</SelectItem>
          <SelectItem value="duration-desc">Продолжительность (больше)</SelectItem>
          <SelectItem value="plays-asc">Прослушивания (меньше)</SelectItem>
          <SelectItem value="plays-desc">Прослушивания (больше)</SelectItem>
          <SelectItem value="downloaded">Скачанные</SelectItem>
          <SelectItem value="not-downloaded">Не скачанные</SelectItem>
          <SelectItem value="failed">Ошибки загрузки</SelectItem>
        </SelectContent>
      </Select>
    </div>);
}
