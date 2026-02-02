import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import type { SkillCredential } from '@/hooks/useProfile';

interface CertificationCardProps {
  credential: SkillCredential;
}

export function CertificationCard({ credential }: CertificationCardProps) {
  const isExpired = credential.expires_at && new Date(credential.expires_at) < new Date();
  const isVerified = !isExpired;

  return (
    <Card className="glass-card min-w-[220px] hover:border-primary/50 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <Badge 
            variant={isVerified ? 'default' : 'outline'}
            className={isVerified ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-muted-foreground'}
          >
            {isVerified ? 'Verified' : isExpired ? 'Expired' : 'Pending'}
          </Badge>
        </div>
        <h4 className="font-semibold text-sm mt-3">{credential.title}</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {credential.issuer && `${credential.issuer} • `}
          Issued {new Date(credential.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </CardContent>
    </Card>
  );
}
