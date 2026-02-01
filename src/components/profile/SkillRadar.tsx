import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import type { SkillSet } from '@/types/tenant';

interface SkillRadarProps {
  skills: SkillSet;
  tenantAverage?: SkillSet;
}

const skillLabels: Record<keyof SkillSet, string> = {
  safety: 'Safety',
  efficiency: 'Efficiency',
  precision: 'Precision',
  speed: 'Speed',
  equipment_care: 'Equipment Care',
};

export function SkillRadar({ skills, tenantAverage }: SkillRadarProps) {
  const data = Object.entries(skills).map(([key, value]) => ({
    skill: skillLabels[key as keyof SkillSet],
    value,
    average: tenantAverage ? tenantAverage[key as keyof SkillSet] : 50,
    fullMark: 100,
  }));

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Skill Profile</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Your Skills</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-muted-foreground/50 border border-dashed border-muted-foreground" />
            <span className="text-muted-foreground">Tenant Average</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeDasharray="3 3"
            />
            <PolarAngleAxis 
              dataKey="skill" 
              tick={{ 
                fill: 'hsl(var(--muted-foreground))', 
                fontSize: 12,
                fontWeight: 500
              }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ 
                fill: 'hsl(var(--muted-foreground))', 
                fontSize: 10 
              }}
              axisLine={false}
            />
            {/* Tenant average (behind) */}
            <Radar
              name="Tenant Average"
              dataKey="average"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="5 5"
            />
            {/* User skills (front) */}
            <Radar
              name="Your Skills"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                <span className="font-data">{value}</span>,
                name
              ]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Skill breakdown */}
      <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-border">
        {Object.entries(skills).map(([key, value]) => (
          <div key={key} className="text-center">
            <p className="font-data text-lg text-primary">{value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {skillLabels[key as keyof SkillSet]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
