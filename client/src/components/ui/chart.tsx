"use client";

import * as React from "react";
import { 
  Line,
  Bar,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const chartColors = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ef4444", // red-500
];

export interface ChartProps {
  data: Record<string, any>[];
  categories: string[];
  index: string;
  className?: string;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  yAxisWidth?: number;
  showLegend?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridLines?: boolean;
  showTooltip?: boolean;
  chartType?: "line" | "bar" | "area";
}

export function Chart({
  data,
  categories,
  index,
  className,
  colors = chartColors,
  valueFormatter = (value: number) => value.toString(),
  yAxisWidth = 40,
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
  showGridLines = true,
  showTooltip = true,
  chartType = "line",
}: ChartProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 10,
          }}
        >
          {showGridLines && <CartesianGrid strokeDasharray="3 3" />}
          {showXAxis && <XAxis dataKey={index} />}
          {showYAxis && <YAxis width={yAxisWidth} />}
          {showTooltip && (
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="border border-gray-200 bg-white p-2 shadow-md rounded-lg">
                      <div className="font-medium">{label}</div>
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <div
                            className="w-2.5 h-2.5 rounded-full mr-2"
                            style={{ backgroundColor: entry.color }}
                          ></div>
                          <span className="text-gray-600">{entry.name}: </span>
                          <span className="font-medium ml-1">
                            {valueFormatter(entry.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
          )}
          {showLegend && <Legend />}
          {categories.map((category, index) => {
            // Choose the appropriate chart component based on the chartType
            if (chartType === "bar") {
              return (
                <Bar
                  key={category}
                  dataKey={category}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              );
            } else if (chartType === "area") {
              return (
                <Area
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.2}
                />
              );
            } else {
              return (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={colors[index % colors.length]}
                  activeDot={{ r: 8 }}
                />
              );
            }
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
