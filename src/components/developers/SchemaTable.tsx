import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface SchemaItem {
  name: string;
  type: string;
  required: boolean;
  description: string;
  location?: 'path' | 'query' | 'header' | 'body';
}

interface SchemaTableProps {
  items: SchemaItem[];
}

export function SchemaTable({ items }: SchemaTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[150px]">Name</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            {items.some(i => i.location) && (
              <TableHead className="w-[80px]">In</TableHead>
            )}
            <TableHead className="w-[80px]">Required</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.name}>
              <TableCell className="font-mono text-sm">
                {item.name}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-xs">
                  {item.type}
                </Badge>
              </TableCell>
              {items.some(i => i.location) && (
                <TableCell>
                  {item.location && (
                    <LocationBadge location={item.location} />
                  )}
                </TableCell>
              )}
              <TableCell>
                {item.required ? (
                  <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30">
                    Required
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Optional</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LocationBadge({ location }: { location: string }) {
  const colors: Record<string, string> = {
    path: 'bg-blue-500/20 text-blue-400',
    query: 'bg-emerald-500/20 text-emerald-400',
    header: 'bg-purple-500/20 text-purple-400',
    body: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-xs font-medium",
      colors[location] || 'bg-muted text-muted-foreground'
    )}>
      {location}
    </span>
  );
}
