import React, { useEffect, useRef } from 'react';

declare const Chart: any;

interface BarChartProps {
  labels: string[];
  data: number[];
  theme: 'light' | 'dark';
}

const BarChart: React.FC<BarChartProps> = ({ labels, data, theme }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        const isDarkMode = theme === 'dark';
        const textColor = isDarkMode ? '#E5E7EB' : '#374151';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        chartInstanceRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'ადამიანების რაოდენობა',
              data: data,
              backgroundColor: 'rgba(168, 85, 247, 0.7)',
              borderColor: 'rgba(168, 85, 247, 1)',
              borderWidth: 1,
              borderRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  color: textColor,
                  stepSize: 1, // Ensure integer ticks if data is small
                },
                grid: {
                    color: gridColor,
                }
              },
              x: {
                ticks: {
                  color: textColor,
                },
                 grid: {
                    display: false,
                }
              }
            },
            plugins: {
              legend: {
                display: false,
              },
              title: {
                display: false,
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [labels, data, theme]);

  return <canvas ref={chartRef} />;
};

export default BarChart;