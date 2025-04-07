"use client";

import * as React from "react";
import { 
  Line,
  Bar,
  Pie,
  PieChart as RechartsPieChart,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface ChartProps {
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
          {categories.map((category, index) => (
            <Bar
              key={category}
              dataKey={category}
              fill={colors[index % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChart({
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
          {categories.map((category, index) => (
            <Bar
              key={category}
              dataKey={category}
              fill={colors[index % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PieChartProps extends Omit<ChartProps, 'index'> {
  dataKey: string;
  nameKey: string;
}

// We're not using the PieChart component in this app currently, so removing it to avoid
// compilation issues
