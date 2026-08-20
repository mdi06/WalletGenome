'use client';

import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { RadarPoint } from '@/lib/utils/dashboardUtils';

interface Props {
  radarData: RadarPoint[];
}

export default function BehavioralRadarChart({ radarData }: Props) {
  return (
    <div className="w-full h-52 flex items-center justify-center -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} outerRadius="70%" margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
          <PolarGrid stroke="#cecece" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#555555', fontSize: 8.5, fontWeight: 700 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Wallet Score"
            dataKey="value"
            stroke="#ff5500"
            strokeWidth={2}
            fill="#ff5500"
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
