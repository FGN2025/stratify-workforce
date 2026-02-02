import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CodeBlockProps {
  code: string;
  language?: 'bash' | 'typescript' | 'python' | 'json';
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ 
  code, 
  language = 'bash', 
  title,
  showLineNumbers = false 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Code copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/50">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </span>
          <LanguageBadge language={language} />
        </div>
      )}
      <div className="relative">
        <pre className={cn(
          "p-4 overflow-x-auto text-sm font-mono",
          showLineNumbers && "pl-12"
        )}>
          {showLineNumbers && (
            <div className="absolute left-0 top-0 bottom-0 w-8 border-r border-border bg-muted/50 flex flex-col items-end pr-2 pt-4 text-xs text-muted-foreground select-none">
              {lines.map((_, i) => (
                <div key={i} className="leading-6">{i + 1}</div>
              ))}
            </div>
          )}
          <code className={cn(
            "text-foreground",
            language === 'bash' && "text-emerald-400",
            language === 'typescript' && "text-blue-400",
            language === 'json' && "text-amber-400"
          )}>
            {code}
          </code>
        </pre>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
            copied && "opacity-100"
          )}
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function LanguageBadge({ language }: { language: string }) {
  const colors: Record<string, string> = {
    bash: 'bg-emerald-500/20 text-emerald-400',
    typescript: 'bg-blue-500/20 text-blue-400',
    python: 'bg-yellow-500/20 text-yellow-400',
    json: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-xs font-medium",
      colors[language] || 'bg-muted text-muted-foreground'
    )}>
      {language}
    </span>
  );
}
